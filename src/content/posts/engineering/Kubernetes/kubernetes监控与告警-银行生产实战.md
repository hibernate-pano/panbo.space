---
title: Kubernetes 监控与告警：Prometheus + Grafana 银行生产实战
summary: >-
  从 Metrics Server 到 Prometheus Operator，从 HPA 弹性伸缩到 PagerDuty 告警，详解银行
  Kubernetes 生产环境的完整可观测性体系设计与 SLO 告警实践。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Kubernetes
tags: []
featured: false
draft: false
slug: kubernetes监控与告警-银行生产实战
legacyPaths:
  - /coding/Kubernetes/Kubernetes监控与告警-银行生产实战
---
> "Kubernetes 跑起来了，然后呢？没有监控的 K8s 集群就像一架没有仪表盘的飞机——你只知道它在天上，不知道油量、速度、引擎状态。"

## 前言

在银行生产环境里，Kubernetes 集群的监控不仅是运维问题，更是**合规要求**：SWIFT 要求的交易 SLA（99.9%）、监管对系统可用性的要求，都需要精确的数据支撑。没有可观测性，弹性伸缩无从谈起，SLO 告警也无从实现。

## 1. Kubernetes 监控体系三层架构

```
┌──────────────────────────────────────────────────────┐
│                    数据展示层                          │
│              Grafana Dashboard                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ 集群总览     │  │ 服务详情      │  │ 告警管理  │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
└────────────────────────────┬───────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────┐
│                    指标采集层                          │
│              Prometheus Stack                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ node-exporter│  │ kube-state   │  │ app-metr │  │
│  │ (节点指标)    │  │ (K8s 状态)   │  │ (应用)   │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ cadvisor     │  │ blackbox     │  │ redis-exp│  │
│  │ (容器资源)   │  │ (HTTP/TCP)   │  │ (Redis)  │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
└────────────────────────────┬───────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────┐
│                    数据来源层                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐        │
│  │ Linux节点 │  │ K8s API  │  │ 应用 Expose │        │
│  │ (内核)   │  │ (etcd)   │  │ (Pod ports) │        │
│  └──────────┘  └──────────┘  └──────────────┘        │
└──────────────────────────────────────────────────────┘
```

## 2. kube-prometheus-stack：一键部署

Helm 是最推荐的部署方式：

```bash
# 1. 添加 Prometheus 社区 Helm 仓库
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts
helm repo update

# 2. 创建独立命名空间（生产环境隔离）
kubectl create namespace monitoring

# 3. 生产配置 values 文件
cat > values-prometheus.yaml << 'EOF'
prometheus:
  prometheusSpec:
    # 保留 30 天指标（银行合规要求）
    retention: 30d

    # 资源限制（根据集群规模调整）
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi

    # 告警管理器配置
    alerting:
      alertmanagers:
        - namespace: monitoring
          name: alertmanager-main
          port: web

    # 自动发现：扫描所有命名空间
    serviceMonitorNamespaceSelector: {}
    serviceMonitorSelector:
      matchLabels:
        team: platform

grafana:
  adminPassword: ${GRAFANA_ADMIN_PASSWORD}

  # 预设银行集群总览仪表板
  dashboardProviders:
    dashboardprovider.yaml:
      apiVersion: 1
      providers:
        - name: 'banking'
          folder: 'Banking'
          type: file
          options:
            path: /var/lib/grafana/dashboards/banking

  # Ingress 配置（内网访问）
  ingress:
    enabled: true
    annotations:
      nginx.ingress.kubernetes.io/auth-type: basic
      nginx.ingress.kubernetes.io/auth-secret: grafana-auth
    hosts:
      - grafana.monitoring.internal

alertmanager:
  config:
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'pagerduty-banking'
      routes:
        - match:
            severity: critical
          receiver: 'pagerduty-banking'
          continue: true
        - match:
            severity: warning
          receiver: 'slack-notifications'

    receivers:
      - name: 'pagerduty-banking'
        pagerdutyConfigs:
          - service_key: '${PAGERDUTY_SERVICE_KEY}'
            severity: critical
            description: "{{ .GroupLabels.alertname }}"
      - name: 'slack-notifications'
        slackConfigs:
          - api_url: '${SLACK_WEBHOOK_URL}'
            channel: '#banking-alerts'
            title: "{{ .GroupLabels.alertname }}"
```

```bash
# 4. 安装
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f values-prometheus.yaml \
  --wait --timeout 10m

# 5. 验证
kubectl get pods -n monitoring
# NAME                                   READY   STATUS
# alertmanager-main-0                    1/1     Running
# prometheus-grafana-7f9b9b9b-xkq2n    2/2     Running
# prometheus-kube-prometheus-operator-0  1/1     Running
# prometheus-kube-state-metrics-0        1/1     Running
# prometheus-prometheus-node-exporter-0  1/1     Running
# prometheus-prometheus-0                2/2     Running
```

## 3. ServiceMonitor：自动发现应用指标

应用指标通过 ServiceMonitor 自动被发现，无需手动配置：

```yaml
# 应用侧：暴露 metrics 端点（Spring Boot Actuator）
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
    prometheus:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: payment-service
      environment: production
      team: payments
```

```yaml
# prometheus-sidecar：ServiceMonitor 声明
# service-monitor-payment-service.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payment-service
  namespace: monitoring
  labels:
    team: payments                    # 必须匹配 prometheus.scrape 配置
    app: payment-service
spec:
  selector:
    matchLabels:
      app: payment-service
  namespaceSelector:
    matchNames:
      - payments
  endpoints:
    # 主服务指标
    - port: web
      path: /actuator/prometheus
      interval: 15s                   # 采集间隔（生产环境 15s 足够）
      scrapeTimeout: 10s
      relabelings:
        # 从标签中提取有用信息
        - sourceLabels: [__meta_kubernetes_pod_name]
          targetLabel: pod
        - sourceLabels: [__meta_kubernetes_namespace]
          targetLabel: namespace
        # 丢弃不需要的指标
        - action: drop
          regex: 'http_server_requests_seconds_(bucket|sum|count)'
          sourceLabels: [__name__]
    # 业务自定义指标（来自 Micrometer）
    - port: web
      path: /actuator/prometheus
      metricRelabelings:
        # 保留银行核心业务指标
        - sourceLabels: [__name__]
          regex: 'payment_(requests|latency|amount).*'
          action: keep
        # 脱敏敏感数据
        - sourceLabels: [account_no]
          targetLabel: account_no_masked
          replacement: "****$1"
          regex: "^(.{6}).*(.{4})$"
```

## 4. 银行核心 SLO 告警规则

SLO（Service Level Objective）是告警的核心：告警触发条件应该是 SLO 被破坏的风险，而不是 SLO 已经被破坏。

```yaml
# prometheus-alerts-banking.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: payment-service-alerts
  namespace: payments
  labels:
    team: payments
    app: payment-service
spec:
  groups:
    # ─── SLO: Error Rate < 0.1% ─────────────────────────
    - name: payment-slo-availability
      interval: 30s
      rules:
        # SLO 预算燃烧率告警（burn rate alert）
        # 5 分钟窗口内错误率 > 0.5% → SLO 可能在 1 小时内被破坏
        - alert: PaymentHighErrorRateBurnRate
          expr: |
            (
              sum(rate(payment_requests_failed_total[5m]))
              /
              sum(rate(payment_requests_total[5m]))
            ) > 0.005
          for: 5m
          labels:
            severity: critical
            slo: availability
            burn_rate: 5m
          annotations:
            summary: "支付服务错误率燃烧率告警"
            description: |
              5 分钟错误率: {{ $value | humanizePercentage }}
              SLO: 可用性 99.9%（错误率 ≤ 0.1%）
              燃烧率: 如果持续此错误率，1 小时内将耗尽 SLO 预算
            runbook_url: "https://runbook.internal/payment/high-error-rate"

        # 即时告警：错误率 > 1%
        - alert: PaymentErrorRateCritical
          expr: |
            (
              sum(rate(payment_requests_failed_total[1m]))
              /
              sum(rate(payment_requests_total[1m]))
            ) > 0.01
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "支付服务错误率超过 1%"
            description: |
              当前 1 分钟错误率: {{ $value | humanizePercentage }}
              请立即检查支付网关状态和数据库连接池

    # ─── SLO: Latency P99 < 500ms ─────────────────────
    - name: payment-slo-latency
      interval: 30s
      rules:
        # P99 延迟 > 500ms（持续 5 分钟）
        - alert: PaymentLatencyP99High
          expr: |
            histogram_quantile(0.99,
              sum(rate(payment_latency_seconds_bucket[5m])) by (le)
            ) > 0.5
          for: 5m
          labels:
            severity: warning
            slo: latency
          annotations:
            summary: "支付服务 P99 延迟超过 500ms"
            description: |
              当前 P99 延迟: {{ $value | humanizeDuration }}
              SLO: P99 ≤ 500ms
              P50: {{ $labels.le }}

        # P99 延迟 > 2 秒（持续 2 分钟）→ 立即告警
        - alert: PaymentLatencyP99Critical
          expr: |
            histogram_quantile(0.99,
              sum(rate(payment_latency_seconds_bucket[2m])) by (le)
            ) > 2
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "支付服务 P99 延迟超过 2 秒"
            description: "立即介入检查，延迟已严重影响用户体验"

    # ─── 资源告警 ───────────────────────────────────────
    - name: payment-resource-alerts
      interval: 60s
      rules:
        # JVM 堆内存 > 85%
        - alert: PaymentJVMMemoryHigh
          expr: |
            jvm_memory_used_bytes{area="heap"} /
            jvm_memory_max_bytes{area="heap"} > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "支付服务 JVM 堆内存使用率超过 85%"
            description: |
              当前使用率: {{ $value | humanizePercentage }}
              可能原因：内存泄漏或流量突增
              Pod: {{ $labels.pod }}

        # K8s Pod 重启次数过多
        - alert: PaymentPodRestartingTooMuch
          expr: |
            increase(kube_pod_container_status_restarts_total{
              namespace="payments",
              pod=~"payment-service-.*"}[1h]) > 3
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: "支付服务 Pod 过去 1 小时重启超过 3 次"
            description: |
              Pod: {{ $labels.pod }}
              重启次数: {{ $value }}
              可能原因：OOMKilled / CrashLoopBackOff

        # Pod 处于 Pending 状态（调度失败）
        - alert: PaymentPodPending
          expr: |
            kube_pod_status_phase{
              namespace="payments",
              phase="Pending"} > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "支付服务 Pod 调度失败"
            description: "Pod 处于 Pending 状态超过 5 分钟，集群资源可能不足"

    # ─── 基础设施告警 ───────────────────────────────────
    - name: payment-infra-alerts
      interval: 60s
      rules:
        # etcd 写入延迟 > 50ms
        - alert: EtcdLatencyHigh
          expr: |
            histogram_quantile(0.99,
              sum(rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) by (le)
            ) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "etcd 写入延迟超过 50ms"
            description: "etcd 性能问题会影响整个集群，立即检查磁盘 IO"

        # API Server 延迟 > 1 秒
        - alert: KubeAPIServerLatencyHigh
          expr: |
            histogram_quantile(0.99,
              sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, verb)
            ) > 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Kubernetes API Server 请求延迟超过 1 秒"
```

## 5. Horizontal Pod Autoscaler（HPA）：自动弹性伸缩

```yaml
# payment-service-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: payments
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service

  # 副本数范围
  minReplicas: 3        # 最低 3 个副本（银行系统最低可用性保证）
  maxReplicas: 20      # 最高 20 个副本

  # 指标定义（多指标组合）
  metrics:
    # CPU 利用率（> 60% → 扩容）
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60

    # 内存利用率（> 70% → 扩容）
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70

    # 自定义指标：支付请求延迟 P99 > 300ms → 扩容
    - type: Pods
      pods:
        metric:
          name: payment_latency_p99
        target:
          type: AverageValue
          averageValue: "300m"  # 300 毫秒

  # 扩容行为配置（K8s 1.27+）
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60   # 扩容冷却 60 秒（防止抖动）
      policies:
        - type: Percent
          value: 100                   # 每次最多翻倍
          periodSeconds: 60
        - type: Pods
          value: 4                     # 或每次最多加 4 个 Pod
          periodSeconds: 60
      selectPolicy: Max                # 取最严格的策略

    scaleDown:
      stabilizationWindowSeconds: 300  # 缩容冷却 5 分钟（银行系统保守）
      policies:
        - type: Pods
          value: 1                     # 每次最多缩掉 1 个 Pod
          periodSeconds: 60
        - type: Percent
          value: 10                   # 或每次最多缩掉 10%
          periodSeconds: 60
      selectPolicy: Min                # 取最保守的策略
```

### 5.1 CronJob 定时预热（应对已知流量高峰）

银行系统的流量通常可预测（日终批处理、大促等），可以在高峰前主动扩容：

```yaml
# cronjob-payment-scaleup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: payment-scaleup
  namespace: payments
spec:
  # 每天上午 9:55 扩容（交易高峰前 5 分钟）
  schedule: "55 9 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: k8s-autoscaler
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
              - /bin/sh
              - -c
              - |
                # 将 HPA 最大副本临时提升到 30
                kubectl patch hpa payment-service-hpa \
                  -n payments \
                  -p '{"spec":{"maxReplicas":30}}'

                # 2 小时后恢复（配合日终批处理结束时间）
                sleep 7200

                kubectl patch hpa payment-service-hpa \
                  -n payments \
                  -p '{"spec":{"maxReplicas":20}}'
            env:
              - name: KUBECONFIG
                value: /etc/kubernetes/config
          restartPolicy: OnFailure
```

## 6. Grafana Dashboard：银行集群总览

```json
{
  "dashboard": {
    "title": "Banking Cluster Overview",
    "timezone": "Asia/Hong_Kong",
    "panels": [
      {
        "title": "集群可用性 SLO",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "(1 - sum(rate(payment_requests_failed_total[30d])) / sum(rate(payment_requests_total[30d]))) * 100",
            "legendFormat": "可用性",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 99.5, "color": "yellow" },
                { "value": 99.9, "color": "green" }
              ]
            },
            "unit": "percent",
            "min": 99.5,
            "max": 100
          }
        }
      },
      {
        "title": "各服务 P99 延迟",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(payment_latency_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{ service }} P99"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(payment_latency_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{ service }} P95"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "lineWidth": 2,
              "fillOpacity": 10
            },
            "unit": "s",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 0.3, "color": "yellow" },
                { "value": 0.5, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "Pod 分布（按命名空间）",
        "type": "piechart",
        "gridPos": { "x": 12, "y": 4, "w": 6, "h": 8 },
        "targets": [
          {
            "expr": "sum(kube_pod_info) by (namespace)"
          }
        ]
      }
    ]
  }
}
```

## 7. 告警收敛：避免告警风暴

```
告警风暴：集群抖动时，100 个 Pod 同时 OOM → 100 条 OOMKilled 告警 → 值班工程师被淹没

解决：Prometheus Alertmanager 聚合 + 分组
```

```yaml
# alertmanager-config.yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

# 告警分组（相同 service 的告警合并为一条）
route:
  group_by: ['alertname', 'namespace', 'service']
  group_wait: 30s          # 等待 30 秒，收集同组告警
  group_interval: 5m       # 组内告警每 5 分钟发送一次更新
  repeat_interval: 4h      # 告警未解决，4 小时重复提醒

  receiver: 'pagerduty'
  routes:
    # 严重告警：立即发送，不等待分组
    - match:
        severity: critical
        slo: availability
      receiver: 'pagerduty-critical'
      group_wait: 0s        # 立即发送
      repeat_interval: 1h   # 每小时重复

    # 基础设施告警：汇总发送
    - match:
        category: infrastructure
      receiver: 'slack-infra'
      group_by: ['cluster']

# 告警静默（Planned Maintenance Window）
inhibit_rules:
  # 节点宕机时，静默该节点上所有 Pod 相关的告警
  - source_match:
      alertname: 'KubeNodeNotReady'
    target_match_re:
      alertname: 'KubePod.+(NotReady|Pending|CrashLoop)'
    equal: ['node']
```

---

*相关阅读：[Kubernetes 快速入门完全指南](/coding/Kubernetes/Kubernetes快速入门完全指南) · [OpenTelemetry 银行可观测性实战](/coding/工程实践/OpenTelemetry银行可观测性实战) · [分布式系统可观测性实战](/coding/架构心得/分布式系统可观测性实战)*
