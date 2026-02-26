# MySQL 事务与锁

> 理解事务是理解数据库的核心

---

## 1. 事务基础

### 1.1 什么是事务？

事务是数据库执行的最小单元：

```sql
-- 典型场景：转账
START TRANSACTION;

UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;

-- 如果中间出错， rollback
-- 如果成功， commit
COMMIT;
```

### 1.2 ACID 特性

| 特性 | 说明 |
|------|------|
| Atomic（原子性） | 要么全成功，要么全失败 |
| Consistency（一致性） | 事务前后数据一致 |
| Isolation（隔离性） | 并发事务互不干扰 |
| Durability（持久性） | 提交后数据永久保存 |

---

## 2. 事务隔离级别

### 2.1 四种隔离级别

```sql
-- 查看当前隔离级别
SELECT @@transaction_isolation;

-- 设置隔离级别
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|----------|------|------------|------|
| READ UNCOMMITTED | ✓ 可能 | ✓ 可能 | ✓ 可能 |
| READ COMMITTED | ✗ 不可能 | ✓ 可能 | ✓ 可能 |
| REPEATABLE READ (MySQL默认) | ✗ 不可能 | ✗ 不可能 | ✓ 可能 |
| SERIALIZABLE | ✗ 不可能 | ✗ 不可能 | ✗ 不可能 |

### 2.2 脏读示例

```sql
-- READ UNCOMMITTED 会发生脏读

-- 事务A
START TRANSACTION;
UPDATE users SET balance = balance - 1000 WHERE id = 1;
-- 未提交

-- 事务B（READ UNCOMMITTED）
SELECT * FROM users WHERE id = 1;  -- 看到 A 未提交的修改

-- 事务A ROLLBACK;
-- 事务B 读到的数据是错误的（脏读）
```

### 2.3 不可重复读

```sql
-- READ COMMITTED 会发生不可重复读

-- 事务B
START TRANSACTION;
SELECT balance = 1; FROM users WHERE id  -- 1000

-- 事务A
UPDATE users SET balance = 2000 WHERE id = 1;
COMMIT;

-- 事务B 再次查询
SELECT balance FROM users WHERE id = 1;  -- 2000
-- 两次结果不同（不可重复读）
```

---

## 3. MySQL 锁机制

### 3.1 锁分类

```
按粒度：
- 表锁：锁整张表
- 行锁：锁单行记录
- 页锁：锁一页数据

按模式：
- 共享锁（S锁）：读锁，可共存
- 排他锁（X锁）：写锁，互斥
```

### 3.2 行锁与表锁

```sql
-- 行锁（InnoDB）
SELECT * FROM users WHERE id = 1 LOCK IN SHARE MODE;  -- 共享锁
SELECT * FROM users WHERE id = 1 FOR UPDATE;         -- 排他锁

-- 表锁（MyISAM）
LOCK TABLE users READ;
LOCK TABLE users WRITE;
UNLOCK TABLES;
```

### 3.3 意向锁

```sql
-- InnoDB 的意向锁（表锁）
- 意向共享锁（IS）：事务想要获取某行的共享锁
- 意向排他锁（IX）：事务想要获取某行的排他锁

-- 目的：快速判断表是否有行锁
```

---

## 4. MVCC 机制

### 4.1 什么是 MVCC？

MVCC（Multi-Version Concurrency Control）多版本并发控制：

- 同一行数据可以同时存在多个版本
- 读操作不加锁，通过版本号实现
- 提高并发性能

### 4.2 隐藏字段

```sql
-- InnoDB 每行数据有三个隐藏字段：
- DB_ROW_ID：主键ID
- DB_TRX_ID：事务ID
- DB_ROLL_PTR：回滚指针
```

### 4.3 快照读 vs 当前读

```sql
-- 快照读（不加锁）
SELECT * FROM users;  -- REPEATABLE READ 下的快照

-- 当前读（加锁）
SELECT * FROM users LOCK IN SHARE MODE;
SELECT * FROM users FOR UPDATE;
INSERT INTO users VALUES(...);
UPDATE users SET ...;
DELETE FROM users;
```

---

## 5. 锁问题与解决

### 5.1 死锁

```sql
-- 死锁示例
-- 事务A：先锁 id=1，再锁 id=2
START TRANSACTION;
UPDATE users SET name = 'A' WHERE id = 1;
UPDATE users SET name = 'A' WHERE id = 2;
COMMIT;

-- 事务B：先锁 id=2，再锁 id=1
START TRANSACTION;
UPDATE users SET name = 'B' WHERE id = 2;
UPDATE users SET name = 'B' WHERE id = 1;
COMMIT;

-- 可能发生死锁
```

### 5.2 解决死锁

```sql
-- 1. 统一加锁顺序
-- 2. 减小事务大小
-- 3. 查看死锁日志
SHOW ENGINE INNODB STATUS;

-- 4. 设置锁超时
SET GLOBAL innodb_lock_wait_timeout = 10;
```

---

## 6. 最佳实践

### 6.1 事务使用原则

```sql
-- ✅ 正确用法
START TRANSACTION;
try {
    UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
    UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;
    COMMIT;
} catch {
    ROLLBACK;
}

-- ❌ 错误用法
START TRANSACTION;
SELECT * FROM users;  -- 耗时操作
-- 其他事务等待...
COMMIT;
-- 事务时间过长，锁住资源
```

### 6.2 隔离级别选择

- **READ COMMITTED**：大多数场景
- **REPEATABLE READ**：需要一致性读
- **SERIALIZABLE**：数据一致性要求极高

---

## 7. 总结

| 概念 | 说明 |
|------|------|
| ACID | 事务的四个特性 |
| 隔离级别 | 解决并发问题 |
| MVCC | 多版本并发控制 |
| 行锁/表锁 | 锁的粒度 |
| 死锁 | 互相等待，需要避免 |

---

> 📚 续篇：《MySQL SQL 优化实战》
