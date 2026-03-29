---
title: 银行科技 CI/CD 流水线设计：从代码提交到生产部署
summary: 在互联网公司，CI/CD 的目标是：快——快速迭代、快速验证、快速回滚。
publishedAt: '2026-03-19'
track: engineering
topic: 架构心得
tags: []
featured: false
draft: false
slug: 银行科技ci-cd流水线设计
legacyPaths:
  - /coding/架构心得/银行科技CI-CD流水线设计
---
> 在监管最严的行业中，安全交付意味着什么

---

## 目录

1. [银行业 CI/CD 的独特挑战](#1-银行业-cicd-的独特挑战)
2. [多环境流水线架构](#2-多环境流水线架构)
3. [Azure DevOps 流水线实战](#3-azure-devops-流水线实战)
4. [安全扫描：代码到镜像的全链路检查](#4-安全扫描代码到镜像的全链路检查)
5. [蓝绿部署与金丝雀发布](#5-蓝绿部署与金丝雀发布)
6. [GitOps：用 Git 管理生产基础设施](#6-gitops用-git-管理生产基础设施)
7. [流水线即合规证据](#7-流水线即合规证据)
8. [常见反模式与避坑指南](#8-常见反模式与避坑指南)

---

## 1. 银行业 CI/CD 的独特挑战

在互联网公司，CI/CD 的目标是：**快**——快速迭代、快速验证、快速回滚。

在银行业，这个目标依然存在，但必须叠加两个额外约束：

### 1.1 监管合规（Regulatory Compliance）

银行系统受到严格监管，每一次生产环境变更都需要留下**完整的审计轨迹**：

- **巴塞尔协议（Basel III/IV）**：银行 IT 系统的变更管理必须可追溯
- **SOC 2 Type II**：审计日志必须包含谁、在什么时候、做了什么变更
- **PCI DSS**：支付卡行业数据安全标准，对代码和基础设施的变更有明确要求
- **内部审计（Internal Audit）**：IT 变更委员会（Change Advisory Board, CAB）需要审批高风险变更

这意味着：**CI/CD 流水线不只是一个工程工具，更是一份合规证据**。

### 1.2 零停机（Zero Downtime）

银行交易系统的 SLA 通常是 **99.99%**（四九模式，约 52 分钟/年停机时间）。这个目标是硬性的——不是"努力追求"，而是"必须达成"。

因此，银行的部署策略必须：
- 支持生产环境不停机发布
- 提供秒级回滚能力
- 确保每次部署的可重复性（幂等性）

### 1.3 多地区/多法规域

汇丰是全球化银行，同一套应用可能需要部署到香港、英国、美国、新加坡等多个数据中心。每个地区有不同的：
- 网络安全要求
- 数据驻留法规（某些数据不能离开本国）
- 合规审批流程

这要求 CI/CD 系统能支持**多环境、多区域、多租户**的配置管理。

---

## 2. 多环境流水线架构

### 2.1 典型银行应用环境分层

```
┌─────────────────────────────────────────────────────────┐
│  开发环境 (Development)                                   │
│  - 每位开发者独立环境，频繁部署                          │
│  - 自动清理，不保留数据                                 │
├─────────────────────────────────────────────────────────┤
│  集成环境 (Integration / SIT)                           │
│  - 所有服务集成测试                                     │
│  - 使用 Oracle/PostgreSQL 测试实例                      │
│  - 自动 + 手动测试阶段                                 │
├─────────────────────────────────────────────────────────┤
│  用户验收测试环境 (UAT)                                 │
│  - 业务用户验收                                         │
│  - 生产数据脱敏副本（可选）                             │
│  - 手动测试 + 业务确认                                  │
├─────────────────────────────────────────────────────────┤
│  预发布环境 (Pre-Production / Staging)                  │
│  - 生产环境镜像，最小化配置差异                         │
│  - 最终验证，通常是蓝绿部署前最后一关                   │
├─────────────────────────────────────────────────────────┤
│  生产环境 (Production)                                  │
│  - 金丝雀发布（5% → 20% → 100%）                      │
│  - 全链路监控 + 自动回滚                                │
└─────────────────────────────────────────────────────────┘
```

### 2.2 环境间的配置差异管理

```yaml
# config.yaml - 环境配置模板（不包含敏感信息）
# 敏感信息通过 Azure Key Vault / AWS Secrets Manager 注入

environments:
  development:
    database:
      host: dev-db.internal
      max_pool_size: 5
    redis:
      host: dev-redis.internal
    features:
      debug_mode: true
      mock_payment_gateway: true

  integration:
    database:
      host: sit-db.internal
      max_pool_size: 20
    features:
      debug_mode: false
      mock_payment_gateway: false

  production:
    database:
      host: prod-scan.internal
      max_pool_size: 18
    redis:
      host: prod-redis.internal
    features:
      debug_mode: false
      mock_payment_gateway: false
      audit_log_level: STRICT
```

---

## 3. Azure DevOps 流水线实战

汇丰使用 Azure DevOps 作为主要的 CI/CD 平台，以下是完整的流水线配置。

### 3.1 Maven/Gradle 项目的构建阶段

```yaml
# azure-pipelines.yml - Spring Boot 应用

trigger:
  branches:
    include:
      - main
      - release/*
  paths:
    exclude:
      - '*.md'
      - 'docs/*'

variables:
  javaVersion: '17'
  mavenVersion: '3.9'
  imageName: 'payment-service'
  dockerRegistry: 'hsbc-container-registry.azurecr.io'

stages:
  - stage: Build
    displayName: 'Build & Test'
    jobs:
      - job: BuildAndTest
        pool:
          vmImage: 'ubuntu-22.04'
        container:
          image: 'maven:3.9-eclipse-temurin-17'
        steps:
          # 1. Maven 构建
          - task: MavenAuthenticate@0
            inputs:
              mavenServiceConnections: 'hsbc-maven-artifact'

          - task: Maven@4
            displayName: 'Maven Build'
            inputs:
              mavenPomFile: 'pom.xml'
              goals: 'clean verify'
              options: '-DskipITs=false -Dmaven.test.failure.ignore=false'
              publishJUnitResults: true
              testResultsFiles: '**/TEST-*.xml'

          # 2. SonarQube 代码质量扫描
          - task: SonarQubePrepare@6
            inputs:
              SonarQube: 'SonarQube-Service-Connection'
              scannerMode: 'maven'
              projectKey: 'payment-service'

          - task: Maven@4
            displayName: 'SonarQube Scan'
            inputs:
              mavenPomFile: 'pom.xml'
              goals: 'sonar:sonar'

          # 3. 构建 Docker 镜像
          - task: Docker@2
            displayName: 'Build Docker Image'
            inputs:
              command: 'build'
              dockerfile: '$(Build.SourcesDirectory)/Dockerfile'
              images: |
                $(dockerRegistry)/$(imageName):$(Build.BuildNumber)
                $(dockerRegistry)/$(imageName):latest
              tags: |
                commit-$(Build.SourceVersion)
                date-$(Date:yyyyMMdd)

          # 4. 推送镜像到 ACR
          - task: Docker@2
            displayName: 'Push to ACR'
            inputs:
              command: 'push'
              containerRegistry: 'AzureContainerRegistry-Connection'
              images: |
                $(dockerRegistry)/$(imageName):$(Build.BuildNumber)
                $(dockerRegistry)/$(imageName):latest
```

### 3.2 多阶段部署配置

```yaml
  # ===== 集成测试阶段 =====
  - stage: Deploy_SIT
    displayName: 'Deploy to SIT'
    dependsOn: Build
    condition: succeeded()
    variables:
      environment: 'sit'
    jobs:
      - deployment: DeploySIT
        environment: 'payment-sit'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - template: templates/k8s-deploy.yml
                  parameters:
                    namespace: 'sit'
                    replicas: 2
                    imageTag: '$(Build.BuildNumber)'

  # ===== 用户验收测试阶段 =====
  - stage: Deploy_UAT
    displayName: 'Deploy to UAT'
    dependsOn: Deploy_SIT
    condition: succeeded()
    jobs:
      - deployment: DeployUAT
        environment: 'payment-uat'
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/k8s-deploy.yml
                  parameters:
                    namespace: 'uat'
                    replicas: 2
                    imageTag: '$(Build.BuildNumber)'

  # ===== 预发布阶段 =====
  - stage: Deploy_PreProd
    displayName: 'Deploy to Pre-Production'
    dependsOn: Deploy_UAT
    condition: succeeded()
    jobs:
      - deployment: DeployPreProd
        environment: 'payment-preprod'
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/k8s-deploy.yml
                  parameters:
                    namespace: 'preprod'
                    replicas: 3
                    imageTag: '$(Build.BuildNumber)'
                    healthCheck: true

  # ===== 生产部署（金丝雀） =====
  - stage: Deploy_Production
    displayName: 'Deploy to Production (Canary)'
    dependsOn: Deploy_PreProd
    condition: succeeded()
    jobs:
      - deployment: DeployProduction
        environment: 'payment-production'
        strategy:
          runOnce:
            deploy:
              steps:
                - template: templates/k8s-deploy.yml
                  parameters:
                    namespace: 'production'
                    replicas: 10
                    imageTag: '$(Build.BuildNumber)'
                    strategy: 'canary'
                    canaryWeight: 5  # 先只引 5% 流量到新版本
```

### 3.3 Kubernetes 部署模板

```yaml
# templates/k8s-deploy.yml
parameters:
  - name: namespace
    type: string
  - name: replicas
    type: number
    default: 3
  - name: imageTag
    type: string
  - name: healthCheck
    type: boolean
    default: false
  - name: strategy
    type: string
    default: 'rolling'
  - name: canaryWeight
    type: number
    default: 0

steps:
  - task: KubernetesManifest@0
    displayName: 'Deploy to ${{ parameters.namespace }}'
    inputs:
      action: 'deploy'
      namespace: '${{ parameters.namespace }}'
      manifests: |
        $(Build.SourcesDirectory)/k8s/deployment.yml
        $(Build.SourcesDirectory)/k8s/service.yml
        $(Build.SourcesDirectory)/k8s/hpa.yml
      imagePullSecrets: 'acr-secret'
      containers: |
        $(dockerRegistry)/$(imageName):${{ parameters.imageTag }}
```

```yaml
# k8s/deployment.yml (使用 Kustomize 或 Helm 时更优雅)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: placeholder
  labels:
    app: payment-service
    version: placeholder
spec:
  replicas: placeholder
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      serviceAccountName: payment-service-sa
      containers:
        - name: payment-service
          image: placeholder
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          env:
            - name: SPRING_PROFILES_ACTIVE
              valueFrom:
                configMapKeyRef:
                  name: payment-config
                  key: profile
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: payment-secrets
                  key: db-password
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              valueFrom:
                configMapKeyRef:
                  name: otel-config
                  key: endpoint
```

---

## 4. 安全扫描：代码到镜像的全链路检查

银行系统的安全扫描不只是"加分项"，而是**上线的硬性门槛**。

### 4.1 SAST：静态应用安全测试

在构建阶段强制执行代码安全扫描：

```yaml
# Maven pom.xml 中的安全插件
# <plugin>
#     <groupId>org.owasp</groupId>
#     <artifactId>dependency-check-maven-plugin</artifactId>
#     <version>8.4.0</version>
#     <configuration>
#         <failBuildOnCVSS>7</failBuildOnCVSS>  <!-- CVSS 评分 ≥ 7 时阻断构建 -->
#         <skipProvidedScope>true</skipProvidedScope>
#     </configuration>
#     <executions>
#         <execution>
#             <goals>
#                 <goal>check</goal>
#             </goals>
#         </execution>
#     </executions>
# </plugin>

# 在流水线中集成 SonarQube 安全规则
# SonarQube 配置：Quality Gate 包含安全热点（Security Hotspots）
- task: SonarQubePublish@6
  condition: succeededOrFailed()
  inputs:
    sonarQube: 'SonarQube-Service-Connection'
    additionalParams: |
      &leakPeriod=last_version
      &security_hotspots=7  # 高危安全热点必须处理
```

**常见必须修复的安全问题（OWASP Top 10）：**

| 类别 | 典型问题 | 银行场景风险 |
|------|---------|------------|
| A01 失效的访问控制 | 接口未校验用户归属 | 客户 A 可查看客户 B 的账户 |
| A02 加密失败 | 密码/卡号未加密存储 | 监管罚款 + 数据泄露 |
| A03 注入 | SQL 注入、LDAP 注入 | 资金被盗转 |
| A04 不安全设计 | 缺少速率限制 | 暴力破解登录 |
| A05 安全配置错误 | 生产环境开启调试 | 信息泄露 |

### 4.2 SCA：软件组成分析

```yaml
# Maven dependency-check 的流水线集成
# 阻断构建的高危漏洞（CVE）示例：
# CVE-2024-1234: Log4j 远程代码执行（已修复但旧版本仍存在）
# CVE-2024-5678: Spring Framework 认证绕过

# 每日定时扫描（不阻断构建，但触发告警）
- cron: "0 2 * * *"  # 每天凌晨 2 点
  displayName: 'Daily Vulnerability Scan'
  branches:
    include:
      - main
  steps:
    - task: DependencyCheck@0
      inputs:
        scanType: 'scan'
        compilationFailCondition: 'never'  # 不阻断，只报告
        reportDirectory: '$(Agent.BuildDirectory)/dependency-check-report'
        failOnCritical: true  # 关键漏洞发 Slack 告警
```

### 4.3 DAST：动态应用安全测试

```yaml
# 在 UAT 环境进行动态扫描（生产环境前最后一道安全关）
- stage: SecurityScan_UAT
  displayName: 'DAST Security Scan'
  dependsOn: Deploy_UAT
  jobs:
    - job: OWASPZapScan
      pool:
        vmImage: 'ubuntu-22.04'
      container:
        image: owasp/zap2docker-stable
      steps:
        - script: |
            # 扫描 API 端点
            docker run --rm owasp/zap2docker-stable zap-api-scan.py \
              -t https://payment-uat.internal/api/v2/api-docs \
              -f openapi \
              -r zap_report.html \
              -J zap_report.json
          displayName: 'OWASP ZAP API Scan'

        - task: PublishSecurityScan@0
          inputs:
            scanType: 'zap'
            reportPath: 'zap_report.json'
            alertThreshold: 3  # 超过 3 个中危告警则阻断
            failOnHighSeverity: true
```

### 4.4 容器镜像扫描

```yaml
# 在镜像构建后、推送前强制执行 CVE 扫描
- task: AnchoreBuildImage@0
  inputs:
    imageName: '$(dockerRegistry)/$(imageName):$(Build.BuildNumber)'
    scanTimeout: 10m
    failBuildOnSeverity: 'High,Critical'  # 高危和严重漏洞阻断构建
    # 允许的例外（需 Security Team 审批）
    allowlistIds:
      - CVE-2024-0001  # 已评估风险可接受，临时放行
```

---

## 5. 蓝绿部署与金丝雀发布

### 5.1 蓝绿部署（Blue-Green Deployment）

蓝绿部署的原理：**同时维护两套完全相同的生产环境（蓝和绿），一次只激活一套**。切换通过负载均衡器的流量指向完成。

```
时间线：
T0: 蓝环境（active）= v1.0.0, 绿环境（standby）= v1.0.0
     100% 流量 → 蓝环境

T1: 部署新版本到绿环境
     蓝环境 = v1.0.0 (active), 绿环境 = v1.1.0 (standby)
     100% 流量 → 蓝环境

T2: 验证通过后，切换流量
     蓝环境 = v1.0.0 (standby), 绿环境 = v1.1.0 (active)
     100% 流量 → 绿环境

T3: 监控 30 分钟，无异常则销毁旧版本（蓝）
     如有问题，回切：100% 流量 → 蓝环境（秒级回滚）
```

```yaml
# Azure DevOps 中的蓝绿部署任务
- task: AzureRmWebAppDeployment@4
  displayName: 'Blue-Green Swap (Production)'
  inputs:
    ConnectionType: 'AzureRM'
    azureSubscription: 'Azure-PROD-Connection'
    appType: 'webAppContainer'
    WebAppName: 'payment-service'
    containers: '$(dockerRegistry)/payment-service:$(Build.BuildNumber)'
    DeploymentType: 'BlueGreen'  # 蓝绿切换
    swapWithProduction: true
    preserve各部门ments: true   # 保留旧版本用于回滚
```

### 5.2 金丝雀发布（Canary Release）

蓝绿部署适合"全有或全无"的场景，但金丝雀发布更适合**渐进式验证**：

```
流量分配：
v1.0.0 = 95%  流量
v1.1.0 = 5%   流量（新版本）  ← 逐步增加

→ 5% 运行 15 分钟，无异常
→ 20% 运行 30 分钟，监控 P99 延迟
→ 50% 运行 1 小时，监控错误率
→ 100% 全量切换
```

```yaml
# Argo Rollouts 实现金丝雀发布
# 在 ArgoCD 或流水线中调用
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 20
  strategy:
    canary:
      # 1. 初始流量：5%
      setWeight: 5
      # 2. 分析：每步之间的等待和验证
      analysis:
        templates:
          - templateName: success-rate-template
          - templateName: latency-template
        args:
          - name: service-name
            value: payment-service
      # 3. 步骤定义
      steps:
        - setWeight: 5
        - pause: {duration: 15m}     # 观察 15 分钟
        - analysis:
            templates: [success-rate-template]
        - setWeight: 20
        - pause: {duration: 30m}     # 观察 30 分钟
        - analysis:
            templates: [success-rate-template, latency-template]
        - setWeight: 50
        - pause: {duration: 1h}       # 观察 1 小时
        - setWeight: 100              # 全量

---
# 分析模板：成功率检查
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate-template
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 2m
      successCondition: result[0] >= 0.99  # 成功率 ≥ 99%
      failureLimit: 2                        # 连续 2 次失败则回滚
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_server_requests_seconds_count{
              service="{{args.service-name}}",
              status!~"5.."
            }[5m]))
            /
            sum(rate(http_server_requests_seconds_count{
              service="{{args.service-name}}"
            }[5m]))

    - name: latency-p99
      interval: 2m
      successCondition: result[0] <= 2000  # P99 ≤ 2s
      failureLimit: 1
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(http_server_requests_seconds_bucket{
                service="{{args.service-name}}"
              }[5m])) by (le)
            ) * 1000
```

### 5.3 何时用哪种策略

```
┌─────────────────┬──────────────────────┬──────────────────────┐
│                 │ 蓝绿部署             │ 金丝雀发布           │
├─────────────────┼──────────────────────┼──────────────────────┤
│ 适用场景        │ 基础设施变更         │ 应用功能发布         │
│                 │ 数据库迁移           │ 新算法/新模型         │
│                 │ 安全补丁             │ UI 大改版             │
├─────────────────┼──────────────────────┼──────────────────────┤
│ 回滚速度        │ 秒级（全量切换）      │ 较慢（逐步减少）      │
├─────────────────┼──────────────────────┼──────────────────────┤
│ 资源成本        │ 双倍（两套环境）      │ 较低（渐进扩缩）      │
├─────────────────┼──────────────────────┼──────────────────────┤
│ 验证方式        │ 预发布验证后手动切换   │ 自动指标验证         │
├─────────────────┼──────────────────────┼──────────────────────┤
│ 银行合规        │ 更推荐（审计清晰）     │ 可用但需更严格监控   │
└─────────────────┴──────────────────────┴──────────────────────┘
```

---

## 6. GitOps：用 Git 管理生产基础设施

### 6.1 什么是 GitOps

GitOps 的核心思想：**Git 是真理的单一来源（Single Source of Truth）**。生产环境的实际状态必须与 Git 仓库中的声明式配置一致，任何偏差都应该被自动纠正。

```
传统 CI/CD： Push → Pipeline → Deploy to K8s

GitOps：      Push → Git Repo → ArgoCD/WFleet → Sync → K8s
                ↑                              ↓
                └── 自动差异检测与告警 ← ─────┘
```

### 6.2 ArgoCD 应用配置

```yaml
# argocd/application.yml - 定义应用部署
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: payments
  source:
    repoURL: https://github.com/hsbc/payment-service-infra
    targetRevision: HEAD
    path: overlays/production
    kustomize:
      images:
        - $(dockerRegistry)/payment-service=payment-service:$(imageTag)
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true              # Git 中已删除的资源自动删除
      selfHeal: true           # K8s 中手动修改的配置自动恢复
      syncOptions:
        - CreateNamespace=true
    syncOptions:
      - RespectIgnoreDifferences=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### 6.3 GitOps 审批工作流

```
开发者提交 PR (overlay/production/kustomization.yaml)
       ↓
Code Review（至少 1 名 Senior 工程师审批）
       ↓
CI 检查（lint、kustomize build 验证）
       ↓
ArgoCD 检测到 Git 变更，Sync Request 发起
       ↓
SRE 审批 ArgoCD Sync Request（必须！）
       ↓
ArgoCD 执行同步，部署到生产环境
       ↓
变更记录保留在 Git 历史中（审计证据）
```

---

## 7. 流水线即合规证据

### 7.1 监管要求的数据保留

```yaml
# Azure DevOps 保留策略（组织级别配置）
retentionPolicies:
  - name: 'Production Build Records'
    builds:
      - 保留: 7 年  # 巴塞尔协议要求
        branches:
          - main
          - release/*
    runs:
      - 保留: 7 年
    artifacts:
      - 保留: 7 年
        artifactTypes:
          - containerStorage
          - pipelineArtifacts

  - name: 'Development Builds'
    builds:
      - 保留: 90 天
        branches:
          - feature/*
          - bugfix/*
```

### 7.2 审计日志的完整性

```yaml
# 每次部署都必须生成变更记录（Change Record）
# 包含：
# - 部署时间（精确到秒）
# - 部署人（Azure AD 账号，自动关联）
# - 触发方式（自动/手动）
# - 变更内容（Git commit SHA + diff summary）
# - 环境（production）
# - 版本（镜像 tag）
# - 安全扫描结果（通过/有例外）
# - 审批人（如有）

# Azure DevOps 变更记录自动生成
- task: CreateChangeRecord@0
  inputs:
    environment: 'production'
    buildId: '$(Build.BuildId)'
    approver: '$(Release.Approver)'
    securityScanResult: 'PASSED'
    emitToServiceNow: true  # 与 IT SM 系统集成
    changeRequestId: 'CR-$(Date:yyyyMMdd)-$(Build.BuildNumber)'
```

### 7.3 变更咨询委员会（CAB）审批集成

```yaml
# 对于高风险变更（数据库 Schema 变更、核心业务流程修改）
# 需要 CAB 审批才能继续部署到生产
- stage: CAB_Approval
  displayName: 'CAB Approval Required'
  dependsOn: Deploy_PreProd
  condition: |
    or(
      contains(variables['CHANGES.files'], 'database/migrations'),
      contains(variables['CHANGES.files'], 'src/main/java/**/*Service.java')
    )
  jobs:
    - deployment: CABApproval
      environment: 'cab-approval'
      strategy:
        runOnce:
          deploy:
            steps:
              - task: ManualValidation@0
                timeout: 48h
                pool: server
                inputs:
                  users: 'change-advisory-board@hsbc.com'
                  instructions: |
                    高风险变更，需 CAB 审批。

                    变更内容：
                    - 影响的文件：${{ variables['CHANGES.files'] }}
                    - 变更描述：${{ variables['CHANGES.description'] }}
                    - 风险评估：${{ variables['CHANGES.riskLevel'] }}

                    请评估以下内容后审批：
                    1. 业务影响范围
                    2. 回滚方案
                    3. 测试覆盖率
                    4. 监控告警配置
```

---

## 8. 常见反模式与避坑指南

### 8.1 反模式一：生产环境的"一步到位"

```
❌ 反模式：
Build → Push → 直接部署到 Production

问题：
- 没有前置环境验证
- 出问题无法快速回滚
- 没有任何审计轨迹
```

```
✅ 正确做法：
Build → SIT → UAT → PreProd → Production
                  ↑
            需要手动审批 + 自动化测试全部通过
```

### 8.2 反模式二：配置硬编码在流水线中

```
❌ 反模式：数据库密码写在 azure-pipelines.yml 中
variables:
  - name: dbPassword
    value: 'MySecretPassword123'  # 危险！

问题：密码进入 Git 历史，无法删除；任何人可查看
```

```
✅ 正确做法：
variables:
  - name: dbPassword
    value: ''  # 不填
steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: 'Azure-PROD-Connection'
      KeyVaultName: 'hsbc-secrets-prod'
      SecretsFilter: 'db-password,redis-key'
      RunAsPipeline: false

  # 使用 $(dbPassword) 引用 Vault 中的值
```

### 8.3 反模式三：跳过失败的测试

```
❌ 反模式：Maven 设置 -Dmaven.test.failure.ignore=true
并寄希望于"后续再修复"

问题：测试失败的代码进入生产环境
```

```
✅ 正确做法：
- CI 失败 = 构建失败 = 不能合并到 main
- 使用 Branch Policies 强制执行
- Flaky test 立即标记为 @Flaky 并在 Sprint 中修复
```

### 8.4 反模式四：单点故障的部署脚本

```
❌ 反模式：所有服务都依赖同一个 deploy.sh 脚本
该脚本由一个人维护，没有版本控制
```

```
✅ 正确做法：
- 基础设施即代码（Terraform / Pulumi）
- Kubernetes Deployment / Helm Chart 版本化
- 多人可审查、可回滚的配置
```

---

## 结语

银行科技的 CI/CD，本质上是用**工程纪律代替行政审批**——不是说合规不重要，而是把合规要求编码到流水线中，让每一次部署都自动满足监管期望。

核心原则只有三条：

1. **环境分层清晰**：从开发到生产，每一层都有明确的目的和验收标准
2. **安全扫描前置**：越早发现问题，修复成本越低；安全扫描不能是事后补丁
3. **Git 是审计日志**：每一次生产变更都对应一个 Git commit，这是最强有力的合规证据

CI/CD 不是银行业的"束缚"，而是**让变革变得安全、可控、可追溯的保障**。

*Bobot 🦐 | 汇丰科技园 | 2026-03-19*
