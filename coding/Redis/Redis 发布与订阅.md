---
title: Redis 发布与订阅：实时事件广播
date: 2026-03-21
description: 详解 Redis Pub/Sub 的频道订阅、模式订阅、Java 实现，以及其局限性（不持久化、离线丢失）和适用场景。
---

# Redis 发布与订阅：实时事件广播

> "Pub/Sub 是 Redis 的广播站——消息发出去就没了，订阅者在线就收到，不在线就错过了。"

## 前言

Redis 的发布与订阅（Pub/Sub）是**实时消息广播**的经典实现。生产者（Publisher）向频道（Channel）发送消息，订阅者（Subscriber）实时接收。优点是**零延迟、零配置**，缺点是**消息不持久化**，离线订阅者会丢失消息。

在银行系统里，Pub/Sub 适合做**实时通知推送**、**配置热更新**、**跨服务事件广播**，但不适合做可靠消息传递。

## 1. 基础命令

```bash
# 订阅单个频道（订阅后终端会阻塞等待消息）
SUBSCRIBE payment-notifications

# 订阅多个频道
SUBSCRIBE payment-notifications system-alerts

# 按模式订阅（支持通配符 *）
PSUBSCRIBE payment:*     # 订阅所有 payment: 开头的频道
PSUBSCRIBE user:* game:*  # 同时匹配多个模式

# 取消订阅
UNSUBSCRIBE payment-notifications
PUNSUBSCRIBE payment:*

# 发布消息（返回收到消息的订阅者数量）
PUBLISH payment-notifications '{"userId":"123","amount":5000}'
# 回复：1（表示有 1 个订阅者收到）

# 查看活跃频道
PUBSUB CHANNELS           # 所有活跃频道
PUBSUB CHANNELS payment:*  # 过滤 payment: 开头的频道
PUBSUB NUMSUB payment-notifications  # 某频道的订阅者数量
PUBSUB NUMPAT              # 模式订阅总数
```

## 2. 模式订阅详解

模式订阅（Pattern Subscribe）支持 glob 风格通配符：

```bash
# PSUBSCRIBE payment:* 匹配：
#   payment:notifications
#   payment:refund
#   payment:refund:alipay

# * 匹配任意字符
PSUBSCRIBE *              # 匹配所有频道

# ? 匹配单个字符
PSUBSCRIBE payment:???     # 匹配 payment: 后接 3 个字符的频道

# [] 匹配指定字符
PSUBSCRIBE payment:[abc]  # 匹配 payment:a, payment:b, payment:c
```

## 3. Java 实现：Spring Boot 整合

### 3.1 发布者

```java
@Service
@Slf4j
public class EventPublisher {
    private final RedisTemplate<String, Object> redis;

    public void publishPaymentEvent(String userId, String eventType,
                                    Map<String, Object> data) {
        Map<String, Object> message = new HashMap<>();
        message.put("userId", userId);
        message.put("eventType", eventType);
        message.put("data", data);
        message.put("timestamp", System.currentTimeMillis());

        String channel = "payment:" + eventType;
        redis.convertAndSend(channel, message);

        log.info("事件已发布: channel={}, userId={}", channel, userId);
    }

    // 广播系统告警
    public void publishAlert(String level, String message) {
        Map<String, String> alert = Map.of(
            "level", level,
            "message", message,
            "time", Instant.now().toString()
        );
        redis.convertAndSend("system:alerts", alert);
    }
}
```

### 3.2 订阅者：注解驱动方式

```java
@Component
@Slf4j
public class PaymentEventListener {

    // 监听单个频道
    @RedisListener(channels = "payment:success")
    public void onPaymentSuccess(Message message) {
        String body = new String(message.getBody());
        log.info("支付成功事件: {}", body);
        sendPushNotification(body);
    }

    @RedisListener(channels = "payment:failed")
    public void onPaymentFailed(Message message) {
        String body = new String(message.getBody());
        log.warn("支付失败事件: {}", body);
        triggerAlert(body);
    }

    // 模式订阅：监听所有 payment 事件
    @RedisListener(patternChannels = "payment:*")
    public void onAnyPaymentEvent(Message message, ChannelTopic topic) {
        log.info("收到支付事件: channel={}, body={}",
            topic.getTopic(), new String(message.getBody()));
    }

    // 监听系统告警
    @RedisListener(channels = "system:alerts")
    public void onSystemAlert(Message message) {
        log.warn("系统告警: {}", new String(message.getBody()));
    }
}
```

### 3.3 手动订阅容器

```java
@Component
@Slf4j
public class ManualSubscriber {
    private final RedisMessageListenerContainer container;
    private final RedisTemplate<String, Object> redis;

    @PostConstruct
    public void init() {
        // 订阅交易通知频道
        container.addListener(
            new ChannelTopic("trade:notifications"),
            new MessageListener() {
                @Override
                public void onMessage(Message message, byte[] pattern) {
                    String body = new String(message.getBody());
                    String channel = new String(message.getChannel());
                    log.info("收到交易通知: channel={}, body={}", channel, body);
                    processTradeNotification(body);
                }
            }
        );
    }

    @PreDestroy
    public void cleanup() {
        // 清理订阅
        container.removeListener(???);
    }
}
```

## 4. Pub/Sub 的致命缺陷

```
缺陷 1：不持久化
  - 消息存储在订阅者的内存中
  - Redis 重启后消息全部丢失
  - 订阅者重启后需要重新订阅

缺陷 2：离线消息丢失
  - 订阅者断线期间的消息全部丢失
  - 不支持消息回溯
  - 不支持消息重放

缺陷 3：无 ACK 机制
  - 订阅者收到消息后无需确认
  - 无法确认消费者是否处理成功
  - 无法实现可靠传递

缺陷 4：无法积压
  - 消息发出后不管消费者状态
  - 慢消费者导致消息堆积在订阅者内存
  - 不支持背压（backpressure）
```

**结论**：Pub/Sub 只适合"丢了也无所谓"的场景。

## 5. 适用场景 vs 不适用场景

| 场景 | 适用 Pub/Sub？ | 说明 |
|------|--------------|------|
| 实时价格推送（股票行情） | ✅ 适用 | 丢了无所谓，下一秒就有新价格 |
| WebSocket 消息推送 | ✅ 适用 | 用户在线，消息即时送达 |
| 前端热更新通知 | ✅ 适用 | 用户刷新即可获取最新配置 |
| 多人在线游戏事件 | ✅ 适用 | 实时性优先，可容忍小量丢失 |
| 支付回调处理 | ❌ 不适用 | 丢失会造成资金损失，必须持久化 |
| 订单状态同步 | ❌ 不适用 | 需要可靠传递，用 Stream |
| 异步任务队列 | ❌ 不适用 | 需要 ACK 确认，用 Stream |
| 日志收集 | ❌ 不适用 | 需要持久化和批量处理，用 Kafka |

## 6. 银行实战：实时交易通知

```java
@Service
@Slf4j
public class TradingNotificationService {
    private final RedisTemplate<String, Object> redis;
    private final SimpMessagingTemplate wsTemplate;  // WebSocket 模板

    // 交易完成后，发布通知
    public void notifyTrade(String accountId, String symbol,
                            BigDecimal price, int quantity) {
        Map<String, Object> notification = Map.of(
            "type", "TRADE_EXECUTED",
            "accountId", accountId,
            "symbol", symbol,
            "price", price.toPlainString(),
            "quantity", quantity,
            "total", price.multiply(BigDecimal.valueOf(quantity)).toPlainString(),
            "timestamp", System.currentTimeMillis()
        );

        // 1. 发布到 Pub/Sub（实时推送）
        redis.convertAndSend("trade:" + accountId, notification);

        // 2. 同时写入 Stream（持久化，用于历史查询）
        redis.opsForStream().add(StreamRecords.newRecord()
            .in("trade:notifications")
            .ofMap(notification));

        log.info("交易通知已发布: accountId={}, symbol={}", accountId, symbol);
    }
}

// WebSocket 订阅者（独立于 Redis 订阅）
@Component
@Slf4j
public class WebSocketTradeListener {
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public WebSocketTradeListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // 同时监听 Redis 事件
    @Autowired
    private RedisMessageSubscriber redisSubscriber;

    @PostConstruct
    public void init() {
        // 将 Redis 事件转发到 WebSocket
        redisSubscriber.addHandler("trade:*", event -> {
            String accountId = extractAccountId(event);
            String destination = "/queue/trades/" + accountId;
            messagingTemplate.convertAndSend(destination, event);
            log.debug("转发交易事件到 WebSocket: {}", destination);
        });
    }
}
```

## 7. 集群模式下的 Pub/Sub

Redis Cluster 模式下 Pub/Sub 的特殊行为：

```bash
# Cluster 模式下，每个节点独立广播
#PUBLISH 在一个节点执行，只有该节点的订阅者收到

# 解决方案 1：订阅所有主节点（哨兵/集群模式）
#PUBLISH channel message  # 在每个主节点上执行

# 解决方案 2：使用 Redis Sentinel 的 PUBLISH
# SPUBLISH channel message  # 自动在所有节点广播

# 解决方案 3：使用 Redis Cluster 的 Pub/Sub Sharded
# SPUBLISH channel message  # 按 key hash 分片，每个分片一个节点处理
```

```java
// Spring Data Redis 集群模式
@Configuration
public class ClusterPubSubConfig {
    @Bean
    public RedisMessageListenerContainer clusterContainer(
            RedisConnectionFactory factory) {
        RedisMessageListenerContainer container =
            new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        // 集群模式下会自动订阅所有主节点
        return container;
    }
}
```

## 8. 总结对比

| 特性 | Pub/Sub | Stream |
|------|---------|--------|
| 消息持久化 | ❌ | ✅ |
| 消息 ACK | ❌ | ✅ |
| 离线消息 | ❌ 丢失 | ✅ 保存 |
| 消费者组 | ❌ | ✅ |
| 消息重放 | ❌ | ✅ |
| 实时性 | 极高（零延迟） | 高（轮询） |
| 吞吐量 | 高 | 高 |
| 复杂度 | 低 | 中 |

Pub/Sub 是**实时广播的首选**，但**永远不要用它做可靠消息传递**。

---

*相关阅读：[Redis 实现消息队列](/coding/Redis/Redis 实现消息队列) · [Redis Stream 官方文档](https://redis.io/docs/data-types/streams/) · [分布式通信-RPC 与消息队列](/coding/分布式系统/分布式通信-RPC与消息队列)*
