# Kafka：消息队列与流数据平台

> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：掌握 Kafka 核心概念，理解消息队列与数据管道原理

---

## 一、为什么需要消息队列？

### 1.1 直接调用的困境

```
系统 A ────────▶ 系统 B

问题：
├── A 和 B 强耦合（改 B 可能影响 A）
├── A 需要等 B 完成后才能返回
├── B 挂了，A 也跟着挂
├── 流量高峰时，B 扛不住
└── 难以追踪数据流向
```

### 1.2 消息队列的解决

```
系统 A ────────▶ [ Kafka ] ────────▶ 系统 B

优势：
├── 解耦：A 和 B 不直接通信
├── 异步：A 发送消息后可立即返回
├── 削峰：消息积压，高峰期后处理
├── 缓冲：平衡生产者和消费者速度
└── 可追溯：消息可追溯、可重放
```

---

## 二、Kafka 核心概念

### 2.1 基本架构

```
                    Kafka 架构

┌─────────────────────────────────────────────────────────┐
│                    Kafka Cluster                         │
│                                                          │
│    ┌─────────────────────────────────────────────┐       │
│    │            Topic: order_events              │       │
│    │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │       │
│    │  │ P0  │ │ P1  │ │ P2  │ │ P3  │          │       │
│    │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘          │       │
│    │     │       │       │       │              │       │
│    │  ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐        │       │
│    │  │ R0  │ │ R1  │ │ R2  │ │ R0  │        │       │
│    │  │ /R1 │ │ /R2 │ │ /R0 │ │ /R1 │        │       │
│    │  └─────┘ └─────┘ └─────┘ └─────┘        │       │
│    └─────────────────────────────────────────────┘       │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ▲                 ▲
         │                 │
   Producer           Consumer
   (生产者)           (消费者)
```

### 2.2 核心术语

| 概念 | 说明 |
|------|------|
| **Topic** | 主题，消息的分类（类似数据库的表） |
| **Partition** | 分区，Topic 物理上的分片 |
| **Replica** | 副本，分区的多副本保证高可用 |
| **Producer** | 生产者，向 Topic 发送消息 |
| **Consumer** | 消费者，从 Topic 读取消息 |
| **Consumer Group** | 消费组，多消费者协同消费 |
| **Broker** | Kafka 服务节点 |
| **Offset** | 消息在分区中的位置 |
| **Leader / Follower** | 分区的主副本/从副本 |

### 2.3 Topic 与 Partition

```
Topic: user_events (3 个 Partition)

Partition 0: [msg0, msg3, msg6, msg9, ...]
Partition 1: [msg1, msg4, msg7, msg10, ...]
Partition 2: [msg2, msg5, msg8, msg11, ...]

消息分配策略：
- 默认：Round-robin（轮询）
- Key 分区：相同 Key → 相同 Partition
```

---

## 三、Kafka Java 开发

### 3.1 Producer 开发

```java
import org.apache.kafka.clients.producer.*;

import java.util.Properties;

public class KafkaProducerDemo {

    public static void main(String[] args) {
        // 1. 配置
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("acks", "all");                    // 所有副本确认
        props.put("retries", 3);                      // 重试次数
        props.put("batch.size", 16384);               // 批量大小
        props.put("linger.ms", 1);                    // 等待时间
        props.put("buffer.memory", 33554432);         // 缓冲区大小

        // 序列化
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        // 2. 创建 Producer
        KafkaProducer<String, String> producer = new KafkaProducer<>(props);

        // 3. 发送消息
        try {
            for (int i = 0; i < 100; i++) {
                String key = "key-" + i;
                String value = "message-" + i;

                // 异步发送
                ProducerRecord<String, String> record =
                    new ProducerRecord<>("user_events", key, value);

                // 回调
                producer.send(record, (metadata, exception) -> {
                    if (exception != null) {
                        System.out.println("发送失败: " + exception.getMessage());
                    } else {
                        System.out.println("发送成功: " +
                            metadata.topic() + "-" +
                            metadata.partition() + "-" +
                            metadata.offset());
                    }
                });
            }
        } finally {
            // 4. 关闭
            producer.close();
        }
    }
}
```

### 3.2 Consumer 开发

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;

import java.util.*;

public class KafkaConsumerDemo {

    public static void main(String[] args) {
        // 1. 配置
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("group.id", "my-consumer-group");
        props.put("enable.auto.commit", "true");          // 自动提交
        props.put("auto.commit.interval.ms", "1000");
        props.put("auto.offset.reset", "earliest");        // 从最早开始消费

        // 反序列化
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        // 2. 创建 Consumer
        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);

        // 3. 订阅 Topic
        consumer.subscribe(Arrays.asList("user_events", "order_events"));

        // 4. 消费消息
        try {
            while (true) {
                // 拉取消息（设置超时）
                ConsumerRecords<String, String> records = consumer.poll(100);

                for (ConsumerRecord<String, String> record : records) {
                    System.out.println(
                        "Topic: " + record.topic() +
                        ", Partition: " + record.partition() +
                        ", Offset: " + record.offset() +
                        ", Key: " + record.key() +
                        ", Value: " + record.value()
                    );
                }
            }
        } finally {
            consumer.close();
        }
    }
}
```

### 3.3 Spring Boot 集成

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
      acks: all
      retries: 3
    consumer:
      group-id: my-app
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      enable-auto-commit: true
```

```java
// Producer
@RestController
public class OrderController {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @PostMapping("/order")
    public ResponseEntity<?> createOrder(@RequestBody Order order) {
        String message = JSON.toJSONString(order);
        kafkaTemplate.send("order_events", order.getId(), message);
        return ResponseEntity.ok().build();
    }
}

// Consumer
@Service
public class OrderConsumer {

    @KafkaListener(topics = "order_events", groupId = "order-processor")
    public void consume(ConsumerRecord<String, String> record) {
        Order order = JSON.parseObject(record.value(), Order.class);
        // 处理订单
    }
}
```

---

## 四、Kafka 高可用与可靠性

### 4.1 副本机制

```
Partition: order_events-P0 (3 副本)

Leader: Broker 1      (处理读写请求)
Follower: Broker 2   (同步数据)
Follower: Broker 3   (同步数据)

ISR (In-Sync Replicas):
  [Broker 1, Broker 2, Broker 3]  (全部同步)
  如果 Broker 2 落后太多，会从 ISR 移除
```

### 4.2 可靠性配置

```java
// Producer 可靠性配置
Properties props = new Properties();
props.put("acks", "all");           // 所有 ISR 确认
props.put("min.insync.replicas", 2);  // 最少 2 个副本
props.put("retries", 3);            // 重试 3 次
props.put("enable.idempotence", true); // 幂等性
```

```
acks 配置对比：

acks=0:     不等待确认，速度最快，丢数据风险高
acks=1:     Leader 确认就返回，平衡性能与可靠性
acks=all:   所有 ISR 确认，可靠性最高，延迟最高
```

### 4.3 Consumer 可靠性

```java
// 手动提交偏移量（更可靠）
props.put("enable.auto.commit", "false");

// 消费逻辑
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(100);

    for (ConsumerRecord<String, String> record : records) {
        // 处理消息
        processMessage(record);

        // 处理成功后手动提交
        consumer.commitSync();
    }
}
```

---

## 五、Kafka Stream：流处理

### 5.1 什么是 Kafka Streams？

Kafka Streams 是 Kafka 内置的轻量级流处理库：

```
Kafka Streams 特点：
├── 简单：只需要编写 Java 代码
├── 轻量：不需要额外集群
├── 集成：与 Kafka 无缝集成
├── Exactly-once：精确一次处理
└── 水平扩展：支持多分区处理
```

### 5.2 示例代码

```java
// WordCount 流处理
public class WordCountStream {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "wordcount-app");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        StreamsBuilder builder = new StreamsBuilder();

        // 1. 从 topic 读取
        KStream<String, String> source = builder.stream("text-lines");

        // 2. 分割单词
        KStream<String, String> words = source
            .flatMapValues(value -> Arrays.asList(value.split("\\W+")));

        // 3. 转换 Key-Value
        KTable<String, Long> counts = words
            .groupBy((key, word) -> word)
            .count(Materialized.as("counts-store"));

        // 4. 输出到新 Topic
        counts.toStream().to("wordcounts", Produced.with(Serdes.String(), Serdes.Long()));

        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
    }
}
```

---

## 六、Kafka 与大数据生态

### 6.1 经典数据 Pipeline

```
数据流向：

Web/Mobile ──▶ [Kafka] ──▶ [Spark Streaming] ──▶ [HDFS/Hive]
                            │
                            └──▶ [Kafka] ──▶ [Flink] ──▶ [实时大屏]

或者：

日志 ──▶ [Flume] ──▶ [Kafka] ──▶ [HDFS]
                  │
                  └──▶ [Kafka] ──▶ [Flink] ──▶ [MySQL]
```

### 6.2 Kafka Connect

Kafka Connect 是 Kafka 的数据集成框架：

```json
// MySQL Source Connector 配置
{
  "name": "mysql-source",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:mysql://localhost:3306/mydb",
    "connection.user": "root",
    "connection.password": "password",
    "topic.prefix": "mysql-",
    "table.whitelist": "orders,users",
    "mode": "incrementing",
    "incrementing.column.name": "id"
  }
}
```

---

## 七、Kafka 性能调优

### 7.1 Producer 调优

```java
// 批量发送
props.put("batch.size", 32768);       // 32KB
props.put("linger.ms", 10);            // 等待 10ms 凑批

// 压缩
props.put("compression.type", "lz4");  // lz4 压缩

// 缓冲区
props.put("buffer.memory", 67108864);  // 64MB
```

### 7.2 Consumer 调优

```java
// 批量拉取
props.put("fetch.min.bytes", 1024);    // 最小拉取 1KB
props.put("max.poll.records", 500);   // 每次最多 500 条
props.put("max.poll.interval.ms", 300000);  // 处理超时 5 分钟
```

### 7.3 分区数设置

```bash
# 分区数 = max(生产者并行度, 消费者并行度)

# 经验公式
分区数 = 目标吞吐量 / 单分区吞吐量

# 示例：
# 目标吞吐量: 100 MB/s
# 单分区吞吐量: 10 MB/s
# 分区数 = 100 / 10 = 10

# 增加分区数
kafka-topics.sh --alter --topic my-topic --partitions 20 --bootstrap-servers localhost:9092
```

---

## 八、本章实战：实时数据管道

### 8.1 场景

构建用户行为数据管道：
1. App 产生行为日志 → Kafka
2. Spark Streaming 消费 → 实时统计
3. 结果写入 Redis/HBase

### 8.2 代码实现

```java
// Spark Streaming 消费 Kafka
public class UserBehaviorAnalytics {

    public static void main(String[] args) throws Exception {
        SparkConf conf = new SparkConf()
            .setAppName("UserBehaviorAnalytics")
            .setMaster("local[*]");

        JavaStreamingContext ssc = new JavaStreamingContext(
            conf, Durations.seconds(10));

        // 消费 Kafka
        JavaPairInputDStream<String, String> stream = KafkaUtils.createDirectStream(
            ssc,
            String.class,
            String.class,
            StringDeserializer.class,
            StringDeserializer.class,
            kafkaParams,
            topics
        );

        // 解析 JSON
        JavaDStream<UserEvent> events = stream
            .map(record -> JSON.parseObject(record._2, UserEvent.class));

        // 实时统计：每 10 秒的 UV/PV
        JavaPairDStream<String, Integer> stats = events
            .mapToPair(event -> new Tuple2<>(event.getUserId(), 1))
            .reduceByKey((a, b) -> a + b);

        // 输出到 Redis
        stats.foreachRDD((rdd, time) -> {
            if (!rdd.isEmpty()) {
                rdd.collect().forEach(tuple -> {
                    jedis.incr("uv:" + time.toString());
                    jedis.incr("pv:" + time.toString());
                });
            }
        });

        // 窗口统计：最近 1 小时
        JavaPairDStream<String, Long> windowStats = events
            .window(Durations.hours(1), Durations.seconds(10))
            .mapToPair(event -> new Tuple2<>(event.getAction(), 1L))
            .reduceByKey((a, b) -> a + b);

        windowStats.print();

        ssc.start();
        ssc.awaitTermination();
    }
}
```

---

## 九、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **Topic** | 消息主题，类似数据库表 |
| **Partition** | 分区，物理上的分片 |
| **Producer** | 生产者，发送消息 |
| **Consumer** | 消费者，读取消息 |
| **Offset** | 消息位置 |
| **ISR** | 同步副本，保证可靠性 |

### 为什么 Kafka 重要？

- **消息队列**：解耦、异步、削峰
- **数据管道**：连接各个大数据组件
- **流处理基础**：实时数据处理的入口
- **高吞吐**：单机可达百万条/秒

---

## 下章预告

下一章我们将学习 **Flink**：真正的流处理引擎，了解真正的实时计算。

> 📚 下一章：[Flink：流处理引擎](/coding/BigData/Flink-流处理)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
