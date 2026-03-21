---
title: REST API 版本管理策略：银行系统演进实践
date: 2026-03-22
description: 从 URL 路径到 Header 策略，详解 API 版本管理的四种主流方案、银行系统选型决策，以及灰度发布与版本废弃的完整生命周期管理。
---

# REST API 版本管理策略：银行系统演进实践

> "API 一旦发布就是承诺。改动签名不兼容的新功能只有两个选择：要么新开一个版本，要么让现有消费者心怀忐忑地升级。"

## 前言

在银行系统里，API 版本管理不仅是技术问题，更是**业务连续性**和**监管合规**的核心：
- **SWIFT API**：旧版本必须与新版本共存足够长时间，确保合作伙伴平稳迁移
- **监管要求**：API 变更历史必须可追溯，某些 API 需要保留 5 年以上
- **灰度发布**：新版本上线时不能一刀切，必须支持新旧版本并行

## 1. 四种版本管理策略对比

| 策略 | 示例 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **URL 路径** | `/v1/payments` | 直观、可缓存 | 污染 URL | 公开 API（推荐） |
| **Query 参数** | `/payments?version=2` | 不破坏 URL 结构 | 不直观、难以缓存 | 内部 API |
| **Header** | `API-Version: 2024-01` | 不改变 URL | 需客户端配合、Caddy 缓存失效 | 兼容优先 |
| **Content Negotiation** | `Accept: application/vnd.api.v1+json` | 符合 REST 规范 | 实现复杂 | 严格 RESTful |

```
银行系统选型建议：
  公开 API（面向合作伙伴）：URL 路径 ✅
  内部微服务：Header 或 Query 参数
  严格 RESTful 风格：Content Negotiation
  绝对不要：把版本号藏在路径中间（如 /payments/v1/orders）
```

## 2. Spring Boot 实现：URL 路径版本

这是银行公开 API 最常用的方案。

### 2.1 模块化结构

```
payment-api/
  payment-api-v1/         # v1 模块（仅维护，不新增功能）
    src/main/java/.../
      controller/
        PaymentControllerV1.java
      service/
        PaymentServiceV1.java
  payment-api-v2/         # v2 模块（当前活跃开发）
    src/main/java/.../
      controller/
        PaymentControllerV2.java
  payment-api-common/      # 公共模块（DTO、枚举、工具）
```

### 2.2 V1 控制器

```java
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentControllerV1 {

    private final PaymentServiceV1 paymentService;

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody PaymentRequestV1 request) {

        PaymentResponse response = paymentService.createPayment(
            PaymentV1Mapper.toDomain(request));
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success(response));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPayment(
            @PathVariable String paymentId) {

        PaymentResponse response = paymentService.getPayment(paymentId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

### 2.3 V2 控制器（新增字段）

```java
@RestController
@RequestMapping("/api/v2/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentControllerV2 {

    private final PaymentServiceV2 paymentService;

    // V2 新增：支持批量支付
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<BatchPaymentResponse>> createBatchPayment(
            @Valid @RequestBody BatchPaymentRequestV2 request) {

        BatchPaymentResponse response = paymentService.createBatchPayment(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // V1 有，但 V2 增加了返回字段
    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<PaymentResponseV2>> getPayment(
            @PathVariable String paymentId) {

        PaymentResponseV2 response = paymentService.getPaymentV2(paymentId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

### 2.4 网关路由配置

```yaml
# Spring Cloud Gateway 或 Nginx 路由
spring:
  cloud:
    gateway:
      routes:
        - id: payment-v1
          uri: http://payment-service-v1:8080
          predicates:
            - Path=/api/v1/payments/**

        - id: payment-v2
          uri: http://payment-service-v2:8080
          predicates:
            - Path=/api/v2/payments/**
```

## 3. Spring Boot 实现：Header 版本（不改变 URL）

银行内部系统迁移时，URL 路径策略会污染现有接口文档。Header 版本是更好的选择：

### 3.1 版本路由抽象

```java
// @ApiVersion 注解
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiVersion {
    String value();  // 例如 "2024-01"
}
```

### 3.2 版本路由拦截器

```java
@Component
@Slf4j
public class VersionRoutingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                            HttpServletResponse response,
                            Object handler) throws Exception {

        if (handler instanceof HandlerMethod method) {
            String version = extractVersion(request, method);

            // 从请求头获取版本
            ApiVersion apiVersion = method.getMethodAnnotation(ApiVersion.class);
            if (apiVersion == null) {
                apiVersion = method.getBeanType().getAnnotation(ApiVersion.class);
            }

            if (apiVersion != null && !apiVersion.value().equals(version)) {
                response.setStatus(HttpStatus.NOT_ACCEPTABLE.value());
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"code\":\"VERSION_MISMATCH\",\"message\":\"API 版本不匹配\"}");
                return false;
            }

            // 将版本信息注入请求属性
            request.setAttribute("api.version", version);
        }
        return true;
    }

    private String extractVersion(HttpServletRequest request, HandlerMethod method) {
        // 优先级 1：自定义请求头 API-Version
        String headerVersion = request.getHeader("API-Version");
        if (StringUtils.hasText(headerVersion)) {
            return headerVersion;
        }

        // 优先级 2：Accept Header（符合 REST 规范）
        String accept = request.getHeader("Accept");
        if (accept != null && accept.contains("application/vnd.api")) {
            Pattern pattern = Pattern.compile("application/vnd\\.api\\.v(\\d+)");
            Matcher matcher = pattern.matcher(accept);
            if (matcher.find()) {
                return "v" + matcher.group(1);
            }
        }

        // 优先级 3：默认版本（稳定版）
        return "v1";
    }
}
```

### 3.3 控制器使用

```java
@RestController
@RequestMapping("/payments")
public class PaymentController {

    // V1 API（默认）
    @ApiVersion("v1")
    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseV1> getPaymentV1(
            @PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.getPaymentV1(paymentId));
    }

    // V2 API（需要显式指定版本头）
    @ApiVersion("v2")
    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseV2> getPaymentV2(
            @PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.getPaymentV2(paymentId));
    }

    // V3 API（默认版本，可以不指定）
    @ApiVersion("v3")
    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseV3> getPaymentV3(
            @PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.getPaymentV3(paymentId));
    }
}
```

```bash
# 客户端调用示例
# 默认 V1
curl http://api.bank.com/payments/TXN-123

# 指定 V2（推荐）
curl -H "API-Version: v2" \
     http://api.bank.com/payments/TXN-123

# Accept Header 方式
curl -H "Accept: application/vnd.api.v2+json" \
     http://api.bank.com/payments/TXN-123
```

## 4. 版本废弃策略：银行合规要求

银行 API 废弃不是删除，而是进入漫长的"只维护不新增"阶段：

### 4.1 废弃声明

```java
@Deprecated
@RestController
@RequestMapping("/api/v1/payments")
@Slf4j
public class PaymentControllerV1 {

    // 废弃警告：通过 DeprecationHeader 通知客户端
    @GetMapping("/{paymentId}")
    @Deprecated
    public ResponseEntity<ApiResponse<PaymentResponse>> getPayment(
            @PathVariable String paymentId) {

        // 响应头声明废弃时间和迁移目标
        HttpHeaders headers = new HttpHeaders();
        headers.add("Deprecation", "true");
        headers.add("Sunset", "Sat, 31 Dec 2027 23:59:59 GMT");  // 硬停止日期
        headers.add("Link", "</api/v2/payments>; rel=\"successor-version\"; " +
            "title=\"v2 API\"");
        headers.add("X-API-Deprecation-Notice",
            "V1 API 将于 2027-12-31 停止服务，请迁移到 V2。文档：https://docs.bank.com/v2/migration");

        PaymentResponse response = paymentService.getPayment(paymentId);
        return ResponseEntity.ok()
            .headers(headers)
            .body(ApiResponse.success(response));
    }
}
```

### 4.2 废弃时间线

```
废弃时间线（银行 API 标准）：

Phase 1：宣布废弃（提前 2 年）
  ① 在文档和响应头声明废弃
  ② 发送通知给所有合作伙伴（SWIFT/ISO20022 通知机制）
  ③ 新功能只在最新版本提供

Phase 2：软停止（提前 6 个月）
  ① 所有新注册应用只能使用最新版本
  ② 老版本调用开始记录告警日志
  ③ 发送月度迁移进度报告给合作伙伴

Phase 3：硬停止（废弃声明日期）
  ① 返回 410 Gone 状态码
  ② 所有调用返回迁移指南
  ③ 关闭 V1 服务端点
```

### 4.3 版本策略与 OpenAPI

```yaml
# openapi.yaml 中声明版本废弃
openapi: 3.0.3
info:
  title: Banking Payment API
  version: 2.1.0
  description: |
    ## 版本历史
    | 版本 | 状态 | 废弃日期 | 停止支持 |
    |-----|------|---------|-----------|
    | v1  | 已废弃 | 2025-06-01 | 2027-12-31 |
    | v2  | 当前活跃 | - | - |
    | v3  | Beta | - | - |

paths:
  /payments:
    get:
      summary: 获取支付记录
      deprecated: true  # OpenAPI 废弃标记
      headers:
        API-Version:
          description: |
            v1 已废弃，返回 410 Gone。
            请迁移到 /api/v2/payments
```

## 5. 灰度发布：多版本并行策略

### 5.1 网关灰度路由

```java
@Component
@Slf4j
public class VersionRoutingFilter extends GlobalFilter {

    private final DynamicRouteService dynamicRoute;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String userId = extractUserId(exchange);
        String clientVersion = exchange.getRequest()
            .getHeaders().getFirst("X-Client-Version");

        // 灰度策略：按用户 ID 哈希分流
        String targetVersion = resolveTargetVersion(path, clientVersion, userId);

        ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
            .header("X-Target-Version", targetVersion)
            .build();

        log.debug("灰度路由: path={}, userId={}, targetVersion={}",
            path, userId, targetVersion);

        return chain.filter(
            exchange.mutate().request(modifiedRequest).build());
    }

    private String resolveTargetVersion(String path, String clientVersion, String userId) {
        // 策略 1：显式指定
        if (StringUtils.hasText(clientVersion)) {
            return clientVersion;
        }

        // 策略 2：新用户走 V3（5% 灰度）
        long hash = Math.abs(userId.hashCode() % 100);
        if (hash < 5) {
            return "v3";
        }

        // 策略 3：默认走 V2
        return "v2";
    }
}
```

### 5.2 金丝雀部署

```yaml
# Argo Rollouts 灰度配置
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5      # 5% 流量到新版本
        - pause: {duration: 10m}  # 观察 10 分钟
        - setWeight: 20    # 20%
        - pause: {duration: 30m}
        - setWeight: 50    # 50%
        - pause: {}        # 手动确认
        - setWeight: 100   # 100%，完全切换

      analysis:
        templates:
          - templateName: success-rate
        args:
          - name: service-name
            value: payment-service

      trafficRouting:
        nginx:
          stableIngress: payment-stable
          additionalIngressAnnotations:
            canary-weight: "5"
```

## 6. 总结：版本管理决策树

```
API 版本管理决策树：

新 API 设计：
  → 使用 URL 路径（/v1/xxx）
  → 同时设计好 v2 可能的字段扩展
  → 从第一天就在响应头加 Deprecation 字段

字段变更（不破坏兼容性）：
  → 新增字段 → 不用发新版本
  → 废弃字段 → 在文档标注 @deprecated，不删除

破坏性变更（删除/重命名/改变类型）：
  → 评估影响范围
  → 发布新版本（v1 → v2）
  → 旧版本保留 N 个月过渡期（N = 银行通常 24 个月）
  → 设置 Sunset 头，告知硬停止日期

永远不要做的事：
  ❌ 删除已发布的字段
  ❌ 修改字段类型（int → string）
  ❌ 重命名端点（/payments → /transactions）
  ❌ 在同一版本内引入破坏性变更
```

---

*相关阅读：[Spring Boot 参数校验与全局异常处理实战](/coding/Java/SpringBoot参数校验与全局异常处理实战) · [Git 企业工作流与分支策略](/coding/工程实践/Git企业工作流与分支策略-银行科技团队协作实践) · [Spring Cloud Gateway 银行流量网关实战](/coding/SpringCloud/SpringCloud-Gateway银行流量网关实战)*
