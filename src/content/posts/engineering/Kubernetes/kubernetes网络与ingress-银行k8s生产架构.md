---
title: Kubernetes 网络与 Ingress：银行 K8s 生产网络架构
summary: >-
  从 CNI 插件、Service DNS、Ingress Controller 到 NetworkPolicy，详解银行 K8s
  集群的网络架构设计与生产环境配置，包括灰度发布、TLS 终止、流量分割。
publishedAt: 'Sat Mar 21 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-21'
track: engineering
topic: Kubernetes
tags: []
featured: false
draft: false
slug: kubernetes网络与ingress-银行k8s生产架构
legacyPaths:
  - /coding/Kubernetes/Kubernetes网络与Ingress-银行K8s生产架构
---
> "K8s 网络是大多数工程师的盲区：Pod 间怎么通信？Service 的 ClusterIP 是什么？Ingress Controller 和 Ingress 资源什么关系？不理解这些，生产部署就是盲人摸象。"

## 前言

在银行生产环境里，K8s 网络的设计直接决定了：
- **服务间通信安全**：Payment Service 能否访问 Account Service？访问路径是什么？
- **外部流量接入**：手机银行 App 的请求如何到达集群内部？
- **网络隔离合规**：PCI-DSS 要求不同安全域之间必须隔离
- **灰度发布**：如何把 5% 的流量切到新版本？

## 1. K8s 网络模型：四层通信体系

```
K8s 网络遵循三个基本原则：
  ① 所有 Pod 可以直接通信（无需 NAT）
  ② 所有 Node 可以直接通信（无需 NAT）
  ③ Pod 的 IP 地址在全集群唯一（CNI 插件保证）

集群网络拓扑：
  Internet
      │
      ▼
  ┌─────────────────────────────┐
  │  Ingress Controller (NodePort/LoadBalancer) │
  └──────────┬──────────────────┘
             │ 外部流量入口
             ▼
  ┌─────────────────────────────┐
  │  Service (ClusterIP/NodePort) │
  │  payment-service:8080        │
  │  account-service:8080         │
  └──────────┬──────────────────┘
             │ kube-proxy 负载均衡
             ▼
  ┌─────────────────────────────┐
  │  Pod Network (CNI Overlay)  │
  │  payment-7b8d9f-xkq2n        │
  │  account-5f6g7h-pq3r7        │
  └─────────────────────────────┘
```

## 2. CNI 插件选型

CNI（Container Network Interface）负责 Pod 网络的分配和互通：

| CNI 插件 | 特点 | 适用场景 |
|---------|------|---------|
| **Calico** | 基于 BGP，支持 NetworkPolicy，性能高 | 银行生产（推荐） |
| Cilium | eBPF 驱动，透明加密，内核级别性能 | 超大规模集群 |
| Flannel | 简单，VxLAN 封装，性能一般 | 开发/测试 |
| Weave | 自动 mesh，易用性好 | 小规模 |

```yaml
# Calico 安装（生产推荐）
#方式 1: Helm
helm install calico tigera-operator \
  -n calico-system \
  --create-namespace

# 方式 2: Operator
kubectl apply -f https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml

# 验证 CNI 类型
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl exec -it -n kube-system calico-node-xxxx -- calicoctl node status
```

## 3. Service 与 DNS：服务发现

### 3.1 Service 类型选择

```yaml
# ClusterIP（默认）：集群内部访问
# 用途：ServiceMesh sidecar、集群内部微服务间调用
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: payments
spec:
  type: ClusterIP
  selector:
    app: payment-service
  ports:
    - name: http
      port: 8080        # Service Port
      targetPort: 8080  # Container Port
    - name: grpc
      port: 9090
      targetPort: 9090
```

```yaml
# NodePort：节点端口（测试环境）
# 用途：开发/测试环境快速暴露服务
# 端口范围：30000-32767
apiVersion: v1
kind: Service
metadata:
  name: payment-service-dev
spec:
  type: NodePort
  selector:
    app: payment-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
      nodePort: 30080  # 可选，指定节点端口
```

```yaml
# LoadBalancer：云厂商托管 LB（生产环境）
# 用途：生产环境，AWS/GCP/Azure/私有云
apiVersion: v1
kind: Service
metadata:
  name: payment-service-prod
  annotations:
    # AWS: 指定负载均衡器类型
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    # Azure: 启用代理协议（保留客户端 IP）
    service.beta.kubernetes.io/azure-load-balancer-proxy-protocol: "tcp"
spec:
  type: LoadBalancer
  selector:
    app: payment-service
  ports:
    - name: https
      port: 443
      targetPort: 8080
```

### 3.2 服务间 DNS 发现

```bash
# 集群内部 DNS 解析
# FQDN: <service>.<namespace>.svc.<cluster-domain>
payment-service.payments.svc.cluster.local

# 同命名空间简写
payment-service  # → payment-service.payments.svc.cluster.local

# 不同命名空间
account-service.accounts  # → account-service.accounts.svc.cluster.local

# 测试 DNS 解析
kubectl run -it --rm dnsutils --image=tutum/dnsutils --restart=Never
# nslookup payment-service.payments
# curl http://payment-service.payments.svc.cluster.local:8080/health
```

### 3.3 Headless Service（无头服务）

```yaml
# Headless Service：直接返回 Pod IP，不经过 kube-proxy
# 用途：StatefulSet、有状态服务、客户端自定义负载均衡
apiVersion: v1
kind: Service
metadata:
  name: zookeeper-hs
  namespace: kafka
spec:
  clusterIP: None  # 关键：设为 None = Headless
  selector:
    app: zookeeper
  ports:
    - port: 2181
      targetPort: 2181
```

## 4. Ingress Controller：集群流量入口

Ingress Controller 是 K8s 中暴露服务的标准方式，不是每个集群都有，需要单独部署：

```bash
# 方案 1：Nginx Ingress Controller（最成熟）
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx \
  --create-namespace \
  -f values-nginx.yaml

# 方案 2：AWS ALB Ingress Controller（AWS 专用）
helm install aws-load-balancer-controller \
  eks/aws-load-balancer-controller \
  -n kube-system

# 方案 3：Istio Gateway（配合 ServiceMesh）
# 见 Istio Service Mesh 文章
```

```yaml
# values-nginx.yaml（生产配置）
controller:
  replicaCount: 3
  service:
    type: LoadBalancer
    annotations:
      # AWS NLB 配置
      service.beta.kubernetes.io/aws-load-balancer-type: "nlb-ip"
      service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
      # 保持客户端 IP
      service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"
      # 健康检查配置
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: "http"
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/healthz"
      service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "10254"

  config:
    # 代理配置
    proxy-body-size: "10m"
    proxy-read-timeout: "120"
    proxy-send-timeout: "120"
    use-forwarded-headers: "true"
    compute-full-forwarded-for: "true"
    use-proxy-protocol: "false"

  ingressClassResource:
    name: nginx
    enabled: true
    default: false
    controllerClass: "k8s.io/ingress-nginx"

  # 资源限制
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
```

## 5. Ingress 资源：路由规则定义

```yaml
# ingress-payment.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payment-service-ingress
  namespace: payments
  annotations:
    # Nginx 特定配置
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"

    # 速率限制
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "50"

    # 灰度发布：基于 header 的流量分割
    nginx.ingress.kubernetes.io.canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "5"

    # CORS 配置
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://banking.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET POST PUT DELETE"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"

spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.banking.example.com
        - "*.banking.example.com"
      secretName: banking-tls-secret  # 必须提前创建
  rules:
    - host: api.banking.example.com
      http:
        paths:
          # 路径路由
          - path: /v1/payments
            pathType: Prefix
            backend:
              service:
                name: payment-service
                port:
                  number: 8080

          - path: /v1/accounts
            pathType: Prefix
            backend:
              service:
                name: account-service
                port:
                  number: 8080

          - path: /healthz
            pathType: Exact
            backend:
              service:
                name: ingress-nginx-controller
                port:
                  number: 80
```

## 6. TLS 证书管理：Cert-Manager 自动续期

```yaml
# 1. 安装 cert-manager
helm install cert-manager jetstack/cert-manager \
  -n cert-manager \
  --create-namespace \
  --set installCRDs=true

# 2. 创建 Let's Encrypt ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@banking.example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

```yaml
# 3. 注解自动申请证书
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payment-service-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    # 证书自动续期（提前 30 天续期）
    cert-manager.io/renew-before: "720h"
spec:
  tls:
    - hosts:
        - api.banking.example.com
      secretName: banking-tls-secret  # cert-manager 自动管理此 Secret
```

## 7. NetworkPolicy：微服务网络安全隔离

PCI-DSS 要求不同安全域之间必须隔离。NetworkPolicy 是 K8s 原生的网络隔离手段：

```yaml
# 网络策略：Payment Service 只允许来自 API Gateway 的流量
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-network-policy
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payment-service

  # 入站策略
  policyTypes:
    - Ingress
    - Egress

  ingress:
    # 只允许来自 API Gateway 命名空间的流量
    - from:
        - namespaceSelector:
            matchLabels:
              name: gateway
          podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8080

    # 允许 Kubernetes DNS
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53

  egress:
    # 只允许访问 Account Service
    - to:
        - podSelector:
            matchLabels:
              app: account-service
      ports:
        - protocol: TCP
          port: 8080

    # 只允许访问数据库（特定 IP）
    - to:
        - ipBlock:
            cidr: 10.100.0.0/16  # 数据库网段
      ports:
        - protocol: TCP
          port: 3306

    # 允许 DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

```yaml
# 默认拒绝所有入站流量（默认策略）
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}  # 空选择器 = 所有 Pod
  policyTypes:
    - Ingress
```

## 8. 银行生产架构：完整流量路径

```
外部用户请求 → AWS ALB（NLB）
                        │
                        ▼
              ┌─────────────────────┐
              │  Ingress Controller  │
              │  (Nginx/Traefik)    │
              │  TLS 终止            │
              │  路径路由            │
              │  限流/熔断           │
              └──────────┬──────────┘
                         │ ClusterIP
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Payment  │  │ Account  │  │   Auth   │
    │ Service  │  │ Service  │  │ Service  │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │             │             │
         ▼             ▼             ▼
    ┌────────────────────────────────────────┐
    │  Istio ServiceMesh (mTLS + Policy)      │
    │  跨服务通信加密 + 流量管理              │
    └────────────────────────────────────────┘
         │             │             │
         ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ MySQL DB  │  │  Redis   │  │Vault/HSM │
    │(10.100.x) │  │(Cluster) │  │(External)│
    └──────────┘  └──────────┘  └──────────┘
```

---

*相关阅读：[Kubernetes 探针与健康检查实战](/coding/Kubernetes/Kubernetes探针与健康检查-SpringBoot Actuator集成) · [Kubernetes 监控与告警银行生产实战](/coding/Kubernetes/Kubernetes监控与告警-银行生产实战) · [Istio Service Mesh 银行实战](/coding/DevOps/Kubernetes-Istio银行ServiceMesh实战)*
