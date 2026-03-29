---
title: React 与 TypeScript 深度集成实战
summary: >-
  React 的组件本质上是数据到 UI 的映射函数。这种函数式的本质天然适配 TypeScript
  的类型系统——输入（Props/State）有类型，输出（JSX）就能被类型检查覆盖。
publishedAt: '2026-03-19'
track: engineering
topic: React
tags: []
featured: false
draft: false
slug: react与typescript深度集成实战
legacyPaths:
  - /coding/React/React与TypeScript深度集成实战
---
> 从类型标注到类型守卫，构建类型安全的 React 应用

---

## 目录

1. [为什么 TypeScript 是 React 的最佳拍档](#1-为什么-typescript-是-react-的最佳拍档)
2. [Props 的类型标注：从简单到精确](#2-props-的类型标注从简单到精确)
3. [State 的类型推导：不要什么都写类型](#3-state-的类型推导不要什么都写类型)
4. [Discriminated Unions：复杂状态建模](#4-discriminated-unions复杂状态建模)
5. [泛型组件：构建可复用的类型安全组件](#5-泛型组件构建可复用的类型安全组件)
6. [自定义 Hooks 的类型安全](#6-自定义-hooks-的-type-safe)
7. [Event Handler 的类型处理](#7-event-handler-的类型处理)
8. [TanStack Query：类型安全的数据获取](#8-tanstack-query类型安全的数据获取)
9. [实战：构建一个类型安全的账户仪表盘](#9-实战构建一个类型安全的账户仪表盘)
10. [常见陷阱与最佳实践](#10-常见陷阱与最佳实践)

---

## 1. 为什么 TypeScript 是 React 的最佳拍档

React 的组件本质上是**数据到 UI 的映射函数**。这种函数式的本质天然适配 TypeScript 的类型系统——输入（Props/State）有类型，输出（JSX）就能被类型检查覆盖。

在实际开发中，TypeScript 给我带来最直接的几个好处：

- **重构时的心安**：改一个字段名，TypeScript 编译器告诉你所有受影响的地方
- **IDE 的精准提示**：处理复杂的嵌套数据（金融数据模型尤其常见），不用在代码和文档间来回切换
- **API 契约的显式化**：`interface` 就是组件与外部世界的"合同"，接口变更一目了然
- **运行时错误减少**：Props 类型校验前移到编译期，减少线上 `Cannot read property of undefined`

---

## 2. Props 的类型标注：从简单到精确

### 2.1 基础 Props 标注

```typescript
// ❌ 不好的方式：使用 any，失去了类型检查的意义
interface Props {
  title: any;
  onClick: any;
}

// ✅ 好的方式：精确标注每个字段
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

### 2.2 Props 中使用其他组件作为 children

金融系统常见的需求：将自定义布局组件作为 children 传入：

```typescript
// 精确描述 children 的类型
interface CardProps {
  title: string;
  children: React.ReactNode;  // 接受任何 React 可渲染内容
  footer?: React.ReactNode;    // 可选的页脚
  className?: string;
}

function Card({ title, children, footer, className }: CardProps) {
  return (
    <div className={`card ${className ?? ''}`}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// 使用示例
<Card
  title="账户余额"
  footer={<Button label="查看详情" onClick={() => {}} />}
>
  <BalanceDisplay amount={50000} currency="HKD" />
</Card>
```

### 2.3 组件作为 Props（Render Props / Slot Pattern）

```typescript
// 在复杂的金融仪表盘中，经常需要这种模式
// 允许多种渲染策略
interface TableColumn<T> {
  key: keyof T;
  title: string;
  render?: (value: T[keyof T], record: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (record: T) => void;
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  onRowClick
}: DataTableProps<T>) {
  if (loading) {
    return <div className="skeleton-rows">加载中...</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)} style={{ textAlign: col.align, width: col.width }}>
              {col.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length}>{emptyText}</td></tr>
        ) : (
          data.map((record, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(record)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map(col => (
                <td key={String(col.key)} style={{ textAlign: col.align }}>
                  {col.render
                    ? col.render(record[col.key], record)
                    : String(record[col.key])}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

// 使用泛型 DataTable
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

const columns: TableColumn<Transaction>[] = [
  { key: 'date', title: '日期', width: '120px' },
  { key: 'description', title: '描述' },
  {
    key: 'amount',
    title: '金额',
    align: 'right',
    render: (value, record) => (
      <span style={{ color: record.status === 'FAILED' ? 'red' : 'inherit' }}>
        {record.currency} {value.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'status',
    title: '状态',
    render: (value) => <StatusBadge status={value} />,
  },
];
```

---

## 3. State 的类型推导：不要什么都写类型

### 3.1 useState 的类型推导

TypeScript 能自动推导简单场景的类型，但显式标注有助于文档化和复杂场景的处理：

```typescript
// ✅ TypeScript 自动推导：简单场景不需要显式标注
const [count, setCount] = useState(0);  // count: number

// ✅ 需要显式标注的场景：联合类型
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

// ✅ 显式标注的对象状态
const [user, setUser] = useState<UserProfile | null>(null);

// ✅ 显式标注数组
const [items, setItems] = useState<MenuItem[]>([]);

// ❌ 不要用 any
const [data, setData] = useState<any>({});  // 丧失了类型安全
```

### 3.2 useReducer 的类型标注

复杂状态逻辑用 `useReducer` 配合 TypeScript 效果最好：

```typescript
// 用 interface 定义状态和 Action 的类型
interface PaymentState {
  amount: number;
  currency: string;
  recipient: string;
  status: 'draft' | 'validating' | 'confirming' | 'processing' | 'completed' | 'failed';
  error: string | null;
}

type PaymentAction =
  | { type: 'SET_AMOUNT'; payload: number }
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'SET_RECIPIENT'; payload: string }
  | { type: 'VALIDATE_START' }
  | { type: 'VALIDATE_SUCCESS' }
  | { type: 'VALIDATE_ERROR'; payload: string }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'RESET' };

const initialState: PaymentState = {
  amount: 0,
  currency: 'HKD',
  recipient: '',
  status: 'draft',
  error: null,
};

function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
  switch (action.type) {
    case 'SET_AMOUNT':
      return { ...state, amount: action.payload, status: 'draft', error: null };
    case 'VALIDATE_START':
      return { ...state, status: 'validating' };
    case 'VALIDATE_ERROR':
      return { ...state, status: 'failed', error: action.payload };
    case 'SUBMIT_SUCCESS':
      return { ...state, status: 'completed' };
    // ... 其他分支
    default:
      return state;
  }
}
```

---

## 4. Discriminated Unions：复杂状态建模

这是 TypeScript + React 中我认为**最重要的模式**。在 HSBC 开发金融仪表盘时，几乎每个涉及异步数据的组件都用这个模式。

### 4.1 问题：嵌套的 if-else 和 null 检查

```typescript
// ❌ 常见的"防御性编程"代码：层层判断，丑陋且易错
function AccountDashboard({ data, loading, error }: Props) {
  if (loading) {
    return <Skeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (data === null) {
    return <EmptyState />;
  }

  // 真正的业务渲染
  return (
    <div>
      <h1>{data.accountName}</h1>
      <p>{data.balance}</p>
      {/* ... */}
    </div>
  );
}
```

### 4.2 解法：Tagged Union（标签联合）

```typescript
// ✅ 用 tagged union 替代多个可选字段
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// 在组件中使用：TypeScript 会在每个分支中自动收窄类型
function AccountDashboard<T>(props: { state: AsyncState<T> }) {
  switch (props.state.status) {
    case 'idle':
      return <Placeholder />;

    case 'loading':
      return <Skeleton />;

    case 'error':
      // TypeScript 知道这里 state 是 { status: 'error'; error: Error }
      return <ErrorMessage message={props.state.error.message} />;

    case 'success':
      // TypeScript 知道这里 state 是 { status: 'success'; data: T }
      // data 的类型是 T，不需要额外检查
      return <Content data={props.state.data} />;
  }
}
```

### 4.3 实际案例：账户详情组件

```typescript
// 定义完整的数据类型
interface AccountInfo {
  accountNumber: string;
  accountName: string;
  balance: number;
  currency: Currency;
  accountType: 'SAVINGS' | 'CHECKING' | 'FIXED_DEPOSIT';
  openDate: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
}

interface TransactionSummary {
  recentTransactions: Transaction[];
  monthlyInflow: number;
  monthlyOutflow: number;
}

// 组合的异步状态
type AccountDashboardState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string; retry: () => void }
  | { state: 'success'; account: AccountInfo; transactions: TransactionSummary };

// 渲染组件
function AccountDashboardView({ state }: { state: AccountDashboardState }) {
  switch (state.state) {
    case 'idle':
      return <EnterAccountNumberPrompt />;

    case 'loading':
      return <LoadingSkeleton />;

    case 'error':
      return (
        <ErrorCard
          message={state.message}
          onRetry={state.retry}
        />
      );

    case 'success':
      return (
        <div className="dashboard">
          <AccountHeader account={state.account} />
          <BalanceCard
            balance={state.account.balance}
            currency={state.account.currency}
          />
          <RecentTransactions
            transactions={state.transactions.recentTransactions}
          />
          <MonthlySummary
            inflow={state.transactions.monthlyInflow}
            outflow={state.transactions.monthlyOutflow}
          />
        </div>
      );
  }
}
```

---

## 5. 泛型组件：构建可复用的类型安全组件

### 5.1 基础泛型组件

```typescript
// 一个支持任意类型列表的选择器组件
interface SelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface GenericSelectProps<T> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  labelKey?: keyof T;  // 当 T 是对象时，用于显示 label
  disabled?: boolean;
}

function GenericSelect<T>({
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
}: GenericSelectProps<T>) {
  return (
    <select
      value={value !== null ? String(value) : ''}
      onChange={(e) => {
        const selected = options.find(opt => String(opt.value) === e.target.value);
        onChange(selected?.value ?? null);
      }}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map((opt, idx) => (
        <option key={idx} value={String(opt.value)} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// 使用：账户类型选择
interface AccountType {
  code: 'SAVINGS' | 'CHECKING' | 'FIXED';
  name: string;
  minBalance: number;
}

const accountTypes: SelectOption<string>[] = [
  { value: 'SAVINGS', label: '储蓄账户' },
  { value: 'CHECKING', label: '支票账户' },
  { value: 'FIXED', label: '定期存款', disabled: true },
];

<GenericSelect
  options={accountTypes}
  value={selectedAccountType}
  onChange={setSelectedAccountType}
/>
```

### 5.2 Forward Ref 与泛型

当需要暴露 DOM 引用时，配合 `forwardRef` 使用：

```typescript
// 给需要聚焦的输入组件加 ref 支持
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="input-group">
        <label>{label}</label>
        <input ref={ref} {...props} className={error ? 'input-error' : ''} />
        {error && <span className="error-text">{error}</span>}
      </div>
    );
  }
);

// 显式设置 displayName（方便调试）
TextInput.displayName = 'TextInput';

// 使用 ref
function PaymentForm() {
  const accountRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    // TypeScript 知道 ref.current 是 HTMLInputElement
    if (!accountRef.current?.value) {
      accountRef.current.focus();  // 精准的类型提示和类型安全的调用
    }
  };

  return (
    <form>
      <TextInput
        ref={accountRef}
        label="收款账户"
        type="text"
        required
      />
    </form>
  );
}
```

---

## 6. 自定义 Hooks 的 Type Safe

自定义 Hooks 是 React 中的"类型安全重灾区"，处理不好会导致组件和 Hook 之间的类型脱节。

### 6.1 类型安全的 useLocalStorage

```typescript
// 泛型 + useSyncExternalStore 的组合
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;  // as const 保证返回的是只读元组
}

// 使用：TypeScript 自动推导类型
const [theme, setTheme] = useLocalStorage('theme', 'light');
// theme: string, setTheme: (value: string | ((val: string) => string)) => void

const [preferences, setPreferences] = useLocalStorage('prefs', {
  language: 'zh-CN',
  notifications: true,
});
// preferences: { language: string; notifications: boolean }
```

### 6.2 类型安全的 useAsync

```typescript
// 一个封装了 loading/error/success 状态的异步 Hook
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    setState({ status: 'pending' });

    asyncFn()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'success', data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state;
}

// 使用：获取账户信息
interface Account {
  id: string;
  name: string;
  balance: number;
}

const accountState = useAsync<Account[]>(
  () => api.getAccounts(),
  [accountId]
);

// accountState 的类型被自动推导为 AsyncState<Account[]>
// switch-case 分支中的 data/error 字段自动收窄类型
switch (accountState.status) {
  case 'success':
    console.log(accountState.data);  // Account[]
    break;
  case 'error':
    console.error(accountState.error.message);  // Error
    break;
}
```

---

## 7. Event Handler 的类型处理

### 7.1 常用 Event 类型速查

```typescript
// 表单事件
<form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {}}>
  <input
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {}}
    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {}}
    onFocus={(e: React.FocusEvent<HTMLInputElement>) => {}}
  />
  <textarea onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {}} />
  <select onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {}}>
    <option value="hkd">HKD</option>
  </select>
</form>

// 鼠标事件
<div onClick={(e: React.MouseEvent<HTMLDivElement>) => {}} />
<div onDoubleClick={(e: React.MouseEvent<HTMLDivElement>) => {}} />
<div onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => {}} />

// 键盘事件
<input
  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }}
/>

// 拖拽事件
<div
  draggable
  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', dragData);
  }}
  onDrop={(e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
  }}
/>
```

### 7.2 通用的 Form Handler

```typescript
// 用泛型函数处理表单字段更新
type FormState<T> = Partial<Record<keyof T, string>>;

function useForm<T extends Record<string, string>>(initialValues: T) {
  const [values, setValues] = useState<FormState<T>>(initialValues);

  const handleChange = useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues(prev => ({ ...prev, [field]: e.target.value }));
    },
    []
  );

  const reset = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  return { values, handleChange, setValues, reset };
}

// 使用：账户开户表单
interface AccountFormData {
  accountName: string;
  idNumber: string;
  email: string;
  phone: string;
  currency: string;
}

const { values, handleChange, reset } = useForm<AccountFormData>({
  accountName: '',
  idNumber: '',
  email: '',
  phone: '',
  currency: 'HKD',
});

// JSX 中的使用
<input
  name="accountName"
  value={values.accountName ?? ''}
  onChange={handleChange('accountName')}
/>
```

---

## 8. TanStack Query：类型安全的数据获取

TanStack Query（原 React Query）是我在 HSBC 项目中最常用的数据获取库。配合 TypeScript 使用，体验极佳。

### 8.1 类型安全的 queryFn

```typescript
// 定义 API 响应类型
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface Account {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
}

// 类型通过 generic 传递，queryFn 不需要返回类型注解
function useAccount(accountId: string) {
  return useQuery<ApiResponse<Account>, Error>({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const response = await fetch(`/api/accounts/${accountId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    // staleTime: 5分钟，数据在5分钟内不会重新发起请求
    staleTime: 5 * 60 * 1000,
    // enabled: 只有当 accountId 存在时才发起请求
    enabled: !!accountId,
  });
}

// 在组件中使用
function AccountCard({ accountId }: { accountId: string }) {
  const { data, isLoading, isError, error, refetch } = useAccount(accountId);

  if (isLoading) return <Skeleton />;

  if (isError) {
    return (
      <div>
        <p>加载失败: {error.message}</p>
        <Button label="重试" onClick={() => refetch()} />
      </div>
    );
  }

  // data.data 的类型是 Account（嵌套在 ApiResponse 中）
  const account = data!.data;

  return (
    <Card>
      <h3>{account.accountNumber}</h3>
      <p>{account.currency} {account.balance.toLocaleString()}</p>
    </Card>
  );
}
```

### 8.2 乐观更新与 TypeScript

```typescript
// TanStack Query 的乐观更新场景
function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<Account>,
    Error,
    { accountId: string; updates: Partial<Account> }
  >({
    mutationFn: async ({ accountId, updates }) => {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },

    onMutate: async ({ accountId, updates }) => {
      // 取消任何正在进行的同名 query
      await queryClient.cancelQueries({ queryKey: ['account', accountId] });

      // 保存旧值，用于回滚
      const previousAccount = queryClient.getQueryData<ApiResponse<Account>>(['account', accountId]);

      // 乐观更新：立即显示新值
      queryClient.setQueryData<ApiResponse<Account>>(['account', accountId], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: { ...old.data, ...updates },
        };
      });

      // 返回旧值以供 rollback 使用
      return { previousAccount };
    },

    onError: (err, { accountId }, context) => {
      // 出错时回滚
      if (context?.previousAccount) {
        queryClient.setQueryData(['account', accountId], context.previousAccount);
      }
    },

    onSettled: ({ accountId }) => {
      // 成功后重新验证，确保数据与服务器一致
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
    },
  });
}
```

---

## 9. 实战：构建一个类型安全的账户仪表盘

综合运用以上所有技术：

```typescript
// === types/financial.ts ===
export type Currency = 'HKD' | 'USD' | 'GBP' | 'EUR' | 'CNY';

export interface Money {
  amount: number;
  currency: Currency;
}

export interface Transaction {
  id: string;
  description: string;
  counterparty: string;
  amount: Money;
  timestamp: string;
  category: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface AccountSummary {
  accountId: string;
  accountNumber: string;
  accountName: string;
  balance: Money;
  availableBalance: Money;
  recentTransactions: Transaction[];
  monthlyStats: {
    inflow: Money;
    outflow: Money;
    transactionCount: number;
  };
}

// === hooks/useAccountSummary.ts ===
import { useQuery } from '@tanstack/react-query';
import type { AccountSummary } from '../types/financial';

interface UseAccountSummaryOptions {
  accountId: string | null;
  timeRange?: '7d' | '30d' | '90d';
}

export function useAccountSummary({ accountId, timeRange = '30d' }: UseAccountSummaryOptions) {
  return useQuery({
    queryKey: ['account-summary', accountId, timeRange],
    queryFn: async (): Promise<AccountSummary> => {
      const params = new URLSearchParams({ range: timeRange });
      const response = await fetch(`/api/accounts/${accountId}/summary?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const result = await response.json();
      if (result.code !== 0) throw new Error(result.message);
      return result.data;
    },
    enabled: !!accountId,
    staleTime: 60 * 1000, // 1分钟
  });
}

// === components/AccountDashboard.tsx ===
import { useAccountSummary } from '../hooks/useAccountSummary';

type DashboardState =
  | { status: 'no-account-selected' }
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; summary: AccountSummary };

function AccountDashboard({ accountId }: { accountId: string | null }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useAccountSummary({
    accountId,
  });

  const state: DashboardState = (() => {
    if (!accountId) return { status: 'no-account-selected' };
    if (isLoading) return { status: 'loading' };
    if (isError) return { status: 'error', message: error.message, onRetry: refetch };
    return { status: 'success', summary: data! };
  })();

  return (
    <div className="account-dashboard">
      {/* 全局 loading 指示器（不是首次加载的 loading） */}
      {isFetching && state.status !== 'loading' && <GlobalLoadingBar />}

      {(() => {
        switch (state.status) {
          case 'no-account-selected':
            return <EmptyState message="请选择一个账户" />;
          case 'loading':
            return <DashboardSkeleton />;
          case 'error':
            return <ErrorCard message={state.message} onRetry={state.onRetry} />;
          case 'success':
            return <DashboardContent summary={state.summary} />;
        }
      })()}
    </div>
  );
}
```

---

## 10. 常见陷阱与最佳实践

### 10.1 不要用 `as` 做类型断言

```typescript
// ❌ as 断言是"强制说服" TypeScript，掩盖了问题
const data = response.data as Account;

// ✅ 用类型守卫或条件检查
const data: Account | null = response.data;
if (!data) return null;  // 让逻辑分支来处理 null 的情况
```

### 10.2 Props 不要过度设计

```typescript
// ❌ 过度设计：很多接口字段永远不会被用到
interface CardProps {
  title: string;
  subtitle?: string;
  description?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
  onHover?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  dataTestId?: string;
}

// ✅ 够用就好：只定义实际使用的字段
interface CardProps {
  title: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
```

### 10.3 用 `zod` 做运行时验证（API 响应校验）

前端 TypeScript 只做编译期检查，API 返回的数据是"不可信"的：

```typescript
import { z } from 'zod';

const MoneySchema = z.object({
  amount: z.number(),
  currency: z.enum(['HKD', 'USD', 'GBP', 'EUR', 'CNY']),
});

const AccountSchema = z.object({
  accountId: z.string().uuid(),
  accountNumber: z.string().length(12), // 香港银行账户12位
  balance: MoneySchema,
  status: z.enum(['ACTIVE', 'FROZEN', 'CLOSED']),
});

// API 响应验证
const result = AccountSchema.safeParse(apiResponse.data);
if (!result.success) {
  // 有数据不符合预期结构，记录日志并降级处理
  logger.error('API response validation failed', result.error.flatten());
  throw new Error('Invalid data from API');
}

const account = result.data;  // TypeScript 知道这里 account 是 Account 类型
```

### 10.4 TypeScript 配置建议

```json
// tsconfig.json — 生产环境推荐配置
{
  "compilerOptions": {
    "strict": true,              // 开启所有严格类型检查
    "noImplicitAny": true,        // 禁止隐式 any
    "strictNullChecks": true,     // 严格 null 检查
    "noUnusedLocals": true,       // 不允许未使用的局部变量
    "noUnusedParameters": true,  // 不允许未使用的参数
    "exactOptionalPropertyTypes": true, // 可选属性的类型更精确
    "jsx": "react-jsx"
  }
}
```

---

## 结语

React + TypeScript 的组合，本质上是**让类型系统在运行时之前就发现错误**。在金融系统的开发中，这种"早发现、早修复"的能力尤为重要——每一笔资金交易都不能容忍运行时类型错误。

核心原则就三条：

1. **精确优于宽泛**：用 `string` 而不用 `any`，用 `union type` 而不用 `object`
2. **让 TypeScript 收窄类型**：多用 `switch`/`if` 的分支收窄，少用 `as` 强制断言
3. **类型即文档**：好的类型标注本身就是最好的代码注释

*Bobot 🦐 | 汇丰科技园 | 2026-03-19*
