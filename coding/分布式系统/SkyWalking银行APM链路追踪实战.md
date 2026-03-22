---
title: SkyWalking 银行可观测性实战：APM 链路追踪与性能诊断
date: 2026-03-22
description: 从 SkyWalking OAP 集群部署到 Java/Node.js Agent 配置，详解银行分布式链路追踪体系、Trace 关联分析、性能瓶颈定位，以及与 OpenTelemetry 的集成策略。
---

# SkyWalking 银行可观测性实战：APM 链路追踪与性能诊断

> "OpenTelemetry 告诉你'哪个接口慢了'，SkyWalking 告诉你'慢在哪里'——是数据库查询？Redis 调用？还是第三方支付接口的响应？链路追踪是银行生产环境性能诊断的标配工具。"

## 前言

在[OpenTelemetry 银行可观测性实战](/coding/工程实践/OpenTelemetry银行可观测性实战)中，我们介绍了指标（Metrics）和日志的采集方案。但银行系统的性能问题往往是跨服务的——一次转账请求经过 API Gateway → Payment Service → Account Service → 数据库，可能涉及 10+ 个节点。

**SkyWalking**（Apache 顶级项目）是银行生产环境最广泛使用的 APM（Application Performance Monitoring）工具，相比 Jaeger、CAT 等方案，SkyWalking 的优势在于：

- **服务拓扑自动发现**：Agent 上报后自动生成服务依赖图
- **数据库/缓存慢查询分析**：精确到 SQL 语句级别
- **银行中间件原生支持**：支持 IBM MQ、Oracle、DB2、Sybase 等银行常用组件
- **多语言 Agent**：Java、Go、Node.js、Python、.NET
- **告警规则丰富**：支持自定义多级告警

## 1. SkyWalking 架构

```
SkyWalking 核心架构：

┌─────────────────────────────────────────────────────────┐
│                    SkyWalking UI                        │
│         服务拓扑 | Trace 列表 | 性能仪表盘 | 告警          │
└──────────────────────┬──────────────────────────────────┘
                       │ GraphQL / REST
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SkyWalking OAP Server（集群）                │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │  Trace Handler │  │  Metrics Handler │                │
│  │  接收 Trace    │  │  聚合 Metrics    │                │
│  └───────┬────────┘  └───────┬────────┘                 │
│          │                    │                           │
│  ┌───────┴────────────────────┴────────┐               │
│  │         索引存储（Elasticsearch）      │               │
│  └────────────────────────────────────────┘               │
│  ┌────────────────────────────────────────┐               │
│  │         指标存储（H2/Elasticsearch）     │               │
│  └────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                       ▲
       Agent 上报（gRPC/HTTP）
       ┌─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Java Agent │  │Node.js Agent│  │ Go Agent   │
│ Payment Svc │  │  Web App    │  │ Account Svc│
└────────────┘  └────────────┘  └────────────┘
```

### 1.1 存储选型

| 存储 | 适用规模 | 优点 | 银行推荐场景 |
|------|---------|------|------------|
| H2 | 单机/开发 | 零配置 | 开发/测试 |
| **Elasticsearch** | 中大规模 | 分布式、支持 Full-text 查询 | **生产推荐** |
| MySQL | 小规模 | 运维简单 | 小团队 |
| TiDB | 大规模 | NewSQL，高可用 | 超大规模银行 |

## 2. OAP Server 集群部署

### 2.1 Kubernetes 部署

```yaml
# skywalking-helm/values.yaml
oap:
  replicaCount: 3  # 生产至少 3 节点

  image:
    repository: apache/skywalking-oap-server
    tag: 9.7.0

  # 存储配置：Elasticsearch
  storage:
    elasticsearch:
      enabled: true
      hosts: elasticsearch-master.logging.svc.cluster.local:9200
      indexShardsNumber: 2
      indexReplicasNumber: 1
      user: ${ES_USER}
      password: ${ES_PASSWORD}

  # gRPC 端口（Agent 连接）
  service:
    ports:
      grpc: 11800
      rest: 12800

  # JVM 资源（高并发场景）
  resources:
    requests:
      cpu: 2000m
      memory: 4Gi
    limits:
      cpu: 4000m
      memory: 8Gi

  # 告警插件
  plugins:
    enabled:
      - alarm
      - kubernetes-module  # 银行 K8s 环境支持

ui:
  replicaCount: 2
  image:
    repository: apache/skywalking-ui
    tag: 9.7.0
  service:
    type: ClusterIP
  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
    hosts:
      - skywalking.bank.internal
    tls:
      - hosts: [skywalking.bank.internal]
        secretName: skywalking-tls
```

```bash
# Helm 部署
helm install skywalking apache/skywalking -n skywalking \
  --create-namespace \
  -f skywalking-helm/values.yaml \
  --set oap.storage.elasticsearch.hosts=$ES_HOSTS
```

### 2.2 高可用配置

```yaml
# OAP 集群配置：多 OAP 节点 + LoadBalancer
apiVersion: v1
kind: Service
metadata:
  name: skywalking-oap-cluster
  namespace: monitoring
spec:
  type: LoadBalancer  # Agent 通过此地址连接
  selector:
    app: skywalking-oap
  ports:
    - name: grpc
      port: 11800
      targetPort: 11800
      protocol: TCP
    - name: rest
      port: 12800
      targetPort: 12800
```

```bash
# Agent 连接多个 OAP 节点（故障转移）
# agent.config
collector.backend_service=oap-1:11800,oap-2:11800,oap-3:11800
```

## 3. Java Agent 部署（Spring Boot）

### 3.1 零代码侵入插桩

SkyWalking 的核心优势：**无需修改业务代码**，通过 Java Agent（JVMTI）自动拦截：

```bash
# 1. 下载 Agent
wget https://archive.apache.org/dist/skywalking/apache-skywalking-apm-9.7.0/apache-skywalking-apm.tar.gz
tar -xzf apache-skywalking-apm.tar.gz

# 2. 目录结构
skywalking-agent/
├── agent/                    # 核心 Agent
│   ├── activations/          # 插件（DB/Redis/MQ 等）
│   ├── plugins/              # 中间件插件
│   └── skywalking-agent.jar  # Java Agent 主 jar
└── config/
    └── agent.conf            # Agent 配置
```

### 3.2 启动参数配置

```bash
# 方式 1：启动脚本追加 JVM 参数（推荐）
java -javaagent:/opt/skywalking-agent/skywalking-agent.jar \
     -Dskywalking.agent.service_name=payment-service \
     -Dskywalking.agent.instance_name=${HOSTNAME} \
     -Dskywalking.collector.backend_service=skywalking-oap:11800 \
     -Dskywalking.plugin.toolkit.log4j2.enable_transmission=true \
     -Dskywalking.logging.dir=/var/log/skywalking \
     -jar payment-service.jar
```

```yaml
# 方式 2：Kubernetes 部署时通过环境变量
# deployment.yaml
env:
  - name: SW_AGENT_NAME
    value: "payment-service"
  - name: SW_AGENT_INSTANCE_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: SW_AGENT_COLLECTOR_BACKEND_SERVICES
    value: "skywalking-oap:11800"
  - name: JAVA_TOOL_OPTIONS
    value: "-javaagent:/opt/skywalking-agent/skywalking-agent.jar"
```

### 3.3 agent.conf 核心配置

```properties
# /opt/skywalking-agent/config/agent.conf

# 服务名（必须唯一，标识此服务在拓扑图中的节点）
agent.service_name=${SW_AGENT_NAME:payment-service}

# OAP 服务器地址（支持逗号分隔多节点）
collector.backend_service=${SW_COLLECTOR_BACKEND:skywalking-oap:11800}

# Agent 采样率（生产环境可降低，减少开销）
agent.sample_n_per_3_secs=${SW_SAMPLE_RATE:10000}

# 追踪内容开关
agent.trace.ignore_path=/healthz,/ready,/metrics,/actuator/**
agent.collect.grpc.log=true

# 插件启用
plugin.toolkit.log4j2.enable_transmission=true   # Log4j2 日志自动关联 Trace
plugin.spring.transaction.simplify=true            # Spring 事务简化显示
plugin.mongodb.trace_parameters=true               # MongoDB 参数记录
plugin.resttemplate.trace_http_params=true        # RestTemplate HTTP 参数记录
```

### 3.4 Trace 关联日志

```xml
<!-- pom.xml：SkyWalking Log4j2 插件 -->
<dependency>
    <groupId>org.apache.skywalking</groupId>
    <artifactId>apm-toolkit-log4j-2.x</artifactId>
    <version>9.7.0</version>
</dependency>
```

```xml
<!-- log4j2.xml：自动在日志中添加 TraceId -->
<Appenders>
    <Console name="Console" target="SYSTEM_OUT">
        <SkyWalkingLog4j2Layout pattern="%d{HH:mm:ss.SSS} [%t] %-5level %logger{36} [%SWTraceId:%SWTraceId] - %msg%n"/>
    </Console>

    <!-- 文件 Appender：SkyWalking 日志收集 -->
    <RollingFile name="RollingFile"
                 fileName="/var/log/payment-service/application.log"
                 filePattern="/var/log/payment-service/application-%d{yyyy-MM-dd}-%i.log.gz">
        <SkyWalkingLog4j2Layout pattern="%d{yyyy-MM-dd HH:mm:ss.SSS} [%t] %-5level %logger{36} [%SWTraceId:%SWTraceId] [%X{sw8-correlation}] - %msg%n"/>
        <Policies>
            <TimeBasedTriggeringPolicy interval="1"/>
            <SizeBasedTriggeringPolicy size="100MB"/>
        </Policies>
        <DefaultRolloverStrategy max="30"/>
    </RollingFile>
</Appenders>
```

日志输出效果：
```
2026-03-22 10:15:23.123 [payment-thread] INFO  c.h.b.p.service.PaymentService [TraceId:7cd5f4a2e3b14d8c] - 转账处理开始: txnId=TXN-123456
2026-03-22 10:15:23.145 [payment-thread] INFO  c.h.b.p.dao.AccountDao [TraceId:7cd5f4a2e3b14d8c] - 查询余额: accountNo=****1234
2026-03-22 10:15:23.567 [payment-thread] ERROR c.h.b.p.service.PaymentService [TraceId:7cd5f4a2e3b14d8c] - 转账失败: reason=余额不足
```

## 4. 数据库与缓存链路追踪

### 4.1 MySQL 慢查询追踪

SkyWalking 自动拦截 JDBC 调用，记录每条 SQL 的执行时间：

```yaml
# agent.conf：开启 SQL 参数记录
plugin.jdbc.trace_sql_parameters=true
plugin.jdbc.sql_parameters_max_length=512
```

SkyWalking UI 中，每条 Trace 的 Span 会显示：

```
Span: MySQL - Execute Query
  ├─ db.instance: jdbc:mysql://mysql-prod:3306/bank_payments
  ├─ db.statement: SELECT * FROM account WHERE account_no = ?
  ├─ db.sql_parameters: ['1234567890']
  ├─ duration: 45ms
  └─ slow: true  ← 自动标记慢查询（> 200ms）
```

### 4.2 Redis 链路追踪

```yaml
# agent.conf
plugin.redis.trace_parameters=true
plugin.redis.values_max_length=128
```

### 4.3 银行特有中间件

```bash
# IBM MQ（银行常用消息队列）支持
# agent.conf
plugin.mq.activate工作组列表=${SW_MQ_WORKGROUPS:*}
plugin.mq.ibm.workmanager_thread_pool_size=16

# Oracle/DB2 数据库支持（大型机银行系统）
plugin.oracle.trace_parameters=true
plugin.dbcp.trace=true
```

## 5. Trace 分析：定位性能瓶颈

### 5.1 Trace 列表

SkyWalking UI 的 Trace 列表展示所有请求：

```
Trace 列表（按响应时间排序）：
┌────────────────────┬────────────────┬─────────────┬────────────┐
│ Trace ID           │ 服务           │ 持续时间    │ 状态       │
├────────────────────┼────────────────┼─────────────┼────────────┤
│ 7cd5f4a2e3b14d8c   │ payment-service│ 2,345 ms   │ 成功 ✓    │
│ 8ab1c3d4e5f67890   │ payment-service│ 12,456 ms  │ 失败 ✗    │
│ 9bc2d4e5f6a7b890   │ account-service│ 45 ms      │ 成功 ✓    │
└────────────────────┴────────────────┴─────────────┴────────────┘
```

### 5.2 Trace 瀑布图：逐层拆解

```
Trace: 7cd5f4a2e3b14d8c (payment-service)
总耗时: 2,345 ms

🟢 [0ms → 5ms]  HTTP GET /api/v1/transfers (入口)
│   🟡 [5ms → 234ms] payment-service: validateRequest()
│   │   🟢 [5ms → 30ms]   Redis: GET cache:rate_limit:user123
│   │   🟢 [30ms → 234ms] DB: SELECT account WHERE id = ?
│   │
│   🟡 [234ms → 1,567ms] payment-service: executeTransfer()
│   │   🟢 [234ms → 245ms]   DB: UPDATE account SET balance = ... (扣款)
│   │   🟢 [245ms → 256ms]   DB: UPDATE account SET balance = ... (入账)
│   │   🟡 [256ms → 1,567ms] RemoteCall: invokeClearingSystem()
│   │   │   🟡 [256ms → 1,200ms] HTTP POST https://clearing.hsbc.com/api/settle
│   │   │   ⚠️  [1,200ms → 1,567ms] 等待清算确认（异步回调，超时 600ms）
│   │   │
│   │   🟢 [1,567ms → 1,580ms] MQ: Send to notify.service (异步通知)
│   │
│   🟡 [1,580ms → 2,345ms] payment-service: recordAudit()
│       🟢 [1,580ms → 2,345ms] DB: INSERT INTO audit_log (...)
```

**瓶颈分析**：总耗时 2,345ms，其中第三方清算接口等待 1,311ms（55%），这是外部依赖，不是应用代码问题。

### 5.3 慢端点分析

```
慢端点排名（过去 1 小时）：
┌────────────────────────────┬──────────┬──────────┬─────────────────┐
│ 端点                       │ 平均耗时  │ P99 耗时 │ 慢调用占比      │
├────────────────────────────┼──────────┼──────────┼─────────────────┤
│ POST /api/v1/transfers     │ 2,345 ms │ 8,234 ms │ 23% (>1s)       │
│ GET /api/v1/accounts/:id   │ 890 ms   │ 2,100 ms │ 15% (>500ms)    │
│ POST /api/v1/payments/batch│ 5,678 ms │ 12,000ms │ 67% (>1s)       │
└────────────────────────────┴──────────┴──────────┴─────────────────┘

→ POST /api/v1/payments/batch 慢调用占比 67%，需要重点优化
```

## 6. 服务拓扑自动发现

SkyWalking Agent 自动收集依赖关系，生成服务拓扑图：

```
银行支付系统服务拓扑：

  ┌──────────────────┐
  │   Mobile App    │──────── HTTP ────────────┐
  └──────────────────┘                          │
                                                ▼
  ┌──────────────────┐   HTTP    ┌──────────────────────┐
  │   API Gateway    │──────────▶│   Payment Service    │
  └──────────────────┘           └──────────┬───────────┘
                                             │
          ┌─────────────────────────────────┼──────────────┐
          │ HTTP                            │ gRPC         │
          ▼                                 ▼              ▼
┌──────────────────┐         ┌────────────────┐  ┌────────────────┐
│  Account Service │         │  Clearing Svc  │  │  Notify Svc    │
│   (12ms avg)     │         │  (外部系统)    │  │   (异步)       │
└────────┬─────────┘         └────────────────┘  └────────────────┘
         │ JDBC
         ▼
┌──────────────────┐
│     MySQL        │
│  (单点, 关注)    │
└──────────────────┘
```

### 6.1 拓扑异常告警

```
拓扑告警规则（自动检测服务离线/异常）：
  ① Account Service 不可达 → 立即告警 P1
  ② MySQL 响应时间 > 500ms → 告警 P2
  ③ 某服务无响应 > 30s → 告警 P1（服务宕机）
```

## 7. 告警规则配置

### 7.1 告警规则 YAML

```yaml
# skywalking-alarm.yml
rules:
  # 规则 1：服务响应时间过高
  service_resp_time_rule:
    metrics-name: service_resp_time
    op: ">"
    threshold: 3000  # 超过 3s
    period: 10        # 10 个周期内
    count: 3          # 触发 3 次
    silence-period: 15m
    message: "服务 {name} 平均响应时间超过 3 秒"

  # 规则 2：服务成功率过低
  service_success_rate_rule:
    metrics-name: service_success_rate
    op: "<"
    threshold: 0.95  # 成功率低于 95%
    period: 10
    count: 2
    message: "服务 {name} 成功率异常，当前成功率 {value}"

  # 规则 3：数据库慢查询
  database_slow_sql_rule:
    metrics-name: db_stmt_metrics
    op: ">"
    threshold: 1000  # SQL 执行超过 1s
    period: 5
    count: 5
    message: "数据库慢查询：{name} 执行时间 {value}ms"

  # 规则 4：服务离线（无心跳）
  service_instance_lived_rules:
    metrics-name: heartbeat
    op: "=="
    threshold: 0
    period: 2
    count: 2
    message: "服务实例 {name} 心跳丢失，可能已下线"

# Webhook 告警通知
cluster:
  alarm:
    default-alarm-level: P2
    webhooks:
      - http://alert-manager.monitoring:9093/api/alerts  # → Prometheus Alertmanager
      - https://slack.webhook.bank.internal/alerts        # → Slack
      - https://teams.bank.internal/webhook/alerts       # → MS Teams
```

### 7.2 集成 AlertManager

```yaml
# Prometheus AlertManager 接收 SkyWalking 告警
# alertmanager.yaml
receivers:
  - name: skywalking
    webhook_configs:
      - url: http://alert-manager.monitoring.svc.cluster.local:9093/api/alerts
        send_resolved: true
        http_config:
          authorization:
            type: Bearer
            credentials: ${ALERTMANAGER_TOKEN}

route:
  group_by: ['alertname']
  routes:
    - match:
        severity: P1
      receiver: pagerduty
    - match:
        severity: P2
      receiver: slack-notify
```

## 8. 与 OpenTelemetry 集成

### 8.1 OAP 作为 OTel Collector

SkyWalking OAP 内置 OTel Receiver，可以直接接收 OpenTelemetry SDK 的数据：

```yaml
# OAP 配置：开启 OTel 接收器
receiver-sharing-server:
  default:
    enabled: true
    port: 11800  # gRPC
    host: 0.0.0.0

otel-receiver:
  enabled: true
  gRPC:
    host: 0.0.0.0
    port: 11890
  HTTP:
    host: 0.0.0.0
    port: 11891
```

```yaml
# OpenTelemetry SDK 配置：上报到 SkyWalking
otel.exporter:
  otlp:
    endpoint: http://skywalking-oap:11890
    protocol: grpc
```

### 8.2 架构演进策略

```
阶段 1（当前）：纯 SkyWalking Agent
  Java Agent → OAP → Elasticsearch → SkyWalking UI

阶段 2（演进）：混合架构
  Java Agent ──┐
  OTel SDK ────┼──▶ OAP（OTel Receiver）──▶ ES ──▶ SkyWalking UI
  Go Agent ────┘              │
                              ├──▶ Grafana（利用 SkyWalking 存储）
                              └──▶ 自定义分析平台
```

## 9. 银行合规：数据治理

### 9.1 Trace 数据脱敏

```yaml
# agent.conf：敏感字段过滤
agent.customIZATION.activated=true
agent.customization.filter.enabled=true

# 过滤规则：脱敏账号、手机号等敏感信息
# customization filter class 实现
```

### 9.2 数据保留策略

```yaml
# Elasticsearch ILM 策略：Trace 数据滚动删除
# 按银行合规要求：Trace 保留 30 天，汇总指标保留 1 年

PUT _ilm/policy/skywalking-trace
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "7d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

---

*相关阅读：[OpenTelemetry 银行可观测性实战](/coding/工程实践/OpenTelemetry银行可观测性实战) · [分布式系统可观测性实战](/coding/架构心得/分布式系统可观测性实战) · [Kubernetes 监控与告警银行生产实战](/coding/Kubernetes/Kubernetes监控与告警-银行生产实战)*
