---
title: Hive：让 SQL 运行在 Hadoop 上
summary: 上一章我们学了 MapReduce，但它有个严重问题：写代码太麻烦！
publishedAt: '2026-03-16'
track: engineering
topic: BigData
tags: []
featured: false
draft: false
slug: hive-数据仓库
legacyPaths:
  - /coding/BigData/Hive-数据仓库
---
> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：掌握 Hive 数据仓库，理解 SQL on Hadoop 的工作原理

---

## 一、为什么需要 Hive？

### 1.1 MapReduce 的痛点

上一章我们学了 MapReduce，但它有个严重问题：**写代码太麻烦！**

```java
// 统计每个部门的平均工资（MR 版本）
public class SalaryMapper extends Mapper<...> {
    @Override
    protected void map(...) {
        String[] fields = value.toString().split(",");
        String dept = fields[3];  // 部门
        int salary = Integer.parseInt(fields[4]);  // 工资
        context.write(new Text(dept), new IntWritable(salary));
    }
}

public class SalaryReducer extends Reducer<...> {
    @Override
    protected void reduce(...) {
        int sum = 0, count = 0;
        for (IntWritable val : values) {
            sum += val.get();
            count++;
        }
        context.write(key, new IntWritable(sum / count));
    }
}
```

**一行 SQL 就能搞定的事！**

```sql
-- Hive 版本：一条 SQL 搞定
SELECT dept, AVG(salary) FROM employee GROUP BY dept;
```

### 1.2 Hive 的诞生

Hive 是 Facebook 在 2008 年开源的，核心理念：

```
"Give SQL developers a familiar interface to Hadoop"
```

```
Hive 架构

┌─────────────────────────────────────────────────────┐
│                    Hive Client                      │
│   CLI │ JDBC/ODBC │ Thrift Server                  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                   Hive Server                        │
│   SQL Parser → Query Optimizer → Execution Plan    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Execution Engine                     │
│   Spark │ Tez │ MapReduce (可选)                    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Hadoop Core                          │
│   HDFS (存储) │ YARN (资源调度)                      │
└─────────────────────────────────────────────────────┘
```

---

## 二、Hive 基本概念

### 2.1 表 = HDFS 目录

Hive 的表不是"表"，是**HDFS 上的目录**：

```bash
# Hive 表在 HDFS 中的存储位置
# 数据库: default
# 表: employee

/user/hive/warehouse/
├── employee/
│   ├── 000000_0        # 文件1（part-00001 旧版本）
│   ├── 000001_0        # 文件2
│   └── 000002_0        # 文件3
```

### 2.2 数据类型

```sql
-- 基础类型
SELECT
    'hello' AS string_type,      -- 字符串
    123 AS int_type,              -- 整数
    3.14 AS double_type,         -- 浮点数
    TRUE AS boolean_type,        -- 布尔
    CAST('2024-01-01' AS DATE) AS date_type;  -- 日期

-- 复杂类型
SELECT
    ['a', 'b', 'c'] AS array_type,        -- 数组
    {'a': 1, 'b': 2} AS map_type,         -- 映射
    STRUCT('name', 25, 'male') AS struct_type;  -- 结构体
```

### 2.3 表的分类

| 类型 | 说明 | 示例 |
|------|------|------|
| **内部表（Managed Table）** | Hive 管理数据生命周期，删除表时数据也删除 | 临时数据 |
| **外部表（External Table）** | Hive 只管理元数据，数据不受 Hive 管理 | 日志文件 |
| **分区表** | 按某个字段分区存储，提升查询性能 | 按日期分区 |
| **桶表（Bucket Table）** | 按哈希分桶，用于抽样和 JOIN 优化 | 用户 ID 桶 |

---

## 三、Hive SQL 实战

### 3.1 DDL 操作

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS company;

-- 使用数据库
USE company;

-- 创建内部表
CREATE TABLE employee (
    id          INT,
    name        STRING,
    dept        STRING,
    salary      DOUBLE,
    join_date   DATE
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','        -- 列分隔符
STORED AS TEXTFILE;             -- 存储格式

-- 创建外部表（推荐用于生产环境）
CREATE EXTERNAL TABLE logs (
    id          INT,
    user_id     STRING,
    action      STRING,
    timestamp   BIGINT
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '\t'
LOCATION '/user/bigdata/logs';  -- 指定 HDFS 目录
```

### 3.2 数据导入导出

```sql
-- 从本地文件导入
LOAD DATA LOCAL INPATH '/tmp/employee.csv'
INTO TABLE employee;

-- 从 HDFS 移动（不保留原文件）
LOAD DATA INPATH '/user/data/employee.csv'
INTO TABLE employee;

-- 导出到 HDFS
INSERT OVERWRITE DIRECTORY '/user/output/result'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
SELECT * FROM employee WHERE salary > 10000;

-- 导出到本地
INSERT OVERWRITE LOCAL DIRECTORY '/tmp/result'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
SELECT * FROM employee WHERE salary > 10000;
```

### 3.3 查询操作

```sql
-- 基础查询
SELECT * FROM employee LIMIT 10;

-- 条件过滤
SELECT name, salary FROM employee WHERE dept = 'IT' AND salary > 15000;

-- 分组聚合
SELECT dept, AVG(salary) AS avg_salary, COUNT(*) AS cnt
FROM employee
GROUP BY dept
HAVING AVG(salary) > 10000;

-- 排序
SELECT name, salary FROM employee
ORDER BY salary DESC
LIMIT 20;

-- JOIN
SELECT e.name, d.dept_name
FROM employee e
JOIN department d ON e.dept = d.dept_id;
```

### 3.4 复杂查询

```sql
-- 窗口函数
SELECT
    name,
    dept,
    salary,
    AVG(salary) OVER (PARTITION BY dept) AS dept_avg_salary,
    RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dept_rank,
    SUM(salary) OVER (ORDER BY salary) AS running_total
FROM employee;

-- 多个 CTEs（公共表表达式）
WITH
    dept_salary AS (
        SELECT dept, AVG(salary) AS avg_sal
        FROM employee
        GROUP BY dept
    ),
    top_dept AS (
        SELECT dept FROM dept_salary
        ORDER BY avg_sal DESC
        LIMIT 3
    )
SELECT e.*, d.avg_sal
FROM employee e
JOIN dept_salary d ON e.dept = d.dept
WHERE e.dept IN (SELECT dept FROM top_dept);
```

---

## 四、分区与桶

### 4.1 分区表

分区 = 目录结构，按某个字段划分数据

```sql
-- 按日期分区
CREATE TABLE logs (
    id          INT,
    user_id     STRING,
    action      STRING
)
PARTITIONED BY (dt STRING)    -- 分区字段
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '\t';

-- 静态分区（指定分区值）
INSERT INTO logs PARTITION(dt='2024-01-01')
SELECT id, user_id, action FROM staging_logs;

-- 动态分区（自动推断分区值）
INSERT INTO logs PARTITION(dt)
SELECT id, user_id, action, dt FROM staging_logs;
```

分区后的目录结构：

```
/user/hive/warehouse/logs/
├── dt=2024-01-01/
│   ├── 000000_0
│   └── 000001_0
├── dt=2024-01-02/
│   ├── 000000_0
│   └── 000001_0
└── dt=2024-01-03/
    └── 000000_0
```

### 4.2 桶表

桶 = 文件分片，按哈希值均匀分布

```sql
-- 按用户 ID 分桶
CREATE TABLE user_behavior (
    user_id     STRING,
    item_id     STRING,
    behavior    STRING,
    timestamp   BIGINT
)
CLUSTERED BY (user_id) INTO 32 BUCKETS    -- 32个桶
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '\t';

-- 桶表的优势：JOIN 优化
-- 相同桶编号的记录一定在同一个文件
-- 可以做 map-side JOIN
```

---

## 五、Hive 存储格式

### 5.1 文件格式对比

| 格式 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **TEXTFILE** | 文本格式 | 通用、可读 | 无压缩、占用空间大 |
| **SEQUENCEFILE** | 二进制序列 | 可压缩、支持块级压缩 | 不可直接查看 |
| **ORC** | 列式存储 | 高压缩、列裁剪快 | Hive 专用 |
| **Parquet** | 列式存储 | 跨平台、列裁剪 | 压缩率略低于 ORC |

**推荐**：生产环境使用 **ORC** 或 **Parquet**

### 5.2 使用 ORC 格式

```sql
-- 创建 ORC 表
CREATE TABLE employee_orc (
    id          INT,
    name        STRING,
    dept        STRING,
    salary      DOUBLE
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');  -- 压缩方式

-- 转换为 ORC 格式
INSERT INTO TABLE employee_orc
SELECT * FROM employee;
```

### 5.3 压缩配置

```sql
-- 启用中间结果压缩
SET hive.exec.compress.intermediate=true;
SET hive.intermediate.compression.codec=org.apache.hadoop.io.compress.SnappyCodec;

-- 启用输出压缩
SET hive.exec.compress.output=true;
SET mapreduce.output.fileoutputformat.compress=true;
SET mapreduce.output.fileoutputformat.compress.codec=org.apache.hadoop.io.compress.GzipCodec;
```

---

## 六、Hive 性能优化

### 6.1 执行计划分析

```sql
-- 查看执行计划
EXPLAIN SELECT dept, AVG(salary) FROM employee GROUP BY dept;

-- 详细执行计划
EXPLAIN EXTENDED SELECT dept, AVG(salary) FROM employee GROUP BY dept;
```

### 6.2 常见优化技巧

```sql
-- 1. 启用向量化执行（提升 2-4 倍）
SET hive.vectorized.execution.enabled=true;

-- 2. 开启成本优化
SET hive.cbo.enable=true;

-- 3. 使用 Tez 引擎（比 MR 快很多）
SET hive.execution.engine=tez;

-- 4. 并行执行
SET hive.exec.parallel=true;
SET hive.exec.parallel.thread.number=8;

-- 5. 小文件合并
SET hive.merge.mapfiles=true;
SET hive.merge.mapredfiles=true;
SET hive.merge.size.per.task=256000000;
```

### 6.3 JOIN 优化

```sql
-- 大表 JOIN 小表：使用 MAPJOIN
SELECT /*+ MAPJOIN(small_table) */
    a.*, b.name
FROM large_table a
JOIN small_table b ON a.id = b.id;

-- 调整 JOIN 顺序（先 join 小表）
SELECT /*+ MAPJOIN(t1) */
    t1.*, t2.*, t3.*
FROM small_table t1
JOIN medium_table t2 ON t1.id = t2.id
JOIN large_table t3 ON t2.id = t3.id;
```

---

## 七、本章实战：用户数据分析

### 7.1 场景

分析电商用户行为数据：
- 用户点击日志
- 订单数据
- 用户维度表

### 7.2 建表

```sql
-- 1. 用户点击日志（分区表）
CREATE TABLE user_click_log (
    user_id     STRING,
    item_id     STRING,
    category    STRING,
    action      STRING,
    timestamp   BIGINT
)
PARTITIONED BY (dt STRING)
STORED AS PARQUET;

-- 2. 订单表
CREATE TABLE orders (
    order_id    STRING,
    user_id     STRING,
    amount      DOUBLE,
    status      STRING,
    create_time STRING
)
STORED AS PARQUET;

-- 3. 用户维度表
CREATE TABLE dim_user (
    user_id     STRING,
    name        STRING,
    age         INT,
    gender      STRING,
    city        STRING
)
STORED AS PARQUET;
```

### 7.3 分析查询

```sql
-- 1. 统计每日活跃用户数
SELECT dt, COUNT(DISTINCT user_id) AS dau
FROM user_click_log
WHERE dt >= '2024-01-01' AND dt <= '2024-01-31'
GROUP BY dt
ORDER BY dt;

-- 2. 统计各品类转化率
SELECT
    category,
    COUNT(DISTINCT CASE WHEN action = 'pv' THEN user_id END) AS pv_users,
    COUNT(DISTINCT CASE WHEN action = 'buy' THEN user_id END) AS buy_users,
    ROUND(
        COUNT(DISTINCT CASE WHEN action = 'buy' THEN user_id END) * 1.0 /
        COUNT(DISTINCT CASE WHEN action = 'pv' THEN user_id END),
        4
    ) AS cvr
FROM user_click_log
WHERE dt = '2024-01-15'
GROUP BY category
ORDER BY cvr DESC;

-- 3. 用户购买力分析
SELECT
    u.city,
    u.age_group,
    COUNT(DISTINCT u.user_id) AS users,
    ROUND(AVG(o.total_amount), 2) AS avg_amount,
    ROUND(AVG(o.order_count), 2) AS avg_orders
FROM dim_user u
JOIN (
    SELECT
        user_id,
        SUM(amount) AS total_amount,
        COUNT(*) AS order_count
    FROM orders
    WHERE status = 'COMPLETED'
    GROUP BY user_id
) o ON u.user_id = o.user_id
GROUP BY u.city, u.age_group
ORDER BY avg_amount DESC;
```

---

## 八、Hive 3.x 新特性

### 8.1 ACID 支持

```sql
-- Hive 3.x 支持事务（需要开启）
SET hive.txn.manager=org.apache.hadoop.hive.ql.lockmgr.DbTxnManager;

CREATE TABLE transactional_table (
    id      INT,
    name    STRING
) STORED AS ORC
TBLPROPERTIES ('transactional'='true');

-- 支持 UPDATE/DELETE
UPDATE transactional_table SET name = 'new_name' WHERE id = 1;
DELETE FROM transactional_table WHERE id = 2;
```

### 8.2 Materialized Views

```sql
-- 创建物化视图
CREATE MATERIALIZED VIEW sales_summary
AS
SELECT
    dt,
    category,
    SUM(amount) AS total_amount,
    COUNT(*) AS order_count
FROM orders
GROUP BY dt, category;

-- 查询自动重写
SELECT dt, SUM(amount) FROM orders GROUP BY dt;
-- 自动使用物化视图
```

---

## 九、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **内部表 vs 外部表** | 外部表数据不受 Hive 管理，更安全 |
| **分区表** | 按日期/地区等分区，加速查询 |
| **桶表** | 哈希分桶，优化 JOIN |
| **ORC/Parquet** | 列式存储，高压缩比，高查询性能 |
| **执行计划** | EXPLAIN 分析 SQL 执行逻辑 |

### 为什么 Hive 重要？

- **SQL 友好**：让大数据开发像写 SQL 一样简单
- **生态完善**：Hive Metastore 成为元数据标准
- **面试重点**：Hive 优化是必问内容

---

## 下章预告

下一章我们将学习 **Spark**：更快的大数据计算引擎。

> 📚 下一章：[Spark 基础：内存计算与 DataFrame](Spark-内存计算)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
