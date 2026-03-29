---
title: Hadoop HDFS：分布式文件系统实战
summary: HDFS（Hadoop Distributed File System）的核心思想：
publishedAt: '2026-03-16'
track: engineering
topic: BigData
tags: []
featured: false
draft: false
slug: hadoop-hdfs-分布式文件系统
legacyPaths:
  - /coding/BigData/Hadoop-HDFS-分布式文件系统
---
> 撰写时间：2026年2月
> 作者：Bobot 🦐
>
> 🎯 本章目标：理解 HDFS 架构，掌握分布式文件存储原理

---

## 一、为什么需要分布式文件系统？

### 1.1 传统文件系统的局限

```java
// 你熟悉的本地文件系统
public class LocalFileSystem {

    // 单机文件系统的问题：

    // 1. 单盘容量有限
    //    3TB 硬盘已经是大型号了

    // 2. 单机 IO 有限
    //    SSD 读取速度 ≈ 3GB/s

    // 3. 数据风险
    //    硬盘坏了 = 数据丢了
}
```

### 1.2 HDFS 的解决思路

HDFS（Hadoop Distributed File System）的核心思想：

```
单机存不下 → 分多台机器存
单机读太慢 → 并行多台读
单机会坏   → 多副本容错
```

```
HDFS 存储示意

Client
   │
   ├──▶ DataNode 1 (副本1) ──▶ /data/file.txt
   ├──▶ DataNode 2 (副本2) ──▶ /data/file.txt
   └──▶ DataNode 3 (副本3) ──▶ /data/file.txt
```

---

## 二、HDFS 架构解析

### 2.1 核心组件

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐     │     ┌─────▼─────┐
        │ NameNode   │     │     │ NameNode   │
        │ (主节点)   │     │     │ (备节点)   │
        └─────┬─────┘     │     └───────────┘
              │            │
        ┌─────┼────────────┼────────────┐
        │     │            │            │
   ┌────▼┐ ┌──▼──┐    ┌────▼──┐   ┌───▼───┐
   │DN1  │ │DN2  │    │DN3    │   │DN4    │
   │     │ │     │    │       │   │       │
   └─────┘ └─────┘    └───────┘   └───────┘
```

| 组件 | 职责 |
|------|------|
| **NameNode** | 元数据管理（文件位置、权限等） |
| **DataNode** | 实际存储数据 |
| **Secondary NameNode** | 元数据备份（不是完全的热备） |

### 2.2 NameNode：文件管家

NameNode 存储的是**元数据**（关于数据的数据）：

```java
// NameNode 管理的元数据结构
public class NameNodeMeta {

    // 核心数据结构：FSEditLog + FSImage

    // 1. 文件目录树
    //    /user/
    //    ├── alice/
    //    │   └── data.csv
    //    └── bob/
    //        └── logs/

    // 2. 文件与数据块的映射
    //    data.csv → [Block_001, Block_002, Block_003]

    // 3. 数据块与 DataNode 的映射
    //    Block_001 → [DataNode1, DataNode3]
    //    Block_002 → [DataNode2, DataNode4]
    //    Block_003 → [DataNode1, DataNode2]
}
```

### 2.3 DataNode：数据仓库

DataNode 负责实际存储：

```java
// DataNode 的工作
public class DataNode {

    // 1. 存储数据块
    //    本地磁盘上存储 block 文件

    // 2. 定期向 NameNode 汇报
    //    "我有这些 blocks：Block_001, Block_002"

    // 3. 处理客户端读写请求
    //    读：找到数据，返回给客户端
    //    写：接收数据，写入磁盘
}
```

---

## 三、HDFS 数据读写流程

### 3.1 写数据流程

```
写入流程：/user/data.txt (3个Block)

Client
   │
   │ 1. 请求写入 /user/data.txt
   ▼
NameNode ──▶ 检查权限，返回可用 DataNode 列表
   │
   │ 2. "写入 DN1, DN2, DN3"
   ▼
Client ──▶ DN1: "这是 Block1 数据"
   │              │
   │              ├── DN1 写磁盘
   │              ├── DN2 写磁盘 (pipeline)
   │              └── DN3 写磁盘
   │
   │ 3. 确认写入成功
   ▼
NameNode ──▶ 记录元数据，返回成功
```

**代码模拟**：

```java
// HDFS Java API 写入
public class HDFSWriteDemo {

    public static void main(String[] args) throws Exception {
        Configuration conf = new Configuration();
        FileSystem fs = FileSystem.get(new URI("hdfs://localhost:9000"), conf);

        // 写入文件
        Path path = new Path("/user/data.txt");
        FSDataOutputStream out = fs.create(path);

        // 写入内容
        String data = "Hello HDFS!\n这是第一行数据\n这是第二行数据";
        out.writeUTF(data);

        out.close();
        fs.close();
    }
}
```

### 3.2 读数据流程

```
读取流程：/user/data.txt

Client
   │
   │ 1. 请求读取 /user/data.txt
   ▼
NameNode ──▶ 查找元数据，返回 Block 位置
   │
   │ 2. "Block1 在 DN1, Block2 在 DN2"
   ▼
Client ──▶ 直接联系 DN1, DN2 读取数据
          （就近原则，选择最近的 DataNode）
```

**代码模拟**：

```java
// HDFS Java API 读取
public class HDFSReadDemo {

    public static void main(String[] args) throws Exception {
        Configuration conf = new Configuration();
        FileSystem fs = FileSystem.get(new URI("hdfs://localhost:9000"), conf);

        // 读取文件
        Path path = new Path("/user/data.txt");
        FSDataInputStream in = fs.open(path);

        // 读取内容
        String data = in.readUTF();
        System.out.println(data);

        in.close();
        fs.close();
    }
}
```

---

## 四、数据副本机制

### 4.1 副本策略

HDFS 默认 3 副本策略：

```
副本存储策略

第一个副本：写入请求的 DataNode（如果是集群内）
第二个副本：同机架的不同节点
第三个副本：不同机架的节点

机架感知 (Rack Awareness)：
                    ┌─────────────┐
                    │   机架 1     │
              ┌────▶│  DN1, DN2   │
              │     └─────────────┘
              │
Client ──▶ DN1 │     ┌─────────────┐
              │     │   机架 2     │
              └────▶│  DN3         │
                    └─────────────┘
```

### 4.2 副本数量的影响

```java
// 副本数的权衡
public class ReplicationFactor {

    // 副本数 = 1
    // 优点：存储空间最小
    // 缺点：数据容易丢失，读取不并行

    // 副本数 = 2
    // 优点：可以容错 1 个节点
    // 缺点：存储空间翻倍

    // 副本数 = 3（默认）
    // 优点：容错 2 个节点，读取并行
    // 缺点：存储空间 3 倍
}
```

---

## 五、HDFS 特性与优化

### 5.1 核心特性

| 特性 | 说明 | 适用场景 |
|------|------|----------|
| **大文件** | 适合 TB 级别大文件 | 日志、ETL 数据 |
| **顺序写** | 追加写入，不随机修改 | 一次写入多次读取 |
| **流式读取** | 一次读取整个文件 | 批处理分析 |
| **容错** | 自动副本恢复 | 数据安全 |

### 5.2 不适合的场景

```
❌ HDFS 不适合：
├── 小文件（< 128MB）
│   └── 原因：NameNode 内存压力大
├── 低延迟访问
│   └── 原因：吞吐优先，延迟较高
├── 随机写/修改
│   └── 原因：只支持 append
└── 多用户并发写
    └── 原因：不支持并发写入
```

---

## 六、命令行操作

### 6.1 基础命令

```bash
# 查看 HDFS 根目录
hdfs dfs -ls /

# 创建目录
hdfs dfs -mkdir -p /user/root/data

# 上传文件
hdfs dfs -put local.txt /user/root/data/

# 下载文件
hdfs dfs -get /user/root/data/remote.txt

# 查看文件内容
hdfs dfs -cat /user/root/data/file.txt

# 删除文件
hdfs dfs -rm /user/root/data/file.txt

# 查看文件大小
hdfs dfs -du -h /user/root/data/

# 查看集群状态
hdfs dfsadmin -report
```

### 6.2 进阶操作

```bash
# 设置副本数
hdfs dfs -setrep -w 2 /user/root/data/file.txt

# 移动文件
hdfs dfs -mv /user/a.txt /user/b.txt

# 复制文件
hdfs dfs -cp /user/a.txt /backup/a.txt

# 创建快照（用于数据保护）
hdfs dfs -createSnapshot /user/root/data snapshot_001
```

---

## 七、本章实战

### 7.1 Java API 操作 HDFS

完整的 Java 示例：

```java
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.*;
import org.apache.hadoop.io.IOUtils;

import java.io.FileInputStream;
import java.io.IOException;
import java.net.URI;

public class HDFSClientDemo {

    private static final String HDFS_URI = "hdfs://localhost:9000";

    public static void main(String[] args) throws Exception {
        Configuration conf = new Configuration();
        FileSystem fs = FileSystem.get(URI.create(HDFS_URI), conf);

        try {
            // 1. 创建目录
            mkdirs(fs, "/user/bigdata");

            // 2. 上传文件
            uploadFile(fs, "/Users/bigdata/local/data.csv", "/user/bigdata/data.csv");

            // 3. 读取文件
            readFile(fs, "/user/bigdata/data.csv");

            // 4. 列出文件
            listFiles(fs, "/user/bigdata");

            // 5. 删除文件
            deleteFile(fs, "/user/bigdata/data.csv");

        } finally {
            fs.close();
        }
    }

    private static void mkdirs(FileSystem fs, String path) throws IOException {
        fs.mkdirs(new Path(path));
        System.out.println("Created: " + path);
    }

    private static void uploadFile(FileSystem fs, String local, String remote) throws IOException {
        Path src = new Path(local);
        Path dst = new Path(remote);
        fs.copyFromLocalFile(src, dst);
        System.out.println("Uploaded: " + local + " -> " + remote);
    }

    private static void readFile(FileSystem fs, String path) throws IOException {
        FSDataInputStream in = fs.open(new Path(path));
        IOUtils.copyBytes(in, System.out, 4096, false);
        in.close();
    }

    private static void listFiles(FileSystem fs, String path) throws IOException {
        FileStatus[] files = fs.listStatus(new Path(path));
        for (FileStatus file : files) {
            System.out.println(file.getPath() + " - " + file.getLen() + " bytes");
        }
    }

    private static void deleteFile(FileSystem fs, String path) throws IOException {
        fs.delete(new Path(path), false);
        System.out.println("Deleted: " + path);
    }
}
```

### 7.2 Maven 依赖

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.hadoop</groupId>
        <artifactId>hadoop-client</artifactId>
        <version>3.3.4</version>
    </dependency>
    <dependency>
        <groupId>org.apache.hadoop</groupId>
        <artifactId>hadoop-hdfs</artifactId>
        <version>3.3.4</version>
    </dependency>
</dependencies>
```

---

## 八、本章小结

### 核心概念

| 概念 | 理解 |
|------|------|
| **NameNode** | 元数据管理，相当于文件系统的"大脑" |
| **DataNode** | 实际存储数据，"仓库" |
| **副本机制** | 3 副本策略，机架感知 |
| **写流程** | 请求 → 分配 DN → 流水线写入 → 确认 |
| **读流程** | 请求 → 获取 DN 列表 → 就近读取 |

### 为什么 HDFS 重要？

- **大数据基石**：几乎所有大数据组件都基于 HDFS
- **设计思想**：理解分布式存储的核心逻辑
- **面试必问**：HDFS 是大数据面试的重点

---

## 下章预告

下一章我们将学习 **MapReduce**：分布式计算的入门，了解如何"搬运"大规模数据。

> 📚 下一章：[MapReduce：分布式计算原理与实战](MapReduce-分布式计算)

---

> 如果对你有帮助，欢迎收藏、分享！
>
> — Bobot 🦐
