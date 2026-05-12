---
title: Redis 实现分布式锁：Redlock 原理与避坑指南
summary: 详解 Redis 分布式锁的 SET NX + EX 原子性实现、单节点缺陷、Redlock 算法，以及 Redisson 最佳实践与常见踩坑。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Redis
tags: []
featured: false
draft: false
slug: redis-实现分布式锁
legacyPaths:
  - /coding/Redis/Redis 实现分布式锁
---
> "单机锁解决不了分布式问题——当锁需要跨 JVM 生效时，Redis 是最常见的选择。但把分布式锁用对，比想象中难得多。"

## 前言

分布式锁在银行系统里的核心场景：

- **库存扣减**：防止超卖（同一商品不能被两个用户同时下单）
- **幂等性保证**：同一笔支付不能被重复处理
- **定时任务冲突**：多实例部署时同一任务不能并行执行
- **账户并发控制**：同一账户的余额操作需要串行

## 1. 最简实现：SET NX EX

```java
public boolean tryLock(String key, String value, long expireMs) {
    // SET key value NX EX ttl — 原子操作
    Boolean result = redisTemplate.opsForValue()
        .setIfAbsent(key, value, Duration.ofMillis(expireMs));
    return Boolean.TRUE.equals(result);
}

public void unlock(String key, String value) {
    // 安全释放：只删除自己持有的锁
    String current = redisTemplate.opsForValue().get(key);
    if (value.equals(current)) {
        redisTemplate.delete(key);
    }
}
```

**问题**：解锁不是原子的——先查后删，中间可能被其他线程插入。

## 2. Lua 脚本：原子解锁

```lua
-- unlock.lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
```

```java
public void unlock(String key, String value) {
    redisTemplate.execute(
        new DefaultRedisScript<>(UNLOCK_SCRIPT, Long.class),
        List.of(key), value
    );
}
```

## 3. 锁续期： watchdog 机制

Java 程序执行时间可能超过锁 TTL，手动续期必不可少：

```java
public class RedisDistributedLock {
    private final RedisTemplate<String, String> redis;
    private static final String UNLOCK_SCRIPT = """
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
        """;

    private static final String RENEW_SCRIPT = """
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        else
            return 0
        end
        """;

    public boolean tryLock(String key, String value, long ttlMs) {
        return Boolean.TRUE.equals(
            redis.opsForValue().setIfAbsent(key, value, Duration.ofMillis(ttlMs))
        );
    }

    public void unlock(String key, String value) {
        redis.execute(new DefaultRedisScript<>(UNLOCK_SCRIPT, Long.class),
            List.of(key), value);
    }

    public boolean renew(String key, String value, long ttlMs) {
        Long result = redis.execute(
            new DefaultRedisScript<>(RENEW_SCRIPT, Long.class),
            List.of(key), value, String.valueOf(ttlMs)
        );
        return result != null && result == 1;
    }
}
```

## 4. Redisson：生产级实现

Redisson 封装了完整的分布式锁实现，包括 watchdog 自动续期：

```java
@Service
public class PaymentService {
    private final RedissonClient redisson;

    public void processPayment(String paymentId, BigDecimal amount) {
        String lockKey = "payment:lock:" + paymentId;

        // 获取锁，最多等待 0 秒（不等待，直接返回），自动解锁 30 秒
        RLock lock = redisson.getLock(lockKey);

        boolean acquired = false;
        try {
            // tryLock(等待时间, 自动释放时间, 时间单位)
            acquired = lock.tryLock(0, 30, TimeUnit.SECONDS);

            if (!acquired) {
                throw new PaymentConflictException("支付处理中，请勿重复提交");
            }

            // 执行业务逻辑
            doProcessPayment(paymentId, amount);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("支付处理被打断", e);
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();  // 必须由持锁线程释放
            }
        }
    }
}
```

### 4.1 Watchdog 自动续期

Redisson 的 watchdog 默认每 10 秒自动续期一次（ttl/3）：

```
线程获取锁（TTL=30s）
  ↓
watchdog 启动（每 10 秒）
  ↓
线程持有锁 → 续期到 30s
  ↓
线程执行完毕 unlock() → watchdog 停止
```

只要业务线程持有锁，watchdog 就会持续续期。**这是 Redisson 最重要的特性**。

### 4.2 可重入锁

同一线程可以多次获取同一把锁（计数器 +1），必须释放相同次数：

```java
RLock lock = redisson.getLock("order:123");

lock.lock();      // count = 1
lock.lock();      // count = 2（不阻塞）
processOrder();   // 业务逻辑
lock.unlock();    // count = 1
lock.unlock();    // count = 0 → 真正释放
```

## 5. 分布式事务场景：账户转账

```java
@Service
@Slf4j
public class AccountTransferService {
    private final RedissonClient redisson;
    private final AccountMapper accountMapper;

    public void transfer(String fromAccount, String toAccount, BigDecimal amount) {
        // 1. 按账户 ID 排序获取锁（防止死锁）
        List<String> accounts = List.of(fromAccount, toAccount).stream()
            .sorted()
            .toList();

        RLock lock1 = redisson.getLock("account:lock:" + accounts.get(0));
        RLock lock2 = redisson.getLock("account:lock:" + accounts.get(1));

        try {
            // 顺序加锁
            lock1.lock();
            lock2.lock();

            // 2. 双重检查余额
            Account from = accountMapper.findById(fromAccount);
            if (from.getBalance().compareTo(amount) < 0) {
                throw new InsufficientBalanceException("余额不足");
            }

            // 3. 原子扣减（乐观锁）
            int rows = accountMapper.debit(fromAccount, amount);
            if (rows == 0) {
                throw new OptimisticLockException("并发更新失败，请重试");
            }

            // 4. 增加目标账户
            accountMapper.credit(toAccount, amount);

            log.info("转账成功: {} -> {} : {}",
                fromAccount, toAccount, amount);

        } finally {
            lock2.unlock();
            lock1.unlock();
        }
    }
}
```

**注意**：加锁顺序必须统一（按账户 ID 排序），否则会导致死锁。

## 6. 单节点缺陷与 Redlock

单节点 Redis 加锁的风险：主节点挂了，从节点还没同步锁数据。

### 6.1 Redlock 算法

在 N 个独立 Redis 节点上同时加锁，超过 N/2+1 个成功才算成功：

```java
public class RedissonRedLock implements Lock {
    private final RedissonRedLockNode[] nodes;

    public boolean tryLock(long waitTime, long leaseTime, TimeUnit unit) {
        long start = System.currentTimeMillis();
        int acquiredCount = 0;
        long retryTime = Math.min(waitTime, 3000);

        while (acquiredCount <= nodes.length / 2) {
            for (RedissonRedLockNode node : nodes) {
                if (node.tryLock(retryTime, leaseTime, unit)) {
                    acquiredCount++;
                }
            }

            if (acquiredCount > nodes.length / 2) {
                return true;
            }

            // 重试前等待随机时间
            sleep(random.nextInt(500));
        }

        return false;
    }
}
```

**现实**：Redlock 本身有争议（Martin Kleppmann 详细反驳过），大多数场景下单节点锁足够，银行系统通常用 **ZooKeeper** 或 **etcd** 实现分布式锁。

## 7. 避坑总结

| 坑 | 原因 | 解决方案 |
|----|------|----------|
| 锁无法释放 | unlock() 没有用 Lua 原子检查 | 用 Lua 脚本或 Redisson |
| 锁永久持有 | 持锁线程崩溃没有 watchdog | 用 Redisson 自动续期 |
| 锁过期业务未完 | TTL 设太短 | watchdog 续期或 leaseTime 设长 |
| 死锁 | 多锁顺序不一致 | 按 ID 排序后统一顺序加锁 |
| 超卖 | 锁粒度太粗（锁商品而非锁库存 ID） | 锁到具体 SKU ID |
| 羊群效应 | 所有请求竞争同一把锁 | 分段锁 + 随机退避 |

---

*相关阅读：[Redis 五种基本数据类型](/coding/Redis/Redis 五种基本数据类型) · [Redis 实现消息队列](/coding/Redis/Redis 实现消息队列) · [分布式事务与 Saga 模式实战](/coding/分布式系统/分布式事务与Saga模式实战)*
