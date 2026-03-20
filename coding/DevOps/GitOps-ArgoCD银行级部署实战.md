---
title: GitOps 银行级部署：ArgoCD + Helm 在 HSBC 的落地实践
date: 2026-03-20
description: 详解 GitOps 理念、ArgoCD 安装配置、Helm Chart 管理多环境、银行 Vault 密钥注入，以及金丝雀发布与回滚策略。
---

# GitOps 银行级部署：ArgoCD + Helm 在 HSBC 的落地实践

> "在银行，部署不是点一下按钮——它是受控的、可审计的、可回滚的。Git 是唯一的真相来源。"

## 前言

传统 CI/CD 的问题在于：**流水线的终点是集群，但没有人知道集群里实际跑的是什么版本**。

```
传统 CI/CD：
代码 → 构建 → 测试 → 部署到 K8s → 你以为成功了
                                  ↑
                          实际 K8s 里可能有不同的镜像版本
                          （手动干预、紧急 hotfix 没走流水线）
```

GitOps 的核心思想：**Git 是唯一的真相来源（Single Source of Truth）**。集群的 desired state 存在 Git 里，Git 变了你就知道要改什么，实际状态和 Git 不一致就报警。

我在 HSBC 的项目里用 ArgoCD 替代了传统的 Jenkins 部署流水线，本文是实战经验总结。

## 1. GitOps 核心概念

### 1.1 什么是 GitOps？

```
┌─────────────────────────────────────────────────────┐
│                    Git Repository                     │
│              (App Helm Chart + K8s manifests)        │
│                       ▲                              │
│                       │ push（代码变更触发）           │
│                       │                              │
│  ┌────────────────────┴────────────────────────┐   │
│  │              ArgoCD / Flux                    │   │
│  │    持续比对 Git 声明状态 vs 集群实际状态       │   │
│  │    不一致 → 自动同步（合规）或告警             │   │
│  └──────────────────────────────────────────────┘   │
│                       │                              │
│         ArgoCD Sync   ▼                              │
│         ┌──────────────────────┐                    │
│         │    Kubernetes Cluster │                    │
│         │  payment-service:v2.1 │                    │
│         └──────────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

### 1.2 为什么银行必须用 GitOps？

| 传统流水线痛点 | GitOps 解决方案 |
|---------------|----------------|
| 紧急 hotfix 直接改集群，绕过审计 | 所有变更必须走 PR，PR 即审计记录 |
| 生产环境版本不清晰 | Git tag = 部署版本的唯一真相 |
| 回滚靠"重新部署旧版本" | `git revert` + ArgoCD 自动同步 |
| 权限混乱（谁能在生产改配置？） | Git 分支保护 + ArgoCD RBAC |
| 灾难恢复慢 | 重建集群 = ArgoCD 从 Git 拉取全部配置 |

## 2. ArgoCD 安装与配置

### 2.1 生产级安装（HA + RBAC）

```bash
# 使用 Helm 安装 ArgoCD（生产环境）
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

kubectl create namespace argocd

helm install argocd argo/argo-cd \
  --namespace argocd \
  --set server.replicas=3 \
  --set repoServer.replicas=3 \
  --set redis.metrics.enabled=true \
  --set server.metrics.enabled=true \
  --set controller.replicas=3 \
  --values values-production.yaml
```

```yaml
# values-production.yaml
server:
  ingress:
    enabled: true
    ingressClassName: nginx
    annotations:
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    hosts:
      - argocd.hsbctech.internal
    tls:
      - hosts:
          - argocd.hsbctech.internal
        secretName: argocd-tls

# 生产环境关闭匿名访问（银行合规要求）
server:
  configEnabled: true
  rbacConfig: |
    policy.default: role:readonly
    policy.csv: |
      g, hsbc-platform-team, role:admin
      g, payment-dev-team, role:deploy
      g, payment-qa-team, role:deploy
      g, auditors, role:readonly
```

### 2.2 ArgoCD CLI 配置

```bash
# 下载 ArgoCD CLI
brew install argocd

# 登录（初始密码在 Secret 里）
PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)
argocd login argocd.hsbctech.internal \
  --username admin \
  --password "$PASSWORD" \
  --insecure  # 内部地址用自签证书

# 更新 admin 密码（初始密码必须改）
argocd account update-password
```

## 3. 仓库结构设计：银行多环境规范

```
infrastructure/
├── apps/                          # 所有应用 Chart
│   ├── payment-service/
│   │   ├── Chart.yaml
│   │   ├── values.yaml           # 默认值（dev）
│   │   ├── values-staging.yaml
│   │   └── values-prod.yaml      # 生产隔离
│   └── account-service/
│       └── ...
├── base/                          # 共享 K8s 资源模板
│   ├── deployment.yaml
│   ├── service.yaml
│   └── network-policy.yaml         # 银行内网隔离策略
└── environments/
    ├── dev/                        # 开发环境 Application
    │   └── payment-service-app.yaml
    ├── staging/                    # 灰度环境 Application
    │   └── payment-service-app.yaml
    └── prod/                       # 生产环境 Application
        └── payment-service-app.yaml
```

这个结构的核心原则：**不同环境的 Application 资源分开，不同环境的 values 分开，同一 Git 仓库管理**。

## 4. Helm Chart 编写：银行级配置

### 4.1 Chart.yaml

```yaml
# Chart.yaml
apiVersion: v2
name: payment-service
description: HSBC Payment Microservice
version: 2.1.4
appVersion: "2.1.4"
keywords:
  - payment
  - hsbc
  - banking
sources:
  - https://github.com/hibernate-pano/hsbc-payment-service
maintainers:
  - name: HSBC Platform Team
    email: platform@hsbc.com
```

### 4.2 values-prod.yaml（生产环境）

```yaml
# values-prod.yaml
replicaCount: 5                    # 生产最少5副本

image:
  repository: ghcr.io/hibernate-pano/payment-service
  tag: "v2.1.4"                   # 固定镜像标签（不用 latest）
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m                     # 银行限制单 Pod 最大 2C
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

podAntiAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          app: payment-service
      topologyKey: topology.kubernetes.io/zone  # 跨 AZ 分布

vault:
  enabled: true
  agent:
    inject: true
    role: "payment-app"
  secrets:
    - path: "secret/data/payment-service/db"
      key: "password"
    - path: "database/creds/payment-app-role"
      template: "db-creds"

# 安全配置（银行合规）
securityContext:
  runAsNonRoot: true
  runAsUser: 10000
  fsGroup: 10000
  runAsGroup: 10000
  seccompProfile:
    type: RuntimeDefault

podSecurityContext:
  seccompProfile:
    type: RuntimeDefault

# 网络策略：只允许特定服务调用
networkPolicy:
  enabled: true
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: api-gateway
        - namespaceSelector:
            matchLabels:
              name: settlement
      ports:
        - port: 8080
  egress:
    - to:
        - namespaceSelector: {}  # 允许 DNS
      ports:
        - port: 53
          protocol: UDP
        - port: 443

# 就绪探针（银行服务启动慢）
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  initialDelaySeconds: 60
  periodSeconds: 10
  failureThreshold: 5

# 存活探针（保守设置，不轻易重启）
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  initialDelaySeconds: 120
  periodSeconds: 20
  failureThreshold: 5
```

## 5. ArgoCD Application：GitOps 的核心

### 5.1 Application CR 定义

```yaml
# environments/prod/payment-service-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service-prod
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io  # 删除前先清理
  annotations:
    argocd.argoproj.io/sync-wave: "1"          # 同步顺序：先基础资源
spec:
  project: payment-prod                         # 隔离的项目空间
  source:
    repoURL: https://github.com/hibernate-pano/hsbc-infra.git
    targetRevision: main
    path: environments/prod/payment-service
    helm:
      valueFiles:
        - values-prod.yaml
      parameters:                               # 覆盖 Chart 默认值
        - name: image.tag
          value: v2.1.4
        - name: replicaCount
          value: "5"
  destination:
    server: https://kubernetes.default.svc
    namespace: payment-prod

  syncPolicy:
    automated:
      prune: true        # Git 删除资源时，集群同步删除（危险，但银行需要）
      selfHeal: false    # 禁止自动修复（手动审批更安全）
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagation=foreground  # 级联删除
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

  ignoreDifferences:     # 忽略某些字段的差异（由其他 Operator 管理）
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # HPA 管理副本数，不与 Git 同步
```

### 5.2 ArgoCD Projects：隔离团队权限

```yaml
# argocd-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: payment-prod
  namespace: argocd
spec:
  description: Payment Service Production
  sourceRepos:
    - https://github.com/hibernate-pano/hsbc-infra.git
    - https://github.com/hibernate-pano/hsbc-payment-service.git
  destinations:
    - server: https://kubernetes.default.svc
      namespace: payment-prod
    - server: https://kubernetes.default.svc
      namespace: payment-prod-legacy   # 允许向旧命名空间部署

  # 限制可用的 K8s 资源类型
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
    - group: apps
      kind: Deployment
    - group: ""
      kind: Service

  namespaceResourceBlacklist:  # 禁止某些资源（安全）
    - group: ""
      kind: Secret           # Secret 不允许 ArgoCD 直接管理（用 Vault）

  roles:
    # 应用负责人：只能部署，不能改 ArgoCD 配置
    - name: deployer
      description: Deploy applications
      policies:
        - p, proj:payment-prod:deployer,applications,*,payment-prod/payment-service-prod,allow
      groups:
        - hsbc-payment-devs@hsbc.com

    # SRE：完整权限
    - name: sre-admin
      description: SRE full access
      policies:
        - p, proj:payment-prod:sre-admin,*,*,*,allow
      groups:
        - hsbc-sre-team@hsbc.com
```

## 6. Vault 密钥注入：App of Apps 模式

银行不能把 Secret 放在 Git 里。用 Vault Agent Injector + ArgoCD 配合：

### 6.1 Vault Agent Sidecar 模板

在 Helm Chart 里配置 Vault Agent：

```yaml
# templates/vault-agent.yaml
{{- if .Values.vault.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "payment-service.fullname" . }}-vault-agent-config
  annotations:
    argocd.argoproj.io/sync-wave: "0"
type: Opaque
stringData:
  vault-agent-config: |
    {{ $root := . }}
    {{- range .Values.vault.secrets }}
    template:
      secret: {{ include "payment-service.fullname" $root }}-{{ .key | lower }}
      staticSecret:
        path: {{ .path }}
        {{- end }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "payment-service.fullname" . }}
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: {{ .Values.vault.agent.role | quote }}
        vault.hashicorp.com/tls-skip-verify: "false"
        {{- range .Values.vault.secrets }}
        vault.hashicorp.com/agent-inject-secret-{{ .key | lower }}: {{ .path }}
        vault.hashicorp.com/agent-inject-template-{{ .key | lower }}: |
          {{"{{-"}} with secret "{{ .path }}" {{"}}"}}
          {{ .key | upper }}={{"{{"}} .Data.data.{{ .key }} {{"}}"}}
          {{"{{- end }}"}}
        {{- end }}
{{- end }}
```

### 6.2 App of Apps：一次同步所有依赖

```yaml
# environments/prod/root-app.yaml
# 自动管理所有支付域应用的 ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-root-app
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: payment-prod
  source:
    repoURL: https://github.com/hibernate-pano/hsbc-infra.git
    targetRevision: main
    path: environments/prod/payment-apps  # 这个目录下所有 application.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: false
```

```
应用依赖拓扑（ArgoCD 自动按 sync-wave 顺序同步）：
wave=0: Vault Agent Config → 网络策略
wave=1: payment-service（依赖 wave=0 的资源）
wave=2: api-gateway（依赖 payment-service）
wave=3: monitoring-stack（依赖所有服务）
```

## 7. 金丝雀发布：控制生产变更风险

银行不能直接全量发布新版本。用 ArgoCD Rollouts 做金丝雀：

### 7.1 Rollout CR + AnalysisTemplate

```yaml
# rollout-canary.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service
spec:
  replicas: 10
  strategy:
    canary:
      maxSurge: "25%"      # 每次最多加 25% 新 Pod
      maxUnavailable: 0    # 不能有 Pod 不可用（银行要求）
      canaryService: payment-canary
      stableService: payment-stable

      steps:
        - setWeight: 5     # 先 5% 流量
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate
            startingStep: 1
            args:
              - name: service-name
                value: payment-canary
        - setWeight: 20    # 20%
        - pause: {duration: 10m, approvalRequired: true}  # 人工审批
        - setWeight: 50    # 50%
        - pause: {duration: 30m}
        - setWeight: 100   # 全量

      trafficRouting:
        nginx:
          stableIngress: payment-stable
          additionalIngressAnnotations:
            canary-by-header: X-Canary

---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99   # 成功率 >= 99%
      failureLimit: 3                        # 连续3次失败则回滚
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_server_requests_seconds_count{
              job="{{args.service-name}}",
              status=~"2.."}[5m]))
            /
            sum(rate(http_server_requests_seconds_count{
              job="{{args.service-name}}"}[5m]))
```

### 7.2 渐进式发布审批流程

```bash
# 5% → 20% 时自动暂停，等待人工批准
argocd rollouts pause payment-service -n payment-prod

# SRE 检查指标后批准继续
argocd rollouts promote payment-service -n payment-prod

# 或发现问题，立即回滚
argocd rollouts abort payment-service -n payment-prod
```

## 8. 银行合规：审计与回滚

### 8.1 完整审计日志

ArgoCD 的每次 Sync 都是一次 Git commit 触发的操作，天然带审计：

```bash
# 查看历史同步记录
argocd app history payment-service -n payment-prod

# 输出：
# ID  MANIFEST                                      PARAMETERS                       STATUS
# 12  payment-service:v2.1.3                       tag=v2.1.3, replicas=5           Synced
# 13  payment-service:v2.1.4                       tag=v2.1.4, replicas=5           Synced

argocd app history payment-service -n payment-prod --id 12 --details
# 显示：谁触发的（git commit author）、什么时候、用的什么参数
```

### 8.2 秒级回滚

```bash
# 一行命令回滚到上一个版本
argocd app rollback payment-service -n payment-prod

# 或指定特定版本
argocd app rollback payment-service -n payment-prod --revision 12

# Rollout 场景：自动回滚
argocd rollouts abort payment-service -n payment-prod
# Rollout 自动将流量切回 stable 版本，回滚时间 < 30 秒
```

## 9. 总结：GitOps 落地检查清单

| 阶段 | 检查项 | 状态 |
|------|--------|------|
| 仓库设计 | App Chart 与 Environment 分离 | ⬜ |
| 权限隔离 | ArgoCD Projects 隔离团队 | ⬜ |
| Secret 管理 | Vault Agent 注入，不用 Git 存 Secret | ⬜ |
| 镜像标签 | 固定 tag，不用 latest | ⬜ |
| 网络安全 | NetworkPolicy 只允许必要流量 | ⬜ |
| 金丝雀发布 | Rollout + Analysis 模板 | ⬜ |
| 人工审批 | 20% → 50% → 100% 关键节点审批 | ⬜ |
| 审计日志 | 所有 Sync 操作可追溯 | ⬜ |
| 回滚演练 | 每季度模拟回滚 | ⬜ |

GitOps 让部署从"人操作机器"变成"人操作 Git，机器自动同步"——在银行的高合规要求下，这是目前最优雅的解决方案。

---

*相关阅读：[Kubernetes 完全指南](/coding/Kubernetes/Kubernetes快速入门完全指南) · [HashiCorp Vault 银行密钥管理实战](/coding/安全/HashiCorp-Vault银行密钥管理实战) · [银行科技 CI/CD 流水线设计](/coding/架构心得/银行科技CI-CD流水线设计)*
