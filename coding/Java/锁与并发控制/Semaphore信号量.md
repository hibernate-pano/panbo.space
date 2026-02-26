# Semaphore 信号量

> 限制并发数的锁

---

## 1. 基本概念

Semaphore（信号量）用于控制同时访问特定资源的线程数量：

```java
import java.util.concurrent.Semaphore;

// 限制同时只有 3 个线程访问
Semaphore semaphore = new Semaphore(3);

// 获取许可证
semaphore.acquire();

// 释放许可证
semaphore.release();
```

---

## 2. 工作原理

```
┌─────────────────────────────────────┐
│         Semaphore (permits=3)       │
├─────────────────────────────────────┤
│  可用许可证: 3                      │
│  等待队列: [T1, T2, T3, T4, T5]    │
└─────────────────────────────────────┘

线程获取:
T1 acquire() → 许可证=2 ✓
T2 acquire() → 许可证=1 ✓
T3 acquire() → 许可证=0 ✓
T4 acquire() → 阻塞等待

T1 release() → 许可证=1，唤醒T4 ✓
```

---

## 3. 基本用法

### 3.1 限流

```java
public class PoolDemo {
    // 最多 10 个线程同时执行
    private final Semaphore semaphore = new Semaphore(10);
    
    public void execute(Runnable task) {
        try {
            semaphore.acquire();
            try {
                task.run();
            } finally {
                semaphore.release();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

### 3.2 连接池

```java
public class ConnectionPool {
    private final Semaphore semaphore;
    private final List<Connection> connections;
    
    public ConnectionPool(int poolSize) {
        this.semaphore = new Semaphore(poolSize);
        this.connections = new ArrayList<>(poolSize);
        // 初始化连接...
    }
    
    public Connection getConnection() throws InterruptedException {
        semaphore.acquire();
        return connections.remove(connections.size() - 1);
    }
    
    public void releaseConnection(Connection conn) {
        connections.add(conn);
        semaphore.release();
    }
}
```

---

## 4. 公平模式

```java
// 非公平（默认）
Semaphore semaphore = new Semaphore(3);

// 公平模式（先到先得）
Semaphore fairSemaphore = new Semaphore(3, true);
```

---

## 5. 其他方法

```java
Semaphore semaphore = new Semaphore(3);

// 尝试获取（立即返回）
if (semaphore.tryAcquire()) {
    try {
        // 获取成功
    } finally {
        semaphore.release();
    }
}

// 带超时的尝试获取
semaphore.tryAcquire(5, TimeUnit.SECONDS);

// 获取多个许可证
semaphore.acquire(2);

// 释放多个许可证
semaphore.release(2);

// 查看可用许可证数
int available = semaphore.availablePermits();

// 查看等待线程数
int waiting = semaphore.getQueueLength();
```

---

## 6. 实际应用场景

### 6.1 资源池

```java
// 数据库连接池
public class DatabasePool {
    private final Semaphore semaphore;
    private final Connection[] connections;
    private int index = 0;
    
    public DatabasePool(int poolSize) {
        semaphore = new Semaphore(poolSize);
        connections = new Connection[poolSize];
        // 初始化连接...
    }
    
    public Connection getConnection() throws InterruptedException {
        semaphore.acquire();
        synchronized (this) {
            return connections[index++ % poolSize];
        }
    }
    
    public void releaseConnection(Connection conn) {
        semaphore.release();
    }
}
```

### 6.2 限流器

```java
// API 调用限流
public class RateLimiter {
    private final Semaphore semaphore;
    
    public RateLimiter(int maxConcurrent) {
        this.semaphore = new Semaphore(maxConcurrent);
    }
    
    public void doRequest(Runnable request) throws InterruptedException {
        semaphore.acquire();
        try {
            request.run();
        } finally {
            semaphore.release();
        }
    }
}
```

---

## 7. 总结

Semaphore 适用场景：
- ✅ 资源池（连接池、线程池）
- ✅ 并发限流
- ✅ 限流器

特点：
- 维护一组许可证
- acquire() 获取，release() 释放
- 支持公平/非公平模式

---

> 📚 续篇：《CountDownLatch 与 CyclicBarrier》
