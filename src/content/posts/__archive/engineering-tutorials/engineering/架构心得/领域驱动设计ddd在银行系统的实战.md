---
title: 领域驱动设计（DDD）在银行复杂业务系统中的实战
summary: 银行系统的业务逻辑有多复杂？让我用一个具体的例子说明。
publishedAt: '2026-03-19'
track: engineering
topic: 架构心得
tags: []
featured: true
draft: false
slug: 领域驱动设计ddd在银行系统的实战
legacyPaths:
  - /coding/架构心得/领域驱动设计DDD在银行系统的实战
---
> 当业务逻辑复杂度超过团队认知负载，架构如何演进

---

## 目录

1. [为什么银行系统特别需要 DDD](#1-为什么银行系统特别需要-ddd)
2. [DDD 核心概念快速梳理](#2-ddd-核心概念快速梳理)
3. [战略设计：划分bounded context](#3-战略设计划分bounded-context)
4. [战术设计：聚合、实体与值对象](#4-战术设计聚合实体与值对象)
5. [聚合根与事务边界](#5-聚合根与事务边界)
6. [领域事件：解耦业务系统](#6-领域事件解耦业务系统)
7. [DDD 在汇丰支付系统中的实际应用](#7-ddd-在汇丰支付系统中的实际应用)
8. [从贫血模型到富领域模型](#8-从贫血模型到富领域模型)
9. [DDD 与微服务边界的权衡](#9-ddd-与微服务边界的权衡)
10. [常见的 DDD 反模式](#10-常见的-ddd-反模式)

---

## 1. 为什么银行系统特别需要 DDD

银行系统的业务逻辑有多复杂？让我用一个具体的例子说明。

假设你要建模一个简单的"跨境汇款"功能，直觉上你可能认为：

```
用户输入金额 → 选择收款人 → 确认汇率 → 发起汇款 → 完成
```

实际上，背后涉及：

```
资金来源账户余额校验
↓
外汇兑换（实时询价，可能失败）
↓
中间行路由选择（成本最低路线）
↓
SWIFT 报文生成（MT103 格式，几十个必填字段）
↓
监管合规检查（AML 筛查、制裁名单扫描）
↓
交易限额检查（日累计、月累计、单一客户限额）
↓
资金冻结（原账户扣款但不解冻）
↓
等待清算确认（SWIFT 确认报文到达）
↓
收款行入账（中间行可能再扣一次手续费）
↓
交易完成或失败退款（可能需要人工介入）
```

每一个步骤都是一个独立的业务领域概念，都有其内部规则、相互依赖和边界。这种复杂度下，**用贫血领域模型（Anemic Domain Model）堆砌 Service 层**的结果就是：

- 业务规则散落在数百行 Service 代码中
- 改一个限额规则要改 N 个文件
- 测试覆盖率上不去，改动影响不可预测
- 新人对业务逻辑的理解成本极高

DDD 的核心价值：**把业务复杂度从"代码组织"问题，变成"概念建模"问题**。

---

## 2. DDD 核心概念快速梳理

在深入之前，快速建立共同语言：

```
┌─────────────────────────────────────────────────────┐
│  战略设计（Strategic）                                │
│  → 定义"我们做什么"，划定边界                        │
├─────────────────────────────────────────────────────┤
│  Bounded Context（限界上下文）                       │
│  → 一个独立的业务领域，有自己的模型和语言            │
│  Ubiquitous Language（全限定语言）                    │
│  → 团队共同使用的无歧义业务术语                      │
│  Context Map（上下文映射）                            │
│  → 不同 Context 之间的协作关系                      │
├─────────────────────────────────────────────────────┤
│  战术设计（Tactical）                                │
│  → 定义"怎么做"，实现细节                          │
├─────────────────────────────────────────────────────┤
│  Entity（实体）                                      │
│  → 有唯一标识，生命周期内标识不变                   │
│  Value Object（值对象）                              │
│  → 无唯一标识，由属性值定义，不可变                  │
│  Aggregate（聚合）                                    │
│  → 一组相关对象的集群，有统一根（聚合根）            │
│  Domain Event（领域事件）                            │
│  → 业务中发生的重要事件                             │
│  Domain Service（领域服务）                           │
│  → 不属于任何单个实体的业务行为                     │
│  Repository（仓储）                                  │
│  → 聚合的持久化抽象                                 │
└─────────────────────────────────────────────────────┘
```

---

## 3. 战略设计：划分 Bounded Context

### 3.1 银行核心系统的 Context Map

用跨境汇款业务为例，银行系统的 Bounded Context 划分大致如下：

```
┌─────────────────────────────────────────────────────────────────┐
│                        Customer Context                          │
│  客户注册、KYC 认证、客户关系管理                                │
│  核心概念：Customer, KYCStatus, CustomerSegment                  │
│  与其他 Context 的关系：提供客户信息服务                        │
└─────────────────────────────────────────────────────────────────┘
         ↓ 客户信息服务（Customer → Account 映射）
┌─────────────────────────────────────────────────────────────────┐
│                         Account Context                          │
│  账户开立、余额管理、账户状态                                    │
│  核心概念：Account, Balance, AccountType, AccountStatus            │
│  聚合：Account（聚合根），Balance（值对象）                     │
└─────────────────────────────────────────────────────────────────┘
         ↓ 账户余额查询、扣款指令
┌─────────────────────────────────────────────────────────────────┐
│                      Transaction Context                         │
│  交易发起、交易路由、交易状态跟踪                                │
│  核心概念：Transaction, TransactionType, TransactionStatus         │
│  聚合：Remittance（跨境汇款聚合）                                │
└─────────────────────────────────────────────────────────────────┘
         ↓ 汇率查询、汇率锁定
┌─────────────────────────────────────────────────────────────────┐
│                       Treasury Context                            │
│  外汇兑换、资金池管理、流动性管理                                 │
│  核心概念：FXQuote, CurrencyPair, LiquidityPool                  │
│  聚合：FXDeal（外汇交易聚合）                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓ 合规检查请求
┌─────────────────────────────────────────────────────────────────┐
│                      Compliance Context                          │
│  AML 筛查、制裁名单扫描、监管报送                                │
│  核心概念：ComplianceCheck, RiskScore, SanctionMatch            │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 上下文之间的映射关系

```java
// Context Map 的几种典型关系：

// 1. 客户-账户（Customer → Account）
// 关系：Customer Context 向下游 Account Context 提供客户信息服务
// 模式：防腐层（Anti-Corruption Layer, ACL）
// 原因：Account Context 不应直接依赖 Customer 的内部模型

// AccountContext 使用的客户信息（独立的 DTO/Value Object）
public record CustomerReference(
    CustomerId customerId,
    CustomerSegment segment,
    RiskRating riskRating,
    List<String> permittedCurrencies
) {}

// AccountContext 中的 ACL：将外部模型转换为内部模型
@Service
public class CustomerAcl {
    private final CustomerServicePort customerService;  // 外部客户服务的接口

    public CustomerReference toCustomerReference(CustomerDTO dto) {
        return new CustomerReference(
            CustomerId.of(dto.customerId()),
            mapSegment(dto.businessType()),
            dto.riskRating(),
            dto.currencyPermissions()
        );
    }
}


// 2. 交易-合规（Transaction → Compliance）
// 关系：Transaction Context 需要合规检查才能完成交易
// 模式：发布-订阅语言（Published Language）
// Transaction 发布 ComplianceRequired 事件
// Compliance Context 订阅并处理

// 3. 账户-交易（Account ↔ Transaction）
// 关系：紧密协作，账户余额是交易的前置条件和后置结果
// 模式：共享内核（Shared Kernel）
// 两个 Context 共享同一个 AccountId 和 Money 值对象定义
// 前提：必须有明确的共享契约，两个团队协作紧密
```

### 3.3 Ubiquitous Language 示例

```
业务术语 vs 技术术语 的映射——这是 DDD 中最容易被忽视的环节

┌──────────────────┬──────────────────────┬──────────────────────────┐
│ 业务语言          │ DDD 概念              │ 技术实现                 │
├──────────────────┼──────────────────────┼──────────────────────────┤
│ "汇款"           │ Remittance（聚合根）  │ RemittanceAggregate     │
│ "收款人账户"      │ Beneficiary（实体）   │ BeneficiaryEntity       │
│ "汇款金额"        │ SourceAmount（值对象）│ Money + Currency        │
│ "交易状态"        │ TransactionStatus     │ Status enum + State      │
│ "外汇汇率"        │ FXQuote（值对象）     │ FXQuote VO              │
│ "合规审查通过"    │ ComplianceApproved    │ Domain Event             │
│ "账户被冻结"      │ AccountSuspended     │ Domain Event             │
│ "超出日限额"      │ DailyLimitExceeded   │ Domain Exception         │
└──────────────────┴──────────────────────┴──────────────────────────┘

原则：团队中任何人说"汇款"，都指的是 Remittance 这个聚合
      而不是散落在 Service 层各处的 String transactionType = "REMITTANCE"
```

---

## 4. 战术设计：聚合、实体与值对象

### 4.1 实体 vs 值对象

这是 DDD 战术设计的第一个分叉路口：

```
实体（Entity）：有唯一标识
  - 即使所有属性都相同，只要 ID 不同，就是不同对象
  - 例如：Account(ACC-001) ≠ Account(ACC-002)
  - 生命周期中标识不变

值对象（Value Object）：无唯一标识，由属性值定义
  - 两个 Money(1000, HKD) 是相等的，不需要区分
  - 不可变：创建后不能修改，只能替换
  - 用来表达"度量"或"描述性概念"
```

```java
// ========== 值对象（Value Object）==========

// 货币金额：纯值对象，不可变
public record Money(
    BigDecimal amount,
    Currency currency
) {
    // 工厂方法：保证创建时校验
    public static Money of(BigDecimal amount, Currency currency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException("金额不能为负数");
        }
        return new Money(amount.setScale(2, RoundingMode.HALF_UP), currency);
    }

    // 值对象的运算：返回新的 Money（不修改原对象）
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new DomainException("货币类型不一致，无法相加");
        }
        return new Money(this.amount.add(other.amount), this.currency);
    }

    // 格式化显示
    public String format() {
        return "%s %,.2f".formatted(currency.getSymbol(), amount);
    }
}

// 货币类型
public enum Currency {
    HKD("HK$", 2),
    USD("US$", 2),
    EUR("€", 2),
    CNY("¥", 2);

    private final String symbol;
    private final int decimalPlaces;

    Currency(String symbol, int decimalPlaces) {
        this.symbol = symbol;
        this.decimalPlaces = decimalPlaces;
    }

    public String getSymbol() { return symbol; }
}

// 汇率引用：值对象
public record FXRate(
    CurrencyPair pair,
    BigDecimal rate,
    Instant quotedAt,
    Instant expiresAt
) {
    public BigDecimal convert(Money source) {
        if (!source.currency().equals(pair.source())) {
            throw new DomainException("源货币不匹配");
        }
        BigDecimal targetAmount = source.amount().multiply(rate)
            .setScale(pair.target().decimalPlaces(), RoundingMode.HALF_UP);
        return new Money(targetAmount, pair.target());
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}

// ========== 实体（Entity）==========

// 收款人：实体，有唯一标识
public class Beneficiary implements IdentifiedEntity {
    private final BeneficiaryId id;
    private AccountNumber accountNumber;
    private String beneficiaryName;
    private BankCode receivingBankCode;
    private BeneficiaryStatus status;  // ACTIVE, SUSPENDED, CLOSED
    private List<RiskFlag> riskFlags;

    // 受保护构造函数：通过工厂方法创建
    protected Beneficiary(BeneficiaryId id,
                         AccountNumber accountNumber,
                         String beneficiaryName,
                         BankCode receivingBankCode) {
        this.id = Objects.requireNonNull(id);
        this.accountNumber = Objects.requireNonNull(accountNumber);
        this.beneficiaryName = Objects.requireNonNull(beneficiaryName);
        this.receivingBankCode = Objects.requireNonNull(receivingBankCode);
        this.status = BeneficiaryStatus.ACTIVE;
        this.riskFlags = new ArrayList<>();
    }

    // 实体行为：状态变更
    public void suspend(RiskFlag reason) {
        if (this.status == BeneficiaryStatus.CLOSED) {
            throw new DomainException("已关闭的收款人不能再暂停");
        }
        this.status = BeneficiaryStatus.SUSPENDED;
        this.riskFlags.add(reason);
        // 领域事件发布
        DomainEvents.publish(
            new BeneficiarySuspended(this.id, reason, Instant.now())
        );
    }

    public AccountNumber getAccountNumber() { return this.accountNumber; }
    public BeneficiaryId getId() { return this.id; }
}
```

---

## 5. 聚合根与事务边界

### 5.1 为什么聚合设计是 DDD 中最难的部分

聚合（Aggregate）是 DDD 中最关键的战术决策：**它定义了事务的边界**。

银行系统的经验法则：**一个聚合 = 一个事务 = 一个最终一致性边界**

```java
// ❌ 反模式：跨聚合的数据库事务（分布式系统中的禁忌）
// 把应该分开的事务强行合并

@Service
public class RemittanceService_BAD {
    @Transactional  // 这个事务跨越了多个聚合根！
    public RemittanceResult executeRemittance(...) {
        Account account = accountRepo.findById(accountId);
        account.debit(amount);           // 修改 Account 聚合

        Remittance remittance = new Remittance(...);
        remittanceRepo.save(remittance);  // 保存 Remittance 聚合

        // 如果这步抛异常，Account 的修改已经提交了
        // 跨服务的情况下会导致分布式事务问题
        complianceService.check(remittance);
    }
}

// ✅ 正确模式：每个聚合在自己的事务中
// 跨聚合的协作通过领域事件（Eventual Consistency）实现

@Service
public class RemittanceApplicationService {

    // 1. 第一步：在自己的事务中创建汇款请求
    @Transactional
    public RemittanceCreated createRemittance(CreateRemittanceCommand cmd) {
        // 创建 Remittance 聚合（自己的事务）
        Remittance remittance = Remittance.create(cmd);
        remittanceRepo.save(remittance);

        // 发布领域事件，触发后续流程
        DomainEvents.publish(
            new RemittanceRequested(
                remittance.id(),
                cmd.sourceAccountId(),
                cmd.targetAmount()
            )
        );

        return new RemittanceCreated(remittance.id());
    }

    // 2. 合规检查通过后的处理（另一个事务）
    @Transactional
    public void handleComplianceApproved(ComplianceCheckPassed event) {
        Remittance remittance = remittanceRepo.findById(event.remittanceId());
        remittance.recordComplianceApproved(event.checkId());
    }
}
```

### 5.2 汇款聚合的完整实现

```java
// ========== 汇款聚合根（Remittance Aggregate）==========

public class Remittance implements AggregateRoot<RemittanceId> {
    private final RemittanceId id;
    private final SourceAccountId sourceAccountId;
    private final Beneficiary beneficiary;
    private final SourceAmount sourceAmount;      // 值对象
    private final TargetAmount targetAmount;       // 值对象（换汇后）
    private final FXRate appliedFXRate;           // 值对象
    private RemittanceStatus status;
    private Instant createdAt;
    private Instant lockedFXRateExpiresAt;

    // 私有构造函数：强制通过工厂方法创建
    private Remittance(Builder builder) {
        this.id = builder.id;
        this.sourceAccountId = builder.sourceAccountId;
        this.beneficiary = builder.beneficiary;
        this.sourceAmount = builder.sourceAmount;
        this.targetAmount = builder.targetAmount;
        this.appliedFXRate = builder.appliedFXRate;
        this.status = RemittanceStatus.CREATED;
        this.createdAt = Instant.now();
        this.lockedFXRateExpiresAt = Instant.now().plusSeconds(30);
    }

    // 聚合工厂方法：创建汇款申请
    public static Remittance create(CreateRemittanceCommand cmd) {
        // 业务规则前置检查（fail-fast）
        cmd.validate();  // 抛出 DomainException 如果参数无效

        Beneficiary beneficiary = cmd.beneficiary();
        if (beneficiary.isSuspended()) {
            throw new BusinessRuleViolation(
                "BENF_001",
                "收款人账户已被暂停，无法发起汇款"
            );
        }

        SourceAmount sourceAmount = SourceAmount.of(cmd.sourceAmount(), cmd.sourceCurrency());
        FXRate fxRate = cmd.fxRate();
        TargetAmount targetAmount = fxRate.convert(sourceAmount);

        return new Remittance.Builder()
            .id(RemittanceId.generate())
            .sourceAccountId(cmd.sourceAccountId())
            .beneficiary(beneficiary)
            .sourceAmount(sourceAmount)
            .targetAmount(targetAmount)
            .appliedFXRate(fxRate)
            .build();
    }

    // 聚合的业务行为：执行扣款
    public void debitSourceAccount(IAccountReader accountReader,
                                   IAccountWriter accountWriter) {
        // 前置条件检查
        assertStatus(RemittanceStatus.CREATED);

        if (Instant.now().isAfter(lockedFXRateExpiresAt)) {
            throw new BusinessRuleViolation(
                "FX_001",
                "汇率锁定已过期，请重新询价"
            );
        }

        // 读取账户（读操作，通过接口解耦）
        AccountSnapshot snapshot = accountReader.getSnapshot(sourceAccountId);
        if (snapshot.availableBalance().compareTo(sourceAmount.amount()) < 0) {
            throw new InsufficientBalanceException(
                sourceAccountId,
                sourceAmount,
                snapshot.availableBalance()
            );
        }

        // 执行扣款（写操作，通过接口解耦）
        accountWriter.freezeBalance(
            sourceAccountId,
            sourceAmount,
            "Remittance freeze: " + id.value()
        );

        // 状态推进
        this.status = RemittanceStatus.SOURCE_DEBITED;

        // 发布领域事件
        DomainEvents.publish(
            new SourceAccountDebited(
                this.id,
                sourceAccountId,
                sourceAmount,
                snapshot.balanceAfterDebit()
            )
        );
    }

    // 聚合的业务行为：标记合规审查通过
    public void recordComplianceApproved(ComplianceCheckId checkId) {
        assertStatus(RemittanceStatus.PENDING_COMPLIANCE);

        this.status = RemittanceStatus.COMPLIANCE_APPROVED;
        this.internalComplianceCheckId = checkId;

        DomainEvents.publish(
            new ComplianceApproved(this.id, checkId, Instant.now())
        );
    }

    // 聚合的业务行为：提交清算
    public void submitForSettlement(Instant settlementDeadline) {
        assertStatus(RemittanceStatus.COMPLIANCE_APPROVED);

        if (Instant.now().isAfter(settlementDeadline)) {
            throw new BusinessRuleViolation("SETTLEMENT_001", "超过清算截止时间");
        }

        this.status = RemittanceStatus.SUBMITTED_FOR_SETTLEMENT;

        DomainEvents.publish(
            new RemittanceSubmittedForSettlement(
                this.id,
                beneficiary.receivingBankCode(),
                targetAmount,
                settlementDeadline
            )
        );
    }

    // 状态查询方法（供应用服务/接口层使用）
    public boolean canCancel() {
        return status == RemittanceStatus.CREATED
            || status == RemittanceStatus.SOURCE_DEBITED;
    }

    private void assertStatus(RemittanceStatus expected) {
        if (this.status != expected) {
            throw new BusinessRuleViolation(
                "状态前置条件不满足：期望 " + expected + "，实际 " + this.status
            );
        }
    }

    // Getters
    public RemittanceId getId() { return id; }
    public RemittanceStatus getStatus() { return status; }
}
```

---

## 6. 领域事件：解耦业务系统

### 6.1 什么是领域事件

领域事件是 DDD 中实现**最终一致性（Eventual Consistency）**的核心手段。当一个聚合的状态发生变化时，发布一个领域事件，通知其他聚合（可能在其他服务中）做出响应。

```
同步调用（紧耦合）：
  AccountService.debit() → ComplianceService.check()
  问题：AccountService 依赖 ComplianceService，任何改动都耦合

领域事件（松耦合）：
  AccountService.debit()
    → 发布 SourceAccountDebited 事件
    → Compliance Context 订阅并处理
    → 两个 Context 完全独立，各自可以独立演进
```

### 6.2 领域事件的完整实现

```java
// ========== 领域事件定义 ==========

// 事件是值对象，不可变
public record SourceAccountDebited(
    RemittanceId remittanceId,
    SourceAccountId accountId,
    Money debitedAmount,
    Money remainingBalance,
    Instant occurredAt
) implements DomainEvent {

    @Override
    public Instant occurredOn() {
        return occurredAt;
    }

    @Override
    public String aggregateId() {
        return remittanceId.value();
    }
}

public record ComplianceApproved(
    ComplianceCheckId checkId,
    RemittanceId remittanceId,
    Instant approvedAt
) implements DomainEvent {

    @Override
    public Instant occurredOn() { return approvedAt; }
    @Override
    public String aggregateId() { return remittanceId.value(); }
}


// ========== 事件发布机制 ==========

public interface DomainEvents {
    static void publish(DomainEvent event) {
        DomainEventPublisher.instance().publish(event);
    }
}

@Service
public class DomainEventPublisher {
    private final ApplicationEventPublisher publisher;
    private final OutboxRepository outboxRepo;

    public void publish(DomainEvent event) {
        // 1. 写入 Outbox 表（确保事件不丢失）
        outboxRepo.save(
            OutboxEntry.builder()
                .eventId(EventId.generate())
                .eventType(event.getClass().getSimpleName())
                .payload(serialize(event))
                .aggregateId(event.aggregateId())
                .occurredAt(event.occurredOn())
                .status(OutboxStatus.PENDING)
                .retryCount(0)
                .build()
        );

        // 2. 同时通过 Spring 的 ApplicationEventPublisher 同步发布
        // （也可以选择只在 outbox 中，由后台任务处理）
        publisher.publishEvent(new DomainEventWrapper(event));
    }
}


// ========== 事件订阅处理 ==========

// 在 Compliance Context 中订阅 Account Context 的事件
@Component
public class RemittanceEventListener {

    @EventListener
    @Async  // 异步处理，不阻塞主流程
    public void handleSourceAccountDebited(DomainEventWrapper wrapper) {
        if (!wrapper.event().getClass().getSimpleName()
                .equals("SourceAccountDebited")) {
            return;
        }

        SourceAccountDebited event = (SourceAccountDebited) wrapper.event();

        // 发起合规检查
        ComplianceCheck check = complianceService.initiateCheck(
            ComplianceCheckRequest.builder()
                .remittanceId(event.remittanceId())
                .accountId(event.accountId())
                .amount(event.debitedAmount())
                .beneficiary(event.remittanceId()) // 需要额外获取
                .build()
        );

        if (check.isPassed()) {
            DomainEvents.publish(
                new ComplianceApproved(check.id(), event.remittanceId(), Instant.now())
            );
        } else {
            DomainEvents.publish(
                new ComplianceRejected(check.id(), event.remittanceId(),
                    check.rejectionReason())
            );
        }
    }
}
```

---

## 7. DDD 在汇丰支付系统中的实际应用

### 7.1 支付系统的 Context Map（简化版）

```
┌──────────────────────────────────────┐
│     Payments Hub Context              │
│  支付指令路由、清分、状态管理         │
│  聚合：PaymentInstruction             │
└────────────┬─────────────────────────┘
             │
    发布 PaymentSubmitted
             ↓
┌────────────┴──────────────────────────┐
│     Core Banking Context              │
│  账户余额、账务处理、会计分录         │
│  聚合：Account, LedgerEntry           │
└────────────┬─────────────────────────┘
             │
    发布 AccountDebited / AccountCredited
             ↓
┌────────────┴──────────────────────────┐
│     Messaging / Settlement Context     │
│  SWIFT 报文生成、清算指令发送         │
│  聚合：SWIFTMessage, SettlementJob    │
└──────────────────────────────────────┘
```

### 7.2 实践中遇到的问题和解决方案

**问题 1：聚合边界画错了**

最初把 Beneficiary 建模为 Remittance 聚合内部的实体（嵌套对象）。后来发现合规 Context 也需要访问和修改 Beneficiary 的状态。不得不把 Beneficiary 拆出来变成独立的聚合，通过 ID 引用。

教训：**先用粗粒度的 Context Map，聚合边界在理解加深后迭代调整，不要一开始就追求完美**。

**问题 2：领域事件太多，性能下降**

每个状态变更都发布领域事件 → 事件处理器链路过长 → 端到端延迟从 200ms 飙升到 3 秒。

解决方案：**区分同步事件和异步事件**
- 核心业务状态变更（合规审查结果）：同步，事件必须被处理才能继续
- 非核心旁路逻辑（日志、通知、分析）：异步，通过消息队列处理

**问题 3：团队对 Ubiquitous Language 的理解不一致**

同样的"账户"概念，在 Account Context 中指的是 Account 聚合，在 Treasury Context 中指的是流动性账户（Liquidity Pool），在 Reporting Context 中指的是报表视角的账户。

解决方案：**每个 Context 有自己的模型图（Model Canvas），并在 Wiki 中明确标注每个术语的 Context 归属**。

---

## 8. 从贫血模型到富领域模型

这是 DDD 落地最常见的阻力：从 Service 堆砌代码迁移到真正的领域模型。

### 8.1 贫血模型的典型特征

```java
// ❌ 贫血领域模型：对象只是数据容器，所有行为都在 Service 中

@Entity
@Table(name = "accounts")
public class Account {
    @Id
    private String id;
    private BigDecimal balance;
    private String currency;
    private String status;

    // Getter/Setter...（大量样板代码）

    // 无任何业务行为
}

@Service
public class AccountService {
    public void debit(String accountId, BigDecimal amount) {
        Account account = accountRepo.findById(accountId);

        // 余额校验在 Service 中
        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException();
        }

        // 状态校验在 Service 中
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new AccountNotActiveException();
        }

        // 修改在 Service 中
        account.setBalance(account.getBalance().subtract(amount));
        account.setLastModified(Instant.now());

        accountRepo.save(account);

        // 审计日志在 Service 中
        auditLog.log(accountId, "DEBIT", amount);
    }
}

// 问题：
// 1. 业务规则分散在 Service 中，新人不理解
// 2. 测试时要 mock AccountRepo，验证逻辑无法独立测试
// 3. 如果有多个 Service 都需要扣款逻辑，代码重复
```

### 8.2 富领域模型改造

```java
// ✅ 富领域模型：行为和数据封装在一起

@Entity
@Table(name = "accounts")
public class Account implements AggregateRoot<AccountId> {
    @Id
    private AccountId id;
    private BigDecimal balance;  // 内部表示，尽量不暴露原始 BigDecimal
    private Currency currency;
    private AccountStatus status;
    private Instant lastModified;

    // 私有构造函数（通过工厂方法创建）
    protected Account() {}  // JPA 需要无参构造函数

    // 聚合行为：扣款（核心业务逻辑内聚在此）
    public LedgerEntry debit(Money amount, String reason) {
        // 前置条件校验
        this.assertActive();
        this.assertSufficientBalance(amount);
        this.assertCurrencyMatches(amount.currency());

        // 执行扣款
        BigDecimal newBalance = this.balance.subtract(amount.amount());
        this.balance = newBalance;
        this.lastModified = Instant.now();

        // 返回账务分录（领域事件和账务记录合二为一）
        LedgerEntry entry = LedgerEntry.builder()
            .id(LedgerEntryId.generate())
            .accountId(this.id)
            .entryType(DEBIT)
            .amount(amount)
            .balanceAfter(this.balance)
            .reason(reason)
            .occurredAt(Instant.now())
            .build();

        // 发布领域事件
        DomainEvents.publish(new AccountDebited(this.id, amount, reason));

        return entry;
    }

    private void assertActive() {
        if (this.status != AccountStatus.ACTIVE) {
            throw new AccountNotActiveException(this.id, this.status);
        }
    }

    private void assertSufficientBalance(Money amount) {
        if (this.balance.compareTo(amount.amount()) < 0) {
            throw new InsufficientBalanceException(
                this.id, amount, new Money(this.balance, amount.currency())
            );
        }
    }

    private void assertCurrencyMatches(Currency currency) {
        if (this.currency != currency) {
            throw new CurrencyMismatchException(this.currency, currency);
        }
    }
}

// Service 层大幅简化：只负责编排和事务管理
@Service
@Transactional
public class AccountApplicationService {

    public DebitResult executeDebit(DebitCommand cmd) {
        Account account = accountRepo.findById(cmd.accountId());

        // 核心业务逻辑在聚合中执行
        LedgerEntry entry = account.debit(cmd.amount(), cmd.reason());

        // 持久化
        accountRepo.save(account);

        return new DebitResult(entry);
    }
}
```

---

## 9. DDD 与微服务边界的权衡

### 9.1 DDD 助记符：Bounded Context ≠ 微服务

这是最常见的误解。**Bounded Context 是业务边界，微服务是部署单元**，两者不一定要一一对应。

```
一张表格说明关系：

┌──────────────────┬──────────────────┬──────────────────┐
│ Bounded Context  │ 可能的部署方式    │ 何时拆分          │
├──────────────────┼──────────────────┼──────────────────┤
│ 一个 Context     │ 一个微服务 ✓      │ 业务独立演进需求高│
│ 一个 Context     │ 多个微服务 ✓      │ 团队规模大，需要  │
│                  │                  │ 按子域分工        │
│ 多个 Context     │ 一个单体 ✓        │ 早期探索阶段，    │
│                  │                  │ Context 边界不确定│
└──────────────────┴──────────────────┴──────────────────┘
```

### 9.2 银行系统的实际做法

```
汇丰的做法：渐进式拆分

阶段 1（单体或少数几个大服务）：
- 先在一个服务中按 DDD 思想建模
- 使用 Package/Module 区分 Bounded Context
- Repository 接口按聚合根定义
- 领域事件通过 Spring ApplicationEvent 或本地队列解耦

阶段 2（按 Context 拆分为独立服务）：
- 等 Context 边界稳定（通常需要 6-12 个月）
- 识别跨 Context 的集成点（ACL、Published Language）
- 按团队边界（Two-Pizza Team）优先拆分高独立性的 Context
- Treasury Context 通常最先拆分（因为外汇交易独立性强）

阶段 3（持续细化）：
- 大 Context 内部按子域再拆分
- 例如：Account Context → Balance 子域 + Limit 子域 + Freeze 子域
```

---

## 10. 常见的 DDD 反模式

### 10.1 反模式一：把什么都建模成聚合根

```
❌ 问题：每个实体都是聚合根，没有明确的事务边界
Account 是聚合根 ✓
Beneficiary 是聚合根 ✓
Transaction 是聚合根 ✓
LedgerEntry 是聚合根 ✓  ← 过度设计了

✅ 解决：聚合根代表"需要事务一致性保护的整体"
LedgerEntry 是 Transaction 聚合内的实体，不是聚合根
只有 Transaction（包含多个 LedgerEntry）才是聚合根
```

### 10.2 反模式二：Service 层变成"上帝类"

```
❌ 问题：Service 层仍然包含所有业务逻辑，领域对象只是数据容器
即"穿着 DDD 外衣的贫血模型"

症状：
- Domain Service 类有 2000 行代码
- Entity 类只有 20 行 getter/setter
- 没有任何领域事件

✅ 解决：把行为移到聚合根中
Domain Service 只处理跨聚合的业务编排
单个聚合内的行为下沉到聚合根
```

### 10.3 反模式三：泛化所有概念为值对象

```
❌ 问题：过度使用值对象，连 AccountId 都建模为值对象

✅ 原则：
- 有生命周期和状态变更的概念 → Entity
- 无标识、由属性值定义、不可变的概念 → Value Object
- AccountId 有唯一标识，应该建模为 Entity（或者 Embeddable ID）
- Money 无标识，由 amount + currency 定义，是经典的值对象
```

### 10.4 反模式四：Event Sourcing 盲目使用

```
❌ 问题：听说 DDD 很火，直接上 Event Sourcing

Event Sourcing 适合：
- 审计要求极高的场景（每笔操作都有历史）
- 需要从历史状态重建的场景
- 复杂业务规则需要回溯的场景

Event Sourcing 不适合：
- 大多数 CRUD 场景（过度工程）
- 查询复杂、聚合根历史不重要的场景

银行部分场景适用：
- 合规审查记录（需要完整历史）
- 账户余额变动历史（监管报送要求）
- 不适合：一般客户信息维护（普通 CRUD 足够）
```

---

## 结语

DDD 不是银弹，但它解决了一个银行系统开发中最根本的问题：**如何让业务复杂度可控**。

三条核心实践：

1. **Ubiquitous Language 第一**：在动笔画图之前，先和业务专家对齐术语表。没有共享语言，后续的一切都会走偏。

2. **聚合边界宁小勿大**：小聚合更容易保证事务一致性，大聚合容易陷入"什么都改不动"的困境。如果不确定，先从一个小聚合开始。

3. **渐进式落地**：不需要一开始就设计完美的 Context Map。先在代码层面实现富领域模型，在模块层面应用战略设计——随着对业务的理解加深，边界自然会清晰。

DDD 的最终目标：**让代码成为业务的精确映射，让技术团队和业务团队用同一种语言工作**。

*Bobot 🦐 | 汇丰科技园 | 2026-03-19*
