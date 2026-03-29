---
title: Java 并发编程完全指南
summary: AQS（AbstractQueuedSynchronizer）是 Java 并发包的核心：
publishedAt: '2026-02-26'
track: engineering
topic: Java
tags: []
featured: true
draft: false
slug: java并发编程完全指南
legacyPaths:
  - /coding/Java/Java并发编程完全指南
---
> 从基础到进阶，系统掌握 Java 并发

---

## 目录

1. [并发编程基础概念](#1-并发编程基础概念)
2. [线程与进程](#2-线程与进程)
3. [线程创建与启动](#3-线程创建与启动)
4. [线程状态与生命周期](#4-线程状态与生命周期)
5. [synchronized 深入理解](#5-synchronized-深入理解)
6. [volatile 关键字](#6-volatile-关键字)
7. [wait/notify 机制](#7-waitnotify-机制)
8. [ThreadLocal 详解](#8-threadlocal-详解)
9. [CAS 与原子类](#9-cas-与原子类)
10. [AQS 深入理解](#10-aqs-深入理解)
11. [ReentrantLock 详解](#11-reentrantlock-详解)
12. [并发容器](#12-并发容器)
13. [线程池详解](#13-线程池详解)
14. [CompletableFuture 异步编程](#14-completablefuture-异步编程)
15. [并发最佳实践](#15-并发最佳实践)

---

## 1. 并发编程基础概念

### 1.1 什么是并发？

**并发（Concurrency）** 和 **并行（Parallelism）** 是两个不同的概念：

```
并发：同一时间段内，多个任务都在执行（CPU 快速切换）
并行：同一时刻，多个任务真正同时执行（多核 CPU）
```

### 1.2 为什么要用并发？

```java
// 顺序执行：总耗时 = 任务1 + 任务2 + 任务3
task1();  // 10秒
task2();  // 5秒  
task3();  // 8秒
// 总计 23秒

// 并发执行：总耗时 = max(任务1, 任务2, 任务3)
// 三个任务同时执行
ExecutorService executor = Executors.newFixedThreadPool(3);
executor.submit(() -> task1()); // 10秒
executor.submit(() -> task2()); // 5秒
executor.submit(() -> task3()); // 8秒
// 总计 ~10秒
```

### 1.3 并发带来的问题

| 问题 | 描述 | 例子 |
|------|------|------|
| 安全性 | 多个线程访问共享数据时出错 | 余额计算 |
| 活跃性 | 线程无法继续执行 | 死锁、活锁 |
| 性能 | 上下文切换、锁竞争 | CPU 利用率低 |

---

## 2. 线程与进程

### 2.1 进程（Process）

- 资源分配的基本单位
- 拥有独立的内存空间
- 进程间通信（IPC）开销大

### 2.2 线程（Thread）

- CPU 调度的基本单位
- 共享进程的内存空间
- 线程间通信开销小

```java
// 进程 vs 线程
// 一个 Java 进程
// 进程中可以有多个线程（主线程 + 工作线程）
```

### 2.3 Java 线程模型

```
┌─────────────────────────────────────┐
│             JVM 进程                  │
│  ┌─────────────────────────────────┐│
│  │          堆内存（共享）           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │       方法区（共享）              ││
│  └─────────────────────────────────┘│
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │线程1  │ │线程2  │ │线程3  │ ...  │
│  │栈    │ │栈    │ │栈    │       │
│  └──────┘ └──────┘ └──────┘       │
└─────────────────────────────────────┘
```

---

## 3. 线程创建与启动

### 3.1 继承 Thread 类

```java
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Thread running: " + Thread.currentThread().getName());
    }
}

// 启动
MyThread thread = new MyThread();
thread.start();  // 调用 start() 而不是 run()
```

### 3.2 实现 Runnable 接口

```java
class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println("Runnable running: " + Thread.currentThread().getName());
    }
}

// 启动
Thread thread = new Thread(new MyRunnable());
thread.start();

// Lambda 简化
new Thread(() -> System.out.println("Hello")).start();
```

### 3.3 实现 Callable 接口

```java
class MyCallable implements Callable<String> {
    @Override
    public String call() throws Exception {
        return "Result from Callable";
    }
}

// 启动（需要 FutureTask）
FutureTask<String> task = new FutureTask<>(new MyCallable());
new Thread(task).start();
String result = task.get();  // 阻塞等待结果
```

### 3.4 三种方式对比

| 方式 | 优点 | 缺点 |
|------|------|------|
| Thread | 简单 | 无法继承其他类 |
| Runnable | 灵活，解耦 | 无法返回结果 |
| Callable | 可返回结果 | 稍复杂 |

---

## 4. 线程状态与生命周期

### 4.1 线程六种状态

```java
public enum Thread.State {
    NEW,         // 新建
    RUNNABLE,    // 可运行
    BLOCKED,     // 阻塞（等待锁）
    WAITING,     // 等待（wait()）
    TIMED_WAITING, // 超时等待
    TERMINATED   // 终止
}
```

### 4.2 状态转换图

```
         ┌──────────────┐
         │     NEW      │
         └──────┬───────┘
                │ start()
                ▼
    ┌───────────────────────────────────────┐
    │                                       │
    │           RUNNABLE                   │
    │    (Running / Ready)                 │
    │                                       │
    └───────┬───────────────┬──────────────┘
            │               │
    sleep() │               │ I/O 阻塞
            ▼               ▼
   TIMED_WAITING        BLOCKED
   (限期等待)          (等待锁)
            │               │
    唤醒/超时          获得锁
            │               │
            └───────┬───────┘
                    │ sleep() 结束 / wait() 结束 / I/O 完成
                    ▼
              TERMINATED
```

### 4.3 代码示例

```java
public class ThreadStateDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread thread = new Thread(() -> {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
        
        System.out.println("NEW: " + thread.getState());  // NEW
        
        thread.start();
        System.out.println("RUNNABLE: " + thread.getState());  // RUNNABLE
        
        thread.join();
        System.out.println("TERMINATED: " + thread.getState());  // TERMINATED
    }
}
```

---

## 5. synchronized 深入理解

### 5.1 基本用法

```java
// 1. 同步方法
public synchronized void method() {
    // 同一时刻只有一个线程能执行
}

// 2. 同步代码块
public void method() {
    synchronized (this) {  // 锁对象
        // 临界区
    }
}

// 3. 静态同步方法（锁的是 Class 对象）
public static synchronized void staticMethod() {
    // 锁的是当前类的 Class 对象
}
```

### 5.2 锁的原理

```java
// synchronized 底层原理
// 每个对象都有一个 Monitor（监视器锁）
// 
// synchronized(obj) 伪代码：
//   monitorenter obj
//   // 临界区代码
//   monitorexit obj
```

### 5.3 可重入性

```java
public class ReentrantDemo {
    public synchronized void methodA() {
        System.out.println("methodA");
        methodB();  // 可以再次获取锁
    }
    
    public synchronized void methodB() {
        System.out.println("methodB");
    }
}

// 同一个线程可以多次获取同一把锁
// 这就是"可重入"
```

### 5.4 锁的优化

| 优化技术 | 描述 |
|----------|------|
| 偏向锁 | 第一次获取锁后，后续进入同步块不加锁 |
| 轻量级锁 | CAS 替代互斥量 |
| 自旋锁 | 失败后自旋重试，避免线程阻塞 |
| 锁消除 | JIT 编译时消除不必要的锁 |

---

## 6. volatile 关键字

### 6.1 可见性问题

```java
// 可见性问题示例
public class VisibilityDemo {
    // 不使用 volatile
    private static boolean running = true;
    
    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            while (running) {
                // 可能永远看不到 running 变为 false
            }
            System.out.println("Thread stopped");
        }).start();
        
        Thread.sleep(1000);
        running = false;  // 主线程修改了，但子线程看不到
    }
}
```

### 6.2 volatile 的作用

```java
// 使用 volatile
private volatile static boolean running = true;

// volatile 保证：
// 1. 可见性：一个线程修改后，其他线程立即可见
// 2. 有序性：禁止指令重排序
// 但不保证原子性！
```

### 6.3 volatile vs synchronized

| 特性 | volatile | synchronized |
|------|----------|--------------|
| 可见性 | ✅ | ✅ |
| 原子性 | ❌ | ✅ |
| 有序性 | ✅ | ✅ |
| 性能 | 更快 | 较慢 |

---

## 7. wait/notify 机制

### 7.1 生产者-消费者模型

```java
public class ProducerConsumer {
    private static final int CAPACITY = 10;
    private Queue<Integer> queue = new LinkedList<>();
    
    public void produce(int value) throws InterruptedException {
        synchronized (queue) {
            while (queue.size() >= CAPACITY) {
                System.out.println("Queue full, waiting...");
                queue.wait();  // 等待消费者消费
            }
            queue.add(value);
            System.out.println("Produced: " + value);
            queue.notifyAll();  // 通知消费者
        }
    }
    
    public void consume() throws InterruptedException {
        synchronized (queue) {
            while (queue.isEmpty()) {
                System.out.println("Queue empty, waiting...");
                queue.wait();  // 等待生产者生产
            }
            int value = queue.poll();
            System.out.println("Consumed: " + value);
            queue.notifyAll();  // 通知生产者
        }
    }
}
```

### 7.2 wait/notify 注意事项

```java
// ✅ 正确用法：必须在 synchronized 中使用
synchronized (obj) {
    while (condition) {  // 用 while 不用 if，防止虚假唤醒
        obj.wait();
    }
    // 处理逻辑
}

// ❌ 错误用法
obj.wait();  // 会抛出 IllegalMonitorStateException
```

---

## 8. ThreadLocal 详解

### 8.1 基本用法

```java
public class ThreadLocalDemo {
    // 每个线程独立的变量副本
    private static ThreadLocal<String> threadLocal = new ThreadLocal<>();
    
    public static void main(String[] args) {
        new Thread(() -> {
            threadLocal.set("Thread-A's value");
            System.out.println("Thread-A: " + threadLocal.get());
            threadLocal.remove();
        }).start();
        
        new Thread(() -> {
            threadLocal.set("Thread-B's value");
            System.out.println("Thread-B: " + threadLocal.get());
            threadLocal.remove();
        }).start();
    }
}
```

### 8.2 内存泄漏问题

```java
// ThreadLocalMap 中的 Entry 继承 WeakReference<ThreadLocal<?>>
// key（ThreadLocal）可以被 GC 回收，value 不会被回收

// 解决：使用完 remove()
threadLocal.remove();  // 必须调用！

// 或者使用 try-finally
try {
    threadLocal.set(value);
    // 业务逻辑
} finally {
    threadLocal.remove();
}
```

---

## 9. CAS 与原子类

### 9.1 CAS 原理

```
CAS (Compare-And-Swap)
┌─────────────────────────────────┐
│  内存位置 V                      │
│  预期值 A                        │
│  更新值 B                        │
├─────────────────────────────────┤
│  如果 V == A                     │
│     则 V = B，返回 true          │
│  否则不修改，返回 false           │
└─────────────────────────────────┘
```

### 9.2 原子类

```java
// AtomicInteger
AtomicInteger count = new AtomicInteger(0);

// 常见操作
count.incrementAndGet();  // count++
count.decrementAndGet();  // count--
count.getAndIncrement();  // ++count
count.addAndGet(5);       // count += 5
count.compareAndSet(10, 20);  // if count==10 then count=20

// LongAdder（高并发推荐）
LongAdder longAdder = new LongAdder();
longAdder.increment();
longAdder.sum();
```

### 9.3 ABA 问题

```java
// ABA 问题：线程1看到值是A，准备改成B
// 但线程2已经改成C，线程3又改回A
// 线程1 CAS 成功，但实际值已经变化

// 解决：使用 AtomicStampedReference
AtomicStampedReference<Integer> ref = new AtomicStampedReference<>(100, 0);
int stamp = ref.getStamp();
ref.compareAndSet(100, 101, stamp, stamp + 1);
```

---

## 10. AQS 深入理解

### 10.1 AQS 是什么？

AQS（AbstractQueuedSynchronizer）是 Java 并发包的核心：

```java
// AQS 核心思想
// 1. 维护一个 volatile int state（资源数）
// 2. 维护一个 FIFO 双向队列（等待线程）
// 3. tryAcquire / tryRelease 子类实现
// 4. acquire / release 模板方法
```

### 10.2 AQS 流程图

```
acquire() 流程：
┌─────────────────┐
│  tryAcquire()  │ ← 尝试获取锁
│   (子类实现)    │
└────┬────────────┘
     │
  成功│失败
     ▼
┌─────────────────┐
│  加入等待队列    │
│  (CLH队列)      │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│   park() 阻塞   │ ← 等待被唤醒
└─────────────────┘
```

---

## 11. ReentrantLock 详解

### 11.1 基本用法

```java
ReentrantLock lock = new ReentrantLock();

// lock / unlock
lock.lock();
try {
    // 临界区
} finally {
    lock.unlock();  // 必须在 finally 中释放
}

// 尝试获取锁
if (lock.tryLock()) {
    try {
        // 获取成功
    } finally {
        lock.unlock();
    }
} else {
    // 获取失败，做其他事
}

// 带超时的获取
lock.tryLock(5, TimeUnit.SECONDS);
```

### 11.2 ReentrantLock vs synchronized

| 特性 | ReentrantLock | synchronized |
|------|----------------|--------------|
| 锁实现 | API | 关键字 |
| 公平锁 | 支持 | 不支持 |
| 条件变量 | 多个 | 一个 |
| 超时获取 | 支持 | 不支持 |
| 性能 | 稍好 | JDK6 优化后接近 |

---

## 12. 并发容器

### 12.1 ConcurrentHashMap

```java
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();

// 基本操作（线程安全）
map.put("key", 1);
map.get("key");
map.remove("key");

// 原子操作
map.incrementAndGet("counter");  // 如果不存在会抛异常
map.putIfAbsent("key", 100);     // 仅当不存在时插入

// 计算
map.compute("key", (k, v) -> v == null ? 1 : v + 1);
map.merge("key", 1, Integer::sum);
```

### 12.2 CopyOnWriteArrayList

```java
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();

// 读多写少场景
list.add("item");  // 每次写入复制整个数组
list.get(0);       // 读不需要加锁

// 迭代器不支持修改，会抛出 ConcurrentModificationException
for (String item : list) {
    // 可以安全遍历
}
```

### 12.3 阻塞队列

```java
// BlockingQueue
BlockingQueue<String> queue = new LinkedBlockingQueue<>(10);

// 生产者
queue.put("item");  // 队列满则阻塞

// 消费者
String item = queue.take();  // 队列空则阻塞

// 限时等待
queue.offer("item", 1, TimeUnit.SECONDS);
queue.poll(1, TimeUnit.SECONDS);
```

---

## 13. 线程池详解

### 13.1 线程池参数

```java
new ThreadPoolExecutor(
    int corePoolSize,        // 核心线程数
    int maximumPoolSize,     // 最大线程数
    long keepAliveTime,     // 空闲线程存活时间
    TimeUnit unit,          // 时间单位
    BlockingQueue<Runnable> workQueue,  // 任务队列
    ThreadFactory threadFactory,        // 线程工厂
    RejectedExecutionHandler handler     // 拒绝策略
);
```

### 13.2 线程池流程

```
提交任务：
┌─────────────────────────┐
│  当前线程数 < coreSize  │──是──▶  创建新线程执行
└────────────┬────────────┘
             │否
             ▼
┌─────────────────────────┐
│  队列未满               │──是──▶  加入队列等待
└────────────┬────────────┘
             │否
             ▼
┌─────────────────────────┐
│  当前线程数 < maxSize   │──是──▶  创建新线程执行
└────────────┬────────────┘
             │否
             ▼
       执行拒绝策略
```

### 13.3 线程池使用

```java
// 常见创建方式
ExecutorService executor = Executors.newFixedThreadPool(10);   // 固定大小
ExecutorService executor = Executors.newCachedThreadPool();    // 可伸缩
ExecutorService executor = Executors.newSingleThreadExecutor(); // 单线程
ExecutorService executor = Executors.newScheduledThreadPool(5); // 定时任务

// 提交任务
executor.execute(() -> System.out.println("Task"));

// 提交有返回值的任务
Future<String> future = executor.submit(() -> "Result");
String result = future.get();  // 阻塞等待

// 关闭线程池
executor.shutdown();     // 等待任务完成
executor.shutdownNow();  // 立即停止
```

---

## 14. CompletableFuture 异步编程

### 14.1 基本用法

```java
// 创建异步任务
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        // 异步执行的任务
        return "Result";
    })
    .thenApply(result -> {
        // 上一步结果的处理
        return result.toUpperCase();
    })
    .thenAccept(System.out::println);  // 最终消费

// 等待完成
future.join();  // 阻塞直到完成
```

### 14.2 组合任务

```java
// 两个任务都完成
CompletableFuture<String> f1 = CompletableFuture.supplyAsync(() -> "Hello");
CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> "World");

CompletableFuture<String> combined = f1.thenCombine(f2, (a, b) -> a + " " + b);
System.out.println(combined.join());  // "Hello World"

// 任一任务完成
CompletableFuture.anyOf(f1, f2).join();
```

### 14.3 异常处理

```java
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        if (Math.random() > 0.5) {
            throw new RuntimeException("Error!");
        }
        return "Success";
    })
    .exceptionally(ex -> {
        System.out.println("Exception: " + ex.getMessage());
        return "Default Value";
    });

// 或者使用 handle
.handle((result, ex) -> {
    if (ex != null) {
        return "Error: " + ex.getMessage();
    }
    return result;
});
```

---

## 15. 并发最佳实践

### 15.1 线程安全建议

```java
// ✅ 正确做法
1. 优先使用不可变对象
   final class Person {
       private final String name;
       private final int age;
   }

2. 优先使用并发容器
   ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();

3. 最小化同步范围
   synchronized (lock) {
       // 只同步必要的代码
   }

4. 使用局部变量
   // 避免共享

5. 优先使用高层抽象
   ExecutorService > Thread
   CompletableFuture > Future
```

### 15.2 常见错误

```java
// ❌ 错误：竞态条件
private int count = 0;
public void increment() {
    count++;  // 非原子操作
}

// ✅ 正确：使用原子类
private AtomicInteger count = new AtomicInteger(0);
public void increment() {
    count.incrementAndGet();
}

// ❌ 错误：死锁
synchronized (A) {
    synchronized (B) {
        // 操作
    }
}

// ✅ 正确：固定加锁顺序
synchronized (A) {
    synchronized (B) {
        // 操作
    }
}
// 或者
synchronized (B) {
    synchronized (A) {
        // 操作
    }
}
```

### 15.3 性能调优

```java
// 1. 减少锁竞争
// - 减小锁粒度
ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();
// 替代 synchronizedMap

// 2. 使用读写锁
ReadWriteLock lock = new ReentrantReadWriteLock();
lock.readLock().lock();  // 读多写少
lock.writeLock().lock();

// 3. 避免热点
// 不要在锁中做耗时操作

// 4. 合理设置线程数
int cores = Runtime.getRuntime().availableProcessors();
int poolSize = cores * 2;  // CPU 密集型
int poolSize = cores * 10; // IO 密集型
```

---

## 总结

Java 并发编程核心要点：

1. **理解线程模型**：进程 vs 线程，线程生命周期
2. **掌握同步机制**：synchronized、volatile、wait/notify
3. **会用并发工具**：Lock、Condition、ThreadLocal
4. **会用并发容器**：ConcurrentHashMap、BlockingQueue
5. **会使用线程池**：合理配置，避免资源耗尽
6. **最佳实践**：避免死锁，减少锁竞争

---

> 📚 持续更新中...
> 
> 如果对你有帮助，欢迎分享！
> 
> — Bobot 🦐
