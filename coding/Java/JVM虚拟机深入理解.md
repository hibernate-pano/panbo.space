# JVM 虚拟机深入理解

> "深入理解 JVM，是成为 Java 高级工程师的必经之路。"

---

## 目录

1. [JVM 概述](#1-jvm-概述)
2. [JVM 内存模型](#2-jvm-内存模型)
3. [垃圾回收机制](#3-垃圾回收机制)
4. [类加载机制](#4-类加载机制)
5. [JVM 性能调优](#5-jvm-性能调优)
6. [实战问题排查](#6-实战问题排查)

---

## 1. JVM 概述

### 1.1 什么是 JVM

**JVM（Java Virtual Machine）** 是 Java 程序的运行环境，它是一个虚拟的计算机，具有自己的指令集和内存管理机制。

```mermaid
flowchart LR
    A[Java 源文件] --> B[javac 编译器]
    B --> C[.class 字节码]
    C --> D[JVM]
    D --> E[操作系统 + 硬件]

    D --> D1[类加载器]
    D --> D2[执行引擎]
    D --> D3[本地库]
```

### 1.2 JVM 的核心功能

```
JVM 核心功能：
• 字节码执行
• 内存管理（自动分配/回收）
• 平台无关性（一次编译，到处运行）
• 安全性（沙箱机制）
```

### 1.3 JVM 体系结构

```mermaid
flowchart TB
    subgraph JVM["JVM"]
        direction TB

        subgraph Components["核心组件"]
            CL[类加载器<br/>ClassLoader] --> EE[执行引擎<br/>Execution Engine]
            EE --> NI[本地库<br/>Native Interface]
        end

        subgraph Runtime["运行时数据区"]
            PC[程序计数器<br/>PC Register]
            VS[Java 虚拟机栈<br/>VM Stack]
            NMS[本地方法栈<br/>Native Method Stack]
            Heap[堆<br/>Heap]
            MA[方法区<br/>Method Area]
        end

        CL --> Runtime
    end

    JVM --> OS[操作系统 + 硬件]

    classDef shared fill:#e1f5fe,stroke:#01579b
    classDef thread fill:#fff3e0,stroke:#e65100
    classDef heap fill:#e8f5e9,stroke:#2e7d32

    class PC,VS,NMS thread
    class Heap,MA heap
    class CL,EE,NI,Runtime shared
```

---

## 2. JVM 内存模型

### 2.1 运行时数据区

JVM 在运行时会分配不同的内存区域，用于存储不同的数据：

| 区域 | 线程共享 | 用途 |
|------|----------|------|
| **程序计数器** | 否 | 记录当前线程执行的字节码行号 |
| **Java 虚拟机栈** | 否 | 存储局部变量表、操作数栈、动态链接 |
| **本地方法栈** | 否 | 为 Native 方法服务 |
| **堆** | 是 | 对象实例、数组 |
| **方法区** | 是 | 类信息、常量、静态变量、JIT 编译产物 |

### 2.2 堆内存模型

```mermaid
flowchart TB
    subgraph Heap["堆内存 (Heap)"]
        direction TB

        subgraph Young["Young Generation (新生代)"]
            direction LR
            subgraph Eden["Eden 区 (8)"]
                E[对象分配]
            end
            subgraph S0["Survivor0 (1)"]
                S0x[存活对象]
            end
            subgraph S1["Survivor1 (1)"]
                S1x[存活对象]
            end
        end

        Old["Old Generation (老年代)<br/>Tenured"]
    end

    E -->|"Minor GC"| S0x
    S0x -->|"交换"| S1x
    S1x -->|"年龄达标"| Old

    style Young fill:#e3f2fd,stroke:#1565c0
    style Old fill:#fce4ec,stroke:#c2185b
    style Eden fill:#e8f5e9,stroke:#2e7d32
    style S0 fill:#fff3e0,stroke:#e65100
    style S1 fill:#fff3e0,stroke:#e65100
```

> **默认比例**：Young : Old = 1 : 2
> **Eden : S0 : S1 = 8 : 1 : 1

### 2.3 虚拟机栈详解

每个线程都有自己的虚拟机栈，栈由**栈帧**组成：

```mermaid
flowchart TB
    subgraph Stack["Java 虚拟机栈"]
        direction TB

        Frame3["栈帧 3 (当前活跃)<br/>Active Frame"]
        Frame2["栈帧 2"]
        Frame1["栈帧 1"]
    end

    subgraph Frame3Details["栈帧结构"]
        direction LR
        LV[局部变量表<br/>Local Variables]
        OS[操作数栈<br/>Operand Stack]
        DL[动态链接<br/>Dynamic Linking]
        RA[方法返回地址<br/>Return Address]
    end

    Frame3 --- Frame3Details

    style Frame3 fill:#e1f5fe,stroke:#01579b
    style Frame2 fill:#f5f5f5,stroke:#616161
    style Frame1 fill:#f5f5f5,stroke:#616161

### 2.4 常见内存溢出

```
1. Java 堆溢出
   - 原因：对象创建过多，GC 后仍不足
   - 解决：增加堆大小、检查内存泄漏

2. 虚拟机栈溢出
   - 原因：递归调用过深、线程过多
   - 解决：减少递归深度、减少线程数

3. 方法区溢出
   - 原因：类信息过多（如动态代理、CGlib）
   - 解决：增大方法区、使用 CMS GC

4. 本地直接内存溢出
   - 原因：NIO 使用 DirectByteBuffer 过多
   - 解决：合理使用 NIO、及时释放内存
```

---

## 3. 垃圾回收机制

### 3.1 如何判断对象可回收

#### 引用计数法

```
原理：对象每被引用一次，计数器+1；引用失效，计数器-1

缺点：无法解决循环引用问题
```

#### 可达性分析算法

```mermaid
flowchart TB
    subgraph GC["GC Roots 可达性分析"]
        Root["GC Root"] --> A[A]
        Root --> B[B]
        A --> C[C]
        B --> D[D]

        style Root fill:#ff9800,stroke:#e65100,stroke-width:3px
        style A fill:#4caf50,stroke:#2e7d32
        style B fill:#4caf50,stroke:#2e7d32
        style C fill:#4caf50,stroke:#2e7d32
        style D fill:#f44336,stroke:#c62828
    end

    note["GC后：D 可回收（无引用链到达）"]
    D -.-> note
```

GC Roots 包括：
- 虚拟机栈中引用的对象
- 方法区中类静态属性引用的对象
- 方法区中常量引用的对象
- 本地方法栈中 JNI 引用的对象

### 3.2 垃圾回收算法

#### 标记-清除算法

```mermaid
flowchart LR
    subgraph Step1["1. 标记"]
        M1[对象A] --> M1x[✓]
        M2[对象B] --> M2x[✓]
        M3[对象C]
        M4[对象D] --> M4x[✓]
    end

    subgraph Step2["2. 清除"]
        C1[对象A]
        C2
        C3[对象C]
    end

    M1x -->|"删除"| C1
    M2x -->|"删除"| C2
    M4x -->|"删除"| C3

    note1[产生内存碎片]
    C1 -.-> note1

    style M1 fill:#4caf50
    style M2 fill:#f44336
    style M3 fill:#4caf50
    style M4 fill:#f44336
```

缺点：产生内存碎片、效率不高

#### 复制算法

```mermaid
flowchart LR
    subgraph Before["初始状态"]
        direction TB
        A1[区域A: ABCD] -->|"复制"| B1[区域B: ABCD]
    end

    direction LR

    After["清空区域A"]

    A1 -->|"存活"| A2[区域A: 空]
    B1 -->|"存活"| B2[区域B: ABCD]

    style A1 fill:#e3f2fd
    style B1 fill:#e8f5e9
    style A2 fill:#ffcdd2
    style B2 fill:#c8e6c9
```

优点：无碎片、简单高效 | 缺点：可用内存减半 | 适用于：新生代

#### 标记-整理算法

```mermaid
flowchart LR
    subgraph Before["整理前"]
        OB1[对象A]
        OB2[死对象]
        OB3[对象B]
        OB4[死对象]
        OB5[对象C]
    end

    After["整理后"]

    OB1 -->|"移动"| OA1[对象A]
    OB3 -->|"移动"| OA2[对象B]
    OB5 -->|"移动"| OA3[对象C]
    OA3 -->|"清理"| OA4[边界外清除]

    style OB2 fill:#ffcdd2
    style OB4 fill:#ffcdd2
    style OA4 fill:#ffcdd2
```

优点：无碎片、内存利用率高 | 适用于：老年代

### 3.3 垃圾收集器

#### 各年代收集器组合

```mermaid
flowchart TB
    subgraph Young["Young Generation (新生代)"]
        Y1[Serial<br/>串行]
        Y2[ParNew<br/>并行]
        Y3[Parallel<br/>Scavenge]
        Y4[G1]
    end

    subgraph Old["Old Generation (老年代)"]
        O1[Serial Old<br/>串行]
        O2[ParOld Gen<br/>并行]
        O3[Parallel Old<br/>并行]
        O4[CMS]
        O5[G1]
        O6[ZGC]
    end

    Y1 -->|"组合"| O1
    Y2 -->|"组合"| O2
    Y2 -->|"组合"| O4
    Y3 -->|"组合"| O3
    Y4 -->|"组合"| O5

    style Young fill:#e3f2fd,stroke:#1565c0
    style Old fill:#fce4ec,stroke:#c2185b
    style Y1 fill:#fff9c4,stroke:#f57f17
    style Y2 fill:#b3e5fc,stroke:#0277bd
    style Y3 fill:#c8e6c9,stroke:#2e7d32
    style Y4 fill:#e1bee7,stroke:#7b1fa2
    style O1 fill:#fff9c4,stroke:#f57f17
    style O2 fill:#ffccbc,stroke:#d84315
    style O3 fill:#c8e6c9,stroke:#2e7d32
    style O4 fill:#ffccbc,stroke:#d84315
    style O5 fill:#e1bee7,stroke:#7b1fa2
    style O6 fill:#b2dfdb,stroke:#00695c
```

#### 常见收集器对比

| 收集器 | 串行/并行 | 作用区域 | 特点 | 适用场景 |
|--------|----------|----------|------|----------|
| **Serial** | 串行 | Young/Old | 单线程、STW | 单核、Client |
| **ParNew** | 并行 | Young | 多线程、STW | 多核、Server |
| **Parallel** | 并行 | Young | 吞吐量优先 | 后台计算 |
| **Serial Old** | 串行 | Old | 单线程 | 单核、Client |
| **Parallel Old** | 并行 | Old | 吞吐量优先 | 后台计算 |
| **CMS** | 并发 | Old | 低延迟 | 互联网应用 |
| **G1** | 并发 | 全堆 | 可预测延迟 | 大堆、通用 |
| **ZGC** | 并发 | 全堆 | 毫秒级延迟 | 超大堆 |

### 3.4 G1 收集器详解

G1（Garbage-First）是目前最常用的收集器：

```
G1 内存布局：
┌─────────────────────────────────────────────────────────┐
│                    Heap (2G)                          │
├─────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐ │
│ │Region│ │Region│ │Region│ │Region│ │Region│ │... │ │
│ │ 1M   │ │ 1M   │ │ 1M   │ │ 1M   │ │ 1M   │ │    │ │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └─────┘ │
│                                                         │
│  Region 类型：                                          │
│  • Eden Region (新对象)                                │
│  • Survivor Region (存活对象)                          │
│  • Old Region (老对象)                                  │
│  • Humongous Region (大对象 > 50% Region)              │
└─────────────────────────────────────────────────────────┘
```

G1 的工作流程：

```
1. Young GC
   - 收集年轻代中的 Eden 和 Survivor
   - 复制到新的 Survivor 或 Old

2. Mixed GC
   - 收集所有年轻代 + 部分老年代
   - 优先回收价值最高的海陆

3. Full GC
   - 串行/并行 GC
   - 收拾不了的极端情况
```

---

## 4. 类加载机制

### 4.1 类加载过程

```mermaid
stateDiagram-v2
    [*] --> 加载: 读取 .class 文件
    加载 --> 验证: 验证字节码安全性
    验证 --> 准备: 分配内存、设置默认值
    准备 --> 解析: 符号引用→直接引用
    解析 --> 初始化: <new> 对象时
    初始化 --> 使用
    使用 --> 卸载: 类不再被引用
    使用 --> [*]
    卸载 --> [*]
```

### 4.2 类加载器层次

```mermaid
flowchart TB
    Custom[自定义 ClassLoader<br/>Custom ClassLoader]
    App[应用类加载器<br/>Application<br/>AppClassLoader]
    Ext[扩展类加载器<br/>Extension<br/>ExtClassLoader]
    Bootstrap[启动类加载器<br/>Bootstrap<br/>C++实现]

    Custom --> App
    App --> Ext
    Ext --> Bootstrap

    style Bootstrap fill:#ff9800,stroke:#e65100,stroke-width:3px
    style Ext fill:#ffc107,stroke:#ff6f00
    style App fill:#ffeb3b,stroke:#f57f17
    style Custom fill:#4caf50,stroke:#2e7d32
```

### 4.3 双亲委派模型

```mermaid
flowchart TB
    Start["loadClass()"] --> Check{检查是否<br/>已加载}
    Check -->|已加载| Return["返回类"]

    Check -->|未加载| Delegate["委派给父加载器"]

    Delegate --> Top{父加载器<br/>是否为空}

    Top -->|是| Load["自己加载<br/>(findClass)"]

    Top -->|否| Delegate

    Load --> Return

    subgraph 递归向上
        direction TB
        A[App ClassLoader]
        B[Ext ClassLoader]
        C[Bootstrap]
    end

    Delegate -.-> A
    A -.-> B
    B -.-> C

    目的:
    目的 -.-> 防止类的重复加载
    目的 -.-> 保证Java核心类库的安全性

    style Start fill:#e3f2fd,stroke:#1565c0
    style Check fill:#fff3e0,stroke:#e65100
    style Return fill:#e8f5e9,stroke:#2e7d32
    style Delegate fill:#fce4ec,stroke:#c2185b
    style Load fill:#e1bee7,stroke:#7b1fa2
│           ▼                            │
│  ┌─────────────────┐                   │
│  │ 父类加载器.loadClass()              │
│  └────────┬────────┘                   │
│           │                            │
│           ▼ (递归向上)                 │
│     ┌─────────────┐                    │
│     │ Bootstrap   │                    │
│     │ ClassLoader │                    │
│     └──────┬──────┘                    │
│            │ 无法加载                   │
│            ▼                           │
│  ┌─────────────────┐                   │
│  │ 自己加载        │                   │
│  │ (findClass)    │                   │
│  └─────────────────┘                   │
└─────────────────────────────────────────┘
```

### 4.4 打破双亲委派

```
常见场景：
1. Tomcat：每个 Web 应用加载自己的类
2. OSGi：模块化加载
3. JDBC：SPI 机制
4. 动态代理：运行时生成类
```

---

## 5. JVM 性能调优

### 5.1 常用 JVM 参数

#### 堆内存参数

```
-Xms256m          初始堆大小
-Xmx1024m         最大堆大小
-Xmn256m          新生代大小
-XX:MetaspaceSize=128m  元空间初始大小
-XX:MaxMetaspaceSize=256m 元空间最大大小
-XX:NewRatio=2     新生代:老年代 = 1:2
-XX:SurvivorRatio=8 Eden:Survivor = 8:1
```

#### GC 参数

```
-XX:+UseSerialGC        Serial 收集器
-XX:+UseParallelGC      Parallel Scavenge 收集器
-XX:+UseConcMarkSweepGC  CMS 收集器
-XX:+UseG1GC            G1 收集器
-XX:+UseZGC             ZGC 收集器

-XX:MaxGCPauseMillis=200 最大 GC 停顿时间
-XX:G1HeapRegionSize=1m  G1 Region 大小
-XX:InitiatingHeapOccupancyPercent=45  触发 Mixed GC 阈值
```

#### 其他参数

```
-XX:+HeapDumpOnOutOfMemoryError  OOM 时导出堆文件
-XX:HeapDumpPath=/tmp/heap.hprof 堆文件路径
-XX:+PrintGCDetails              打印 GC 详情
-XX:+PrintGCDateStamps           打印 GC 时间戳
-Xloggc:/tmp/gc.log             GC 日志文件
```

### 5.2 调优思路

```mermaid
flowchart TB
    Step1["1. 明确目标"] --> Step2["2. 监控分析"]
    Step2 --> Step3["3. 参数调整"]
    Step3 --> Step4["4. 验证优化"]

    subgraph Step1Details["明确目标"]
        direction TB
        S1A["吞吐量优先 → 减少 GC 次数"]
        S1B["延迟优先 → 减少 GC 停顿"]
        S1C["内存占用优先 → 减少内存使用"]
    end

    subgraph Step2Details["监控分析"]
        direction TB
        S2A["jstat -gcutil 观察 GC"]
        S2B["jmap -heap 查看堆"]
        S2C["jstack 查看线程"]
    end

    subgraph Step3Details["参数调整"]
        direction TB
        S3A["调整堆大小"]
        S3B["选择合适的 GC"]
        S3C["调整 GC 参数"]
    end

    subgraph Step4Details["验证优化"]
        direction TB
        S4A["重新压测"]
        S4B["对比优化前后"]
    end

    Step1 --- Step1Details
    Step2 --- Step2Details
    Step3 --- Step3Details
    Step4 --- Step4Details

    style Step1 fill:#e3f2fd,stroke:#1565c0
    style Step2 fill:#fff3e0,stroke:#e65100
    style Step3 fill:#e8f5e9,stroke:#2e7d32
    style Step4 fill:#fce4ec,stroke:#c2185b
```

### 5.3 推荐配置

#### G1 调优示例

```
# 4核8G服务器推荐配置
java -Xms4g -Xmx4g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -XX:G1HeapRegionSize=8m \
     -XX:InitiatingHeapOccupancyPercent=45 \
     -XX:+ParallelRefProcEnabled \
     -XX:G1ReservePercent=15 \
     -XX:MaxTenuringThreshold=15 \
     -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/tmp/heap.hprof \
     -Xloggc:/tmp/gc.log \
     -XX:+PrintGCDetails \
     -XX:+PrintGCDateStamps \
     -jar app.jar
```

---

## 6. 实战问题排查

### 6.1 常用排查工具

```
命令工具：
• jps        查看 Java 进程
• jstat      查看 GC 统计
• jinfo      查看/修改 JVM 参数
• jstack     查看线程堆栈
• jmap       查看内存映射、生成堆转储
• jcmd       综合工具（Java 9+）

可视化工具：
• jconsole   JVM 监控
• jvisualvm  性能分析
• Java Mission Control (JMC)
• Async-profiler
```

### 6.2 常见问题排查

#### 问题一：CPU 100%

```
排查步骤：
1. top 找到占用高的进程 PID
2. top -Hp PID 找到占用高的线程 TID
3. printf '%x\n' TID 转换为十六进制
4. jstack PID | grep TID十六进制 查看堆栈
```

#### 问题二：内存持续增长

```
排查步骤：
1. jmap -heap PID 查看堆使用情况
2. jmap -dump:format=b,file=heap.hprof PID 导出堆文件
3. 使用 MAT / jvisualvm 分析内存泄漏
4. 定位泄漏对象和引用链
```

#### 问题三：GC 频繁或停顿长

```
排查步骤：
1. jstat -gcutil PID 1000 观察 GC 情况
2. 分析 GC 日志
3. 调整堆大小或 GC 参数
4. 考虑更换 GC 收集器
```

### 6.3 GC 日志分析

```
典型 Young GC 日志：
[2024-01-15T10:23:45.123+0800]: [GC (Allocation Failure)
  PSYoungGen: 524800K->32000K(611840K)]
  786240K->258240K(2097152K), 0.0156789 secs]
  [Times: user=0.12 sys=0.01, real=0.02 secs]

含义：
• Allocation Failure：分配失败（Eden 区满）
• PSYoungGen：年轻代
• 524800K->32000K：GC 前使用 524M，GC 后 32M
• (611840K)：年轻代总大小
• 786240K->258240K：堆使用从 768M 降到 252M
• 0.0156789 secs：GC 耗时 15.7ms
```

---

## 附录：JVM 参数速查表

### 常用参数分类

```
■ 堆内存
-Xms                初始堆大小
-Xmx                最大堆大小
-Xmn                新生代大小
-XX:NewRatio        新生代/老年代比例
-XX:SurvivorRatio   Eden/Survivor 比例

■ 线程
-Xss                线程栈大小

■ 元空间
-XX:MetaspaceSize   元空间初始大小
-XX:MaxMetaspaceSize 元空间最大大小

■ GC
-XX:+UseSerialGC           串行 GC
-XX:+UseParallelGC         并行 GC
-XX:+UseConcMarkSweepGC    CMS GC
-XX:+UseG1GC               G1 GC
-XX:MaxGCPauseMillis       最大 GC 停顿时间

■ 日志
-Xloggc:                  GC 日志文件
-XX:+PrintGCDetails        详细 GC 日志
-XX:+PrintGCDateStamps     时间戳

■ 调试
-XX:+HeapDumpOnOutOfMemoryError  OOM 时导出堆
-XX:HeapDumpPath               堆文件路径
```

---

## 结语

理解 JVM 是 Java 工程师进阶的必经之路：

```
JVM 核心知识：
• 内存模型 → 理解对象创建与回收
• 类加载 → 理解类的生命周期
• GC 机制 → 理解内存管理
• 性能调优 → 解决生产问题
```

> "纸上得来终觉浅，绝知此事要躬行。"
> 推荐阅读：《深入理解 Java 虚拟机》- 周志明

---

> 💭 思考题：在你的工作中遇到过哪些 JVM 相关的问题？你是如何排查和解决的？
