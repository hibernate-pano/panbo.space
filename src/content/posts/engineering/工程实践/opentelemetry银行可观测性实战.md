---
title: OpenTelemetry 银行可观测性实战：Tracing、Metrics、Logs 统一实践
summary: >-
  从手动埋点到 OpenTelemetry 全自动插桩，详解银行分布式系统的可观测性体系设计：链路追踪、指标体系、日志关联，以及与
  Jaeger/Prometheus/Grafana 的集成。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: 工程实践
tags: []
featured: false
draft: false
slug: opentelemetry银行可观测性实战
legacyPaths:
  - /coding/工程实践/OpenTelemetry银行可观测性实战
---
> "出现问题时，如果你的团队还在靠 grep 日志来排查，那还没到'可观测'的境界。追踪、指标、日志必须三位一体。"

## 前言

本文是[分布式系统可观测性实战](/coding/架构心得/分布式系统可观测性实战)的姊妹篇，聚焦 **OpenTelemetry（OTel）** 这一业界标准在银行生产环境中的具体落地。

银行系统的可观测性有三个硬需求：
- **合规审计**：每个 API 调用必须可追溯（SWIFT、PCI-DSS 要求）
- **性能 SLA**：支付接口 P99 延迟 > 500ms 立即告警
- **故障定位**：跨服务调用链必须在 5 分钟内定位到根因

## 1. OpenTelemetry 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Code                         │
│  Spring Boot / Node.js / Python / Go                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ OTel SDK     │  │ OTel SDK     │  │ OTel SDK     │       │
│  │ (Auto Instru │  │ (Auto Instru │  │ (Manual      │       │
│  │  mentation)  │  │  mentation)  │  │  Spans)      │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│  ┌──────▼─────────────────▼─────────────────▼───────┐       │
│  │              OTel Collector                       │       │
│  │  (接收 / 批处理 / 路由)                           │       │
│  └───┬──────────────┬──────────────────┬────────────┘       │
└──────┼──────────────┼──────────────────┼───────────────────┘
       │              │                  │
       ▼              ▼                  ▼
  ┌─────────┐  ┌───────────┐      ┌─────────┐
  │ Jaeger   │  │Prometheus │      │ Loki/   │
  │(Traces)  │  │(Metrics)  │      │Elastic  │
  └─────────┘  └───────────┘      └─────────┘
       │              │                  │
       ▼              ▼                  ▼
  ┌─────────────────────────────────────────┐
  │            Grafana 统一展示              │
  │  Trace → Metrics → Logs 关联查询         │
  └─────────────────────────────────────────┘
```

## 2. Java 应用：Auto Instrumentation

Spring Boot 项目无需改一行代码，OTel 自动埋桩：

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
    <version>1.36.0</version>
</dependency>
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
    <version>2.3.0</version>
</dependency>
```

```yaml
# application.yml
otel:
  exporter:
    otlp:
      endpoint: http://otel-collector:4317  # OTel Collector 地址
  service:
    name: payment-service
    version: 1.2.0
  traces:
    exporter: otlp         # 链路追踪
  metrics:
    exporter: otlp         # 指标
  logs:
    exporter: otlp         # 日志
  propagation:
    traces: w3c,tracecontext,b3  # 支持多种传播协议

# 采样策略（生产环境很重要）
otel:
  traces:
    sampler:
      type: parent-based
      parent-based:
        type: trace-id-ratio
        ratio: 0.1        # 10% 采样（节省存储）
      fallback:
        type: always-on  # 有父 Span 时一定采样
```

## 3. 手动埋点：关键业务逻辑

自动埋桩覆盖 HTTP/DB/gRPC，但**业务关键路径必须手动埋点**：

```java
@Service
@Slf4j
public class PaymentService {

    private final Tracer tracer;
    private final Meter meter;

    public PaymentService(Tracer tracer, Meter meter) {
        this.tracer = tracer;
        this.meter = meter;
    }

    // 自定义 Span：覆盖完整支付流程
    public PaymentResult processPayment(PaymentRequest request) {
        // 1. 创建根 Span
        Span span = tracer.spanBuilder("payment.process")
            .setAttribute("payment.order_id", request.getOrderId())
            .setAttribute("payment.amount", request.getAmount().doubleValue())
            .setAttribute("payment.currency", request.getCurrency())
            .setAttribute("payment.channel", request.getChannel())
            .startSpan();

        try (Scope ignored = span.makeCurrent()) {
            // 2. 账户校验子 Span
            validateAccount(request.getFromAccount(), span);

            // 3. 限额检查子 Span
            checkLimit(request, span);

            // 4. 核心处理（可能是 RPC 调用）
            PaymentResult result = executePayment(request);

            span.setAttribute("payment.result", result.getStatus().name());
            span.setAttribute("payment.transaction_id", result.getTransactionId());

            log.info("支付处理完成: orderId={}, txnId={}",
                request.getOrderId(), result.getTransactionId());

            return result;

        } catch (PaymentException e) {
            span.recordException(e);
            span.setAttribute("payment.result", "FAILED");
            span.setAttribute("payment.error_code", e.getCode());
            throw e;
        } finally {
            span.end();  // 必须在 finally 中调用
        }
    }

    private void validateAccount(String accountNo, Span parent) {
        Span span = tracer.spanBuilder("payment.validate-account")
            .setAttribute("account.number", maskAccount(accountNo))
            .setParent(parent)
            .startSpan();

        try (Scope ignored = span.makeCurrent()) {
            Account account = accountService.findByNumber(accountNo);
            span.setAttribute("account.status", account.getStatus().name());
            span.setAttribute("account.is_active", account.isActive());
        } finally {
            span.end();
        }
    }
}
```

## 4. 指标体系：银行核心指标

### 4.1 SLO/SLI 指标定义

```java
@Slf4j
public class PaymentMetrics {
    private final MeterRegistry registry;
    private final Clock clock;

    private final Counter paymentRequests;
    private final Counter paymentSuccess;
    private final Counter paymentFailed;
    private final Timer paymentLatency;
    private final DistributionSummary paymentAmountSummary;
    private final AtomicLong pendingPayments;

    public PaymentMetrics(MeterRegistry registry, Clock clock) {
        this.registry = registry;
        this.clock = clock;

        this.paymentRequests = Counter.builder("payment.requests.total")
            .description("Total payment requests")
            .tag("service", "payment-service")
            .register(registry);

        this.paymentSuccess = Counter.builder("payment.requests.success")
            .description("Successful payment requests")
            .tag("service", "payment-service")
            .register(registry);

        this.paymentFailed = Counter.builder("payment.requests.failed")
            .description("Failed payment requests")
            .tag("service", "payment-service")
            .register(registry);

        // P99 延迟：使用 SLO 阈值作为 SLA 桶边界
        this.paymentLatency = Timer.builder("payment.latency")
            .description("Payment processing latency")
            .tag("service", "payment-service")
            .publishPercentiles(0.5, 0.95, 0.99)    // P50/P95/P99
            .publishPercentileHistogram()
            .serviceLevelObjectives(
                Duration.ofMillis(100),   // SLO: 100ms 内完成
                Duration.ofMillis(500),   // SLO: 500ms 内完成
                Duration.ofSeconds(1)     // 告警阈值
            )
            .register(registry);

        this.paymentAmountSummary = DistributionSummary.builder("payment.amount")
            .description("Payment amount distribution")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        this.pendingPayments = registry.gauge(
            "payment.pending.count",
            new AtomicLong(0)
        );
    }

    public void recordPayment(PaymentRequest request, long durationMs) {
        paymentRequests.increment();
        paymentLatency.record(Duration.ofMillis(durationMs));
        paymentAmountSummary.record(request.getAmount().doubleValue());

        if (request.getAmount().compareTo(BigDecimal.ZERO) > 0) {
            paymentSuccess.increment();
        } else {
            paymentFailed.increment();
        }
    }
}
```

### 4.2 Prometheus 告警规则

```yaml
# prometheus-alerts.yml
groups:
  - name: payment-service-alerts
    rules:
      # SLO 告警：P99 延迟 > 500ms
      - alert: PaymentLatencyHigh
        expr: |
          histogram_quantile(0.99,
            rate(payment_latency_seconds_bucket{job="payment-service"}[5m])
          ) > 0.5
        for: 5m
        labels:
          severity: critical
          team: payments
        annotations:
          summary: "支付服务 P99 延迟超过 500ms"
          description: "当前 P99 延迟: {{ $value | humanizeDuration }}"

      # SLO 告警：成功率 < 99.9%
      - alert: PaymentSuccessRateLow
        expr: |
          (
            rate(payment_requests_success_total[5m])
            /
            rate(payment_requests_total[5m])
          ) < 0.999
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "支付成功率低于 99.9%"
          description: "当前成功率: {{ $value | humanizePercentage }}"

      # 资源告警：JVM 堆使用率 > 85%
      - alert: JVMHeapUsageHigh
        expr: |
          jvm_memory_used_bytes{area="heap"} /
          jvm_memory_max_bytes{area="heap"} > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "JVM 堆内存使用率超过 85%"
```

## 5. Trace + Metrics + Logs 关联

这是可观测性最难的部分：跨越三个数据源的根因分析。

### 5.1 结构化日志：嵌入 Trace ID

```java
@Slf4j
public class StructuredLogger {
    private static final String TRACE_ID = "trace_id";
    private static final String SPAN_ID = "span_id";

    public static void logWithTrace(String message, Map<String, Object> data) {
        Span current = Span.current();
        if (current != null && current.isRecording()) {
            SpanContext ctx = current.getSpanContext();
            data.put(TRACE_ID, ctx.getTraceId());
            data.put(SPAN_ID, ctx.getSpanId());
        }
        log.info("{}", JSON.toJSONString(data));
    }

    public static void logPayment(String orderId, BigDecimal amount) {
        Map<String, Object> logData = new HashMap<>();
        logData.put("event", "payment.processed");
        logData.put("order_id", orderId);
        logData.put("amount", amount);
        logData.put("timestamp", Instant.now());
        StructuredLogger.logWithTrace("Payment processed", logData);
    }
}
```

### 5.2 Grafana 三窗格关联

```
# Grafana Loki：从日志中提取 trace_id，关联到 Jaeger
{service="payment-service"} |= "payment.processed"
  | json
  | trace_id="trace_id"
  | span_id="span_id"

# Grafana Explore：三窗格关联
# 左：Loki 日志（过滤 trace_id）
# 中：Jaeger 链路（trace_id → 完整调用链）
# 右：Prometheus 指标（service=payment-service, trace_id=...）
```

### 5.3 银行合规：完整调用链审计

```java
// 审计日志：支付全链路记录（合规要求）
@Aspect
@Component
@RequiredArgsConstructor
public class PaymentAuditAspect {
    private final Tracer tracer;
    private final PaymentAuditRepository auditRepo;

    @Around("execution(* com.hsbc.bank.payment..*.*(..))")
    public Object auditPayment(ProceedingJoinPoint joinPoint) throws Throwable {
        Span span = tracer.spanBuilder("audit.payment")
            .setAttribute("audit.timestamp", Instant.now().toString())
            .setAttribute("audit.method", joinPoint.getSignature().getName())
            .startSpan();

        String traceId = span.getSpanContext().getTraceId();
        String requestId = UUID.randomUUID().toString();

        try (Scope ignored = span.makeCurrent()) {
            Object result = joinPoint.proceed();

            // 合规审计日志持久化（SWIFT 要求保留 5 年）
            auditRepo.save(AuditLog.builder()
                .traceId(traceId)
                .requestId(requestId)
                .service("payment-service")
                .method(joinPoint.getSignature().getName())
                .status("SUCCESS")
                .timestamp(Instant.now())
                .build());

            return result;
        } catch (Exception e) {
            span.recordException(e);

            auditRepo.save(AuditLog.builder()
                .traceId(traceId)
                .requestId(requestId)
                .service("payment-service")
                .method(joinPoint.getSignature().getName())
                .status("FAILED")
                .errorCode(e.getClass().getSimpleName())
                .timestamp(Instant.now())
                .build());

            throw e;
        } finally {
            span.end();
        }
    }
}
```

## 6. OpenTelemetry Collector 配置

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # 敏感数据过滤（银行合规要求）
  transform:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - replace_pattern(attributes["payment.card_number"], "****", "****")

  # 智能采样（控制成本）
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 10000
    policies:
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces-policy
        type: latency
        latency: { threshold_ms: 1000 }
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }

exporters:
  otlp/traces:
    endpoint: jaeger:4317
    tls:
      insecure: false
      cert_file: /certs/jaeger.crt

  prometheus:
    endpoint: "0.0.0.0:8889"

  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, transform, tail_sampling, batch]
      exporters: [otlp/traces]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

---

*相关阅读：[分布式系统可观测性实战](/coding/架构心得/分布式系统可观测性实战) · [银行科技 CI/CD 流水线设计](/coding/架构心得/银行科技CI-CD流水线设计) · [项目稳定性-限流方案全解析](/coding/架构心得/项目稳定性-限流)*
