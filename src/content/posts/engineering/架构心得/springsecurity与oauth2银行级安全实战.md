---
title: Spring Security + OAuth 2.0 银行级安全实战
summary: 在银行系统里，API 安全不是"保护代码"，而是"保护客户的资金和数据"。一次 API 安全漏洞的后果，不是网站被挂马，而是：
publishedAt: '2026-03-19'
track: engineering
topic: 架构心得
tags: []
featured: false
draft: false
slug: springsecurity与oauth2银行级安全实战
legacyPaths:
  - /coding/架构心得/SpringSecurity与OAuth2银行级安全实战
---
> JWT、OIDC、Zero Trust——在合规框架下实现真正的 API 安全

---

## 目录

1. [银行业 API 安全的独特挑战](#1-银行业-api-安全的独特挑战)
2. [OAuth 2.0 核心概念快速梳理](#2-oauth-20-核心概念快速梳理)
3. [Spring Security 6 实战配置](#3-spring-security-6-实战配置)
4. [JWT 令牌的安全处理](#4-jwt-令牌的安全处理)
5. [微服务间的安全通信：mTLS 与 JWT 验证](#5-微服务间的安全通信mtls-与-jwt-验证)
6. [零信任架构在银行系统的落地](#6-零信任架构在银行系统的落地)
7. [常见漏洞与防御实践](#7-常见漏洞与防御实践)
8. [合规审计与 Token 管理](#8-合规审计与-token-管理)

---

## 1. 银行业 API 安全的独特挑战

在银行系统里，API 安全不是"保护代码"，而是"保护客户的资金和数据"。一次 API 安全漏洞的后果，不是网站被挂马，而是：
- 客户账户信息泄露 → 监管罚款 + 声誉损失
- 未经授权的资金转移 → 实际经济损失
- 反洗钱系统被绕过 → 监管制裁

这要求 API 安全设计必须从一开始就内置，而不是事后打补丁。

### 1.1 监管框架的硬性要求

```
┌──────────────────────────────────────────────────────┐
│  主要监管框架                                        │
├──────────────────────────────────────────────────────┤
│  PSD2（欧盟支付服务指令 II）                         │
│  → 强制要求强客户认证（SCA）                         │
│  → API 必须遵循 OAuth 2.0 / OpenID Connect          │
│  → 交易限额与风险评估                                │
├──────────────────────────────────────────────────────┤
│  PCI DSS（支付卡行业数据安全标准）                   │
│  → API 中禁止明文传输、存储敏感卡数据                │
│  → Tokenization 替代真实卡号                        │
│  → 所有 API 调用必须经过身份验证                     │
├──────────────────────────────────────────────────────┤
│  MAS TRM（新加坡金管局技术风险管理指南）              │
│  → API 网关强制实施速率限制                         │
│  → 敏感 API 需要额外验证层                          │
└──────────────────────────────────────────────────────┘
```

### 1.2 多方参与者的身份管理

银行 API 的调用方不只是"用户"，还有：
- **内部服务**：微服务之间的 API 调用（Service-to-Service）
- **合作伙伴（Partner）**：第三方金融服务提供商通过 API 接入
- **内部员工**：网银系统、手机银行等面向客户的渠道
- **监管机构**：监管报送 API（通常需要特殊的高权限 Token）

这意味着你需要支持多种 **OAuth 2.0 Grant Type**，对应不同的授权场景。

---

## 2. OAuth 2.0 核心概念快速梳理

### 2.1 四种授权类型

```
┌────────────────┬────────────────────────────────┬──────────────────────┐
│ Grant Type     │ 适用场景                        │ 银行场景             │
├────────────────┼────────────────────────────────┼──────────────────────┤
│ Authorization  │ 用户登录网银/手机银行          │ 网银登录              │
│ Code + PKCE    │ SPA / 移动 App（无后端）        │ 手机银行 App         │
│ Client         │ 微服务之间的 API 调用           │ 服务间 RPC           │
│ Credentials    │ 机器/系统级别认证               │ 内部系统集成          │
└────────────────┴────────────────────────────────┴──────────────────────┘
```

### 2.2 银行系统的 Token 策略

```
Access Token：
  - 短期（5-15 分钟）
  - 用于调用受保护的 API
  - JWT 格式，包含用户身份和权限
  - 存储在内存中（不要放在 localStorage！）

Refresh Token：
  - 长期（数小时到数天）
  - 用于获取新的 Access Token
  - 存储在 HttpOnly Cookie 或安全存储中
  - 单次使用（使用后失效并颁发新的）

ID Token：
  - OpenID Connect 专用
  - 包含用户身份信息（sub, name, email）
  - 用于前端展示用户信息
  - 不能用于 API 授权（不是 Access Token）
```

---

## 3. Spring Security 6 实战配置

### 3.1 项目结构

```yaml
# pom.xml 关键依赖
# Spring Boot 3.x + Spring Security 6
# <dependency>
#     <groupId>org.springframework.boot</groupId>
#     <artifactId>spring-boot-starter-security</artifactId>
# </dependency>
# <dependency>
#     <groupId>org.springframework.boot</groupId>
#     <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
# </dependency>
# <dependency>
#     <groupId>org.springframework.boot</groupId>
#     <artifactId>spring-boot-starter-oauth2-client</artifactId>
# </dependency>
```

### 3.2 Spring Security 6 安全配置

```java
// SecurityConfig.java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // 启用方法级 @PreAuthorize 等注解
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. CSRF 保护：API 使用 Token 验证，不需要传统 CSRF token
            // 但需要注意 Authorization Header 的使用
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                // 对于纯 API 服务（无浏览器场景），可以完全禁用 CSRF
                // .ignoringRequestMatchers("/api/**")
            )

            // 2. CORS 配置
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // 3. 授权规则
            .authorizeHttpRequests(auth -> auth
                // 公开端点：健康检查、登录、Token 获取
                .requestMatchers(
                    "/actuator/health",
                    "/actuator/health/**",
                    "/api/v1/auth/login",
                    "/api/v1/auth/refresh",
                    "/api/v1/public/**"
                ).permitAll()

                // 监管报送 API：需要特殊角色
                .requestMatchers("/api/v1/regulatory/**").hasRole("REGULATORY")

                // 管理员 API：需要 ADMIN 角色
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                // 交易 API：需要 CUSTOMER 或 INTERNAL_SYSTEM 角色
                .requestMatchers("/api/v1/transactions/**")
                    .hasAnyRole("CUSTOMER", "INTERNAL_SYSTEM")

                // 其他所有请求：已认证
                .anyRequest().authenticated()
            )

            // 4. OAuth2 资源服务器配置（JWT 验证）
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
                // 自定义异常处理：JWT 验证失败时返回标准错误格式
                .accessDeniedHandler(customAccessDeniedHandler())
                .authenticationEntryPoint(customAuthenticationEntryPoint())
            )

            // 5. Session 管理：API 使用无状态 Token，不需要 Session
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // 6. 安全头
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())  // 防止点击劫持
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; script-src 'self'")
                )
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
            );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // 从银行身份提供商获取 JWKS（JSON Web Key Set）
        return JwtDecoders.fromIssuerLocation(
            "https://identity.hsbc.com/oauth2/v2.0"
        );
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter =
            new JwtGrantedAuthoritiesConverter();
        // 从 JWT 的 roles claim 提取权限（而不是默认的 scope）
        grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
        grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return jwtConverter;
    }
}
```

### 3.3 资源服务器 JWT 验证流程

```
收到 API 请求
    ↓
提取 Authorization Header：
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
    ↓
从 Authorization Server 的 JWKS 端点获取公钥
https://identity.hsbc.com/oauth2/v2.0/.well-known/jwks.json
    ↓
用公钥验证 JWT 签名
    ↓
验证 JWT 的 Claims：
  - iss（签发者）：是否是信任的 Authorization Server
  - aud（受众）：是否是本服务（audience 校验）
  - exp（过期时间）：Token 是否有效
  - iat（签发时间）：Token 是否在有效期内
  - roles/roles：用户权限
    ↓
通过验证 → 提取身份信息，继续处理请求
失败 → 返回 401 Unauthorized
```

---

## 4. JWT 令牌的安全处理

### 4.1 前后端分离架构的 Token 策略

```typescript
// 前端：使用 HttpOnly Cookie 存储 Refresh Token（防 XSS）
// Access Token 存在内存中（不要存 localStorage/sessionStorage）

// API 调用时：从内存中读取 Access Token，放入 Header
class AuthService {
  private accessToken: string | null = null;

  async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',  // 发送 HttpOnly Cookie
      headers: {
        ...options.headers,
        // Access Token 从内存读取
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Access Token 过期，尝试刷新
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // 重试原请求
        return this.fetch<T>(url, options);
      } else {
        // 刷新失败，跳转登录
        window.location.href = '/login';
      }
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<boolean> {
    // Refresh Token 自动随 Cookie 发送，无需手动处理
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',  // 关键：发送 HttpOnly Cookie
    });
    return response.ok;
  }
}
```

### 4.2 后端 Token 刷新端点

```java
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request,
                                     HttpServletResponse response) {
        // 从 HttpOnly Cookie 获取 Refresh Token
        String refreshToken = extractFromCookie(request, "refresh_token");

        if (refreshToken == null || refreshTokenService.isRevoked(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("INVALID_REFRESH_TOKEN"));
        }

        // 验证 Refresh Token
        Claims claims = jwtTokenService.validateRefreshToken(refreshToken);
        String userId = claims.getSubject();

        // 生成新的 Access Token
        String newAccessToken = jwtTokenService.generateAccessToken(userId);

        // Rotate Refresh Token（一次一用）
        String newRefreshToken = jwtTokenService.generateRefreshToken(userId);

        // 作废旧的 Refresh Token
        refreshTokenService.revoke(refreshToken);

        // 新的 Refresh Token 放入 HttpOnly Cookie
        response.addCookie(createHttpOnlyCookie("refresh_token", newRefreshToken,
            jwtTokenService.getRefreshTokenExpiry()));

        return ResponseEntity.ok()
            .body(new AccessTokenResponse(newAccessToken,
                jwtTokenService.getAccessTokenExpiry()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request,
                                    HttpServletResponse response) {
        String refreshToken = extractFromCookie(request, "refresh_token");
        if (refreshToken != null) {
            refreshTokenService.revoke(refreshToken);
        }

        // 清空 Cookie
        Cookie cookie = new Cookie("refresh_token", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);  // HTTPS only
        cookie.setPath("/api/v1/auth/refresh");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok().body(Map.of("message", "Logged out"));
    }

    private String extractFromCookie(HttpServletRequest request, String name) {
        return Arrays.stream(request.getCookies())
            .filter(c -> c.getName().equals(name))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }
}
```

### 4.3 JWT 声明的完整校验

```java
@Service
public class JwtValidationService {

    @Value("${security.oauth2.resourceserver.jwt.issuer-uri}")
    private String expectedIssuer;

    @Value("${security.oauth2.resourceserver.jwt.audience}")
    private String expectedAudience;

    public Authentication validateAndExtract(String token) {
        try {
            Jwt jwt = jwtDecoder.decode(token);

            // 1. 签发者校验
            if (!expectedIssuer.equals(jwt.getIssuer())) {
                throw new JwtValidationException("Invalid issuer");
            }

            // 2. 受众校验（防止 Token 被用于错误的服务）
            List<String> audiences = jwt.getAudience();
            if (!audiences.contains(expectedAudience)) {
                throw new JwtValidationException("Invalid audience");
            }

            // 3. 账户状态校验（支持 Token 撤销）
            String userId = jwt.getSubject();
            if (userBlacklistService.isBlacklisted(userId)) {
                throw new JwtValidationException("User is blacklisted");
            }

            // 4. JWT ID 校验（防止 replay attack）
            String jti = jwt.getId();
            if (jwtIdRegistry.isUsed(jti)) {
                throw new JwtValidationException("Token reuse detected (JTI)");
            }
            jwtIdRegistry.markAsUsed(jti, jwt.getExpiresAt());

            // 5. 权限提取
            List<String> roles = jwt.getClaimAsStringList("roles");

            return new Authentication(userId, roles, jwt);

        } catch (JwtException e) {
            throw new JwtValidationException("Token validation failed: " + e.getMessage(), e);
        }
    }
}
```

---

## 5. 微服务间的安全通信：mTLS 与 JWT 验证

### 5.1 服务间认证的两种模式

在微服务架构中，服务间的通信（Service-to-Service, S2S）有两种主要模式：

```
模式 A：JWT 验证（适用于同步 HTTP 调用）
  Account Service → Payment Service
  携带 JWT：Authorization: Bearer eyJhbGci...

模式 B：mTLS（适用于高安全要求的场景）
  两个服务都有证书，互相验证对方证书
  双向认证，更安全但配置复杂
```

### 5.2 Feign Client 服务间调用（JWT 传递）

```java
// AccountService 调用 Payment Service
// 关键：在 Feign 层注入 Access Token，自动传播到下游服务

@Configuration
public class FeignClientConfig {

    @Bean
    public RequestInterceptor bearerTokenInterceptor(
            HttpServletRequest httpRequest) {
        return template -> {
            // 从当前请求中提取 Authorization Header
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                template.header("Authorization", authHeader);
            }
        };
    }
}

// PaymentService 的 Account Client
@FeignClient(name = "account-service", configuration = FeignClientConfig.class)
public interface AccountClient {

    @GetMapping("/internal/accounts/{accountId}/balance")
    AccountBalance getBalance(@PathVariable String accountId);
}
```

### 5.3 Spring Cloud Gateway 的安全增强

```yaml
# application.yml - API Gateway 安全配置
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${ISSUER_URI}
          jwk-set-uri: ${JWK_SET_URI}

  cloud:
    gateway:
      mvc:
        predicates:
          - Path=/api/**
      default-filters:
        # 1. JWT 验证过滤器
        - name: RequestRateLimiter
          args:
            redis-rate-limiter.replenishRate: 100
            redis-rate-limiter.burstCapacity: 200
            redis-rate-limiter.requestedTokens: 1

        # 2. 安全头过滤器（已在 Spring Security 配置）
        # 3. 审计日志过滤器
        - name: AuditLog
          args:
            auditService: auditService
```

```java
// 自定义 Gateway 过滤器：添加审计日志
@Component
public class AuditLogGatewayFilter implements GlobalFilter, Ordered {

    private final AuditService auditService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();
        String method = request.getMethod().name();

        // 跳过审计的路径
        if (isExcludedPath(path)) {
            return chain.filter(exchange);
        }

        String userId = extractUserId(exchange);
        String traceId = exchange.getLogName();  // 或从 Header 获取

        return chain.filter(exchange).then(
            Mono.fromRunnable(() -> {
                ServerHttpResponse response = exchange.getResponse();
                int status = response.getStatusCode().value();

                auditService.logApiAccess(
                    ApiAccessLog.builder()
                        .userId(userId)
                        .method(method)
                        .path(path)
                        .statusCode(status)
                        .traceId(traceId)
                        .timestamp(Instant.now())
                        .build()
                );
            })
        );
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
```

---

## 6. 零信任架构在银行系统的落地

### 6.1 零信任的核心原则

```
传统安全：信任内网，防御边界
  "防火墙内 = 可信"
  → 一旦边界被突破，攻击者可以横向移动

零信任：永不信任，始终验证
  "永不因为在某个网络位置而信任任何请求"
  → 每个 API 调用都必须经过身份验证和授权
```

### 6.2 银行系统的零信任实施清单

```yaml
# 零信任在 Kubernetes / 微服务架构中的实施
# 1. 服务网格（Service Mesh）：所有服务间通信经过 sidecar proxy
# → 使用 Istio 或 Linkerd 实现 mTLS、自动 JWT 验证

# 2. 网络策略（Network Policy）：Pod 级别的网络隔离
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-network-policy
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # 仅允许来自 API Gateway 的流量
    - from:
        - namespaceSelector:
            matchLabels:
              name: gateway
        - podSelector:
            matchLabels:
              app: gateway
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # 仅允许访问白名单中的服务和 DNS
    - to:
        - podSelector:
            matchLabels:
              app: account-service
      ports:
        - protocol: TCP
          port: 8080
    - to:
        - namespaceSelector: {}  # 允许 DNS
      ports:
        - protocol: UDP
          port: 53
```

---

## 7. 常见漏洞与防御实践

### 7.1 OWASP API Security Top 10（2023）

| 排名 | 威胁 | 银行场景示例 | 防御措施 |
|------|------|------------|---------|
| API1 | 对象级别授权失效 | 用户 A 通过修改 URL 中的 accountId，访问用户 B 的账户 | 每个 API 端点验证资源归属 |
| API2 | 认证失效 | 弱密码、无 MFA、Session fixation | OAuth 2.0 + PKCE、MFA、短期 Token |
| API3 | 过度数据暴露 | API 返回完整用户对象，前端只用了部分字段 | 精确的 DTO 映射，只返回必要字段 |
| API4 | 缺乏资源限制 | 无速率限制，可无限枚举账户 | API Gateway 强制速率限制 |
| API5 | 批量访问控制失效 | 一个 API 端点允许访问所有账户 | 每个端点单独做授权校验 |
| API6 | 错误配置 | 生产环境开启调试模式、详细错误信息 | 生产环境禁用 stack trace、返回通用错误 |

### 7.2 精确的 DTO 映射（防止数据过度暴露）

```java
// ❌ 危险：直接返回 JPA Entity
@GetMapping("/accounts/{accountId}")
public Account getAccount(@PathVariable String accountId) {
    return accountRepository.findById(accountId)
        .orElseThrow(() -> new NotFoundException());
}

// 问题：Account Entity 可能包含：
// - passwordHash
// - internalNotes
// - complianceFlags
// - riskScores
// 这些敏感字段通过 API 暴露给客户端！

// ✅ 安全：使用 DTO，只暴露必要字段
public record AccountResponse(
    String accountId,
    String accountNumber,  // 完整或脱敏
    String accountName,
    Money currentBalance,
    AccountStatus status,
    List<String> allowedCurrencies
) {}

@GetMapping("/accounts/{accountId}")
public AccountResponse getAccount(@PathVariable String accountId,
                                   @AuthenticationPrincipal Jwt jwt) {
    String requestingUserId = jwt.getSubject();

    Account account = accountRepository.findById(accountId)
        .orElseThrow(() -> new NotFoundException());

    // 关键：验证请求者是否有权访问此账户
    if (!accountService.canAccess(requestingUserId, accountId)) {
        throw new AccessDeniedException("无权访问此账户");
    }

    // 手动映射，确保只暴露授权的字段
    return AccountResponse.builder()
        .accountId(account.getId())
        .accountNumber(maskAccountNumber(account.getAccountNumber()))
        .accountName(account.getAccountName())
        .currentBalance(account.getBalance())
        .status(account.getStatus())
        .allowedCurrencies(account.getAllowedCurrencies())
        .build();
}

// 账号脱敏函数
private String maskAccountNumber(String accountNumber) {
    if (accountNumber == null || accountNumber.length() < 8) {
        return "****";
    }
    // 保留前4位和后4位，中间用 * 替代
    return accountNumber.substring(0, 4)
        + "****"
        + accountNumber.substring(accountNumber.length() - 4);
}
```

### 7.3 速率限制的多层实现

```java
// 1. Gateway 层：全局速率限制
// 2. Service 层：业务级速率限制
// 3. Repository 层：数据访问级限制（防止暴力查询）

@Service
public class AccountAccessService {

    private final RedisTemplate<String, String> redisTemplate;

    // 每分钟允许的账户查询次数（基于用户 ID）
    private static final int QUERIES_PER_MINUTE = 60;

    public Account getAccountForUser(String requestingUserId,
                                     String targetAccountId) {
        // 基于用户维度的速率限制
        String rateLimitKey = String.format("rate:account:user:%s", requestingUserId);

        Long currentCount = redisTemplate.opsForValue().increment(rateLimitKey);
        if (currentCount != null && currentCount == 1) {
            // 第一次，设置过期时间
            redisTemplate.expire(rateLimitKey, Duration.ofMinutes(1));
        }

        if (currentCount != null && currentCount > QUERIES_PER_MINUTE) {
            throw new RateLimitExceededException(
                "请求过于频繁，请稍后再试");
        }

        // 业务逻辑...
        return accountRepository.findById(targetAccountId);
    }
}
```

---

## 8. 合规审计与 Token 管理

### 8.1 完整的 API 审计日志

```java
// 审计日志：每笔 API 调用都需要记录
@Service
public class AuditService {

    @Async  // 异步写入，不阻塞 API 响应
    public void logApiAccess(ApiAccessLog log) {
        auditLogRepository.save(log);
    }
}

@Entity
@Table(name = "api_audit_log")
public class ApiAccessLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;  // JWT 的 sub claim

    @Column(nullable = false)
    private String tokenJti;  // JWT 的 jti claim（用于追踪特定 Token）

    @Column(nullable = false)
    private String method;  // GET, POST, PUT, DELETE

    @Column(nullable = false)
    private String path;  // /api/v1/accounts/123

    @Column
    private String requestBody;  // 脱敏后的请求体

    @Column
    private String responseBody;  // 脱敏后的响应体（可选，部分场景需要）

    @Column(nullable = false)
    private Integer statusCode;

    @Column
    private String clientIp;

    @Column
    private String userAgent;

    @Column
    private String traceId;  // 用于关联分布式追踪

    @Column(nullable = false)
    private Instant timestamp;

    @Column
    private String outcome;  // SUCCESS, FAILURE, PARTIAL

    @Column
    private String failureReason;  // 如果失败，原因是什么

    @Column
    private String resourceId;  // 操作的资源 ID（如 accountId, transactionId）

    @Column
    private String riskScore;  // 风控评分（可选）

    // 合规要求：日志保留期限（7 年）
}
```

### 8.2 Token 撤销与失效名单

```java
@Service
public class TokenBlacklistService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final String BLACKLIST_PREFIX = "token:blacklist:";

    // 当用户主动注销、更改密码、被管理员禁用时，撤销其所有 Token
    public void revokeAllUserTokens(String userId) {
        // 将用户加入黑名单（在 JWT 验证时检查）
        redisTemplate.opsForValue().set(
            BLACKLIST_PREFIX + userId,
            "revoked",
            Duration.ofDays(7)  // Token 最大有效期
        );
    }

    // 当管理员需要撤销特定 Token（如设备丢失）时
    public void revokeTokenByJti(String jti, Instant expiry) {
        long ttlSeconds = Duration.between(Instant.now(), expiry).getSeconds();
        if (ttlSeconds > 0) {
            redisTemplate.opsForValue().set(
                BLACKLIST_PREFIX + "jti:" + jti,
                "revoked",
                Duration.ofSeconds(ttlSeconds)
            );
        }
    }

    public boolean isBlacklisted(String jti, String userId) {
        // 检查 Token JTI
        if (Boolean.TRUE.equals(
                redisTemplate.hasKey(BLACKLIST_PREFIX + "jti:" + jti))) {
            return true;
        }
        // 检查用户
        if (Boolean.TRUE.equals(
                redisTemplate.hasKey(BLACKLIST_PREFIX + userId))) {
            return true;
        }
        return false;
    }
}
```

---

## 结语

银行 API 安全的设计哲学是：**不要信任任何输入，不要假设任何边界，永远验证**。

从 OAuth 2.0 的正确实现，到 JWT 的精细化校验，到服务间的零信任通信——每一个环节都是一道防线。监管合规不是负担，而是经过几十年实践验证的安全基线。

三条核心原则：

1. **最小权限**：`hasAnyRole("CUSTOMER", "INTERNAL_SYSTEM")`——永远只给调用方它需要的最低权限
2. **精确映射**：DTO 永远优于 Entity，只暴露必要字段
3. **可审计**：每一次 API 调用都必须留下审计日志，Token 即身份，身份即责任

*Bobot 🦐 | 汇丰科技园 | 2026-03-19*
