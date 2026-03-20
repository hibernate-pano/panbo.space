---
title: Redis HyperLogLog：千万级 UV 统计的内存秘诀
date: 2026-03-21
description: 详解 Redis HyperLogLog 的概率统计算法原理、标准误差（0.81%）、PFADD/PFCOUNT/PFMERGE 命令，以及在 DAU 统计、UV 计算中的实战应用。
---

# Redis HyperLogLog：千万级 UV 统计的内存秘诀

> "统计 1 亿用户的独立访问量，用 12KB 就够了。HyperLogLog 是一种概率算法，误差约 0.81%，但内存占用只有传统 Set 的万分之一。"

## 前言

Redis HyperLogLog（HLL）是专门用于**独立元素数量估算**（Cardinality Estimation）的数据结构。在银行系统里，它最适合做**日活用户（DAU）统计**、**独立访客（UV）计算**、**接口独立调用量统计**。

## 1. 为什么需要 HyperLogLog？

```bash
# 传统方案：用 Set 存储所有用户 ID
SADD dau:2026-03-21 user-1 user-2 ... user-100000000
# 内存占用：1 亿 × 平均 20 字节 = 2GB ❌

# HyperLogLog 方案
PFADD dau:2026-03-21 user-1 user-2 ... user-100000000
# 内存占用：固定 12KB ✅
# 误差率：约 0.81%（标准误差）

PFCOUNT dau:2026-03-21
# 返回：约 1 亿（误差 ±81 万）
```

**误差可接受**：统计 1 亿 DAU，误差 81 万，相对误差只有 0.81%，完全满足业务需求。

## 2. 基础命令

```bash
# PFADD：添加元素到 HyperLogLog
PFADD dau:2026-03-21 "user-1000" "user-1001" "user-1002"
# 返回 1 = 基数有变化，返回 0 = 无变化（去重）

# 可以一次添加多个元素
PFADD dau:2026-03-21 user-2000 user-2001 user-2002 user-2003

# PFCOUNT：获取独立元素估算数量
PFCOUNT dau:2026-03-21
# 返回：3

# 统计多个 HLL 的并集
PFADD uv:page-a "user-1" "user-2"
PFADD uv:page-b "user-2" "user-3"
PFCOUNT uv:page-a uv:page-b
# 返回：3（user-1, user-2, user-3，并集去重）

# PFMERGE：合并多个 HyperLogLog
PFMERGE uv:total uv:page-a uv:page-b
PFCOUNT uv:total
# 返回：3
```

## 3. 算法原理：概率统计

HyperLogLog 的核心思想来自**概率论**：

```
抛硬币游戏：
  连续抛 n 次硬币，记录连续正面朝上的最长次数 k

  如果只抛 1 次硬币 → k = 0 或 1
  如果抛 100 次硬币 → k 很可能在 5-7 之间
  如果抛 10,000 次硬币 → k 很可能在 12-15 之间

规律：k 的最大值能反推出 n 的数量级
  k = 6 → n ≈ 2^6 = 64
  k = 12 → n ≈ 2^12 = 4096
  k = 16 → n ≈ 2^16 = 65536
```

Redis HLL 的实现：**对每个元素做哈希 → 统计哈希值二进制表示中连续 0 的最大数量**。

```bash
# 元素 "user-1234" 的哈希值二进制表示
hash("user-1234") = 0b001101010000...

# HLL 内部维护 16384 个桶（Register）
# 每个桶记录：hash 值前 14 位决定桶编号，后 50 位统计连续 0 的数量

# 估算公式
m = 16384  # 桶数量
k = 16384 个桶中最大连续 0 的数量
estimated_count = m * 2^k

# 实际实现使用修正公式（RawlogLog）
# 乘以一个修正因子，精度更高
```

**为什么固定 12KB？**
- 16384 个桶，每个桶 6 位（最大计数 63）
- 总共：16384 × 6 bit = 98304 bit = 12KB

## 4. Java 实现：DAU 统计

```java
@Service
@Slf4j
public class UVStatsService {
    private final RedisTemplate<String, String> redis;

    // 记录用户访问
    public void recordAccess(String userId, LocalDate date) {
        String key = dauKey(date);
        redis.opsForHyperLogLog().add(key, userId);
    }

    // 批量记录（效率更高）
    public void recordBatchAccess(List<String> userIds, LocalDate date) {
        String key = dauKey(date);
        redis.opsForHyperLogLog().add(key, userIds.toArray(new String[0]));
    }

    // 获取某日 DAU
    public long getDAU(LocalDate date) {
        String key = dauKey(date);
        Long count = redis.opsForHyperLogLog().size(key);
        return count != null ? count : 0;
    }

    // 获取日期范围 DAU（每日去重，每日相加）
    public long getDAUInRange(LocalDate start, LocalDate end) {
        long total = 0;
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            total += getDAU(cursor);
            cursor = cursor.plusDays(1);
        }
        return total;
    }

    // 获取 UV（多页面并集）
    public long getPageUV(List<String> pageKeys) {
        Long uv = redis.opsForHyperLogLog().size(pageKeys.toArray(new String[0]));
        return uv != null ? uv : 0;
    }

    // 合并多天 HLL，计算期间总 UV
    public long getMergedUV(LocalDate start, LocalDate end) {
        String mergedKey = "uv:merged:" + start + ":" + end;
        List<String> dailyKeys = new ArrayList<>();

        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            dailyKeys.add(dauKey(cursor));
            cursor = cursor.plusDays(1);
        }

        try {
            redis.opsForHyperLogLog().union(mergedKey,
                dailyKeys.toArray(new String[0]));
            Long uv = redis.opsForHyperLogLog().size(mergedKey);
            return uv != null ? uv : 0;
        } finally {
            // 清理临时 key
            redis.delete(mergedKey);
        }
    }

    private String dauKey(LocalDate date) {
        return "dau:" + date.toString();
    }
}
```

## 5. 实战：银行支付系统 DAU 报表

```java
@Service
@Slf4j
public class PaymentDAUService {
    private final RedisTemplate<String, String> redis;

    // 每天按渠道分别统计 DAU
    public void recordPaymentAccess(String userId, String channel) {
        String key = String.format("dau:payment:%s:%s",
            channel, LocalDate.now());
        redis.opsForHyperLogLog().add(key, userId);
    }

    // 生成每日 DAU 报表
    public Map<String, Long> getDailyDAUReport(LocalDate date) {
        Map<String, Long> report = new LinkedHashMap<>();
        String[] channels = {"alipay", "wechat", "card", "hsbc_app"};

        long total = 0;
        for (String channel : channels) {
            String key = String.format("dau:payment:%s:%s", channel, date);
            Long count = redis.opsForHyperLogLog().size(key);
            long val = count != null ? count : 0;
            report.put(channel, val);
            total += val;
        }
        report.put("total", total);
        return report;
    }

    // 按渠道合并 DAU（跨天并集）
    public long getWeeklyUVByChannel(String channel,
                                      LocalDate start, LocalDate end) {
        String mergedKey = String.format("uv:weekly:%s:%s:%s",
            channel, start, end);
        List<String> dailyKeys = new ArrayList<>();

        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            dailyKeys.add(String.format("dau:payment:%s:%s", channel, cursor));
            cursor = cursor.plusDays(1);
        }

        try {
            redis.opsForHyperLogLog().union(mergedKey,
                dailyKeys.toArray(new String[0]));
            Long uv = redis.opsForHyperLogLog().size(mergedKey);
            return uv != null ? uv : 0;
        } finally {
            redis.delete(mergedKey);
        }
    }
}
```

## 6. HLL vs 其他方案对比

| 方案 | 内存占用 | 精度 | 添加复杂度 | 查询复杂度 |
|------|---------|------|----------|----------|
| **HyperLogLog** | 12KB（固定） | ~99.2%（±0.81%） | O(1) | O(1) |
| Set | N × 20 字节 | 100% 精确 | O(1) | O(1) |
| Bitmap | N bit | 100% 精确 | O(1) | O(1) |
| 数据库 COUNT(DISTINCT) | 极低 | 100% 精确 | O(log N) | O(N) |

```bash
# 适用场景对比：

HyperLogLog 适用：
  ✅ DAU 统计（亿级用户）
  ✅ 独立 IP 统计
  ✅ 独立接口调用量
  ✅ 精确度要求 ±1% 左右的场景

Set 适用：
  ✅ 需要精确去重（小于百万级）
  ✅ 需要遍历所有成员
  ✅ 需要集合运算（交集/差集）

Bitmap 适用：
  ✅ 用户 ID 连续（0-1亿）
  ✅ 需要 O(1) 单用户查询
  ✅ 需要按位运算（AND/OR）
```

## 7. 注意事项

```
注意事项：

1. HLL 不能直接获取成员列表
   PFGETALL key  # 不支持！HLL 只存储统计算法，不存储原始数据

2. HLL 不适合小数据集
   数据量 < 1000 时，HLL 误差可能达到 50%+
   小数据集直接用 Set 更准确

3. 添加的元素会被哈希
   PFADD 只存储哈希值，不存储原始元素
   无法反向查询"哪些用户访问了"

4. HLL 可以合并
   PFMERGE dest src1 src2 → 合并后基数 = 并集数量
   适合跨机房/跨 Redis 实例的 UV 合并

5. 内存固定 12KB
   不管添加多少元素，内存占用始终是 12KB
   这是 HLL 最大的优势

6. 误差修正
   Redis 3.0+ 使用了更好的修正公式
   实际误差在大多数情况下 < 0.81%
```

## 8. 总结

```bash
# HyperLogLog 使用口诀：
PFADD 添加元素
PFCOUNT 获取数量
PFMERGE 合并统计

# 记住三个数字：
16384    ← 桶数量（固定）
12KB     ← 内存占用（固定）
0.81%    ← 标准误差（约）
```

HyperLogLog 是 Redis 最"神奇"的数据结构之一：**极低的内存，极高的效率，误差可控**。在银行系统里，它最适合做各种维度的独立用户量统计，替代昂贵的数据库 COUNT(DISTINCT) 查询。

---

*相关阅读：[Redis 位图](/coding/Redis/Redis 位图) · [Redis 五种基本数据类型](/coding/Redis/Redis 五种基本数据类型) · [Redis 使用规范](/coding/Redis/Redis 使用规范)*
