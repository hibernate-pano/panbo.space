---
title: TodoList 实战 - 整合所有概念
summary: 我们将构建一个功能完整的待办清单应用：
publishedAt: '2026-03-16'
track: engineering
topic: React
tags: []
featured: false
draft: false
slug: todolist-实战
legacyPaths:
  - /coding/React/TodoList 实战
---
> 通过这个实战项目，整合我们之前学习的所有 React 知识

## 项目目标

我们将构建一个功能完整的待办清单应用：

- 添加待办事项
- 标记完成/未完成
- 删除待办
- 编辑待办
- 筛选显示（全部/进行中/已完成）
- 数据持久化（localStorage）

## 项目结构

```
src/
├── components/
│   ├── TodoForm.jsx      # 添加表单
│   ├── TodoItem.jsx      # 单条待办
│   ├── TodoList.jsx      # 待办列表
│   └── TodoFilter.jsx    # 筛选器
├── hooks/
│   └── useTodos.js       # 待办逻辑 Hook
├── App.jsx               # 主组件
└── App.css               # 样式
```

## 第一步：创建自定义 Hook

### useTodos.js

```jsx
import { useState, useEffect } from 'react';

function useTodos() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });

  const [filter, setFilter] = useState('all'); // all, active, completed

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // 添加
  const addTodo = (text) => {
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
      createdAt: new Date().toISOString()
    };
    setTodos([newTodo, ...todos]);
  };

  // 切换完成状态
  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id
        ? { ...todo, completed: !todo.completed }
        : todo
    ));
  };

  // 删除
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // 编辑
  const editTodo = (id, newText) => {
    setTodos(todos.map(todo =>
      todo.id === id
        ? { ...todo, text: newText }
        : todo
    ));
  };

  // 筛选
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  // 统计
  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length
  };

  return {
    todos: filteredTodos,
    filter,
    setFilter,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    stats
  };
}

export default useTodos;
```

## 第二步：创建组件

### TodoForm.jsx

```jsx
import { useState } from 'react';

function TodoForm({ onAdd }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    onAdd(text);
    setText('');
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="添加新的待办..."
        className="todo-input"
      />
      <button type="submit" className="todo-add-btn">
        添加
      </button>
    </form>
  );
}

export default TodoForm;
```

### TodoItem.jsx

```jsx
import { useState } from 'react';

function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleSave = () => {
    if (!editText.trim()) return;
    onEdit(todo.id, editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <li className="todo-item editing">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="edit-input"
          autoFocus
        />
        <div className="edit-actions">
          <button onClick={handleSave} className="save-btn">保存</button>
          <button onClick={handleCancel} className="cancel-btn">取消</button>
        </div>
      </li>
    );
  }

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <div className="todo-content" onClick={() => onToggle(todo.id)}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="todo-checkbox"
        />
        <span className="todo-text">{todo.text}</span>
      </div>
      <div className="todo-actions">
        <button
          onClick={() => setIsEditing(true)}
          className="edit-btn"
        >
          编辑
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="delete-btn"
        >
          删除
        </button>
      </div>
    </li>
  );
}

export default TodoItem;
```

### TodoList.jsx

```jsx
import TodoItem from './TodoItem';

function TodoList({ todos, onToggle, onDelete, onEdit, stats }) {
  if (todos.length === 0) {
    return (
      <div className="todo-empty">
        <p>暂无待办事项</p>
        <p className="todo-empty-hint">在上方添加你的第一个待办吧！</p>
      </div>
    );
  }

  return (
    <div className="todo-list-container">
      <ul className="todo-list">
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </ul>

      <div className="todo-stats">
        <span>总计: {stats.total}</span>
        <span>进行中: {stats.active}</span>
        <span>已完成: {stats.completed}</span>
      </div>
    </div>
  );
}

export default TodoList;
```

### TodoFilter.jsx

```jsx
function TodoFilter({ filter, onFilterChange }) {
  const filters = [
    { value: 'all', label: '全部' },
    { value: 'active', label: '进行中' },
    { value: 'completed', label: '已完成' }
  ];

  return (
    <div className="todo-filter">
      {filters.map(f => (
        <button
          key={f.value}
          className={`filter-btn ${filter === f.value ? 'active' : ''}`}
          onClick={() => onFilterChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export default TodoFilter;
```

## 第三步：组装主组件

### App.jsx

```jsx
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';
import TodoFilter from './components/TodoFilter';
import useTodos from './hooks/useTodos';
import './App.css';

function App() {
  const {
    todos,
    filter,
    setFilter,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    stats
  } = useTodos();

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">待办清单</h1>

        <TodoForm onAdd={addTodo} />

        <TodoFilter
          filter={filter}
          onFilterChange={setFilter}
        />

        <TodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onEdit={editTodo}
          stats={stats}
        />
      </div>
    </div>
  );
}

export default App;
```

## 第四步：添加样式

### App.css

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.app {
  padding: 40px 20px;
}

.container {
  max-width: 500px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.title {
  text-align: center;
  color: #333;
  margin-bottom: 24px;
  font-size: 28px;
}

/* Form */
.todo-form {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.todo-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.todo-input:focus {
  outline: none;
  border-color: #667eea;
}

.todo-add-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.todo-add-btn:hover {
  background: #5a6fd6;
}

/* Filter */
.todo-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* List */
.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.todo-item:hover {
  background: #f9f9f9;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #999;
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex: 1;
}

.todo-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.todo-text {
  font-size: 16px;
  color: #333;
}

.todo-actions {
  display: flex;
  gap: 8px;
}

.edit-btn, .delete-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.edit-btn {
  background: #e0e0e0;
  color: #333;
}

.delete-btn {
  background: #ff4757;
  color: white;
}

.edit-btn:hover, .delete-btn:hover {
  opacity: 0.8;
}

/* Editing */
.todo-item.editing {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.edit-input {
  padding: 10px;
  border: 2px solid #667eea;
  border-radius: 6px;
  font-size: 16px;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.save-btn {
  background: #2ed573;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* Stats */
.todo-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  margin-top: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
}

/* Empty */
.todo-empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

.todo-empty-hint {
  font-size: 14px;
  margin-top: 8px;
}
```

## 功能演示

```
┌─────────────────────────────────────────┐
│              待办清单                    │
├─────────────────────────────────────────┤
│  [输入待办...]              [添加]       │
├─────────────────────────────────────────┤
│  [全部]  [进行中]  [已完成]              │
├─────────────────────────────────────────┤
│  ☐ 学习 React                           │
│  ☑ 完成作业                    [编辑][删除]│
│  ☐ 写博客                               │
├─────────────────────────────────────────┤
│  总计: 3  进行中: 2  已完成: 1          │
└─────────────────────────────────────────┘
```

## 总结

通过这个实战项目，我们整合了：

1. **useState** - 管理待办列表、筛选状态、表单输入
2. **useEffect** - localStorage 持久化
3. **自定义 Hook** - useTodos 封装业务逻辑
4. **组件拆分** - Form、Item、List、Filter 分离
5. **Props 传递** - 父子组件通信
6. **条件渲染** - 空状态显示、编辑模式切换
7. **列表渲染** - 渲染待办列表

这就是 React 的魅力——通过组件化和 Hooks，我们可以构建出清晰、可维护的应用！

## 继续学习

接下来你可以：
- 添加拖拽排序功能
- 实现分类标签
- 添加提醒功能
- 接入后端 API
- 学习状态管理（Redux/Zustand）

祝你在 React 学习之路上越走越远！
