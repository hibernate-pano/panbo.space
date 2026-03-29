---
title: Redis Scan 命令：-keys 的生产安全替代方案
summary: >-
  详解 Redis SCAN 的游标迭代原理、与 KEYS 的性能差异、COUNT 调优，以及 SCAN 衍生命令 SSCAN/HSCAN/ZSCAN
  的用法。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Redis
tags: []
featured: false
draft: false
slug: redis-scan-命令用法
legacyPaths:
  - /coding/Redis/Redis Scan 命令用法
---
> "生产环境用 KEYS * 查 Redis，可能让你的系统瞬间雪崩——SCAN 是唯一正确的选择。"

## 前言

`KEYS pattern` 是 Redis 中最危险的操作之一：它会遍历整个数据库，在百万级 key 的实例上可能造成**数秒的阻塞**，直接影响线上服务。SCAN 是官方提供的**渐进式遍历**方案，每次只返回一小批数据，不会阻塞 Redis。

## 1. 为什么不能用 KEYS

```bash
# KEYS 的问题：O(N) 全量扫描，阻塞所有客户端
KEYS *                    # 匹配所有 key
KEYS user:*               # 匹配 user: 开头的 key

# 在 1000 万 key 的实例上执行 KEYS * 的结果：
# - Redis 主线程阻塞 5-10 秒
# - 所有读写请求超时
# - 主从复制可能中断
# - 运维收到告警
```

**结论：生产环境禁止使用 KEYS 命令**。

## 2. SCAN 基础用法

```bash
# 格式：SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]
# cursor：游标，从 0 开始，下一次用返回的值继续
# MATCH：过滤模式（和 KEYS 一样支持 glob）
# COUNT：每次返回的元素数量（hint，不保证精确）
# TYPE：过滤 value 类型（Redis 6.2+）

# 第一次调用，游标从 0 开始
SCAN 0
# 返回：
# 1) "12"                    ← 下一次迭代的游标
# 2) ["key:001", "key:002"]  ← 本批次的 key 列表

# 继续用游标 12 扫描
SCAN 12
# 返回：
# 1) "0"                     ← 0 表示遍历结束
# 2) ["key:199", "key:200"]
```

游标为 `0` 时，表示完整遍历结束。

### 2.1 完整遍历示例

```bash
# 遍历整个数据库
SCAN 0 COUNT 100
# → ["3", ["key1", "key2", ...]]
SCAN 3 COUNT 100
# → ["7", ["key51", "key52", ...]]
SCAN 7 COUNT 100
# → ["0", ["key101", "key102", ...]]
# 游标回到 0，遍历完成
```

## 3. 游标迭代原理

SCAN 使用的是 **Radix Tree（基数树）** 内部存储结构的渐进式遍历：

```python
# 伪代码：SCAN 遍历逻辑
def scan(cursor, count):
    # 1. cursor 是槽位索引，不是线性递增
    # 2. 每次调用只遍历当前槽位的一小部分
    # 3. 返回的 key 数量 <= count（hint）

    slot = decode_cursor(cursor)
    keys = []

    while len(keys) < count:
        node = radix_tree[slot]
        keys.extend(node.keys)
        slot = slot.next()  # 跳到下一个槽

    return next_cursor(slot), keys
```

**关键点**：SCAN 返回的 key 顺序是**无序的**（不是插入顺序），每次遍历的结果可能不同。

## 4. COUNT 调优

COUNT 是 hint，不保证精确数量，但合理设置能减少迭代次数：

```bash
# 100 万 key，COUNT=10 → 需 10 万次 SCAN 调用（灾难）
SCAN 0 COUNT 10

# 100 万 key，COUNT=1000 → 约 1000 次调用（合理）
SCAN 0 COUNT 1000

# 100 万 key，COUNT=10000 → 约 100 次调用（更快）
SCAN 0 COUNT 10000
```

**建议**：
- 大型数据库（百万级 key）：`COUNT 1000` ~ `COUNT 10000`
- 小型数据库（万级 key）：`COUNT 100`
- 生产环境保守值：`COUNT 1000`

## 5. 三大衍生命令

```bash
# SSCAN：遍历 Set 集合
SADD myset "a" "b" "c" "d" "e"
SSCAN myset 0 COUNT 2
# 1) "0"
# 2) ["a", "b"]

# HSCAN：遍历 Hash 表
HSET myhash field1 val1 field2 val2
HSCAN myhash 0 COUNT 1
# 1) "0"
# 2) ["field1", "val1"]

# ZSCAN：遍历 ZSet（有序集合）
ZADD myzset 1 "a" 2 "b" 3 "c"
ZSCAN myzset 0 COUNT 10
# 1) "0"
# 2) ["a", "1", "b", "2", "c", "3"]
```

## 6. Java 实现：安全批量删除

```java
@Service
@Slf4j
public class RedisKeyCleaner {
    private final RedisTemplate<String, String> redis;

    // 安全删除指定前缀的所有 key
    public long deleteByPattern(String pattern) {
        long deleted = 0;
        String cursor = "0";

        do {
            // SCAN 返回的是 List<Object>
            ScanOptions options = ScanOptions.scanOptions()
                .match(pattern)
                .count(1000)  // 每批 1000 个
                .build();

            try (Cursor<byte[]> cursorResult = redis.getConnectionFactory()
                    .getConnection().scan(options)) {

                List<String> keysToDelete = new ArrayList<>();
                while (cursorResult.hasNext()) {
                    keysToDelete.add(new String(cursorResult.next()));
                }

                if (!keysToDelete.isEmpty()) {
                    deleted += redis.delete(keysToDelete);
                    log.info("本批次删除 {} 个 key: {}", keysToDelete.size(), pattern);
                }

                // 获取当前游标（通过 connection 获取）
                break;  // Cursor 只能完整迭代，不能手动控制游标

            }
        } while (cursor != null);

        return deleted;
    }

    // Spring Data Redis 2.0+ 的更简洁方式
    public long deleteByScan(String pattern) {
        ScanOptions options = ScanOptions.scanOptions()
            .match(pattern)
            .count(1000)
            .build();

        List<String> keys = new ArrayList<>();
        try (Cursor<String> cursor = redis.scan(options)) {
            cursor.forEachRemaining(keys::add);
        }

        if (!keys.isEmpty()) {
            Long deleted = redis.delete(keys);
            log.info("删除 {} 个 key（pattern={}）", deleted, pattern);
            return deleted;
        }
        return 0;
    }
}
```

## 7. SCAN 的局限性

```bash
# 局限性 1：COUNT 是 hint，不保证精确
SCAN 0 COUNT 1000  # 可能返回 998 个，也可能返回 1500 个

# 局限性 2：遍历结果无序
SCAN 0 COUNT 10   # 第一次可能返回 key1, key3, key9
SCAN 0 COUNT 10   # 第二次可能返回 key7, key2, key5

# 局限性 3：不能在事务或 Lua 脚本中使用 SCAN
# SCAN 会修改 cursor，事务/Lua 要求命令确定性

# 局限性 4：COUNT=0 等价于 COUNT=1
SCAN 0 COUNT 0    # 实际返回 1 个 key
```

## 8. 银行场景实战

```java
// 场景：清理 30 天前的会话 key
public long cleanupExpiredSessions() {
    String pattern = "session:*";
    LocalDate threshold = LocalDate.now().minusDays(30);
    long deleted = 0;

    ScanOptions options = ScanOptions.scanOptions()
        .match(pattern)
        .count(2000)
        .build();

    try (Cursor<String> cursor = redis.scan(options)) {
        List<String> batch = new ArrayList<>();

        while (cursor.hasNext()) {
            String key = cursor.next();

            // 提取时间戳判断是否过期
            // session:user123:20260215 → 20260215
            String dateStr = extractDate(key);
            if (dateStr != null) {
                LocalDate keyDate = LocalDate.parse(dateStr,
                    DateTimeFormatter.BASIC_ISO_DATE);
                if (keyDate.isBefore(threshold)) {
                    batch.add(key);
                }
            }

            // 批量删除（每 500 条执行一次）
            if (batch.size() >= 500) {
                deleted += redis.delete(batch);
                batch.clear();
            }
        }

        // 删除剩余的
        if (!batch.isEmpty()) {
            deleted += redis.delete(batch);
        }
    }

    log.info("清理过期会话 key 完成，共删除 {} 个", deleted);
    return deleted;
}
```

## 9. SCAN vs KEYS 对比

| 特性 | KEYS | SCAN |
|------|------|------|
| 时间复杂度 | O(N) 全量阻塞 | O(1) 每批次，渐进式 |
| Redis 阻塞 | **会阻塞** | 不阻塞 |
| 返回量 | 一次性全量 | 分批次 |
| 游标 | 无 | 有（需手动迭代） |
| MATCH 过滤 | 支持 | 支持 |
| 生产可用 | ❌ 禁止 | ✅ 推荐 |
| COUNT 参数 | 不支持 | hint 控制批次大小 |

---

*相关阅读：[Redis 五种基本数据类型](/coding/Redis/Redis 五种基本数据类型) · [Redis 实现分布式锁](/coding/Redis/Redis 实现分布式锁) · [Redis 使用规范](/coding/Redis/Redis 使用规范)*
