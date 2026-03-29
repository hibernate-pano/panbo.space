---
title: React Router v6 完全指南：银行转账系统实战
summary: >-
  从基础路由到嵌套布局、路由守卫、懒加载，详解 React Router v6 在银行级 SPA 应用中的完整实战，附带 Vite + TypeScript
  + V7 迁移指南。
publishedAt: 'Sun Mar 22 2026 08:00:00 GMT+0800 (China Standard Time)'
updatedAt: '2026-03-22'
track: engineering
topic: React
tags: []
featured: false
draft: false
slug: react-router-v6完全指南-银行系统实战
legacyPaths:
  - /coding/React/React-Router-v6完全指南-银行系统实战
---
> "一个没有路由的 React 应用就像一间没有门的银行——数据在里面，但你进不去。React Router 是 React 生态里访问量最高的库，掌握它是前端工程师的必修课。"

## 前言

在 HSBC 的手机银行和网银系统中，React Router 承担着页面导航的核心职责：

- **路由即状态**：用户的每一次点击，背后都是一次路由变化
- **嵌套布局**：每个业务模块（转账、账户、理财）有独立的 Layout
- **鉴权保护**：未登录用户无法访问转账页面
- **懒加载**：首屏只加载必要的代码，减少白屏时间
- **Deep Link**：用户分享链接可直接进入指定页面

React Router v6 是当前主流版本，相比 v5 有重大变化。本文基于 React Router v6.30（Vite + React 19 + TypeScript）编写。

## 1. 核心概念：路由的本质

### 1.1 SPA 路由 vs 传统多页

```
传统多页（MPA）：
  点击"转账" → 浏览器请求 /transfers.html → 服务器返回完整页面 → 整页刷新
  问题：每次请求都重新加载 CSS/JS，网络往返慢

单页应用（SPA）：
  点击"转账" → React Router 拦截 → 仅切换 <Route> 匹配的组件
  → 页面无刷新，用户体验流畅
  原理：浏览器 URL 变化，但不触发页面 reload
```

### 1.2 HashRouter vs BrowserRouter

```tsx
// 方式 1：HashRouter（静态服务器，无需配置 URL 重写）
// URL 格式：https://bank.example.com/#/transfers
// 优点：服务器不需要配置，GitHub Pages 友好
// 缺点：SEO 不友好，URL 带 # 不够干净
import { HashRouter } from 'react-router-dom'

<HashRouter>
  <App />
</HashRouter>

// 方式 2：BrowserRouter（需要服务器配置 fallback）
// URL 格式：https://bank.example.com/transfers
// 优点：干净 URLs，SEO 友好
// 缺点：需要服务器配置：所有路径 fallback 到 index.html
import { BrowserRouter } from 'react-router-dom'

<BrowserRouter>
  <App />
</BrowserRouter>

// 银行系统推荐：BrowserRouter（干净 URLs + SSR 兼容）
// 配合 Nginx 配置：try_files $uri $uri/ /index.html;
```

### 1.3 路由配置三要素

```tsx
// React Router v6 的路由配置三要素：
// 1. Routes：路由容器，管理所有 Route
// 2. Route：定义 path → element 的映射
// 3. Link/Navigate：触发路由变化（不触发页面 reload）

import { Routes, Route, Link, Navigate } from 'react-router-dom'

function App() {
  return (
    <nav>
      {/* Link 替代 <a>，不触发页面 reload */}
      <Link to="/">首页</Link>
      <Link to="/transfers">转账</Link>
      <Link to="/accounts">账户</Link>
    </nav>

    <Routes>
      {/* 精确匹配：/ → Home */}
      <Route path="/" element={<Home />} />

      {/* 精确匹配：/transfers → Transfers */}
      <Route path="/transfers" element={<Transfers />} />

      {/* 精确匹配：/accounts → Accounts */}
      <Route path="/accounts" element={<Accounts />} />
    </Routes>
  )
}
```

## 2. 嵌套路由：银行系统的 Layout 体系

银行系统的每个业务模块（转账、账户、理财）有独立的 Layout，包含：侧边栏、顶部导航面包屑、权限提示。嵌套路由是实现这一结构的标准方式。

### 2.1 嵌套路由基础

```tsx
// App.tsx：顶层路由，定义 Layout 层级
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 顶层：公共页面（无侧边栏） */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/404" element={<NotFound />} />

        {/* 嵌套：银行后台（有侧边栏 + 顶部导航） */}
        <Route path="/" element={<BankLayout />}>
          {/* Outlet 是占位符，子路由的内容渲染在这里 */}
          <Route index element={<Dashboard />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/:accountId" element={<AccountDetail />} />
        </Route>

        {/* 所有未匹配路由 → 404 */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### 2.2 BankLayout：银行后台主布局

```tsx
// layouts/BankLayout.tsx
// 每个银行后台页面都有的统一布局：侧边栏 + 顶部导航 + 面包屑

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './BankLayout.css'

function BankLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // 面包屑：根据路径动态生成
  const breadcrumbs = generateBreadcrumbs(location.pathname)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="bank-layout">
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/hsbc-logo.svg" alt="HSBC" />
          <span>网上银行</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <DashboardIcon /> 首页概览
          </Link>
          <Link
            to="/transfers"
            className={location.pathname.startsWith('/transfers') ? 'active' : ''}
          >
            <TransferIcon /> 转账汇款
          </Link>
          <Link
            to="/accounts"
            className={location.pathname.startsWith('/accounts') ? 'active' : ''}
          >
            <AccountIcon /> 我的账户
          </Link>
          <Link to="/investments">
            <InvestIcon /> 投资理财
          </Link>
          <Link to="/settings">
            <SettingsIcon /> 设置
          </Link>
        </nav>
      </aside>

      {/* 主内容区 */}
      <div className="main-content">
        {/* 顶部导航 */}
        <header className="top-bar">
          {/* 面包屑 */}
          <nav className="breadcrumbs" aria-label="breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.path}>
                {index > 0 && <span className="separator">/</span>}
                {crumb.path === location.pathname ? (
                  <span className="current">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path}>{crumb.label}</Link>
                )}
              </span>
            ))}
          </nav>

          <div className="user-info">
            <span>{user.name}</span>
            <button onClick={handleLogout}>退出</button>
          </div>
        </header>

        {/* 关键：子路由渲染在这里 */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [{ label: '首页', path: '/' }]

  let accumulated = ''
  for (const segment of segments) {
    accumulated += `/${segment}`
    crumbs.push({
      label: segment === 'accounts' ? '我的账户' :
             segment === 'transfers' ? '转账汇款' :
             segment === 'investments' ? '投资理财' : segment,
      path: accumulated
    })
  }
  return crumbs
}
```

### 2.3 二级嵌套：账户详情页

```tsx
// accounts/AccountDetail.tsx
// /accounts/:accountId 是 /accounts 的嵌套路由
// 共享账户列表页的部分 UI，但渲染不同内容

import { useParams, Link, Outlet } from 'react-router-dom'
import { useAccount } from '../hooks/useAccount'

function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>()
  const { account, transactions, loading } = useAccount(accountId!)

  if (loading) return <Skeleton />
  if (!account) return <NotFound />

  return (
    <div>
      {/* 账户概览 */}
      <div className="account-header">
        <h2>{account.accountName}</h2>
        <span className="account-number">{account.accountNumber}</span>
        <div className="balance">
          余额：{formatCurrency(account.balance, account.currency)}
        </div>
      </div>

      {/* 子标签页切换 */}
      <div className="detail-tabs">
        <Link to={`/accounts/${accountId}/transactions`}>交易明细</Link>
        <Link to={`/accounts/${accountId}/statements`}>对账单</Link>
        <Link to={`/accounts/${accountId}/settings`}>账户设置</Link>
      </div>

      {/* 三级嵌套：子路由渲染在这里 */}
      <Outlet />
    </div>
  )
}
```

## 3. 动态路由参数

### 3.1 useParams：路径参数

```tsx
// 路由定义
<Route path="accounts/:accountId/transactions/:txnId" element={<TxnDetail />} />

// 组件中获取
function TxnDetail() {
  // 参数类型安全（TypeScript）
  const { accountId, txnId } = useParams<{
    accountId: string
    txnId: string
  }>()

  const { transaction } = useTransaction(accountId!, txnId!)

  return (
    <div>
      <p>账户：{accountId}</p>
      <p>交易号：{txnId}</p>
      <p>金额：{transaction.amount}</p>
    </div>
  )
}
```

### 3.2 useSearchParams：查询参数

```tsx
// URL: /transfers?from=2026-01-01&to=2026-03-22&status=pending
function TransferHistory() {
  const [searchParams, setSearchParams] = useSearchParams()

  // 读取查询参数
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''
  const status = searchParams.get('status') ?? 'all'

  // 更新查询参数（不触发页面 reload）
  const handleStatusChange = (newStatus: string) => {
    setSearchParams(params => {
      params.set('status', newStatus)
      return params
    })
  }

  // 带时间范围筛选
  const handleDateRangeChange = (from: string, to: string) => {
    setSearchParams(params => {
      params.set('from', from)
      params.set('to', to)
      return params
    })
  }

  return (
    <div>
      {/* 筛选器 */}
      <select
        value={status}
        onChange={e => handleStatusChange(e.target.value)}
      >
        <option value="all">全部状态</option>
        <option value="pending">处理中</option>
        <option value="completed">已完成</option>
        <option value="failed">失败</option>
      </select>

      {/* 重置筛选 */}
      <button onClick={() => setSearchParams({})}>清除筛选</button>

      {/* 交易列表 */}
      <TransferList fromDate={fromDate} toDate={toDate} status={status} />
    </div>
  )
}
```

### 3.3 useLocation：路由状态传递

```tsx
// 从列表页跳转到详情页时，传递"上一页状态"
// 避免重新加载列表数据

// 列表页：跳转时传递 state
function TransferList() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleRowClick = (transfer: Transfer) => {
    // 传递当前位置和选中的转账记录
    navigate(`/transfers/${transfer.id}`, {
      state: {
        fromPath: location.pathname,
        transfer,
        scrollPosition: window.scrollY,
      }
    })
  }

  return (
    <table>
      {transfers.map(t => (
        <tr key={t.id} onClick={() => handleRowClick(t)}>
          <td>{t.id}</td>
          <td>{t.recipient}</td>
          <td>{formatCurrency(t.amount, t.currency)}</td>
        </tr>
      ))}
    </table>
  )
}

// 详情页：读取 state
function TransferDetail() {
  const { state } = useLocation()
  const navigate = useNavigate()

  // 如果直接访问 Deep Link，从 API 加载
  // 如果从列表页来，直接用 state（避免额外请求）
  const transfer = state?.transfer ?? useTransferFromAPI()

  // 返回列表页时，恢复滚动位置
  const handleBack = () => {
    if (state?.fromPath) {
      navigate(state.fromPath, { state: null }) // 清除 state，避免循环
      // 恢复滚动位置
      setTimeout(() => window.scrollTo(0, state.scrollPosition ?? 0), 0)
    } else {
      navigate('/transfers')
    }
  }

  return (
    <div>
      <button onClick={handleBack}>返回列表</button>
      {/* 详情内容 */}
    </div>
  )
}
```

## 4. 路由守卫：鉴权与权限

银行系统对安全性要求极高，路由守卫是保护敏感页面的核心机制。

### 4.1 AuthContext：全局鉴权状态

```tsx
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface User {
  id: string
  name: string
  roles: ('USER' | 'ADMIN' | 'AUDITOR')[]
  customerId: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  hasRole: (role: User['roles'][number]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 启动时从 sessionStorage 恢复登录状态
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('banking_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (credentials: LoginCredentials) => {
    // 调用银行 SSO（LDAP 或 OAuth2）
    const response = await authService.login(credentials)
    const userData: User = response.data
    setUser(userData)
    sessionStorage.setItem('banking_user', JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem('banking_user')
  }, [])

  const hasRole = useCallback((role: User['roles'][number]) => {
    return user?.roles.includes(role) ?? false
  }, [user])

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user,
      login, logout, hasRole
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

### 4.2 路由守卫组件

```tsx
// components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: ('USER' | 'ADMIN' | 'AUDITOR')[]
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth()
  const location = useLocation()

  // 未登录：重定向到登录页，携带 return URL
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  // 角色不足：重定向到 403 页面
  if (requiredRoles && !requiredRoles.some(role => hasRole(role))) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}

// 路由配置中使用
<Route
  path="/transfers"
  element={
    <ProtectedRoute requiredRoles={['USER', 'ADMIN']}>
      <Transfers />
    </ProtectedRoute>
  }
/>
```

### 4.3 登录页：返回原目标页面

```tsx
// pages/LoginPage.tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()

  // 从 Navigation 拿到 return URL
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const handleLogin = async (credentials: LoginCredentials) => {
    await login(credentials)
    // 登录成功后返回原目标页面
    navigate(from, { replace: true })
  }

  return (
    <div className="login-page">
      <h1>网上银行登录</h1>
      <form onSubmit={handleLogin}>
        {/* 登录表单 */}
      </form>
    </div>
  )
}
```

## 5. 懒加载与代码分割

### 5.1 React.lazy + Suspense

银行应用代码量大，首屏加载所有页面会造成白屏。通过 `React.lazy` 按需加载路由代码：

```tsx
// App.tsx
import { Suspense, lazy } from 'react'
import { Spinner } from './components/Spinner'

// 动态导入：路由组件分开打包
const BankLayout = lazy(() => import('./layouts/BankLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transfers = lazy(() => import('./pages/Transfers'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Investments = lazy(() => import('./pages/Investments'))

// Suspense：组件加载完成前的 fallback UI
function App() {
  return (
    <BrowserRouter>
      {/* 全局 Suspense：所有懒加载组件共享 */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<BankLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="investments" element={<Investments />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function PageLoader() {
  return (
    <div className="full-page-loader">
      <div className="spinner" />
      <p>加载中...</p>
    </div>
  )
}
```

### 5.2 Vite 打包分析

```typescript
// vite.config.ts
// 使用 rollup-plugin-visualizer 分析包体积
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/report.html',
      open: true,
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心 React
          'react-vendor': ['react', 'react-dom'],
          // React Router
          'router': ['react-router-dom'],
          // UI 组件库
          'antd': ['antd'],
          // 图表库
          'charts': ['echarts', '@ant-design/charts'],
        },
      },
    },
  },
})
```

### 5.3 路由级预加载

```tsx
// hooks/useRoutePrefetch.ts
// 鼠标悬停时预加载路由组件，用户点击时无需等待

import { lazy, Suspense } from 'react'

export function useRoutePrefetch(path: string) {
  const prefetch = () => {
    switch (path) {
      case '/transfers':
        import('./pages/Transfers')  // 触发加载
        break
      case '/accounts':
        import('./pages/Accounts')
        break
    }
  }

  return prefetch
}

// 在侧边栏 Link 中使用
function NavItem({ to, children }: { to: string; children: ReactNode }) {
  const prefetch = useRoutePrefetch(to)

  return (
    <Link to={to} onMouseEnter={prefetch}>
      {children}
    </Link>
  )
}
```

## 6. 编程式导航

### 6.1 useNavigate：编程控制路由

```tsx
function TransferForm() {
  const navigate = useNavigate()
  const { submitTransfer, loading } = useTransfer()

  const handleSubmit = async (data: TransferFormData) => {
    try {
      const result = await submitTransfer(data)

      // 提交成功后：跳转并携带结果 state
      navigate('/transfers', {
        state: {
          message: '转账申请已提交',
          transactionId: result.transactionId,
        },
        replace: false, // 加入历史记录（可返回）
      })
    } catch (error) {
      if (error.code === 'DAILY_LIMIT_EXCEEDED') {
        // 超过日限额：跳转到限额提升申请页
        navigate('/transfers/limit-increase')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 转账表单 */}
    </form>
  )
}
```

### 6.2 Navigate 组件：声明式重定向

```tsx
// 用于早期 return（条件不满足时）
function AccountDetail({ accountId }: { accountId: string }) {
  const { account, loading } = useAccount(accountId)

  if (loading) return <Loading />
  if (!account) return <Navigate to="/404" replace />
  if (!account.isActive) {
    return (
      <Navigate
        to="/accounts"
        state={{ error: 'ACCOUNT_INACTIVE' }}
        replace
      />
    )
  }

  return <AccountView account={account} />
}
```

### 6.3 重置表单后的导航

```tsx
// 导航时的状态管理最佳实践
const navigate = useNavigate()

// ❌ 问题：URL 变了，但页面状态残留
navigate('/transfers')

// ✅ 正确：每次访问都确保加载最新数据
navigate('/transfers', { replace: true })

// ✅ 带 key 的组件：强制重新创建（重置状态）
// 在父组件中：key={Date.now()} → 子组件重新 mount

// ✅ 推荐：数据获取组件监听 URL 变化自动刷新
function TransferList() {
  const { accountId } = useParams()

  // 依赖 accountId，变化时自动重新请求
  const { transfers, refetch } = useTransfers({ accountId })

  // 手动刷新
  const handleRefresh = () => refetch()

  return <List data={transfers} onRefresh={handleRefresh} />
}
```

## 7. 实战：银行转账完整路由设计

### 7.1 路由表设计

```tsx
// router/index.tsx
// 集中管理所有路由配置，便于权限控制和代码分割

import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'

// 懒加载页面
const LoginPage = lazy(() => import('../pages/LoginPage'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Transfers = lazy(() => import('../pages/Transfers'))
const TransferNew = lazy(() => import('../pages/TransferNew'))
const TransferConfirm = lazy(() => import('../pages/TransferConfirm'))
const TransferResult = lazy(() => import('../pages/TransferResult'))
const Accounts = lazy(() => import('../pages/Accounts'))
const AccountDetail = lazy(() => import('../pages/AccountDetail'))
const NotFound = lazy(() => import('../pages/NotFound'))

export const routes: RouteObject[] = [
  // 公开路由
  { path: '/login', element: <LoginPage /> },

  // 404
  { path: '/404', element: <NotFound /> },

  // 受保护路由
  {
    path: '/',
    element: (
      <ProtectedRoute requiredRoles={['USER', 'ADMIN']}>
        <BankLayout />
      </ProtectedRoute>
    ),
    children: [
      // 首页
      { index: true, element: <Dashboard /> },

      // 转账模块（嵌套路由）
      {
        path: 'transfers',
        children: [
          { index: true, element: <Transfers /> },
          { path: 'new', element: <TransferNew /> },
          { path: 'confirm', element: <TransferConfirm /> },
          { path: 'result/:txnId', element: <TransferResult /> },
        ],
      },

      // 账户模块
      {
        path: 'accounts',
        children: [
          { index: true, element: <Accounts /> },
          { path: ':accountId', element: <AccountDetail /> },
        ],
      },
    ],
  },

  // 兜底：所有未匹配
  { path: '*', element: <Navigate to="/404" replace /> },
]
```

### 7.2 路由过渡动画

```tsx
// components/RouteTransition.tsx
// 路由切换时的平滑过渡动画

import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

## 8. React Router v7 新变化与迁移

React Router v7 已发布，带来了一些值得关注的变化：

### 8.1 主要变化

```tsx
// v7 的数据层（Data Router）内置支持：
// loaders、actions、fetchers — 类似 Remix 的服务端数据获取

// v7 示例：loader 在路由层获取数据
import { data } from 'react-router-dom'

const transfersLoader = async () => {
  const transfers = await transferService.getList()
  return { transfers }
}

const TransferRoute = {
  path: 'transfers',
  loader: transfersLoader,
  Component: TransferListPage, // 新的 Component 替代 element
}

// 组件中直接用 useLoaderData 获取数据
function TransferListPage() {
  const { transfers } = useLoaderData<typeof transfersLoader>()
  return <TransferList data={transfers} />
}
```

### 8.2 迁移检查清单

```bash
# 迁移命令
npx react-router@latest codemod

# 手动迁移检查：
# 1. Routes children 现在必须是 Route 对象（不能混用其他组件）
# 2. <Navigate> → <Redirect>（v7 偏好）
# 3. useNavigate() 返回的 navigate 函数签名不变
# 4. <Outlet context> 完全兼容
# 5. loader/action 需要新的数据层架构（可选）
```

## 9. 常见问题与避坑

```bash
# 避坑 1：路由不匹配
# ❌ 错误：children 路由的 path 忘了父路径前缀
<Route path="/transfers">
  <Route path="confirm" element={<Confirm />} />  // 匹配 /transfers/confirm ✓
</Route>

# 避坑 2：Outlet 位置错误
# Outlet 必须放在父路由的 element 里，否则子路由无法渲染
# 错误：在 App 层放 Outlet → 子路由的 children 永远看不到

# 避坑 3：useParams 的参数名必须和 path 冒号名一致
// 路由：<Route path="accounts/:accountId" ...>
// 解构：useParams() → { accountId: string } ✓
# 解构：useParams() → { id: string }  ✗（拿不到值）

# 避坑 4：懒加载组件在 SSR 时需要特殊处理
# React.lazy + Suspense 在服务器端不支持
# 解决方案：服务端预加载关键路由

# 避坑 5：useNavigate 在 useEffect 中调用
# ❌ useNavigate() 必须在组件 render 周期内调用
# ✅ 正确
useEffect(() => {
  if (shouldRedirect) {
    navigate('/transfers')
  }
}, [shouldRedirect, navigate])

# 避坑 6：Deep Link 刷新 404
# BrowserRouter 部署到 Nginx 时：
location / {
  try_files $uri $uri/ /index.html;  # 关键配置
}
# 没有这个配置，直接访问 /transfers 会 404
```

---

*相关阅读：[React 与 TypeScript 深度集成实战](/coding/React/React与TypeScript深度集成实战) · [自定义 Hook 完全指南](/coding/React/自定义 Hook) · [条件渲染与列表渲染](/coding/React/条件渲染与列表渲染)*
