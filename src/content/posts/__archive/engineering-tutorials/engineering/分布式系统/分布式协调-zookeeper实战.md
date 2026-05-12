---
title: 分布式协调：ZooKeeper 实战
summary: 在分布式系统中，有大量需要"协调"的工作：
publishedAt: '2026-02-26'
track: engineering
topic: 分布式系统
tags: []
featured: false
draft: false
slug: 分布式协调-zookeeper实战
legacyPaths:
  - /coding/分布式系统/分布式协调-ZooKeeper实战
---
> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：理解分布式协调服务，掌握 ZooKeeper 的实际应用

---

## 一、分布式协调服务

### 1.1 什么是协调服务？

在分布式系统中，有大量需要"协调"的工作：

```
分布式协调场景：

┌─────────────────────────────────────────────────────────────┐
│ 1. 配置管理                                                  │
│    100台服务器的配置需要保持一致                              │
│    修改配置需要立即同步到所有机器                             │
├─────────────────────────────────────────────────────────────┤
│ 2. 命名服务                                                  │
│    服务A需要找到服务B                                         │
│    服务列表动态变化                                           │
├─────────────────────────────────────────────────────────────┤
│ 3. 选主                                                     │
│    多台机器都自称是"主节点"                                   │
│    需要选出一个真正的Master                                    │
├─────────────────────────────────────────────────────────────┤
│ 4. 分布式锁                                                  │
│    多个服务抢同一个资源                                       │
│    只能有一个成功                                             │
├─────────────────────────────────────────────────────────────┤
│ 5. 集群管理                                                  │
│    监控机器状态                                               │
│    故障自动转移                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 常见协调服务

| 服务 | 特点 | 适用场景 |
|------|------|----------|
| **ZooKeeper** | 成熟稳定，Java生态 | 配置管理、选主、锁 |
| **etcd** | Go实现，高性能 | 服务发现、配置中心 |
| **Consul** | 多语言支持 | 服务发现、健康检查 |
| **Eureka** | Spring Cloud | 服务注册发现 |

---

## 二、ZooKeeper 入门

### 2.1 ZooKeeper 是什么？

**ZooKeeper 是一个分布式协调服务，提供分布式数据一致性解决方案。**

```
ZooKeeper 的定位：

            应用层
               │
    ┌───────────┼───────────┐
    │           │           │
  配置管理    服务发现     分布式锁
    │           │           │
    └───────────┼───────────┘
               │
          ZooKeeper
        （协调服务）
               │
    ┌───────────┼───────────┐
    │           │           │
  Leader      Follower    Observer
```

### 2.2 ZooKeeper 数据模型

**ZooKeeper 的数据模型是树形结构，类似文件系统。**

```
ZooKeeper 数据模型：

/
├── /app1                    # 应用1配置
│   ├── /app1/config
│   │   ├── db_url
│   │   └── timeout
│   └── /app1/servers
│       ├── server1
│       └── server2
├── /app2                    # 应用2配置
├── /election                # 选主节点
│   └── /leader
└── /locks                   # 分布式锁
    └── /order_lock
```

### 2.3 ZNode 类型

```
ZNode（节点）类型：

┌─────────────────────────────────────────────────────────────┐
│  持久节点（PERSISTENT）                                      │
│  - 创建后一直存在，直到主动删除                                │
│  - 例：/config/app                                           │
├─────────────────────────────────────────────────────────────┤
│  临时节点（EPHEMERAL）                                        │
│  - 客户端连接时存在，客户端断开自动删除                       │
│  - 例：服务注册                                               │
├─────────────────────────────────────────────────────────────┤
│  顺序节点（SEQUENCE）                                         │
│  - 创建时自动添加递增序号                                     │
│  - 例：分布式锁、选主                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、ZooKeeper 实战

### 3.1 基本操作

```java
// ZooKeeper 基本操作
public class ZKOperations {

    private ZooKeeper zk;

    @Before
    public void connect() throws Exception {
        zk = new ZooKeeper("localhost:2181", 5000, event -> {
            System.out.println("事件: " + event.getType());
        });
    }

    // 创建节点
    public void createNode(String path, String data) throws Exception {
        // 创建持久节点
        zk.create(path, data.getBytes(),
            ZooDefs.Ids.OPEN_ACL_UNSAFE,
            CreateMode.PERSISTENT);
    }

    // 读取数据
    public String getData(String path) throws Exception {
        byte[] data = zk.getData(path, false, null);
        return new String(data);
    }

    // 更新数据
    public void setData(String path, String data) throws Exception {
        zk.setData(path, data.getBytes(), -1);
    }

    // 删除节点
    public void deleteNode(String path) throws Exception {
        zk.delete(path, -1);
    }

    // 获取子节点
    public List<String> getChildren(String path) throws Exception {
        return zk.getChildren(path, false);
    }

    // 监听节点变化
    public void watchNode(String path) throws Exception {
        zk.getData(path, event -> {
            System.out.println("节点数据变化: " + event.getType());
        }, null);
    }
}
```

### 3.2 服务注册与发现

**利用临时节点实现服务注册。**

```java
// 服务注册
public class ServiceRegistry {

    private ZooKeeper zk;
    private String serviceName;

    // 注册服务
    public void register(String ip, int port) throws Exception {
        String path = "/services/" + serviceName + "/" + ip + ":" + port;

        // 创建临时节点（服务宕机自动消失）
        zk.create(path,
            (ip + ":" + port).getBytes(),
            ZooDefs.Ids.OPEN_ACL_UNSAFE,
            CreateMode.EPHEMERAL);

        System.out.println("服务注册成功: " + path);
    }

    // 发现服务
    public List<String> discover() throws Exception {
        String path = "/services/" + serviceName;
        return zk.getChildren(path, false);
    }
}
```

### 3.3 选主（Leader Election）

**利用临时顺序节点实现选主。**

```java
// 选主实现
public class LeaderElection {

    private ZooKeeper zk;
    private String electionPath = "/election";
    private String currentPath;

    // 参与选主
    public void runForLeader() throws Exception {
        // 创建临时顺序节点
        currentPath = zk.create(
            electionPath + "/candidate_",
            "".getBytes(),
            ZooDefs.Ids.OPEN_ACL_UNSAFE,
            CreateMode.EPHEMERAL_SEQUENTIAL
        );

        System.out.println("我创建的节点: " + currentPath);

        // 检查是否是主
        checkLeader();
    }

    // 检查是否是主
    private void checkLeader() throws Exception {
        List<String> children = zk.getChildren(electionPath, true);

        // 按序号排序
        Collections.sort(children);

        String smallest = children.get(0);

        if (currentPath.endsWith(smallest)) {
            System.out.println("我成为Leader!");
        } else {
            System.out.println("我是Follower, Leader是: " + smallest);
            // 监听前一个节点删除事件
            watchPreviousNode(children);
        }
    }

    // 监听前一个节点
    private void watchPreviousNode(List<String> children) throws Exception {
        int myIndex = children.indexOf(currentPath.substring(currentPath.lastIndexOf("/") + 1));

        if (myIndex > 0) {
            String previousNode = electionPath + "/" + children.get(myIndex - 1);

            zk.exists(previousNode, event -> {
                if (event.getType() == EventType.NodeDeleted) {
                    try {
                        checkLeader();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }
}
```

### 3.4 分布式锁

**利用临时顺序节点实现分布式锁。**

```java
// 分布式锁
public class DistributedLock {

    private ZooKeeper zk;
    private String lockPath = "/locks";
    private String currentLock;
    private CountDownLatch latch = new CountDownLatch(1);

    // 获取锁
    public boolean acquire(String lockName) throws Exception {
        // 创建临时顺序节点
        currentLock = zk.create(
            lockPath + "/" + lockName + "_",
            "".getBytes(),
            ZooDefs.Ids.OPEN_ACL_UNSAFE,
            CreateMode.EPHEMERAL_SEQUENTIAL
        );

        // 检查是否是第一个
        return checkLock();
    }

    private boolean checkLock() throws Exception {
        List<String> locks = zk.getChildren(lockPath, false);
        Collections.sort(locks);

        String smallest = locks.get(0);

        if (currentLock.endsWith(smallest)) {
            // 获取到锁
            return true;
        } else {
            // 监听前一个节点
            int myIndex = locks.indexOf(currentLock.substring(currentLock.lastIndexOf("/") + 1));
            String prevLock = lockPath + "/" + locks.get(myIndex - 1);

            zk.exists(prevLock, event -> {
                if (event.getType() == EventType.NodeDeleted) {
                    latch.countDown();
                }
            });

            // 等待
            latch.await(30, TimeUnit.SECONDS);
            return checkLock();
        }
    }

    // 释放锁
    public void release() throws Exception {
        if (currentLock != null) {
            zk.delete(currentLock, -1);
        }
    }
}
```

```java
// 使用分布式锁
public class OrderService {

    private DistributedLock lock = new DistributedLock();

    public void createOrder(String orderId) {
        try {
            // 获取锁（锁名称：order）
            if (lock.acquire("order")) {
                // 创建订单
                // ...

                System.out.println("订单创建成功: " + orderId);
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try {
                lock.release();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
```

---

## 四、ZooKeeper 集群

### 4.1 ZooKeeper 集群架构

```
ZooKeeper 集群（ZooKeeper Ensemble）：

              客户端
                │
          ┌─────┼─────┐
          │     │     │
        ┌─┴─┐ ┌─┴─┐ ┌─┴─┐
        │Leader  │Follower│Observer
        └───┘ └───┘ └───┘

角色说明：
- Leader: 处理所有写请求，事务提案
- Follower: 参与选主，处理读请求
- Observer: 不参与选主，只处理读请求

投票机制：
- 2N+1 台机器，可以容忍 N 台故障
- 3 台：容忍1台故障
- 5 台：容忍2台故障
```

### 4.2 集群配置

```properties
# zoo.cfg
# 3台机器集群配置

# 机器1
server.1=192.168.1.1:2888:3888
# 机器2
server.2=192.168.1.2:2888:3888
# 机器3
server.3=192.168.1.3:2888:3888

# 参数说明：
# server.N=IP:port1:port2
# - port1: 集群内通信端口
# - port2: Leader选举端口
```

---

## 五、ZooKeeper 应用场景总结

```
ZooKeeper 典型应用：

┌─────────────────────────────────────────────────────────────┐
│ 配置中心                                                    │
│ - 所有服务监听同一个配置节点                                 │
│ - 配置变更自动推送                                           │
├─────────────────────────────────────────────────────────────┤
│ 服务注册发现                                                │
│ - 临时节点自动注册                                           │
│ - 客户端监听服务列表                                         │
├─────────────────────────────────────────────────────────────┤
│ 分布式锁                                                    │
│ - 临时顺序节点                                              │
│ - Watch 机制等待                                             │
├─────────────────────────────────────────────────────────────┤
│ 选主                                                        │
│ - 最小的节点成为主                                           │
│ - 主节点故障自动重新选主                                     │
├─────────────────────────────────────────────────────────────┤
│ 消息队列（Kafka 用 ZooKeeper）                              │
│ - Broker 注册                                               │
│ - 分区 Leader 选举                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **ZooKeeper** | 分布式协调服务，提供一致性数据存储 |
| **ZNode** | ZooKeeper 中的数据节点 |
| **临时节点** | 客户端断开自动删除，适合服务注册 |
| **顺序节点** | 自动递增序号，适合选主和锁 |
| **Watch** | 监听节点变化，实时响应 |

### 实战要点

1. 服务注册用临时节点
2. 选主用临时顺序节点
3. 分布式锁用顺序节点 + Watch
4. 配置管理用持久节点 + Watch

---

## 下章预告

下一章我们将学习 **分布式计算：MapReduce 与 Spark 入门**，了解如何进行分布式数据处理。

> 📚 下一章：[分布式计算：MapReduce与Spark入门](/coding/分布式系统/分布式计算-MapReduce与Spark入门)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
