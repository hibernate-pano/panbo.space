# Spring Cloud 微服务入门完全指南

> 构建分布式系统的完整技术栈

---

## 1. 为什么需要微服务？

### 1.1 单体架构 vs 微服务

```
单体架构：
┌─────────────────────────────────────┐
│           电商系统                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │用户 │ │订单 │ │商品 │ │支付 │  │
│  │服务 │ │服务 │ │服务 │ │服务 │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│           │                          │
│        数据库                          │
└─────────────────────────────────────┘

微服务架构：
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│用户服务  │ │订单服务  │ │商品服务  │ │支付服务  │
│  (独立)  │ │ (独立)  │ │ (独立)  │ │ (独立)  │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │            │            │            │
┌────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
│用户库   │ │订单库   │ │商品库   │ │支付库   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 1.2 微服务优缺点

| 优点 | 缺点 |
|------|------|
| 独立部署 | 复杂度高 |
| 技术灵活 | 运维成本高 |
| 容错性好 | 数据一致性难 |
| 扩展方便 | 分布式事务 |

---

## 2. Spring Cloud 核心组件

### 2.1 组件一览

```
┌─────────────────────────────────────────────────────────────┐
│                    Spring Cloud 生态                          │
├─────────────────────────────────────────────────────────────┤
│  服务注册/发现    │ Eureka / Nacos / Consul                  │
│  配置管理        │ Spring Cloud Config / Nacos               │
│  负载均衡        │ Ribbon / LoadBalancer                    │
│  熔断降级        │ Hystrix / Sentinel / Resilience4j         │
│  网关            │ Spring Cloud Gateway / Zuul              │
│  分布式事务      │ Seata                                     │
│  链路追踪        │ Sleuth / Zipkin / SkyWalking             │
│  消息驱动        │ Stream / RocketMQ / Kafka                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 服务注册与发现

### 3.1 Nacos 注册中心

```yaml
# provider 服务提供者
server:
  port: 8080

spring:
  application:
    name: user-service
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848  # Nacos 地址
        namespace: dev
```

```java
@SpringBootApplication
@EnableDiscoveryClient  // 开启服务发现
public class ProviderApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProviderApplication.class, args);
    }
}
```

### 3.2 服务调用

```java
// 服务消费者
@org.springframework.cloud.client.loadbalancer.LoadBalanced
@RestTemplate restTemplate;

public User getUser(Long id) {
    // 通过服务名调用
    return restTemplate.getForObject(
        "http://user-service/users/" + id, 
        User.class
    );
}
```

---

## 4. 配置中心

### 4.1 Nacos 配置中心

```yaml
spring:
  cloud:
    nacos:
      config:
        server-addr: 127.0.0.1:8848
        file-extension: yaml
        namespace: dev
        group: DEFAULT_GROUP
```

```java
@RestController
@RefreshScope  // 支持配置动态刷新
public class ConfigController {
    
    @Value("${app.name}")
    private String appName;
    
    @GetMapping("/config")
    public String getConfig() {
        return appName;
    }
}
```

### 4.2 配置管理

```
Nacos 配置：
├── dev/application-dev.yaml     # 开发环境
├── prod/application-prod.yaml  # 生产环境
└── DEFAULT_GROUP/application.yaml  # 默认配置
```

---

## 5. 负载均衡

### 5.1 Ribbon vs LoadBalancer

```java
// Ribbon（已停止维护）
@RibbonClient(name = "user-service")
public class RibbonConfig {}

// Spring Cloud LoadBalancer（推荐）
@Configuration
public class LoadBalancerConfig {
    @Bean
    public ServiceInstanceListSupplier serviceInstanceListSupplier() {
        return ServiceInstanceListSupplier.builder()
            .withDiscoveryClient()
            .build();
    }
}
```

### 5.2 负载均衡策略

| 策略 | 说明 |
|------|------|
| Random | 随机 |
| RoundRobin | 轮询 |
| WeightedResponseTime | 响应时间加权 |
| BestAvailable | 最空闲 |

---

## 6. 熔断降级

### 6.1 Sentinel 熔断

```java
// 限流
@SentinelResource(value = "getUser", blockHandler = "blockHandler")
public User getUser(Long id) {
    return userService.getById(id);
}

// 降级处理
public User blockHandler(Long id, BlockException e) {
    return User.builder().name("服务繁忙").build();
}
```

### 6.2 熔断器状态

```
┌─────────┐    失败率过高     ┌─────────┐
│ Closed  │ ──────────────▶ │  Open   │
│ (关闭)  │                  │ (打开)  │
└─────────┘                  └────┬────┘
     ▲                              │
     │    探测成功                   │
     └──────────────────────────────┘
              ┌─────────┐
              │ Half-Open│
              │ (半开)   │
              └─────────┘
```

---

## 7. 网关

### 7.1 Spring Cloud Gateway

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/user/**
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/order/**
```

### 7.2 过滤器

```java
@Component
public class AuthFilter implements GlobalFilter {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, 
                             GatewayFilterChain chain) {
        String token = exchange.getRequest().getHeaders()
            .getFirst("Authorization");
        
        if (StringUtils.isEmpty(token)) {
            exchange.getResponse().setStatusCode(
                HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        
        return chain.filter(exchange);
    }
}
```

---

## 8. 分布式事务

### 8.1 Seata 架构

```
┌─────────────────────────────────────────────────┐
│                   Seata Server                    │
│  ┌──────────────────────────────────────────┐  │
│  │           Transaction Coordinator (TC)    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         ▲                    ▲
         │                    │
    ┌────┴────┐         ┌────┴────┐
    │ TM (事务管理器) │         │ TM      │
    │   发起方     │         │  参与方  │
    └────┬────┘         └────┬────┘
         │                    │
    ┌────┴────┐         ┌────┴────┐
    │  RM    │         │   RM    │
    │ (资源) │         │  (资源)  │
    └─────────┘         └─────────┘
```

### 8.2 AT 模式

```java
@GlobalTransactional  // 开启分布式事务
public void placeOrder(OrderDTO order) {
    // 1. 扣库存
    productService.reduceStock(order.getProductId(), order.getCount());
    
    // 2. 创建订单
    orderService.create(order);
    
    // 3. 扣余额
    accountService.reduceBalance(order.getUserId(), order.getMoney());
}
```

---

## 9. 链路追踪

### 9.1 Sleuth + Zipkin

```yaml
spring:
  sleuth:
    sampler:
      probability: 1  # 采样率
  zipkin:
    base-url: http://localhost:9411
```

### 9.2 追踪流程

```
请求进入 Gateway
    │
    ▼
Gateway (Span: gateway)
    │
    ▼
User Service (Span: user-service)
    │
    ├──▶ Order Service (Span: order-service)
    │        │
    │        ▼
    │    Product Service (Span: product-service)
    │
    └──▶ Account Service (Span: account-service)
```

---

## 10. 总结

| 组件 | 作用 | 替代方案 |
|------|------|----------|
| Nacos | 注册/配置 | Eureka, Consul |
| Gateway | 网关 | Zuul |
| Sentinel | 熔断 | Hystrix |
| Seata | 事务 | - |
| Sleuth | 链路 | SkyWalking |

---

> 📚 续篇：《Docker 快速入门》
