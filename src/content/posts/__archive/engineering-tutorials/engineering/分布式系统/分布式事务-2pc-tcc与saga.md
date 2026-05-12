---
title: 分布式事务：2PC、TCC 与 Saga
summary: 下一章我们将学习 分布式协调：ZooKeeper 实战，了解分布式系统的协调服务。
publishedAt: '2026-02-26'
track: engineering
topic: 分布式系统
tags: []
featured: false
draft: false
slug: 分布式事务-2pc-tcc与saga
legacyPaths:
  - /coding/分布式系统/分布式事务-2PC-TCC与Saga
---
> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：理解分布式事务的解决方案，掌握常见实现方式

---

## 一、分布式事务问题

### 1.1 什么是分布式事务？

**分布式事务是指：跨多个服务或数据库的操作，如何保证要么全部成功，要么全部失败。**

```
场景：用户下单

本地事务：
┌─────────────────────────────────┐
│ 订单服务                         │
│ BEGIN                           │
│   INSERT INTO orders ...        │
│   UPDATE inventory ...         │
│ COMMIT                          │
└─────────────────────────────────┘
✓ 一次数据库操作，轻松

分布式事务：
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 订单服务     │  │ 库存服务     │  │ 用户服务     │
│ INSERT order │  │ UPDATE stock │  │ UPDATE point│
└─────────────┘  └─────────────┘  └─────────────┘
       │                │               │
       └────────────────┴───────────────┘
                    ？
              如何保证都成功或都失败？
```

### 1.2 分布式事务的挑战

```
分布式事务的难点：

┌─────────────────────────────────────────────────────────────┐
│  1. 网络不可靠                                             │
│     - 调用库存服务成功了                                      │
│     - 调用用户服务时网络超时                                  │
│     - 订单已创建，用户积分未增加                              │
├─────────────────────────────────────────────────────────────┤
│  2. 节点故障                                                │
│     - 服务A成功了                                           │
│     - 服务B在提交前机器宕机                                  │
│     - 数据不一致                                             │
├─────────────────────────────────────────────────────────────┤
│  3. 协调困难                                                │
│     - 谁来发起提交？谁来协调？                                │
│     - 部分成功部分失败怎么办？                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 解决方案一览

```
分布式事务解决方案：

┌─────────────────────────────────────────────────────────────┐
│                     XA 协议族                                │
├─────────────────────────────────────────────────────────────┤
│  2PC (两阶段提交)        │  3PC (三阶段提交)               │
│  - Prepare + Commit     │  - CanCommit + PreCommit +     │
│  - 强一致，可能阻塞      │    Commit                      │
│  - 数据库支持            │  - 减少阻塞                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     TCC 模式                                 │
├─────────────────────────────────────────────────────────────┤
│  Try(预留) → Confirm(确认) → Cancel(取消)                   │
│  - 业务侵入大                                               │
│  - 需要改造接口                                             │
│  - 适合灵活场景                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Saga 模式                                 │
├─────────────────────────────────────────────────────────────┤
│  正向补偿                                                   │
│  - 每个操作有对应的补偿操作                                   │
│  - 失败时逆向执行补偿                                        │
│  - 适合长事务链                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     最终一致性                                │
├─────────────────────────────────────────────────────────────┤
│  消息事务 + 定时任务                                         │
│  - 本地消息表                                               │
│  - 事务消息                                                 │
│  - 可靠消息投递                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、2PC 两阶段提交

### 2.1 基本原理

**两阶段提交分为：准备阶段（Prepare）和提交阶段（Commit）。**

```
2PC 流程：

阶段1：准备阶段（Prepare）
         协调者                    参与者A              参与者B
           │                         │                   │
          ─┼─▶ 预提交(prepare) ─────▶│                   │
          ─┼─────────────────────────▶│                   │
          ─│◀─── 同意(Yes) ──────────│                   │
          ─│◀─────────────────────────│                   │
           │                         │                   │
           │                         │                   │
阶段2：提交阶段(Commit)               │                   │
           │                         │                   │
          ─┼─▶ 提交(commit) ────────▶│                   │
          ─┼─────────────────────────▶│                   │
          ─│◀─── 成功(OK) ───────────│                   │
          ─│◀─────────────────────────│                   │
           │                         │                   │


```

### 2.2 代码实现

```java
// 2PC 协调者
public class TwoPhaseCommitCoordinator {

    private List<Participant> participants = new ArrayList<>();

    // 提交事务
    public boolean commit(Transaction transaction) {
        // 阶段1：准备
        if (!prepare(transaction)) {
            rollback(transaction);
            return false;
        }

        // 阶段2：提交
        return doCommit(transaction);
    }

    // 阶段1：预提交
    private boolean prepare(Transaction transaction) {
        for (Participant participant : participants) {
            try {
                boolean result = participant.prepare(transaction);
                if (!result) {
                    return false;
                }
            } catch (Exception e) {
                return false;
            }
        }
        return true;
    }

    // 阶段2：提交
    private boolean doCommit(Transaction transaction) {
        boolean allSuccess = true;
        for (Participant participant : participants) {
            try {
                participant.commit(transaction);
            } catch (Exception e) {
                // 记录日志，后续处理
                allSuccess = false;
            }
        }
        return allSuccess;
    }

    // 回滚
    private void rollback(Transaction transaction) {
        for (Participant participant : participants) {
            try {
                participant.rollback(transaction);
            } catch (Exception e) {
                // 记录日志
            }
        }
    }
}

// 参与者接口
public interface Participant {
    boolean prepare(Transaction transaction);
    void commit(Transaction transaction);
    void rollback(Transaction transaction);
}
```

### 2.3 2PC 的问题

```
2PC 的缺点：

1. 同步阻塞
   - 阶段1所有节点都阻塞
   - 其他事务无法执行

2. 协调者单点故障
   - 协调者宕机：
     - 参与者等待
     - 事务无法完成

3. 数据不一致
   - 阶段2部分成功部分失败
   - 需要人工介入

4. 协调者超时
   - 协调者收不到响应
   - 无法决定是提交还是回滚
```

---

## 三、TCC (Try-Confirm-Cancel)

### 3.1 TCC 原理

**TCC 把事务分成三个阶段：预留资源、确认执行、取消回滚。**

```
TCC 流程：

        业务服务A                   业务服务B
           │                          │
           │ 1. Try(预留资源)         │
           │◀─────────────────────────│
           │                          │ 冻结库存
           │─────── OK ──────────────▶│
           │                          │
           │ 2. Confirm(确认执行)     │
           │─────────────────────────▶│
           │                          │ 扣减库存
           │─────── OK ──────────────▶│
           │                          │
           │ 3. Cancel(取消回滚)      │
           │◀─────────────────────────│ (如果失败)
           │                          │ 解冻库存
           │─────── OK ──────────────▶│
```

### 3.2 TCC 代码示例

```java
// TCC 转账示例
public class TransferTCCService {

    @Autowired
    private AccountDao accountDao;

    /**
     * Try: 预留资源
     * 冻结转出账户的金额，增加转入账户的预增加金额
     */
    public void tryTransfer(String fromUser, String toUser, long amount) {
        // 冻结转出账户
        accountDao.freezeBalance(fromUser, amount);

        // 预增加转入账户（还没真正增加）
        accountDao.preAddBalance(toUser, amount);
    }

    /**
     * Confirm: 确认执行
     * 真正扣减和增加
     */
    public void confirmTransfer(String fromUser, String toUser, long amount) {
        // 确认扣减冻结金额
        accountDao.confirmDeductFrozen(fromUser, amount);

        // 确认增加余额
        accountDao.confirmAddBalance(toUser, amount);
    }

    /**
     * Cancel: 取消回滚
     * 释放预留的资源
     */
    public void cancelTransfer(String fromUser, String toUser, long amount) {
        // 回滚冻结
        accountDao.unfreezeBalance(fromUser, amount);

        // 回滚预增加
        accountDao.cancelPreAdd(toUser, amount);
    }
}
```

```java
// TCC 协调器
public class TCCCoordinator {

    /**
     * 执行TCC事务
     */
    public void execute(TCCTransaction transaction) {
        String transId = transaction.getId();

        try {
            // 阶段1：Try
            transaction.tryPhase();

            // 阶段2：Confirm
            transaction.confirmPhase();

            // 成功
            transaction.success();

        } catch (Exception e) {
            // 失败：Cancel
            transaction.cancelPhase();
        }
    }
}
```

### 3.3 TCC 的特点

```
TCC 优点：

1. 不阻塞
   - 预留资源阶段不锁定记录
   - 性能较好

2. 可异步
   - Try 可以批量
   - Confirm 可以异步

3. 最终一致
   - 允许短暂不一致
   - 通过补偿保证最终一致

TCC 缺点：

1. 业务侵入大
   - 需要改造成三个接口
   - Try/Confirm/Cancel

2. 空回滚
   - Try 未执行，执行了 Cancel
   - 需要处理

3. 幂等问题
   - Confirm 可能重复执行
   - 需要幂等设计
```

---

## 四、Saga 模式

### 4.1 Saga 原理

**Saga 把长事务拆成多个本地事务，每个事务都有对应的补偿操作。**

```
Saga 执行流程：

服务A ──▶ 服务B ──▶ 服务C ──▶ 服务D
   │         │         │         │
   │成功      │成功     │成功     │成功
   │         │         │         │
   ▼         ▼         ▼         ▼
  完成       完成      完成      完成

失败时补偿：

服务A ──▶ 服务B ──▶ 服务C ──▶ ✗ (失败)
   │         │         │
   │         │    补偿C◀┘
   │    补偿B◀┘
   │◀───────
  全部回滚
```

### 4.2 Saga 代码示例

```java
// Saga 执行器
public class SagaExecutor {

    private List<SagaStep> steps;

    public void execute() {
        List<SagaStep> executedSteps = new ArrayList<>();

        try {
            // 按顺序执行每个步骤
            for (SagaStep step : steps) {
                step.execute();
                executedSteps.add(step);
            }

            // 全部成功
            System.out.println("Saga completed successfully");

        } catch (Exception e) {
            // 失败，执行补偿
            compensate(executedSteps);
            throw new SagaException("Saga failed, compensated", e);
        }
    }

    // 补偿（逆向执行）
    private void compensate(List<SagaStep> executedSteps) {
        // 逆向执行补偿操作
        for (int i = executedSteps.size() - 1; i >= 0; i--) {
            try {
                executedSteps.get(i).compensate();
            } catch (Exception e) {
                // 记录日志，需要人工处理
                log.error("Compensate failed: {}", e.getMessage());
            }
        }
    }
}

// Saga 步骤
public class SagaStep {

    private Runnable executeAction;
    private Runnable compensateAction;

    public SagaStep(Runnable executeAction, Runnable compensateAction) {
        this.executeAction = executeAction;
        this.compensateAction = compensateAction;
    }

    public void execute() {
        executeAction.run();
    }

    public void compensate() {
        compensateAction.run();
    }
}
```

```java
// 使用 Saga 创建订单
public class OrderSaga {

    public void createOrder(Order order) {
        SagaExecutor executor = new SagaExecutor();

        executor.addStep(
            // Step 1: 创建订单
            () -> orderService.create(order),
            // 补偿: 删除订单
            () -> orderService.delete(order.getId())
        );

        executor.addStep(
            // Step 2: 扣减库存
            () -> inventoryService.deduct(order.getItems()),
            // 补偿: 恢复库存
            () -> inventoryService.restore(order.getItems())
        );

        executor.addStep(
            // Step 3: 扣减积分
            () -> pointsService.deduct(order.getUserId(), order.getPoints()),
            // 补偿: 恢复积分
            () -> pointsService.restore(order.getUserId(), order.getPoints())
        );

        executor.execute();
    }
}
```

### 4.3 Saga vs TCC

```
Saga vs TCC 对比：

┌────────────────┬─────────────────┬─────────────────┐
│                │      TCC        │     Saga        │
├────────────────┼─────────────────┼─────────────────┤
│ 复杂性         │ 高（3个接口）   │ 中（2个操作）    │
│ 侵入性         │ 高              │ 中              │
│ 性能           │ 较好            │ 好              │
│ 适用场景       │ 短事务          │ 长事务          │
│ 补偿机制       │ 自动回滚        │ 手动补偿        │
│ 隔离性         │ 较好            │ 较差            │
└────────────────┴─────────────────┴─────────────────┘
```

---

## 五、可靠消息方案

### 5.1 本地消息表

**利用数据库事务 + 消息表实现最终一致。**

```
架构：

┌──────────────┐     ┌──────────────┐
│ 业务数据库   │     │ 消息数据库   │
│              │     │              │
│ orders ──────┼────▶│ message_log  │
│              │     │              │
└──────────────┘     └──────────────┘
       │                    │
       │ (同一事务)         │ (投递消息)
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│ 本地事务     │     │ 消息队列     │
│ 1. 业务操作  │     │ 发送消息     │
│ 2. 记录消息  │────▶│              │
└──────────────┘     └──────────────┘
```

```java
// 本地消息表实现
public class LocalMessageService {

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private MessageDao messageDao;

    // 发送消息（与业务在同一事务）
    public void sendMessageInTransaction(BusinessData data) {
        transactionTemplate.execute(status -> {
            // 1. 执行业务操作
            businessService.doBusiness(data);

            // 2. 记录消息（同一事务）
            MessageEntity message = new MessageEntity();
            message.setId(UUID.randomUUID().toString());
            message.setPayload(JSON.toJSONString(data));
            message.setStatus(MessageStatus.PENDING);
            messageDao.save(message);

            return null;
        });

        // 3. 异步发送消息
        asyncSender.send(message.getId());
    }

    // 消息发送成功更新状态
    public void markAsSent(String messageId) {
        messageDao.updateStatus(messageId, MessageStatus.SENT);
    }

    // 定时扫描重发
    @Scheduled(fixedDelay = 60000)
    public void resendPendingMessages() {
        List<MessageEntity> pending = messageDao.findPendingMessages();
        for (MessageEntity msg : pending) {
            try {
                kafka.send(msg.getPayload());
                markAsSent(msg.getId());
            } catch (Exception e) {
                // 重试
            }
        }
    }
}
```

### 5.2 事务消息

**RocketMQ 提供了事务消息功能。**

```java
// RocketMQ 事务消息
public class TransactionProducer {

    public void sendTransactionMessage(Order order) {
        Message message = new Message(
            "order-topic",
            JSON.toJSONString(order).getBytes()
        );

        // 发送事务消息
        Transaction transaction = producer.sendMessageInTransaction(message, (msg, arg) -> {
            // 本地事务：创建订单
            orderService.create(order);
            return LocalTransactionState.COMMIT_MESSAGE;
        });
    }
}
```

---

## 六、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **2PC** | 两阶段提交，强一致，可能阻塞 |
| **TCC** | 预留-确认-取消，业务侵入大 |
| **Saga** | 正向补偿，适合长事务 |
| **本地消息表** | 可靠消息投递实现 |
| **事务消息** | 消息队列事务支持 |

### 方案选择

```
┌─────────────────────────────────────────────────────────────┐
│                     方案选择建议                              │
├─────────────────────────────────────────────────────────────┤
│ 强一致 → 2PC/3PC（数据库XA）                               │
│ 性能要求高 → TCC                                            │
│ 长事务链 → Saga                                             │
│ 最终一致 → 消息事务                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 下章预告

下一章我们将学习 **分布式协调：ZooKeeper 实战**，了解分布式系统的协调服务。

> 📚 下一章：[分布式协调：ZooKeeper实战](/coding/分布式系统/分布式协调-ZooKeeper实战)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
