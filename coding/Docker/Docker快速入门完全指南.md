# Docker 快速入门完全指南

> 容器化技术的核心概念与实战

---

## 1. Docker 简介

### 1.1 什么是 Docker？

Docker 是一个容器化平台：

```
传统部署：
┌─────────────────────────────────────────────┐
│  物理服务器                                  │
│  ┌─────────────────────────────────────┐  │
│  │         虚拟机                        │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐     │  │
│  │  │App1│ │App2│ │App3│ │App4│     │  │
│  │  └────┘ └────┘ └────┘ └────┘     │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐     │  │
│  │  │Lib1│ │Lib2│ │Lib3│ │Lib4│     │  │
│  │  └────┘ └────┘ └────┘ └────┘     │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐     │  │
│  │  │OS1 │ │OS2 │ │OS3 │ │OS4 │     │  │
│  │  └────┘ └────┘ └────┘ └────┘     │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

Docker 部署：
┌─────────────────────────────────────────────┐
│  Docker 引擎                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐             │
│  │App1│ │App2│ │App3│ │App4│  ← 容器       │
│  └────┘ └────┘ └────┘ └────┘             │
│           共享操作系统                         │
└─────────────────────────────────────────────┘
```

### 1.2 核心概念

```
镜像（Image）   →  模板（只读）
容器（Container）→  镜像的运行实例
仓库（Repository）→  存放镜像的地方
```

---

## 2. Docker 安装

### 2.1 macOS 安装

```bash
# 使用 Homebrew
brew install --cask docker

# 启动 Docker Desktop
open -a Docker
```

### 2.2 验证安装

```bash
docker --version
docker-compose --version
docker ps
```

---

## 3. 镜像操作

### 3.1 常用命令

```bash
# 查看镜像
docker images
docker image ls

# 拉取镜像
docker pull nginx:latest
docker pull redis:7-alpine

# 删除镜像
docker rmi nginx:latest
docker image prune -a  # 删除未使用的镜像

# 构建镜像
docker build -t myapp:1.0 .
```

### 3.2 Dockerfile 编写

```dockerfile
# 基础镜像
FROM openjdk:17-jdk-slim

# 设置工作目录
WORKDIR /app

# 复制文件
COPY target/app.jar /app/app.jar

# 设置环境变量
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# 暴露端口
EXPOSE 8080

# 启动命令
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

---

## 4. 容器操作

### 4.1 常用命令

```bash
# 运行容器
docker run -d -p 8080:8080 --name myapp myapp:1.0

# 参数说明：
# -d: 后台运行
# -p: 端口映射（主机端口:容器端口）
# --name: 容器名称
# -e: 环境变量
# -v: 挂载卷
# --network: 网络

# 查看容器
docker ps           # 运行中的容器
docker ps -a        # 所有容器

# 停止/启动容器
docker stop myapp
docker start myapp
docker restart myapp

# 删除容器
docker rm myapp
docker rm -f myapp  # 强制删除

# 查看日志
docker logs -f myapp
docker logs --tail 100 myapp

# 进入容器
docker exec -it myapp /bin/bash
```

### 4.2 端口映射

```
主机端口:容器端口
   8080  :  8080

┌─────────────┐         ┌─────────────┐
│   主机      │         │   容器      │
│             │         │             │
│  :8080  ──────▶  :8080         │
│             │         │             │
└─────────────┘         └─────────────┘
```

---

## 5. 数据管理

### 5.1 数据卷

```bash
# 创建数据卷
docker volume create mydata

# 挂载数据卷
docker run -v mydata:/app/data myapp:1.0

# 挂载主机目录
docker run -v /host/path:/container/path myapp:1.0
```

```
┌─────────────────────────────────────┐
│              Docker 主机               │
│  ┌─────────────────────────────────┐│
│  │  /host/data  ────────────────▶ ││
│  │                                ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│           容器                         │
│  ┌─────────────────────────────────┐│
│  │  /container/data               ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 6. 网络

### 6.1 网络模式

| 模式 | 说明 |
|------|------|
| bridge | 默认模式，容器间通信 |
| host | 与主机共享网络 |
| none | 无网络 |
| container | 共享另一个容器的网络 |

### 6.2 自定义网络

```bash
# 创建网络
docker network create mynetwork

# 运行容器时指定网络
docker run --network mynetwork -d myapp:1.0

# 容器间通过容器名通信
# myapp 容器可以访问 db 容器的 db:3306
docker run --network mynetwork --name db -d mysql:8
docker run --network mynetwork --link db -d myapp:1.0
```

---

## 7. Docker Compose

### 7.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # MySQL 服务
  mysql:
    image: mysql:8.0
    container_name: mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: myapp
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - myapp-network

  # Redis 服务
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    networks:
      - myapp-network

  # 应用服务
  app:
    build: .
    container_name: myapp
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/myapp
      SPRING_REDIS_HOST: redis
    networks:
      - myapp-network

networks:
  myapp-network:
    driver: bridge

volumes:
  mysql-data:
```

### 7.2 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 构建镜像
docker-compose build

# 重新创建服务
docker-compose up -d --force-recreate
```

---

## 8. 实战示例

### 8.1 部署 Spring Boot 应用

```dockerfile
# Dockerfile
FROM maven:3.8-openjdk-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests

FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
# 构建并运行
docker build -t myapp:1.0 .
docker run -d -p 8080:8080 myapp:1.0
```

---

## 9. 最佳实践

### 9.1 镜像优化

```dockerfile
# ❌ 不好：多层复制
FROM ubuntu
RUN apt-get update
RUN apt-get install -y openjdk-17
RUN mkdir /app
COPY . /app
WORKDIR /app
RUN mvn package
ENTRYPOINT ["java", "-jar", "app.jar"]

# ✅ 好：减少层数
FROM maven:3.8-openjdk-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests

FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 9.2 安全建议

```dockerfile
# ❌ 不使用 root 用户
USER root

# ✅ 创建专用用户
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -D appuser
USER appuser
```

---

## 10. 总结

| 命令 | 说明 |
|------|------|
| docker pull | 拉取镜像 |
| docker build | 构建镜像 |
| docker run | 运行容器 |
| docker ps | 查看容器 |
| docker logs | 查看日志 |
| docker-compose | 多容器编排 |

---

> 📚 续篇：《Kubernetes（K8s）快速入门》
