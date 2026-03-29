---
title: 分布式计算：MapReduce 与 Spark 入门
summary: 下一章我们将学习 服务治理：限流、熔断与降级，了解如何保护分布式系统。
publishedAt: '2026-02-26'
track: engineering
topic: 分布式系统
tags: []
featured: false
draft: false
slug: 分布式计算-mapreduce与spark入门
legacyPaths:
  - /coding/分布式系统/分布式计算-MapReduce与Spark入门
---
> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：理解分布式计算模型，掌握 MapReduce 和 Spark 的基本原理

---

## 一、为什么需要分布式计算？

### 1.1 单机计算的瓶颈

```java
// 单机计算的问题
public class单机计算问题 {

    // 场景：统计1亿用户的行为数据

    // 问题1：数据太大，内存放不下
    // 1亿条日志 × 1KB = 100GB > 内存

    // 问题2：计算太慢
    // 单核处理1亿条，需要几天

    // 问题3：磁盘IO瓶颈
    // 机械硬盘读取100GB，需要几小时
}
```

### 1.2 分布式计算的思想

**核心思想：把数据和计算都分散到多台机器，并行处理。**

```
单机计算：1台机器处理所有数据
┌─────────────────────────────────┐
│                                 │
│   数据 ──────▶ 处理 ──────▶ 结果 │
│                                 │
└─────────────────────────────────┘

分布式计算：100台机器并行处理
┌────────┐  ┌────────┐  ┌────────┐
│数据1   │  │数据2   │  │数据3   │
│  ──▶   │  │  ──▶   │  │  ──▶   │
│处理1   │  │处理2   │  │处理3   │
└────────┘  └────────┘  └────────┘
      │          │          │
      └──────────┼──────────┘
                 ▼
           合并结果
```

---

## 二、MapReduce 模型

### 2.1 MapReduce 原理

**MapReduce = Map（映射）+ Reduce（归约）**

```
MapReduce 流程：

        输入数据
           │
     ┌─────┴─────┐
     │           │
   Map          Map          Map        ← 并行执行
  (转换)        (转换)        (转换)
     │           │           │
     ▼           ▼           ▼
     ┌───────────┼───────────┐
     │   中间结果（键值对）   │
     └───────────┬───────────┘
                 │
        按Key分组排序
                 │
     ┌─────┬─────┴─────┬─────┐
     │     │           │     │
  Reduce  Reduce      Reduce   ← 归约结果
     │     │           │     │
     └─────┴───────────┴─────┘
           │
           ▼
        最终结果
```

### 2.2 MapReduce 代码示例

```java
// WordCount 示例：统计单词出现次数

// Map 阶段：把文本拆分成单词
public class WordCountMapper extends Mapper<LongWritable, Text, Text, IntWritable> {

    private Text word = new Text();
    private final static IntWritable ONE = new IntWritable(1);

    @Override
    protected void map(LongWritable key, Text value, Context context)
            throws IOException, InterruptedException {

        // 把行文本拆分成单词
        String line = value.toString();
        String[] words = line.split("\\s+");

        for (String w : words) {
            if (w.length() > 0) {
                word.set(w);
                // 输出：(word, 1)
                context.write(word, ONE);
            }
        }
    }
}

// Reduce 阶段：聚合统计
public class WordCountReducer extends Reducer<Text, IntWritable, Text, IntWritable> {

    @Override
    protected void reduce(Text key, Iterable<IntWritable> values, Context context)
            throws IOException, InterruptedException {

        int sum = 0;

        // 累加所有 1
        for (IntWritable value : values) {
            sum += value.get();
        }

        // 输出：(word, count)
        context.write(key, new IntWritable(sum));
    }
}
```

### 2.3 MapReduce 执行流程

```
MapReduce 详细流程：

1. Input（输入）
   原始数据 → InputFormat → Split（分片）

2. Map（映射）
   Split → RecordReader → Map → Partition（分区）

3. Shuffle（洗牌）
   Map输出 → 分区 → 排序 → 合并 → Reduce输入

4. Reduce（归约）
   Reduce输入 → Reduce → OutputFormat → 输出

5. Output（输出）
   结果写入 HDFS
```

### 2.4 MapReduce 的优缺点

```
MapReduce 优点：

1. 简单易用
   - 只需实现 Map 和 Reduce
   - 框架处理分布式细节

2. 扩展性好
   - 增加机器就能提升性能

3. 容错性好
   - 任务失败自动重试
   - 数据副本保证不丢

MapReduce 缺点：

1. 磁盘IO频繁
   - 每个阶段都要写磁盘
   - 不适合迭代计算

2. 延迟高
   - 启动任务开销大
   - 不适合实时计算
```

---

## 三、Spark 入门

### 3.1 为什么需要 Spark？

**Spark 是为了解决 MapReduce 的缺点而诞生的：**

```
MapReduce vs Spark：

┌────────────────┬─────────────────┬─────────────────┐
│                │   MapReduce     │     Spark       │
├────────────────┼─────────────────┼─────────────────┤
│ 中间结果存储    │ 磁盘            │ 内存             │
│ 迭代计算       │ 每次读磁盘      │ 内存迭代         │
│ 延迟           │ 分钟级          │ 毫秒级          │
│ API            │ Java            │ Scala/Python/R  │
│ 数据流         │ 批处理          │ 批+流+机器学习   │
└────────────────┴─────────────────┴─────────────────┘
```

### 3.2 Spark 基本概念

```
Spark 核心概念：

┌─────────────────────────────────────────────────────────────┐
│ RDD (Resilient Distributed Dataset)                         │
│ - 弹性分布式数据集                                          │
│ - 数据分布在多台机器                                        │
│ - 可以并行操作                                              │
├─────────────────────────────────────────────────────────────┤
│ Transformation（转换）                                      │
│ - 惰性执行，不立即计算                                      │
│ - 例：map, filter, flatMap                                 │
├─────────────────────────────────────────────────────────────┤
│ Action（动作）                                              │
│ - 触发实际计算                                              │
│ - 例：collect, count, save                                │
├─────────────────────────────────────────────────────────────┤
│ DAG                                                         │
│ - 调度优化                                                 │
│ - 减少数据传输                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Spark 代码示例

```scala
// Spark WordCount (Scala)
val lines = sc.textFile("hdfs:///input/data.txt")

// Transformation: map + reduceByKey
val wordCounts = lines
  .flatMap(_.split("\\s+"))           // 拆分单词
  .map(word => (word, 1))             // 转为键值对
  .reduceByKey(_ + _)                 // 按Key聚合

// Action: 触发执行
wordCounts.collect().foreach(println)
```

```java
// Spark WordCount (Java)
JavaRDD<String> lines = sc.textFile("hdfs:///input/data.txt");

JavaRDD<String> words = lines.flatMap(line -> Arrays.asList(line.split("\\s+")).iterator());

JavaPairRDD<String, Integer> pairs = words.mapToPair(word -> new Tuple2<>(word, 1));

JavaPairRDD<String, Integer> counts = pairs.reduceByKey((a, b) -> a + b);

// 触发执行
counts.collect().forEach(t -> System.out.println(t._1() + ": " + t._2()));
```

### 3.4 Spark 运行模式

```
Spark 支持多种运行模式：

1. Local 模式
   - 本地单机运行
   - 用于开发和测试

2. Standalone 模式
   - Spark 自带的集群管理器
   - 小规模集群

3. YARN 模式
   - 提交到 Hadoop YARN
   - 共享集群资源

4. Kubernetes 模式
   - 提交到 Kubernetes
   - 云原生部署
```

```bash
# 本地模式运行
spark-submit \
  --class org.example.WordCount \
  --master local[*] \
  myapp.jar

# YARN 集群模式运行
spark-submit \
  --class org.example.WordCount \
  --master yarn \
  --deploy-mode cluster \
  myapp.jar
```

### 3.5 Spark SQL

**Spark SQL 让你可以用 SQL 查询数据。**

```scala
// 创建 DataFrame
val df = spark.read.json("hdfs:///input/users.json")

// SQL 查询
df.createOrReplaceTempView("users")

val result = spark.sql("""
  SELECT name, count(*) as order_count
  FROM users u
  JOIN orders o ON u.id = o.user_id
  GROUP BY name
  ORDER BY order_count DESC
""")

// 输出结果
result.show()
```

---

## 四、MapReduce vs Spark

### 4.1 场景选择

```
┌─────────────────────────────────────────────────────────────┐
│                   场景选择建议                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  批处理，TB级数据        →  MapReduce / Spark               │
│  迭代计算                →  Spark（内存优势）               │
│  实时流处理              →  Spark Streaming / Flink         │
│  SQL 查询                →  Spark SQL / Hive                │
│  机器学习                →  Spark MLlib                     │
│  图计算                  →  GraphX / Giraph                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 性能对比

```
WordCount 性能对比（10TB数据）：

┌────────────────┬─────────────────┬─────────────────┐
│                │   MapReduce     │     Spark       │
├────────────────┼─────────────────┼─────────────────┤
│ 运行时间       │ 25 分钟         │ 5 分钟          │
│ 磁盘写入       │ 每次迭代写磁盘  │ 内存迭代        │
│ 内存使用       │ 低             │ 高              │
└────────────────┴─────────────────┴─────────────────┘
```

---

## 五、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **MapReduce** | 分布式计算模型：Map + Reduce |
| **Spark** | 内存计算框架，比 MapReduce 快 |
| **RDD** | Spark 弹性分布式数据集 |
| **Transformation** | 转换操作，惰性执行 |
| **Action** | 动作操作，触发计算 |
| **Spark SQL** | 用 SQL 查询分布式数据 |

### 选择建议

```
- 简单批处理 → MapReduce
- 迭代计算、实时 → Spark
- SQL 查询 → Spark SQL / Hive
- 流处理 → Spark Streaming / Flink
```

---

## 下章预告

下一章我们将学习 **服务治理：限流、熔断与降级**，了解如何保护分布式系统。

> 📚 下一章：[服务治理-限流熔断与降级](/coding/分布式系统/服务治理-限流熔断与降级)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
