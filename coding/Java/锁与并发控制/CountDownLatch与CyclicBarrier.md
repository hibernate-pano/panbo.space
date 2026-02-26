# CountDownLatch 与 CyclicBarrier

> 线程同步工具

---

## 1. CountDownLatch

### 1.1 概念

CountDownLatch（倒计时门闩）让一个或多个线程等待其他线程完成：

```java
import java.util.concurrent.CountDownLatch;

CountDownLatch latch = new CountDownLatch(3);

// 倒数 3 次
latch.countDown();  // 2
latch.countDown();  // 1
latch.countDown();  // 0，阻塞的线程继续执行

// 等待
latch.await();  // 阻塞直到计数为 0
```

### 1.2 工作原理

```
初始: count = 3

Thread-1: await() → 阻塞等待
Thread-2: await() → 阻塞等待
Thread-3: await() → 阻塞等待

主线程:
countDown() → count=2
countDown() → count=1
countDown() → count=0 → 唤醒所有等待线程
```

### 1.3 用法示例

```java
public class WorkerDemo {
    public static void main(String[] args) throws InterruptedException {
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(5);
        
        // 启动 5 个worker
        for (int i = 0; i < 5; i++) {
            new Thread(() -> {
                try {
                    startSignal.await();  // 等待开始信号
                    doWork();
                } finally {
                    doneSignal.countDown();  // 完成工作
                }
            }).start();
        }
        
        System.out.println("开始工作");
        startSignal.countDown();  // 发送开始信号
        doneSignal.await();  // 等待所有工作完成
        System.out.println("所有工作完成");
    }
    
    static void doWork() {
        System.out.println("工作完成: " + Thread.currentThread().getName());
    }
}
```

### 1.4 实际应用

```java
// 场景：主线程等待多个子任务完成
public class MultiTaskDemo {
    public static void main(String[] args) throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(3);
        
        // 启动3个子任务
        new Thread(() -> { task1(); latch.countDown(); }).start();
        new Thread(() -> { task2(); latch.countDown(); }).start();
        new Thread(() -> { task3(); latch.countDown(); }).start();
        
        // 等待所有任务完成
        latch.await();
        
        System.out.println("所有任务完成，继续主流程");
    }
}
```

---

## 2. CyclicBarrier

### 2.1 概念

CyclicBarrier（循环栅栏）让一组线程相互等待，直到所有线程都到达某个屏障点：

```java
import java.util.concurrent.CyclicBarrier;

CyclicBarrier barrier = new CyclicBarrier(3);

// 线程到达屏障点
barrier.await();  // 阻塞，直到所有线程都到达

// 所有线程到达后，继续执行
System.out.println("继续");
```

### 2.2 工作原理

```
Thread-1: await() → 等待
Thread-2: await() → 等待
Thread-3: await() → 全部到达，栅栏打开，继续执行
```

### 2.3 用法示例

```java
public class WorkerDemo {
    public static void main(String[] args) {
        CyclicBarrier barrier = new CyclicBarrier(3, () -> 
            System.out.println("所有工人到齐，开始干活！")
        );
        
        for (int i = 1; i <= 3; i++) {
            final int workerId = i;
            new Thread(() -> {
                try {
                    System.out.println("工人" + workerId + "出发");
                    Thread.sleep(workerId * 1000);
                    System.out.println("工人" + workerId + "到达");
                    barrier.await();  // 等待其他工人
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
}

// 输出:
// 工人1出发
// 工人2出发
// 工人3出发
// 工人1到达
// 工人2到达
// 工人3到达
// 所有工人到齐，开始干活！
```

### 2.4 循环使用

```java
CyclicBarrier barrier = new CyclicBarrier(3);

// 第一轮
barrier.await();  // 等待
// 第一轮完成，栅栏重置

// 第二轮
barrier.await();  // 继续等待
// 第二轮完成
```

---

## 3. CountDownLatch vs CyclicBarrier

| 特性 | CountDownLatch | CyclicBarrier |
|------|----------------|---------------|
| 作用 | 线程等待其他线程完成 | 线程相互等待 |
| 能否重置 | 不能（一次性） | 能（可循环使用） |
| 等待方 | 主线程/其他线程 | 参与线程本身 |
| 异常处理 | 计数不会恢复 | 会break超时 |

---

## 4. 高级用法

### 4.1 带超时的等待

```java
// CountDownLatch
boolean completed = latch.await(5, TimeUnit.SECONDS);
if (!completed) {
    System.out.println("超时未完成");
}

// CyclicBarrier
try {
    barrier.await(5, TimeUnit.SECONDS);
} catch (TimeoutException e) {
    System.out.println("超时");
} catch (BrokenBarrierException e) {
    System.out.println("栅栏被破坏");
}
```

### 4.2 实际应用场景

```java
// CountDownLatch 场景：
// - 主线程等待多个子任务完成
// - 启动多个线程后等待它们完成

// CyclicBarrier 场景：
// - 多线程计算，最后合并结果
// - 多线程准备数据，然后一起开始处理
```

---

## 5. 总结

| 工具 | 使用场景 |
|------|----------|
| CountDownLatch | 主线程等待子线程完成（一次性） |
| CyclicBarrier | 线程之间相互等待（可循环） |
| Semaphore | 限制并发数 |
| ReentrantLock | 通用互斥锁 |

---

> 📚 锁系列完结！更多内容请参考《Java 并发编程完全指南》
