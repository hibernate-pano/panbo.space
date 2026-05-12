---
title: MySQL EXPLAIN 执行计划完全解析
summary: 从 type 到 key、rows、Extra，详解 MySQL 执行计划的每一个字段，附银行核心场景的慢查询优化实战与索引失效诊断。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: MySQL
tags: []
featured: false
draft: false
slug: mysql-explain执行计划完全解析
legacyPaths:
  - /coding/MySQL/MySQL-EXPLAIN执行计划完全解析
---
> "看到慢查询，第一反应不是加索引，而是先看 EXPLAIN。执行计划是 SQL 优化的罗盘，每一个字段都在告诉你优化的方向。"

## 前言

在银行核心系统里，一条 SQL 的性能问题可能导致整笔交易超时。在几十亿行级别的表上，一次不恰当的全表扫描可能锁死整个数据库。EXPLAIN 是 MySQL 自带的 SQL 分析工具，每一个字段都有明确含义。

## 1. 基础使用

```sql
-- 普通 EXPLAIN（分析查询计划，不执行）
EXPLAIN SELECT * FROM accounts WHERE account_no = '1234567890';

-- EXPLAIN ANALYZE（MySQL 8.0+，执行并分析实际耗时）
EXPLAIN ANALYZE SELECT * FROM accounts WHERE account_no = '1234567890';
```

```
EXPLAIN ANALYZE 输出示例：
-> Index lookup on accounts using idx_account_no (account_no='1234567890')
    (cost=0.35 rows=1) (actual time=0.001..0.002 rows=1 loops=1)
```

## 2. type 字段：连接类型（最重要）

type 描述了 MySQL 如何查找数据行，从最优到最差：

| type 值 | 含义 | 备注 |
|---------|------|------|
| **system** | 系统表，只有 1 行 | 极致优化 |
| **const** | 主键/唯一索引等值查找，最多 1 行 | ✅ 最优 |
| **eq_ref** | 关联查询，用主键/唯一索引，等值连接 | ✅ 优秀 |
| **ref** | 非主键/唯一索引，等值查找，返回匹配多行 | ✅ 良好 |
| **ref_or_null** | ref + 额外查找 NULL 值 | 可接受 |
| **range** | 索引范围扫描（BETWEEN、IN、>、<） | ✅ 可接受 |
| **index** | 全索引扫描（只扫描索引树） | ⚠️ 较差 |
| **ALL** | **全表扫描**（读整个磁盘数据文件） | ❌ 最差 |

```
# 实战分析：

-- ✅ type=const（主键等值，最优）
EXPLAIN SELECT * FROM accounts WHERE id = 100;
-> type: const（主键索引等值，命中 1 行）

-- ✅ type=eq_ref（JOIN 中用主键）
EXPLAIN SELECT * FROM payments p JOIN accounts a ON p.account_id = a.id;
-> type: eq_ref（a.id 为主键，p.account_id 等值连接）

-- ✅ type=ref（非主键索引等值）
EXPLAIN SELECT * FROM transactions WHERE account_no = '123';
-> type: ref（idx_account_no 普通索引等值）

-- ⚠️ type=index（全索引扫描）
EXPLAIN SELECT account_no FROM transactions;
-> type: index（扫描整个 idx_account_no 索引树，但不需要回表）

-- ❌ type=ALL（全表扫描，禁止在生产环境大表上出现）
EXPLAIN SELECT * FROM transactions WHERE amount > 1000;
-> type: ALL（没有在 amount 上建索引）
```

## 3. key 字段：实际使用的索引

```
key：MySQL 实际决定使用的索引名称
key_len：索引使用的字节数（可判断联合索引用到几列）

# 示例：
key: idx_account_created
key_len: 50

# key_len 计算方式：
# 字符集 utf8mb4: 每个字符占 4 字节
# varchar(10) + null_flag(1) = 10*4 + 2 = 42
# 联合索引 (account_no varchar(10), created_at datetime):
#   key_len = 42 + 5 = 47
```

### 3.1 key_len 判断联合索引使用情况

```sql
-- 联合索引 idx_account_date(account_no, created_at)
-- account_no varchar(10) NOT NULL, created_at datetime NOT NULL

-- 查询只用了 account_no
EXPLAIN SELECT * FROM transactions
WHERE account_no = '1234567890';
-- key_len = 42（只用了一列，utf8mb4 * 10 + 2）

-- 查询用了 account_no + created_at
EXPLAIN SELECT * FROM transactions
WHERE account_no = '1234567890' AND created_at > '2026-01-01';
-- key_len = 42 + 5 = 47（两列都用上了）

-- 查询只用了 created_at（违反最左前缀，无法使用索引）
EXPLAIN SELECT * FROM transactions
WHERE created_at > '2026-01-01';
-- key = NULL（全表扫描！）
```

## 4. rows 字段：扫描行数估算

```
rows：MySQL 估算需要扫描的行数（不是返回行数）

重要：这个数字越小越好。rows × 单行 IO 成本 = 查询理论耗时。
```

```sql
-- 示例：百万行表中查单笔交易
EXPLAIN SELECT * FROM transactions WHERE transaction_id = 'TXN-20260321-001';
-> rows: 1（主键查找，扫描 1 行）

EXPLAIN SELECT * FROM transactions WHERE status = 'PENDING';
-> rows: 15234（估算返回 1.5 万行，PENDING 状态占比约 1.5%）

EXPLAIN SELECT * FROM transactions WHERE amount > 0;
-> rows: 987654  ← 估算扫描 98 万行！（没有在 amount 上建索引）
```

## 5. Extra 字段：额外执行信息

Extra 是最重要的优化线索，常见值：

### 5.1 Using Index（覆盖索引，无需回表）

```sql
-- ✅ 覆盖索引：查询的列全部在索引中
EXPLAIN SELECT account_no, created_at FROM transactions
WHERE account_no = '1234567890';
-- Extra: Using index（不需要回表，直接在索引树返回值）

-- ❌ 不是覆盖索引：需要回表查主键，再查数据行
EXPLAIN SELECT * FROM transactions WHERE account_no = '1234567890';
-- Extra: (无 Using index) → 回表读取完整行
```

### 5.2 Using Where（服务端过滤）

```sql
-- Extra: Using where 表示 MySQL 在存储引擎返回后，在 MySQL 服务层额外过滤
EXPLAIN SELECT * FROM transactions WHERE amount > 1000;
-- Extra: Using where

-- 如果 Extra 只有 Using index 而没有 Using where：
-- 说明存储引擎已经完成了所有过滤，效率更高
```

### 5.3 Using Index Condition（索引下推 ICP）

```sql
-- MySQL 5.6+ 索引下推：在索引树层面过滤更多条件
EXPLAIN SELECT * FROM transactions
WHERE account_no = '1234567890' AND amount > 1000;
-- Extra: Using index condition

-- 原理：
-- 无 ICP：先根据 account_no 找到所有匹配行，回表，再过滤 amount > 1000
-- 有 ICP：根据 account_no + amount 共同在索引树过滤，减少回表次数
```

### 5.4 Using Filesort（需额外排序）

```sql
-- ❌ 需要在内存/磁盘中排序（ORDER BY 的列没有索引）
EXPLAIN SELECT * FROM transactions
WHERE account_no = '1234567890' ORDER BY created_at DESC;
-- Extra: Using filesort（使用文件排序，filesort ≠ 文件，可能是内存排序）

-- ✅ 利用索引排序（ORDER BY 列在索引中天然有序）
EXPLAIN SELECT * FROM transactions
WHERE account_no = '1234567890'  -- 先用索引过滤
ORDER BY created_at DESC;         -- created_at 在联合索引中，可以利用索引顺序
-- Extra: Backward index scan（利用索引倒序扫描，无需 filesort）
```

### 5.5 Using Temporary（使用临时表）

```sql
-- 创建临时表（GROUP BY 或 DISTINCT 涉及非索引列）
EXPLAIN SELECT status, COUNT(*) FROM transactions
GROUP BY status;
-- Extra: Using temporary; Using filesort

-- GROUP BY 优化：用索引代替临时表
EXPLAIN SELECT status, COUNT(*) FROM transactions
GROUP BY status ORDER BY NULL;  -- 不需要排序
-- Extra: Using temporary（仍需临时表，但无排序）
```

### 5.6 其他常见值

```
Extra 值速查：

Using index          ✅ 覆盖索引，无需回表
Using where          ⚠️ 服务端额外过滤
Using index condition ⚠️ 索引下推（ICP）
Using filesort       ❌ 需要额外排序
Using MRR            ⚠️ 范围查询使用 MRR 优化（Multi Range Read）
Using join buffer    ❌ JOIN 时使用临时缓存（应建索引）
No tables used       ℹ️ 无表查询（如 SELECT 1）
Impossible WHERE     ⚠️ WHERE 永远为 false（逻辑错误）
```

## 6. 银行核心场景优化实战

### 6.1 场景一：账户流水查询（分页 + 时间范围）

```sql
-- ❌ 慢查询：深度分页 + 无索引
SELECT * FROM transactions
WHERE account_no = '1234567890'
  AND created_at > '2026-01-01'
ORDER BY created_at DESC
LIMIT 1000000, 20;

-- 问题分析：
-- 1. OFFSET 过大，前 100 万行需要先扫描再丢弃
-- 2. 没有合适的复合索引
-- 3. created_at 无索引，ORDER BY filesort

-- ✅ 优化方案 1：游标分页（推荐）
SELECT * FROM transactions
WHERE account_no = '1234567890'
  AND created_at < '2026-01-15'  -- 使用上一页最后一条的时间戳
ORDER BY created_at DESC
LIMIT 20;

-- 创建复合索引（覆盖所有查询条件）
ALTER TABLE transactions ADD INDEX
  idx_account_created (account_no, created_at DESC, id);

-- ✅ 优化方案 2：延迟关联
SELECT t.* FROM transactions t
INNER JOIN (
    SELECT id FROM transactions
    WHERE account_no = '1234567890'
      AND created_at > '2026-01-01'
    ORDER BY created_at DESC
    LIMIT 1000000, 20
) AS page ON t.id = page.id;

-- EXPLAIN 对比：
-- 优化前：rows=1000020, Extra: Using filesort
-- 优化后：rows=20, Extra: Using index; Using filesort（子查询用索引）
```

### 6.2 场景二：日终对账（大批量 JOIN）

```sql
-- ❌ 慢查询：未加索引导致大表 JOIN
SELECT t.transaction_id, t.amount, a.account_name
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE t.created_at BETWEEN '2026-03-20 00:00:00' AND '2026-03-20 23:59:59'
  AND t.status = 'SETTLED';

-- EXPLAIN 分析：
-- t 表：type=ALL（全表扫描 500 万行！）
-- a 表：type=eq_ref（主键 JOIN）

-- ✅ 优化：先分析瓶颈
-- 添加复合索引
ALTER TABLE transactions ADD INDEX
  idx_created_status (created_at, status);

-- 再次 EXPLAIN：
-- type=range（使用 idx_created_status 范围扫描）
-- rows=15234（只扫描了当天数据）
-- Extra: Using index condition（索引下推）
```

### 6.3 场景三：实时余额统计

```sql
-- ❌ 禁止在主库上运行统计查询
SELECT COUNT(*), SUM(amount), AVG(amount)
FROM transactions
WHERE account_no = '1234567890'
  AND created_at > '2026-01-01';

-- 问题：全表扫描 + 函数计算，大表上可运行数分钟

-- ✅ 正确方案：用预计算 + 异步统计
-- 1. 每日凌晨跑日终批处理，将统计结果写入 account_daily_stats 表
-- 2. 实时查询只查 account_daily_stats（行数 = 账户数 × 天数，极小）
-- 3. 当日实时余额用 Redis 缓存

SELECT balance FROM account_daily_stats
WHERE account_no = '1234567890'
  AND stat_date = '2026-03-20';

-- EXPLAIN：
-- type=const（主键等值，rows=1）
```

## 7. EXPLAIN FORMAT=JSON（深度分析）

MySQL 8.0+ 提供 JSON 格式的详细执行计划：

```sql
EXPLAIN FORMAT=JSON
SELECT t.*, a.account_name
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE t.account_no = '1234567890';

-- 输出包含：
# {
#   "query_block": {
#     "cost_info": { "query_cost": "0.85" },  ← 查询成本
#     "nested_loop": [
#       { "buffer_result": "...", "cost": 0.35 },
#       { "attached_subqueries": [...] }
#     ]
#   }
# }
```

**cost_info.query_cost** 是最重要的指标：MySQL 估算的相对执行成本。优化时比较优化前后的 query_cost，降低越多越好。

## 8. 慢查询优化决策树

```
发现慢查询后的分析流程：

1. 先 EXPLAIN，看 type
   └─ type=ALL → 必须加索引
   └─ type=ref 但 rows 巨大 → 索引选择性问题

2. 看 key 和 key_len
   └─ key=NULL → 没有可用索引
   └─ key_len 太小 → 联合索引没用到全部列

3. 看 Extra
   └─ Using filesort → ORDER BY 列没有索引
   └─ Using temporary → GROUP BY 需要临时表
   └─ Using index → 覆盖索引，最优

4. 优化手段优先级：
   ① 覆盖索引（Using index）> 回表查询
   ② 索引顺序正确（最左前缀）> 索引顺序错误
   ③ 游标分页 > OFFSET 分页
   ④ 预计算 > 实时计算
   ⑤ 读写分离 > 主库统计查询
```

---

*相关阅读：[MySQL 索引完全指南](/coding/MySQL/MySQL索引完全指南) · [MySQL 事务与锁](/coding/MySQL/MySQL事务与锁) · [MySQL SQL 优化实战](/coding/MySQL/MySQLSQL优化实战)*
