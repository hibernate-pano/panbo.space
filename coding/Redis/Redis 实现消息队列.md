---
title: Redis 实现消息队列：Stream 与 Pub/Sub 对比选型
date: 2026-03-21
description: 详解 Redis Stream 的消费者组、消息 ID、阻塞读取，以及 Pub/Sub 的适用场景与 Redis 消息队列的局限性。
---

# Redis 实现消息队列：Stream 与 Pub/Sub 对比选型

> "Redis 做消息队列——可以用，但要看场景。它不是 Kafka，不能当万能消息中间件。"

## 前言

Redis 实现消息队列有两种方案：

| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **Pub/Sub** | 实时广播、通知 | 简单、低延迟 | 不持久化、不能重放、离线消费者丢失 |
| **Stream** | 可靠队列、任务分发 | 持久化、消费者组、ACK、消息 ID | 不如 Kafka 强大 |

银行里用 Redis 做消息队列的正确姿势：**轻量级异步通知**、**任务队列**、**实时事件广播**，而不是核心交易消息。

## 1. Pub/Sub：实时广播

### 1.1 基础发布订阅

```bash
# 终端1：订阅频道
SUBSCRIBE payment-notifications

# 终端2：发布消息
PUBLISH payment-notifications '{"userId": "123", "amount": 5000}'
```

### 1.2 Java 实现

```java
@Service
@Slf4j
public class NotificationPublisher {
    private final RedisTemplate<String, Object> redis;

    public void publishPaymentNotification(String userId, String message) {
        Map<String, Object> payload = Map.of(
            "userId", userId,
            "message", message,
            "timestamp", System.currentTimeMillis()
        );
        redis.convertAndSend("payment:notifications", payload);
        log.info("通知已发布: userId={}", userId);
    }
}

@Component
@Slf4j
public class NotificationSubscriber
        extends RedisMessageListenerContainer {

    @PostConstruct
    public void init() {
        addListener(
            new ChannelTopic("payment:notifications"),
            (message, pattern) -> {
                Map body = (Map) redisTemplate.getValueSerializer()
                    .deserialize(message.getBody());
                log.info("收到支付通知: {}", body);
                sendPushNotification(body);
            }
        );
    }
}
```

### 1.3 Pub/Sub 的致命缺陷

```
问题：Pub/Sub 是"发射后不管"（fire-and-forget）

生产者在发布消息后：
  - 如果订阅者离线 → 消息丢失 ✅
  - 如果订阅者处理失败 → 消息丢失 ✅
  - 没有消息持久化 → Redis 重启后消息丢失 ✅

结论：Pub/Sub 只适合"丢了也无所谓"的场景
  例如：实时水位监控、股票价格推送、前端热更新
```

## 2. Stream：可靠消息队列

Redis 5.0 引入的 Stream 是专门为消息队列设计的结构，弥补了 Pub/Sub 的缺陷。

### 2.1 基础操作

```bash
# 创建 Stream（消费者组在消费时创建）
XADD mystream * field1 value1 field2 value2
# * 表示让 Redis 自动生成消息 ID（格式：timestamp-sequence）

# 读取新消息
XREAD COUNT 10 STREAMS mystream $

# 读取所有消息
XREAD COUNT 100 STREAMS mystream 0

# 查看 Stream 信息
XINFO STREAM mystream

# 消息长度
XLEN mystream
```

### 2.2 消费者组：竞争消费

消费者组保证每条消息只被一个消费者处理：

```bash
# 创建消费者组（从 Stream 头部开始消费）
XGROUP CREATE mystream payment-group $ MKSTREAM

# 消费者 A 读取消息
XREADGROUP GROUP payment-group CONSUMER consumer-a STREAMS mystream ">"

# 消费者 B 读取消息（竞争获取，不重复）
XREADGROUP GROUP payment-group CONSUMER consumer-b STREAMS mystream ">"

# 手动 ACK 确认
XACK mystream payment-group 1701234567890-0

# 查看待确认消息（Pending）
XPENDING mystream payment-group
```

### 2.3 Java 实现：消费者组

```java
@Service
@Slf4j
public class PaymentEventConsumer {
    private final RedisTemplate<String, String> redis;

    private static final String STREAM = "payment:events";
    private static final String GROUP = "payment-processor-group";
    private static final String CONSUMER = "consumer-" + UUID.randomUUID().toString().substring(0, 8);

    @PostConstruct
    public void init() {
        try {
            redis.opsForStream().createGroup(STREAM, ReadOffset.from("$$"), GROUP);
        } catch (RedisSystemException e) {
            // 组已存在，忽略
            if (!e.getMessage().contains("BUSYGROUP")) throw e;
        }
        // 启动消费循环
        consumeLoop();
    }

    private void consumeLoop() {
        while (true) {
            try {
                // 阻塞读取，最多等 5 秒
                List<MapRecord<String, String, String>> records = redis.opsForStream()
                    .read(Consumer.from(GROUP, CONSUMER),
                          StreamReadOptions.empty().count(10).block(Duration.ofSeconds(5)),
                          StreamOffset.create(STREAM, ReadOffset.last()));

                if (records == null || records.isEmpty()) continue;

                for (MapRecord<String, String, String> record : records) {
                    try {
                        processPaymentEvent(record.getValue());
                        // 手动 ACK
                        redis.opsForStream().acknowledge(STREAM, GROUP, record.getId());
                    } catch (Exception e) {
                        log.error("处理支付事件失败: {}", record.getId(), e);
                        // NACK：重新入队
                        redis.opsForStream().acknowledge(STREAM, GROUP, record.getId(), -1);
                    }
                }
            } catch (Exception e) {
                log.error("消费循环异常", e);
                sleep(1000);
            }
        }
    }

    private void processPaymentEvent(Map<String, String> event) {
        String type = event.get("type");
        log.info("处理事件: type={}", type);
        // 业务逻辑...
    }
}
```

### 2.4 生产者：XADD

```java
public void publishPaymentEvent(String paymentId, String type, BigDecimal amount) {
    String messageId = redis.opsForStream().add(
        StreamRecords.newRecord()
            .in(STREAM)
            .ofMap(Map.of(
                "paymentId", paymentId,
                "type", type,
                "amount", amount.toPlainString(),
                "timestamp", String.valueOf(System.currentTimeMillis())
            ))
    );
    log.info("事件已发布: id={}, paymentId={}", messageId, paymentId);
}
```

## 3. 两种方案对比

| 特性 | Pub/Sub | Stream |
|------|---------|--------|
| 消息持久化 | ❌ 内存 | ✅ Redis 持久化 |
| 消息重放 | ❌ 不支持 | ✅ XREAD 从头读 |
| 消费者组 | ❌ 不支持 | ✅ XREADGROUP |
| 消息 ACK | ❌ 自动 | ✅ 手动 XACK |
| 离线消息 | ❌ 丢失 | ✅ 保存在 Pending 列表 |
| 顺序保证 | ✅ 同一频道 | ✅ 同一 Stream 按 ID |
| 积压监控 | ❌ 无 | ✅ XPENDING + XLEN |
| 消息TTL | ❌ 无 | ✅ XTRIM（自动淘汰） |

## 4. 银行场景选型建议

```
场景选型：

Pub/Sub 适用：
  ✅ 实时通知推送（用户在线时）
  ✅ 跨服务事件广播（多消费者独立消费同一事件）
  ✅ 前端 WebSocket 消息推送
  ✅ 热更新配置推送

Stream 适用：
  ✅ 异步任务队列（支付回调处理、邮件发送）
  ✅ 需要重试的消息处理
  ✅ 需要 ACK 确认的关键流程
  ✅ 任务分发（多 Worker 竞争消费）

Kafka / RabbitMQ 适用：
  ❌ 高吞吐日志收集
  ❌ 事务消息（需严格顺序）
  ❌ 消息回溯（从头消费历史）
```

## 5. 任务队列实战：支付回调处理

```java
@Service
public class PaymentCallbackService {

    // 使用 Stream 作为任务队列
    private static final String TASK_STREAM = "payment:callback:tasks";

    // 接收第三方回调，立即入队（快速响应）
    @PostMapping("/callback")
    public ResponseEntity<?> callback(@RequestBody Map<String, Object> payload) {
        String taskId = enqueueTask(payload);
        return ResponseEntity.ok(Map.of("taskId", taskId, "status", "ACCEPTED"));
    }

    private String enqueueTask(Map<String, Object> payload) {
        return redis.opsForStream().add(StreamRecords.newRecord()
            .in(TASK_STREAM)
            .ofMap(payload));
    }

    // Worker 消费任务
    @Scheduled(fixedDelay = 100)  // 快速轮询
    public void processTasks() {
        List<MapRecord<String, String, String>> tasks = redis.opsForStream()
            .read(Consumer.from("worker-1", "processor"),
                  StreamReadOptions.empty().count(1).block(Duration.ofMillis(500)),
                  StreamOffset.create(TASK_STREAM, ReadOffset.last()));

        for (MapRecord<String, String, String> task : tasks) {
            try {
                processCallback(parsePayload(task.getValue()));
                redis.opsForStream().acknowledge(TASK_STREAM, "processor", task.getId());
            } catch (RetryableException e) {
                // 可重试，放回队列
                redis.opsForStream().acknowledge(TASK_STREAM, "processor", task.getId(), -1);
            }
        }
    }
}
```

## 6. 总结

| 需求 | 选型 |
|------|------|
| 实时通知（用户在线） | Pub/Sub |
| 异步任务队列（有 ACK） | Stream |
| 高可靠消息（Kafka 替代品） | ❌ Redis 不适合，用 RabbitMQ |
| 跨服务事件总线 | Redis Cluster + Pub/Sub（广播） |

Redis 做消息队列的优势是**零运维依赖**、**低延迟**，劣势是**消息堆积能力有限**（内存限制）、**无事务消息**。在银行系统里，它最适合做**轻量级异步任务队列**，核心交易链路仍然需要专业的消息中间件。

---

*相关阅读：[Redis 发布与订阅](/coding/Redis/Redis 发布与订阅) · [Redis Stream 官方文档](https://redis.io/docs/data-types/streams/) · [Kafka 消息队列](/coding/BigData/Kafka-消息队列)*
