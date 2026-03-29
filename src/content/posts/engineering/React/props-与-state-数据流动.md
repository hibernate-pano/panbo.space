---
title: Props 与 State - 数据流动
summary: Props 是从父组件传递给子组件的数据。
publishedAt: '2026-03-16'
track: engineering
topic: React
tags: []
featured: false
draft: false
slug: props-与-state-数据流动
legacyPaths:
  - /coding/React/Props 与 State - 数据流动
---
> 理解数据流动是掌握 React 的关键

## Props 和 State 的区别

| 特性 | Props | State |
|------|-------|-------|
| 父组件传递 | ✅ | ❌ |
| 组件内部管理 | ❌ | ✅ |
| 变化时重新渲染 | ✅ | ✅ |
| 初始化设置 | ✅ | ✅ |
| 可修改 | ❌ | ✅ |

```
Props:    父组件 →→→→→→→ 子组件（只读）
                ↖️↗️
State:    组件内部管理（可写）
```

## Props：组件的输入

Props 是从父组件传递给子组件的数据。

### 基本使用

```jsx
// 父组件
function App() {
  return <Greeting name="Panbo" age={18} />;
}

// 子组件
function Greeting({ name, age }) {
  return (
    <div>
      <h1>你好，{name}！</h1>
      <p>你今年 {age} 岁了。</p>
    </div>
  );
}
```

### Props 传递对象

```jsx
function UserCard({ user }) {
  const { name, email, avatar } = user;

  return (
    <div className="card">
      <img src={avatar} alt={name} />
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
}

// 使用
<UserCard
  user={{
    name: 'Panbo',
    email: 'panbo@example.com',
    avatar: '/avatar.png'
  }}
/>
```

### Props 传递函数

```jsx
function Parent() {
  const handleDelete = (id) => {
    console.log('删除:', id);
  };

  return <Child onDelete={handleDelete} />;
}

function Child({ onDelete }) {
  return (
    <button onClick={() => onDelete(1)}>删除</button>
  );
}
```

## State：组件的状态

State 是组件内部管理的数据，会影响组件的渲染。

### useState Hook

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

### useState 的原理

```jsx
// useState 返回一个数组
const [state, setState] = useState(initialValue);

// 数组解构：
// state    → 当前的 state 值
// setState → 更新 state 的函数
// useState → React Hook
```

### 多个 State

```jsx
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(0);

  return (
    <form>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="姓名"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
      />
      <input
        type="number"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        placeholder="年龄"
      />
    </form>
  );
}
```

### State 对象

```jsx
function UserForm() {
  const [user, setUser] = useState({
    name: '',
    email: '',
    age: 0
  });

  const updateName = (name) => {
    setUser({ ...user, name });
  };

  // 或者使用函数式更新
  const updateAge = (age) => {
    setUser((prevUser) => ({ ...prevUser, age }));
  };

  return (
    <div>
      <p>{user.name} - {user.email}</p>
    </div>
  );
}
```

## 数据流动示例

### 完整的父子组件示例

```jsx
function App() {
  // 父组件的 state
  const [todos, setTodos] = useState([
    { id: 1, text: '学习 React', done: false },
    { id: 2, text: '写代码', done: true }
  ]);

  // 添加 todo 的函数
  const addTodo = (text) => {
    setTodos([
      ...todos,
      { id: Date.now(), text, done: false }
    ]);
  };

  // 切换完成状态
  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
  };

  return (
    <div>
      <h1>我的待办</h1>
      <AddTodoForm onAdd={addTodo} />
      <TodoList todos={todos} onToggle={toggleTodo} />
    </div>
  );
}

function AddTodoForm({ onAdd }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="添加待办..."
      />
      <button type="submit">添加</button>
    </form>
  );
}

function TodoList({ todos, onToggle }) {
  return (
    <ul>
      {todos.map(todo => (
        <li
          key={todo.id}
          onClick={() => onToggle(todo.id)}
          style={{
            textDecoration: todo.done ? 'line-through' : 'none'
          }}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

## State 的注意事项

### 1. 不要直接修改 State

```jsx
// ❌ 错误
count = count + 1;
user.name = 'new name';
todos.push(newTodo);

// ✅ 正确
setCount(count + 1);
setUser({ ...user, name: 'new name' });
setTodos([...todos, newTodo]);
```

### 2. State 更新是异步的

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  // ❌ 错误：基于旧值计算
  const handleClick = () => {
    setCount(count + 1);
    console.log(count); // 可能是旧值
  };

  // ✅ 正确：使用函数式更新
  const handleClick = () => {
    setCount(prevCount => prevCount + 1);
    console.log(count); // 仍然是旧值，但 count 会被正确更新
  };

  return <button onClick={handleClick}>{count}</button>;
}
```

### 3. 引用类型 State

```jsx
function App() {
  const [items, setItems] = useState([{ id: 1 }]);

  const update = () => {
    // ❌ 错误：修改了原数组
    items[0].name = 'updated';
    setItems(items);

    // ✅ 正确：创建新数组
    setItems([
      { ...items[0], name: 'updated' }
    ]);
  };
}
```

## 总结

本章我们学习了：
- Props 和 State 的区别
- Props 的基本使用和传递方式
- useState Hook 的使用
- 完整的数据流动示例
- State 更新的注意事项

下一章我们将学习事件处理与状态更新。
