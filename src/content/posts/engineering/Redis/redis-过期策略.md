---
title: Redis 过期策略：LRU、LFU 与定时删除
summary: 详解 Redis 的惰性删除、定期删除、内存淘汰策略（LRU/LFU/Random），以及 maxmemory-policy 配置与银行系统的内存管理实践。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Redis
tags: []
featured: false
draft: false
slug: redis-过期策略
legacyPaths:
  - /coding/Redis/Redis 过期策略
---
> "Redis 的过期不是'到点就删'，而是通过惰性删除 + 定期扫描的组合拳实现的。理解这套机制，才能避免内存溢出和缓存雪崩。"

## 前言

Redis 是一个内存数据库，当数据量接近 `maxmemory` 限制时，需要淘汰策略来决定保留哪些数据、删除哪些数据。配置不当，轻则导致 `OOM Killer` 杀死进程，重则导致线上故障。

## 1. 两套过期机制

Redis 有两套独立的机制处理 key 过期：

### 1.1 惰性删除（Lazy Expiration）

```
客户端请求 key "order:123" 时，Redis 检查：
  - 键是否已过期？
  - 过期了 → 立即删除，返回 null
  - 没过期 → 正常返回
```

**优点**：对 CPU 友好，只在访问时检查，不用主动扫描
**缺点**：过期的键如果一直没人访问，就永远不会被删除（内存泄漏）

### 1.2 定期扫描（Active Expiration）

Redis 每秒执行 10 次主动扫描：

```bash
# 定期扫描策略（server.c 中）
# 每 100ms 执行一次 activeDefragSizeBased
# 每次扫描流程：
#   1. 随机选 20 个带过期时间的 key
#   2. 删除已过期的 key
#   3. 如果超过 25% 已过期 → 继续扫描下一批
#   4. 扫描时间超过 25ms → 停止（保护主线程）
```

**为什么是 20 个随机 key，而不是全部扫描？**
全部扫描 = O(N)，会阻塞主线程。随机采样 = O(1)，对性能无影响。

## 2. 内存淘汰策略（maxmemory-policy）

当 Redis 内存达到 `maxmemory` 上限时，触发内存淘汰：

```bash
# 查看当前配置
CONFIG GET maxmemory
# 1) "maxmemory"
# 2) "4294967292" （约 4GB）

# 设置 maxmemory（生产环境强烈建议设置）
CONFIG SET maxmemory "8gb"
CONFIG SET maxmemory-policy allkeys-lru
```

### 2.1 八种淘汰策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| **noeviction** | 不淘汰，返回错误 | 写多读少的持久化场景 |
| **volatile-lru** | LRU 算法淘汰已设置过期时间的 key | 缓存 + 持久化混合 |
| **allkeys-lru** | LRU 算法淘汰所有 key | 纯缓存场景（推荐） |
| **volatile-lfu** | LFU 算法淘汰已设置过期时间的 key | 热点数据缓存 |
| **allkeys-lfu** | LFU 算法淘汰所有 key | 热点数据缓存（推荐） |
| **volatile-random** | 随机淘汰已设置过期时间的 key | 不推荐 |
| **allkeys-random** | 随机淘汰所有 key | 不推荐 |
| **volatile-ttl** | 淘汰 TTL 最小的 key（最快过期） | 临时缓存 |

### 2.2 LRU vs LFU：如何选

```
LRU（Least Recently Used）：
  - 按最近访问时间淘汰
  - 适合：访问模式均匀，没有明显的冷热分层
  - 问题：一次批量扫描会把冷数据变成"热数据"，导致热数据被淘汰

LFU（Least Frequently Used）：
  - 按访问频率淘汰（计数器 + 衰减机制）
  - 适合：访问有明显热点，数据访问频率差异大
  - 银行系统推荐用 LFU（支付接口、账户查询有明显热点）

Redis LFU 实现：
  - 16 位访问计数器（最大 65535）
  - LRU 字段复用（Redis 4.0+）
  - 每分钟衰减一次（counter × 0.99）
  - 新访问 counter = max(1, counter × 衰减系数)
```

## 3. 内存淘汰配置

```bash
# 推荐生产配置
maxmemory 8gb
maxmemory-policy allkeys-lfu
maxmemory-samples 10          # LRU/LFU 采样精度（越高越精确，但 CPU 开销越大）

# 内存接近上限时的行为
# Redis 7.x 可以设置 soft limits
maxmemory-soft 6gb           # 软限制（达到后开始淘汰）
maxmemory-soft-grace-seconds 60  # 60 秒内尝试降到 maxmemory 以下
```

## 4. 银行系统内存管理实战

### 4.1 分层缓存策略

```java
@Service
public class AccountCacheService {
    private final RedisTemplate<String, String> redis;

    // L1 缓存：热点账户（永久 + LFU 淘汰）
    public void cacheHotAccount(String accountId, Account account) {
        // 使用单独的 Redis 实例，专门存热点数据
        // maxmemory-policy = allkeys-lfu
        String key = "l1:account:" + accountId;
        redis.opsForValue().set(key, JSON.toJSONString(account));
    }

    // L2 缓存：普通账户（TTL 2 小时 + 惰性删除）
    public void cacheNormalAccount(String accountId, Account account) {
        String key = "l2:account:" + accountId;
        redis.opsForValue().set(key, JSON.toJSONString(account),
            Duration.ofHours(2));
    }
}
```

### 4.2 内存水位监控

```java
@Service
@Slf4j
public class RedisMemoryMonitor {
    private final RedisTemplate<String, String> redis;

    @Scheduled(fixedRate = 30000)  // 每 30 秒
    public void monitorMemory() {
        Properties info = redis.getConnectionFactory()
            .getConnection().serverCommands().info("memory");

        long used = parse(info.getProperty("used_memory"));
        long max = parse(info.getProperty("maxmemory"));
        double ratio = (double) used / max;

        String policy = info.getProperty("maxmemory_policy");
        double evicted = parse(info.getProperty("evicted_keys")) / 1.0;
        double hitRate = calculateHitRate(info);

        log.info("Redis 内存: used={}MB, max={}MB, ratio={:.1f}%, " +
                 "policy={}, evicted={}, hit_rate={:.2f}%",
            used / 1024 / 1024, max / 1024 / 1024,
            ratio * 100, policy, (long) evicted, hitRate);

        // 告警阈值
        if (ratio > 0.90) {
            log.error("Redis 内存告警: 使用率 {}%", String.format("%.1f", ratio * 100));
            alertService.sendAlert("Redis 内存使用率超过 90%");
        }

        if (evicted > 100) {
            log.warn("Redis 淘汰告警: 每分钟淘汰 {} 个 key", (long) evicted);
        }
    }

    private double calculateHitRate(Properties info) {
        long hits = parse(info.getProperty("keyspace_hits"));
        long misses = parse(info.getProperty("keyspace_misses"));
        return hits * 100.0 / (hits + misses);
    }
}
```

## 5. 避免缓存雪崩

**缓存雪崩**：大量 key 同时过期，导致大量请求击穿缓存直接打到数据库。

```java
@Service
@Slf4j
public class CacheService {
    private final RedisTemplate<String, String> redis;
    private final Random random = new Random();

    /**
     * 随机过期时间：基础 TTL + 随机抖动
     * 防止大量 key 在同一秒过期
     */
    public void cacheWithJitter(String key, Object value,
                                Duration baseTTL) {
        // 基础 TTL 的 10% 作为随机抖动范围
        long jitterMs = (long) (baseTTL.toMillis() * 0.1);
        long actualTTL = baseTTL.toMillis() + random.nextLong(jitterMs);

        redis.opsForValue().set(key, JSON.toJSONString(value),
            Duration.ofMillis(actualTTL));

        log.debug("缓存设置: key={}, baseTTL={}ms, actualTTL={}ms",
            key, baseTTL.toMillis(), actualTTL);
    }

    /**
     * 永不过期的 key + 主动刷新
     * 适合：热点数据不怕内存满
     */
    public void cacheForever(String key, Object value) {
        redis.opsForValue().set(key, JSON.toJSONString(value));
        // 配合 LFU 策略，热点数据自然保留
    }

    /**
     * 渐进式过期
     * 适合：数据一致性要求不高
     */
    public void cacheWithGracePeriod(String key, Object value, Duration ttl) {
        // 正常 TTL
        redis.opsForValue().set(key, JSON.toJSONString(value), ttl);

        // 过了一半时间后，延长 TTL（"宽限期"）
        scheduleExtendTTL(key, ttl.multipliedBy(3));
    }
}
```

## 6. 过期策略选型指南

```
选型决策树：

数据是否可以丢失（纯缓存）？
  → 是 → maxmemory-policy = allkeys-lfu（推荐）
        maxmemory-policy = allkeys-lru（备选）

数据需要和 DB 严格一致（缓存+持久化）？
  → 是 → maxmemory-policy = volatile-lru
        + 设置合理的 TTL
        + 监控 evicted_keys

写请求远大于读请求？
  → 是 → maxmemory-policy = noeviction
        + 增加 Redis 内存
        + 水平扩展分片

数据有明显访问热点（银行系统典型场景）？
  → 是 → maxmemory-policy = allkeys-lfu（强烈推荐）
        LFU 能识别真正的热点数据，LRU 会被批量扫描污染
```

---

*相关阅读：[Redis Scan 命令用法](/coding/Redis/Redis Scan 命令用法) · [Redis 使用规范](/coding/Redis/Redis 使用规范) · [Redis 配置文件解析](/coding/Redis/Redis 配置文件解析)*
