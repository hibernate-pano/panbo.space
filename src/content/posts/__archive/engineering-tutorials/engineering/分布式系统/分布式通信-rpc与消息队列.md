---
title: 分布式通信：RPC 与消息队列
summary: 在分布式系统中，服务部署在多台机器上：
publishedAt: '2026-02-26'
track: engineering
topic: 分布式系统
tags: []
featured: false
draft: false
slug: 分布式通信-rpc与消息队列
legacyPaths:
  - /coding/分布式系统/分布式通信-RPC与消息队列
---
> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：理解分布式系统中服务之间如何通信

---

## 一、分布式通信概述

### 1.1 为什么需要通信？

在分布式系统中，服务部署在多台机器上：

```
分布式系统架构：

  服务A              服务B              服务C
┌─────────┐       ┌─────────┐       ┌─────────┐
│ 机器1   │◀─────▶│ 机器2   │◀─────▶│ 机器3   │
└─────────┘       └─────────┘       └─────────┘
                       │
                       ▼
                 ┌─────────┐
                 │ 数据库   │
                 │ 机器4   │
                 └─────────┘

服务A、B、C 之间需要通信（调用）
```

**通信方式主要分为两种**：
1. **同步通信**：RPC、REST
2. **异步通信**：消息队列

### 1.2 通信方式对比

```
┌─────────────────────────────────────────────────────────────────────┐
│                     通信方式对比                                     │
├────────────────┬────────────────────┬─────────────────────────────┤
│                │  同步调用 (RPC)    │     异步通信 (MQ)           │
├────────────────┼────────────────────┼─────────────────────────────┤
│ 调用方式       │ 请求-响应           │ 发送-无需等待响应            │
│ 延迟           │ 低（毫秒级）        │ 较高（但可削峰填谷）         │
│ 耦合度         │ 高（强依赖）        │ 低（解耦）                  │
│ 可靠性         │ 一般（失败重试）    │ 高（消息持久化）            │
│ 适用场景       │ 实时性要求高        │ 异步处理、流量削峰          │
│ 错误处理       │ 超时/重试          │ 消息重试/死信队列           │
└────────────────┴────────────────────┴─────────────────────────────┘
```

---

## 二、RPC 远程过程调用

### 2.1 什么是 RPC？

**RPC（Remote Procedure Call）就是"像调用本地方法一样调用远程方法"。**

```
本地调用 vs 远程调用：

本地调用：
┌─────────────────────────────────┐
│  Client                        │
│  ┌─────────────────────────┐   │
│  │ userService.getUser(id) │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘

RPC调用：
┌─────────────────────────────────┐
│  Client                        │
│  ┌─────────────────────────┐   │
│  │ userService.getUser(id) │──┼──▶ 网络 ──▶ Server
│  └─────────────────────────┘   │          userService.getUser(id)
└─────────────────────────────────┘

对调用方来说，代码是一样的！
```

### 2.2 RPC 原理

```
RPC 调用流程：

  1. 调用方                    2. 序列化
┌──────────┐                ┌──────────┐
│ 调用方法 │  ───────────▶ │ 对象转   │
│ getUser  │                │ 字节数组 │
└──────────┘                └──────────┘
                                   │
     5. 返回结果            3. 网络传输
┌──────────┐                ┌──────────┐
│ User对象 │◀───────────────│ 发送数据 │
│          │                │ 到服务端 │
└──────────┘                └──────────┘
                                   │
     4. 反序列化          6. 执行服务
┌──────────┐                ┌──────────┐
│ 字节转   │◀───────────────│ 接收请求 │
│ 对象     │                │ 执行方法 │
└──────────┘                └──────────┘
```

**RPC 的核心步骤**：
1. **序列化**：对象 → 字节数组
2. **网络传输**：发送请求到服务端
3. **反序列化**：字节数组 → 对象
4. **执行服务**：调用服务端方法
5. **返回结果**：同样的流程返回

### 2.3 常见 RPC 框架

| 框架 | 语言 | 特点 | 适用场景 |
|------|------|------|----------|
| **gRPC** | 多语言 | 高性能，支持HTTP/2， Protocol Buffers | 跨语言、高性能 |
| **Dubbo** | Java | 功能丰富，国内使用广 | Java生态 |
| **Feign** | Java | 声明式HTTP Client | Spring Cloud |
| **Thrift** | 多语言 | 跨语言，IDL定义 | 跨语言服务 |
| **Spring Remote** | Java | Spring集成 | Spring项目 |

### 2.4 gRPC 实战

**gRPC 使用 Protocol Buffers 作为序列化协议，性能很高。**

```protobuf
// user.proto 定义服务
syntax = "proto3";

package user;

service UserService {
    // 获取用户
    rpc GetUser (GetUserRequest) returns (User);

    // 创建用户
    rpc CreateUser (CreateUserRequest) returns (User);
}

message GetUserRequest {
    string user_id = 1;
}

message CreateUserRequest {
    string name = 1;
    string email = 2;
}

message User {
    string id = 1;
    string name = 2;
    string email = 3;
    int64 created_at = 4;
}
```

```java
// gRPC 服务端实现
public class UserServiceImpl extends UserServiceGrpc.UserServiceImplBase {

    @Override
    public void getUser(GetUserRequest request,
                       StreamObserver<User> responseObserver) {
        String userId = request.getUserId();

        // 查询数据库
        UserEntity entity = userDao.findById(userId);

        // 构建响应
        User user = User.newBuilder()
            .setId(entity.getId())
            .setName(entity.getName())
            .setEmail(entity.getEmail())
            .setCreatedAt(entity.getCreatedAt())
            .build();

        // 返回
        responseObserver.onNext(user);
        responseObserver.onCompleted();
    }
}
```

```java
// gRPC 客户端调用
public class UserClient {

    private final UserServiceGrpc.UserServiceBlockingStub stub;

    public UserClient(Channel channel) {
        this.stub = UserServiceGrpc.newBlockingStub(channel);
    }

    public User getUser(String userId) {
        GetUserRequest request = GetUserRequest.newBuilder()
            .setUserId(userId)
            .build();

        return stub.getUser(request);
    }
}
```

### 2.5 REST vs RPC

```
REST vs RPC 对比：

┌────────────────┬─────────────────┬─────────────────┐
│                │      REST       │      RPC        │
├────────────────┼─────────────────┼─────────────────┤
│ 协议           │ HTTP            │ TCP/HTTP2       │
│ 序列化         │ JSON/XML        │ Protobuf        │
│ 性能           │ 较低            │ 高              │
│ 易用性         │ 简单，浏览器    │ 需要SDK          │
│ 适用场景       │ 外部API         │ 内部服务调用    │
│ 跨语言         │ 天然支持        │ 需要生成代码    │
└────────────────┴─────────────────┴─────────────────┘

建议：
- 对外暴露的API → REST
- 内部服务调用 → RPC
```

---

## 三、消息队列

### 3.1 什么是消息队列？

**消息队列是一种异步通信机制：发送方发消息到队列，不需要等待处理完成就可以返回。**

```
同步调用 vs 消息队列：

同步调用：
  发送方 ──────▶ 接收方 ──────▶ 返回结果
     │              │
     └──────────────┘（等待完成）

消息队列：
  发送方 ──────▶ 队列 ──────▶ 接收方
     │              │              │
     └──────────────┘（不等了）    └────异步处理
```

### 3.2 消息队列的核心概念

```
消息队列架构：

┌─────────┐        ┌─────────────────┐        ┌─────────┐
│ Producer│───────▶│     Topic       │───────▶│ Consumer│
│ 生产者  │        │     (队列)      │        │ 消费者  │
└─────────┘        └─────────────────┘        └─────────┘
                           │
                    ┌──────┴──────┐
                    │  Partition  │
                    │   (分区)     │
                    └─────────────┘
```

| 概念 | 含义 |
|------|------|
| **Producer** | 消息生产者，发送消息 |
| **Consumer** | 消息消费者，处理消息 |
| **Topic** | 消息主题，消息的分类 |
| **Partition** | 分区，提高并发 |
| **Broker** | 消息服务器，存储消息 |

### 3.3 消息队列的优势

```
为什么使用消息队列？

1. 解耦
   - 发送方和接收方不需要直接连接
   - 各自独立开发、部署

2. 异步
   - 发送方不需要等待处理完成
   - 提高系统吞吐量

3. 削峰填谷
   - 流量高峰期，消息堆积在队列
   - 消费者按自己节奏处理

4. 可靠投递
   - 消息持久化，不丢失
   - 支持重试机制
```

### 3.4 Kafka 实战

**Kafka 是目前最流行的分布式消息队列。**

```java
// Kafka 生产者
public class KafkaProducerDemo {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        Producer<String, String> producer = new KafkaProducer<>(props);

        // 发送消息
        for (int i = 0; i < 100; i++) {
            ProducerRecord<String, String> record =
                new ProducerRecord<>("user-events", "user-" + i, "event-" + i);

            // 异步发送
            producer.send(record, (metadata, exception) -> {
                if (exception == null) {
                    System.out.println("Sent: " + record.key());
                } else {
                    exception.printStackTrace();
                }
            });
        }

        producer.close();
    }
}
```

```java
// Kafka 消费者
public class KafkaConsumerDemo {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("group.id", "my-consumer-group");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Arrays.asList("user-events"));

        // 消费消息
        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(100);
            for (ConsumerRecord<String, String> record : records) {
                System.out.printf("topic=%s, partition=%d, offset=%d, key=%s, value=%s%n",
                    record.topic(), record.partition(),
                    record.offset(), record.key(), record.value());
            }
        }
    }
}
```

### 3.5 常见消息队列对比

```
消息队列对比：

┌───────────┬─────────────┬─────────────┬─────────────┐
│           │   Kafka     │  RabbitMQ   │   RocketMQ  │
├───────────┼─────────────┼─────────────┼─────────────┤
│ 性能      │ 最高        │ 高          │ 高          │
│ 吞吐量    │ 百万/秒     │ 万/秒       │ 十万/秒     │
│ 持久化    │ 强          │ 强          │ 强          │
│ 顺序消息  │ 支持        │ 支持        │ 支持        │
│ 事务消息  │ 支持        │ 支持        │ 支持        │
│ 延迟队列  │ 不擅长      │ 擅长        │ 擅长        │
│ 集群      │ 依赖ZooKeeper│ 自带      │ 自带        │
│ 适用      │ 日志、大数据│ 通用场景    │ 金融场景    │
└───────────┴─────────────┴─────────────┴─────────────┘
```

---

## 四、如何选择通信方式？

### 4.1 选择依据

```
通信方式选择决策树：

         需要实时响应吗？
              │
       ┌─────┴─────┐
       │           │
      是          否
       │           │
       ▼           ▼
   RPC调用      消息队列
       │           │
       │      需要高可用吗？
       │           │
       ├─────┬─────┤
       │     │     │
      是    否    是
       │     │     │
       ▼     ▼     ▼
   同步    异步   消息
   写入   通知   队列
```

### 4.2 典型场景

| 场景 | 推荐方式 | 原因 |
|------|----------|------|
| 用户下单 → 库存扣减 | RPC | 需要同步返回结果 |
| 下单成功 → 发送短信 | MQ | 异步处理，不需等待 |
| 订单创建 → 记录日志 | MQ | 可靠性要求高 |
| 用户查询 → 获取详情 | RPC | 需要实时数据 |
| 回调通知 | Webhook + MQ | 异步+可靠 |

---

## 五、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **RPC** | 远程过程调用，像调用本地方法一样调用远程服务 |
| **序列化** | 对象转换为字节序列，用于网络传输 |
| **gRPC** | 高性能RPC框架，使用Protocol Buffers |
| **消息队列** | 异步通信，解耦、削峰 |
| **Kafka** | 高吞吐量分布式消息队列 |
| **Topic** | 消息主题，消息的分类 |

### 选择建议

```
实时性要求高 → RPC (gRPC/Dubbo)
异步处理     → 消息队列 (Kafka)
外部API     → REST API
跨语言      → gRPC / REST
大数据日志  → Kafka
```

---

## 下章预告

下一章我们将学习 **分布式事务：2PC、TCC与Saga**，了解如何保证跨服务操作的一致性。

> 📚 下一章：[分布式事务：2PC、TCC与Saga](/coding/分布式系统/分布式事务-2PC-TCC与Saga)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
