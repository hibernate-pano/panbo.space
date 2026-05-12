---
title: Kubernetes（K8s）快速入门
summary: Kubernetes 是容器编排平台：
publishedAt: '2026-02-26'
track: engineering
topic: Kubernetes
tags: []
featured: false
draft: false
slug: kubernetes快速入门完全指南
legacyPaths:
  - /coding/Kubernetes/Kubernetes快速入门完全指南
---
> 容器编排的核心平台

---

## 1. Kubernetes 简介

### 1.1 什么是 K8s？

Kubernetes 是容器编排平台：

```
┌─────────────────────────────────────────────────────────────┐
│                      Kubernetes 集群                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Control Plane                       │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │  │
│  │  │  API    │  │ Scheduler│  │ Controller│  │   etcd  │ │  │
│  │  │ Server  │  │         │  │ Manager  │  │         │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
│                            │                               │
│  ┌─────────────────────────┼─────────────────────────────┐│
│  │                     Node Workers                     ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             ││
│  │  │ Node 1  │  │ Node 2  │  │ Node 3  │             ││
│  │  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │             ││
│  │  │ │ Pod │ │  │ │ Pod │ │  │ │ Pod │ │             ││
│  │  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │             ││
│  │  └─────────┘  └─────────┘  └─────────┘             ││
│  └───────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| Pod | K8s 最小部署单元（1+容器） |
| ReplicaSet | 保持 Pod 副本数 |
| Deployment | 管理部署 |
| Service | 服务发现与负载均衡 |
| ConfigMap/Secret | 配置管理 |
| Ingress | HTTP 路由 |

---

## 2. 核心资源

### 2.1 Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
spec:
  containers:
  - name: myapp
    image: myapp:1.0
    ports:
    - containerPort: 8080
    resources:
      limits:
        memory: "256Mi"
        cpu: "500m"
      requests:
        memory: "128Mi"
        cpu: "250m"
```

### 2.2 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:1.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
```

### 2.3 Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

### 2.4 Service 类型

```
┌─────────────────────────────────────────────────────────────┐
│  Service 类型                                             │
├─────────────────────────────────────────────────────────────┤
│                                                            │
│  ClusterIP（默认）                                         │
│  ┌──────────┐                                            │
│  │  Service │ ───▶ Pods                                  │
│  └──────────┘                                            │
│                                                            │
│  NodePort                                                │
│  ┌──────────┐     ┌──────────┐                         │
│  │ :30080   │ ───▶│  Service │ ───▶ Pods              │
│  └──────────┘     └──────────┘                         │
│  (每个Node)                                               │
│                                                            │
│  LoadBalancer                                            │
│  ┌────────────────────┐                                 │
│  │   External LB     │ ───▶ NodePort ───▶ Pods        │
│  └────────────────────┘                                 │
│                                                            │
│  Ingress                                                 │
│  ┌──────────┐     ┌──────────┐                         │
│  │ Ingress  │ ───▶│ Service1 │ ───▶ Pods              │
│  │ /api     │     └──────────┘                         │
│  │ /web     │     ┌──────────┐                         │
│  │ /admin   │     │ Service2 │ ───▶ Pods              │
│  └──────────┘     └──────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 常用命令

### 3.1 资源管理

```bash
# 查看资源
kubectl get pods
kubectl get services
kubectl get deployments
kubectl get all -n namespace

# 查看详情
kubectl describe pod myapp-pod
kubectl get pod myapp-pod -o yaml

# 创建/更新
kubectl apply -f deployment.yaml

# 删除
kubectl delete pod myapp-pod
kubectl delete -f deployment.yaml

# 查看日志
kubectl logs -f myapp-pod
kubectl logs -f myapp-pod -c container-name

# 进入容器
kubectl exec -it myapp-pod -- /bin/bash

# 查看Pod状态
kubectl get pods -w  # 实时监控
```

### 3.2 扩缩容

```bash
# 扩缩容
kubectl scale deployment myapp --replicas=5

# 自动扩缩容（HPA）
kubectl autoscale deployment myapp --min=2 --max=10 --cpu-percent=80
```

---

## 4. 配置管理

### 4.1 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_URL: "jdbc:mysql://mysql:3306/myapp"
  CACHE_ENABLED: "true"
```

```yaml
# 使用 ConfigMap
spec:
  containers:
  - name: myapp
    env:
    - name: DATABASE_URL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: DATABASE_URL
```

### 4.2 Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  # base64 编码
  username: YWRtaW4=
  password: cGFzc3dvcmQ=
```

---

## 5. 存储

### 5.1 PersistentVolume（PV）

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /mnt/data
```

### 5.2 PersistentVolumeClaim（PVC）

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

---

## 6. 网络

### 6.1 Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-service
            port:
              number: 80
```

---

## 7. 资源调度

### 7.1 资源限制

```yaml
spec:
  containers:
  - name: myapp
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
```

### 7.2 调度规则

```yaml
# 节点亲和性
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: disktype
            operator: In
            values:
            - ssd

# Pod 亲和性
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: database
        topologyKey: kubernetes.io/hostname
```

---

## 8. 健康检查

### 8.1 探针类型

```
┌─────────────────────────────────────────────────────────────┐
│                    探针机制                                   │
├─────────────────────────────────────────────────────────────┤
│                                                            │
│  startupProbe                                             │
│  ──────────────  启动探针（容器启动时）                     │
│       │                                                   │
│       ▼                                                   │
│  readinessProbe                                           │
│  ──────────────  就绪探针（接收流量）                       │
│       │                                                   │
│       ▼                                                   │
│  livenessProbe                                            │
│  ──────────────  存活探针（保持运行）                       │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 配置示例

```yaml
spec:
  containers:
  - name: myapp
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /live
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 20
      failureThreshold: 3
```

---

## 9. 总结

| 资源 | 说明 |
|------|------|
| Pod | 最小部署单元 |
| Deployment | 部署管理 |
| Service | 服务发现 |
| ConfigMap/Secret | 配置 |
| Ingress | HTTP 路由 |
| PV/PVC | 持久化存储 |

---

> 📚 K8s 系列将持续更新...
