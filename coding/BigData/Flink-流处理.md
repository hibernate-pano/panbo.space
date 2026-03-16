# Flink：流处理引擎

> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：掌握 Flink 流处理核心概念，理解真正的实时计算

---

## 一、为什么需要真正的流处理？

### 1.1 批处理 vs 流处理

```
批处理（Batch）：
  ┌─────────────────────────────────────┐
  │  数据收集 ──▶ 存储 ──▶ 处理 ──▶ 结果  │
  └─────────────────────────────────────┘
  延迟：分钟级 ~ 小时级
  例子：每天凌晨跑一次报表

流处理（Streaming）：
  ┌─────────────────────────────────────┐
  │  数据 ──▶ 处理 ──▶ 结果              │
  └─────────────────────────────────────┘
  延迟：秒级 ~ 毫秒级
  例子：实时风控、实时大屏
```

### 1.2 流处理的应用场景

| 场景 | 需求 | 延迟要求 |
|------|------|----------|
| **实时大屏** | 展示实时关键指标 | 秒级 |
| **实时风控** | 检测异常交易 | 毫秒级 |
| **实时推荐** | 用户行为实时分析 | 秒级 |
| **实时监控** | 系统/业务指标监控 | 秒级 |
| **实时ETL** | 数据实时同步 | 秒级 |

### 1.3 为什么选 Flink？

```
流处理框架对比

特性         Spark Streaming    Flink
────────────────────────────────────────────
计算模型     微批处理           真正流处理
延迟         秒级               毫秒级
容错         Checkpoint        Checkpoint
窗口         固定窗口           滚动/滑动/Session
状态管理     DStream           Managed State
背压         批处理模拟        原生支持
```

---

## 二、Flink 架构

### 2.1 核心组件

```
                    Flink 架构

┌─────────────────────────────────────────────────────────┐
│                     Flink Client                        │
│              (提交 Job, 解析 SQL)                        │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    JobManager                           │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│    │JobMaster    │  │ResourceMgr  │  │Dispatcher   │   │
│    │(任务调度)   │  │(资源管理)   │  │(REST API)   │   │
│    └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    TaskManager                           │
│    ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│    │Slot 1     │ │Slot 2     │ │Slot 3     │           │
│    │(资源槽位) │ │(资源槽位) │ │(资源槽位) │           │
│    └───────────┘ └───────────┘ └───────────┘           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心概念

| 概念 | 说明 |
|------|------|
| **JobManager** | 协调任务执行（类似 MR JobTracker） |
| **TaskManager** | 执行 Task 的工作节点 |
| **Slot** | TaskManager 的资源单位 |
| **Job** | 提交的 Flink 程序 |
| **Task** | 并行执行的处理算子 |
| **Subtask** | Task 的子任务 |
| **Operator** | 数据转换算子 |
| **Source** | 数据源 |
| **Sink** | 数据输出 |

### 2.3 并行度与 Slot

```
并行度 = 3

Source ──▶ FlatMap ──▶ KeyBy ──▶ Window ──▶ Sink
   │          │          │          │          │
  Sub1      Sub1       Sub1       Sub1       Sub1
   │          │          │          │          │
  Sub2      Sub2       Sub2       Sub2       Sub2
   │          │          │          │          │
  Sub3      Sub3       Sub3       Sub3       Sub3

Slot 使用：
- 每个 Subtask 运行在一个 Slot 中
- Slot 数量 = CPU 核心数 * (1-2)
```

---

## 三、Flink DataStream API

### 3.1 基本结构

```java
public class FlinkWordCount {

    public static void main(String[] args) throws Exception {
        // 1. 创建执行环境
        StreamExecutionEnvironment env =
            StreamExecutionEnvironment.getExecutionEnvironment();

        // 2. 数据源
        DataStream<String> text = env
            .socketTextStream("localhost", 9999);

        // 3. 数据处理
        DataStream<WordCount> counts = text
            .flatMap(new FlatMapFunction<String, WordCount>() {
                @Override
                public void flatMap(String value, Collector<WordCount> out) {
                    for (String word : value.split("\\s+")) {
                        out.collect(new WordCount(word, 1));
                    }
                }
            })
            .keyBy("word")
            .sum("count");

        // 4. 输出
        counts.print();

        // 5. 执行
        env.execute("WordCount Streaming Job");
    }

    public static class WordCount {
        public String word;
        public long count;

        public WordCount() {}

        public WordCount(String word, long count) {
            this.word = word;
            this.count = count;
        }
    }
}
```

### 3.2 数据源

```java
// 1. Socket 源
DataStream<String> socketStream = env
    .socketTextStream("localhost", 9999);

// 2. 文件源
DataStream<String> fileStream = env
    .readTextFile("hdfs:///user/data/file.txt");

// 3. Kafka 源
DataStream<String> kafkaStream = env
    .addSource(new FlinkKafkaConsumer<>(
        "user_events",
        new SimpleStringSchema(),
        kafkaProps
    ));

// 4. 自定义源
DataStream<String> customStream = env
    .addSource(new MySourceFunction());
```

### 3.3 数据转换

```java
// map: 1对1转换
DataStream<Integer> mapped = stream
    .map(x -> x * 2);

// flatMap: 1对多
DataStream<String> flatMapped = stream
    .flatMap((value, out) -> {
        for (String s : value.split(",")) {
            out.collect(s);
        }
    });

// filter: 过滤
DataStream<String> filtered = stream
    .filter(s -> s.length() > 5);

// keyBy: 分组
DataStream<WordCount> keyed = stream
    .keyBy("word");

// reduce: 聚合
DataStream<WordCount> reduced = keyed
    .reduce((a, b) -> new WordCount(a.word, a.count + b.count));

// window: 窗口
DataStream<WordCount> windowed = keyed
    .window(TumblingEventTimeWindows.of(Time.seconds(10)))
    .sum("count");
```

---

## 四、时间窗口与水印

### 4.1 窗口类型

```java
// 1. 滚动窗口（Tumbling）
// 数据不重叠
keyed.stream()
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    ...

// 2. 滑动窗口（Sliding）
// 数据有重叠
keyed.stream()
    .window(SlidingEventTimeWindows.of(Time.minutes(10), Time.minutes(5)))
    ...

// 3. 会话窗口（Session）
// 基于间隔
keyed.stream()
    .window(EventTimeSessionWindows.withGap(Time.minutes(10)))
    ...
```

```
滚动窗口示例（5分钟）：

时间: 0-5min  5-10min 10-15min 15-20min
数据: [1,2]   [3,4]    [5,6]     [7,8]

滑动窗口示例（10分钟窗口，5分钟滑动）：

时间: 0-10min  5-15min 10-20min
数据: [1,2,3]  [3,4,5]  [5,6,7]
```

### 4.2 水印（Watermark）

水印用于处理**乱序数据**：

```java
// 水印生成
DataStream<Event> withWatermarks = stream
    .assignTimestampsAndWatermarks(
        WatermarkStrategy
            .<Event>forBoundedOutOfOrderness(Duration.ofSeconds(10))
            .withTimestampAssigner((event, timestamp) -> event.timestamp)
    );

// 说明：
// - 10秒的乱序容忍度
// - watermark = 当前最大时间戳 - 10秒
// - 只有当 watermark >= window_end_time 时，window 才触发
```

```
水印与乱序处理：

数据时间戳: 12, 8, 15, 10, 14, 13, 16
水印(10秒): -, -, -, 2, 5, 5, 6

Window [10, 20) 触发条件: watermark >= 20

数据 12: watermark = 2 (未触发)
数据 15: watermark = 5 (未触发)
数据 16: watermark = 6 (未触发)
...等待更多数据...
```

---

## 五、状态管理与容错

### 5.1 状态类型

```java
// 1. 值状态（Value State）
// 单值状态
public class MyMapper extends RichMapFunction<Event, Result> {
    private ValueState<Long> countState;

    @Override
    public void open(Configuration parameters) {
        countState = getRuntimeContext().getState(
            new ValueStateDescriptor<>("count", Long.class));
    }

    @Override
    public Result map(Event value) throws Exception {
        Long count = countState.value();
        count = count == null ? 0 : count;
        countState.update(count + 1);
        return new Result(value.id, count);
    }
}

// 2. 列表状态（List State）
// 列表状态
ListState<String> listState = getRuntimeContext().getListState(
    new ListStateDescriptor<>("list", String.class));

// 3. 映射状态（Map State）
// Key-Value 状态
MapState<String, Integer> mapState = getRuntimeContext().getMapState(
    new MapStateDescriptor<>("map", String.class, Integer.class));
```

### 5.2 Checkpoint 容错

```java
// 开启 Checkpoint
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
env.enableCheckpointing(60000);  // 每分钟检查点

// 配置
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);
env.getCheckpointConfig().setCheckpointTimeout(600000);
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
env.getCheckpointConfig().setTolerableCheckpointFailureNumber(3);

// 状态后端
env.setStateBackend(new EmbeddedRocksDBStateBackend());
```

---

## 六、Flink SQL

### 6.1 简单示例

```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
StreamTableEnvironment tEnv = StreamTableEnvironment.create(env);

// 注册 Kafka 表
tEnv.executeSql("""
    CREATE TEMPORARY VIEW user_events (
        user_id STRING,
        action STRING,
        amount DOUBLE,
        ts TIMESTAMP(3),
        WATERMARK FOR ts AS ts - INTERVAL '10' SECOND
    ) WITH (
        'connector' = 'kafka',
        'topic' = 'user_events',
        'properties.bootstrap.servers' = 'localhost:9092',
        'properties.group.id' = 'test-group',
        'format' = 'json'
    )
    """);

// SQL 查询
Table result = tEnv.sqlQuery("""
    SELECT
        TUMBLE_START(ts, INTERVAL '1' MINUTE) AS window_start,
        action,
        COUNT(*) AS cnt,
        SUM(amount) AS total_amount
    FROM user_events
    WHERE action IN ('buy', 'cart')
    GROUP BY TUMBLE(ts, INTERVAL '1' MINUTE), action
    """);

// 输出到 Kafka
tEnv.executeSql("""
    CREATE TEMPORARY TABLE kafka_sink (
        window_start TIMESTAMP,
        action STRING,
        cnt BIGINT,
        total_amount DOUBLE
    ) WITH (
        'connector' = 'kafka',
        'topic' = 'user_stats',
        'properties.bootstrap.servers' = 'localhost:9092',
        'format' = 'json'
    )
    """);

result.executeInsert("kafka_sink");
```

### 6.2 常用 SQL 操作

```sql
-- 1. 滚动窗口
SELECT
    TUMBLE_START(ts, INTERVAL '5' MINUTE) AS window_start,
    TUMBLE_END(ts, INTERVAL '5' MINUTE) AS window_end,
    COUNT(*) AS cnt
FROM user_events
GROUP BY TUMBLE(ts, INTERVAL '5' MINUTE);

-- 2. 滑动窗口
SELECT
    HOP_START(ts, INTERVAL '1' MINUTE, INTERVAL '5' MINUTE) AS window_start,
    COUNT(*) AS cnt
FROM user_events
GROUP BY HOP(ts, INTERVAL '1' MINUTE, INTERVAL '5' MINUTE);

-- 3. 会话窗口
SELECT
    SESSION_START(ts, INTERVAL '10' MINUTE) AS window_start,
    COUNT(*) AS cnt
FROM user_events
GROUP BY SESSION(ts, INTERVAL '10' MINUTE);

-- 4. 双流 Join
SELECT
    o.order_id,
    o.amount,
    p.payment_time,
    p.status
FROM orders AS o
JOIN payments AS p
    ON o.order_id = p.order_id
    AND p.psize - osize <= INTERVAL '5' MINUTE;
```

---

## 七、本章实战：实时风控系统

### 7.1 场景

实时检测异常交易：
- 1分钟内同一用户交易超过 5 次
- 单笔金额超过 10000
- 连续 3 次密码错误

### 7.2 代码实现

```java
public class RealTimeRiskControl {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.enableCheckpointing(30000);
        env.setParallelism(4);

        StreamTableEnvironment tEnv = StreamTableEnvironment.create(env);

        // 1. 注册 Kafka 源
        tEnv.executeSql("""
            CREATE TEMPORARY VIEW transactions (
                transaction_id STRING,
                user_id STRING,
                amount DOUBLE,
                merchant_id STRING,
                ts TIMESTAMP(3),
                WATERMARK FOR ts AS ts - INTERVAL '5' SECOND
            ) WITH (
                'connector' = 'kafka',
                'topic' = 'transactions',
                'properties.bootstrap.servers' = 'localhost:9092',
                'properties.group.id' = 'risk-control',
                'format' = 'json'
            )
            """);

        // 2. 规则1: 1分钟内同一用户交易超过 5 次
        Table rule1 = tEnv.sqlQuery("""
            SELECT
                window_start,
                user_id,
                cnt,
                'HIGH_FREQUENCY' AS risk_type
            FROM (
                SELECT
                    TUMBLE_START(ts, INTERVAL '1' MINUTE) AS window_start,
                    user_id,
                    COUNT(*) AS cnt
                FROM transactions
                GROUP BY TUMBLE(ts, INTERVAL '1' MINUTE), user_id
            )
            WHERE cnt > 5
            """);

        // 3. 规则2: 单笔金额超过 10000
        Table rule2 = tEnv.sqlQuery("""
            SELECT
                HOP_START(ts, INTERVAL '1' MINUTE, INTERVAL '5' MINUTE) AS window_start,
                transaction_id,
                user_id,
                amount,
                'HIGH_AMOUNT' AS risk_type
            FROM transactions
            WHERE amount > 10000
            """);

        // 4. 规则3: 连续大额（3分钟内消费3次且总额>20000）
        Table rule3 = tEnv.sqlQuery("""
            SELECT
                window_start,
                user_id,
                SUM(amount) AS total_amount,
                'CONSECUTIVE_HIGH' AS risk_type
            FROM (
                SELECT
                    SESSION_START(ts, INTERVAL '3' MINUTE) AS window_start,
                    user_id,
                    amount
                FROM transactions
                WHERE amount > 5000
            )
            GROUP BY window_start, user_id
            HAVING SUM(amount) > 20000 AND COUNT(*) >= 3
            """);

        // 5. 合并所有风险事件
        Table allRisks = rule1.unionAll(rule2).unionAll(rule3);

        // 6. 输出到告警系统
        tEnv.executeSql("""
            CREATE TEMPORARY TABLE alerts (
                window_start TIMESTAMP,
                user_id STRING,
                risk_type STRING,
                details STRING,
                ts TIMESTAMP(3)
            ) WITH (
                'connector' = 'kafka',
                'topic' = 'risk_alerts',
                'properties.bootstrap.servers' = 'localhost:9092',
                'format' = 'json'
            )
            """);

        allRisks.executeInsert("alerts");

        env.execute("Real-time Risk Control");
    }
}
```

---

## 八、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **流处理** | 实时处理无界数据流 |
| **时间语义** | Event Time vs Processing Time |
| **窗口** | 滚动/滑动/会话窗口 |
| **水印** | 处理乱序数据的机制 |
| **状态** | Flink 强大的状态管理 |
| **Checkpoint** | 容错机制 |
| **Flink SQL** | 流式 SQL，简化开发 |

### Flink vs Spark Streaming

| 对比 | Spark Streaming | Flink |
|------|-----------------|-------|
| 计算模型 | 微批处理 | 真正流处理 |
| 延迟 | 秒级 | 毫秒级 |
| 窗口 | 固定窗口 | 丰富窗口 |
| 状态管理 | DStream | Managed State |
| SQL 支持 | Spark SQL | Flink SQL |
| 生态 | Spark 生态 | 独立生态 |

---

## 下章预告

最后一章，我们将通过一个**实战项目**：用户行为数据处理与分析平台，把所有学过的技术串起来。

> 📚 下一章：[实战项目：用户行为数据处理与分析平台](实战项目-用户行为分析平台)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
