---
title: 自定义 Hook
summary: 自定义 Hook 是一个使用 use 开头的函数，内部可以调用其他 Hook。
publishedAt: '2026-03-16'
track: engineering
topic: React
tags: []
featured: false
draft: false
slug: 自定义-hook
legacyPaths:
  - /coding/React/自定义 Hook
---
> 自定义 Hook 让我们可以复用组件逻辑，使代码更加模块化和可维护

## 什么是自定义 Hook？

自定义 Hook 是一个使用 `use` 开头的函数，内部可以调用其他 Hook。

```jsx
// useCounter.js
function useCounter() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);

  return { count, increment, decrement };
}

// 使用
function App() {
  const { count, increment, decrement } = useCounter();
  return <button onClick={increment}>{count}</button>;
}
```

## 自定义 Hook 的优势

### 1. 代码复用

```
传统方式:
┌─────────────────────────────────────┐
│  Component A                        │
│  ┌─────────────────────────────┐   │
│  │ 相同的计数器逻辑             │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 组件特定逻辑                 │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

自定义 Hook:
┌─────────────────────────────────────┐
│  useCounter()  ←── 复用             │
├─────────────────────────────────────┤
│  Component A    Component B        │
│  useCounter()   useCounter()       │
└─────────────────────────────────────┘
```

### 2. 关注点分离

```jsx
// ❌ 所有逻辑都在组件内
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  // UI 渲染逻辑
  if (loading) return <Spinner />;
  return <div>{user.name}</div>;
}

// ✅ 逻辑分离到自定义 Hook
function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
}

function UserProfile({ userId }) {
  const { user, loading, error } = useUser(userId);

  if (loading) return <Spinner />;
  return <div>{user.name}</div>;
}
```

## 实战自定义 Hooks

### 1. useLocalStorage

```jsx
function useLocalStorage(key, initialValue) {
  // 获取初始值
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // 监听变化并保存
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function
        ? value(storedValue)
        : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// 使用
function App() {
  const [name, setName] = useLocalStorage('name', '');

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
    />
  );
}
```

### 2. useFetch

```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

// 使用
function UserList() {
  const { data, loading, error } = useFetch('/api/users');

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <ul>
      {data.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

### 3. useDebounce

```jsx
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// 使用（搜索防抖）
function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  // 这里使用 debouncedQuery 发起请求
  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="搜索..."
    />
  );
}
```

### 4. useToggle

```jsx
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  return [value, toggle];
}

// 使用
function Switch() {
  const [isOn, toggle] = useToggle();

  return (
    <button onClick={toggle}>
      {isOn ? 'ON' : 'OFF'}
    </button>
  );
}
```

### 5. useWindowSize

```jsx
function useWindowSize() {
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

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// 使用
function ResponsiveComponent() {
  const { width } = useWindowSize();

  return (
    <div>
      {width < 768 ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
}
```

### 6. usePrevious

```jsx
function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// 使用
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>当前: {count}</p>
      <p>上次: {prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}
```

## 自定义 Hook 最佳实践

### 1. 命名规范

```jsx
// ✅ 使用 use 前缀
function useUser() {}
function useAuth() {}
function useCart() {}

// ❌ 不使用 use 前缀
function getUser() {}
function UserData() {}
```

### 2. 单一职责

```jsx
// ✅ 单一职责
function useUser() { /* 获取用户 */ }
function useUserPosts() { /* 获取用户文章 */ }

// ❌ 职责过多
function useUserEverything() { /* 获取用户、文章、评论、设置... */ }
```

### 3. 组合多个 Hook

```jsx
function useUserData(userId) {
  const user = useUser(userId);
  const posts = useUserPosts(userId);
  const loading = user.loading || posts.loading;
  const error = user.error || posts.error;

  return { user: user.data, posts: posts.data, loading, error };
}
```

## 总结

本章我们学习了：
- 什么是自定义 Hook
- 自定义 Hook 的优势（代码复用、关注点分离）
- 实战多个自定义 Hook
- 自定义 Hook 的最佳实践

下一章我们将通过一个完整的 Todo List 项目来整合所有学习的知识。
