# MapReduce：分布式计算原理与实战

> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：理解分布式计算的核心思想，掌握 MapReduce 编程模型

---

## 一、为什么需要分布式计算？

### 1.1 单机计算的困境

想象你要统计一个超大文件的词频：

```java
// 单机处理：读取 100GB 文件，统计词频
public class WordCountSingle {

    public static void main(String[] args) {
        Map<String, Integer> wordCount = new HashMap<>();

        // 读取 100GB 文件
        BufferedReader reader = new BufferedReader(
            new FileReader("/data/huge_log.txt")
        );

        String line;
        while ((line = reader.readLine()) != null) {
            // 分割单词
            String[] words = line.split("\\s+");
            for (String word : words) {
                // 统计
                wordCount.put(word, wordCount.getOrDefault(word, 0) + 1);
            }
        }

        // 问题：
        // 1. 100GB 文件，内存放不下
        // 2. 单机 CPU 跑 太慢（可能需要几天）
        // 3. 如果中间出错，又要重头开始
    }
}
```

### 1.2 MapReduce 的解决思路

MapReduce 的核心思想：**分而治之**

```
                     100GB 文件
                        │
                        ▼
            ┌───────────┴───────────┐
            │      Split 切割        │
            │  64MB/块 = 1600 块    │
            └───────────┬───────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    ┌───────┐      ┌───────┐       ┌───────┐
    │Map 1  │      │Map 2  │  ...  │Map N  │
    │统计词频│      │统计词频│       │统计词频│
    └───┬───┘      └───┬───┘       └───┬───┘
        │              │               │
        ▼              ▼               ▼
    ┌───────┐      ┌───────┐       ┌───────┐
    │Map结果│      │Map结果│       │Map结果│
    │ A:10  │      │ B:5   │       │ A:8   │
    │ B:3   │      │ C:20  │       │ C:15  │
    └───────┘      └───────┘       └───────┘
        │              │               │
        └──────────────┼───────────────┘
                       ▼
            ┌─────────────────────┐
            │    Shuffle 排序     │
            │   相同 key 聚合      │
            └──────────┬──────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼               ▼
    ┌───────┐      ┌───────┐       ┌───────┐
    │Reduce 1│      │Reduce 2│       │Reduce 3│
    │ A:18   │      │ B:8   │       │ C:35   │
    └───────┘      └───────┘       └───────┘
```

---

## 二、MapReduce 编程模型

### 2.1 两个核心阶段

MapReduce = **Map（映射）** + **Reduce（归约）**

```java
// Map 阶段：处理原始数据，提取感兴趣的内容
public class WordCountMapper extends Mapper<LongWritable, Text, Text, IntWritable> {

    @Override
    protected void map(LongWritable key, Text value, Context context)
            throws IOException, InterruptedException {

        // value = 文件中的一行内容
        String line = value.toString();

        // 分割单词
        String[] words = line.split("\\s+");

        // 输出：(word, 1)
        for (String word : words) {
            // 过滤空字符串
            if (word.length() > 0) {
                context.write(new Text(word), new IntWritable(1));
            }
        }
    }
}

// Reduce 阶段：聚合 Map 输出的结果
public class WordCountReducer extends Reducer<Text, IntWritable, Text, IntWritable> {

    @Override
    protected void reduce(Text key, Iterable<IntWritable> values, Context context)
            throws IOException, InterruptedException {

        int sum = 0;

        // values = [1, 1, 1, 1, ...] 相同 key 的所有值
        for (IntWritable value : values) {
            sum += value.get();
        }

        // 输出：(word, count)
        context.write(key, new IntWritable(sum));
    }
}
```

### 2.2 数据流详解

```
输入文件：
    Line1: "hello world"
    Line2: "hello hadoop"
    Line3: "world hello"

Map 阶段（每个 Map 任务处理一个 split）：
    Map1 (Line1): "hello world"
        → ("hello", 1), ("world", 1)
    Map2 (Line2): "hello hadoop"
        → ("hello", 1), ("hadoop", 1)
    Map3 (Line3): "world hello"
        → ("world", 1), ("hello", 1)

Shuffle 阶段（排序 + 分区）：
    ("hello", [1, 1, 1])  → Reduce 1
    ("hadoop", [1])       → Reduce 2
    ("world", [1, 1])    → Reduce 1

Reduce 阶段：
    Reduce1:
        hello: 1+1+1 = 3
        world: 1+1 = 2
    Reduce2:
        hadoop: 1

最终输出：
    hello    3
    hadoop   1
    world    2
```

### 2.3 完整 Job 提交

```java
public class WordCountJob {

    public static void main(String[] args) throws Exception {
        Configuration conf = new Configuration();

        // 创建 Job
        Job job = Job.getInstance(conf, "WordCount");

        // 设置 Job 类
        job.setJarByClass(WordCountJob.class);

        // 设置 Mapper
        job.setMapperClass(WordCountMapper.class);
        job.setMapOutputKeyClass(Text.class);
        job.setMapOutputValueClass(IntWritable.class);

        // 设置 Reducer
        job.setReducerClass(WordCountReducer.class);
        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(IntWritable.class);

        // 设置输入输出路径
        Path inputPath = new Path(args[0]);
        Path outputPath = new Path(args[1]);
        FileInputFormat.addInputPath(job, inputPath);
        FileOutputFormat.setOutputPath(job, outputPath);

        // 提交 Job
        boolean success = job.waitForCompletion(true);

        // 退出
        System.exit(success ? 0 : 1);
    }
}
```

---

## 三、MapReduce 进阶特性

### 3.1 Combiner：本地预聚合

Combiner 是 Map 端的"小 Reduce"：

```
        不使用 Combiner                 使用 Combiner
        ─────────────────────────    ─────────────────────────
Map输出:  (hello,1) × 1000           Map输出: (hello,1000) × 1
          ↓                               ↓
        网络传输                           网络传输
          ↓                               ↓
Reduce:   hello = 1000                 Reduce: hello = 1000
```

```java
// Combiner 示例
public class WordCountCombiner extends Reducer<Text, IntWritable, Text, IntWritable> {

    @Override
    protected void reduce(Text key, Iterable<IntWritable> values, Context context)
            throws IOException, InterruptedException {

        // 和 Reducer 一样的逻辑
        // 在 Map 端先做一次聚合，减少网络传输
        int sum = 0;
        for (IntWritable value : values) {
            sum += value.get();
        }
        context.write(key, new IntWritable(sum));
    }
}

// Job 中设置 Combiner
job.setCombinerClass(WordCountCombiner.class);
```

**注意**：不是所有场景都适合用 Combiner，典型适用场景：
- 求和（Sum）：✅ 适合
- 求平均（Average）：❌ 不适合（需要知道总数）

### 3.2 Partitioner：数据分区

控制 Map 输出到哪个 Reduce：

```java
// 按key首字母分区
public class FirstLetterPartitioner extends Partitioner<Text, IntWritable> {

    @Override
    public int getPartition(Text key, IntWritable value, int numPartitions) {
        char firstChar = key.toString().charAt(0);

        if (firstChar >= 'a' && firstChar <= 'm') {
            return 0; // a-m 去 Reduce 0
        } else {
            return 1; // n-z 去 Reduce 1
        }
    }
}

// Job 中设置 Partitioner
job.setPartitionerClass(FirstLetterPartitioner.class);
```

### 3.3 排序与二次排序

MapReduce 默认按键排序：

```
Shuffle 后的数据（按键排序）：
    (a, 1)
    (a, 2)
    (a, 3)
    (b, 1)
    (b, 2)
    (c, 1)
```

**二次排序**：按键+值一起排序：

```java
// 二次排序示例：统计每个用户的行为次数，并按次数排序
// 输入：(userId, action)
// 输出：(userId, count) 按 count 降序

// 1. 自定义 key，包含 userId 和 count
public class UserActionKey implements WritableComparable<UserActionKey> {

    private String userId;
    private int count;

    // 排序：先按 userId，再按 count 降序
    @Override
    public int compareTo(UserActionKey o) {
        int cmp = this.userId.compareTo(o.userId);
        if (cmp != 0) return cmp;
        return o.count - this.count; // 降序
    }
    // ... 其他方法
}
```

---

## 四、MapReduce 执行流程

### 4.1 完整流程图

```
                    ┌─────────────────┐
                    │   提交 Job      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  JobTracker     │
                    │ (ResourceManager│
                    │  前身)          │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐     ┌────────┐     ┌────────┐
         │Task 1  │     │Task 2  │     │Task 3  │
         │(Map)   │     │(Map)   │     │(Map)   │
         └────┬───┘     └────┬───┘     └────┬───┘
              │              │              │
              ▼              ▼              ▼
         ┌────────┐     ┌────────┐     ┌────────┐
         │Shuffle │     │Shuffle │     │Shuffle │
         └────┬───┘     └────┬───┘     └────┬───┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌─────────────────┐
                    │  Reduce Task    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   输出结果      │
                    └─────────────────┘
```

### 4.2 关键角色

| 角色 | 说明 |
|------|------|
| **JobTracker** | 负责任务调度（旧版），新版已被 YARN 取代 |
| **TaskTracker** | 执行具体任务（旧版） |
| **ApplicationMaster** | 管理单个 Application（YARN） |
| **Container** | 资源容器（CPU + 内存） |

---

## 五、常见 MapReduce 场景

### 5.1 排序

```java
// 全局排序：把 100G 数据按某字段排序

// 1. 设置一个 Reduce
job.setNumReduceTasks(1);

// 2. 确保 Map 输出有序
//    HDFS 数据有序 → Map 输出有序 → Reduce 合并有序
```

### 5.2 连接（Join）

```java
// Map-Side Join：两个大表关联
// 前提：一个小表可以放入内存

// 1. 把小表加载到内存（DistributedCache）
// 2. 在 Map 中直接join

public class MapSideJoinMapper extends Mapper<LongWritable, Text, NullWritable, Text> {

    private Map<String, String> smallTable = new HashMap<>();

    @Override
    protected void setup(Context context) throws IOException {
        // 从 DistributedCache 加载小表
        URI[] files = context.getCacheFiles();
        // 解析小表数据到 smallTable
    }

    @Override
    protected void map(LongWritable key, Text value, Context context) {
        // 从大表读取
        String[] fields = value.toString().split(",");

        // 直接查内存中的小表
        String joinValue = smallTable.get(fields[1]);

        // 输出 join 结果
        context.write(NullWritable.get(), new Text(fields[0] + "," + joinValue));
    }
}
```

### 5.3 计数

```java
// Top K 问题：找出访问量最高的 Top 10 页面

// 思路：
// 1. Map: 统计每个页面的访问量 (pageId, 1)
// 2. Reduce: 聚合 (pageId, sum)
// 3. Job2: 按 sum 排序，取 Top 10
```

---

## 六、本章实战：完整 WordCount

### 6.1 项目结构

```
wordcount/
├── pom.xml
└── src/
    └── main/
        └── java/
            └── com/
                └── bigdata/
                    ├── WordCountMapper.java
                    ├── WordCountReducer.java
                    ├── WordCountCombiner.java
                    └── WordCountJob.java
```

### 6.2 pom.xml

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.bigdata</groupId>
    <artifactId>wordcount</artifactId>
    <version>1.0</version>

    <properties>
        <hadoop.version>3.3.4</hadoop.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.apache.hadoop</groupId>
            <artifactId>hadoop-client</artifactId>
            <version>${hadoop.version}</version>
        </dependency>
    </dependencies>
</project>
```

### 6.3 打包与运行

```bash
# 打包
mvn clean package

# 上传到 HDFS
hdfs dfs -mkdir -p /user/root/input
hdfs dfs -put README.txt /user/root/input/

# 运行
hadoop jar wordcount-1.0.jar \
    com.bigdata.WordCountJob \
    /user/root/input \
    /user/root/output

# 查看结果
hdfs dfs -cat /user/root/output/part-r-00000
```

---

## 七、MapReduce 的局限与进化

### 7.1 MapReduce 的问题

```
❌ 缺点：
├── 磁盘 IO 慢（每轮 MR 都要写磁盘）
├── 延迟高（不适合实时场景）
├── 编程模型复杂（只有 Map + Reduce）
├── 资源利用率低（Job 之间的资源不能共享）
```

### 7.2 进化：Spark

```
Spark 优势：
├── 内存计算（比 MR 快 10-100 倍）
├── DAG 计算模型（更灵活）
├── 支持更多算子（filter, join, groupBy...）
├── 资源利用率高
└── 统一批处理和流处理
```

---

## 八、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **Map** | 提取/转换数据 (K1,V1) → (K2,V2) |
| **Reduce** | 聚合相同 Key 的数据 |
| **Shuffle** | Map 到 Reduce 之间的数据传输和排序 |
| **Combiner** | Map 端本地预聚合，减少网络传输 |
| **Partitioner** | 控制数据分配到哪个 Reduce |

### 为什么 MapReduce 重要？

- **思想核心**：理解分布式计算的基本范式
- **面试必问**：MapReduce 原理是面试重点
- **承上启下**：理解 Hive、Spark 的基础

---

## 下章预告

下一章我们将学习 **YARN**：Hadoop 的资源调度器，理解如何管理集群资源。

> 📚 下一章：[YARN：资源调度与任务管理](YARN-资源调度)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
