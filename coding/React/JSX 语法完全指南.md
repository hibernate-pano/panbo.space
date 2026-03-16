---
title: JSX 语法完全指南
---

# JSX 语法完全指南

> JSX = JavaScript + HTML ，让代码更直观

## 什么是 JSX？

JSX 是 JavaScript 的语法扩展，允许在 JavaScript 中编写类似 HTML 的标记。它不是模板语言，而是一种 JavaScript 的语法糖。

```jsx
// JSX 写法
const element = <h1>Hello, World!</h1>;

// 等价的 JavaScript 写法
const element = React.createElement('h1', null, 'Hello, World!');
```

## JSX 基础语法

### 1. 标签闭合

所有标签必须闭合：

```jsx
// 正确
<div>内容</div>
<input type="text" />
<br />

// 错误 ❌
<div>内容
<input type="text">
<br>
```

### 2. className

使用 `className` 而非 `class`（因为 class 是 JavaScript 保留字）：

```jsx
// 正确
<div className="container">
  <h1 className="title">标题</h1>
</div>

// 错误 ❌
<div class="container">
```

### 3. JavaScript 表达式

在 JSX 中使用 `{}` 嵌入 JavaScript 表达式：

```jsx
const name = 'Panbo';
const age = 18;

function App() {
  return (
    <div>
      <p>姓名: {name}</p>
      <p>年龄: {age}</p>
      <p>两年后: {age + 2}</p>
      <p>是否成年: {age >= 18 ? '是' : '否'}</p>
    </div>
  );
}
```

### 4. 条件渲染

```jsx
function App({ isLoggedIn }) {
  return (
    <div>
      {/* 三元运算符 */}
      {isLoggedIn ? <button>登出</button> : <button>登录</button>}

      {/* && 运算符 */}
      {isLoggedIn && <p>欢迎回来！</p>}

      {/* switch 使用变量 */}
      {status === 'loading' && <Spinner />}
      {status === 'error' && <ErrorMessage />}
      {status === 'success' && <SuccessMessage />}
    </div>
  );
}
```

### 5. 列表渲染

使用 `map` 渲染列表：

```jsx
const fruits = ['苹果', '香蕉', '橙子'];

function App() {
  return (
    <ul>
      {fruits.map((fruit, index) => (
        <li key={index}>{fruit}</li>
      ))}
    </ul>
  );
}
```

> **注意**：每个列表项需要唯一的 `key` 属性，帮助 React 高效更新列表。

## 样式处理

### 1. 内联样式

```jsx
function App() {
  const style = {
    color: '#333',
    fontSize: '16px',
    backgroundColor: '#f0f0f0'
  };

  return <p style={style}>内联样式</p>;
}
```

### 2. CSS 类名

```jsx
// App.css
.title {
  color: blue;
  font-size: 24px;
}

// App.jsx
import './App.css';

function App() {
  return <h1 className="title">标题</h1>;
}
```

### 3. CSS Modules（推荐）

```jsx
// Button.module.css
.button {
  background: blue;
  color: white;
}

// Button.jsx
import styles from './Button.module.css';

function Button() {
  return <button className={styles.button}>点击</button>;
}
```

## 事件处理

```jsx
function App() {
  const handleClick = (e) => {
    console.log('点击了', e.target);
  };

  return (
    <button onClick={handleClick}>点击我</button>
  );
}
```

### 常见事件

| 事件 | 说明 |
|------|------|
| `onClick` | 点击事件 |
| `onChange` | 输入变化 |
| `onSubmit` | 表单提交 |
| `onMouseEnter` | 鼠标进入 |
| `onKeyDown` | 键盘按键 |

## 注释写法

```jsx
function App() {
  return (
    <div>
      {/* 这是单行注释 */}
      <h1>标题</h1>
      {/*
        这是
        多行
        注释
      */}
    </div>
  );
}
```

## 总结

本章我们学习了：
- JSX 基础语法和标签闭合
- 在 JSX 中嵌入 JavaScript 表达式
- 条件渲染与列表渲染
- 样式处理的多种方式
- 事件处理

下一章我们将深入了解 React 的核心概念——组件化开发。
