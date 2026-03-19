---
title: Spring Cloud Gateway 银行系统流量网关实战
date: 2026-03-20
description: 深入讲解 Spring Cloud Gateway 在银行系统中的路由、鉴权、限流、熔断最佳实践，结合 HSBC 真实场景代码示例。
---

# Spring Cloud Gateway 银行系统流量网关实战

> "网关是微服务的守门人——它决定了哪些流量能进来，怎么处理，以及什么时候Say No。"

## 前言

在银行系统中，API Gateway 承担着至关重要的角色：

- **统一入口**：所有前端请求经网关路由到后端服务，避免前端直接暴露内部服务地址
- **横切关注点**：认证鉴权、限流熔断、日志审计、协议转换在网关层统一处理
- **安全屏障**：在网关层拦截未授权请求、恶意流量，比在每个微服务中重复实现要高效得多

本文基于 Spring Cloud Gateway (SCG) 2023.x，结合我在 HSBC 真实项目的实践经验，讲解银行场景下的网关配置与踩坑。

## 1. 网关核心概念：Route、Predicate、Filter

SCG 的执行流程用一句话概括：**"请求进来 → 匹配路由 → 依次执行过滤器链 → 转发到下游"**。

三个核心概念：

| 概念 | 作用 | 类比 |
|------|------|------|
| **Route** | 路由目标，包含目标 URL 和关联的过滤器 | "这条快递送到哪" |
| **Predicate** | 匹配条件，决定请求走哪条路由 | "收件地址是否匹配" |
| **Filter** | 请求/响应拦截器，可在路由前后做处理 | "安检、打包、签收" |

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: payment-service
          uri: http://payment-svc:8080
          predicates:
            - Path=/api/payment/**
          filters:
            - StripPrefix=2
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200
```

请求 `/api/payment/v1/transfer` → StripPrefix=2 → 去掉 `/api/payment` → 下游收到 `/v1/transfer`。

## 2. 动态路由：从配置文件到注册中心

### 2.1 静态路由（适合固定服务）

配置文件方式，路由在启动时确定，不易变更：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: account-service
          uri: http://account-svc:8080
          predicates:
            - Path=/api/account/**
        - id: settlement-service
          uri: http://settlement-svc:8080
          predicates:
            - Path=/api/settlement/**
```

### 2.2 动态路由（生产首选）

银行环境里服务多、路由变更是常态。用 DiscoveryClient 动态路由，服务下线/上线自动生效：

```yaml
spring:
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true                          # 开启动态路由
          lower-case-service-id: true            # 服务名转小写（否则 /ACCOUNT-SERVICE 会404）
          predicates:
            - name: Path
              args:
                pattern: '/{service}/**'
          filters:
            - name: RewritePath
              args:
                regexp: '/(?<service>.*)/(?<remaining>.*)'
                replacement: '/${remaining}#${service}'
```

请求 `/account-service/api/v1/accounts` → 自动转发到 account-service 的 `/api/v1/accounts`。

### 2.3 踩坑：动态路由的路径陷阱

**问题**：下游服务收到的路径可能与预期不符。

**解决**：始终在路由上加 RewritePath filter，确保路径对齐：

```yaml
filters:
  - RewritePath=/account-service/(?<segment>.*), /$\{segment}
```

## 3. 银行级鉴权：JWT + 网关拦截

银行系统最常见的鉴权架构：**前端请求带 JWT Access Token → 网关验证 Token 有效性 → 向下游透传用户信息**。

### 3.1 网关鉴权过滤器

```java
@Component
@Slf4j
public class JwtAuthenticationFilter implements GatewayFilterFactory<JwtAuthenticationFilter.Config> {

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 跳过白名单路径（登录、公开文档等）
            String path = request.getURI().getPath();
            if (isWhitelisted(path)) {
                return chain.filter(exchange);
            }

            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return unauthorized(exchange, "Missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);

            try {
                // 解析 JWT（不解密，由下游授权服务处理）
                Claims claims = parseToken(token);

                // 向下游服务注入用户上下文
                String userId = claims.getSubject();
                String roles = claims.get("roles", String.class);
                String jti = claims.getId(); // JWT ID，用于幂等校验

                ServerHttpRequest mutated = request.mutate()
                    .header("X-User-Id", userId)
                    .header("X-User-Roles", roles)
                    .header("X-Request-Id", jti)
                    .build();

                log.debug("JWT validated for user: {}, path: {}", userId, path);
                return chain.filter(exchange.mutate().request(mutated).build());

            } catch (JwtException e) {
                log.warn("JWT validation failed: {}, path: {}", e.getMessage(), path);
                return unauthorized(exchange, "Invalid token: " + e.getMessage());
            }
        };
    }

    private Claims parseToken(String token) {
        // 使用 JJWT 库，密钥从 Vault 或 K8s Secret 注入
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private Mono<Void> unauthorized(ServerHttpExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        byte[] bytes = ("{\"error\": \"Unauthorized\", \"message\": \"" + message + "\"}").getBytes();
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    private boolean isWhitelisted(String path) {
        return path.startsWith("/api/auth/")
            || path.startsWith("/api/health")
            || path.startsWith("/actuator/health");
    }

    public static class Config {}
}
```

### 3.2 网关级权限控制：Path-Based + Role-Based

```java
@Component
public class AuthorizationFilter implements GatewayFilterFactory<AuthorizationFilter.Config> {

    // Path → 所需角色映射（可从配置中心动态加载）
    private final Map<String, List<String>> pathRolesMap = Map.of(
        "/api/payment/admin/**",  List.of("ROLE_ADMIN"),
        "/api/payment/v*/transfer", List.of("ROLE_USER", "ROLE_TELLER"),
        "/api/account/v1/**",      List.of("ROLE_USER"),
        "/api/report/**",           List.of("ROLE_AUDITOR", "ROLE_ADMIN")
    );

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String path = exchange.getRequest().getPath().value();
            String rolesHeader = exchange.getRequest().getHeaders().getFirst("X-User-Roles");

            if (rolesHeader == null) {
                return forbidden(exchange, "No roles found");
            }

            List<String> userRoles = Arrays.asList(rolesHeader.split(","));
            List<String> requiredRoles = findRequiredRoles(path);

            if (requiredRoles != null && !hasAnyRole(userRoles, requiredRoles)) {
                log.warn("Access denied: user roles {} insufficient for path {}", userRoles, path);
                return forbidden(exchange, "Insufficient permissions");
            }

            return chain.filter(exchange);
        };
    }

    private List<String> findRequiredRoles(String path) {
        return pathRolesMap.entrySet().stream()
            .filter(e -> pathMatcher.match(e.getKey(), path))
            .findFirst()
            .map(Map.Entry::getValue)
            .orElse(null);
    }

    private boolean hasAnyRole(List<String> userRoles, List<String> required) {
        return userRoles.stream().anyMatch(required::contains);
    }
}
```

### 3.3 银行特殊需求：Token 轮转与 Account Takeover 检测

HSBC 这类银行有额外的合规要求：

```java
// 场景1：检测 Token 是否被其他设备使用（Account Takeover）
private void detectAccountTakeover(String userId, String jti, String clientFingerprint) {
    String cacheKey = "token:jti:" + jti;
    String cachedFingerprint = redisTemplate.opsForValue().get(cacheKey);

    if (cachedFingerprint == null) {
        // 首次使用，记录指纹
        redisTemplate.opsForValue().set(cacheKey, clientFingerprint,
            Duration.ofSeconds(tokenExpirySeconds));
    } else if (!cachedFingerprint.equals(clientFingerprint)) {
        // 指纹不匹配：可能是 Account Takeover
        log.error("POTENTIAL ACCOUNT TAKEOVER: user={}, jti={}, expected={}, got={}",
            userId, jti, cachedFingerprint, clientFingerprint);
        // 触发安全告警（SIEM）、吊销 Token
        tokenRevocationService.revoke(jti);
    }
}

// 场景2：同一用户并发 Token 数量限制（合规要求）
private void enforceTokenLimit(String userId) {
    String limitKey = "user:tokens:" + userId;
    Long count = redisTemplate.opsForValue().increment(limitKey);
    if (count != null && count == 1) {
        redisTemplate.expire(limitKey, Duration.ofHours(24));
    }
    if (count != null && count > 5) {
        throw new RejectedExecutionException("Too many active tokens for user: " + userId);
    }
}
```

## 4. 限流：银行系统的资金安全屏障

限流在银行系统中的意义远不止"防高并发"——它直接关系到**资金安全**。想象一下没有限流的转账接口，被恶意高频调用会造成什么后果。

### 4.1 三层限流架构

```
第一层：Gateway 限流（入口层）
  ↓ 请求量过大时在这里丢弃，不消耗下游资源
第二层：Redis Lua 原子限流（分布式精确计数）
  ↓ Redis 集群部署，支持跨实例一致
第三层：业务层限流（精细化控制）
  ↓ 按账户、按交易类型、按时间段
```

### 4.2 基于 Redis 的请求限流（Spring Cloud Gateway 内置）

```yaml
spring:
  cloud:
    gateway:
      redis-rate-limiter:
        redis-rate-limiter.replenishRate: 100      # 每秒补充100个令牌
        redis-rate-limiter.burstCapacity: 200      # 最大突发200个请求
        redis-rate-limiter.requestedTokens: 1     # 每个请求消耗1个令牌
```

### 4.3 银行自定义 Lua 限流：按账户维度

Spring Cloud Gateway 内置的限流是**全局**的，但银行系统往往需要**按账户**限流——同一个账户每秒最多 N 笔交易：

```lua
-- redis-rate-limit-by-account.lua
-- Key:限流Key  Args[1]: replenishRate  Args[2]: burstCapacity  Args[3]: requestedTokens
local key = KEYS[1]
local requested = tonumber(ARGV[3])
local replenishRate = tonumber(ARGV[1])
local burstCapacity = tonumber(ARGV[2])
local now = tonumber(ARGV[4])
local windowSize = 1  -- 1秒窗口

-- 取当前窗口计数
local count = tonumber(redis.call('GET', key) or 0)
local lastRefill = tonumber(redis.call('GET', key .. ':ts') or now)

-- 时间窗口内补充令牌
local elapsed = now - lastRefill
if elapsed > windowSize then
    count = 0
    redis.call('SET', key .. ':ts', now)
end

-- 补充速率令牌
if elapsed >= windowSize then
    count = math.min(burstCapacity, count + replenishRate * (elapsed / windowSize))
end

-- 检查是否允许
if count >= requested then
    count = count - requested
    redis.call('SET', key, count)
    redis.call('EXPIRE', key, 2)
    return 1  -- 允许
else
    return 0  -- 拒绝
end
```

对应的 Java 配置：

```java
@Configuration
public class AccountRateLimiterConfig {
    @Bean
    public RedisRateLimiter accountRateLimiter(RedisConnectionFactory factory) {
        // 传入自定义 Lua 脚本
        return new RedisRateLimiter(
            new DefaultRateLimiter(
                new CustomRedisScript<>(loadLuaScript("redis-rate-limit-by-account.lua"), Long.class)
            )
        );
    }

    private String loadLuaScript(String path) {
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(path)) {
            return new String(is.readAllBytes());
        } catch (IOException e) {
            throw new RuntimeException("Failed to load Lua script", e);
        }
    }
}
```

## 5. 熔断：保护下游服务不被拖垮

### 5.1 Resilience4j 集成

```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        registerHealthIndicator: true
        slidingWindowSize: 10
        slidingWindowType: COUNT_BASED
        minimumNumberOfCalls: 5
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
        permittedNumberOfCallsInHalfOpenState: 3
        slowCallRateThreshold: 80
        slowCallDurationThreshold: 2s
        # 银行特殊：记录所有熔断事件用于审计
        recordExceptions:
          - java.io.IOException
          - feign.FeignException
          - com.hsbc.payment.exception.PaymentException
```

### 5.2 网关 Fallback 策略

```java
@Component
public class PaymentFallbackProvider implements FallbackProvider {

    @Override
    public String getClass() {
        return PaymentServiceClient.class;
    }

    @Override
    public Mono<ServerResponse> fallbackResponse(ServerWebExchange exchange, Throwable cause) {
        String path = exchange.getRequest().getPath().value();

        log.error("Payment service fallback triggered. Path: {}, Reason: {}",
            path, cause.getMessage());

        // 银行特殊处理：资金相关接口返回特定的降级响应
        if (path.contains("transfer")) {
            return ServerResponse.status(HttpStatus.SERVICE_UNAVAILABLE)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                    {
                      "code": "SERVICE_DEGRADED",
                      "message": "支付服务暂时不可用，请稍后重试",
                      "retryAfter": 30,
                      "transactionId": "%s"
                    }
                    """.formatted(exchange.getRequest().getId()));
        }

        return ServerResponse.status(HttpStatus.BAD_GATEWAY)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue("""
                {
                  "code": "UPSTREAM_ERROR",
                  "message": "服务暂时不可用"
                }
                """);
    }
}
```

## 6. 全链路追踪：银行审计的最后一道防线

银行对每笔交易都有**完整的调用链路记录**需求，网关是第一跳：

```yaml
spring:
  sleuth:
    sampler:
      probability: 1.0   # 银行环境：100%采样（不能丢失任何一笔交易的链路）
    propagation:
      type: B3
      remote-fields: X-B3-TraceId,X-B3-SpanId,X-B3-ParentSpanId,X-B3-Sampled
```

网关层生成或传递 TraceId：

```java
@Component
public class TracingFilter implements GlobalFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        HttpHeaders headers = exchange.getRequest().getHeaders();

        // 优先使用上游传入的 TraceId，否则生成新的
        String traceId = headers.getFirst("X-B3-TraceId");
        if (traceId == null) {
            traceId = UUID.randomUUID().toString().replace("-", "");
        }

        String spanId = generateSpanId();

        // 注入响应头，供下游和前端使用
        exchange.getResponse().getHeaders().add("X-Trace-Id", traceId);
        exchange.getResponse().getHeaders().add("X-Trace-Url",
            "https://jaeger.hsbctech.internal/trace/" + traceId); // 内部链路追踪地址

        // 打印结构化日志（银行合规要求）
        log.info("gateway.request traceId={} method={} path={} remoteAddr={}",
            traceId,
            exchange.getRequest().getMethod(),
            exchange.getRequest().getPath().value(),
            exchange.getRequest().getRemoteAddress().getAddress());

        return chain.filter(exchange).then(
            Mono.fromRunnable(() -> {
                log.info("gateway.response traceId={} status={} duration={}ms",
                    traceId,
                    exchange.getResponse().getStatusCode().value(),
                    System.currentTimeMillis() - startTime);
            })
        );
    }
}
```

## 7. 总结：银行网关配置检查清单

| 检查项 | 说明 | 优先级 |
|--------|------|--------|
| JWT 验证 + 签名校验 | 拒绝伪造 Token | P0 |
| 请求 TraceId 注入 | 链路追踪的起点 | P0 |
| 路径白名单 | health check 等不鉴权 | P0 |
| 限流（按账户维度） | 防止资金风险 | P0 |
| 熔断 Fallback | 保护下游不过载 | P1 |
| RBAC 权限控制 | Path → Role 映射 | P1 |
| 结构化审计日志 | traceId, userId, path, status | P1 |
| TLS 双向认证（mTLS） | 银行内网服务间通信 | P1 |
| CORS 配置 | 限制允许的来源域名 | P1 |
| 请求体大小限制 | 防止 DOS | P2 |
| Cache-Control | 敏感数据不缓存 | P2 |

网关是银行微服务架构中最容易被忽视、又最容易出问题的组件。希望这篇实战指南能帮你避过那些我在项目中踩过的坑。

---

*相关阅读：[Spring Cloud 微服务入门完全指南](/coding/SpringCloud/SpringCloud微服务入门完全指南) · [分布式系统可观测性实战](/coding/架构心得/分布式系统可观测性实战) · [Spring Security 与 OAuth2 银行级安全实战](/coding/架构心得/SpringSecurity与OAuth2银行级安全实战)*
