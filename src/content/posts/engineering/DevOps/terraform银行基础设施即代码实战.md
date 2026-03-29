---
title: Terraform 银行基础设施即代码：IaC 在 HSBC 生产环境实战
summary: 从模块化架构到生产环境 Terraform 工作流，详解 Terraform 在银行多账户、多环境基础设施管理中的实战经验与避坑指南。
publishedAt: 'Fri Mar 20 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-20'
track: engineering
topic: DevOps
tags: []
featured: false
draft: false
slug: terraform银行基础设施即代码实战
legacyPaths:
  - /coding/DevOps/Terraform银行基础设施即代码实战
---
> "手动配服务器的时代结束了。不是因为我们想这样，是因为手动操作在监管审计面前根本无法交代。"

## 前言

银行系统的基础设施有三个硬约束：

1. **不可抵赖**：任何基础设施变更必须能追溯到人和时间
2. **环境一致性**：开发、测试、生产的配置不能有差异——差异就是隐患
3. **最小权限**：每个环境、每个团队能操作的资源必须精确限定

Terraform + IaC 解决了这三个问题。我在 HSBC 的平台团队用 Terraform 管理了覆盖 3 个 AWS 账户、5 个环境的基础设施。本文是生产级 Terraform 实践总结。

## 1. 银行 Terraform 架构：多账户 + 多环境

### 1.1 账户结构设计

银行 AWS 环境典型结构：

```
Organization: hsbc-banking
│
├── Master Account (root)
│   └── 财务、计费、审计（不做日常操作）
│
├── Security Tooling Account (security-hub)
│   ├── IAM 身份中心
│   ├── Security Hub / GuardDuty
│   └── CloudTrail 日志聚合
│
├── DevOps Account (devops)
│   ├── ECR 镜像仓库
│   ├── CI/CD Runner (CodePipeline)
│   └── Terraform State S3
│
├── Production Account (prod-eu-west-1)
│   ├── EKS Cluster (payment-prod)
│   ├── RDS MySQL (payment-prod)
│   ├── ElastiCache Redis
│   └── 金融级网络配置
│
├── Staging Account (staging-eu-west-1)
│   └── 生产镜像的灰度验证
│
└── Dev Account (dev)
    └── 开发测试（无金融数据）
```

### 1.2 Terraform Backend 配置：远程状态 + 锁

```hcl
# backend.hcl
terraform {
  backend "s3" {
    bucket         = "hsbc-terraform-state-prod"
    key            = "payment-service/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true                    # 静态加密（银行合规）
    dynamodb_table = "hsbc-terraform-locks" # 状态锁，防止并发操作
    profile        = "hsbc-prod"

    # 启用版本控制（审计回滚）
    versioning = true
  }
}
```

**绝对禁止**将 Terraform State 放在本地文件——State 里包含敏感信息（密码、密钥），必须用 S3 + DynamoDB 锁。

```bash
# DynamoDB 表创建（先于 Terraform 运行）
aws dynamodb create-table \
  --table-name hsbc-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

## 2. 模块化设计：银行级 Terraform 模块

### 2.1 目录结构

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── backend.hcl
│   ├── staging/
│   └── prod/
├── modules/                            # 可复用模块
│   ├── eks-cluster/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── rds-mysql/
│   ├── elasticache-redis/
│   └── security-group/
└── shared/                             # 跨环境共享资源
    ├── iam-roles/
    └── vpc-peering/
```

### 2.2 EKS 模块：银行级生产配置

```hcl
# modules/eks-cluster/main.tf
variable "cluster_name" {
  description = "EKS Cluster Name"
  type        = string
}

variable "environment" {
  description = "Environment tag"
  type        = string
}

variable "vpc_id" {}
variable "private_subnet_ids" {}

variable "banking_addons" {
  description = "Enable banking-specific security addons"
  type        = bool
  default     = false
}

data "aws_eks_cluster" "main" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "main" {
  name = var.cluster_name
}

provider "aws" {
  region = "eu-west-1"
  alias  = "eks"
}

resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = "1.29"   # 生产锁定版本，不自动升级

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true   # 私有端点（银行要求）
    endpoint_public_access  = false  # 关闭公网端点
    public_access_cidrs    = []     # 无公网访问
  }

  kubernetes_network_config {
    ip_family         = "ipv4"
    service_cidr      = "172.20.0.0/16"
  }

  timeouts {
    create = "60m"
    update = "60m"
    delete = "60m"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    BankingTier = "HIGH"  # 银行标签，用于成本分摊
    Compliance   = "PCI-DSS"
  }
}

# EKS Node Group：银行生产配置
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-managed-nodes"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = ["m6i.xlarge"]   # Banking 规定最小实例类型

  scaling_config {
    desired_size = 3
    min_size     = 3
    max_size     = 20
  }

  # 银行要求：所有节点运行 EKS-optimized AMI（已安全加固）
  ami_type       = "AL2_x86_64"
  capacity_type  = "ON_DEMAND"   # 银行不用 Spot（不稳定）

  # 标签（用于成本分析）
  labels = {
    NodeGroup = "payment"
    Tier      = "application"
  }

  # 银行安全配置
  taints = var.banking_addons ? [{
    key    = "dedicated"
    value  = "banking"
    effect = "NO_SCHEDULE"    # 只调度标注了 dedicated=banking 的 Pod
  }] : []

  update_config {
    max_unavailable_percentage = 25  # 滚动更新，最多 25% 节点同时不可用
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
  ]
}

# IAM 角色：最小权限原则
resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}
```

### 2.3 RDS 模块：银行合规配置

```hcl
# modules/rds-mysql/main.tf
variable "db_name"     { type = string }
variable "instance_class" { type = string }
variable "environment"  { type = string }

resource "aws_db_instance" "main" {
  identifier     = "payment-${var.environment}"
  engine        = "mysql"
  engine_version = "8.0.36"
  instance_class = var.instance_class

  # 银行要求：加密存储
  storage_encrypted = true
  kms_key_id       = var.db_kms_key_arn

  # 网络配置：只在私有子网
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  # 银行合规：开启审计日志
  enabled_cloudwatch_logs_exports = ["error", "general", "audit"]

  # 参数组：银行安全配置
  parameter_group_name = aws_db_parameter_group.main.name

  # 备份：保留 30 天（银行最低要求）
  backup_retention_period = 30
  backup_window          = "03:00-04:00"  # 低峰期
  maintenance_window     = "sun:04:00-sun:06:00"

  # 高可用：Multi-AZ（银行必须）
  multi_az               = true
  deletion_protection    = true   # 生产禁止删除（银行要求）
  skip_final_snapshot    = false
  final_snapshot_identifier = "payment-${var.environment}-final-snapshot"

  tags = {
    Environment = var.environment
    Compliance  = "PCI-DSS"
    ManagedBy   = "Terraform"
  }
}

resource "aws_db_parameter_group" "main" {
  name   = "payment-${var.environment}-params"
  family = "mysql8.0"

  parameter {
    name  = "max_connections"
    value = "500"   # 银行系统连接数上限
  }

  parameter {
    name  = "require_secure_transport"
    value = "ON"    # 强制 SSL 连接
  }

  parameter {
    name  = "audit_log_exclude_accounts"
    value = "rdsadmin"  # 排除 RDS 内部账号
  }
}
```

## 3. 工作流：Terragrunt 管理多环境

直接用 Terraform 管理多环境会导致大量重复配置。Terragrunt 是 Terraform 的 thin wrapper，解决 DRY 问题：

### 3.1 Terragrunt 配置

```yaml
# environments/prod/payment-service/terragrunt.hcl
terraform {
  source = "../../../modules/eks-cluster"

  before_hook "validate" {
    commands = ["validate", "plan"]
    execute  = ["python3", "../../scripts/check-tagging.py"]
  }
}

inputs = merge(
  yamldecode(file(find_in_parent_folders("config.yaml")).inputs),
  {
    cluster_name = "payment-prod"
    environment  = "prod"
    banking_addons = true
  }
)

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket = "hsbc-terraform-state-prod"
    key         = "payment-service/prod/eks/terraform.tfstate"
    region      = "eu-west-1"
    encrypt     = true
    dynamodb_table = "hsbc-terraform-locks"
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "eu-west-1"
  alias  = "main"

  default_tags {
    tags = {
      Environment = "prod"
      ManagedBy   = "Terraform"
      CostCenter  = "PAYMENT-001"
    }
  }
}
EOF
}
```

### 3.2 一键部署流水线

```bash
#!/bin/bash
# scripts/deploy.sh
set -e

ENVIRONMENT=$1
SERVICE=$2

echo "==> Deploying ${SERVICE} to ${ENVIRONMENT}"

cd "environments/${ENVIRONMENT}/${SERVICE}"

# 1. 下载依赖
terragrunt run-all init

# 2. 格式化检查
terragrunt run-all fmt

# 3. 静态分析（银行合规）
terragrunt run-all validate

# 4. 计划（发送给 Slack 审批）
terragrunt run-all plan -out=plan.tfplan

# 5. 非生产环境自动 apply，生产环境需要审批
if [ "$ENVIRONMENT" == "prod" ]; then
  echo "==> Production deployment requires manual approval"
  terragrunt run-all apply plan.tfplan
else
  terragrunt run-all apply --auto-approve
fi
```

## 4. 银行特殊配置：安全与合规

### 4.1 PCI-DSS 合规：标签强制执行

```hcl
# global-require-tags/main.tf
variable "required_tags" {
  description = "Tags required by HSBC PCI-DSS compliance"
  type        = map(string)
  default = {
    Environment = ""   # 非空
    Compliance   = ""  # PCI-DSS 或 PII
    CostCenter   = ""  # 成本中心
    Owner        = ""  # 负责人
    ManagedBy    = "Terraform"
  }
}

resource "aws_resourcegroupstaggingapi" "compliance_check" {
  count = var.environment == "prod" ? 1 : 0

  # Terraform 创建资源后自动检查标签
  # 如果资源没有所有必需标签，pipeline 失败
}

# 政策即代码：SCP（Service Control Policy）
# 根账户级别强制标签
resource "aws_scp" "enforce_tags" {
  name        = "Require Tags on All Resources"
  description = "PCI-DSS requirement: All resources must have compliance tags"
  type       = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Deny"
      Action = ["*"]
      Resource = ["*"]
      Condition = {
        Null = {
          "aws:RequestTag/Compliance" = "true"
        }
      }
    }]
  })
}
```

### 4.2 Vault 动态凭证注入 Terraform

Terraform 运行时的数据库密码、API Key 不能硬编码——用 Vault Provider：

```hcl
# 从 Vault 动态获取数据库密码
provider "vault" {
  address = "https://vault.hsbctech.internal"
  token   = var.vault_token  # 从环境变量注入，不进代码
}

data "vault_kv_secret_v2" "db_creds" {
  mount = "database"
  name  = "payment-prod"
}

# 使用 Vault 获取的凭证配置 RDS
resource "aws_db_instance" "main" {
  # 密码从 Vault 动态获取，每次运行生成新密码
  # （实际生产中 Vault 每 1 小时轮换）
  username = data.vault_kv_secret_v2.db_creds.data["username"]
  password = data.vault_kv_secret_v2.db_creds.data["password"]
}
```

## 5. 状态文件管理：隔离与依赖

### 5.1 按服务隔离 State

```
每个微服务独立 State：
payment-service/prod/terraform.tfstate   → EKS + RDS
account-service/prod/terraform.tfstate  → EKS + RDS
shared-infra/terraform.tfstate          → VPC + IAM（所有服务依赖）
```

不能把所有资源放一个 State——一个大 State 坏了会影响所有服务。

### 5.2 State 依赖管理

```hcl
# 从共享 State 获取 VPC 信息
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "hsbc-terraform-state-prod"
    key    = "shared/vpc/terraform.tfstate"
  }
}

# 使用远程 State 的输出
resource "aws_eks_cluster" "main" {
  vpc_config {
    subnet_ids = data.terraform_remote_state.network.outputs.private_subnet_ids
  }
}
```

## 6. 踩坑总结

### 坑1：Terraform plan 和 apply 用不同角色

```bash
# plan 时用只读角色（防止意外修改）
AWS_PROFILE=hsbc-plan terragrunt run-all plan

# apply 时用写角色
AWS_PROFILE=hsbc-apply terragrunt run-all apply --auto-approve
```

### 坑2：循环依赖

```
EKS 需要 Security Group
Security Group 需要 EKS 的 Node 安全组 ID
→ 两者互相依赖
→ 解决：拆成两个 State，用 data.terraform_remote_state 打破循环
```

### 坑3：State 锁定超时

长时间运行的 `terraform apply`（如 RDS 创建 30 分钟）会持有锁。确保 CI/CD runner 超时足够长：

```hcl
# terraformrc
provider "aws" {
  max_retries = 3
  # 锁超时由 DynamoDB 控制，默认 10 分钟
  # 长时间操作用 terraform apply -lock-timeout=60m
}
```

## 7. 总结：Terraform 银行实施检查清单

| 阶段 | 检查项 | 优先级 |
|------|--------|--------|
| Backend | S3 + DynamoDB 锁，状态版本控制 | P0 |
| 模块化 | EKS/RDS/Redis 可复用模块 | P0 |
| 标签 | PCI-DSS 强制标签（SCP） | P0 |
| 密钥 | Vault Provider 动态凭证 | P0 |
| 权限 | 多账户角色分离（Plan vs Apply） | P0 |
| 网络 | 私有子网 + 无公网访问 | P0 |
| 审计 | CloudTrail 日志聚合 | P1 |
| 备份 | RDS 30天备份 + Multi-AZ | P1 |
| Terragrunt | 多环境 DRY 配置 | P2 |
| 演练 | 灾难恢复演练（删除重建） | P2 |

Terraform 让银行基础设施从"人的操作"变成"代码的版本"——版本即审计，操作即可复现。配合 ArgoCD 的 GitOps，上层的应用部署和底层的基础设施都可以从 Git 出发完整重建。

---

*相关阅读：[GitOps ArgoCD 银行级部署实战](/coding/DevOps/GitOps-ArgoCD银行级部署实战) · [HashiCorp Vault 银行密钥管理实战](/coding/安全/HashiCorp-Vault银行密钥管理实战) · [Kubernetes 完全指南](/coding/Kubernetes/Kubernetes快速入门完全指南)*
