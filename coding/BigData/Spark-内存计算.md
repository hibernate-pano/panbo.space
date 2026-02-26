# Spark 基础：内存计算与 DataFrame

> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：掌握 Spark 核心概念，理解内存计算原理

---

## 一、为什么需要 Spark？

### 1.1 MapReduce 的痛点

回顾一下 MapReduce：

```
MapReduce 问题：
├── 磁盘 IO 慢（每轮都写磁盘）
├── 延迟高（不适合交互式分析）
├── 编程模型简单但功能有限
├── Job 之间资源不共享
└── 只适合批处理
```

### 1.2 Spark 的突破

Spark 的核心创新：**内存计算**

```
MapReduce vs Spark

MapReduce：
  读取 → Map → 写磁盘 → 读取 → Reduce → 写磁盘
                    ↓
                  2次磁盘 IO

Spark：
  读取 → Map → Reduce → （数据在内存中）
  同一批数据可以多次复用
                    ↓
                  0次额外磁盘 IO（理想情况）
```

**结果**：Spark 比 MapReduce **快 10-100 倍**！

---

## 二、Spark 架构

### 2.1 核心组件

```
                    Spark 架构

┌──────────────────────────────────────────────────────────┐
│                     Driver Program                       │
│    SparkContext ───▶ DAG Scheduler ───▶ Task Scheduler   │
└─────────────────────────┬────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ Executor  │   │ Executor  │   │ Executor  │
    │  (CPU)    │   │  (CPU)    │   │  (CPU)    │
    │           │   │           │   │           │
    │ ┌───────┐ │   │ ┌───────┐ │   │ ┌───────┐ │
    │ │Task 1 │ │   │ │Task 1 │ │   │ │Task 1 │ │
    │ └───────┘ │   │ └───────┘ │   │ └───────┘ │
    │ ┌───────┐ │   │ ┌───────┐ │   │ ┌───────┐ │
    │ │Task 2 │ │   │ │Task 2 │ │   │ │Task 2 │ │
    │ └───────┘ │   │ └───────┘ │   │ └───────┘ │
    └───────────┘   └───────────┘   └───────────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
              ┌───────────────────────┐
              │      HDFS / S3       │
              └───────────────────────┘
```

### 2.2 核心概念

| 概念 | 说明 |
|------|------|
| **Application** | 提交给 Spark 的程序（Driver + Executors） |
| **Driver** | 运行 main() 方法，创建 SparkContext |
| **Executor** | 工作进程，运行 Task |
| **Task** | 最小执行单元，分片数据的处理 |
| **Job** | 触发一次 Action，生成多个 Task |
| **Stage** | 一个 Job 分为多个 Stage（Shuffle 划分） |
| **DAG** | 有向无环图，描述计算依赖关系 |

### 2.3 部署模式

```bash
# 1. Local 模式（单机调试）
spark-submit --master local[*] app.jar

# 2. Standalone 模式（Spark 自带集群）
spark-submit --master spark://host:7077 app.jar

# 3. YARN 模式（生产常用）
spark-submit --master yarn --deploy-mode cluster app.jar

# 4. Kubernetes 模式（云原生）
spark-submit --master k8s://https://k8s-api-server app.jar
```

---

## 三、RDD：Spark 核心

### 3.1 什么是 RDD？

**RDD = Resilient Distributed Dataset（弹性分布式数据集）**

```
RDD 特性：
├── Resilient（弹性）：数据丢失可自动恢复
├── Distributed（分布式）：数据分布在多台机器
├── Dataset（数据集）：数据集合
└── Lazy（惰性）：转换操作不立即执行
```

### 3.2 RDD 创建

```python
# PySpark 示例

# 1. 从 Python 集合创建
data = [1, 2, 3, 4, 5]
rdd = sc.parallelize(data)

# 2. 从文件创建
rdd = sc.textFile("hdfs:///user/data/log.txt")
rdd = sc.textFile("s3:///bucket/data/file.csv")

# 3. 从 Hive 表创建
rdd = spark.sql("SELECT * FROM user_logs").rdd
```

### 3.3 Transformation（转换）

```python
# Transformation：惰性操作，不立即执行
rdd = sc.textFile("data.txt")

# 1. map：转换每个元素
words = rdd.flatMap(lambda line: line.split(" "))

# 2. filter：过滤
long_words = words.filter(lambda w: len(w) > 5)

# 3. reduceByKey：按键聚合
word_counts = words.map(lambda w: (w, 1)).reduceByKey(lambda a, b: a + b)

# 4. distinct：去重
unique_words = words.distinct()

# 5. union / intersection / subtract：集合操作
rdd1 = sc.parallelize([1, 2, 3])
rdd2 = sc.parallelize([2, 3, 4])
union_rdd = rdd1.union(rdd2)  # [1,2,3,2,3,4]
```

### 3.4 Action（动作）

```python
# Action：触发计算，返回结果

# 1. collect：返回所有数据到 Driver
result = rdd.collect()

# 2. count：计数
count = rdd.count()

# 3. first / take：取部分数据
first = rdd.first()
top5 = rdd.take(5)

# 4. saveAsTextFile：保存到文件
rdd.saveAsTextFile("hdfs:///output/result")

# 5. reduce：聚合
total = rdd.reduce(lambda a, b: a + b)

# 6. foreach：遍历
rdd.foreach(lambda x: print(x))
```

### 3.5 完整示例：WordCount

```python
# Spark WordCount
from pyspark import SparkContext

sc = SparkContext("local[*]", "WordCount")

# 1. 读取文件
lines = sc.textFile("hdfs:///user/data/README.txt")

# 2. 转换：行 -> 单词
words = lines.flatMap(lambda line: line.split())

# 3. 转换：单词 -> (单词, 1)
pairs = words.map(lambda word: (word, 1))

# 4. Action：按 key 聚合
word_counts = pairs.reduceByKey(lambda a, b: a + b)

# 5. 按出现次数排序
sorted_counts = word_counts.sortBy(lambda x: x[1], ascending=False)

# 6. 输出前 10
top10 = sorted_counts.take(10)

for word, count in top10:
    print(f"{word}: {count}")

sc.stop()
```

---

## 四、DataFrame：更高级的 API

### 4.1 为什么需要 DataFrame？

```
RDD vs DataFrame

RDD：
  [1, 2, 3, 4]
  - 类型安全
  - 但操作繁琐
  - 没有优化

DataFrame：
  +---+---+
  | id|val|
  +---+---+
  |  1| 10|
  |  2| 20|
  +---+---+
  - 类似 SQL 表
  - 支持 Spark SQL
  - Catalyst 优化
```

### 4.2 DataFrame 创建

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("DataFrameDemo") \
    .getOrCreate()

# 1. 从 Python 列表创建
df = spark.createDataFrame([
    (1, "Alice", 25, "IT"),
    (2, "Bob", 30, "Sales"),
    (3, "Charlie", 35, "IT")
], ["id", "name", "age", "dept"])

# 2. 从 JSON 文件读取
df = spark.read.json("hdfs:///user/data/users.json")

# 3. 从 CSV 文件读取
df = spark.read.csv(
    "hdfs:///user/data/users.csv",
    header=True,
    inferSchema=True
)

# 4. 从 Hive 表读取
df = spark.sql("SELECT * FROM company.employee")
# 或者
df = spark.table("company.employee")

# 5. 从 Parquet 读取
df = spark.read.parquet("hdfs:///user/data/users.parquet")
```

### 4.3 DataFrame 操作

```python
# 查看数据
df.show()                    # 显示数据
df.printSchema()              # 显示结构
df.columns                   # 列名列表
df.dtypes                    # 列类型

# 选择列
df.select("name", "age").show()
df.select(df.name, df.age + 1).show()

# 过滤
df.filter(df.age > 25).show()
df.filter((df.dept == "IT") & (df.age > 30)).show()

# 分组聚合
df.groupBy("dept").count().show()
df.groupBy("dept").agg(
    {"age": "avg", "id": "max"}
).show()

# 排序
df.orderBy("age", ascending=False).show()

# 添加/修改列
df.withColumn("age_next_year", df.age + 1).show()
df.withColumnRenamed("name", "user_name").show()

# 删除列
df.drop("age").show()
```

### 4.4 SQL 查询

```python
# 注册为临时表
df.createOrReplaceTempView("users")

# SQL 查询
result = spark.sql("""
    SELECT dept, COUNT(*) as cnt, AVG(age) as avg_age
    FROM users
    WHERE age > 25
    GROUP BY dept
    ORDER BY avg_age DESC
""")

result.show()
```

---

## 五、Spark 数据源

### 5.1 支持的格式

| 格式 | 说明 | 适用场景 |
|------|------|----------|
| **JSON** | 常见，但无类型 | 日志、小文件 |
| **CSV** | 通用格式 | 导入导出 |
| **Parquet** | 列式存储 | 推荐生产使用 |
| **ORC** | Hive 常用 | Hive 兼容 |
| **Avro** | 行式存储，支持 Schema | 序列化 |
| **JDBC** | 关系型数据库 | 数据同步 |

### 5.2 读写示例

```python
# 读取
df = spark.read \
    .format("parquet") \
    .option("path", "hdfs:///data/users") \
    .load()

# 写入
df.write \
    .format("parquet") \
    .mode("overwrite") \
    .partitionBy("year", "month") \
    .save("hdfs:///output/users")
```

### 5.3 分区与分桶

```python
# 分区写入
df.write \
    .partitionBy("dept", "year") \
    .parquet("output/employee")

# 分桶写入（需要创建表）
df.write \
    .bucketBy(32, "user_id") \
    .sortBy("age") \
    .saveAsTable("employee_bucketed")
```

---

## 六、Spark 性能优化

### 6.1 广播变量

```python
# 小表广播（解决 Shuffle 问题）
# 场景：大表 JOIN 小表

# 错误的写法（会 Shuffle）
result = large_df.join(small_df, "key")

# 正确的写法（广播小表）
from pyspark.sql.functions import broadcast
result = broadcast(small_df).join(large_df, "key")
```

### 6.2 缓存与持久化

```python
# 缓存（lazy）
df.cache()  # 相当于 df.persist(StorageLevel.MEMORY_AND_DISK)

# 手动持久化
from pyspark import StorageLevel

df.persist(StorageLevel.MEMORY_AND_DISK)

# 第一次触发计算并缓存
count = df.count()

# 之后使用缓存
df.filter(...).show()

# 释放缓存
df.unpersist()
```

### 6.3 配置调优

```python
# Spark 配置
spark = SparkSession.builder \
    .config("spark.sql.shuffle.partitions", 200) \
    .config("spark.executor.memory", "4g") \
    .config("spark.driver.memory", "2g") \
    .config("spark.default.parallelism", 100) \
    .getOrCreate()
```

### 6.4 常见优化参数

| 参数 | 说明 | 建议值 |
|------|------|--------|
| `spark.sql.shuffle.partitions` | Shuffle 分区数 | 200（数据大时增大） |
| `spark.executor.memory` | Executor 内存 | 4-8g |
| `spark.executor.cores` | 每个 Executor 的核心数 | 2-4 |
| `spark.default.parallelism` | 默认并行度 | CPU 核数的 2-3 倍 |

---

## 七、本章实战：用户行为分析

### 7.1 场景

分析电商用户行为数据

### 7.2 完整代码

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, count, sum, avg, max, min,
    when, window, lag, lead, row_number
)
from pyspark.sql.window import Window

spark = SparkSession.builder \
    .appName("UserBehaviorAnalysis") \
    .config("spark.sql.adaptive.enabled", "true") \
    .enableHiveSupport() \
    .getOrCreate()

# 1. 读取数据
logs = spark.table("default.user_behavior_log")
users = spark.table("default.dim_user")

# 2. 基础统计：日活/新增/留存
daily_stats = logs.groupBy("dt").agg(
    count("user_id").alias("dau"),
    count(when(col("action") == "buy", 1)).alias("buy_users"),
    count(when(col("action") == "cart", 1)).alias("cart_users")
)
daily_stats.orderBy("dt").show()

# 3. 用户转化漏斗
funnel = logs.filter(col("dt") == "2024-01-15") \
    .groupBy("user_id") \
    .pivot("action", ["pv", "cart", "buy"]) \
    .count() \
    .fillna(0)

funnel = funnel.withColumn(
    "conversion_rate",
    col("buy") / col("pv") * 100
)
funnel.show()

# 4. 用户 RFM 分析
rfm = logs.groupBy("user_id").agg(
    max("timestamp").alias("recent_time"),     # R: 最近一次行为
    count("*").alias("frequency"),              # F: 行为次数
    sum(when(col("action") == "buy", 1).otherwise(0)).alias("monetary")  # M: 购买次数
)

# 计算 RFM 得分
rfm = rfm.withColumn(
    "r_score",
    when(col("recent_time") > 1705300000, 5)
    .when(col("recent_time") > 1705200000, 4)
    .otherwise(3)
)

rfm.orderBy(col("r_score").desc()).show()

# 5. 用户留存分析（次日留存）
window_spec = Window.partitionBy("user_id").orderBy("dt")

logs_with_lag = logs.withColumn(
    "prev_dt", lag("dt", 1).over(window_spec)
)

retention = logs_with_lag.filter(col("prev_dt").isNotNull()) \
    .groupBy("dt") \
    .agg(
        count(when(col("dt") == col("prev_dt") + 1, "user_id")).alias("next_day_retention")
    )

retention.show()

spark.stop()
```

---

## 八、Spark Streaming（了解）

### 8.1 批处理 vs 流处理

```
批处理（Batch）：
  ────────────
  [data 1hour] → Spark Job → Result
  ────────────  延迟：分钟级

流处理（Streaming）：
  ──→ ──→ ──→ ──→ ──→
  ◡   ◡   ◡   ◡   ◡
  │   │   │   │   │
 Spark Streaming / Structured Streaming
  │
  ▼
  实时结果
  延迟：秒级/毫秒级
```

### 8.2 Structured Streaming

```python
# Structured Streaming 示例
from pyspark.sql.functions import window

# 读取 Kafka
df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "user_events") \
    .load()

# 处理
events = df.select(
    from_json(col("value").cast("string"), "user_id string, action string, ts long")
    .alias("data")
).select("data.*")

# 窗口聚合
windowed = events.groupBy(
    window(col("ts").cast("timestamp"), "5 minutes"),
    "action"
).count()

# 输出到 Kafka
query = windowed.writeStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("topic", "user_stats") \
    .option("checkpointLocation", "/tmp/checkpoint") \
    .start()

query.awaitTermination()
```

---

## 九、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **RDD** | Spark 最底层 API，弹性分布式数据集 |
| **DataFrame** | 高级 API，类似 SQL 表 |
| **Transformation** | 转换操作，惰性执行 |
| **Action** | 动作操作，触发计算 |
| **DAG** | 有向无环图，计算依赖关系 |
| **Shuffle** | 数据重分布，最耗性能的操作 |

### Spark vs MapReduce

| 对比 | MapReduce | Spark |
|------|-----------|-------|
| 计算模型 | MR | DAG |
| 内存使用 | 磁盘 | 内存为主 |
| 速度 | 慢 | 快 10-100x |
| API | Java | Java/Python/SQL |
| 容错 | 磁盘 | Lineage |

---

## 下章预告

下一章我们将学习 **Kafka**：消息队列与数据管道，这是构建实时数据平台的关键组件。

> 📚 下一章：[Kafka：消息队列与流数据平台](/coding/BigData/Kafka-消息队列)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
