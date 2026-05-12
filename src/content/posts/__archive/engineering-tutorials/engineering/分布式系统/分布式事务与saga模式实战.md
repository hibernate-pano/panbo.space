---
title: 分布式事务与 Saga 模式：银行支付系统的实战指南
summary: 在单体应用中，数据库事务是银弹——ACID 保证了一切。但银行微服务架构下，一个简单的跨境汇款涉及：
publishedAt: '2026-03-19'
track: engineering
topic: 分布式系统
tags: []
featured: false
draft: false
slug: 分布式事务与saga模式实战
legacyPaths:
  - /coding/分布式系统/分布式事务与Saga模式实战
---
> 当 CAP 定理遇上资金转移，每一分钱都不能出错

---

## 目录

1. [为什么银行系统无法逃开分布式事务](#1-为什么银行系统无法逃开分布式事务)
2. [CAP 定理与 BASE 理论：务实的选择](#2-cap-定理与-base-理论务实的选择)
3. [两阶段提交（2PC）：为什么银行不爱用它](#3-两阶段提交2pc为什么银行不爱用它)
4. [Saga 模式：分布式事务的银行级解法](#4-saga-模式分布式事务的银行级解法)
5. [编排型 Saga：中央指挥官的利弊](#5-编排型-saga中央指挥官的利弊)
6. [协同型 Saga：去中心化的事件驱动](#6-协同型-saga去中心化的事件驱动)
7. [Saga 的补偿逻辑：回滚的艺术](#7-saga-的补偿逻辑回滚的艺术)
8. [银行实战：跨境汇款的全链路 Saga 设计](#8-银行实战跨境汇款的全链路-saga-设计)
9. [幂等性：Saga 的安全阀](#9-幂等性saga-的安全阀)
10. [Saga 框架选型与落地建议](#10-saga-框架选型与落地建议)

---

## 1. 为什么银行系统无法逃开分布式事务

在单体应用中，数据库事务是银弹——ACID 保证了一切。但银行微服务架构下，一个简单的跨境汇款涉及：

```
Remittance Service（汇款服务）
    ├── Account Service（账户服务）→ 扣减付款方余额
    ├── FX Service（外汇服务）→ 锁定汇率
    ├── Compliance Service（合规服务）→ AML 筛查
    ├── Treasury Service（资金池服务）→ 资金划拨
    └── SWIFT Service（SWIFT 服务）→ 发送跨境报文
```

每个服务有独立的数据库（Oracle/PostgreSQL）。当汇款成功时，**所有服务的数据库状态必须一致**；当任何一步失败时，**所有服务的状态都必须回滚**。

这就是分布式事务的核心问题：**如何在多个独立的数据库之间，保证跨系统的原子性？**

---

## 2. CAP 定理与 BASE 理论：务实的选择

### 2.1 CAP 定理的简化

```
CAP 定理：分布式系统最多同时满足以下两个：
  - Consistency（一致性）：每次读取都是最新写入
  - Availability（可用性）：每个请求都有响应
  - Partition Tolerance（分区容错）：网络分区时系统仍能工作

现实：网络分区一定会发生，所以实际只有两个选择：
  CP（一致性 + 分区容错）：分区时拒绝写入
  AP（可用性 + 分区容错）：分区时允许读取旧数据

银行系统的选择：
  → 核心交易：CP（一致性优先，一分钱都不能错）
  → 查询/报表：AP（可用性优先，允许短暂不一致）
```

### 2.2 BASE 理论：CAP 的务实落地

```
BASE = Basically Available, Soft state, Eventually consistent

银行支付场景的 BASE 解读：

Basically Available（基本可用）：
  - 即使出现网络分区，核心支付功能仍部分可用
  - 例如：非实时汇款可以排队等待，网络恢复后继续处理

Soft state（软状态）：
  - 交易状态在网络分区期间可以是"中间态"
  - 例如：汇款状态显示"处理中"，而不是"成功"或"失败"

Eventually consistent（最终一致性）：
  - 账务核对最终会平衡
  - 不要求强一致，但要求有完整的对账机制
```

---

## 3. 两阶段提交（2PC）：为什么银行不爱用它

### 3.1 2PC 的工作原理

```
协调者（Coordinator）
    │
    ├─ Phase 1：Vote（投票阶段）
    │    向所有参与者发送 Prepare
    │    参与者锁定资源并回复 Vote-Commit 或 Vote-Abort
    │    （资源被锁定，其他事务无法修改）
    │
    └─ Phase 2：Decision（决定阶段）
         协调者收到全部 Vote-Commit → 发送 Commit
         协调者收到任意 Vote-Abort → 发送 Abort
         参与者提交或回滚，释放锁

问题：
  1. 协调者宕机 → 参与者永远锁定（最危险的问题！）
  2. 超时机制不完善 → 状态不明
  3. 锁持有时间长 → 系统吞吐量大降
```

### 3.2 银行系统的 2PC 实际使用场景

```
2PC 在汇丰的有限使用场景：
  ✅ 单一 Oracle RAC 内部的事务（因为 RAC 内部是同步复制的）
  ✅ 同一数据库实例内的多表操作（仍然是本地事务）
  ✅ 核心银行系统的账务核心（强一致性优先）

❌ 跨服务调用：绝对不用 2PC
❌ 跨数据库实例：谨慎使用，通常用 Saga 替代
❌ 跨数据中心：2PC 的延迟不可接受

核心原因：2PC 是同步阻塞的，而银行微服务间调用是异步的。
  2PC 的超时 = 无限等待 = 灾难
```

---

## 4. Saga 模式：分布式事务的银行级解法

### 4.1 Saga 的核心思想

Saga 的核心思想来自一本书（1987 年）：**用一系列局部的本地事务，替代一个全局事务**。

每个局部事务都有对应的**补偿事务（Compensating Transaction）**。当某一步失败时，按相反顺序执行前面所有步骤的补偿事务。

```
正常流程（转账 1000 HKD）：
  Step 1: Debit Source Account    → 扣除 1000 HKD    ✓
  Step 2: Lock FX Rate           → 锁定汇率           ✓
  Step 3: Credit Target Account  → 汇入目标账户      ✓
  Step 4: Send SWIFT Message     → 发送 SWIFT 报文   ✓

失败场景（Step 3 失败）：
  Step 1: Debit Source Account    → 扣除 1000 HKD    ✓
  Step 2: Lock FX Rate            → 锁定汇率          ✓
  Step 3: Credit Target Account   → 失败！触发补偿
  ─────────────────────────────
  Compensate Step 2: Unlock FX Rate → 解锁汇率        ↩
  Compensate Step 1: Credit Back    → 返还 1000 HKD   ↩

最终结果：付款方余额恢复，汇款失败，无资金损失
```

### 4.2 Saga 的两种架构

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│    编排型 Saga（Choreography）   │    │    协同型 Saga（Orchestration）  │
│         无中央指挥官              │    │        中央指挥官               │
└─────────────────────────────────┘    └─────────────────────────────────┘

各服务自己决定下一步做什么           指挥官统一调度所有参与者的执行

优点：去中心化，服务自治              优点：逻辑清晰，事务边界明确
缺点：事务逻辑分散，难以追踪          缺点：指挥官成为单点（但可以高可用）
缺点：循环依赖风险                    缺点：指挥官需要了解所有步骤

银行使用倾向：                       银行使用倾向：
  简单场景：协同型（3-4 步以内）      复杂场景：编排型（5 步以上）
  核心支付：编排型（更易审计）         审计要求高的交易：编排型
```

---

## 5. 编排型 Saga：中央指挥官的利弊

### 5.1 指挥官设计

```java
// Saga 指挥官（Orchestrator）
// 在汇丰，这通常是一个独立的 SagaService

@Service
public class RemittanceSagaOrchestrator {

    private final RemittanceRepository remittanceRepo;
    private final AccountService accountService;
    private final FxService fxService;
    private final ComplianceService complianceService;
    private final SwiftService swiftService;
    private final EventPublisher eventPublisher;

    // Saga 状态机：定义完整的执行流程
    @Transactional  // 指挥官的本地事务，保存 Saga 状态
    public RemittanceSagaOutcome execute(RemittanceRequest request) {

        // 1. 创建 Saga 实例（保存状态到数据库）
        RemittanceSaga saga = RemittanceSaga.create(request);
        remittanceRepo.save(saga);
        eventPublisher.publish(new SagaStartedEvent(saga.getId()));

        try {
            // 2. 执行第一步：扣款
            saga.recordStepStarted(RemittanceStep.DEBIT_SOURCE_ACCOUNT);
            DebitResult debitResult = accountService.debit(
                request.sourceAccountId(),
                request.sourceAmount()
            );
            saga.recordStepCompleted(RemittanceStep.DEBIT_SOURCE_ACCOUNT,
                Map.of("transactionId", debitResult.transactionId()));

            // 3. 执行第二步：锁定汇率
            saga.recordStepStarted(RemittanceStep.LOCK_FX_RATE);
            FxQuote fxQuote = fxService.lockRate(
                request.currencyPair(),
                request.sourceAmount()
            );
            saga.recordStepCompleted(RemittanceStep.LOCK_FX_RATE,
                Map.of("quoteId", fxQuote.quoteId(), "rate", fxQuote.rate()));

            // 4. 执行第三步：合规审查
            saga.recordStepStarted(RemittanceStep.COMPLIANCE_CHECK);
            ComplianceResult complianceResult = complianceService.check(
                new ComplianceCheckRequest(saga.getId(), request)
            );
            if (!complianceResult.isPassed()) {
                throw new ComplianceRejectionException(complianceResult.reason());
            }
            saga.recordStepCompleted(RemittanceStep.COMPLIANCE_CHECK,
                Map.of("checkId", complianceResult.checkId()));

            // 5. 执行第四步：SWIFT 报文
            saga.recordStepStarted(RemittanceStep.SEND_SWIFT);
            SwiftConfirmation swift = swiftService.sendMT103(
                buildSwiftMessage(request, fxQuote)
            );
            saga.recordStepCompleted(RemittanceStep.SEND_SWIFT,
                Map.of("swiftRef", swift.reference()));

            // 6. 全部成功
            saga.markCompleted();
            eventPublisher.publish(new RemittanceCompletedEvent(saga.getId()));

            return RemittanceSagaOutcome.success(saga);

        } catch (Exception e) {
            // 触发补偿流程
            return handleFailure(saga, e);
        }
    }

    // 补偿流程：按相反顺序执行
    private RemittanceSagaOutcome handleFailure(RemittanceSaga saga, Exception e) {
        saga.markFailed(e.getMessage());
        eventPublisher.publish(new SagaFailedEvent(saga.getId(), e));

        // 补偿：从最后完成的步骤开始，逆序执行
        compensateInReverseOrder(saga);

        return RemittanceSagaOutcome.failed(saga, e.getMessage());
    }

    private void compensateInReverseOrder(RemittanceSaga saga) {
        List<RemittanceStep> completedSteps = saga.getCompletedSteps();

        // 逆序补偿
        for (int i = completedSteps.size() - 1; i >= 0; i--) {
            RemittanceStep step = completedSteps.get(i);
            try {
                compensateStep(saga, step);
            } catch (CompensateFailedException ex) {
                // 补偿也失败了！进入人工处理
                saga.recordCompensateFailed(step, ex.getMessage());
                eventPublisher.publish(
                    new SagaCompensationFailedEvent(saga.getId(), step)
                );
                // 告警 → 进入人工处理队列
                alertService.alert("Saga 补偿失败", saga.getId(), step);
            }
        }
    }

    private void compensateStep(RemittanceSaga saga, RemittanceStep step) {
        Map<String, Object> stepData = saga.getStepData(step);

        switch (step) {
            case SEND_SWIFT:
                // SWIFT 报文补偿：发送撤销报文（MT192）
                swiftService.sendCancellation(
                    (String) stepData.get("swiftRef"),
                    (String) stepData.get("swiftRef") + "-CANC"
                );
                break;

            case COMPLIANCE_CHECK:
                // 合规审查无法真正"撤销"，记录日志
                complianceService.logCompensation(
                    saga.getId(), "COMPLIANCE_CHECK", stepData
                );
                break;

            case LOCK_FX_RATE:
                // 解锁汇率
                fxService.unlockRate((String) stepData.get("quoteId"));
                break;

            case DEBIT_SOURCE_ACCOUNT:
                // 返还扣款：需要 idempotency key 保证幂等
                accountService.refund(
                    saga.getRequest().sourceAccountId(),
                    saga.getRequest().sourceAmount(),
                    saga.getIdempotencyKey()  // 关键：用同一个幂等 key
                );
                break;
        }

        saga.recordCompensated(step);
    }
}
```

### 5.2 Saga 状态机建模

```java
// Saga 状态机：清晰定义每种状态和合法转换
public enum SagaStatus {
    PENDING,           // 等待开始
    IN_PROGRESS,       // 执行中
    COMPLETED,         // 全部成功
    COMPENSATING,      // 正在补偿
    COMPENSATED,       // 补偿完成
    PARTIALLY_COMPENSATED,  // 部分补偿（补偿失败）
    FAILED;            // 最终失败（需人工处理）
}

public enum RemittanceStep {
    DEBIT_SOURCE_ACCOUNT,    // 扣减付款方
    LOCK_FX_RATE,           // 锁定汇率
    COMPLIANCE_CHECK,       // 合规审查
    SEND_SWIFT;             // 发送 SWIFT

    // 定义补偿步骤
    public RemittanceStep getCompensateStep() {
        return switch (this) {
            case DEBIT_SOURCE_ACCOUNT  -> null; // 无前置步骤，不用补偿
            case LOCK_FX_RATE           -> DEBIT_SOURCE_ACCOUNT;
            case COMPLIANCE_CHECK       -> LOCK_FX_RATE;
            case SEND_SWIFT             -> COMPLIANCE_CHECK;
        };
    }
}
```

---

## 6. 协同型 Saga：去中心化的事件驱动

### 6.1 协同型 Saga 的事件流

```
协同型 Saga = 事件驱动架构 + 补偿逻辑

Remittance Service：
  发布 RemittanceRequested 事件
        ↓
Account Service（订阅）：
  执行扣款 → 发布 SourceAccountDebited 事件
        ↓
FX Service（订阅）：
  执行汇率锁定 → 发布 FxRateLocked 事件
        ↓
Compliance Service（订阅）：
  执行合规检查 → 发布 ComplianceApproved / ComplianceRejected 事件
        ↓
如果 ComplianceRejected：
  Account Service 订阅 → 执行返还扣款 → 发布 AccountCreditedRefund 事件
  FX Service 订阅 → 执行解锁汇率 → 发布 FxRateUnlocked 事件
```

### 6.2 协同型 Saga 实现

```java
// Account Service：处理汇款扣款和补偿
@Service
public class AccountEventHandler {

    private final AccountRepository accountRepo;
    private final EventPublisher eventPublisher;

    @EventListener
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleRemittanceRequested(RemittanceRequestedEvent event) {
        try {
            // 执行扣款（本地事务）
            Account account = accountRepo.findById(event.sourceAccountId());
            account.debit(event.amount(), "REMITTANCE:" + event.remittanceId());

            // 发布成功事件
            eventPublisher.publish(AccountEvents.sourceDebited(
                event.remittanceId(),
                event.sourceAccountId(),
                event.amount()
            ));

        } catch (InsufficientBalanceException e) {
            // 发布失败事件，触发反向补偿链
            eventPublisher.publish(AccountEvents.debitFailed(
                event.remittanceId(),
                event.sourceAccountId(),
                e.getMessage()
            ));
        }
    }

    @EventListener
    public void handleComplianceRejected(ComplianceRejectedEvent event) {
        // 合规失败 → 执行返还（补偿）
        Account account = accountRepo.findById(event.sourceAccountId());
        account.credit(event.amount(), "REMITTANCE_REFUND:" + event.remittanceId());

        eventPublisher.publish(AccountEvents.refundCompleted(
            event.remittanceId(),
            event.sourceAccountId(),
            event.amount()
        ));
    }
}
```

### 6.3 编排型 vs 协同型：银行场景的选择

```
┌──────────────────┬──────────────────────────┬──────────────────────────┐
│                  │ 编排型                   │ 协同型                   │
├──────────────────┼──────────────────────────┼──────────────────────────┤
│ 适用场景         │ 5 步以上的复杂事务       │ 3-4 步的简单事务         │
│                  │ 需要强审计轨迹的交易     │ 松耦合的服务             │
│                  │ 关键路径的支付交易       │ 非核心业务流程           │
├──────────────────┼──────────────────────────┼──────────────────────────┤
│ 事务边界         │ 清晰（Saga Orchestrator  │ 模糊（事件链隐含了流程） │
│                  │  显式管理所有步骤）        │                          │
├──────────────────┼──────────────────────────┼──────────────────────────┤
│ 审计能力         │ 强（步骤全部记录）        │ 中等（依赖事件日志）     │
├──────────────────┼──────────────────────────┼──────────────────────────┤
│ 调试难度         │ 低（单点追踪）           │ 高（需事件总线追踪）     │
├──────────────────┼──────────────────────────┼──────────────────────────┤
│ 银行使用场景     │ 核心支付、跨境汇款        │ 客户通知、数据同步       │
│                  │ 监管报送触发              │ 积分系统、消息推送       │
└──────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## 7. Saga 的补偿逻辑：回滚的艺术

### 7.1 补偿的复杂性

Saga 的补偿逻辑远比"撤销"复杂：

```
正向操作：Debit Source Account
补偿操作：Credit Source Account（返还）

但补偿不仅仅是"反向操作"，要考虑：
  1. 幂等性：补偿操作可能被重复调用
  2. 幂等 Key：同一个 Saga 的补偿必须只执行一次
  3. 部分失败：部分补偿成功了，部分失败了
  4. 时序：汇率可能已经变化，返还的金额要考虑汇率差异
  5. 超时：补偿超时了怎么处理
```

### 7.2 补偿事务的分类

```java
// 补偿类型分类
public enum CompensatableAction {
    // 完全可补偿：扣款 → 返还金额（同一金额）
    FULLY_REVERSIBLE,

    // 部分可补偿：汇率锁定 → 解锁（汇率锁定本身是免费的）
    COSTLESS_REVERSIBLE,

    // 不可逆操作：SWIFT 报文已发送 → 只能发撤销报文，无法完全消除
    IRREVERSIBLE;
}

// 不可逆操作的补偿策略
public interface CompensatableAction {
    // 补偿可能性评估
    CompensationFeasibility assessFeasibility();

    // 替代方案
    List<CompensationAlternative> getAlternatives();

    // 执行补偿（或替代方案）
    void compensate();
}

public record SWIFTCompensationHandler() implements CompensatableAction {

    @Override
    public CompensationFeasibility assessFeasibility() {
        // SWIFT MT103 报文一旦发送，不能撤回
        // 只能通过发送 MT192（撤销请求）或 MT192（冲正）补救
        return new CompensationFeasibility(
            feasible: true,
            strategy: COMPENSATE_WITH_ALTERNATIVE,
            estimatedRecoveryRate: 0.95  // 95% 可以挽回
        );
    }

    @Override
    public void compensate() {
        // 发送 SWIFT 撤销报文
        swiftService.sendMT192(
            originalMT103Ref,
            reason: "Beneficiary account closed"
        );

        // 触发人工处理（5% 无法自动挽回的情况）
        if (!autoRecoverable) {
            manualInterventionQueue.add(
                new ManualCase(sagaId, "SWIFT compensation partial failure")
            );
        }
    }
}
```

### 7.3 补偿超时处理

```java
// 补偿超时：最危险的情况之一
// 场景：补偿操作发出但超时了，不知道是否执行成功

public class CompensationTimeoutHandler {

    private final SagaRepository sagaRepo;
    private final AlertService alertService;
    private final ManualInterventionService manualService;

    public void handleTimeout(SagaId sagaId, RemittanceStep failedStep) {
        Saga saga = sagaRepo.findById(sagaId);

        // 1. 检查外部系统状态（主动查询）
        boolean externalStateConfirmed = checkExternalSystemState(sagaId, failedStep);

        if (externalStateConfirmed) {
            // 外部系统确认操作已执行：推进 Saga 状态
            saga.markCompensated(failedStep);
            sagaRepo.save(saga);
        } else {
            // 外部系统状态未知：进入人工处理
            saga.markPendingManualIntervention(failedStep);
            sagaRepo.save(saga);

            // 立即告警
            alertService.alert(
                title: "Saga 补偿超时需人工介入",
                sagaId: sagaId,
                failedStep: failedStep,
                estimatedLoss: saga.getTransactionAmount(),
                sla: "30分钟内必须处理"
            );

            // 创建人工处理工单
            manualService.createCase(
                type: MANUAL_COMPENSATION,
                sagaId: sagaId,
                priority: determinePriority(saga),
                description: buildCompensationInstructions(saga)
            );
        }
    }
}
```

---

## 8. 银行实战：跨境汇款的全链路 Saga 设计

### 8.1 跨境汇款的完整 Saga 流程

```
正常流程：
T0: RemittanceSaga.start()
    │
T1: AccountService.debit(sourceAccount, HKD 10000)    → 余额 90000 HKD
T2: FxService.lockRate(HKD/USD, rate=0.1285)         → 汇率锁定 30s
T3: ComplianceService.screen(sender, receiver)        → AML PASSED
T4: TreasuryService.freezeUsdPool(USD 1285)           → 资金池冻结
T5: SwiftService.sendMT103(..., reference=X)          → MT103 已发送
T6: RemittanceSaga.complete()

失败场景 1（T3 合规拒绝）：
T0: [DEBIT ✅] → [LOCK ✅] → [COMPLIANCE ❌]
    ↩
    [UNLOCK FX] → [REFUND HKD 10000]
    ↩
    Saga Complete (COMPENSATED)

失败场景 2（T5 SWIFT 失败）：
T0: [DEBIT ✅] → [LOCK ✅] → [COMPLIANCE ✅] → [SWIFT ❌]
    ↩
    [CANCEL SWIFT] → [UNFREEZE USD] → [REFUND HKD]
    ↩
    Saga Complete (COMPENSATED)

失败场景 3（T5 SWIFT 成功后超时）：
T0: [DEBIT ✅] → [LOCK ✅] → [COMPLIANCE ✅] → [SWIFT ✅]
    ↝ 5 分钟后对方行未确认
    [CHECK SWIFT STATUS] → [WAITING FOR RECEIPT]
    ↝ 30 分钟后对方仍未收账
    [SEND SWIFT ENQUIRY] → [ESCALATE TO OPERATIONS]
    ↝ 超过 SLA
    Saga 进入 MANUALLY_PENDING → 人工介入处理
```

### 8.2 完整的 Saga 状态机

```java
public record RemittanceSagaState(
    SagaId id,
    RemittanceRequest request,
    SagaStatus status,
    Map<RemittanceStep, StepState> steps,
    String failedStep,
    String failureReason,
    Instant startedAt,
    Instant completedAt
) {}

public enum StepState {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED(Map<String, Object> result),
    COMPENSATING,
    COMPENSATED,
    COMPENSATION_FAILED(String failureReason);
}

public enum SagaStatus {
    // 正常流程
    PENDING,
    IN_PROGRESS,
    COMPLETED,

    // 补偿流程
    COMPENSATING,
    FULLY_COMPENSATED,        // 全部补偿成功
    PARTIALLY_COMPENSATED,    // 部分补偿成功
    COMPENSATION_FAILED,      // 补偿失败

    // 人工介入
    REQUIRES_MANUAL_INTERVENTION,
    MANUAL_INTERVENTION_IN_PROGRESS,
    MANUALLY_RESOLVED;

    public boolean isTerminal() {
        return this == COMPLETED
            || this == FULLY_COMPENSATED
            || this == MANUALLY_RESOLVED;
    }

    public boolean requiresAlert() {
        return this == COMPENSATION_FAILED
            || this == PARTIALLY_COMPENSATED
            || this == REQUIRES_MANUAL_INTERVENTION;
    }
}
```

---

## 9. 幂等性：Saga 的安全阀

### 9.1 为什么幂等性是 Saga 的命门

Saga 涉及的每个服务调用都可能在网络中失败、重试、超时。如果不做幂等：

```
场景：Debit Source Account 调用超时
  → 不清楚是否执行成功
  → 重试一次
  → 如果第一次成功了，第二次又扣了一次款！
  → 客户："我的钱去哪了？！"
```

### 9.2 幂等性实现：幂等 Key

```java
// 每个 Saga 步骤调用必须携带幂等 Key
@Service
public class AccountService {

    @Transactional
    public DebitResult debit(AccountId accountId, Money amount, IdempotencyKey key) {
        // 1. 检查幂等 Key 是否已使用（幂等表）
        if (idempotencyRepo.existsByKey(key)) {
            IdempotencyRecord record = idempotencyRepo.findByKey(key);
            if (record.isSuccess()) {
                // 之前成功过，直接返回上次结果
                return record.getCachedResult(DebitResult.class);
            } else {
                // 之前失败了，清理后重试
                idempotencyRepo.delete(key);
            }
        }

        // 2. 执行真正的业务逻辑
        try {
            Account account = accountRepo.findById(accountId);
            account.debit(amount);

            // 3. 缓存结果
            DebitResult result = new DebitResult(...);
            idempotencyRepo.save(new IdempotencyRecord(key, result, true));

            return result;

        } catch (InsufficientBalanceException e) {
            // 4. 记录失败结果（也是幂等的）
            idempotencyRepo.save(new IdempotencyRecord(key,
                new DebitFailureResult(e.getMessage()), false));
            throw e;
        }
    }
}

// Idempotency 表设计
@Entity
@Table(name = "idempotency_keys")
public class IdempotencyRecord {
    @Id
    private IdempotencyKey key;

    @Column(columnDefinition = "TEXT")
    private String cachedResult;  // JSON 序列化的结果

    private boolean success;
    private Instant createdAt;
    private Instant expiresAt;  // 过期时间（通常 = 业务最大有效期）

    // 复合 Key = idempotencyKey + operationType
    // 例如：saga-12345/debit  → saga 12345 的 debit 步骤
}
```

### 9.3 Saga 级别的幂等管理

```java
// Saga Orchestrator：管理每个步骤的幂等 Key
public class RemittanceSaga {
    private final IdempotencyKeyFactory keyFactory;

    public IdempotencyKey getDebitIdempotencyKey() {
        return keyFactory.create(sagaId, "DEBIT_SOURCE_ACCOUNT");
    }

    public IdempotencyKey getRefundIdempotencyKey() {
        // 补偿步骤复用同一个幂等 Key（保证同一个 Saga 的扣款只扣/退一次）
        return keyFactory.create(sagaId, "DEBIT_SOURCE_ACCOUNT");
    }
}

// 在 Account Service 中使用
@Service
public class AccountService {
    public RefundResult refund(AccountId accountId, Money amount, IdempotencyKey key) {
        // 和 debit 使用同一个 key，保证了 refund 也幂等
        // 同一个 Saga 的 refund 无论重试多少次，都只执行一次
        return executeWithIdempotency(key, () -> {
            Account account = accountRepo.findById(accountId);
            account.credit(amount, "REFUND");
            return new RefundResult(...);
        });
    }
}
```

---

## 10. Saga 框架选型与落地建议

### 10.1 框架对比

```
┌────────────────┬────────────────────┬──────────────────────┬──────────────┐
│ 框架           │ 类型               │ 适用场景              │ 银行推荐度   │
├────────────────┼────────────────────┼──────────────────────┼──────────────┤
│ Seata          │ AT/TCC/Saga/XA     │ 国内项目首选          │ ★★★★          │
│                │                    │ 中文文档好，阿里系    │              │
├────────────────┼────────────────────┼──────────────────────┼──────────────┤
│ Apache         │ Saga + TCC         │ 中大型微服务项目      │ ★★★★          │
│ Seata          │                    │ 支持自动补偿生成      │              │
├────────────────┼────────────────────┼──────────────────────┼──────────────┤
│ Conductor      │ Orchestration      │ Netflix 开源          │ ★★★           │
│ (Netflix)      │                    │ UI 可视化好          │              │
├────────────────┼────────────────────┼──────────────────────┼──────────────┤
│ Temporal       │ Workflow           │ 最成熟的分布式         │ ★★★★★         │
│                │ (Go/Java/TS)       │ 工作流引擎            │              │
│                │                    │ 强持久化，状态管理强  │              │
├────────────────┼────────────────────┼──────────────────────┼──────────────┤
│ 自研           │ 自定义             │ 核心银行系统          │ ★★★★★         │
│                │                    │ 审计、合规要求高      │              │
│                │                    │ 可控性强              │              │
└────────────────┴────────────────────┴──────────────────────┴──────────────┘

汇丰的实践：核心支付系统使用自研 Saga 编排器
- 原因：监管要求完整的审计轨迹，自研可以把每个步骤状态存到专用表
- 非核心流程使用 Temporal 或 Conductor
```

### 10.2 Saga 落地检查清单

```markdown
## Saga 上线检查清单（银行系统）

### 设计阶段
- [ ] 识别所有 Saga 参与者和步骤
- [ ] 确认每个步骤都是可补偿的（或有替代方案）
- [ ] 定义补偿的逆序和失败处理策略
- [ ] 确定幂等 Key 的命名规范和生命周期
- [ ] 绘制 Saga 状态机图，并获得业务团队确认

### 安全检查
- [ ] 所有步骤操作都有幂等保护
- [ ] 补偿操作本身也是幂等的
- [ ] 补偿超时有明确的处理策略（外部状态确认 or 人工介入）
- [ ] Saga 状态变更有完整的审计日志

### 性能测试
- [ ] 在最坏网络延迟下（99th percentile）测试补偿流程
- [ ] 验证补偿不会产生级联失败
- [ ] 测试补偿期间新请求的并发处理

### 监控告警
- [ ] 补偿失败 → P1 告警
- [ ] Saga 超时未完成 → P2 告警
- [ ] 人工介入案例积压 → P2 告警
- [ ] Saga 失败率（补偿失败 / 总数）→ P3 趋势监控
```

---

## 结语

Saga 模式不是银弹，它的核心价值在于：**将强一致的全局事务问题，转化为最终一致的多步本地事务问题**。代价是复杂性上升——你需要管理补偿逻辑、幂等性、状态机和人工处理流程。

在银行系统中，我见过太多"为了技术而 Saga"的过度设计。关键判断原则只有一条：

> **如果业务可以接受最终一致性（大多数场景可以），就用 Saga。
> 如果业务必须强一致（核心账务），优先考虑是否可以把参与方放在同一个数据库中。
> 只有在以上都不行的时候，才考虑 2PC。**

最后，永远给 Saga 的补偿失败留一条人工介入的路。再完美的系统，也无法处理所有边界情况。**人工干预通道，是 Saga 的最后一道防线**。

*Bobot 🦐 | 汇丰科技园 | 2026-03-19*
