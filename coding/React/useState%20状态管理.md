---
title: useState 状态管理
---

# useState 状态管理

> Hooks 是 React 16.8 引入的新特性，让我们可以在函数组件中使用 state

## useState 基础

### 基本语法

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

### 语法解析

```jsx
const [state, setState] = useState(initialValue);
      │         │              │
      │         │              └─ 初始值
      │         │
      │         └─ 更新状态的函数
      │
      └─ 当前状态值
```

### useState 返回值

```jsx
import { useState } from 'react';

// useState 返回一个数组，包含两个元素：
// 1. 当前的状态值
// 2. 更新状态的函数

const result = useState(0);
// result[0] = 0    (状态值)
// result[1] = fn  (更新函数)

// 通常使用数组解构
const [count, setCount] = useState(0);
```

## 多种数据类型

### 数字

```jsx
function AgeCounter() {
  const [age, setAge] = useState(25);

  const grow = () => setAge(age + 1);
  const reset = () => setAge(25);

  return (
    <div>
      <p>年龄: {age}</p>
      <button onClick={grow}>长大</button>
      <button onClick={reset}>重置</button>
    </div>
  );
}
```

### 字符串

```jsx
function InputDemo() {
  const [name, setName] = useState('');

  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="输入名字"
      />
      <p>你好, {name}!</p>
    </div>
  );
}
```

### 布尔值

```jsx
function ToggleDemo() {
  const [isOn, setIsOn] = useState(false);

  return (
    <button onClick={() => setIsOn(!isOn)}>
      {isOn ? '开' : '关'}
    </button>
  );
}
```

### 数组

```jsx
function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    setTodos([
      ...todos,
      { id: Date.now(), text, completed: false }
    ]);
  };

  const removeTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} onClick={() => removeTodo(todo.id)}>
            {todo.text}
          </li>
        ))}
      </ul>
      <button onClick={() => addTodo('新任务')}>添加</button>
    </div>
  );
}
```

### 对象

```jsx
function UserForm() {
  const [user, setUser] = useState({
    name: '',
    email: '',
    age: 0
  });

  const updateField = (field, value) => {
    setUser({
      ...user,
      [field]: value
    });
  };

  return (
    <div>
      <input
        value={user.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="姓名"
      />
      <input
        value={user.email}
        onChange={(e) => updateField('email', e.target.value)}
        placeholder="邮箱"
      />
    </div>
  );
}
```

## 函数式更新

### 为什么要用函数式更新？

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  // ❌ 错误：当更新依赖当前值时，可能出现闭包问题
  const increment = () => {
    setCount(count + 1);
    setCount(count + 1); // 这里的 count 仍然是旧值！
  };

  // ✅ 正确：使用函数式更新
  const increment = () => {
    setCount(prevCount => prevCount + 1);
    setCount(prevCount => prevCount + 1); // 每次基于最新值更新
  };

  return <button onClick={increment}>{count}</button>;
}
```

### 完整示例：计数器

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  // 增加
  const increment = () => setCount(prev => prev + 1);

  // 减少
  const decrement = () => setCount(prev => prev - 1);

  // 重置
  const reset = () => setCount(0);

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>重置</button>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

## 多个 State

### 分散定义

```jsx
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(0);

  // ...
}
```

### 集中管理

```jsx
function Form() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: 0
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div>
      <input
        value={formData.name}
        onChange={(e) => updateForm('name', e.target.value)}
      />
    </div>
  );
}
```

## useState 常见问题

### 1. 异步更新

```jsx
function Demo() {
  const [value, setValue] = useState(0);

  const handleClick = () => {
    // ❌ console.log 立即执行，获取的是旧值
    setValue(value + 1);
    console.log(value); // 仍然是 0

    // ✅ 使用 useEffect 监听 state 变化
  };

  // ✅ 正确方式：在 useEffect 中监听
  useEffect(() => {
    console.log('value 更新了:', value);
  }, [value]);

  return <button onClick={handleClick}>{value}</button>;
}
```

### 2. 引用类型更新

```jsx
function ArrayDemo() {
  const [items, setItems] = useState([1, 2, 3]);

  const add = () => {
    // ❌ 错误：修改原数组
    items.push(4);
    setItems(items);

    // ✅ 正确：创建新数组
    setItems([...items, 4]);
  };

  return <button onClick={add}>{items.join(', ')}</button>;
}

function ObjectDemo() {
  const [user, setUser] = useState({ name: 'Tom', age: 18 });

  const update = () => {
    // ❌ 错误：修改原对象
    user.age = 19;
    setUser(user);

    // ✅ 正确：创建新对象
    setUser({ ...user, age: 19 });
  };

  return <button onClick={update}>{user.name} - {user.age}</button>;
}
```

## 初始化函数

### 惰性初始化

```jsx
function ExpensiveComponent() {
  // ❌ 每次渲染都执行
  const [data, setData] = useState(expensiveCalculation());

  // ✅ 只在首次渲染时执行
  const [data, setData] = useState(() => expensiveCalculation());
}

function expensiveCalculation() {
  // 耗时的计算...
  return 'result';
}
```

### 实际应用

```jsx
function TodoList() {
  // ✅ 从 localStorage 读取初始值
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
   return (
 }, [todos]);

    <ul>
      {todos.map(todo => <li key={todo.id}>{todo.text}</li>)}
    </ul>
  );
}
```

## 总结

本章我们学习了：
- useState 的基本语法
- 多种数据类型的 state 管理
- 函数式更新的重要性
- 多个 state 的管理方式
- useState 的常见问题和最佳实践
- 惰性初始化

下一章我们将学习另一个重要的 Hook——useEffect。
