---
title: GeoHash 算法：把二维经纬度编码成一维字符串
date: 2026-03-21
description: 详解 GeoHash 的编码原理、精度控制、边界问题，以及在附近的人、路径规划等场景的工程应用。
---

# GeoHash 算法：把二维经纬度编码成一维字符串

> "地图上的任意一个点，都可以编码成一个字符串。字符串越相似，距离就越近。"

## 前言

GeoHash 是一种**将二维经纬度编码成一维字符串**的算法。它解决的核心问题是：**如何用一维数据结构（字符串、有序列表）高效地查询"附近的人"或"附近的商家"**。

想象你要在数据库里找"附近 1 公里的餐厅"——如果用经纬度两列做范围查询，需要扫描全表。但把经纬度编码成字符串后，**字符串前缀相同的点，在地理上就是相邻的**。

## 1. 编码原理：经纬度 → 字符串

### 1.1 二分区间，逐步逼近

GeoHash 用**二进制逐步细分**的方式将经纬度编码成字符串。

以"台北 101"（坐标：纬度 25.0338，经度 121.5646）为例：

```
纬度范围：[-90, 90]

第1次：将纬度范围对半切，25.0338 在右半边 → 位=1
        右半边: [0, 90]

第2次：继续对半切，25.0338 在左半边 → 位=0
        左半边: [0, 45]

第3次：继续对半切，25.0338 在右半边 → 位=1
        右半边: [22.5, 45]

...（重复下去，每次bits++）
```

```
经度范围：[-180, 180]

第1次：经度 121.5646 在右半边 → 位=1
        右半边: [0, 180]

第2次：经度在左半边 → 位=0
        左半边: [0, 90]

第3次：经度在右半边 → 位=1
        右半边: [45, 90]

...（重复下去，每次bits++）
```

### 1.2 奇偶位交替：经度 → 偶数位，纬度 → 奇数位

GeoHash 将经度和纬度交替编码：

```
纬度的 bits 和经度的 bits 交替排列：
  经度 bit0 → 字符串 bit0
  纬度 bit0 → 字符串 bit1
  经度 bit1 → 字符串 bit2
  纬度 bit1 → 字符串 bit3
  ...

最终得到一串二进制：11011 00101 01010 ...
```

### 1.3 Base32 编码

每 5 个二进制位对应一个 Base32 字符（A-Z, 0-9，排除 a,i,l,o）：

```
二进制：11011 00101 01010 ...

对照表：
  11011(27) → w  (11011=27)
  00101(5)  → 5  (00101=5)
  01010(10) → b  (01010=10)
  ...

结果：台北 101 附近 ≈ "ws0e..."
```

这就是为什么 GeoHash 的字符串看起来像随机字母数字——它们本身就是二进制编码的 Base32 表示。

## 2. 精度与网格大小

GeoHash 字符串的长度直接决定了精度：

| 字符数 | 经度误差 | 纬度误差 | 网格大小（约） |
|--------|----------|----------|----------------|
| 1 | ±180° | ±90° | 半个地球 |
| 2 | ±45° | ±22.5° | 省级别 |
| 3 | ±11° | ±5.6° | 市级别 |
| 4 | ±2.8° | ±1.4° | 区级别 |
| 5 | ±0.7° | ±0.35° | 街道级别 |
| 6 | ±0.17° | ±0.087° | 建筑级别 |

通常用 **6 位 GeoHash**（精度约 153m × 153m）做附近查询。

```
# Redis GeoHash 使用 52 位编码，精度约 3.7 米
GEOADD locations 121.5646 25.0338 "taipei101"
GEOHASH locations taipei101
# 输出：ws0eqx（6位）
```

## 3. 边界问题：GeoHash 的缺陷

GeoHash 的最大问题：**相邻格子边界的点，字符串前缀完全不同**。

```
┌─────────┬─────────┐
│  wxkec  │  wxkef  │
│    A    │    B    │
│ (25.03, │ (25.04, │
│ 121.56) │ 121.57) │
└─────────┬─────────┘
          │ ← A和B明明只隔几百米
          │    但 GeoHash 前缀完全不同
          ▼
```

A 和 B 只隔几百米，但 `wxkec` 和 `wxkef` 毫无关联——如果只查前缀，会漏掉 B。

**解决方案：查询时同时查周围 8 个邻居格子**

```
A 的格子：wxkec
邻居格子：wxkcd, wxkcf, wxkcu, wxkcy, wxked, wxkee, wxken, wxke9

用 UNION（Redis ZRANGEBYLEX）合并 9 个格子的结果，再精确计算距离
→ 不漏掉边界附近的点
```

## 4. 实战：Redis GeoHash 命令

```bash
# 添加地理位置
GEOADD places:china 116.397128 39.916527 "tiananmen"
GEOADD places:china 116.437128 39.936527 "wangfujing"

# 计算两点距离（默认米）
GEODIST places:china tiananmen wangfujing
# 输出：3685.1320（米）

# 获取元素 GeoHash 编码
GEOHASH places:china tiananmen
# 输出：wx4ewy

# 获取元素坐标
GEOPOS places:china tiananmen
# 输出：116.39712838445663452, 39.91652742168854

# 查询附近 5 公里内所有地点（按距离排序）
GEORADIUS places:china 116.40 39.92 5 km WITHDIST ASC COUNT 20

# 输出：
# 1) tiananmen, 0.368 km
# 2) wangfujing, 3.685 km
```

```java
@Service
public class GeoQueryService {
    private final RedisTemplate<String, String> redis;

    public List<Place> findNearby(double lon, double lat, double radiusKm, int limit) {
        // 1. 用 GEORADIUS 查询附近
        GeoResults<RedisGeoCommands.GeoLocation<String>> results =
            redis.opsForGeo().radius(
                "places:china",
                new Circle(new Point(lon, lat), new Distance(radiusKm, Metrics.KILOMETERS)),
                RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs()
                    .includeDistance()
                    .sortAscending()
                    .limit(limit)
            );

        // 2. 精确计算距离（过滤掉边界误差点）
        return results.getContent().stream()
            .map(r -> new Place(
                r.getContent().getName(),
                r.getDistance().getValue(),
                r.getContent().getPoint().getY(),  // lat
                r.getContent().getPoint().getX()   // lon
            ))
            .filter(p -> haversineDistance(lat, lon, p.lat, p.lon) <= radiusKm)
            .toList();
    }

    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // 地球半径 km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    record Place(String name, double distance, double lat, double lon) {}
}
```

## 5. 与其他算法的对比

| 算法 | 维度 | 精度 | 适用场景 | 缺点 |
|------|------|------|----------|------|
| **GeoHash** | 1D字符串 | 中等 | 附近查询、地图标注 | 边界突变 |
| **S2** | 多维 | 高 | Google Maps、路径规划 | 复杂度高 |
| **QuadTree** | 多维树 | 可调 | 空间分区、游戏地图 | 动态数据支持差 |
| **PostGIS R-Tree** | 多维 | 高 | 精确范围查询 | 需要数据库支持 |

银行系统通常用 **GeoHash + PostGIS** 组合：GeoHash 快速粗筛，PostGIS 精确过滤。

## 6. 银行应用场景

```
场景1：ATM 机查询
  用户位置 → GeoHash 6位 → 查询同一格子内的 ATM
  → 范围缩小 99%，数据库压力大幅降低

场景2：附近网点推荐
  用户位置 → GeoHash 5位（~1.2km） → 候选网点 → 精确距离排序

场景3：合规地理围栏
  监管要求：某些金融产品只能在特定地区销售
  → 用 GeoHash 前缀匹配快速判断坐标是否在白名单区域
```

---

*相关阅读：[Redis GeoHash 地理位置模块](/coding/Redis/Redis-GeoHash 地理位置模块) · [Redis 五种基本数据类型](/coding/Redis/Redis 五种基本数据类型) · [MySQL 索引完全指南](/coding/MySQL/MySQL索引完全指南)*
