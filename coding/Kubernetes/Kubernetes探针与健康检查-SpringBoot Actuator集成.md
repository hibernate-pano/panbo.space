---
title: Kubernetes 探针与健康检查：Spring Boot Actuator 深度集成
date: 2026-03-21
description: 从 Liveness、Readiness、Startup 三大探针原理到 Spring Boot Actuator 自定义健康指标，详解银行 K8s 生产环境中 Pod 健康检查的完整配置与避坑指南。
---

# Kubernetes 探针与健康检查：Spring Boot Actuator 深度集成

> "LivenessProbe 和 ReadinessProbe 用错的代价是真实的：Pod 反复重启、流量分配到还没启动好的实例、服务抖动。银行系统的每一次交易都在依赖这些探针正常工作。"

## 前言

Kubernetes 的探针（Probe）机制是 Pod 生命周期的守门人。探针配置错误是银行 K8s 生产环境中最常见的故障来源之一：支付 Pod 因为一个外部依赖超时导致 Readiness 探针失败，所有流量被切走；或者 JVM 刚启动就被 Liveness 判定为存活失败，开始无限重启循环。

## 1. 三大探针：使命与时机

```
Pod 启动流程中探针的执行顺序：

Pod 创建 → StartupProbe(一次) → LivenessProbe(循环) + ReadinessProbe(循环)
           └─ 启动探测             └─ 存活探测         └─ 就绪探测
              (等应用启动完成)        (应用是否还活着)    (能接收流量吗)
```

### 1.1 StartupProbe：启动守卫（K8s 1.16+）

**作用**：等应用完全启动后才启动 Liveness 和 Readiness 探测。解决应用启动时间较长时，Liveness 探针误判的问题。

```
问题场景：
  Java 应用启动需要 30 秒（JVM 预热、Bean 扫描、DB 连接池初始化）
  LivenessProbe 每 10 秒探测一次
  → 启动期间连续 3 次探测失败 → Pod 被判定死亡 → 开始重启循环！

Solution：StartupProbe 保护启动期
  StartupProbe 设置 initialDelaySeconds = 30
  → 前 30 秒不探测 → 30 秒后探测通过 → 启动 LivenessProbe
```

```yaml
# 示例：Spring Boot 应用启动慢，使用 StartupProbe
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payments
spec:
  template:
    spec:
      containers:
      - name: payment-service
        image: mybank/payment-service:1.2.0
        ports:
        - containerPort: 8080

        # StartupProbe：给应用 60 秒启动时间
        startupProbe:
          httpGet:
            path: /actuator/health/startup
            port: 8080
          initialDelaySeconds: 5    # 启动后 5 秒开始探测
          periodSeconds: 5        # 每 5 秒探测一次
          failureThreshold: 12    # 最多失败 12 次（12 × 5 = 60 秒）
          timeoutSeconds: 3       # 超时 3 秒视为失败
          successThreshold: 1      # 成功 1 次即通过

        # LivenessProbe：启动探针通过后才生效
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 30   # StartupProbe 通过后再等 30 秒
          periodSeconds: 15        # 每 15 秒探测一次
          failureThreshold: 3       # 连续失败 3 次 → 重启容器
          timeoutSeconds: 3

        # ReadinessProbe：启动探针通过后才生效
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5         # 更频繁地检查是否就绪
          failureThreshold: 2       # 连续失败 2 次 → 从 Endpoints 摘除
          timeoutSeconds: 3
          successThreshold: 1
```

### 1.2 LivenessProbe：存活守卫

**作用**：判断容器是否还"活着"。探测失败 → Kubernetes **重启容器**。

```
LivenessProbe 失败 = 容器死了 = 需要重启

⚠️ 注意：重启会丢失内存状态！
  - 正在处理的请求被中断
  - 本地缓存丢失
  - 悲观锁/分布式锁状态需重新获取

银行系统原则：
  LivenessProbe 应该探测的是"进程存活"，而不是"业务正常"
  永远不要把数据库连接检查放进 LivenessProbe！
```

### 1.3 ReadinessProbe：就绪守卫

**作用**：判断容器是否"准备好接收流量"。探测失败 → Kubernetes **将 Pod 从 Service Endpoints 中移除**，不再分配流量。

```
ReadinessProbe 失败 = 容器还没准备好 = 不分配流量

什么时候 ReadinessProbe 应该失败？
  ✅ 数据库连接池未初始化完成
  ✅ 外部支付网关不可用
  ✅ 依赖的微服务响应超时
  ✅ 启动时需要预热（JVM JIT 预编译）

什么时候 ReadinessProbe 应该通过？
  ✅ 进程存活（即使业务有问题）
  ✅ 静态配置已加载
```

## 2. Spring Boot Actuator：健康检查端点

### 2.1 基础配置

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
      base-path: /actuator

  endpoint:
    health:
      show-details: always      # 显示完整健康信息（K8s 探针必须）
      show-components: always    # 显示所有组件状态

  # K8s 探针专用健康路径
  health:
    livenessProbe:
      enabled: true
      additional-path: /actuator/health/liveness
    readinessProbe:
      enabled: true
      additional-path: /actuator/health/readiness
```

```bash
# 测试健康端点
curl http://localhost:8080/actuator/health | jq
# {
#   "status": "UP",
#   "components": {
#     "db": { "status": "UP", "details": { "database": "HSQLDB" } },
#     "diskSpace": { "status": "UP" },
#     "ping": { "status": "UP" },
#     "redis": { "status": "UP" }
#   }
# }
```

### 2.2 探针分离：Liveness ≠ Readiness

Spring Boot 2.6+ 将健康端点分为 `liveness` 和 `readiness` 两个独立状态：

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true  # 启用独立探针端点
```

```bash
# K8s 探针调用的端点：
/actuator/health/liveness   # StartupProbe + LivenessProbe 使用
/actuator/health/readiness   # ReadinessProbe 使用

# Spring Boot 2.5 及以下（探针不分离）：
/actuator/health  # 单一端点 → 全部探针共用
```

**分离的核心原则**：

```
Liveness 状态：反映"进程是否存活"
  - 只探测：JVM 是否存活、进程是否响应
  - 不探测：数据库、Redis、外部服务
  - Liveness 失败 → 重启容器（影响巨大）

Readiness 状态：反映"是否准备好处理请求"
  - 探测：数据库连接、Redis、配置中心、外部服务
  - Readiness 失败 → 不分配流量（不影响已处理的请求）
```

## 3. 自定义健康指标

### 3.1 数据库连接池健康

```java
// HealthIndicator：检查 HikariCP 连接池状态
@Component
@RequiredArgsConstructor
public class DataSourceHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    @Override
    public Health health() {
        // HikariCP 专用 API
        if (dataSource instanceof HikariDataSource hikari) {
            HikariPoolMXBean pool = hikari.getHikariPoolMXBean();
            int active = pool.getActiveConnections();
            int idle = pool.getIdleConnections();
            int total = pool.getTotalConnections();
            int waiting = pool.getThreadsAwaitingConnection();

            // 活跃连接 > 80% → 不健康
            if (active > total * 0.8) {
                return Health.down()
                    .withDetail("pool", "OVERLOADED")
                    .withDetail("active", active)
                    .withDetail("total", total)
                    .withDetail("waiting", waiting)
                    .withDescription("Connection pool utilization > 80%")
                    .build();
            }

            // 有线程在等待连接 → 潜在问题
            if (waiting > 10) {
                return Health.status("DEGRADED")
                    .withDetail("waiting", waiting)
                    .withDetail("message", "Threads waiting for connections")
                    .build();
            }

            return Health.up()
                .withDetail("active", active)
                .withDetail("idle", idle)
                .withDetail("total", total)
                .withDetail("maxPoolSize", hikari.getMaximumPoolSize())
                .build();
        }

        // 非 HikariCP 数据源（其他连接池）
        return Health.unknown()
            .withDetail("type", dataSource.getClass().getSimpleName())
            .build();
    }
}
```

### 3.2 外部依赖健康检查

```java
// ReadinessProbe 应该探测外部依赖
// LivenessProbe 不应该探测外部依赖

// ❌ 不要放进 LivenessProbe
@Component
@Slf4j
public class ExternalServiceHealthIndicator implements HealthIndicator {

    private final PaymentGatewayClient paymentGateway;
    private final ConfigServerClient configServer;

    @Override
    public Health health() {
        // 这个只应该在 ReadinessProbe 中生效
        // Spring Boot 会根据探针类型自动隔离：
        // - livenessProbe → 只看 liveness 相关指标
        // - readinessProbe → 看所有指标
        return Health.up().build();
    }
}

// ✅ 正确的分离方式：创建独立的探针健康指标
// application.yml 配置
management:
  health:
    # Readiness 探测外部依赖
    livenessProbe:
      enabled: true
      # 不包含外部依赖
      probes-group:
        exclude: ["externalServices", "hikariPool"]
    readinessProbe:
      enabled: true
      # 包含外部依赖
      probes-group:
        include: ["db", "redis", "paymentGateway"]
```

### 3.3 自定义健康端点（高级）

```java
@RestController
@RequestMapping("/actuator")
@RequiredArgsConstructor
@Slf4j
public class CustomHealthController {

    private final HealthAggregator healthAggregator;

    @GetMapping("/health/deep")
    public ResponseEntity<Map<String, Object>> deepHealthCheck() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("timestamp", Instant.now());

        // 逐项检查（可并发）
        CompletableFuture<Health> dbHealth = CompletableFuture.supplyAsync(
            this::checkDatabase);
        CompletableFuture<Health> redisHealth = CompletableFuture.supplyAsync(
            this::checkRedis);
        CompletableFuture<Health> paymentGwHealth = CompletableFuture.supplyAsync(
            this::checkPaymentGateway);

        Map<String, Object> components = new LinkedHashMap<>();
        try {
            components.put("database", dbHealth.get(3, TimeUnit.SECONDS).getDetails());
            components.put("redis", redisHealth.get(2, TimeUnit.SECONDS).getDetails());
            components.put("paymentGateway", paymentGwHealth.get(5, TimeUnit.SECONDS).getDetails());
        } catch (Exception e) {
            log.error("健康检查失败", e);
            health.put("status", "DOWN");
        }

        health.put("components", components);
        return ResponseEntity.ok(health);
    }

    private Health checkDatabase() {
        // 检查连接池
        return Health.up().withDetail("pool", "OK").build();
    }

    private Health checkRedis() {
        // 检查 Redis 连通性
        return Health.up().withDetail("cluster", "OK").build();
    }

    private Health checkPaymentGateway() {
        // 检查支付网关（带超时）
        return Health.up().withDetail("swif GPI", "OK").build();
    }
}
```

## 4. 银行场景：支付服务的探针配置

```yaml
# payment-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payments
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 最多多启动 1 个 Pod
      maxUnavailable: 0   # 不可用 Pod 为 0（银行支付零宕机要求）

  template:
    spec:
      containers:
      - name: payment-service
        image: mybank/payment-service:2.1.0

        # 启动探针：给应用 90 秒初始化时间
        # 包括：连接池预热 + 配置拉取 + 支付网关鉴权
        startupProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 9      # 最多 90 秒（9 × 10）

        # 存活探针：进程存活就 OK，不检查外部依赖
        # 银行支付服务即使数据库暂时不可用也不应重启
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 90   # StartupProbe 通过后再等 90 秒
          periodSeconds: 20
          failureThreshold: 3       # 连续 1 分钟不响应 → 重启
          timeoutSeconds: 5
          successThreshold: 1

        # 就绪探针：检查所有依赖是否就绪
        # 数据库未连接、Redis 未连接、配置中心未就绪 → 不分配流量
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5          # 更频繁（流量切换需要快速响应）
          failureThreshold: 2       # 连续 10 秒失败 → 摘除流量
          timeoutSeconds: 5
          successThreshold: 1

        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
```

## 5. 常见配置错误与避坑

```
错误 1：LivenessProbe 检查外部依赖
  ❌ livenessProbe → /actuator/health（含数据库检查）
  ✅ livenessProbe → /actuator/health/liveness（仅进程存活）

错误 2：initialDelaySeconds 设为 0
  ❌ 容器刚启动就探测，JVM 还没预热
  ✅ initialDelaySeconds >= 启动时间 + buffer

错误 3：failureThreshold 太小
  ❌ failureThreshold: 1 → 一次探测失败就重启
  ✅ failureThreshold >= 3（允许偶发网络抖动）

错误 4：periodSeconds 太小
  ❌ periodSeconds: 1 → 频繁探测消耗 CPU
  ✅ periodSeconds: 5-15（Liveness），5（Readiness）

错误 5：没有 StartupProbe
  ❌ 启动慢的应用（> 30 秒）被 Liveness 误判重启
  ✅ StartupProbe 保护慢启动应用

错误 6：ReadinessProbe 成功后立即接收全部流量
  ❌ 瞬时大量流量压垮新启动的 Pod
  ✅ 使用 HPA 或 minReadySeconds 控制节奏
```

## 6. 调试探针问题

```bash
# 查看 Pod 探针状态
kubectl describe pod payment-service-7b8d9f-xkq2n -n payments | grep -A 10 "Liveness"

# 查看探针失败日志
kubectl logs payment-service-7b8d9f-xkq2n -n payments --previous

# 直接测试探针端点
kubectl exec -it payment-service-7b8d9f-xkq2n -n payments -- \
  curl -s http://localhost:8080/actuator/health/liveness

# 查看 Pod 事件（探针失败记录在这里）
kubectl get events -n payments --field-selector \
  involvedObject.name=payment-service-7b8d9f-xkq2n \
  --sort-by='.lastTimestamp'

# 临时禁用探针进行调试（生产环境禁止！）
kubectl patch deployment payment-service -n payments \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"payment-service","livenessProbe":null}]}}}}'
```

---

*相关阅读：[Kubernetes 监控与告警银行生产实战](/coding/Kubernetes/Kubernetes监控与告警-银行生产实战) · [Spring Boot 数据库连接池调优](/coding/Java/SpringBoot数据库连接池调优) · [Kubernetes 快速入门完全指南](/coding/Kubernetes/Kubernetes快速入门完全指南)*
