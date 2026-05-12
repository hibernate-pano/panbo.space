---
title: 读写锁 ReadWriteLock
summary: StampedLock 是 JDK8 引入的高性能读写锁：
publishedAt: '2026-02-26'
track: engineering
topic: Java
series: 锁与并发控制
tags: []
featured: false
draft: false
slug: 读写锁readwritelock
legacyPaths:
  - /coding/Java/锁与并发控制/读写锁ReadWriteLock
---
> 读多写少场景的优化锁

---

## 1. 为什么需要读写锁？

### 1.1 场景分析

```
读操作：不需要互斥，多个线程可以同时读
写操作：需要互斥，同一时间只能一个线程写

❌ 如果用普通锁（独占锁）：
   读 + 读 = 互斥（性能差）
   
✅ 如果用读写锁：
   读 + 读 = 并发（不互斥）
   读 + 写 = 互斥
   写 + 写 = 互斥
```

### 1.2 性能对比

```java
// 使用 ReentrantLock（独占锁）
// 1000次读操作：
//   串行执行，耗时: 1000 * 1ms = 1000ms

// 使用 ReadWriteLock
// 1000次读操作：
//   并发执行，耗时: ~1ms
```

---

## 2. ReadWriteLock 接口

```java
public interface ReadWriteLock {
    // 获取读锁
    Lock readLock();
    
    // 获取写锁
    Lock writeLock();
}
```

---

## 3. ReentrantReadWriteLock

### 3.1 基本用法

```java
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class Cache<K, V> {
    private final Map<K, V> cache = new HashMap<>();
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();
    
    // 读取
    public V get(K key) {
        readLock.lock();
        try {
            return cache.get(key);
        } finally {
            readLock.unlock();
        }
    }
    
    // 写入
    public V put(K key, V value) {
        writeLock.lock();
        try {
            return cache.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }
    
    // 清空缓存
    public void clear() {
        writeLock.lock();
        try {
            cache.clear();
        } finally {
            writeLock.unlock();
        }
    }
}
```

### 3.2 读写锁特性

```java
ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();

// 公平性
ReentrantReadWriteLock fairLock = new ReentrantReadWriteLock(true);

// 锁的重入
// 读锁可以重入：持有读锁的线程可以再次获取读锁
// 写锁可以重入：持有写锁的线程可以再次获取写锁
// 写锁可以降级：持有写锁后可以获取读锁
// 读锁不能升级：持有读锁后不能直接获取写锁
```

---

## 4. 锁降级

### 4.1 锁降级示例

```java
public class LockDowngrade {
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();
    
    private Object data;
    
    public Object process() {
        // 1. 获取写锁
        writeLock.lock();
        try {
            data = compute();
            
            // 2. 锁降级：释放写锁，获取读锁
            readLock.lock();
        } finally {
            writeLock.unlock();
        }
        
        try {
            // 3. 持有读锁，访问数据
            return data;
        } finally {
            readLock.unlock();
        }
    }
    
    private Object compute() {
        return new Object();
    }
}
```

### 4.2 锁升级（不支持）

```java
// ❌ 错误：读锁不能直接升级为写锁
readLock.lock();
try {
    // 某些判断...
    writeLock.lock();  // 会死锁！
    try {
        // 修改数据
    } finally {
        writeLock.unlock();
    }
} finally {
    readLock.unlock();
}

// ✅ 正确：先释放读锁，再获取写锁
readLock.lock();
try {
    if (needWrite) {
        readLock.unlock();
        writeLock.lock();
        try {
            // 修改数据
        } finally {
            writeLock.unlock();
        }
        readLock.lock();  // 重新获取读锁
    }
} finally {
    readLock.unlock();
}
```

---

## 5. 注意事项

### 5.1 读写比例

```java
// 适合读多写少场景
// 如果写操作频繁，读写锁性能可能不如独占锁
```

### 5.2 锁饥饿

```java
// 读写锁可能导致"读饥饿"
// 场景：大量读操作不断获取读锁，写锁永远得不到

// 解决：使用公平锁，或限制读锁数量
```

---

## 6. StampedLock

### 6.1 介绍

StampedLock 是 JDK8 引入的高性能读写锁：

```java
import java.util.concurrent.locks.StampedLock;

public class StampedLockDemo {
    private final StampedLock stampedLock = new StampedLock();
    private double balance;
    
    // 乐观读
    public double getBalance() {
        long stamp = stampedLock.tryOptimisticRead();
        double currentBalance = balance;
        if (!stampedLock.validate(stamp)) {
            // 乐观读失败，升级为悲观读
            stamp = stampedLock.readLock();
            try {
                currentBalance = balance;
            } finally {
                stampedLock.unlockRead(stamp);
            }
        }
        return currentBalance;
    }
    
    // 写操作
    public void setBalance(double balance) {
        long stamp = stampedLock.writeLock();
        try {
            this.balance = balance;
        } finally {
            stampedLock.unlockWrite(stamp);
        }
    }
}
```

### 6.2 性能对比

| 锁类型 | 性能 | 特点 |
|--------|------|------|
| ReentrantReadWriteLock | 较好 | 支持重入 |
| StampedLock | 最好 | 乐观读，无死锁 |

---

## 7. 总结

| 特性 | ReentrantReadWriteLock | StampedLock |
|------|------------------------|--------------|
| 读锁 | 支持 | 支持 |
| 写锁 | 支持 | 支持 |
| 乐观读 | 不支持 | 支持 |
| 锁降级 | 支持 | 支持 |
| 重入 | 支持 | 不支持 |
| 公平 | 支持 | 支持 |

适用场景：
- **读多写少**：ReadWriteLock、StampedLock
- **简单场景**：synchronized
- **复杂同步**：ReentrantLock

---

> 📚 续篇：《Semaphore 信号量》
