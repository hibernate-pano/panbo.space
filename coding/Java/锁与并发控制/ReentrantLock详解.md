# ReentrantLock 详解

> 可重入的显式锁

---

## 1. 基本用法

### 1.1 lock/unlock

```java
import java.util.concurrent.locks.ReentrantLock;

public class LockDemo {
    private final ReentrantLock lock = new ReentrantLock();
    
    public void method() {
        lock.lock();
        try {
            // 临界区
        } finally {
            lock.unlock();  // 必须在 finally 中释放
        }
    }
}
```

### 1.2 tryLock

```java
// 尝试获取锁，立即返回
if (lock.tryLock()) {
    try {
        // 获取成功
    } finally {
        lock.unlock();
    }
} else {
    // 获取失败，做其他事
}

// 带超时的尝试获取
if (lock.tryLock(5, TimeUnit.SECONDS)) {
    try {
        // 5秒内获取到锁
    } finally {
        lock.unlock();
    }
}
```

---

## 2. ReentrantLock vs synchronized

| 特性 | ReentrantLock | synchronized |
|------|----------------|--------------|
| 锁实现 | JDK 实现 | JVM 实现 |
| 公平锁 | 支持 | 不支持 |
| 非公平锁 | 支持（默认） | 不支持 |
| 锁超时 | 支持 tryLock | 不支持 |
| 条件变量 | 多个 | 一个 |
| 性能 | 稍好 | JDK6+ 接近 |

---

## 3. 公平锁 vs 非公平锁

```java
// 非公平锁（默认）
ReentrantLock lock = new ReentrantLock();

// 公平锁（先到先得）
ReentrantLock fairLock = new ReentrantLock(true);

// 公平锁的问题
// - 需要维护等待队列，有性能开销
// - 可能导致线程饥饿
// - 适合需要严格顺序的场景
```

---

## 4. 条件变量

### 4.1 基本用法

```java
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.Condition;

public class ConditionDemo {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition condition = lock.newCondition();
    
    // 等待条件
    public void await() throws InterruptedException {
        lock.lock();
        try {
            while (!conditionMet) {
                condition.await();  // 等待
            }
        } finally {
            lock.unlock();
        }
    }
    
    // 唤醒单个
    public void signal() {
        lock.lock();
        try {
            conditionMet = true;
            condition.signal();  // 唤醒一个
        } finally {
            lock.unlock();
        }
    }
    
    // 唤醒全部
    public void signalAll() {
        lock.lock();
        try {
            conditionMet = true;
            condition.signalAll();  // 唤醒所有
        } finally {
            lock.unlock();
        }
    }
}
```

### 4.2 多个条件变量

```java
public class BoundedQueue private final Object[]<T> {
    items;
    private int head, tail, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notEmpty = lock.newCondition();
    private final Condition notFull = lock.newCondition();
    
    public void add(T item) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) {
                notFull.await();  // 队列满，等待
            }
            items[tail] = item;
            tail = (tail + 1) % items.length;
            count++;
            notEmpty.signal();  // 唤醒消费者
        } finally {
            lock.unlock();
        }
    }
    
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) {
                notEmpty.await();  // 队列空，等待
            }
            @SuppressWarnings("unchecked")
            T item = (T) items[head];
            head = (head + 1) % items.length;
            count--;
            notFull.signal();  // 唤醒生产者
            return item;
        } finally {
            lock.unlock();
        }
    }
}
```

---

## 5. 锁超时与中断

### 5.1 可中断的获取

```java
// lockInterruptibly() 可以被中断
public void doLock() throws InterruptedException {
    lock.lockInterruptibly();
    try {
        // 临界区
    } finally {
        lock.unlock();
    }
}

// 使用示例
Thread thread = new Thread(() -> {
    try {
        doLock();
    } catch (InterruptedException e) {
        System.out.println("被中断了");
    }
});
thread.start();
thread.interrupt();  // 中断线程
```

### 5.2 超时获取

```java
// tryLock 带超时
boolean acquired = lock.tryLock(1, TimeUnit.SECONDS);
if (acquired) {
    try {
        // 获取成功
    } finally {
        lock.unlock();
    }
} else {
    // 超时未获取到锁
}
```

---

## 6. 锁状态查询

```java
ReentrantLock lock = new ReentrantLock();

// 获取锁的线程数
int holdCount = lock.getHoldCount();

// 是否有线程持有锁
boolean isLocked = lock.isLocked();

// 是否有线程在等待
boolean hasQueuedThreads = lock.hasQueuedThreads();

// 指定线程是否在等待
Thread thread = new Thread();
boolean isQueued = lock.hasQueuedThread(thread);

// 等待队列长度
int queueLength = lock.getQueueLength();
```

---

## 7. 最佳实践

### 7.1 标准模式

```java
// ✅ 标准用法
lock.lock();
try {
    // 临界区
} finally {
    lock.unlock();
}

// ✅ 使用 tryLock
if (lock.tryLock()) {
    try {
        // 临界区
    } finally {
        lock.unlock();
    }
}

// ✅ 带超时
try {
    if (lock.tryLock(5, TimeUnit.SECONDS)) {
        try {
            // 临界区
        } finally {
            lock.unlock();
        }
    }
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
}
```

### 7.2 不要这样做

```java
// ❌ 错误：在锁外部做耗时操作
lock.lock();
try {
    download();  // 不应该在这里
    process();
} finally {
    lock.unlock();
}

// ❌ 错误：未正确释放
lock.lock();
try {
    if (someCondition) {
        return;  // 提前返回，可能未释放锁
    }
} finally {
    lock.unlock();  // 应该在 finally 中
}
```

---

## 8. 总结

ReentrantLock 适用场景：
- 需要公平锁
- 需要超时获取锁
- 需要多个条件变量
- 需要可中断的锁

synchronized 适用场景：
- 简单同步需求
- 性能要求不高
- 需要 wait/notify

---

> 📚 续篇：《读写锁 ReadWriteLock》
