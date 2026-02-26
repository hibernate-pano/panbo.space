# MySQL 主从复制与读写分离

> 构建高可用数据库架构

---

## 1. 主从复制原理

### 1.1 架构

```
┌─────────────┐     binlog      ┌─────────────┐
│   Master    │ ──────────────▶ │   Slave     │
│  (主库)      │                 │   (从库)    │
│  写操作       │                 │  读操作      │
└─────────────┘                 └─────────────┘
```

### 1.2 复制原理

```
1. Master 执行事务，写入 binlog
2. Slave IO 线程读取 master 的 binlog
3. 写入 relay log（中继日志）
4. Slave SQL 线程重放 relay log
5. 数据同步到 Slave
```

### 1.3 复制方式

| 方式 | 特点 | 延迟 |
|------|------|------|
| 异步复制 | 主库不等从库 | 低 |
| 半同步复制 | 至少一个从库确认 | 中 |
| 全同步复制 | 所有从库确认 | 高 |

---

## 2. 主从配置

### 2.1 Master 配置

```ini
# my.cnf
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW  # 建议使用 ROW
sync-binlog = 1      # 每次事务同步到磁盘
```

```sql
-- 创建复制用户
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- 查看主库状态
SHOW MASTER STATUS;
-- File: mysql-bin.000001
-- Position: 1234
```

### 2.2 Slave 配置

```ini
# my.cnf
[mysqld]
server-id = 2
relay-log = relay-bin
read-only = 1  # 从库只读
```

```sql
-- 配置主从复制
CHANGE MASTER TO
    MASTER_HOST='192.168.1.1',
    MASTER_USER='repl',
    MASTER_PASSWORD='password',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=1234;

-- 启动从库
START SLAVE;

-- 查看从库状态
SHOW SLAVE STATUS\G

-- 关键指标：
-- Slave_IO_Running: Yes
-- Slave_SQL_Running: Yes
-- Seconds_Behind_Master: 0
```

---

## 3. 读写分离

### 3.1 架构

```
         ┌─────────────┐
         │  Application  │
         └──────┬──────┘
                │
        ┌──────┴──────┐
        │   Proxy     │
        │ (读写分离)   │
        └──────┬──────┘
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   Master    │   │   Slave     │
│   (写)      │   │   (读)      │
└─────────────┘   └─────────────┘
```

### 3.2 实现方式

```java
// 方式1：应用层分离
public class DataSourceRouter {
    
    public static final int WRITE = 0;
    public static final int READ = 1;
    
    public DataSource getDataSource() {
        if (isWriteOperation()) {
            return writeDataSource;
        } else {
            return readDataSource;
        }
    }
    
    private boolean isWriteOperation() {
        // 判断是否是写操作
        StackTraceElement[] stack = Thread.currentThread().getStackTrace();
        // INSERT/UPDATE/DELETE
    }
}

// 方式2：使用 ShardingSphere-Proxy
// 方式3：使用 MyCAT
// 方式4：使用 MySQL Proxy
```

---

## 4. 主从延迟问题

### 4.1 延迟原因

```
1. 主库并发太高
2. 从库硬件性能差
3. 网络延迟
4. 大事务（一个事务包含大量操作）
5. 从库复制模式
```

### 4.2 解决延迟

```sql
-- 1. 避免大事务
-- ❌ 错误
BEGIN;
INSERT INTO orders VALUES(...); -- 10000条
COMMIT;

-- ✅ 正确：分批执行
for (batch : batches) {
    INSERT INTO orders VALUES(batch);
}

-- 2. 减少 binlog 输出
binlog-row-image = MINIMAL

-- 3. 并行复制
SET GLOBAL slave_parallel_type = 'LOGICAL_CLOCK';
SET GLOBAL slave_parallel_workers = 4;
```

---

## 5. 数据一致性

### 5.1 主从数据校验

```bash
# 使用 pt-table-checksum
pt-table-checksum h=master,u=root,p=password --databases=mydb
```

### 5.2 数据补偿

```java
// 读操作发现不一致时
public User getUserById(Long id) {
    // 先查从库
    User user = slaveDao.selectById(id);
    
    // 校验
    if (user == null) {
        // 从库没有，查主库
        user = masterDao.selectById(id);
        // 补偿到从库
        slaveDao.insert(user);
    }
    
    return user;
}
```

---

## 6. 高可用架构

### 6.1 双主架构

```
┌─────────────┐         ┌─────────────┐
│  Master-1   │◀───────▶│  Master-2   │
│  (双主)     │  互相同步  │  (双主)     │
└──────┬──────┘         └──────┬──────┘
       │                        │
       ▼                        ▼
┌─────────────┐         ┌─────────────┐
│   Slave    │         │   Slave     │
└─────────────┘         └─────────────┘
```

### 6.2 MHA / Orchestrator

```bash
# MHA (MySQL High Availability)
# 自动监控主库故障并进行故障转移

# Orchestrator
# 可视化管理 MySQL 集群
```

---

## 7. 总结

| 概念 | 说明 |
|------|------|
| 主从复制 | binlog + relay log |
| 读写分离 | 写主库，读从库 |
| 半同步 | 至少一个从库确认 |
| 并行复制 | 减少延迟 |
| 数据校验 | pt-table-checksum |

---

> 📚 MySQL 系列完结！
