# Spring Boot 数据库连接池调优：从配置到生产实战

> HikariCP 是如何在毫秒级影响你的系统吞吐量的

---

## 目录

1. [为什么连接池是 Java 后端最常被忽视的性能瓶颈](#1-为什么连接池是-java-后端最常被忽视的性能瓶颈)
2. [HikariCP 核心概念：理解这些数字才能调好池](#2-hikaricp-核心概念理解这些数字才能调好池)
3. [最小连接数：不是越大越好](#3-最小连接数不是越大越好)
4. [最大连接数：如何计算你的池大小](#4-最大连接数如何计算你的池大小)
5. [连接超时与泄漏检测：两道生命线](#5-连接超时与泄漏检测两道生命线)
6. [连接复用与 prepared statement 缓存](#6-连接复用与-prepared-statement-缓存)
7. [Oracle 与 PostgreSQL 的特殊考量](#7-oracle-与-postgresql-的特殊考量)
8. [生产环境常见问题与排查](#8-生产环境常见问题与排查)
9. [Spring Boot 2.x 与 3.x 的默认配置差异](#9-spring-boot-2x-与-3x-的默认配置差异)
10. [完整的 application.yml 配置参考](#10-完整的-applicationyml-配置参考)

---

## 1. 为什么连接池是 Java 后端最常被忽视的性能瓶颈

在我参与过的多个 Spring Boot 项目中，连接池配置几乎都是"上线前随便设，出问题再调"。这种做法在互联网公司或许可以接受，但在银行业——

**连接池出问题不只是慢，是直接导致交易失败。**

银行系统的交易量虽然不像电商那样有秒杀场景，但有其独特的压力模式：
- **晨间开门冲击**：每天 9:00 前大量自动化任务启动，对数据库产生脉冲式并发
- **监管报送批量**：月末、季末、年末的监管报送任务会产生持续 10-30 分钟的高并发
- **日终批处理**：账务核对、利息计算等批量任务需要持有连接较长时间

这些场景下，连接池配置不当会导致：
- **连接耗尽（Pool Exhaustion）**：所有连接被占满，新请求排队甚至超时
- **连接泄漏（Connection Leak）**：连接用完没归还，池逐渐缩小
- **死锁（Deadlock）**：连接持有时间过长，多事务互相等待

---

## 2. HikariCP 核心概念：理解这些数字才能调好池

### 2.1 HikariCP 为什么是默认选择

Spring Boot 2.0 开始将默认连接池从 Tomcat Pool 切换到 HikariCP。原因很直接：**HikariCP 是已知最快的连接池**，通过以下方式实现：

- **FastPath**：大多数操作无锁（Lock-free），使用 `ConcurrentBag` 数据结构
- **AggressivePrefetch**：提前准备连接，减少获取连接的等待时间
- **Minimal Object Allocation**：连接包装对象极简，减少 GC 压力
- **Adaptive Batch Size**：根据负载动态调整 batch 大小

### 2.2 连接池生命周期

理解 HikariCP 的连接生命周期，是调优的基础：

```
请求到达 → 获取连接（borrow） → 执行 SQL → 归还连接（return）
                ↓                    ↓
           pool idle 已有?       连接正常?
           /         \          /         \
         YES         NO       正常        异常
          ↓          ↓         ↓          ↓
      直接复用    等待/新建    归还池      丢弃/重试
```

### 2.3 核心配置项一览

```yaml
spring:
  datasource:
    hikari:
      minimum-idle: 5           # 最小空闲连接
      maximum-pool-size: 20     # 最大连接数
      connection-timeout: 30000 # 获取连接超时（毫秒）
      idle-timeout: 600000     # 空闲连接存活时间（毫秒）
      max-lifetime: 1800000     # 连接最大生命周期（毫秒）
      leak-detection-threshold: 60000  # 泄漏检测阈值（毫秒）
      pool-name: PaymentHikariPool
      auto-commit: true
      connection-test-query: SELECT 1  # 连接测试查询（Oracle 必需）
```

---

## 3. 最小连接数：不是越大越好

### 3.1 minimum-idle 的真实含义

`minimum-idle` 控制连接池在空闲时保持的最小连接数。这些连接是"预热"状态，可以立即被使用，减少冷启动延迟。

```yaml
# 常见误区：把 minimum-idle 设得很大
# ❌ 错误配置：维持 50 个空闲连接
spring:
  datasource:
    hikari:
      minimum-idle: 50
      maximum-pool-size: 50

# 问题：数据库最大连接数通常有限（Oracle 通常 100-200）
# 50 个空闲连接会浪费宝贵的数据库连接资源
# 如果有 10 个微服务都这样配，数据库连接瞬间耗尽
```

```yaml
# ✅ 正确配置：根据实际负载设置
spring:
  datasource:
    hikari:
      minimum-idle: 5   # 足以覆盖正常负载的最低并发
      maximum-pool-size: 20
```

### 3.2 金融系统的考量

在银行环境中，`minimum-idle` 需要考虑：
- 核心银行系统调用通常在 10-50ms 完成，5 个空闲连接能支撑 100-500 QPS
- 如果你的服务是低流量内部服务（监管报送、报表生成），设置 2-3 个就够
- 如果是面向客户的实时交易服务（支付、转账），需要 10-20 个

---

## 4. 最大连接数：如何计算你的池大小

这是最关键也是最常配错的参数。

### 4.1 公式：池大小不是拍脑袋定的

有一个广泛引用的经验公式：

```
Pool Size = (Core Count × 2) + Effective Spindle Count
```

但这个公式过于简化。对于现代 SSD/NVMe 存储，这个公式不再适用。

**更实用的公式（来自 HikariCP 作者 Brett Wooldridge）：**

```
Pool Size = ((core_count * 2) + number_of_disks))
```

但我更推荐用**实际压测**来确定：

```java
// 压测脚本：找出最佳 pool size
// 使用 Wrk 或 Gatling 模拟真实 SQL 负载
// 观察两个指标：
// 1. Throughput（吞吐量）— 随着 pool size 增加而增加
// 2. Response Time（响应时间）— 增加到某个点后开始上升（连接等待）

// 典型的性能曲线：
// pool=5:  throughput=500 req/s, latency=45ms
// pool=10: throughput=950 req/s, latency=48ms
// pool=15: throughput=1100 req/s, latency=52ms  ← 收益递减开始
// pool=20: throughput=1150 req/s, latency=65ms  ← 边际收益很小
// pool=25: throughput=1160 req/s, latency=120ms ← 数据库连接争用开始
// pool=30: throughput=1120 req/s, latency=250ms ← 开始恶化
```

### 4.2 必须考虑的限制因素

```yaml
# ✅ 全局考量：连接池大小 × 服务实例数 ≤ 数据库最大连接数

# 假设：
# - Oracle 数据库最大连接数：200
# - 服务实例数：5（生产环境 Kubernetes 5 副本）
# - 其他微服务共享数据库：约 100 个连接

# 则每个服务实例的连接池上限：
# (200 - 100) / 5 = 20

spring:
  datasource:
    hikari:
      maximum-pool-size: 18  # 留 2 个给管理员连接
      minimum-idle: 5
```

### 4.3 银行特殊场景：批量作业的池大小

```yaml
# 批量作业（如日终账务核对）的特殊配置
# 这类作业的特点：SQL 复杂、执行时间长、并发度低

spring:
  datasource:
    batch:
      hikari:
        maximum-pool-size: 4    # 批量作业不需要大池，反而影响在线交易
        minimum-idle: 2
        connection-timeout: 120000  # 长查询需要更长超时
        # 批量作业不使用泄漏检测（因为连接可能被长时间占用）
        # 可以通过代码手动控制连接生命周期
```

---

## 5. 连接超时与泄漏检测：两道生命线

### 5.1 connection-timeout：获取连接的最大等待时间

```yaml
spring:
  datasource:
    hikari:
      connection-timeout: 30000  # 30 秒
```

这个参数的意思是：当连接池中没有可用连接时，等待的最长时间。超过则抛出 `PoolTimeoutException`。

**金融系统的配置建议：**
- 在线交易（实时）：5-10 秒。用户无法接受太长的等待
- 内部系统/报表：30-60 秒。给足等待时间
- 异步任务：120 秒以上，配合重试机制

```java
// 代码中处理连接超时
try {
    Connection conn = dataSource.getConnection();
    // 执行业务逻辑
} catch (PoolTimeoutException e) {
    // 不要让异常直接抛给用户
    logger.error("数据库连接池耗尽，请稍后重试", e);
    throw new ServiceUnavailableException("系统繁忙，请稍后重试");
}
```

### 5.2 leak-detection-threshold：连接泄漏的最后防线

这是 HikariCP 最实用的功能之一：**当一个连接被借出超过阈值时间未归还，就判定为泄漏**。

```yaml
spring:
  datasource:
    hikari:
      leak-detection-threshold: 60000  # 60 秒
```

```java
// HikariCP 日志输出示例：
// [HikariPool:payment-pool] Connection leak detection triggered
// on HikariConnectionProxy (oracle.jdbc.driver.OracleConnection@7f2a3b1c)
// on stack trace follows:
// java.lang.Exception: Apparent connection leak detected
//   at com.hsbc.payment.service.PaymentService.processTransaction(PaymentService.java:45)
//   at ...

// 一旦看到这个日志，说明有代码路径没有正确关闭连接
// 立即排查该堆栈指向的代码
```

**常见泄漏场景：**

```java
// ❌ 场景1：方法提前 return，连接未关闭
public void processOrder(Long orderId) {
    Connection conn = dataSource.getConnection();
    try {
        Order order = orderRepository.findById(orderId);
        if (order == null) {
            return;  // BUG: 连接泄漏！conn 永远不会被关闭
        }
        // ...
    } finally {
        conn.close();  // 需要把 close 放在 finally 中
    }
}

// ❌ 场景2：Checked Exception 导致连接未关闭
public void processPayment(Long paymentId) throws SQLException {
    Connection conn = dataSource.getConnection();
    try {
        // 业务逻辑可能抛出 SQLException
        paymentService.execute(paymentId);  // 如果这里抛异常，conn 泄漏
    }
    // ❌ 忘记 finally: conn.close();
}

// ✅ 正确做法1：使用 try-with-resources（推荐）
public void processOrder(Long orderId) {
    try (Connection conn = dataSource.getConnection()) {
        // 自动关闭，无需 finally
        // ...
    }  // conn.close() 自动调用
}

// ✅ 正确做法2：使用 JdbcTemplate 或 JPA
// 根本不需要手动管理连接
public Optional<Order> findById(Long orderId) {
    return jdbcTemplate.queryForObject(
        "SELECT * FROM orders WHERE id = ?",
        (rs, rowNum) -> new Order(...),
        orderId
    );  // JdbcTemplate 内部管理连接生命周期
}
```

### 5.3 idle-timeout 与 max-lifetime

```yaml
spring:
  datasource:
    hikari:
      idle-timeout: 600000     # 10 分钟：空闲连接的最大存活时间
      max-lifetime: 1800000     # 30 分钟：连接的最大生命周期
```

这两个参数是为了处理两个问题：
- **idle-timeout**：释放不活跃的连接，节省数据库资源
- **max-lifetime**：定期重建连接，避免连接"老化"（数据库端连接超时、网络中间件超时）

**Oracle 用户的注意事项：**

Oracle 数据库本身有 `IDLE_TIMEOUT` 和 `CONNECT_TIME` 限制（由 DBA 设置在 profile 中），通常比 HikariCP 的 max-lifetime 更短。**HikariCP 的 max-lifetime 必须小于数据库端的连接超时**，否则会出现"连接被数据库端强制关闭"的情况。

```yaml
# 如果 Oracle DBA 告诉你连接 8 小时后会断开：
# ✅ HikariCP max-lifetime 应该设为 7 小时，留 1 小时余量
spring:
  datasource:
    hikari:
      max-lifetime: 25200000  # 7 小时 = 7 * 60 * 60 * 1000
```

---

## 6. 连接复用与 prepared statement 缓存

### 6.1 auto-commit 的默认值

```yaml
spring:
  datasource:
    hikari:
      auto-commit: true  # 默认 true，大多数场景没问题
```

**什么时候需要关闭 auto-commit？** 当你需要在一个事务中执行多个 SQL，且这些 SQL 要么全部成功要么全部失败时：

```java
// 关闭 auto-commit，手动管理事务
try (Connection conn = dataSource.getConnection()) {
    conn.setAutoCommit(false);  // 手动开启事务
    try {
        conn.prepareStatement("INSERT INTO orders ...").executeUpdate();
        conn.prepareStatement("UPDATE inventory ...").executeUpdate();
        conn.commit();  // 显式提交
    } catch (Exception e) {
        conn.rollback();  // 出错回滚
        throw e;
    } finally {
        conn.setAutoCommit(true);  // 恢复默认行为
    }
}
```

### 6.2 cachePrepStmts 与 prepared statement 缓存

这是 PostgreSQL 用户的福音：

```yaml
# PostgreSQL: 启用 prepared statement 缓存
spring:
  datasource:
    url: jdbc:postgresql://host:5432/mydb?cachePrepStmts=true
    hikari:
      maximum-pool-size: 20
      # HikariCP 对 PostgreSQL 会自动启用 prepared statement 缓存
```

```sql
-- 观察 prepared statement 缓存效果
-- 使用 pg_stat_statements 扩展
SELECT query, calls, total_exec_time / calls AS avg_ms, rows / calls AS avg_rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 如果相同 SQL 的 calls 很高但 plans 很低，说明缓存在工作
```

### 6.3 Oracle 的特殊配置

```yaml
# Oracle: 连接池配置需要更多调优
spring:
  datasource:
    url: jdbc:oracle:thin:@//host:1521/SERVICE_NAME
    driver-class-name: oracle.jdbc.OracleDriver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-test-query: SELECT 1 FROM DUAL  # Oracle 必需
      # Oracle 11g/12c 推荐额外参数
      connection-init-sql: ALTER SESSION SET CURRENT_SCHEMA=APP_USER
```

---

## 7. Oracle 与 PostgreSQL 的特殊考量

### 7.1 Oracle：连接更"重"，池要更稳

Oracle 连接比 PostgreSQL 重得多——建立连接涉及身份验证、Session 初始化、Shared Pool 解析等。**Oracle 的连接建立时间通常是 PostgreSQL 的 5-10 倍**。

这意味着：
- `minimum-idle` 不能设得太低（冷启动代价大）
- `connection-timeout` 要留足（Oracle 连接慢）
- 优先使用连接复用，避免频繁创建销毁

```yaml
# Oracle 生产环境推荐配置
spring:
  datasource:
    hikari:
      minimum-idle: 10        # Oracle 连接建立慢，预留多一些
      maximum-pool-size: 20    # 根据业务量调整
      connection-timeout: 30000
      idle-timeout: 300000    # 5 分钟（Oracle 连接资源宝贵）
      max-lifetime: 1800000   # 30 分钟（配合 Oracle 端的超时）
      leak-detection-threshold: 120000  # 2 分钟（给长查询留空间）
      connection-test-query: SELECT 1 FROM DUAL
```

### 7.2 PostgreSQL：连接较"轻"，池可以更大

PostgreSQL 的连接建立开销小很多，可以设更大的池：

```yaml
# PostgreSQL 生产环境推荐配置
spring:
  datasource:
    hikari:
      minimum-idle: 10
      maximum-pool-size: 50    # PostgreSQL 可以支持更大的池
      connection-timeout: 20000
      idle-timeout: 600000
      max-lifetime: 1800000
      leak-detection-threshold: 60000
```

### 7.3 连接数规划矩阵

```
┌─────────────────┬────────────┬──────────────┬────────────┐
│ 数据库          │ 连接建立   │ 推荐 pool    │ 备注       │
│                 │ 开销      │ size         │            │
├─────────────────┼────────────┼──────────────┼────────────┤
│ Oracle 11g     │ ~200ms     │ 10-20        │ 最保守     │
│ Oracle 19c     │ ~80ms      │ 15-30        │ 连接复用   │
│ PostgreSQL 15  │ ~20ms      │ 20-50        │ 连接较轻   │
│ MySQL 8        │ ~30ms      │ 15-40        │ 中等       │
└─────────────────┴────────────┴──────────────┴────────────┘
```

---

## 8. 生产环境常见问题与排查

### 8.1 池耗尽：Connection pool exhausted

这是最常见也最紧急的问题。

**症状：**
```
2026-03-15 09:23:11.456 ERROR [payment-svc] --- [HikariPool:payment-pool]
  Connection pool exhausted (poolSize=20, active=20, idle=0, waiting=47)
```

**排查步骤：**

```bash
# 1. 检查活跃连接数是否持续等于 pool size
# 在 HikariPool 日志中搜索 "Pool stats"
# [HikariPool:payment-pool] Pool stats (total=20, active=20, idle=0, waiting=0)

# 2. 通过 JMX 实时监控
# 启动时加 -Dcom.sun.management.jmxremote
# 使用 JConsole 或 VisualVM 连接，实时查看 HikariPoolMXBean

# 3. 开启 DEBUG 日志查看慢 SQL
# HikariCP 有详细的获取/归还连接日志
```

```yaml
# 在 application.yml 中开启 HikariCP DEBUG 日志
logging:
  level:
    com.zaxxer.hikari: DEBUG
    com.zaxxer.hikari.pool.HikariPool: DEBUG
```

```java
// 4. 添加连接池监控指标（用于 Prometheus/Grafana）
@Bean
public HikariDataSource dataSource() {
    HikariConfig config = new HikariConfig();
    // ... 配置
    HikariDataSource ds = new HikariDataSource(config);

    // 注册到 Micrometer（Spring Boot Actuator 自动集成）
    // 指标名称：hikaricp_connections_* (active, idle, pending, max, min)
    return ds;
}
```

**常见原因及解决方案：**

| 原因 | 表现 | 解决方案 |
|------|------|---------|
| SQL 执行太慢 | 活跃连接 = pool size，但 waiting = 0 | 优化 SQL、加索引、减少事务范围 |
| 连接泄漏 | 活跃连接 > 正常值，持续增长 | 开启 leak-detection-threshold，修复泄漏代码 |
| 突发高并发 | 等待队列积压 | 增加 pool size 或启用连接超时拒绝 |
| 数据库端连接限制 | 经常出现 waiting | 协调 DBA 增加数据库最大连接数 |

### 8.2 连接超时：Connection Timeout

```java
// 症状：抛出 PoolTimeoutException
// java.util.concurrent.TimeoutException: Waited 30.000 seconds for connection

// 原因分析：
// 1. 数据库服务器 CPU/IO 繁忙，新连接建立慢
// 2. 数据库 max_connections 已满
// 3. 网络延迟或防火墙超时

// 排查：
// ① 数据库服务器资源
SELECT
    state,
    COUNT(*)
FROM pg_stat_activity
GROUP BY state;

// ② 数据库连接数
SHOW max_connections;
SELECT COUNT(*) FROM pg_stat_activity;
```

### 8.3 连接验证失败：Connection is not valid

```java
// 症状：HikariCP 报告连接失效，被丢弃并重建
// [HikariPool:db-pool] Connection Connection@7f2a3b1c marked as broken because of SQLException

// 原因：
// ① 数据库重启了，连接已被服务端关闭
// ② 网络中断
// ③ Oracle 的 DCD（Dead Connection Detection）检测到了断开的客户端

// 解决方案：
// ① 使用连接测试查询
spring:
  datasource:
    hikari:
      connection-test-query: SELECT 1 FROM DUAL  # Oracle
      # 或
      connection-test-query: SELECT 1             # PostgreSQL/MySQL

// ② 如果数据库会频繁重启，考虑使用 PgBouncer/Oracle RAC 等连接池代理
```

---

## 9. Spring Boot 2.x 与 3.x 的默认配置差异

```yaml
# Spring Boot 2.x 的 HikariCP 默认值
# (com.zaxxer.hikari.HikariConfig 的默认值)
minimum-idle: 10
maximum-pool-size: 10
connection-timeout: 30000 (30s)
idle-timeout: 600000 (10min)
max-lifetime: 1800000 (30min)
auto-commit: true
```

```yaml
# Spring Boot 3.x 的变化
# HikariCP 版本从 4.x 升级到 5.x
# 默认值基本不变，但有一些重要改进：

# ① 自动配置更智能
# 如果配置了 spring.datasource.url，HikariCP 会自动配置

# ② 更好的诊断信息
# 连接问题时会输出更详细的日志

# ③ 支持 Jakarta EE 9+
# 数据源类型从 javax.sql.* 切换到 jakarta.sql.*
# （如果使用 DataSource 接口，大多数代码无需修改）
```

### 升级注意事项

```java
// 如果你在代码中使用了 javax.sql.* 相关类
// Spring Boot 3.x 下需要迁移到 jakarta.sql.*

// ❌ Spring Boot 2.x
import javax.sql.DataSource;
import javax.sql.XADataSource;

// ✅ Spring Boot 3.x
import jakarta.sql.DataSource;
import jakarta.sql.XADataSource;

// 大多数情况下，HikariCP 的配置代码无需修改
// 只是 import 语句需要更新
```

---

## 10. 完整的 application.yml 配置参考

### 10.1 Oracle 生产环境配置

```yaml
spring:
  application:
    name: payment-service

  datasource:
    url: jdbc:oracle:thin:@//oracle-scan:1521/HSBCPROD
    driver-class-name: oracle.jdbc.OracleDriver
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

    hikari:
      # 连接池大小：根据 DB 最大连接数和服务实例数计算
      maximum-pool-size: 18
      minimum-idle: 5

      # 超时配置
      connection-timeout: 30000
      idle-timeout: 300000        # 5 分钟
      max-lifetime: 1800000       # 30 分钟（配合 Oracle 端超时）

      # 连接验证（Oracle 必须）
      connection-test-query: SELECT 1 FROM DUAL

      # 泄漏检测：超过 2 分钟视为泄漏
      leak-detection-threshold: 120000

      # 连接池名称（方便日志和 JMX 识别）
      pool-name: PaymentService-HikariPool

      # 初始化连接：启动时预建立 5 个连接
      initialization-fail-timeout: -1  # 连接失败不阻止应用启动
      # 如果要强制启动时验证连接，设为 0

      # auto-commit 默认 true，不用显式配置

  # 将 HikariCP 指标暴露给 Prometheus
  actuator:
    endpoints:
      web:
        exposure:
          include: health,info,metrics,prometheus
    metrics:
      tags:
        application: ${spring.application.name}
```

### 10.2 PostgreSQL 生产环境配置

```yaml
spring:
  datasource:
    url: jdbc:postgresql://pg-cluster:5432/ledger?reWriteBatchedInserts=true&cachePrepStmts=true
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

    hikari:
      maximum-pool-size: 40       # PostgreSQL 连接开销小，可以更大
      minimum-idle: 10

      connection-timeout: 20000
      idle-timeout: 600000        # 10 分钟
      max-lifetime: 1800000       # 30 分钟

      # PostgreSQL 不需要 connection-test-query（驱动自带验证）
      # 但在高可用场景下建议保留
      connection-test-query: SELECT 1

      leak-detection-threshold: 60000

      pool-name: LedgerService-HikariPool

      # 连接属性：SSL 配置（生产环境必须）
      data-source-properties:
        ssl: true
        sslmode: require
        ApplicationName: LedgerService
```

### 10.3 多数据源配置（主库 + 从库）

```yaml
# 场景：Oracle 主库写入 + PostgreSQL 只读从库报表查询
spring:
  datasource:
    primary:  # 主数据源（Oracle）
      jdbc-url: jdbc:oracle:thin:@//oracle-primary:1521/HSBCPROD
      driver-class-name: oracle.jdbc.OracleDriver
      username: ${DB_PRIMARY_USER}
      password: ${DB_PRIMARY_PASSWORD}
      hikari:
        maximum-pool-size: 20
        pool-name: Primary-HikariPool

    readonly:  # 只读数据源（PostgreSQL）
      jdbc-url: jdbc:postgresql://pg-replica:5432/ledger
      driver-class-name: org.postgresql.Driver
      username: ${DB_READONLY_USER}
      password: ${DB_READONLY_PASSWORD}
      hikari:
        maximum-pool-size: 50
        pool-name: ReadOnly-HikariPool
```

---

## 结语

数据库连接池的配置，是那种"看起来简单，做起来全是坑"的事情。大多数团队的做法是"先用默认值，出问题再调"。在银行业，这种做法的问题是：**生产环境的连接池问题，往往是在凌晨日终批处理时才暴露**，那时候系统负载最高，排查时间最紧，影响最恶劣。

我的经验公式只有三条：

1. **先压测，后上线**：用真实的 SQL 和并发量测试出最佳 pool size
2. **设置 leak-detection-threshold**：永远开着，不要在生产环境关闭
3. **让 max-lifetime 小于数据库端超时**：给双方都留有余量

连接池不是"设好就不管"的，是需要持续监控和调优的。建议在 Grafana Dashboard 中加入 HikariCP 的四个黄金指标：`hikaricp_connections_active`、`hikaricp_connections_idle`、`hikaricp_connections_pending`、`hikaricp_connections_max`。

*Bobot 🦐 | 汇丰科技园 | 2026-03-19*
