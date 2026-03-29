---
title: MySQL 索引完全指南
summary: 索引是一种特殊的数据结构，用来快速定位数据：
publishedAt: '2026-02-26'
track: engineering
topic: MySQL
tags: []
featured: false
draft: false
slug: mysql索引完全指南
legacyPaths:
  - /coding/MySQL/MySQL索引完全指南
---
> 索引优化是 SQL 性能调优的核心

---

## 1. 索引基础

### 1.1 什么是索引？

索引是一种特殊的数据结构，用来快速定位数据：

```
无索引：全表扫描 O(n)
有索引：B+树查找 O(log n)
```

### 1.2 索引类型

| 索引类型 | 说明 | 使用场景 |
|----------|------|----------|
| 主键索引 | 唯一且非空 | PRIMARY KEY |
| 唯一索引 | 唯一但可空 | UNIQUE |
| 普通索引 | 普通列索引 | 加速查询 |
| 全文索引 | 文本搜索 | MATCH AGAINST |
| 组合索引 | 多列组合 | 复合查询 |

---

## 2. B+ 树索引原理

### 2.1 数据结构

```
B+ 树特点：
- 所有数据都在叶子节点
- 叶子节点之间用链表连接
- 适合范围查询
```

### 2.2 为什么用 B+ 树？

- 磁盘 IO 次数少
- 适合范围查询
- 查询稳定

---

## 3. 索引设计原则

### 3.1 哪些列需要建索引？

```sql
-- ✅ 适合建索引
WHERE 条件列
ORDER BY 排序列
JOIN 连接列
高区分度列

-- ❌ 不适合建索引
低区分度（性别、状态）
频繁更新的列
很少查询的列
```

### 3.2 索引设计原则

```sql
-- 1. 最左前缀原则
-- 索引 (a, b, c) 可以用于
WHERE a = 1         -- ✓ 使用 a
WHERE a = 1 AND b = 2  -- ✓ 使用 a, b
WHERE a = 1 AND b = 2 AND c = 3  -- ✓ 使用 a, b, c
WHERE b = 2         -- ✗ 无法使用
WHERE c = 3         -- ✗ 无法使用

-- 2. 区分度高的列放前面
-- 区分度 = COUNT(DISTINCT col) / COUNT(*)
-- 越高越好

-- 3. 避免索引失效
SELECT * FROM users WHERE age + 1 = 20;  -- ✗ 计算导致索引失效
SELECT * FROM users WHERE age = 19;     -- ✓ 可以使用索引
```

---

## 4. 索引优化实战

### 4.1 慢查询分析

```sql
-- 开启慢查询日志
SHOW VARIABLES LIKE 'slow_query_log%';

-- 设置慢查询阈值
SET GLOBAL long_query_time = 1;

-- 查看慢查询
SHOW FULL PROCESSLIST;
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

### 4.2 EXPLAIN 分析

```sql
EXPLAIN SELECT * FROM users WHERE age > 18;

-- 关键字段：
-- type: 连接类型（const > eq_ref > ref > range > index > all）
-- key: 实际使用的索引
-- rows: 扫描行数
-- Extra: 额外信息（Using index, Using filesort 等）
```

### 4.3 常见问题

```sql
-- ❌ 全表扫描
SELECT * FROM users WHERE name = 'Tom';

-- ✅ 使用索引
ALTER TABLE users ADD INDEX idx_name(name);
SELECT * FROM users WHERE name = 'Tom';

-- ❌ 索引失效
SELECT * FROM users WHERE SUBSTRING(name, 1, 3) = 'Tom';

-- ❌ OR 导致索引失效
SELECT * FROM users WHERE name = 'Tom' OR age = 18;

-- ✅ 改用 UNION
SELECT * FROM users WHERE name = 'Tom'
UNION ALL
SELECT * FROM users WHERE age = 18;
```

---

## 5. 索引优化技巧

### 5.1 覆盖索引

```sql
-- 查询的列都在索引中，无需回表
-- 索引 (name, age, email)
SELECT name, age, email FROM users WHERE name = 'Tom';
-- ✓ Using index（覆盖索引）
```

### 5.2 索引下推

```sql
-- 索引 (name, age)
SELECT * FROM users WHERE name LIKE 'T%' AND age = 18;
-- MySQL 5.6+ 自动在索引层面过滤 age
```

### 5.3 字符串索引

```sql
-- 前缀索引（节省空间）
ALTER TABLE users ADD INDEX idx_email(email(10));

-- 全文索引
ALTER TABLE articles ADD FULLTEXT INDEX idx_content(content);
SELECT * FROM articles WHERE MATCH(content) AGAINST('MySQL');
```

---

## 6. 总结

| 原则 | 说明 |
|------|------|
| 最左前缀 | 按顺序使用索引列 |
| 避免函数 | 索引列不参与计算 |
| 区分度高 | 区分度高的列放前面 |
| 覆盖索引 | 查询列在索引中 |
| 适量原则 | 索引不是越多越好 |

---

> 📚 续篇：《MySQL 事务与锁》
