---
title: Seata 分布式事务实战：AT 模式与 TCC 模式银行选型
summary: 从 Seata AT 模式的自动回滚，到 TCC 模式的资源预留，详解银行微服务分布式事务的完整落地实践与性能权衡。
publishedAt: 'Sun Mar 22 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-22'
track: engineering
topic: 分布式系统
tags: []
featured: false
draft: false
slug: seata分布式事务实战-at模式与tcc模式选型
legacyPaths:
  - /coding/分布式系统/Seata分布式事务实战-AT模式与TCC模式选型
---
> "在银行微服务架构里，一次跨服务的转账操作需要同时扣减两个账户的余额。如果服务 A 扣减成功，服务 B 因网络超时失败，用户的资金就凭空消失了。Seata 是解决这类问题的工业级方案。"

## 前言

在[分布式事务与 Saga 模式实战](/coding/分布式系统/分布式事务与Saga模式实战)中，我们讨论了 Saga 模式的核心思想。本文聚焦 Seata（Simple Extensible Autonomous Transaction Architecture）这一分布式事务框架在银行生产环境中的具体落地。

银行分布式事务的典型场景：
- **跨行转账**：本行账户 A 扣减 → 他行账户 B 增加（涉及多个数据库）
- **支付下单**：库存服务扣减 → 订单服务创建 → 账户服务预授权
- **日终清算**：批量交易对账 → 差异处理 → 账务调整

## 1. Seata 架构：TC + TM + RM

```
Seata 的核心角色：

┌─────────────────────────────────────────────────────┐
│                    Application (TM)                      │
│  @GlobalTransactional                                │
│  Seata 的全局事务管理器（Transaction Manager）           │
│                                                       │
│     TM: 开启全局事务、发起分支注册/回滚/提交             │
│         ↓                                             │
│         ├──────────────────────┐                      │
│         │                      │                       │
│         ▼                      ▼                       │
│  ┌────────────┐        ┌────────────┐               │
│  │  Account   │        │  Inventory │               │
│  │  Service   │        │  Service   │               │
│  │   (RM)     │        │   (RM)     │               │
│  │            │        │            │               │
│  │ @Transactional │     │ @Transactional │            │
│  └─────┬──────┘        └─────┬──────┘               │
│        │                      │                       │
│        │   ┌──────────────────┘                       │
│        │   │ TC（Transaction Coordinator）           │
│        ▼   ▼                                          │
│  ┌─────────────────────────────────────┐            │
│  │   Seata Server（TC）                 │            │
│  │   TC: 管理全局事务状态、驱动分支回滚     │            │
│  │   存储模式：DB（生产）/ File / Redis  │            │
│  └─────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘

全局事务（Global Transaction）：
  由 TM 开启，TC 协调，所有分支（Branch Transaction）共同参与
  分支状态：Registered → Committed / Rolled Back
```

## 2. AT 模式：自动补偿（推荐）

AT 模式是 Seata 最易用的模式——**业务代码零侵入**，Seata 自动生成反向 SQL 完成回滚。

### 2.1 原理

```
执行阶段：
  UPDATE account SET balance = balance - 100 WHERE id = 1;
  → Seata 自动记录"前置镜像"（修改前的数据快照）

回滚阶段：
  Seata 读取前置镜像，执行反向 SQL：
  UPDATE account SET balance = balance + 100 WHERE id = 1;
  → 数据恢复到执行前的状态
```

### 2.2 依赖与配置

```xml
<dependency>
    <groupId>io.seata</groupId>
    <artifactId>seata-spring-boot-starter</artifactId>
    <version>1.7.1</version>
</dependency>
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
</dependency>
```

```yaml
# application.yml
seata:
  enabled: true
  application-id: payment-service
  tx-service-group: mybank_tx_group

  # TC 服务地址（Seata Server）
  config:
    type: nacos
    nacos:
      namespace: ${NACOS_NAMESPACE:seata}
      server-addr: ${NACOS_ADDR:localhost:8848}
      group: SEATA_GROUP
      data-id: seataServerAddr

  # 注册中心（向 Nacos 注册自己）
  registry:
    type: nacos
    nacos:
      application: seata-server
      server-addr: ${NACOS_ADDR:localhost:8848}
      group: SEATA_GROUP
      namespace: ${NACOS_NAMESPACE:seata}

  # 序列化
  serializer:
    type: protobuf

  # undo_log 表自动创建
  client:
    undo:
      log-table: undo_log
      data-validation: true  # 开启数据校验
```

```sql
-- 必须在每个参与全局事务的数据库中创建 undo_log 表
CREATE TABLE IF NOT EXISTS `undo_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` bigint NOT NULL,
  `xid` varchar(100) NOT NULL,
  `context` varchar(128) NOT NULL,
  `rollback_info` longblob NOT NULL,
  `log_status` int NOT NULL,
  `log_created` datetime NOT NULL,
  `log_modified` datetime NOT NULL,
  UNIQUE KEY `ux_undo_log` (`xid`,`branch_id`),
  KEY `ix_log_created` (`log_created`),
  KEY `ix_log_modified` (`log_modified`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;
```

### 2.3 业务代码（零侵入）

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final AccountMapper accountMapper;

    // ✅ 一行注解，开启全局事务
    @GlobalTransactional(
        name = "transfer-global",
        timeoutMills = 30000,       // 全局事务超时 30 秒
        rollbackFor = Exception.class  // 任何异常都回滚
    )
    public void transfer(String fromAccount, String toAccount,
                        BigDecimal amount) {
        log.info("开始转账: from={}, to={}, amount={}",
            fromAccount, toAccount, amount);

        // AT 模式：普通 UPDATE 语句，Seata 自动生成反向 SQL
        // 前置镜像：id=1 的原 balance
        // 后置镜像：id=1 的新 balance
        int rows = accountMapper.debit(fromAccount, amount);
        if (rows == 0) {
            throw new InsufficientBalanceException("余额不足");
        }

        // 如果这里抛异常，Seata TC 会自动驱动回滚
        // 执行反向 SQL：UPDATE SET balance = balance + amount WHERE id = ?

        accountMapper.credit(toAccount, amount);

        log.info("转账完成");
    }
}

@Mapper
public interface AccountMapper {

    @Update("UPDATE account SET balance = balance - #{amount} " +
            "WHERE account_no = #{accountNo} AND balance >= #{amount}")
    int debit(@Param("accountNo") String accountNo,
             @Param("amount") BigDecimal amount);

    @Update("UPDATE account SET balance = balance + #{amount} " +
            "WHERE account_no = #{accountNo}")
    int credit(@Param("accountNo") String accountNo,
               @Param("amount") BigDecimal amount);
}
```

### 2.4 Seata Server 部署

```yaml
# docker-compose-seata.yaml
version: '3.8'
services:
  seata-server:
    image: seataio/seata-server:1.7.1
    container_name: seata-server
    ports:
      - "8091:8091"
    environment:
      - STORE_MODE=db
      - SEATA_CONFIG_NAME=file:/root/seata-config/registry
      - SEATA_CONFIG_TYPE=nacos
      - NACOS_SERVER_ADDR=nacos.internal
      - NACOS_NAMESPACE=seata
      - NACOS_GROUP=SEATA_GROUP
    volumes:
      - ./config/:/root/seata-config/
    healthcheck:
      test: ["CMD", "curl", "-L", "http://localhost:8091/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

```yaml
# config/registry.yaml
seata:
  server:
    vgroupMapping:
      mybank_tx_group: default  # 事务分组 → TC 集群名
    enableDegrade: false
    recovery:
      committingRetryPeriod: 1000
      asynCommittingRetryPeriod: 1000
      rollbackingRetryPeriod: 1000
      timeoutRetryPeriod: 1000
    undo:
      logSaveDays: 7
      logDeletePeriod: 604800000

  config:
    type: nacos
  registry:
    type: nacos
```

## 3. TCC 模式：资源预留

AT 模式不适用于所有场景：
- **跨数据库/跨服务**：AT 需要 Seata 代理数据库（MySQL/PostgreSQL/Oracle 等）
- **非关系型存储**：Redis、MongoDB、第三方支付网关
- **强一致性场景**：AT 模式的"反向 SQL 回滚"在极端情况下有数据不一致风险

TCC 模式是这些场景的解决方案：**两阶段提交，由业务代码控制回滚**。

```
TCC 三阶段：

Try（预留）→ Confirm（确认）→ Cancel（取消）

示例：跨行转账
  Try（本行）：
    冻结用户余额 100 元（balance_hold += 100, balance -= 100）
    记录 TCC 记录：txId=abc, action=TRANSFER, amount=100, status=TRY

  Confirm（对方行）：
    对方账户增加 100 元
    删除 TCC 记录

  Cancel（本行）：
    解冻余额：balance += 100（退还冻结金额）
    删除 TCC 记录
```

### 3.1 TCC 实现

```java
// 定义 TCC 接口
@LocalTCC
public interface TransferTccService {

    /**
     * Try：资源预留
     * @param businessActionContext TCC 上下文，Seata 自动注入
     */
    @TwoPhaseBusinessAction(
        name = "transferTcc",
        commitMethod = "confirm",
        rollbackMethod = "cancel"
    )
    BranchSession prepare(
        BusinessActionContext businessActionContext,
        @Param("fromAccount") String fromAccount,
        @Param("toAccount") String toAccount,
        @Param("amount") BigDecimal amount);

    // Confirm：确认预留（Try 成功后调用）
    boolean confirm(BusinessActionContext context);

    // Cancel：回滚预留（Try 失败或全局回滚时调用）
    boolean cancel(BusinessActionContext context);
}
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TransferTccServiceImpl implements TransferTccService {

    private final AccountMapper accountMapper;
    private final TccTransactionMapper tccMapper;

    @Override
    @Transactional
    public BranchSession prepare(BusinessActionContext context,
                                String fromAccount, String toAccount,
                                BigDecimal amount) {
        // 1. 检查余额是否足够
        Account from = accountMapper.findByAccountNo(fromAccount);
        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException("余额不足");
        }

        // 2. 冻结余额（Try：预留资源）
        accountMapper.freezeBalance(fromAccount, amount);

        // 3. 记录 TCC 事务日志（用于异常恢复）
        tccMapper.insert(TccRecord.builder()
            .xid(context.getXid())
            .actionId(context.getBranchId())
            .fromAccount(fromAccount)
            .toAccount(toAccount)
            .amount(amount)
            .status("TRY")
            .createdAt(Instant.now())
            .build());

        log.info("TCC Try 完成: xid={}, from={}, amount={}",
            context.getXid(), fromAccount, amount);

        return BranchSession.builder().build();
    }

    @Override
    public boolean confirm(BusinessActionContext context) {
        String fromAccount = (String) context.getActionContext("fromAccount");
        String toAccount = (String) context.getActionContext("toAccount");
        BigDecimal amount = new BigDecimal(
            context.getActionContext("amount").toString());

        try {
            // 1. 正式扣减冻结金额
            accountMapper.confirmDebit(fromAccount, amount);

            // 2. 对方账户增加
            accountMapper.credit(toAccount, amount);

            // 3. 更新 TCC 记录状态
            tccMapper.updateStatus(context.getBranchId(), "CONFIRMED");

            log.info("TCC Confirm 完成: xid={}", context.getXid());
            return true;
        } catch (Exception e) {
            log.error("TCC Confirm 失败: xid={}", context.getXid(), e);
            return false;  // 返回 false，TC 会重试
        }
    }

    @Override
    public boolean cancel(BusinessActionContext context) {
        String fromAccount = (String) context.getActionContext("fromAccount");
        BigDecimal amount = new BigDecimal(
            context.getActionContext("amount").toString());

        try {
            // 释放冻结金额：freeze_balance -= amount, balance += amount
            accountMapper.unfreezeBalance(fromAccount, amount);

            // 更新 TCC 记录状态
            tccMapper.updateStatus(context.getBranchId(), "CANCELLED");

            log.info("TCC Cancel 完成: xid={}", context.getXid());
            return true;
        } catch (Exception e) {
            log.error("TCC Cancel 失败: xid={}", context.getXid(), e);
            return false;  // 返回 false，TC 会重试
        }
    }
}
```

### 3.2 业务调用 TCC

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final TransferTccService transferTccService;
    private final AccountMapper accountMapper;

    @GlobalTransactional(timeoutMills = 30000)
    public void transfer(String fromAccount, String toAccount, BigDecimal amount) {
        log.info("跨行转账开始: from={}, to={}, amount={}",
            fromAccount, toAccount, amount);

        // 远程调用对方银行 TCC Try（通过 Feign 或 RPC）
        boolean result = remoteBankTccService.prepare(
            fromAccount, toAccount, amount);

        if (!result) {
            throw new TransferException("对方银行预留失败");
        }

        log.info("跨行转账完成");
    }
}
```

## 4. AT vs TCC 选型决策

| 维度 | AT 模式 | TCC 模式 |
|------|---------|---------|
| 代码侵入 | 无（注解即可）| 需要实现 Try/Confirm/Cancel |
| 性能 | 好（异步回滚）| 最好（无全局锁）|
| 适用范围 | 支持 XA 的关系数据库 | 任意资源 |
| 全局锁 | Seata 自动管理 | 需要业务自行保证幂等 |
| 隔离级别 | 默认读未提交 | 可实现读已提交 |
| 异常恢复 | 自动（undo_log）| 需手动补录（TCC Log）|
| 学习成本 | 低 | 中 |

```
选型口诀：

AT：国内业务系统首选，低侵入，自动补偿
TCC：高并发/跨库/跨系统，强一致性需求
Saga：长流程，弱一致性，允许最终一致
```

### 4.1 银行场景选型

```bash
✅ AT 模式适用：
  - 同银行内多服务转账（都在 MySQL/PostgreSQL）
  - 订单创建 + 库存扣减（MySQL 多表）
  - 支付 + 发货 + 积分（MySQL 三方服务）

✅ TCC 模式适用：
  - 跨行转账（银行 A + 银行 B，各自独立系统）
  - 支付 + 积分（MySQL + Redis，需分别处理）
  - 涉及第三方 API 的事务（支付网关回调）
  - 高并发场景（AT 模式全局锁粒度较大）
```

## 5. 常见问题与避坑

```
避坑 1：全局事务超时
  - AT 模式的全局锁在超时后由 TC 自动释放
  - 设置合理的 timeoutMills（建议 30 秒）
  - 超时回滚不影响已经成功的分支

避坑 2：分支事务隔离级别
  - AT 模式默认隔离级别是 READ UNCOMMITTED
  - 解决方案：全局锁 SELECT ... FOR UPDATE
  - 开启：seata.client.undo.enable-branch-async-executing = false

避坑 3：幂等性
  - Confirm/Cancel 可能被重复调用
  - 必须实现幂等（查 TCC 日志状态）
  - 已 CONFIRMED 直接返回 true

避坑 4：TCC 空回滚
  - Try 未执行，Cancel 被调用（网络问题）
  - 防御：Cancel 中检查 TCC 日志状态
  - 只有 TRY 状态的记录才执行 Cancel

避坑 5：悬挂
  - Cancel 先于 Try 执行完成
  - 防御：Try 执行前检查 Cancel 是否已执行

避坑 6：Seata Server 单点
  - 必须集群部署（3 节点 + Nacos 高可用）
  - TC 存储用 DB（高可用 MySQL Group）
  - 不要用 File 存储（无法水平扩展）

避坑 7：undo_log 数据量
  - 高并发下 undo_log 表快速增长
  - 配置定时清理：undo_log_delete_period
  - 或按分支 ID 清理历史记录
```

## 6. 性能优化

```yaml
# Seata 高并发优化配置
seata:
  client:
    # 异步处理分支事务（提升吞吐量）
    branch-async-enable: true
    branch-async-queue-size: 1024

    # 批量处理 undo_log
    undo:
      log-batch-enable: true
      log-batch-size: 100

  # 分支事务并发数限制
  thread:
    pool:
      core-pool-size: 20
      max-pool-size: 200
```

---

*相关阅读：[分布式事务与 Saga 模式实战](/coding/分布式系统/分布式事务与Saga模式实战) · [分布式理论 CAP 与 BASE](/coding/分布式系统/分布式理论-CAP与BASE) · [RabbitMQ 消息队列银行实战](/coding/分布式系统/RabbitMQ消息队列-银行实战选型指南)*
