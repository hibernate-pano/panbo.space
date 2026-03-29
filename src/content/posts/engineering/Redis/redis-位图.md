---
title: Redis 位图：极致内存的签到与状态记录
summary: 详解 Redis 位图的底层原理、SETBIT/GETBIT/bitcount 用法，以及在用户签到、DAU 统计、在线状态等场景的实战应用。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Redis
tags: []
featured: false
draft: false
slug: redis-位图
legacyPaths:
  - /coding/Redis/Redis 位图
---
> "用 1 个 bit 记录用户今天是否签到。一年 365 天，只占 46 字节。比任何方案都省内存。"

## 前言

Redis 位图（Bitmap）不是一种独立的数据类型，而是**基于 String 类型**的一种扩展操作。String 的最大容量是 512MB，位图用这 512MB 中的每一个 bit（0 或 1）来表示状态。**一个 bit 可以表示两种状态**，内存利用率极高。

## 1. 底层原理

```bash
# SETBIT key offset value
# offset：位偏移（从 0 开始）
# value：0 或 1

# 例如：设置 user:1000:2026:03 的第 21 位为 1
# （表示 2026-03-21 签到）

# 位在字符串中的位置计算：
# 字符串 "A" 的 ASCII 是 65 = 0b01000001
# SETBIT mykey 0 0  → 第 0 位设为 0
# SETBIT mykey 1 1  → 第 1 位设为 1
# 结果：0b01000010 = 66 = "B"

SETBIT user:sign:1000:2026-03 21 1
GET user:sign:1000:2026-03
# 返回 "\x00\x00 "  （第 21 位为 1 的字符串）

# 读取某一位
GETBIT user:sign:1000:2026-03 21
# 返回 1
```

**内存计算**：1 亿用户签到，每天只需要 12.5MB（1 亿 bit ÷ 8）。

## 2. 基础命令

```bash
# SETBIT：设置某一位的值（0 或 1）
SETBIT online:users 1000 1   # 用户 1000 在线
SETBIT online:users 1000 0   # 用户 1000 下线

# GETBIT：读取某一位
GETBIT online:users 1000
# 返回 1

# BITCOUNT：统计范围内 1 的个数
BITCOUNT online:users              # 所有在线用户数
BITCOUNT online:users 0 124         # 前 125 位（用户 0-124）

# BITPOS：查找第一个 0 或 1 的位置
BITPOS online:users 0              # 第一个离线用户的位置
BITPOS online:users 1              # 第一个在线用户的位置

# BITOP：位运算（AND/OR/XOR/NOT）
SETBIT user:a:interest 0 1   # A 喜欢游戏
SETBIT user:a:interest 2 1   # A 喜欢电影
SETBIT user:b:interest 1 1   # B 喜欢音乐
SETBIT user:b:interest 2 1   # B 喜欢电影

BITOP AND user:ab:common user:a:interest user:b:interest
# 结果：A 和 B 共同喜欢：电影（第 2 位）
BITCOUNT user:ab:common
# 返回 1

# BITOP OR：共同感兴趣的用户（并集）
# BITOP XOR：只被一人喜欢的标签

# BITFIELD：批量位操作（Redis 3.0+，支持有符号/无符号整数）
BITFIELD mykey SET u8 0 255      # 无符号 8 位，从第 0 位开始，设为 255
BITFIELD mykey GET u8 0          # 读取无符号 8 位
BITFIELD mykey INCRBY u8 0 1     # 无符号 8 位 +1（溢出回绕）
BITFIELD mykey OVERFLOW SAT INCRBY u8 0 1  # 溢出时饱和（不回头绕）
```

## 3. Java 实现：用户签到系统

```java
@Service
@Slf4j
public class SignService {
    private final RedisTemplate<String, String> redis;

    // 用户签到（每天一条记录）
    public boolean sign(String userId, LocalDate date) {
        String key = signKey(userId, date.getYear(), date.getMonthValue());
        int dayOfMonth = date.getDayOfMonth();  // 1-31

        // 如果今天已签到，返回 false
        Boolean isSet = redis.opsForValue().setBit(key, dayOfMonth - 1, true);
        log.info("用户 {} 签到: date={}, key={}, alreadySigned={}",
            userId, date, key, isSet);

        return !Boolean.TRUE.equals(isSet);  // 已签到返回 false
    }

    // 检查某天是否签到
    public boolean checkSign(String userId, LocalDate date) {
        String key = signKey(userId, date.getYear(), date.getMonthValue());
        return Boolean.TRUE.equals(
            redis.opsForValue().getBit(key, date.getDayOfMonth() - 1)
        );
    }

    // 统计某月签到天数
    public long countSignDays(String userId, int year, int month) {
        String key = signKey(userId, year, month);
        Long count = redis.opsForValue().getBitCount(key);
        return count != null ? count : 0;
    }

    // 获取连续签到天数（从今天往前数）
    public int continuousSignDays(String userId, LocalDate today) {
        int count = 0;
        LocalDate date = today;

        while (checkSign(userId, date)) {
            count++;
            date = date.minusDays(1);
            if (count > 31) break;  // 最多一个月
        }
        return count;
    }

    // 获取某月签到日历
    public List<Boolean> getSignCalendar(String userId, int year, int month) {
        String key = signKey(userId, year, month);
        int daysInMonth = YearMonth.of(year, month).lengthOfMonth();

        List<Boolean> calendar = new ArrayList<>();
        for (int day = 1; day <= daysInMonth; day++) {
            Boolean signed = redis.opsForValue()
                .getBit(key, day - 1);
            calendar.add(Boolean.TRUE.equals(signed));
        }
        return calendar;
    }

    private String signKey(String userId, int year, int month) {
        return String.format("sign:%s:%d:%02d", userId, year, month);
    }
}
```

## 4. 实战场景

### 4.1 DAU 统计（每日活跃用户）

```java
@Service
@Slf4j
public class DAUService {
    private final RedisTemplate<String, String> redis;

    // 用户访问时记录 DAU
    public void recordAccess(String userId, LocalDate date) {
        String key = dauKey(date);
        redis.opsForValue().setBit(key, parseUserIdToOffset(userId), true);
        log.debug("DAU 记录: userId={}, date={}", userId, date);
    }

    // 查询某日 DAU
    public long getDAU(LocalDate date) {
        String key = dauKey(date);
        Long count = redis.opsForValue().getBitCount(key);
        return count != null ? count : 0;
    }

    // 查询日期范围内总 UV（去重）
    public long getUVInRange(LocalDate start, LocalDate end) {
        List<String> keys = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            keys.add(dauKey(cursor));
            cursor = cursor.plusDays(1);
        }

        // 使用 BITOP OR 合并所有日期
        String tempKey = "temp:uv:" + UUID.randomUUID();
        redis.opsForValue().setBit(tempKey, 0, false);  // 初始化

        String[] keyArray = keys.toArray(new String[0]);
        redis.execute((RedisCallback<Object>) conn ->
            conn.stringCommands().bitOp(
                RedisStringCommands.BitOperation.OR,
                tempKey.getBytes(),
                Arrays.stream(keyArray).map(String::getBytes).toArray(byte[][]::new)
            )
        );

        Long uv = redis.opsForValue().getBitCount(tempKey);
        redis.delete(tempKey);
        return uv != null ? uv : 0;
    }

    // 每周 DAU 趋势
    public Map<LocalDate, Long> getWeeklyTrend(LocalDate today) {
        Map<LocalDate, Long> trend = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            trend.put(date, getDAU(date));
        }
        return trend;
    }

    private String dauKey(LocalDate date) {
        return "dau:" + date.toString();  // dau:2026-03-21
    }

    // 将 userId 字符串转为数值偏移量
    private long parseUserIdToOffset(String userId) {
        return Math.abs(userId.hashCode() % 100_000_000);
    }
}
```

### 4.2 在线状态与实时人数

```java
@Service
@Slf4j
public class OnlineStatusService {
    private final RedisTemplate<String, String> redis;
    private static final String ONLINE_KEY = "online:users";
    private static final long MAX_USER_ID = 100_000_000;  // 1 亿用户

    public void setOnline(long userId) {
        if (userId < 0 || userId >= MAX_USER_ID) {
            throw new IllegalArgumentException("Invalid userId");
        }
        redis.opsForValue().setBit(ONLINE_KEY, userId, true);
    }

    public void setOffline(long userId) {
        redis.opsForValue().setBit(ONLINE_KEY, userId, false);
    }

    public boolean isOnline(long userId) {
        return Boolean.TRUE.equals(
            redis.opsForValue().getBit(ONLINE_KEY, userId)
        );
    }

    public long getOnlineCount() {
        return redis.opsForValue().getBitCount(ONLINE_KEY);
    }

    // 批量检查在线状态（1000 个用户）
    public Set<Long> filterOnlineUsers(List<Long> userIds) {
        return userIds.parallelStream()
            .filter(this::isOnline)
            .collect(Collectors.toSet());
    }
}
```

### 4.3 功能开关（灰度发布）

```java
@Service
public class FeatureToggleService {
    private final RedisTemplate<String, String> redis;

    // 将用户 ID 按比例分配到灰度组
    // 用户 ID hash 后取低 8 位（0-255），前 10% 命中
    public boolean isFeatureEnabled(long userId, String featureName) {
        String key = "feature:" + featureName;
        long offset = Math.abs((userId ^ (userId >>> 16)) % 256);
        return Boolean.TRUE.equals(
            redis.opsForValue().getBit(key, offset)
        );
    }

    // 开启功能（按百分比）
    public void enableFeature(String featureName, int percent) {
        if (percent < 0 || percent > 100) {
            throw new IllegalArgumentException("Percent must be 0-100");
        }
        String key = "feature:" + featureName;
        int enabledBits = (int) (percent / 100.0 * 256);

        // 用 BITFIELD 批量设置
        for (int i = 0; i < enabledBits; i++) {
            redis.opsForValue().setBit(key, i, true);
        }
        for (int i = enabledBits; i < 256; i++) {
            redis.opsForValue().setBit(key, i, false);
        }
    }
}
```

## 5. 位图 vs 其他方案的内存对比

| 方案 | 1 亿用户 1 年存储 | 内存 |
|------|------------------|------|
| **位图** | 1 亿 × 365 bit | **~4.6 GB** |
| Set（每天一个） | 1 亿 × 365 个元素 | ~TB 级别 |
| Hash | 1 亿 × 365 字段 | TB 级别 |
| 数据库行 | 3.65 亿行 | TB 级别 |

**位图节省 99%+ 内存**，但只适合**稀疏布尔状态**。

## 6. 注意事项

```
注意事项：

1. 最大偏移量
   - SETBIT offset 超过 String 上限会报错
   - 最大 offset ≈ 512MB × 8 = 40 亿位

2. 内存预分配
   - 设置大偏移量会预分配中间所有空间
   - SETBIT mykey 1000000000 1 → 一次性分配 125MB

3. 字符串是连续的
   - 中间位默认都是 0
   - GETBIT 不存在的位返回 0（不会报错）

4. BITCOUNT 范围
   - 不指定范围时统计整个字符串
   - BITCOUNT key start end（字节偏移，不是位偏移）

5. 原子性
   - SETBIT/GETBIT 是原子操作
   - BITOP 是原子操作（Redis 3.0+）
```

---

*相关阅读：[Redis 五种基本数据类型](/coding/Redis/Redis 五种基本数据类型) · [Redis HyperLogLog](/coding/Redis/Redis HyperLogLog) · [Redis 使用规范](/coding/Redis/Redis 使用规范)*
