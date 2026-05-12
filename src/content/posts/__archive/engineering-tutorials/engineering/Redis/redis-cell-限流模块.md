---
title: Redis-Cell 限流模块：令牌桶的原子实现
summary: >-
  详解 Redis 4.0 新增的 Redis-Cell 模块（CL.THROTTLE 命令）、令牌桶 vs 漏桶算法对比，以及在银行 API
  网关、支付接口限流中的实战。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Redis
tags: []
featured: false
draft: false
slug: redis-cell-限流模块
legacyPaths:
  - /coding/Redis/Redis-Cell 限流模块
---
> "Redis-Cell 是 Redis 4.0 带来的原生限流命令，比 Lua 脚本更快、比滑动窗口更精确。银行 API 网关的限流，CL.THROTTLE 是首选。"

## 前言

Redis 实现限流有三种方案：Lua 脚本、滑动窗口、Redis-Cell。Redis-Cell（`cl.throttle` 命令）是**最简单的令牌桶实现**，Redis 原生支持，原子操作，无需编写 Lua 脚本。在银行 API 网关中，限流是保障系统稳定性的第一道防线。

## 1. 限流算法对比

| 算法 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **计数器** | 固定窗口内计数 | 简单 | 边界突发问题 |
| **滑动窗口** | 移动时间窗口 | 精度较高 | 实现复杂 |
| **漏桶** | 恒定速率消费 | 流量平滑 | 不适合突发 |
| **令牌桶** | 固定速率放令牌 | 允许突发 + 平滑 | 实现较复杂 |
| **Redis-Cell** | 原生命令桶 | 原子、简单、高性能 | 需要安装模块 |

## 2. CL.THROTTLE 命令详解

Redis-Cell 模块是 Redis 4.0+ 的可选模块，需要单独安装：

```bash
# 安装（Linux/macOS）
wget https://github.com/brandt/redis-cell/releases/download/v0.3.0/redis-cell-v0.3.0-x86_64-unknown-linux-gnu.tar.gz
tar xzf redis-cell-v0.3.0-x86_64-unknown-linux-gnu.tar.gz
cp libredis_cell.so /path/to/redis/modules/
redis-server --loadmodule /path/to/redis/modules/libredis_cell.so

# Docker 方式（推荐）
docker run -d --name redis-cell \
  redis:7 redis-server --loadmodule /usr/local/lib/redis/modules/libredis_cell.so
```

### 2.1 命令格式

```bash
# CL.THROTTLE key capacity count period [quota] [block]
#
# 参数：
#   key       - 限流 key（用户 ID、IP、API 路径）
#   capacity  - 漏斗容量（即最大突发量）
#   count     - 补充速率（period 时间内补充的令牌数）
#   period    - 时间窗口（秒）
#   quota     - 可选，刷新周期内的配额（默认 = count）
#   block     - 可选，阻塞等待时间（秒，0 = 不阻塞）

# 示例：每 60 秒最多 30 次请求，容量 15（即前 15 次可以突发通过）
CL.THROTTLE user:1000:api 15 30 60
```

### 2.2 返回值解析

```bash
CL.THROTTLE user:1000:api 15 30 60

# 返回 5 个值：
# 1) 0           → 0=允许，1=拒绝
# 2) 15          → 容量（capacity）
# 3) 14          → 剩余配额（quota left）
# 4) 0           → 如果被拒绝，下次重试需等多少秒（0 表示立即可重试）
# 5) 2           → 多长时间后配额完全恢复（秒）
```

```
  quota = 0（已耗尽）
    │
    ▼
  ┌─────────────────────────────────────────┐
  │ capacity = 15（漏斗容量，最大突发量）      │
  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ ← quota left = 12   │
  │ ▓ = 已使用的配额                          │
  │ ░ = 剩余配额                             │
  └─────────────────────────────────────────┘
    ↑ 每秒补充 count/period 个配额
    ↑ quota 归零后，新请求被拒绝
```

## 3. 常见限流场景配置

```bash
# 场景 1：普通 API 限流（每用户每分钟 60 次）
CL.THROTTLE rate:user:1000:api 60 60 60
# 容量 60 + 速率 60/60秒 = 每秒 1 次

# 场景 2：支付接口严格限流（每用户每分钟 5 次）
CL.THROTTLE rate:user:1000:payment 5 5 60
# 容量 5 + 5次/60秒 = 支付接口极为严格

# 场景 3：突发限流（允许短时突发，但长期不超过速率）
# 用户平时请求少，突然来 20 个请求，容量 20 允许突发通过
CL.THROTTLE rate:user:1000:api 20 10 60
# 容量 20 + 10次/60秒

# 场景 4：全局限流（IP 级别）
CL.THROTTLE rate:ip:192.168.1.100:api 100 200 60
```

## 4. Java 实现：Spring Boot 整合

### 4.1 依赖与配置

```xml
<dependency>
    <groupId>io.github.resdq0x</groupId>
    <artifactId>redis-cell</artifactId>
    <version>0.3.0</version>
</dependency>
```

```java
@Configuration
public class RedisCellConfig {
    @Bean
    public RedisClient redisClient(RedisConnectionFactory factory) {
        return RedisClient.create(factory.getReactiveConnection());
    }
}
```

### 4.2 限流服务

```java
@Service
@Slf4j
public class RateLimitService {
    private final RedisTemplate<String, String> redis;

    /**
     * 执行限流检查
     * @param key      限流 key（通常 = rate:user:{userId}:{apiPath}）
     * @param capacity 漏斗容量（最大突发量）
     * @param count    速率（每 period 秒内的配额数）
     * @param period   时间窗口（秒）
     * @return RateLimitResult 包含是否允许、剩余配额、重试时间
     */
    public RateLimitResult tryAcquire(String key, long capacity,
                                      long count, long period) {
        String[] args = {
            String.valueOf(capacity),
            String.valueOf(count),
            String.valueOf(period)
        };

        // 使用反射调用 CL.THROTTLE（Spring Data Redis 未直接封装）
        Long[] result = redis.execute(
            new RedisCallback<Long[]>() {
                @Override
                public Long[] doInRedis(RedisConnection connection)
                        throws DataAccessException {
                    connection.commands(
                        (Commands) connection.getNativeConnection()
                    );
                    // 调用原生 CL.THROTTLE
                    return executeThrottle(connection, key, args);
                }
            }
        );

        if (result == null || result.length < 5) {
            log.warn("CL.THROTTLE 调用失败，假设允许通过");
            return RateLimitResult.allowed(capacity, capacity);
        }

        boolean allowed = result[0] == 0;
        long quotaLeft = result[2];
        long retryAfter = result[3];
        long resetIn = result[4];

        return new RateLimitResult(allowed, quotaLeft, retryAfter, resetIn, capacity);
    }

    // 反射调用 CL.THROTTLE（Redis-Cell 模块命令）
    private Long[] executeThrottle(RedisConnection conn,
                                   String key, String[] args) {
        try {
            Commands commands = (Commands) conn;
            CommandResponse<Long[], ?> resp =
                commands.execute("CL.THROTTLE",
                    key, args[0], args[1], args[2]);

            // 解析 Redis 数组响应
            // 返回格式：[0, capacity, quota_left, retry_after, reset_in]
            return parseArrayResponse(resp);
        } catch (Exception e) {
            log.error("限流命令执行失败: key={}", key, e);
            return null;
        }
    }
}

@Data
@AllArgsConstructor
public class RateLimitResult {
    private boolean allowed;     // 是否允许通过
    private long quotaLeft;      // 剩余配额
    private long retryAfter;    // 拒绝后重试等待秒数
    private long resetIn;        // 完全恢复所需秒数
    private long capacity;      // 容量

    public static RateLimitResult allowed(long quotaLeft, long capacity) {
        return new RateLimitResult(true, quotaLeft, 0, 0, capacity);
    }
}
```

### 4.3 限流注解 + AOP

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RateLimit {
    String key();                       // 限流 key 模板
    long capacity() default 60;         // 容量（突发量）
    long count() default 60;           // 速率
    long period() default 60;          // 时间窗口（秒）
    String message() default "请求过于频繁，请稍后重试";
}

@Aspect
@Component
@Slf4j
public class RateLimitAspect {

    private final RateLimitService rateLimitService;

    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint joinPoint,
                         RateLimit rateLimit) throws Throwable {

        // 从请求上下文提取 key
        String key = resolveKey(rateLimit.key(), joinPoint);

        RateLimitResult result = rateLimitService.tryAcquire(
            key,
            rateLimit.capacity(),
            rateLimit.count(),
            rateLimit.period()
        );

        if (!result.isAllowed()) {
            log.warn("限流触发: key={}, quotaLeft={}", key, result.getQuotaLeft());
            throw new RateLimitExceededException(
                rateLimit.message(),
                result.getRetryAfter()
            );
        }

        return joinPoint.proceed();
    }

    private String resolveKey(String keyTemplate, ProceedingJoinPoint point) {
        // 替换 {userId}、{ip} 等占位符
        HttpServletRequest request = getRequest();
        return keyTemplate
            .replace("{userId}", getCurrentUserId())
            .replace("{ip}", getClientIp())
            .replace("{path}", request.getRequestURI());
    }
}
```

### 4.4 Controller 使用

```java
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    @RateLimit(
        key = "rate:user:{userId}:payment",
        capacity = 10,
        count = 10,
        period = 60,
        message = "支付接口限流，每分钟最多 10 次"
    )
    @PostMapping
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody PaymentRequest request) {
        // 业务逻辑
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @RateLimit(
        key = "rate:user:{userId}:api",
        capacity = 120,
        count = 120,
        period = 60,
        message = "API 调用超限，每分钟最多 120 次"
    )
    @GetMapping("/balance")
    public ResponseEntity<ApiResponse<BigDecimal>> getBalance(
            @RequestParam String accountId) {
        return ResponseEntity.ok(ApiResponse.success(balance));
    }
}
```

## 5. 银行系统限流策略

```bash
# 银行 API 网关分层限流：

# 第一层：全局限流（Redis Cluster）
CL.THROTTLE rate:global:api 10000 10000 1
# 1 秒内全局最多 10000 请求

# 第二层：服务级别限流
CL.THROTTLE rate:service:payment 1000 1000 1
# payment 服务每秒最多 1000 请求

# 第三层：用户级别限流
CL.THROTTLE rate:user:123456:payment 5 5 60
# 每个用户每分钟最多 5 次支付

# 第四层：IP 级别防爬
CL.THROTTLE rate:ip:203.0.113.50:api 50 100 60
# 每个 IP 每分钟最多 100 次
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TieredRateLimitService {
    private final RateLimitService rateLimitService;

    public void checkAllTiers(String userId, String ip, String service) {
        // 1. 全局限流
        RateLimitResult global = rateLimitService.tryAcquire(
            "rate:global:api", 5000, 5000, 1);
        if (!global.isAllowed()) {
            throw new RateLimitExceededException("系统繁忙，请稍后重试", 1);
        }

        // 2. 服务级限流
        RateLimitResult serviceLimit = rateLimitService.tryAcquire(
            "rate:service:" + service, 500, 500, 1);
        if (!serviceLimit.isAllowed()) {
            throw new RateLimitExceededException(service + " 服务限流，请稍后重试", 1);
        }

        // 3. 用户级限流
        RateLimitResult userLimit = rateLimitService.tryAcquire(
            "rate:user:" + userId + ":" + service, 60, 60, 60);
        if (!userLimit.isAllowed()) {
            throw new RateLimitExceededException("请求过于频繁", userLimit.getRetryAfter());
        }

        // 4. IP 级防爬
        RateLimitResult ipLimit = rateLimitService.tryAcquire(
            "rate:ip:" + ip + ":api", 100, 100, 60);
        if (!ipLimit.isAllowed()) {
            log.warn("IP 疑似爬虫: ip={}", ip);
            throw new RateLimitExceededException("请求过于频繁", ipLimit.getRetryAfter());
        }
    }
}
```

## 6. 限流结果处理

```java
// 全局异常处理：限流ExceededException
@ExceptionHandler(RateLimitExceededException.class)
public ResponseEntity<ApiResponse<Void>> handleRateLimit(
        RateLimitExceededException ex, HttpServletResponse response) {

    // 设置 Retry-After 响应头（RFC 6585）
    response.setHeader("Retry-After", String.valueOf(ex.getRetryAfter()));
    response.setHeader("X-RateLimit-Remaining", "0");

    return ResponseEntity
        .status(429)  // 429 Too Many Requests
        .header("Retry-After", String.valueOf(ex.getRetryAfter()))
        .body(ApiResponse.error("RATE_LIMIT_EXCEEDED", ex.getMessage(), null));
}
```

## 7. Redis-Cell vs 其他方案对比

| 特性 | Redis-Cell | Lua 脚本 | 滑动窗口 |
|------|-----------|---------|---------|
| 原子性 | ✅ 原生 | ✅ Lua 原子 | ⚠️ 需配合 |
| 实现难度 | 低 | 中 | 高 |
| 性能 | 最高 | 高 | 高 |
| 精度 | 令牌桶精度 | 可自定义 | 依赖设计 |
| 额外依赖 | 需安装模块 | 无 | 无 |
| 阻塞模式 | 支持 | 可实现 | 可实现 |

---

*相关阅读：[项目稳定性-限流方案全解析](/coding/架构心得/项目稳定性-限流) · [Redis 实现分布式锁](/coding/Redis/Redis 实现分布式锁) · [Spring Cloud Gateway 银行网关实战](/coding/SpringCloud/SpringCloud-Gateway银行流量网关实战)*
