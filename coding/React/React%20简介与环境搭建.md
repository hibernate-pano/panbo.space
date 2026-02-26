---
title: React 简介与环境搭建
---

# React 简介与环境搭建

> React —— 让前端开发变得简单而优雅

## 什么是 React？

React 是 Facebook 于 2013 年开源的 JavaScript 库，用于构建用户界面。它的核心思想是**组件化**——将 UI 拆分为独立、可复用的 pieces，每个 piece 维护自己的状态和逻辑。

### React 的核心特点

| 特点 | 说明 |
|------|------|
| 组件化 | 将 UI 拆分为独立可复用的组件 |
| 声明式 | 描述"what"而非"how" |
| 虚拟 DOM | 高效更新真实 DOM |
| 单向数据流 | 数据流向清晰可预测 |
| 生态丰富 | 拥有庞大的生态系统 |

## 为什么选择 React？

```
传统 DOM 操作:          React 方式:
┌─────────────┐        ┌─────────────┐
│  手动操作   │        │  声明式描述 │
│  DOM 元素   │   →    │     UI     │
└─────────────┘        └─────────────┘
     ↑                      ↑
     └──────────────────────┘
        State 变化自动更新
```

- **提高开发效率**：组件化开发，复用性强
- **性能优秀**：虚拟 DOM 机制
- **社区活跃**：丰富的生态和资源
- **就业广阔**：市场需求大

## 环境搭建

### 1. 安装 Node.js

React 需要 Node.js 环境。首先检查是否已安装：

```bash
node --version
npm --version
```

如果没有安装，访问 [nodejs.org](https://nodejs.org/) 下载 LTS 版本。

### 2. 创建 React 项目

推荐使用 **Vite** 创建项目，它是新一代构建工具，速度更快：

```bash
# 使用 npm
npm create vite@latest my-react-app -- --template react

# 使用 yarn
yarn create vite my-react-app --template react

# 使用 pnpm
pnpm create vite my-react-app --template react
```

### 3. 启动项目

```bash
cd my-react-app
npm install
npm run dev
```

项目结构如下：

```
my-react-app/
├── public/          # 静态资源
├── src/
│   ├── App.jsx     # 主组件
│   ├── main.jsx    # 入口文件
│   └── index.css   # 全局样式
├── index.html      # HTML 模板
├── package.json    # 项目配置
└── vite.config.js  # Vite 配置
```

### 4. 第一个 React 组件

修改 `src/App.jsx`：

```jsx
function App() {
  return (
    <div className="app">
      <h1>Hello, React!</h1>
      <p>欢迎来到 React 的世界 🚀</p>
    </div>
  )
}

export default App
```

## 开发工具推荐

### VS Code 插件

- **ES7+ React/Redux/React-Native snippets**：快速生成代码片段
- **Prettier - Code formatter**：代码格式化
- **ESLint**：代码检查
- **Auto Rename Tag**：自动重命名标签

### 浏览器插件

- **React Developer Tools**：调试 React 应用

## 总结

本章我们了解了：
- React 是什么以及它的核心特点
- 为什么选择 React
- 如何搭建开发环境
- 创建第一个 React 组件

下一章我们将学习 JSX 语法——React 的核心语法。
