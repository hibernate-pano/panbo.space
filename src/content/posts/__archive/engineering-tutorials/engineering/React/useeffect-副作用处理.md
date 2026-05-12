---
title: useEffect 副作用处理
summary: 副作用（Side Effect）是指那些影响 React 组件外部的操作：
publishedAt: '2026-03-16'
track: engineering
topic: React
tags: []
featured: false
draft: false
slug: useeffect-副作用处理
legacyPaths:
  - /coding/React/useEffect 副作用处理
---
> useEffect 让我们在函数组件中处理副作用，如数据获取、订阅、手动 DOM 操作等

## 什么是副作用？

副作用（Side Effect）是指那些影响 React 组件外部的操作：

- 数据获取（API 请求）
- 订阅事件
- 手动修改 DOM
- 定时器
- localStorage 操作

## useState 基础

### 基本语法

```jsx
import { useEffect } from 'react';

function Demo() {
  useEffect(() => {
    // 这是副作用逻辑
    console.log('组件挂载了');
  });
  return <div>Hello</div>;
}
```

### 语法解析

```jsx
useEffect(effectFunction, dependencyArray);
                  │              │
                  │              └─ 依赖数组
                  └─ 副作用函数
```

## useEffect 的执行时机

### 1. 不指定依赖（每次渲染都执行）

```jsx
function Demo() {
  useEffect(() => {
    console.log('每次渲染都执行');
  });

  return <div>Hello</div>;
}
```

### 2. 空依赖数组（只执行一次）

```jsx
function Demo() {
  useEffect(() => {
    console.log('只在组件挂载时执行一次');
  }, []); // 空数组 = 只在首次渲染执行

  return <div>Hello</div>;
}
```

### 3. 指定依赖（依赖变化时执行）

```jsx
function Demo({ count }) {
  useEffect(() => {
    console.log('count 变化了:', count);
  }, [count]); // count 变化时重新执行

  return <div>Count: {count}</div>;
}
```

## 常见使用场景

### 1. 数据获取

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]); // userId 变化时重新获取

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  return <div>{user.name}</div>;
}
```

### 2. 定时器

```jsx
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    // 清理函数
    return () => clearInterval(interval);
  }, []); // 只设置一次

  return <div>时间: {seconds} 秒</div>;
}
```

### 3. 监听窗口大小

```jsx
function WindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div>
      宽度: {size.width}, 高度: {size.height}
    </div>
  );
}
```

### 4. localStorage

```jsx
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// 使用
function App() {
  const [name, setName] = useLocalStorage('name', '');

  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

### 5. 表单验证

```jsx
function FormWithValidation() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (email && !email.includes('@')) {
      setError('邮箱格式不正确');
    } else {
      setError('');
    }
  }, [email]);

  return (
    <div>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}
```

## 清理函数

### 为什么需要清理？

```jsx
function Component() {
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('tick');
    }, 1000);

    // ✅ 返回清理函数
    return () => {
      clearInterval(timer);
    };
  }, []);

  return <div>Hello</div>;
}
```

### 不清理的问题

```
组件挂载 → 启动定时器 → 组件卸载 → 定时器仍在运行（内存泄漏）！
```

### 清理的时机

1. 组件卸载时
2. 副作用再次执行前（同一个 effect）

```jsx
function Component() {
  useEffect(() => {
    console.log('effect 执行');

    // 返回清理函数
    return () => {
      console.log('清理');
    };
  }, [count]); // count 变化时

  return <div>{count}</div>;
}

// 输出顺序:
// 首次: effect 执行
// 点击: 清理 -> effect 执行
```

## 依赖数组的注意事项

### 1. 包含所有使用的值

```jsx
function Component({ a, b }) {
  // ❌ 错误：使用了 a 和 b，但只依赖了 a
  useEffect(() => {
    console.log(a + b);
  }, [a]);

  // ✅ 正确
  useEffect(() => {
    console.log(a + b);
  }, [a, b]);
}
```

### 2. 避免频繁变化的值

```jsx
function Component() {
  const [count, setCount] = useState(0);

  // ❌ 错误：每次渲染都执行
  useEffect(() => {
    console.log(count);
  }, [count]);

  // ✅ 使用函数式更新
  useEffect(() => {
    // 这个 effect 依赖的是 setter，不需要依赖 count
  }, []);
}
```

### 3. useEffect 中的函数

```jsx
function Component({ id }) {
  const [data, setData] = useState(null);

  // ❌ 问题：每次渲染都定义新函数
  useEffect(() => {
    fetchData(id);
  }, [fetchData]); // 依赖函数本身

  // ✅ 解决：将函数定义移到 useEffect 内部
  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/${id}`);
      setData(await res.json());
    }
    fetchData();
  }, [id]);
}
```

## 常见错误

### 1. 无限循环

```jsx
function Component() {
  const [data, setData] = useState(null);

  // ❌ 错误：在 effect 中更新 state
  useEffect(() => {
    setData({ value: 1 });
  }, []); // 每次 data 变化都会重新执行
}
```

### 2. 忘记清理订阅

```jsx
function Component() {
  useEffect(() => {
    const subscription = someAPI.subscribe();

    // ❌ 忘记清理
  }, []);
}
```

## 总结

本章我们学习了：
- 什么是副作用
- useEffect 的基本语法
- 执行时机（不指定、空数组、指定依赖）
- 常见使用场景（数据获取、定时器、监听、localStorage）
- 清理函数的重要性
- 依赖数组的注意事项

下一章我们将学习自定义 Hook——将可复用的逻辑提取为单独的函数。
