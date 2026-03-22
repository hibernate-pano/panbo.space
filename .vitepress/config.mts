import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// https://vitepress.dev/reference/site-config
export default withMermaid({
  ignoreDeadLinks: true,
  title: "panbo.space",
  description: "Coding && Thinking - 技术博客与思考记录",
  lang: 'zh-CN',

  lastUpdated: true,

  mermaid: {},

  head: [
    ['meta', { name: 'author', content: 'Panbo' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'panbo.space' }],
    ['meta', { property: 'og:title', content: 'panbo.space' }],
    ['meta', { property: 'og:description', content: 'Coding && Thinking - 技术博客与思考记录' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@HibernatePano' }],
    ['meta', { name: 'twitter:creator', content: '@HibernatePano' }],
    ['link', { rel: 'canonical', href: 'https://www.panbo.space' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  themeConfig: {
    // 导航栏：精简，只保留核心入口
    nav: [
      { text: '首页', link: '/' },
      { text: '💭 思考', link: '/thinking/关于贫穷' },
      { text: '☦ 哲学', link: '/philosophy/尼采' },
      {
        text: '⌘ 技术',
        items: [
          { text: 'Java 后端', link: '/coding/Java/Java并发编程完全指南' },
          { text: '数据库 MySQL', link: '/coding/MySQL/MySQL索引完全指南' },
          { text: '缓存 Redis', link: '/coding/Redis/Redis 介绍和基本命令' },
          { text: '微服务 Spring Cloud', link: '/coding/SpringCloud/SpringCloud微服务入门完全指南' },
          { text: '前端 React', link: '/coding/React/React 入门系列课程' },
          { text: 'DevOps', link: '/coding/Docker/Docker快速入门完全指南' },
          { text: '安全合规', link: '/coding/安全/HashiCorp-Vault银行密钥管理实战' },
          { text: 'BigData', link: '/coding/BigData/大数据入门完全指南' }
        ]
      },
      { text: '🏦 HSBC', link: '/coding/HSBC/汇丰入职指南' },
      { text: '关于', link: '/about' }
    ],

    sidebar: [
      // ── 生活与思考 ──────────────────────────────────
      {
        text: '▸ 生活与思考',
        collapsed: false,
        items: [
          {
            text: '思考记录',
            collapsed: true,
            items: [
              { text: '关于贫穷', link: '/thinking/关于贫穷' },
              { text: '关于人际关系', link: '/thinking/关于人际关系' },
              { text: '关于学习', link: '/thinking/关于学习' },
              { text: '关于时间', link: '/thinking/关于时间' }
            ]
          },
          {
            text: '哲学专栏',
            collapsed: true,
            items: [
              { text: '尼采', link: '/philosophy/尼采' },
              { text: '叔本华', link: '/philosophy/叔本华' },
              { text: '叔本华与东方哲学', link: '/philosophy/叔本华与东方哲学' },
              { text: '存在的重量——自由、荒谬与责任', link: '/philosophy/存在的重量-自由-荒谬与责任' }
            ]
          }
        ]
      },

      // ── Java 后端 ──────────────────────────────────
      {
        text: '▸ Java 后端开发',
        collapsed: false,
        items: [
          { text: 'Java 并发编程完全指南', link: '/coding/Java/Java并发编程完全指南' },
          { text: 'Spring Boot 数据库连接池调优', link: '/coding/Java/SpringBoot数据库连接池调优' },
          { text: 'Spring Boot 参数校验与全局异常处理实战', link: '/coding/Java/SpringBoot参数校验与全局异常处理实战' },
          {
            text: '锁与并发控制',
            collapsed: true,
            items: [
              { text: 'synchronized 深入理解', link: '/coding/Java/锁与并发控制/synchronized深入理解' },
              { text: 'ReentrantLock 详解', link: '/coding/Java/锁与并发控制/ReentrantLock详解' },
              { text: '读写锁 ReadWriteLock', link: '/coding/Java/锁与并发控制/读写锁ReadWriteLock' },
              { text: 'Semaphore 信号量', link: '/coding/Java/锁与并发控制/Semaphore信号量' },
              { text: 'CountDownLatch 与 CyclicBarrier', link: '/coding/Java/锁与并发控制/CountDownLatch与CyclicBarrier' }
            ]
          },
          { text: 'JVM 虚拟机深入理解', link: '/coding/Java/JVM虚拟机深入理解' },
          { text: 'Java 集合框架深入理解', link: '/coding/Java/Java集合框架深入理解' }
        ]
      },

      // ── 数据库与缓存 ────────────────────────────────
      {
        text: '▸ 数据库与缓存',
        collapsed: false,
        items: [
          {
            text: 'MySQL',
            collapsed: true,
            items: [
              { text: 'MySQL 索引完全指南', link: '/coding/MySQL/MySQL索引完全指南' },
              { text: 'MySQL 事务与锁', link: '/coding/MySQL/MySQL事务与锁' },
              { text: 'MySQL SQL 优化实战', link: '/coding/MySQL/MySQLSQL优化实战' },
              { text: 'MySQL EXPLAIN 执行计划完全解析', link: '/coding/MySQL/MySQL-EXPLAIN执行计划完全解析' },
              { text: 'MySQL 主从复制与读写分离', link: '/coding/MySQL/MySQL主从复制与读写分离' }
            ]
          },
          {
            text: 'Redis',
            collapsed: true,
            items: [
              { text: 'Redis 介绍和基本命令', link: '/coding/Redis/Redis 介绍和基本命令' },
              { text: 'Redis 五种基本数据类型', link: '/coding/Redis/Redis 五种基本数据类型' },
              { text: 'Redis 线程 IO 模型', link: '/coding/Redis/Redis 线程 IO 模型' },
              { text: 'Redis 过期策略', link: '/coding/Redis/Redis 过期策略' },
              { text: 'Redis 实现分布式锁', link: '/coding/Redis/Redis 实现分布式锁' },
              { text: 'Redis 实现消息队列', link: '/coding/Redis/Redis 实现消息队列' },
              { text: 'Redis BloomFilter 布隆过滤器', link: '/coding/Redis/Redis-BloomFilter（布隆过滤器）' },
              { text: 'Redis Cell 限流模块', link: '/coding/Redis/Redis-Cell 限流模块' },
              { text: 'Redis GeoHash 地理位置', link: '/coding/Redis/Redis-GeoHash 地理位置模块' },
              { text: 'Redis HyperLogLog', link: '/coding/Redis/Redis HyperLogLog' },
              { text: 'Redis 位图', link: '/coding/Redis/Redis 位图' },
              { text: 'Redis 发布与订阅', link: '/coding/Redis/Redis 发布与订阅' },
              { text: 'Redis 配置文件解析', link: '/coding/Redis/Redis 配置文件解析' },
              { text: 'Redis Scan 命令用法', link: '/coding/Redis/Redis Scan 命令用法' },
              { text: 'Redis 使用规范', link: '/coding/Redis/Redis 使用规范' },
              { text: 'GeoHash 算法原理', link: '/coding/Redis/GeoHash 算法' }
            ]
          }
        ]
      },

      // ── 前端开发 ──────────────────────────────────
      {
        text: '▸ 前端开发',
        collapsed: false,
        items: [
          { text: 'React 入门系列课程', link: '/coding/React/React 入门系列课程' },
          {
            text: 'React 基础系列',
            collapsed: true,
            items: [
              { text: 'React 简介与环境搭建', link: '/coding/React/React 简介与环境搭建' },
              { text: 'JSX 语法完全指南', link: '/coding/React/JSX 语法完全指南' },
              { text: '组件化开发思想', link: '/coding/React/组件化开发思想' },
              { text: 'Props 与 State - 数据流动', link: '/coding/React/Props 与 State - 数据流动' },
              { text: 'useState 状态管理', link: '/coding/React/useState 状态管理' },
              { text: 'useEffect 副作用处理', link: '/coding/React/useEffect 副作用处理' },
              { text: '条件渲染与列表渲染', link: '/coding/React/条件渲染与列表渲染' },
              { text: '事件处理与状态更新', link: '/coding/React/事件处理与状态更新' },
              { text: '自定义 Hook', link: '/coding/React/自定义 Hook' }
            ]
          },
          { text: 'React Router v6 完全指南', link: '/coding/React/React-Router-v6完全指南-银行系统实战' },
          { text: 'React 与 TypeScript 深度集成实战', link: '/coding/React/React与TypeScript深度集成实战' },
          { text: 'TodoList 实战', link: '/coding/React/TodoList 实战' }
        ]
      },

      // ── 微服务与分布式 ─────────────────────────────
      {
        text: '▸ 微服务与分布式',
        collapsed: false,
        items: [
          {
            text: 'Spring Cloud 微服务',
            collapsed: true,
            items: [
              { text: 'Spring Cloud 微服务入门完全指南', link: '/coding/SpringCloud/SpringCloud微服务入门完全指南' },
              { text: 'Nacos 服务注册与配置中心实战', link: '/coding/SpringCloud/Nacos服务注册与配置中心-银行多环境实战' },
              { text: 'Spring Cloud Gateway 银行网关实战', link: '/coding/SpringCloud/SpringCloud-Gateway银行流量网关实战' }
            ]
          },
          {
            text: '分布式系统',
            collapsed: true,
            items: [
              { text: '分布式事务与 Saga 模式实战', link: '/coding/分布式系统/分布式事务与Saga模式实战' },
              { text: '分布式理论 CAP 与 BASE', link: '/coding/分布式系统/分布式理论-CAP与BASE' },
              { text: '分布式存储-数据分片与复制', link: '/coding/分布式系统/分布式存储-数据分片与复制' },
              { text: '分布式通信-RPC 与消息队列', link: '/coding/分布式系统/分布式通信-RPC与消息队列' },
              { text: 'RabbitMQ 消息队列银行实战', link: '/coding/分布式系统/RabbitMQ消息队列-银行实战选型指南' },
              { text: '服务治理-限流熔断与降级', link: '/coding/分布式系统/服务治理-限流熔断与降级' },
              { text: '分布式协调-ZooKeeper 实战', link: '/coding/分布式系统/分布式协调-ZooKeeper实战' },
              { text: '分布式计算-MapReduce 与 Spark 入门', link: '/coding/分布式系统/分布式计算-MapReduce与Spark入门' },
              { text: '分布式实战-构建分布式订单系统', link: '/coding/分布式系统/分布式实战-构建分布式订单系统' },
              { text: '分布式基础-从单机到分布式的跨越', link: '/coding/分布式系统/分布式基础-从单机到分布式的跨越' },
              { text: '分布式系统设计原则与最佳实践', link: '/coding/分布式系统/分布式系统设计原则与最佳实践' },
              { text: '分布式系统入门完全指南', link: '/coding/分布式系统/分布式系统入门完全指南' },
              { text: '分布式事务-2PC-TCC 与 Saga', link: '/coding/分布式系统/分布式事务-2PC-TCC与Saga' },
              { text: 'Seata 分布式事务实战', link: '/coding/分布式系统/Seata分布式事务实战-AT模式与TCC模式选型' },
              { text: 'SkyWalking APM 链路追踪实战', link: '/coding/分布式系统/SkyWalking银行APM链路追踪实战' }
            ]
          }
        ]
      },

      // ── 架构与工程 ────────────────────────────────
      {
        text: '▸ 架构与工程实践',
        collapsed: false,
        items: [
          { text: '领域驱动设计 DDD 在银行系统实战', link: '/coding/架构心得/领域驱动设计DDD在银行系统的实战' },
          { text: 'Spring Security 与 OAuth2 银行级安全', link: '/coding/架构心得/SpringSecurity与OAuth2银行级安全实战' },
          { text: '分布式系统可观测性实战', link: '/coding/架构心得/分布式系统可观测性实战' },
          { text: 'OpenTelemetry 银行可观测性实战', link: '/coding/工程实践/OpenTelemetry银行可观测性实战' },
          { text: 'Git 企业工作流与分支策略', link: '/coding/工程实践/Git企业工作流与分支策略-银行科技团队协作实践' },
          { text: 'REST API 版本管理策略', link: '/coding/工程实践/REST-API版本管理策略-银行系统演进实践' },
          { text: '银行科技 CI/CD 流水线设计', link: '/coding/架构心得/银行科技CI-CD流水线设计' },
          { text: '项目稳定性-限流方案全解析', link: '/coding/架构心得/项目稳定性-限流' },
          { text: '项目稳定性-幂等性设计', link: '/coding/架构心得/项目稳定性-幂等' },
          { text: '项目安全性-鉴权与授权体系', link: '/coding/架构心得/项目安全性-鉴权和授权' },
          { text: '项目可用性-集群高可用设计', link: '/coding/架构心得/项目可用性-集群' }
        ]
      },

      // ── DevOps 与云 ────────────────────────────────
      {
        text: '▸ DevOps 与云',
        collapsed: false,
        items: [
          { text: 'Docker 快速入门完全指南', link: '/coding/Docker/Docker快速入门完全指南' },
          { text: 'Docker 容器安全加固实战', link: '/coding/Docker/Docker容器安全加固-银行生产环境实战' },
          { text: 'Kubernetes 快速入门完全指南', link: '/coding/Kubernetes/Kubernetes快速入门完全指南' },
          { text: 'Kubernetes 监控与告警银行生产实战', link: '/coding/Kubernetes/Kubernetes监控与告警-银行生产实战' },
          { text: 'Kubernetes 探针与健康检查实战', link: '/coding/Kubernetes/Kubernetes探针与健康检查-SpringBoot Actuator集成' },
          { text: 'Kubernetes 网络与 Ingress 生产架构', link: '/coding/Kubernetes/Kubernetes网络与Ingress-银行K8s生产架构' },
          { text: 'GitOps ArgoCD 银行级部署实战', link: '/coding/DevOps/GitOps-ArgoCD银行级部署实战' },
          { text: 'Terraform 银行基础设施即代码实战', link: '/coding/DevOps/Terraform银行基础设施即代码实战' },
          { text: 'Istio Service Mesh 银行实战', link: '/coding/DevOps/Kubernetes-Istio银行ServiceMesh实战' }
        ]
      },

      // ── 安全与合规 ────────────────────────────────
      {
        text: '▸ 安全与合规',
        collapsed: false,
        items: [
          { text: 'HashiCorp Vault 银行密钥管理实战', link: '/coding/安全/HashiCorp-Vault银行密钥管理实战' },
          { text: '汇丰安全与合规实践', link: '/coding/HSBC/汇丰安全与合规实践' }
        ]
      },

      // ── BigData ──────────────────────────────────
      {
        text: '▸ BigData 大数据',
        collapsed: true,
        items: [
          { text: '大数据入门完全指南', link: '/coding/BigData/大数据入门完全指南' },
          { text: '大数据基础概念', link: '/coding/BigData/大数据基础概念' },
          { text: 'Hadoop HDFS 分布式文件系统', link: '/coding/BigData/Hadoop-HDFS-分布式文件系统' },
          { text: 'MapReduce 分布式计算', link: '/coding/BigData/MapReduce-分布式计算' },
          { text: 'Spark 内存计算', link: '/coding/BigData/Spark-内存计算' },
          { text: 'Hive 数据仓库', link: '/coding/BigData/Hive-数据仓库' },
          { text: 'Kafka 消息队列', link: '/coding/BigData/Kafka-消息队列' },
          { text: 'Flink 流处理', link: '/coding/BigData/Flink-流处理' },
          { text: '实战项目-用户行为分析平台', link: '/coding/BigData/实战项目-用户行为分析平台' }
        ]
      },

      // ── 银行科技 ──────────────────────────────────
      {
        text: '▸ 银行科技 HSBC',
        collapsed: false,
        items: [
          { text: '汇丰入职指南', link: '/coding/HSBC/汇丰入职指南' },
          { text: '汇丰业务线基本常识', link: '/coding/HSBC/汇丰业务线基本常识' },
          { text: '汇丰技术参考', link: '/coding/HSBC/汇丰技术参考' },
          { text: '汇丰 Senior Full-Stack 技术栈与思考', link: '/coding/HSBC/汇丰Senior-FullStack-Developer技术栈与思考' },
          { text: '汇丰项目开发流程', link: '/coding/HSBC/汇丰项目开发流程' },
          { text: '汇丰内部工具与系统', link: '/coding/HSBC/汇丰内部工具与系统' },
          {
            text: 'HSBC 业务线技术详解',
            collapsed: true,
            items: [
              { text: '零售银行及财富管理 RBWM', link: '/coding/HSBC/零售银行及财富管理RBWM技术详解' },
              { text: '工商金融业务 CMB', link: '/coding/HSBC/工商金融业务CMB技术详解' },
              { text: '环球银行及资本市场 GBM', link: '/coding/HSBC/环球银行及资本市场GBM技术详解' },
              { text: '保险业务技术详解', link: '/coding/HSBC/保险业务技术详解' },
              { text: '私人银行业务技术详解', link: '/coding/HSBC/私人银行业务技术详解' }
            ]
          },
          { text: '知识宫殿规划', link: '/coding/知识宫殿规划' }
        ]
      }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    footer: {
      message: '> 学而时习之，不亦说乎？',
      copyright: '© 2024-2026 panbo.space | Built with VitePress'
    },

    docFooter: {
      prev: '← 上一页',
      next: '下一页 →'
    },

    outline: {
      level: [2, 3],
      label: 'CONTENTS'
    },

    returnToTop: '↑ 返回顶部',

    editLink: {
      pattern: 'https://github.com/hibernate-pano/panbo.space/edit/main/:path',
      text: 'Edit on GitHub'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hibernate-pano', ariaLabel: 'GitHub' },
      { icon: 'twitter', link: 'https://x.com/HibernatePano', ariaLabel: 'Twitter/X' }
    ]
  },

  vite: {
    server: {
      host: '0.0.0.0'
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
    css: {
      codeSplit: true,
    },
  },
})
