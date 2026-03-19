import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// https://vitepress.dev/reference/site-config
export default withMermaid({
  ignoreDeadLinks: true,
  title: "panbo.space",
  description: "Coding && Thinking - 技术博客与思考记录",
  lang: 'zh-CN',

  // 最后更新时间
  lastUpdated: true,

  // Mermaid 配置
  mermaid: {
    // Mermaid 配置
  },

  // 主题配置
  themeConfig: {
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '💭 思考', link: '/thinking/关于贫穷' },
      { text: '☦ 哲学', link: '/philosophy/尼采' },
      {
        text: '⌘ 技术导航',
        items: [
          { text: 'Java 并发', link: '/coding/Java/Java并发编程完全指南' },
          { text: 'MySQL', link: '/coding/MySQL/MySQL索引完全指南' },
          { text: 'Redis', link: '/coding/Redis/Redis 介绍和基本命令' },
          { text: 'Spring Cloud', link: '/coding/SpringCloud/SpringCloud微服务入门完全指南' },
          { text: 'Docker', link: '/coding/Docker/Docker快速入门完全指南' },
          { text: 'K8s', link: '/coding/Kubernetes/Kubernetes快速入门完全指南' }
        ]
      },
      { text: '🏦 HSBC', link: '/coding/HSBC/汇丰入职指南' },
      { text: '关于', link: '/about' }
    ],

    // 侧边栏 - 极客风格
    sidebar: [
      {
        text: '▸ 思考记录',
        collapsed: false,
        items: [
          { text: '关于贫穷', link: '/thinking/关于贫穷' },
          { text: '关于人际关系', link: '/thinking/关于人际关系' },
          { text: '关于学习', link: '/thinking/关于学习' },
          { text: '关于时间', link: '/thinking/关于时间' }
        ]
      },
      {
        text: '▸ 哲学专栏',
        collapsed: false,
        items: [
          { text: '尼采', link: '/philosophy/尼采' },
          { text: '叔本华', link: '/philosophy/叔本华' },
          { text: '叔本华与东方哲学', link: '/philosophy/叔本华与东方哲学' },
          { text: '存在的重量——自由、荒谬与责任', link: '/philosophy/存在的重量-自由-荒谬与责任' }
        ]
      },
      {
        text: '▸ Java 开发',
        collapsed: false,
        items: [
          { text: 'Java 并发编程', link: '/coding/Java/Java并发编程完全指南' },
          { text: 'Spring Boot 连接池调优', link: '/coding/Java/SpringBoot数据库连接池调优' },
          {
            text: '锁与并发控制',
            collapsed: true,
            items: [
              { text: 'synchronized 深入理解', link: '/coding/Java/锁与并发控制/synchronized深入理解' },
              { text: 'ReentrantLock 详解', link: '/coding/Java/锁与并发控制/ReentrantLock详解' },
              { text: '读写锁 ReadWriteLock', link: '/coding/Java/锁与并发控制/读写锁ReadWriteLock' },
              { text: 'Semaphore 信号量', link: '/coding/Java/锁与并发控制/Semaphore信号量' },
              { text: 'CountDownLatch', link: '/coding/Java/锁与并发控制/CountDownLatch与CyclicBarrier' }
            ]
          }
        ]
      },
      {
        text: '▸ 前端开发',
        collapsed: false,
        items: [
          { text: 'React 系列课程', link: '/coding/React/React 入门系列课程' },
          { text: 'React + TypeScript 深度集成', link: '/coding/React/React与TypeScript深度集成实战' },
          {
            text: 'React 基础',
            collapsed: true,
            items: [
              { text: 'React 简介', link: '/coding/React/React 简介与环境搭建' },
              { text: 'JSX 语法', link: '/coding/React/JSX 语法完全指南' },
              { text: '组件化开发', link: '/coding/React/组件化开发思想' },
              { text: 'Props 与 State', link: '/coding/React/Props 与 State - 数据流动' },
              { text: 'useState 状态管理', link: '/coding/React/useState 状态管理' },
              { text: 'useEffect 副作用', link: '/coding/React/useEffect 副作用处理' }
            ]
          }
        ]
      },
      {
        text: '▸ 数据库',
        collapsed: false,
        items: [
          {
            text: 'MySQL',
            collapsed: true,
            items: [
              { text: 'MySQL 索引完全指南', link: '/coding/MySQL/MySQL索引完全指南' },
              { text: 'MySQL 事务与锁', link: '/coding/MySQL/MySQL事务与锁' },
              { text: 'MySQL SQL 优化实战', link: '/coding/MySQL/MySQLSQL优化实战' },
              { text: 'MySQL 主从复制', link: '/coding/MySQL/MySQL主从复制与读写分离' }
            ]
          },
          {
            text: 'Redis',
            collapsed: true,
            items: [
              { text: 'Redis 介绍', link: '/coding/Redis/Redis 介绍和基本命令' },
              { text: '五种基本数据类型', link: '/coding/Redis/Redis 五种基本数据类型' },
              { text: 'Redis 线程 IO 模型', link: '/coding/Redis/Redis 线程 IO 模型' },
              { text: 'Redis 过期策略', link: '/coding/Redis/Redis 过期策略' },
              { text: 'Redis 分布式锁', link: '/coding/Redis/Redis 实现分布式锁' },
              { text: 'Redis 消息队列', link: '/coding/Redis/Redis 实现消息队列' }
            ]
          }
        ]
      },
      {
        text: '▸ 架构设计',
        collapsed: false,
        items: [
          {
            text: '微服务',
            collapsed: true,
            items: [
              { text: 'Spring Cloud 完全指南', link: '/coding/SpringCloud/SpringCloud微服务入门完全指南' }
            ]
          },
          {
            text: '分布式系统',
            collapsed: true,
            items: [
              { text: '分布式理论 CAP/BASE', link: '/coding/分布式系统/分布式理论-CAP与BASE' },
              { text: '数据分片与复制', link: '/coding/分布式系统/分布式存储-数据分片与复制' },
              { text: 'RPC 与微服务', link: '/coding/分布式系统/分布式通信-RPC与消息队列' }
            ]
          },
          {
            text: '架构心得',
            collapsed: true,
            items: [
              { text: 'Spring Security + OAuth 2.0', link: '/coding/架构心得/SpringSecurity与OAuth2银行级安全实战' },
              { text: '分布式系统可观测性', link: '/coding/架构心得/分布式系统可观测性实战' },
              { text: '银行科技 CI/CD 流水线', link: '/coding/架构心得/银行科技CI-CD流水线设计' },
              { text: '限流', link: '/coding/架构心得/项目稳定性-限流' },
              { text: '幂等', link: '/coding/架构心得/项目稳定性-幂等' },
              { text: '鉴权与授权', link: '/coding/架构心得/项目安全性-鉴权和授权' },
              { text: '集群高可用', link: '/coding/架构心得/项目可用性-集群' }
            ]
          }
        ]
      },
      {
        text: '▸ DevOps',
        collapsed: false,
        items: [
          { text: 'Docker 完全指南', link: '/coding/Docker/Docker快速入门完全指南' },
          { text: 'Kubernetes 完全指南', link: '/coding/Kubernetes/Kubernetes快速入门完全指南' }
        ]
      },
      {
        text: '▸ 银行科技',
        collapsed: false,
        items: [
          { text: '汇丰入职指南', link: '/coding/HSBC/汇丰入职指南' },
          { text: '汇丰业务线常识', link: '/coding/HSBC/汇丰业务线基本常识' },
          { text: '汇丰技术参考', link: '/coding/HSBC/汇丰技术参考' },
          { text: '汇丰技术栈与思考', link: '/coding/HSBC/汇丰Senior-FullStack-Developer技术栈与思考' },
          { text: '汇丰项目开发流程', link: '/coding/HSBC/汇丰项目开发流程' }
        ]
      },
      {
        text: '▸ 知识宫殿',
        collapsed: false,
        items: [
          { text: '规划', link: '/coding/知识宫殿规划' }
        ]
      }
    ],

    // 搜索
    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    // 页脚
    footer: {
      message: '> 学而时习之，不亦说乎？',
      copyright: '© 2024-2026 panbo.space | Built with VitePress'
    },

    // 文档底部 prev/next 链接
    docFooter: {
      prev: '← 上一页',
      next: '下一页 →'
    },

    // Outline (右侧标题导航)
    outline: {
      level: [2, 3],
      label: 'CONTENTS'
    },

    // 返回顶部
    returnToTop: '↑ 返回顶部',

    // 编辑链接
    editLink: {
      pattern: 'https://github.com/hibernate-pano/panbo.space/edit/main/:path',
      text: 'Edit on GitHub'
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hibernate-pano', ariaLabel: 'GitHub' },
      { icon: 'twitter', link: 'https://x.com/HibernatePano', ariaLabel: 'Twitter/X' }
    ],

    // 顶部赞助/宣传
    // headline: {
    //   text: '🚀 技术博客更新中...',
    //   link: '/coding/知识宫殿规划'
    // }
  },

  // Vite 配置
  vite: {
    server: {
      host: '0.0.0.0'
    }
  }
})
