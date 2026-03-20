---
title: Redis BloomFilter 布隆过滤器：精准判断"不存在"
date: 2026-03-21
description: 详解布隆过滤器的误判原理、参数配置、Redis 原生命令，以及在缓存穿透防护、邮件去重、黑名单校验等银行场景的实战应用。
---

# Redis BloomFilter 布隆过滤器：精准判断"不存在"

> "布隆过滤器的精髓不是判断'存在'，而是判断'一定不存在'——这是反作弊和缓存穿透防护的利器。"

## 前言

布隆过滤器（BloomFilter）是 Redis 4.0+ 通过插件提供的概率数据结构。它的核心能力：**判断一个元素"一定不存在于集合中"，或者"可能存在于集合中"**。这个看似矛盾的特性，在银行系统里有大量实用场景。

## 1. 工作原理

```
初始状态：[0, 0, 0, 0, 0, 0, 0, 0]（位数组，全部为 0）

添加元素 "user:123"：
  hash1("user:123") = 2 → 第 2 位 = 1
  hash2("user:123") = 5 → 第 5 位 = 1
  hash3("user:123") = 7 → 第 7 位 = 1

结果：[0, 0, 1, 0, 0, 1, 0, 1]

查询元素 "user:456"：
  hash1("user:456") = 2 → 第 2 位 = 1 ✓
  hash2("user:456") = 5 → 第 5 位 = 1 ✓
  hash3("user:456") = 7 → 第 7 位 = 1 ✓
  → 三个位都是 1 → "可能存在"（可能是误判）

查询元素 "user:789"：
  hash1("user:789") = 3 → 第 3 位 = 0
  → 直接返回"不存在"（绝对准确）
```

**核心结论**：
- 说"存在"：**可能误判**（其他元素把某些位也置为 1 了）
- 说"不存在"：**100% 准确**（某位没有被置为 1）

## 2. Redis 命令

Redis 的 BloomFilter 通过插件 `rebloom` 提供：

```bash
# 安装（Docker 方式）
docker run -d -p 6379:6379 --name redis-redisbloom
  redislabs/rebloom:latest

# 或者手动编译
git clone https://github.com/RedisBloom/RedisBloom.git
make && make install
redis-server --loadmodule ./target/release/libredisbloom.so
```

```bash
# BF.ADD：添加元素
BF.ADD blacklisted:emails "spam@attacker.com"
BF.ADD blacklisted:emails "phishing@evil.com"

# BF.EXISTS：查询是否存在
BF.EXISTS blacklisted:emails "spam@attacker.com"
# 返回 1 → 可能存在

BF.EXISTS blacklisted:emails "legit@company.com"
# 返回 0 → 一定不存在

# BF.MADD：批量添加
BF.MADD blacklisted:emails "a@b.com" "c@d.com" "e@f.com"

# BF.MEXISTS：批量查询
BF.MEXISTS blacklisted:emails "a@b.com" "c@d.com" "legit@email.com"

# BF.INFO：查看过滤器信息
BF.INFO blacklisted:emails
# size: 792       （已占用的 bit 数）
# capacity: 10000   （预计容量）
# inserted: 100     （已插入元素数）
# filter_rate: 0.01（当前误判率）
```

## 3. 参数配置：精度控制

默认配置的 BloomFilter 适合小数据量，**生产环境必须显式配置**：

```bash
# bf.reserve key error_rate initial_size
# error_rate：期望误判率（越小 → 内存越大）
# initial_size：预计插入的元素数量（越大 → 内存越大）

# 创建高精度过滤器（10 万元素，误判率 0.1%）
BF.RESERVE product:skus 0.001 100000

# 默认配置：error_rate=1%, initial_size=100
BF.ADD myfilter "item1"  # 不推荐，应先 BF.RESERVE
```

### 3.1 内存计算公式

```
m = -(n × ln(p)) / (ln(2)²)
k = (ln(2) × m) / n

其中：
  n = 预计元素数量
  p = 期望误判率
  m = 位数组长度（bit）
  k = 哈希函数数量
```

| n（元素数） | p（误判率） | m（内存） | k（哈希函数数） |
|------------|-------------|---------|--------------|
| 100,000 | 1% | ~119 KB | 7 |
| 100,000 | 0.1% | ~178 KB | 10 |
| 1,000,000 | 1% | ~1.19 MB | 7 |
| 10,000,000 | 1% | ~11.9 MB | 7 |

## 4. Java 实现：缓存穿透防护

这是 BloomFilter 最经典的应用场景：

```java
@Service
@Slf4j
public class ProductService {
    private final RedisTemplate<String, String> redis;
    private final ProductMapper productMapper;

    // 初始化：商品 ID 全部加入 BloomFilter
    @PostConstruct
    public void initProductFilter() {
        String filterKey = "bloom:product:skus";
        List<String> allSkuIds = productMapper.selectAllSkuIds();

        // 分批添加，避免一次性创建
        int batchSize = 10000;
        for (int i = 0; i < allSkuIds.size(); i += batchSize) {
            List<String> batch = allSkuIds.subList(
                i, Math.min(i + batchSize, allSkuIds.size()));
            redis.execute((RedisCallback<Object>) conn -> {
                for (String skuId : batch) {
                    conn.bfCommands().addAdd(filterKey, skuId);
                }
                return null;
            });
        }
        log.info("Product BloomFilter 初始化完成，共 {} 个 SKU", allSkuIds.size());
    }

    // 查询：先用 BloomFilter 挡掉不存在的请求
    public Product getProduct(String skuId) {
        String cacheKey = "cache:product:" + skuId;

        // 1. 先查 Redis 缓存
        Product cached = getFromCache(cacheKey);
        if (cached != null) return cached;

        // 2. BloomFilter 检查
        // （这里用反射调用 BF.EXISTS，因为 Spring Data Redis 未封装）
        Boolean exists = checkBloomFilter("bloom:product:skus", skuId);

        if (exists == null || !exists) {
            // BloomFilter 说"不存在" → 100% 准确，直接返回
            log.debug("BloomFilter 拦截无效 SKU 查询: {}", skuId);
            return null;
        }

        // 3. BloomFilter 说"可能存在" → 查数据库
        Product product = productMapper.selectBySkuId(skuId);
        if (product != null) {
            setCache(cacheKey, product, Duration.ofHours(1));
        } else {
            // 数据库也不存在 → 这是误判，将空值缓存短时间（缓存穿透）
            setNullCache(cacheKey, Duration.ofMinutes(5));
        }
        return product;
    }

    private Boolean checkBloomFilter(String key, String value) {
        try {
            return redis.execute((RedisCallback<Boolean>) conn -> {
                try {
                    Method method = conn.getClass()
                        .getMethod("bfCommands");
                    Object bf = method.invoke(conn);
                    Method existsMethod = bf.getClass()
                        .getMethod("addExists", String.class, String.class);
                    Long result = (Long) existsMethod.invoke(bf, key, value);
                    return result == 1L;
                } catch (NoSuchMethodException e) {
                    // Fallback: 用 Lua 脚本
                    return executeLuaBFExists(key, value);
                }
            });
        } catch (Exception e) {
            log.error("BloomFilter 查询失败", e);
            return null;  // 失败时放行，查数据库
        }
    }

    // Lua 兜底：BF.EXISTS 命令
    private static final String BF_EXISTS_SCRIPT =
        "return redis.call('BF.EXISTS', KEYS[1], ARGV[1])";

    private Boolean executeLuaBFExists(String key, String value) {
        return redis.execute(
            new DefaultRedisScript<>(BF_EXISTS_SCRIPT, Long.class),
            List.of(key), value) == 1L;
    }
}
```

## 5. 银行场景实战

### 5.1 交易反欺诈：黑名单校验

```java
@Service
public class FraudDetectionService {
    private static final String BLACKLIST_FILTER = "bloom:fraud:accounts";

    /**
     * 检查账号是否在黑名单
     * BloomFilter 判断"不存在"时 = 100% 不在黑名单
     * BloomFilter 判断"可能存在"时 = 需要查 DB 最终确认
     */
    public FraudCheckResult checkAccount(String accountNumber) {
        Boolean bloomCheck = bloomFilterService.exists(BLACKLIST_FILTER, accountNumber);

        if (bloomCheck == null) {
            // BloomFilter 不可用，降级到数据库查
            return checkAgainstDatabase(accountNumber);
        }

        if (!bloomCheck) {
            // BloomFilter 确认账号不在黑名单，100% 准确
            return FraudCheckResult.pass();
        }

        // BloomFilter 说"可能在黑名单" → 需要精确查询数据库
        return checkAgainstDatabase(accountNumber);
    }
}
```

### 5.2 邮件去重：避免重复发送通知

```java
@Service
@Slf4j
public class NotificationService {
    private final RedisTemplate<String, String> redis;

    // 发送前检查是否已发送（防重复通知）
    public boolean trySend(String messageId) {
        String key = "bloom:sent:notifications:" +
            LocalDate.now().toString();  // 每日一个 BloomFilter

        // SLOPPY.ADD：容量溢出时自动扩展（自动重建更大的过滤器）
        Boolean isNew = redis.execute((RedisCallback<Boolean>) conn -> {
            try {
                Method method = conn.getClass().getMethod("cfCommands");
                Object cf = method.invoke(conn);
                // CF.ADD：添加元素到 Cuckoo Filter（可删除）
                // 银行通知用 Cuckoo Filter 更合适（可精确删除）
                Method addMethod = cf.getClass()
                    .getMethod("cfAdd", String.class, String.class);
                return addMethod.invoke(cf, key, messageId);
            } catch (Exception e) {
                // Fallback: 用 BF.ADD
                Method bfMethod = conn.getClass().getMethod("bfCommands");
                Object bf = bfMethod.invoke(conn);
                Method addMethod = bf.getClass()
                    .getMethod("addAdd", String.class, String.class);
                return addMethod.invoke(bf, key, messageId);
            }
        });

        if (Boolean.TRUE.equals(isNew)) {
            sendNotification(messageId);
            return true;
        }
        log.info("通知已发送过，跳过: messageId={}", messageId);
        return false;
    }
}
```

### 5.3 推荐系统：已读内容过滤

```java
@Service
public class RecommendationService {
    private static final String READ_FILTER = "bloom:user:%d:read:%s";
    // bloom:user:1000:read:2026-03

    public List<Product> recommendForUser(long userId, List<Product> candidates) {
        String todayKey = String.format(READ_FILTER, userId,
            LocalDate.now().toString());

        // 用 BloomFilter 过滤掉今天已看过的商品
        return candidates.stream()
            .filter(product -> !Boolean.TRUE.equals(
                checkBloomFilter(todayKey, product.getSkuId())))
            .sorted(Comparator.comparing(Product::getScore).reversed())
            .limit(20)
            .toList();
    }
}
```

## 6. Cuckoo Filter：可删除的 BloomFilter

标准 BloomFilter **不支持删除操作**（删除会把其他元素的位也清掉）。Redis 7.2+ 提供了 **Cuckoo Filter**：

```bash
# Cuckoo Filter（RedisBloom 插件）
CF.ADD blacklist:accounts "acc:12345"    # 添加
CF.EXISTS blacklist:accounts "acc:12345"  # 查询
CF.DEL blacklist:accounts "acc:12345"    # 删除 ✓（BloomFilter 不能删）

# Cuckoo Filter 比 BloomFilter 多占用 ~20% 内存
# 但支持精确删除，适合"需要动态移除"的场景
```

## 7. 总结对比

| 特性 | BloomFilter | CuckooFilter | HashSet |
|------|------------|--------------|--------|
| 内存占用 | 极低（kb ~ mb） | 低（略高于 BF） | 高（N × 20 字节） |
| 误判率 | 可配置（0.01%~0.0001%） | 可配置 | 0% |
| 删除支持 | ❌ | ✅ | ✅ |
| 精确查询 | 支持（误判范围内） | 支持 | ✅ 100% |
| 适用场景 | "不存在"过滤 | 动态黑名单 | 精确存储 |

**银行选型建议**：
- 静态黑名单（不可删除）：BloomFilter ✅
- 动态黑名单（需删除）：CuckooFilter ✅
- 需要 100% 精确：布隆过滤器 + 数据库二次确认

---

*相关阅读：[Redis 位图](/coding/Redis/Redis 位图) · [Redis HyperLogLog](/coding/Redis/Redis HyperLogLog) · [项目稳定性-幂等性设计](/coding/架构心得/项目稳定性-幂等)*
