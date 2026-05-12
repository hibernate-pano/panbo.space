---
title: Sentinel 流量控制与熔断降级：银行高并发防护实战
summary: >-
  从限流算法、熔断策略、热点参数防护到 Spring Cloud Alibaba 集成，详解 Sentinel 在银行支付系统中的完整落地，包括
  Dashboard 集群管理和生产配置实战。
publishedAt: 'Sun Mar 22 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-22'
track: engineering
topic: 分布式系统
tags: []
featured: false
draft: false
slug: sentinel流量控制与熔断降级-银行高并发防护实战
legacyPaths:
  - /coding/分布式系统/Sentinel流量控制与熔断降级-银行高并发防护实战
---
> "Resilience4j 是轻量级工具，Sentinel 是工业级武器。在银行支付系统里，一次意外的流量峰值可能导致清算系统过载——Sentinel 的熔断策略和 Dashboard 让这一切可见、可控、可回滚。"

## 前言

在银行高并发场景中，Sentinel（阿里巴巴）和 Resilience4j 各有定位：

- **Resilience4j**：轻量，适合微服务内部防护，代码简单
- **Sentinel**：完整解决方案，Dashboard 可视化、多语言 SDK（Java/Go/C++）、自适应熔断、热点参数防护

在 HSBC 的支付和清算系统中，Sentinel 承担了以下职责：
- **流量控制**：防止突发流量压垮服务（QPS 限流 + 并发线程数限流）
- **熔断降级**：下游服务不可用时，快速失败并返回兜底数据
- **热点防护**：同一个参数值（如同一个商户 ID）频繁访问时单独限流
- **系统自适应**：根据系统 Load、CPU、平均响应时间自动调节

## 1. Sentinel 核心概念

```
Sentinel 架构：

┌─────────────────────────────────────────────────────────┐
│              Sentinel Dashboard（可视化控制台）              │
│    实时监控 | 规则配置 | 机器分组 | 熔断策略              │
│    监听端口: 8719（ Actuator 健康检查）                   │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP / gRPC 推送规则
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Payment Service    │  │   Account Service   │
│                      │  │                      │
│  ┌────────────────┐  │  │  ┌────────────────┐  │
│  │ Sentinel Core  │  │  │  │ Sentinel Core   │  │
│  │  限流拦截器    │  │  │  │  限流拦截器      │  │
│  │  熔断器        │  │  │  │  熔断器         │  │
│  └───────┬────────┘  │  │  └───────┬────────┘  │
│          │            │  │          │            │
│  ┌───────┴────────┐  │  │  ┌───────┴────────┐  │
│  │  SphU.entry()  │  │  │  │  SphU.entry()  │  │
│  │  /v1/payments  │  │  │  │  /accounts     │  │
│  └────────────────┘  │  │  └────────────────┘  │
└──────────────────────┘  └──────────────────────┘

规则存储（可切换）：
  • 文件（单机开发）→  • Nacos（生产推荐）→  • ZooKeeper
  • Apollo              • Redis
```

### 1.1 规则类型

| 规则 | 作用 | 典型场景 |
|------|------|---------|
| **流量控制**（FlowRule）| 限制 QPS 或并发线程数 | 任何入口端点 |
| **熔断降级**（DegradeRule）| 异常比例/次数超阈值时熔断 | 外部支付回调 |
| **热点参数**（ParamFlowRule）| 限制特定参数值的访问频率 | 单个商户/账户 |
| **系统规则**（SystemRule）| 基于系统 Load/响应时间 | 全局保护 |
| **访问控制**（AuthorityRule）| 黑名单/白名单 | IP 鉴权 |

## 2. Spring Cloud Alibaba 集成

### 2.1 依赖配置

```xml
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-core</artifactId>
    <version>1.8.8</version>
</dependency>
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
    <version>2023.0.1.2</version>
</dependency>

<!-- Dashboard 接入（生产必须）-->
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-transport-simple-http</artifactId>
    <version>1.8.8</version>
</dependency>
```

```yaml
# bootstrap.yml
spring:
  cloud:
    sentinel:
      enabled: true

      # 控制台地址
      dashboard: sentinel-dashboard.monitoring.svc.cluster.local:8080

      # 应用名（Sentinel Dashboard 显示用）
      application: ${spring.application.name}

      # 规则数据源（Nacos 持久化，生产推荐）
      # 注意：需要额外引入 sentinel-datasource-nacos
      datasource:
        flow:
          nacos:
            server-addr: ${NACOS_SERVER_ADDR:nacos.bank.internal:8848}
            data-id: ${spring.application.name}-flow-rules
            group-id: SENTINEL_GROUP
            data-type: json
            rule-type: flow

        degrade:
          nacos:
            server-addr: ${NACOS_SERVER_ADDR}
            data-id: ${spring.application.name}-degrade-rules
            group-id: SENTINEL_GROUP
            data-type: json
            rule-type: degrade

      # 本地规则文件（开发环境）
      # eager: true 时启动时加载本地文件
      eager: false
```

### 2.2 注解方式接入

```java
// 方式 1：@SentinelResource（推荐，Spring AOP）
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    // ✅ 限流处理：blockHandler 指定限流时的兜底方法
    // fallback：指定业务异常时的兜底方法
    @SentinelResource(
        value = "createPayment",
        blockHandler = "createPaymentBlockHandler",
        fallback = "createPaymentFallback",
        exceptionsToIgnore = { InsufficientBalanceException.class }
    )
    public PaymentResponse createPayment(PaymentRequest request) {
        // 正常业务逻辑
        Payment payment = paymentMapper.create(request);
        clearingClient.submit(payment);
        return PaymentResponse.from(payment);
    }

    // 限流/熔断时的兜底（参数必须和原方法签名一致，最后加 BlockException）
    public PaymentResponse createPaymentBlockHandler(
            PaymentRequest request,
            BlockException e) {

        log.warn("支付被限流/熔断: request={}, type={}",
            request, e.getClass().getSimpleName());

        if (e instanceof FlowException) {
            return PaymentResponse.builder()
                .status("REJECTED")
                .message("系统繁忙，请稍后重试（限流）")
                .retryAfterSeconds(1)
                .build();
        }

        if (e instanceof DegradeException) {
            return PaymentResponse.builder()
                .status("DEGRADED")
                .message("服务暂时不可用，请稍后重试")
                .retryAfterSeconds(30)
                .build();
        }

        return PaymentResponse.builder()
            .status("ERROR")
            .message("系统异常")
            .build();
    }

    // 业务异常时的兜底
    public PaymentResponse createPaymentFallback(
            PaymentRequest request,
            Throwable t) {

        log.error("支付业务异常: request={}", request, t);

        return PaymentResponse.builder()
            .status("ERROR")
            .message("支付处理失败，请联系客服")
            .errorCode("PAYMENT_ERROR")
            .build();
    }
}
```

```java
// 方式 2：注解的 blockHandlerClass（兜底方法在单独类中）
// 推荐：兜底逻辑复杂时，分离到独立类
public class PaymentBlockHandler {

    // 必须为 static 方法
    public static PaymentResponse handlePaymentBlock(
            PaymentRequest request,
            BlockException e,
            BlockHandler handler) {
        return PaymentResponse.builder()
            .status("RATE_LIMITED")
            .message("请求过于频繁")
            .retryAfterSeconds(1)
            .build();
    }
}

// 使用
@SentinelResource(
    value = "createPayment",
    blockHandlerClass = PaymentBlockHandler.class,
    blockHandler = "handlePaymentBlock"
)
public PaymentResponse createPayment(PaymentRequest request) {
    // ...
}
```

### 2.3 网关层限流

```java
// Spring Cloud Gateway + Sentinel 集成
@Configuration
public class SentinelGatewayConfig {

    // 网关层：按 API 分组限流
    @Bean
    public SentinelGatewayFilter sentinelGatewayFilter() {
        return new SentinelGatewayFilter();
    }

    // 限流/熔断响应（返回 JSON，不走默认 HTML）
    @PostConstruct
    public void init() {
        // 设置网关限流 JSON 响应
        GatewayCallbackManager.setBlockHandler((serverWebExchange, throwable) -> {
            Map<String, Object> result = new HashMap<>();
            result.put("status", 429);
            result.put("code", "GATEWAY_RATE_LIMIT");
            result.put("message", "请求过于频繁，请稍后重试");

            return Mono.just(ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .contentType(MediaType.APPLICATION_JSON)
                .body(result));
        });
    }
}
```

```yaml
# application.yml：网关限流规则
spring:
  cloud:
    gateway:
      routes:
        - id: payment-route
          uri: http://payment-service
          predicates:
            - Path=/api/v1/payments/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100   # 每秒 100 请求
                redis-rate-limiter.burstCapacity: 200   # 突发容量
```

## 3. 流量控制规则配置

### 3.1 限流策略

```java
// 编程方式创建限流规则（可放入 @PostConstruct 或 Nacos 推送）
@Configuration
public class SentinelRulesConfig {

    @PostConstruct
    public void initFlowRules() {
        List<FlowRule> rules = new ArrayList<>();

        // 规则 1：payment-service 整体 QPS ≤ 1000
        FlowRule paymentLimit = new FlowRule("createPayment")
            .setGrade(RuleConstant.FLOW_GRADE_QPS)          // 按 QPS
            .setCount(1000)                                 // 阈值
            .setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT) // 直接拒绝
            .setResource("createPayment")
            .setLimitApp("default")
            .setStrategy(RuleConstant.STRATEGY_DIRECT);     // 直接限流本资源

        rules.add(paymentLimit);

        // 规则 2：批量支付接口更严格 QPS ≤ 50
        FlowRule batchLimit = new FlowRule("createBatchPayment")
            .setGrade(RuleConstant.FLOW_GRADE_QPS)
            .setCount(50)
            .setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT)
            .setResource("createBatchPayment");

        rules.add(batchLimit);

        // 规则 3：按调用来源限流（不同来源不同限额）
        // 移动 App：100/s，内部系统：500/s
        FlowRule mobileLimit = new FlowRule("createPayment")
            .setGrade(RuleConstant.FLOW_GRADE_QPS)
            .setCount(100)
            .setResource("createPayment")
            .setLimitApp("mobile-app")        // 来自移动端的请求
            .setStrategy(RuleConstant.STRATEGY_CHAIN)  // 调用链限流
            .setRefResource("mobile-gateway"); // 引用上游资源

        rules.add(mobileLimit);

        // 推送规则到 Sentinel Core
        FlowRuleManager.loadRules(rules);

        log.info("Sentinel 限流规则加载完成: {} 条规则", rules.size());
    }
}
```

### 3.2 控制行为策略

```bash
# Sentinel 支持 4 种控制行为：

# 1. 直接拒绝（默认）
# QPS > 阈值 → 直接返回 FlowException
# 适用：保护系统不被冲垮，不在乎少量请求失败

# 2. 冷启动（Warm Up）
# 阈值 = count/3，逐步预热到 count
# 适用：数据库连接池刚启动时，避免冷启动压垮
FlowRule rule = new FlowRule("coldStartAPI")
    .setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_WARM_UP)
    .setCount(100)        // 最终阈值
    .setWarmUpPeriodSec(30);  // 预热时长 30 秒

# 3. 匀速排队（漏桶算法）
# 请求匀速通过，超时直接拒绝
# 适用：保证调用频率不超过阈值（适合消息队列场景）
FlowRule rule = new FlowRule("queueProcessing")
    .setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_RATE_LIMITER)
    .setCount(10)              // 每秒 10 个请求
    .setMaxQueueingTimeMs(500); // 最大排队 500ms

# 4. 冷启动 + 匀速排队（组合）
# 适合：批量任务，希望匀速执行
```

## 4. 熔断降级规则

### 4.1 三种熔断策略

```java
// 熔断规则配置
@Configuration
public class SentinelDegradeConfig {

    @PostConstruct
    public void initDegradeRules() {
        List<DegradeRule> rules = new ArrayList<>();

        // 策略 1：慢调用比例熔断（响应时间 > 1s 视为慢调用）
        // 适用：清算系统、外部支付网关
        DegradeRule clearingRule = new DegradeRule("callClearingSystem")
            .setGrade(RuleConstant.DEGRADE_GRADE_RT)       // 按响应时间
            .setCount(1000)                                  // 阈值：1s
            .setSlowRatioThreshold(0.5)                      // 50% 慢调用触发
            .setMinRequestAmount(10)                         // 最小请求数（避免抖动）
            .setStatIntervalMs(5000)                         // 统计窗口 5s
            .setTimeWindow(30);                              // 熔断持续 30s

        rules.add(clearingRule);

        // 策略 2：异常比例熔断（内部服务故障）
        // 适用：数据库不可用、外部 API 返回 5xx
        DegradeRule errorRule = new DegradeRule("getAccount")
            .setGrade(RuleConstant.DEGRADE_GRADE_EXCEPTION_RATIO)
            .setCount(0.5)                                   // 50% 异常比例
            .setMinRequestAmount(5)                          // 最小请求数
            .setTimeWindow(15);                              // 熔断 15s

        rules.add(errorRule);

        // 策略 3：异常数熔断（外部支付回调）
        // 适用：第三方服务完全不可用
        DegradeRule callbackRule = new DegradeRule("handlePaymentCallback")
            .setGrade(RuleConstant.DEGRADE_GRADE_EXCEPTION_COUNT)
            .setCount(100)                                   // 累计 100 次异常
            .setTimeWindow(60);                              // 熔断 60s

        rules.add(callbackRule);

        DegradeRuleManager.loadRules(rules);
    }
}
```

### 4.2 半开状态：探测恢复

```
Sentinel 熔断器状态机：

  CLOSED（正常）→ 异常触发 → OPEN（熔断）→ 时间窗口到期 → HALF_OPEN（探测）
                ↑                                              ↓
                ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←← 探测失败  ←←←←←←
                                                              ↓
                                                    探测成功 ←←← CLOSED

示例（慢调用熔断）：
  ① CLOSED：正常调用，响应时间持续 > 1s，比例 > 50%，请求 ≥ 10
  ② → OPEN：熔断器打开，后续所有调用直接返回 DegradeException
  ③ 30 秒后 → HALF_OPEN：放行 1 个探测请求
  ④ 探测成功 → CLOSED：恢复正常
     探测失败 → OPEN：再等 30 秒
```

### 4.3 生产级熔断配置

```yaml
# Nacos 中存储的熔断规则（JSON 格式）
# Data ID: payment-service-degrade-rules
# Group: SENTINEL_GROUP
# Namespace: prod

[
  {
    "resource": "callClearingSystem",
    "grade": 1,                    # 1=慢调用比例, 2=异常比例, 3=异常数
    "count": 1000,                 # 阈值（ms 或比例）
    "slowRatioThreshold": 0.5,
    "minRequestAmount": 10,
    "statIntervalMs": 5000,
    "timeWindow": 30
  },
  {
    "resource": "getAccount",
    "grade": 2,
    "count": 0.5,
    "minRequestAmount": 5,
    "statIntervalMs": 60000,
    "timeWindow": 15
  }
]
```

## 5. 热点参数防护

### 5.1 场景：单商户流量控制

```java
// 热点防护：同一个 merchantId 的调用频率单独限制
// 适用：某个商户突发大量交易（如双十一促销）

@SentinelResource(
    value = "queryMerchantOrders",
    paramFlowRule = @ParamFlow(
        value = 100,                    // 参数值级别 QPS ≤ 100
        key = "merchantId"              // 根据 merchantId 参数限流
    ),
    blockHandler = "queryMerchantOrdersBlockHandler"
)
public List<Order> queryMerchantOrders(
        @RequestParam String merchantId,
        @RequestParam String date) {

    return orderMapper.selectByMerchant(merchantId, date);
}

// 兜底处理
public List<Order> queryMerchantOrdersBlockHandler(
        String merchantId,
        String date,
        BlockException e) {

    log.warn("商户 {} 查询被限流: type={}", merchantId,
        e.getClass().getSimpleName());

    return Collections.emptyList(); // 返回空列表，不要抛异常
}
```

### 5.2 热点参数规则（JSON）

```json
// Nacos 中存储热点规则
// Data ID: payment-service-param-rules

[
  {
    "resource": "queryMerchantOrders",
    "grade": 1,
    "paramIdx": 0,          // merchantId 是第 0 个参数（从 0 开始）
    "count": 100,           // 每个 merchantId 的 QPS ≤ 100
    "controlBehavior": 0    // 0=直接拒绝
  }
]
```

## 6. Sentinel Dashboard 集群管理

### 6.1 部署 Dashboard

```yaml
# Helm 部署 Sentinel Dashboard
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentinel-dashboard
  namespace: monitoring
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: sentinel-dashboard
          image: bladex/sentinel-dashboard:1.8.8
          ports:
            - containerPort: 8080  # Dashboard UI
            - containerPort: 8719  # Heartbeat port
          env:
            - name: SERVER_PORT
              value: "8080"
            - name: AUTH_ENABLED
              value: "true"       # 开启认证（生产必须）
            - name: NACOS_SERVER_ADDR
              value: nacos.bank.internal:8848
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 2Gi
          livenessProbe:
            httpGet:
              path: /dashboard/health
              port: 8080
            initialDelaySeconds: 30
          readinessProbe:
            httpGet:
              path: /dashboard/health
              port: 8080

---
apiVersion: v1
kind: Service
metadata:
  name: sentinel-dashboard
  namespace: monitoring
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080
  selector:
    app: sentinel-dashboard
```

### 6.2 Dashboard 功能

```
Sentinel Dashboard 核心功能：

1. 实时监控
   - QPS：每秒请求数
   - RT：平均响应时间
   - 阻塞数：被限流的请求数
   - 异常数：业务异常数

2. 规则管理
   - 流控规则：新增/编辑/删除限流规则
   - 熔断规则：配置慢调用/异常比例
   - 热点规则：参数级限流

3. 机器列表
   - 显示所有注册到 Dashboard 的服务实例
   - 心跳超时自动剔除

4. 集群流控
   - Token Server 模式：多节点协调限流
```

## 7. 生产避坑指南

```bash
# 避坑 1：规则未持久化
# ❌ 仅用 FlowRuleManager.loadRules() 加载 → Pod 重启后规则丢失
# ✅ 使用 Nacos/Apollo 作为规则数据源

# 避坑 2：@SentinelResource 未指定 blockHandler
# ❌ 没有兜底 → 限流时抛异常给用户（用户体验差）
# ✅ 必须指定 blockHandler 或 fallback

# 避坑 3：全局异常被熔断
# ❌ 所有异常都触发熔断 → 正常业务异常也会熔断
# ✅ 业务异常用 @SentinelResource(fallback=...)
# ✅ 使用 exceptionsToIgnore 排除非熔断异常

# 避坑 4：minRequestAmount 太小
# ❌ minRequestAmount=1 → 1 次慢调用就熔断（抖动严重）
# ✅ 生产建议 minRequestAmount ≥ 10

# 避坑 5：熔断时间窗口太短
# ❌ timeWindow=5s → 外部服务还没恢复，又开始请求
# ✅ 外部支付网关：timeWindow ≥ 30s
# ✅ 数据库故障：timeWindow ≥ 60s

# 避坑 6：网关层和服务层重复限流
# ❌ 网关限流 100/s + 服务限流 100/s → 有效 QPS 变成了 100
# ✅ 方案：网关层只做粗粒度（整体），服务层做细粒度（按接口）
```

---

*相关阅读：[服务治理：限流熔断与降级](/coding/分布式系统/服务治理-限流熔断与降级) · [Nacos 服务注册与配置中心](/coding/SpringCloud/Nacos服务注册与配置中心-银行多环境实战) · [Redis-Cell 限流模块](/coding/Redis/Redis-Cell 限流模块)*
