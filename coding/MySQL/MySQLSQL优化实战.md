# MySQL SQL 优化实战

> 从实际问题出发，提升 SQL 性能

---

## 1. 慢查询分析

### 1.1 定位慢查询

```sql
-- 方法1：慢查询日志
SHOW VARIABLES LIKE 'slow_query_log%';
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 超过1秒记录

-- 方法2：PROCESSLIST
SHOW FULL PROCESSLIST;

-- 方法3：EXPLAIN 分析
EXPLAIN SELECT * FROM users WHERE age > 18;
```

### 1.2 EXPLAIN 详解

```sql
EXPLAIN SELECT u.*, o.* 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
WHERE u.age > 20;

-- 关键字段：
-- type: 连接类型
--   const: 主键/唯一索引
--   eq_ref: 唯一索引 join
--   ref: 非唯一索引
--   range: 索引范围
--   index: 全索引扫描
--   all: 全表扫描（需要优化）

-- key: 实际使用的索引
-- rows: 预计扫描行数
-- Extra: 额外信息
--   Using index: 覆盖索引
--   Using filesort: 需要额外排序
--   Using temporary: 需要临时表
```

---

## 2. 常见优化案例

### 2.1 分页优化

```sql
-- ❌ 慢：OFFSET 越大越慢
SELECT * FROM orders ORDER BY id LIMIT 100000, 10;

-- ✅ 优化1：基于主键
SELECT * FROM orders 
WHERE id > 100000 
ORDER BY id 
LIMIT 10;

-- ✅ 优化2：只查主键再关联
SELECT o.* FROM orders o
INNER JOIN (
    SELECT id FROM orders 
    ORDER BY id 
    LIMIT 100000, 10
) t ON o.id = t.id;

-- ✅ 优化3：游标分页
SELECT * FROM orders 
WHERE id > #{lastId}
ORDER BY id 
LIMIT 10;
```

### 2.2 JOIN 优化

```sql
-- ❌ 慢：SELECT *
SELECT u.name, o.order_no
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.age > 20;

-- ✅ 优化：只查需要的列
SELECT u.name, o.order_no
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.age > 20;

-- 原则：
-- 1. 小表驱动大表
-- 2. 尽量用 INNER JOIN
-- 3. 加上 WHERE 条件
```

### 2.3 聚合查询优化

```sql
-- ❌ 慢：先分组再计算
SELECT status, COUNT(*), AVG(amount)
FROM orders
GROUP BY status;

-- ✅ 优化：利用索引
ALTER TABLE orders ADD INDEX idx_status(status, amount);

-- ✅ 优化：使用物化视图/汇总表
CREATE TABLE orders_summary AS
SELECT status, COUNT(*) as cnt, SUM(amount) as total
FROM orders
GROUP BY status;
```

---

## 3. 索引优化

### 3.1 索引失效场景

```sql
-- ❌ 失效1：函数/运算
SELECT * FROM users WHERE YEAR(birthday) = 1990;
SELECT * FROM users WHERE age + 10 = 30;

-- ✅ 优化：使用列本身
SELECT * FROM users WHERE birthday >= '1990-01-01' AND birthday < '1991-01-01';
SELECT * FROM users WHERE age = 20;

-- ❌ 失效2：类型转换
SELECT * FROM users WHERE user_id = '123';  -- user_id 是 INT
SELECT * FROM users WHERE phone = 13800138000;  -- phone 是 VARCHAR

-- ✅ 优化：类型匹配
SELECT * FROM users WHERE user_id = 123;
SELECT * FROM users WHERE phone = '13800138000';

-- ❌ 失效3：LIKE 通配符
SELECT * FROM users WHERE name LIKE '%Tom';
SELECT * FROM users WHERE name LIKE '%om%';

-- ✅ 优化：前缀匹配
SELECT * FROM users WHERE name LIKE 'Tom%';

-- ✅ 或使用全文索引
ALTER TABLE users ADD FULLTEXT INDEX idx_name(name);
SELECT * FROM users WHERE MATCH(name) AGAINST('Tom');
```

### 3.2 索引选择

```sql
-- ❌ 错误：多个单列索引
ALTER TABLE orders ADD INDEX idx_user(user_id);
ALTER TABLE orders ADD INDEX idx_status(status);
ALTER TABLE orders ADD INDEX idx_amount(amount);
-- MySQL 只会用一条

-- ✅ 正确：组合索引
ALTER TABLE orders ADD INDEX idx_user_status(user_id, status, amount);

-- 索引顺序原则：
-- 1. 等于优先（=, IN）
-- 2. 范围其次（>, <, BETWEEN）
-- 3. 最左前缀
```

---

## 4. SQL 规范

### 4.1 禁止

```sql
-- ❌ 禁止：SELECT *
SELECT * FROM orders;

-- ❌ 禁止：负向查询
SELECT * FROM users WHERE status != 1;
SELECT * FROM users WHERE NOT IN (1, 2, 3);

-- ❌ 禁止：OR
SELECT * FROM users WHERE id = 1 OR age = 18;

-- ❌ 禁止：COUNT(*) 条件
SELECT COUNT(*) FROM orders WHERE status = 1;  -- 需要扫描
SELECT COUNT(1) FROM orders;  -- 更快
```

### 4.2 推荐

```sql
-- ✅ 推荐：明确列名
SELECT id, name, age FROM users;

-- ✅ 推荐：正向查询
SELECT * FROM users WHERE status = 1;

-- ✅ 推荐：UNION ALL
SELECT * FROM users WHERE id = 1
UNION ALL
SELECT * FROM users WHERE age = 18;

-- ✅ 推荐：分页 COUNT
SELECT COUNT(*) FROM orders;  -- 直接返回总数
-- 或缓存总数，不实时查询
```

---

## 5. 大表优化

### 5.1 分表

```sql
-- 水平分表：按 ID 范围
CREATE TABLE orders_202601 (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    amount DECIMAL(10,2),
    created_at DATETIME
);

-- 垂直分表：按字段拆分
-- 经常查询的字段放主表
-- 大字段（TEXT, BLOB）放副表
```

### 5.2 分区

```sql
-- 按月分区
ALTER TABLE orders 
PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p202501 VALUES LESS THAN (TO_DAYS('2026-02-01')),
    PARTITION p202502 VALUES LESS THAN (TO_DAYS('2026-03-01')),
    PARTITION p202503 VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 查询自动走分区
SELECT * FROM orders WHERE created_at BETWEEN '2026-02-01' AND '2026-02-28';
```

---

## 6. 总结

| 优化点 | 方法 |
|--------|------|
| 分页 | 游标分页 |
| JOIN | 小表驱动大表 |
| 索引 | 组合索引 |
| COUNT | 用主键/缓存 |
| 大表 | 分区/分表 |

---

> 📚 续篇：《MySQL 主从复制与读写分离》
