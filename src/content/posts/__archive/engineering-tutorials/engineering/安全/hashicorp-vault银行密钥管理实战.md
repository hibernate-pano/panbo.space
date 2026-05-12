---
title: HashiCorp Vault 密钥管理实践
summary: 从架构设计到生产部署，介绍 HashiCorp Vault 在高合规场景中的密钥管理、动态凭证与 PKI 自动化思路。
publishedAt: 'Fri Mar 20 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-20'
track: engineering
topic: 安全
tags: []
featured: false
draft: false
slug: hashicorp-vault银行密钥管理实战
legacyPaths:
  - /coding/安全/HashiCorp-Vault银行密钥管理实战
---
> "在银行系统里，密钥泄露等同于资金泄露。"

## 前言

银行系统的密钥管理有三个硬要求：

1. **永不硬编码**：任何密钥都不能出现在代码、配置文件、环境变量（日志中）、Docker 镜像里
2. **最小权限原则**：每个应用只访问它需要的密钥，且有过期时间
3. **审计全覆盖**：谁在什么时间访问了什么密钥，所有操作均可追溯

HashiCorp Vault 是这一类问题的常见方案。本文按高合规场景整理一套较稳妥的做法，重点放在架构思路、配置方式和落地时容易踩到的坑。

## 1. Vault 架构：银行高可用部署

### 1.1 推荐架构：高性能存储 + HA

Vault 本身不存储数据，状态存储在后端。银行生产环境推荐：

```
┌─────────────────────────────────────────────────┐
│                   Load Balancer                 │
└───────────────────────┬─────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Vault   │    │ Vault   │    │ Vault   │
    │ Node 1  │    │ Node 2  │    │ Node 3  │
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
              ┌─────────┴─────────┐
              │   Consul Cluster  │
              │  (HA Storage)     │
              │  5节点raft共识    │
              └───────────────────┘
```

关键配置：

```hcl
# /etc/vault.d/vault.hcl
ui = true
cluster_addr = "https://vault-node-1.example.internal:8201"
api_addr     = "https://vault.example.internal:8200"

storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault/"
  consul.token = ""  # 从环境变量 VAULT_TOKEN 注入
}

# TLS 强制 HTTPS（银行必须）
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/tls/server.crt"
  tls_key_file  = "/vault/tls/server.key"
  tls_min_version = "tls12"
  tls_disable = false
}

# 审计日志落盘（合规要求，30天保留）
audit "file" {
  path = "/var/log/vault/audit.log"
  log_raw = true
}

# 多节点HA
ha_storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault/"
}
```

### 1.2 Vault Seal/Unseal 策略

Vault 启动时需要 Unseal 密钥才能解密数据。银行生产用 **Shamir 密钥分割**（5人持分，3人合一可解锁）：

```bash
# 初始化 Vault（首次部署时执行一次）
vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -pgp-keys=keybase:admin1.asc,keybase:admin2.asc,keybase:admin3.asc,keybase:admin4.asc,keybase:admin5.asc

# 输出示例：
# Unseal Key 1: xxx
# Unseal Key 2: xxx
# ...
# Initial Root Token: xxx
```

每次重启节点都需要 Unseal，用 **Vault Auto-Unseal** 配合 AWS KMS/GCP CKMS 更适合银行自动化场景：

```hcl
# 启用自动 Unseal（不需要人工干预）
seal "awskms" {
  region     = "eu-west-1"
  kms_key_id = "alias/vault-production-key"
}
```

## 2. Secret Engines：按场景选对引擎

Vault 支持多种 Secret Engine，银行常用的是这三种：

| Engine | 适用场景 | 例子 |
|--------|----------|------|
| **KV Secrets Engine v2** | 静态密钥（应用配置） | 数据库密码、API Key、证书 |
| **Database Secrets Engine** | 动态数据库凭证 | MySQL/Oracle 连接密码 |
| **PKI Secrets Engine** | 自动证书管理 | mTLS 证书、API Gateway 证书 |

### 2.1 KV Engine v2：静态密钥存储

```bash
# 启用 KV v2 引擎
vault secrets enable -path=secret -version=2 kv

# 存储数据库密码
vault kv put secret/payment-service/db \
  host=db-prod.internal \
  port=5432 \
  username=payment_app \
  password=super-secret-password

# 查看
vault kv get secret/payment-service/db

# 版本历史（v2 支持，重要！密码泄露后可回滚）
vault kv history secret/payment-service/db
vault kv delete -versions=3 secret/payment-service/db  # 删除泄露版本
```

### 2.2 Database Secrets Engine：动态凭证（最常用）

数据库密码永不过期是银行安全大忌。Database Engine 让 Vault **按需生成短期密码**，用过即销毁：

```bash
# 启用 MySQL Database Engine
vault secrets enable -path=database database

# 配置 MySQL 连接
vault write database/config/payment-mysql \
  plugin_name=mysql-database-plugin \
  connection_url="{{username}}:{{password}}@tcp(db-prod.internal:3306)/" \
  username="vault_admin" \
  password="vault_admin_password"

# 创建角色：应用获取的密码有效期10分钟，最大使用100次
vault write database/roles/payment-app-role \
  db_name=payment-mysql \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT SELECT ON payment_db.* TO '{{name}}'@'%';" \
  default_ttl="10m" \
  max_ttl="1h"

# 应用每次请求获取临时凭证
vault read database/creds/payment-app-role
# Output:
# Key                Value
# lease_id           database/creds/payment-app-role/xxx
# lease_duration     10m
# username           v-token-payment-app-ro-xxx
# password           A1b2C3d4E5f6G7h8
```

应用使用 Vault SDK 获取凭证，Vault 自动在 10 分钟后撤销：

```java
// Spring Boot + Vault SDK
@Configuration
public class VaultConfig {

    @Bean
    public VaultTemplate vaultTemplate(VaultEndpoint vaultEndpoint,
                                        ClientAuthentication authentication) {
        return new VaultTemplate(vaultEndpoint,
            new VaultConfiguration(authentication, vaultEndpoint).createClientConfiguration());
    }
}

@Service
public class PaymentDbCredentialProvider {

    private final VaultTemplate vault;

    public DbCredentials getCredentials() {
        // lease_id 用于后续续约或主动撤销
        VaultResponse response = vault.read("database/creds/payment-app-role");
        return new DbCredentials(
            response.getData().get("username"),
            response.getData().get("password"),
            response.getLeaseId()
        );
    }

    // Vault 自动撤销，但应用应在 lease 即将过期时主动刷新
    public void closeLease(String leaseId) {
        vault.opsForLease().revoke(leaseId);
    }
}
```

**这个模式的威力**：数据库里永远不会有长期有效的应用密码——每个 Pod、每次部署拿到的都是新密码。即使代码泄露仓库，攻击者也拿不到真实凭证。

## 3. Kubernetes 集成：Vault Agent Injector

在 K8s 环境中，手动轮换凭证太繁琐。Vault Agent Injector 自动将凭证注入 Pod，无需应用改代码：

### 3.1 安装 Vault Agent（Helm）

```bash
helm install vault hashicorp/vault \
  --namespace vault \
  --set "injector.enabled=true" \
  --set "injector.leaderElecter.enabled=true"
```

### 3.2 注解驱动的自动注入

在 Deployment 中加几行注解，Agent 自动将 Vault 密钥注入文件或环境变量：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        # 注入 KV 静态密钥到文件
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "payment-app"           # K8s 认证角色
        vault.hashicorp.com/tls-skip-verify: "false"

        # 注入数据库动态凭证
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/payment-app-role"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/payment-app-role" -}}
          DB_HOST={{ .Data.data.host }}
          DB_PORT={{ .Data.data.port }}
          DB_USER={{ .Data.data.username }}
          DB_PASS={{ .Data.data.password }}
          {{- end }}

        # 注入静态配置
        vault.hashicorp.com/agent-inject-secret-db-config: "secret/data/payment-service/db"
        vault.hashicorp.com/agent-inject-template-db-config: |
          {{- with secret "secret/data/payment-service/db" -}}
          DB_PASSWORD={{ .Data.data.password }}
          {{- end }}
```

Pod 启动后自动有这些文件/环境变量：

```
/vault/secrets/db-creds      ← 数据库动态用户名密码（10分钟有效）
/vault/secrets/db-config     ← 静态数据库配置
```

应用读本地文件即可，完全不知道 Vault 存在——**零代码改动**。

### 3.3 Vault K8s 认证：无需长期令牌

```bash
# 创建 K8s Service Account（每个命名空间一个）
kubectl create serviceaccount vault-auth -n payment
kubectl create clusterrolebinding vault-auth-binding \
  --clusterrole=system:auth-delegator \
  --serviceaccount=default:vault-auth

# Vault 配置 K8s 认证
vault auth enable kubernetes

vault write auth/kubernetes/config \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# 创建 Vault Policy（最小权限）
cat <<'EOF' > payment-app-policy.hcl
path "secret/data/payment-service/*" {
  capabilities = ["read"]
}
path "database/creds/payment-app-role" {
  capabilities = ["read"]
}
EOF
vault policy write payment-app payment-app-policy.hcl

# 绑定 Policy 到 K8s ServiceAccount
vault write auth/kubernetes/role/payment-app \
  bound_service_account_names=vault-auth \
  bound_service_account_namespaces=payment \
  policies=payment-app \
  ttl=24h
```

## 4. PKI Engine：自动化 mTLS 证书管理

银行内网服务间通信强制 mTLS，证书管理是个大麻烦——Vault PKI Engine 让这一切自动化：

```bash
# 启用 PKI Engine
vault secrets enable -path=pki_int pki

# 设置 CA 有效期
vault secrets tune -max-lease-ttl=87600h pki_int  # 10年

# 生成中间 CA（生产规范：根 CA 离线存储，中间 CA 在 Vault）
vault write pki_int/intermediate/generate/internal \
  common_name="Payment Intermediate CA" \
  ttl=8760h \
  --format=pem_bundle > intermediate.csr

vault issue pki_int/root/generate/sign \
  csr=@intermediate.csr \
  common_name="Payment Intermediate CA" \
  ttl=8760h > intermediate.cert.pem

vault write pki_int/intermediate/set-signed \
  certificate=@intermediate.cert.pem

# 创建角色：允许 *.hsbctech.internal 自动申请90天证书
vault write pki_int/roles/payment-services \
  allowed_domains="hsbctech.internal" \
  allow_subdomains=true \
  allow_wildcard_certificates=true \
  max_ttl="2160h" \      # 90天
  generate_lease=true
```

应用申请证书（自动化 via Spring Boot ACME 或 Cert-Manager）：

```java
// VaultClient 获取服务证书
public byte[] getServiceCertificate(String serviceName) {
    // 申请90天证书
    VaultResponse response = vault.write(
        "pki_int/issue/payment-services",
        Map.of(
            "common_name", serviceName + ".hsbctech.internal",
            "ttl", "2160h"
        )
    );
    return response.getData().get("certificate").getBytes();
}
```

## 5. 生产运营：监控与告警

Vault 是关键基础设施，任何异常都需要第一时间告警：

```yaml
# Prometheus 抓取配置（Vault 内置 /metrics 端点）
- job_name: 'vault'
  consul_sd_configs:
    - services: ['vault']
  metrics_path: /v1/sys/metrics
  params:
    format: ['prometheus']
  relabel_configs:
    - source_labels: [__meta_consul_service_id]
      target_label: instance
```

关键告警规则（Prometheus AlertManager）：

```yaml
groups:
  - name: vault-alerts
    rules:
      # Vault Unseal 失败
      - alert: VaultNodeSealed
        expr: vault_core_unseal_progress > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vault 节点被 Seal，请立即处理"

      # 凭证即将过期（提前7天告警）
      - alert: VaultSecretExpiringSoon
        expr: vault_expiration_fetch_lease_count > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "有 {{ $value }} 个 Vault 凭证即将过期"

      # 异常访问模式（同一 ServiceAccount 频繁申请凭证）
      - alert: VaultAnomalousAccess
        expr: rate(vault_token_create_count[5m]) > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "ServiceAccount 凭证申请频率异常"
```

## 6. 踩坑总结

### 坑1：Leases 续期与撤销链

Vault 的精髓在于**有租约就有撤销链**。但容易忘记：

```bash
# 续期（每次续到 max_ttl）
vault lease renew database/creds/payment-app-role/xxx

# 应用重启时忘记撤销旧凭证 → 凭证堆积
# 解决：Vault 在 max_ttl 自动撤销，但最好主动管理
vault lease revoke -prefix database/creds/payment-app-role
```

### 坑2：K8s 认证 Token 自动挂载的 TTL

K8s ServiceAccount Token 默认有效期是 **永不过期**（Kubernetes 1.23 之前）。Vault Role 的 TTL 无法撤销这些 Token：

```bash
# 检查 Token 类型
kubectl get sa vault-auth -n payment -o jsonpath='{.secrets[*].name}'
# 建议 Kubernetes 1.23+ 使用 TokenRequest API 生成有 TTL 的 Token
```

### 坑3：审计日志与 GDPR

Vault 审计日志会记录所有操作，包括密钥内容（`log_raw=true`）。在欧盟区的银行系统里，这可能与 GDPR 冲突：

```hcl
# 审计日志脱敏（Vault 1.13+ 支持）
audit "file" {
  path = "/var/log/vault/audit.log"
 hmac_accessor = true        # 用 HMAC 替代真实 accessor ID
  log_raw = false             # 不记录明文敏感数据
}
```

## 7. 总结：银行 Vault 落地检查清单

| 步骤 | 操作 | 优先级 |
|------|------|--------|
| 1 | 部署 HA Vault + Consul 存储，启用 Auto-Unseal | P0 |
| 2 | 迁移所有硬编码密钥到 KV Engine | P0 |
| 3 | Database Engine 替换静态 DB 密码 | P0 |
| 4 | Vault Agent Injector 集成 K8s | P0 |
| 5 | K8s Auth Method 替换 Kubernetes Token | P1 |
| 6 | PKI Engine 自动化 mTLS 证书 | P1 |
| 7 | Prometheus 监控 + Unseal 告警 | P1 |
| 8 | 审计日志 GDPR 合规审查 | P2 |

Vault 是银行 DevSecOps 实践的基石——把密钥管理做好，等于给整个基础设施上了一道最关键的锁。

---

*相关阅读：[Spring Cloud Gateway 银行网关实战](/coding/SpringCloud/SpringCloud-Gateway银行流量网关实战) · [Spring Security 与 OAuth2 银行级安全实战](/coding/架构心得/SpringSecurity与OAuth2银行级安全实战) · [Kubernetes 完全指南](/coding/Kubernetes/Kubernetes快速入门完全指南)*
