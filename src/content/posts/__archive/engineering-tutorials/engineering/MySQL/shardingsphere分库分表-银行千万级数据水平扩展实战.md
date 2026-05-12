---
title: ShardingSphere 分库分表实战：银行千万级数据水平扩展
summary: >-
  从分片算法、ShardingSphere JDBC 接入到生产级 Kubernetes
  部署，详解银行交易系统的水平分库分表实践，包括数据迁移、全局表、广播表与分片策略优化。
publishedAt: 'Sun Mar 22 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-22'
track: engineering
topic: MySQL
tags: []
featured: false
draft: false
slug: shardingsphere分库分表-银行千万级数据水平扩展实战
legacyPaths:
  - /coding/MySQL/ShardingSphere分库分表-银行千万级数据水平扩展实战
---
> "单表超过 1000 万行，MySQL 的 B+Tree 索引性能开始急剧下降。在银行系统里，交易表、流水表、账务表天天都在膨胀。ShardingSphere 把'单库单表'变成'多库多表'，让数据库横向扩展像配置开关一样简单。"

## 前言

银行系统有三个不得不面对的现实：

- **数据量爆炸**：一笔支付产生 1 条交易记录 + N 条流水记录，日增量超百万
- **单表瓶颈**：MySQL 单表超过 1000 万行，B+Tree 变深，读写性能显著下降
- **连接耗尽**：高频访问下，数据库连接池成为系统瓶颈

ShardingSphere（Apache 顶级项目）提供了一套完整的数据库水平扩展方案：
- **分库分表**：将大表按分片键拆分为多个小表，分布到不同数据库实例
- **读写分离**：主库写、从库读，缓解主库压力
- **数据加密**：列级透明加密，满足 PCI-DSS 合规
- **影子库**：压测时数据隔离，模拟生产数据

## 1. 分库分表核心概念

### 1.1 垂直拆分 vs 水平拆分

```
垂直拆分（按业务）：按表职责分离
  原始库：payment（交易+账户+流水）
    │
    ├──→ 库1：payment_db（交易表）
    ├──→ 库2：account_db（账户表）
    └──→ 库3：ledger_db（账务表）

水平拆分（按数据行）：按分片键拆分
  原始表：payment_transaction（1 亿行）
    │
    ├──→ 表1：payment_transaction_0（0-2000万）
    ├──→ 表2：payment_transaction_1（2000万-4000万）
    ├──→ 表3：payment_transaction_2（4000万-6000万）
    └──→ 表4：payment_transaction_3（6000万-1亿）
```

### 1.2 分片键选择原则

```bash
分片键三原则（银行场景）：

① 高频查询条件优先
  ✅ 转账记录表：teller_id（柜员每天查自己的交易）
  ✅ 交易流水表：account_no（用户查自己账户流水）
  ✅ 支付记录表：merchant_id（商户查自己的收款）
  ❌ 按 status 分片（状态值少，数据严重不均）

② 避免跨分片查询
  ❌ 按时间分片 + 按地区查询（跨分片聚合）
  ✅ 按 account_no 分片 + 按月份查流水（每条流水带 account_no，可路由）

③ 散列均匀
  ✅ user_id % 4（用户量均匀）
  ❌ region_id（发达地区数据量远超欠发达地区）
```

### 1.3 分片算法

```yaml
# ShardingSphere 支持的分片算法：

# 1. 取模分片（Mod）：数据均匀，但扩缩容需要迁移全部数据
# account_no % 4 → 0,1,2,3
# 问题：4 库扩到 8 库，路由全部变化，数据全部迁移

# 2. 范围分片（Range）：扩缩容友好，但可能产生热点
# id 0-1000万 → 表0，1000万-2000万 → 表1
# 问题：最新数据集中在最后一个分片，写热点

# 3. 复合分片（Complex）：多个分片键组合
# sharding-columns: merchant_id, status
# merchant_id % 4 + status.hashCode % 2

# 4. 哈希取模 + 范围（银行推荐）：
# 先按 merchant_id % 4 路由库
# 库内再按 created_time 按月范围分表
```

## 2. ShardingSphere-JDBC 接入

### 2.1 依赖配置

```xml
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>shardingsphere-jdbc-core</artifactId>
    <version>5.5.0</version>
</dependency>

<!-- 可选：读写分离 -->
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>shardingsphere-read-write-splitting</artifactId>
    <version>5.5.0</version>
</dependency>
```

### 2.2 分片规则配置

```yaml
# application.yml（ShardingSphere 分片配置）
spring:
  shardingsphere:
    # 是否开启 SQL 日志（生产关闭）
    props:
      sql-show: false
      sql-simple: true

    # 数据源配置
    datasource:
      names: ds-0,ds-1,ds-2,ds-3  # 4 个分片库

      ds-0:
        type: com.zaxxer.hikari.HikariDataSource
        driver-class-name: com.mysql.cj.jdbc.Driver
        jdbc-url: jdbc:mysql://mysql-shard-0.bank.internal:3306/payment?useSSL=true
        username: ${DB_USER}
        password: ${DB_PASSWORD}
        hikari:
          maximum-pool-size: 30
          minimum-idle: 5

      ds-1:
        type: com.zaxxer.hikari.HikariDataSource
        jdbc-url: jdbc:mysql://mysql-shard-1.bank.internal:3306/payment?useSSL=true
        username: ${DB_USER}
        password: ${DB_PASSWORD}
        hikari:
          maximum-pool-size: 30
          minimum-idle: 5

      ds-2:
        type: com.zaxxer.hikari.HikariDataSource
        jdbc-url: jdbc:mysql://mysql-shard-2.bank.internal:3306/payment?useSSL=true
        username: ${DB_USER}
        password: ${DB_PASSWORD}
        hikari:
          maximum-pool-size: 30
          minimum-idle: 5

      ds-3:
        type: com.zaxxer.hikari.HikariDataSource
        jdbc-url: jdbc:mysql://mysql-shard-3.bank.internal:3306/payment?useSSL=true
        username: ${DB_USER}
        password: ${DB_PASSWORD}
        hikari:
          maximum-pool-size: 30
          minimum-idle: 5

    # 分片规则
    rules:
      sharding:
        tables:
          # ──── 分片表：支付记录表 ────
          payment_transaction:
            # 实际物理表名：payment_transaction_0 ~ payment_transaction_3
            actual-data-nodes: ds-$->{0..3}.payment_transaction_$->{0..3}
            table-strategy:
              standard:
                sharding-column: transaction_id
                sharding-algorithm-name: payment_tx_mod

            # 主键生成策略（分布式 ID）
            key-generate-strategy:
              column: transaction_id
              key-generator-name: snowflake

          # ──── 分片表：账户流水表 ────
          account_ledger:
            # 按 account_no 哈希路由，库内按月分表
            actual-data-nodes: ds-$->{0..3}.account_ledger_$->{0..11}
            table-strategy:
              standard:
                sharding-column: account_no
                sharding-algorithm-name: account_ledger_hash_mod

            key-generate-strategy:
              column: ledger_id
              key-generator-name: snowflake

          # ──── 全局表：所有库都有一份完整数据 ────
          currency_code:
            # 广播表：每个分片库都有一份完整拷贝
            actual-data-nodes: ds-$->{0..3}.currency_code
            table-strategy:
              standard:
                sharding-column: currency_code
                sharding-algorithm-name: currency_inline

        # ──── 分片算法定义 ────
        sharding-algorithms:
          # 取模算法：transaction_id % 4 → 库路由
          payment_tx_mod:
            type: INLINE
            props:
              algorithm-expression: ds_${transaction_id % 4}
              allow-range-query-with-inline-sharding: false

          # 库内按月分表：account_no % 4 路由库，created_month 路由表
          account_ledger_hash_mod:
            type: INLINE
            props:
              algorithm-expression: ds_${account_no.hashCode() % 4}.account_ledger_${(account_no.hashCode() % 12)}
              # 注意：这里用了组合表达式

          # 全局表算法（每个库都存）
          currency_inline:
            type: INLINE
            props:
              algorithm-expression: ds_0.currency_code

        # ──── 主键生成器 ────
        key-generators:
          snowflake:
            type: SNOWFLAKE
            props:
              worker-id: 1
              max-vibration-offset: 4095
```

### 2.3 业务代码（零侵入）

```java
// ShardingSphere 的核心价值：业务代码完全不需要改
// 只要 SQL 能路由到单一分片，ShardingSphere 自动完成分片

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentTransactionMapper mapper;
    private final TransactionSnowflakeService snowflakeService;

    // ✅ 普通插入：ShardingSphere 自动生成分片路由
    // SQL: INSERT INTO payment_transaction (...) VALUES (...)
    // ShardingSphere 根据 transaction_id % 4 自动路由到对应库
    public String createPayment(PaymentRequest request) {
        String txnId = snowflakeService.nextId(); // 生成雪花 ID

        PaymentTransaction record = PaymentTransaction.builder()
            .transactionId(txnId)
            .accountNo(request.getFromAccount())
            .toAccountNo(request.getToAccount())
            .amount(request.getAmount())
            .currency("CNY")
            .status("PROCESSING")
            .createdAt(Instant.now())
            .build();

        mapper.insert(record);

        log.info("支付记录创建: txnId={}, sharding={}",
            txnId, txnId.substring(txnId.length() - 1)); // 验证分片
        return txnId;
    }

    // ✅ 单分片查询：ShardingSphere 自动路由到正确库
    // SQL: SELECT * FROM payment_transaction WHERE transaction_id = ?
    // ShardingSphere 根据 transaction_id % 4 直接定位到 ds-X
    public PaymentTransaction getByTransactionId(String txnId) {
        return mapper.selectByTransactionId(txnId);
    }

    // ✅ 范围查询：按 account_no 路由（需要包含分片键）
    // SQL: SELECT * FROM account_ledger WHERE account_no = ? AND created_month BETWEEN ? AND ?
    // ShardingSphere 根据 account_no % 4 直接定位到 ds-X，然后扫描该库内所有月份表
    public List<AccountLedger> getLedgerByAccount(
            String accountNo,
            LocalDate from,
            LocalDate to) {
        return mapper.selectByAccountAndPeriod(accountNo, from, to);
    }
}
```

### 2.4 Mapper（标准 MyBatis-Plus）

```java
@Mapper
public interface PaymentTransactionMapper
        extends BaseMapper<PaymentTransaction> {

    // 单分片查询：能精确定位到单个库+单个表
    default PaymentTransaction selectByTransactionId(String txnId) {
        return selectOne(
            new LambdaQueryWrapper<PaymentTransaction>()
                .eq(PaymentTransaction::getTransactionId, txnId)
        );
    }

    // 分片查询：按 account_no 查询同一用户的流水
    // 分片键在条件中 → 可路由到单一库
    default List<PaymentTransaction> selectByAccountNo(String accountNo) {
        return selectList(
            new LambdaQueryWrapper<PaymentTransaction>()
                .eq(PaymentTransaction::getAccountNo, accountNo)
                .orderByDesc(PaymentTransaction::getCreatedAt)
                .last("LIMIT 100")
        );
    }
}
```

## 3. 分片策略优化：银行常见场景

### 3.1 交易记录表：按交易 ID 取模

```yaml
# 场景：按 transaction_id 均匀分布
# 优势：写均匀分布到 4 个库，消除写入热点
# 劣势：按时间段查询流水会跨分片（需要先查索引）

payment_transaction:
  actual-data-nodes: ds-$->{0..3}.payment_transaction_$->{0..3}
  table-strategy:
    standard:
      sharding-column: transaction_id
      sharding-algorithm-name: payment_tx_mod

payment_tx_mod:
  type: INLINE
  props:
    algorithm-expression: >-
      ds_${transaction_id % 4}
      .payment_transaction_${transaction_id % 4}
```

### 3.2 账户流水表：按账户哈希 + 月份

```yaml
# 场景：用户查自己账户的月度流水
# 策略：account_no % N 路由库，月份路由表
# 优势：同一用户的流水在同一库，查询不跨库
# 劣势：新用户和老用户的月份表数据量不均

account_ledger:
  # 16 张表：4 库 × 4 个月份组
  # 月份分组：0-2月、3-5月、6-8月、9-12月
  actual-data-nodes: >-
    ds_0.account_ledger_0, ds_0.account_ledger_1, ds_0.account_ledger_2, ds_0.account_ledger_3,
    ds_1.account_ledger_0, ds_1.account_ledger_1, ds_1.account_ledger_2, ds_1.account_ledger_3,
    ds_2.account_ledger_0, ds_2.account_ledger_1, ds_2.account_ledger_2, ds_2.account_ledger_3,
    ds_3.account_ledger_0, ds_3.account_ledger_1, ds_3.account_ledger_2, ds_3.account_ledger_3

  table-strategy:
    standard:
      sharding-column: account_no
      sharding-algorithm-name: account_ledger_complex

account_ledger_complex:
  type: COMPLEX_INLINE
  props:
    algorithm-expression: >-
      ds_${account_no.hashCode() % 4}
      .account_ledger_${(created_month - 1) / 3}
```

### 3.3 广播表（全局表）

```yaml
# 广播表：数据量小、所有分片都需要完整副本
# 典型：国家代码表、货币汇率表、参数配置表

payment_channel:
  # 每个分片库都存储完整数据
  actual-data-nodes: ds-$->{0..3}.payment_channel
  # 不需要分片键（全库广播）

# 插入/更新会自动同步到所有分片
```

## 4. 跨分片查询与优化

### 4.1 绑定表（Join 优化）

```yaml
# 绑定表：分片规则完全一致的表，Join 不会跨库
# 典型：payment_transaction + payment_item（父子表）

payment_transaction:
  actual-data-nodes: ds-$->{0..3}.payment_transaction_$->{0..3}
  binding-tables:
    - payment_transaction
    - payment_item

# 绑定表查询示例：
# SELECT t.*, i.* FROM payment_transaction t
# JOIN payment_item i ON t.transaction_id = i.transaction_id
# WHERE t.transaction_id = ?
# → ShardingSphere 知道两张表在同一分片，直接下推执行
```

### 4.2 分布式 ID 生成

```java
// 分片后主键不能自增，必须使用分布式 ID
// 雪花算法（Snowflake）：时间戳 + 机器 ID + 序列号

@Configuration
public class SnowflakeConfig {

    @Bean
    public SnowflakeIdWorker snowflakeIdWorker() {
        // worker-id：在多实例部署时必须唯一
        // 银行建议：按 Kubernetes Pod 序号分配
        return new SnowflakeIdWorker(
            getWorkerIdFromEnv(),  // 从环境变量读取，0-31
            0                     // datacenterId
        );
    }

    private int getWorkerIdFromEnv() {
        String hostname = System.getenv("HOSTNAME");
        if (hostname != null && hostname.contains("-")) {
            // 从 Pod 名称提取序号：payment-sharding-0 → 0
            String suffix = hostname.substring(hostname.lastIndexOf('-'));
            return Integer.parseInt(suffix) % 32;
        }
        return 0;
    }
}

@Service
public class TransactionSnowflakeService {

    private final SnowflakeIdWorker worker;

    public String nextId() {
        return String.valueOf(worker.nextId());
    }
}
```

## 5. 数据迁移：不停服扩容

### 5.1 扩容方案

```
银行扩容标准流程（从 4 库扩到 8 库）：

阶段 1：双写（白天）
  ├─ 老分片规则：%4
  ├─ 新分片规则：%8
  └─ 策略：写老分片，同时异步写新分片

阶段 2：数据同步（夜间维护窗口）
  ├─ 全量同步：用 Canal/CDC 拉取历史数据到新分片
  └─ 增量同步：监听 binlog，实时同步增量

阶段 3：灰度切读（1 周）
  ├─ 读：1% → 10% → 50% → 100%（逐步切到新分片）
  └─ 写：仍双写

阶段 4：停老写（维护窗口）
  ├─ 停止写入老分片
  ├─ 同步最后增量数据
  └─ 下线老分片
```

### 5.2 数据校验

```sql
-- 扩容后数据校验 SQL
-- 1. 记录数校验：老分片总数 == 新分片总数
SELECT
  COUNT(*) as total,
  COUNT(DISTINCT transaction_id) as unique_txn
FROM payment_transaction;

-- 2. 抽样校验：随机抽 1000 条，对比两边数据
SELECT * FROM payment_transaction
WHERE transaction_id % 100 = 0
ORDER BY transaction_id
LIMIT 1000;
```

## 6. Kubernetes 分片集群部署

### 6.1 MySQL Sharding 集群

```yaml
# mysql-sharding/
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-shard-config
  namespace: database
data:
  my.cnf: |
    [mysqld]
    innodb-buffer-pool-size = 8G
    innodb-log-file-size = 1G
    max-connections = 2000
    slow-query-log = 1
    long-query-time = 1
---
# 4 个 MySQL 分片（StatefulSet）
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql-shard
  namespace: database
spec:
  serviceName: mysql-shard
  replicas: 4
  selector:
    matchLabels:
      app: mysql-shard
  template:
    spec:
      containers:
        - name: mysql
          image: mysql:8.0.35
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secrets
                  key: root-password
          resources:
            requests:
              cpu: "4"
              memory: 16Gi
            limits:
              cpu: "8"
              memory: 32Gi
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
            - name: config
              mountPath: /etc/mysql/conf.d
          livenessProbe:
            exec:
              command: ["mysqladmin", "ping", "-h", "localhost"]
            initialDelaySeconds: 60
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - mysqladmin
                - ping
                - -h
                - localhost
                - -u
                - root
                - -p$MYSQL_ROOT_PASSWORD
            initialDelaySeconds: 30
            periodSeconds: 5
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: mysql-shard-data
        - name: config
          configMap:
            name: mysql-shard-config
```

### 6.2 分片监控

```yaml
# Prometheus 监控 ShardingSphere 分片状态
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"

# 关键监控指标：
# - shardingsphere_sharding_tables_count（分片表数量）
# - shardingsphere_sqlexecute_count_total（SQL 执行总量）
# - shardingsphere_sqlexecute_rto_milliseconds（平均 RT）
# - shardingsphere_sqlrewrite_count_total（SQL 重写次数）
```

## 7. 常见问题与避坑

```bash
# 避坑 1：分片键不支持跨分片聚合
# ❌ SELECT COUNT(*) FROM payment_transaction GROUP BY status
#    → 需要聚合 4×4=16 张表，结果不准确
# ✅ 按分片键过滤：SELECT COUNT(*) FROM payment_transaction
#    WHERE transaction_id LIKE 'xxx%' GROUP BY status

# 避坑 2：分片键不能动态修改
# ❌ UPDATE payment_transaction SET account_no = ? WHERE ...
#    → 修改分片键会导致数据需要迁移
# ✅ 新增 target_account_no 字段，不改主键

# 避坑 3：最大连接数爆炸
# 每个应用实例 → ShardingSphere 代理 → 4 库 × 30 连接 = 120 连接
# 如果有 10 个应用实例 → 1200 个 DB 连接
# ✅ 控制应用实例数，使用连接池复用

# 避坑 4：扩缩容不是简单加节点
# 从 4 库扩到 8 库：transaction_id % 4 路由全变
# 所有历史数据需要重新路由（巨大迁移工程）
# ✅ 预估容量：单库支撑 5000 万行，提前规划分片数
# ✅ 建议：直接上 16 库 × 16 表 = 256 张逻辑表，留足余量

# 避坑 5：分布式事务跨分片
# 分片后跨库 UPDATE（两个分片同时扣款）不再是单库事务
# ✅ 解决方案：应用层补偿（TCC），或 Saga 模式（见 Seata 文章）
```

---

*相关阅读：[MySQL 主从复制与读写分离](/coding/MySQL/MySQL主从复制与读写分离) · [Seata 分布式事务实战](/coding/分布式系统/Seata分布式事务实战-AT模式与TCC模式选型) · [Redis 过期策略](/coding/Redis/Redis 过期策略)*
