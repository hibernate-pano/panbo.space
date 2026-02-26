# synchronized 深入理解

> Java 最基础的同步关键字

---

## 1. synchronized 的基本使用

### 1.1 三种用法

```java
// 1. 修饰实例方法（锁的是 this）
public synchronized void method() {
    // 同一时刻只有一个线程能执行这个方法
}

// 2. 修饰静态方法（锁的是 Class 对象）
public static synchronized void staticMethod() {
    // 同一时刻只有一个线程能执行这个方法
}

// 3. 修饰代码块（锁的是指定对象）
public void method() {
    synchronized (this) {
        // 锁的是当前对象
    }
    
    synchronized (obj) {
        // 锁的是指定对象
    }
    
    synchronized (MyClass.class) {
        // 锁的是 Class 对象
    }
}
```

### 1.2 锁的是什么？

```java
public class LockDemo {
    // 锁的是 this（当前对象实例）
    public synchronized void instanceMethod() {}
    
    // 锁的是 MyClass.class（Class 对象）
    public static synchronized void staticMethod() {}
    
    // 锁的是 this
    public void instanceBlock() {
        synchronized (this) {}
    }
    
    // 锁的是 MyClass.class
    public void classBlock() {
        synchronized (MyClass.class) {}
    }
}
```

---

## 2. synchronized 的原理

### 2.1 Monitor 机制

```java
// synchronized 底层原理
// 每个 Java 对象都有一个 Monitor（监视器锁）

// 字节码层面
public synchronized void method();
  // monitorenter
  // ... 方法体 ...
  // monitorexit

public void block() {
    synchronized (this) {
        // monitorenter
        // ... 
        // monitorexit
    }
}
```

### 2.2 对象头结构

```
┌─────────────────────────────────────────────────────────────┐
│                     Object Header (64 bits)                │
├─────────────────────────────────────────────────────────────┤
│  Mark Word (64 bits)                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 无锁态: 25bit + 31bit 对象分代年龄 + 1bit 偏向锁位 + 2bit 锁标志位 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

锁标志位:
- 00: 无锁
- 01: 偏向锁
- 00: 轻量级锁
- 10: 重量级锁
- 11: GC 标记
```

---

## 3. 锁的升级过程

### 3.1 锁的四种状态

```
无锁 → 偏向锁 → 轻量级锁 → 重量级锁
  (不可逆)
```

### 3.2 偏向锁

```java
// 第一次获取锁时，使用偏向锁
// 特点：只有一次 CAS 操作，之后无需任何同步开销

// 场景：适用于只有一个线程访问同步块的场景

// 关闭偏向锁（如果需要）
-XX:-UseBiasedLocking=false
```

### 3.3 轻量级锁

```java
// 多个线程交替访问同步块时，使用轻量级锁
// 特点：使用 CAS 自旋，不用阻塞

// 原理：在线程栈帧中创建锁记录（Lock Record）
//       将对象头中的 Mark Word 复制到锁记录
//       使用 CAS 将对象头替换为指向锁记录的指针

// 自旋次数过多会膨胀为重量级锁
```

### 3.4 重量级锁

```java
// 多个线程竞争同一把锁时，膨胀为重量级锁
// 特点：需要操作系统Mutex，互斥会阻塞线程

// 缺点：线程阻塞，唤醒需要用户态→内核态切换
// 优点：无需自旋，不消耗 CPU
```

---

## 4. 可重入性

```java
// synchronized 是可重入锁
class Father {
    public synchronized void father() {
        System.out.println("father");
        son();  // 可以重入
    }
    
    public synchronized void son() {
        System.out.println("son");
    }
}

class Child extends Father {
    public synchronized void child() {
        System.out.println("child");
        father();  // 继承父类的锁
    }
}

// 同一个线程可以多次获取同一把锁
```

---

## 5. 等待与通知

### 5.1 wait/notify

```java
public class WaitNotifyDemo {
    private final Object lock = new Object();
    private boolean ready = false;
    
    public void waitForSignal() throws InterruptedException {
        synchronized (lock) {
            while (!ready) {
                lock.wait();  // 释放锁，等待通知
            }
            System.out.println("Received signal!");
        }
    }
    
    public void doSignal() {
        synchronized (lock) {
            ready = true;
            lock.notify();  // 随机唤醒一个等待的线程
            // lock.notifyAll();  // 唤醒所有等待的线程
        }
    }
}
```

### 5.2 注意事项

```java
// ✅ 正确用法：使用 while + wait
synchronized (lock) {
    while (conditionIsFalse) {
        lock.wait();
    }
    // 处理逻辑
}

// ❌ 错误用法：使用 if
synchronized (lock) {
    if (conditionIsFalse) {
        lock.wait();  // 可能被虚假唤醒
    }
    // 处理逻辑
}
```

---

## 6. 常见问题

### 6.1 死锁

```java
// 死锁示例
public class DeadLockDemo {
    private final Object lock1 = new Object();
    private final Object lock2 = new Object();
    
    public void method1() {
        synchronized (lock1) {
            synchronized (lock2) {
                // 操作
            }
        }
    }
    
    public void method2() {
        synchronized (lock2) {  // 与 method1 顺序相反
            synchronized (lock1) {
                // 操作
            }
        }
    }
}

// 解决：固定加锁顺序
```

### 6.2 锁粒度

```java
// ❌ 锁粒度过粗
public synchronized void process() {
    // 整个方法加锁，即使只是其中一小段需要同步
    download();    // 耗时操作1
    parse();       // 耗时操作2  
    save();        // 耗时操作3
}

// ✅ 锁粒度细化
public void process() {
    download();
    synchronized (this) {
        parse();
        save();
    }
}
```

---

## 7. 总结

| 特性 | synchronized |
|------|--------------|
| 锁实现 | JVM 内置 |
| 锁类型 | 可重入锁 |
| 公平性 | 非公平 |
| 锁释放 | 自动释放 |
| 条件变量 | 无（需配合 wait/notify） |
| 性能 | JDK6+ 优化后很好 |

---

> 📚 续篇：《ReentrantLock 详解》
