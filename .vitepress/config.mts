import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "panbo.space",
  description: "Coding && Thinking - 技术博客与思考记录",
  lang: 'zh-CN',

  // 主题配置
  themeConfig: {
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '思考', link: '/thinking/关于贫穷' },
      {
        text: '技术',
        items: [
          { text: 'Redis', link: '/coding/Redis/Redis 介绍和基本命令' },
          { text: 'MySQL', link: '/coding/MySQL/MySQL 介绍和基本命令' },
          { text: '架构心得', link: '/coding/架构心得/项目稳定性 -- 限流' }
        ]
      },
      { text: '关于', link: '/about' }
    ],

    // 侧边栏
    sidebar: [
      {
        text: '💭 思考',
        items: [
          { text: '关于贫穷', link: '/thinking/关于贫穷' }
        ]
      },
      {
        text: '💻 技术',
        collapsed: false,
        items: [
          {
            text: 'Redis',
            collapsed: true,
            items: [
              { text: 'Redis 介绍和基本命令', link: '/coding/Redis/Redis 介绍和基本命令' },
              { text: '五种基本数据类型', link: '/coding/Redis/Redis 五种基本数据类型' },
              { text: 'Redis 线程 IO 模型', link: '/coding/Redis/Redis 线程 IO 模型' },
              { text: 'Redis 过期策略', link: '/coding/Redis/Redis 过期策略' },
              { text: 'Redis 持久化', link: '/coding/Redis/Redis 持久化' },
              { text: 'Redis 复制', link: '/coding/Redis/Redis 复制' },
              { text: 'Redis 哨兵', link: '/coding/Redis/Redis 哨兵' },
              { text: 'Redis 集群', link: '/coding/Redis/Redis 集群' },
              { text: 'Redis 分布式锁', link: '/coding/Redis/Redis 实现分布式锁' },
              { text: 'Redis 消息队列', link: '/coding/Redis/Redis 实现消息队列' },
              { text: 'Redis 发布与订阅', link: '/coding/Redis/Redis 发布与订阅' },
              { text: 'Redis 位图', link: '/coding/Redis/Redis 位图' },
              { text: 'Redis HyperLogLog', link: '/coding/Redis/Redis HyperLogLog' },
              { text: 'Redis GeoHash', link: '/coding/Redis/GeoHash 算法' },
              { text: 'Redis Scan 命令', link: '/coding/Redis/Redis Scan 命令用法' },
              { text: 'Redis 限流', link: '/coding/Redis/Redis-Cell 限流模块' },
              { text: 'Redis BloomFilter', link: '/coding/Redis/Redis-BloomFilter（布隆过滤器）' },
              { text: 'Redis 使用规范', link: '/coding/Redis/Redis 使用规范' },
              { text: 'Redis 配置文件解析', link: '/coding/Redis/Redis 配置文件解析' }
            ]
          },
          {
            text: '架构心得',
            collapsed: true,
            items: [
              { text: '项目稳定性 -- 限流', link: '/coding/架构心得/项目稳定性 -- 限流' },
              { text: '项目稳定性 -- 幂等', link: '/coding/架构心得/项目稳定性 -- 幂等' },
              { text: '项目安全性 -- 鉴权和授权', link: '/coding/架构心得/项目安全性 -- 鉴权和授权' },
              { text: '项目可用性 -- 集群', link: '/coding/架构心得/项目可用性 -- 集群' }
            ]
          },
          {
            text: '汇丰银行',
            collapsed: false,
            items: [
              { text: '入职指南', link: '/coding/HSBC/汇丰入职指南' },
              { text: '技术参考', link: '/coding/HSBC/汇丰技术参考' },
              { text: '项目开发流程', link: '/coding/HSBC/汇丰项目开发流程' },
              { text: '内部工具与系统', link: '/coding/HSBC/汇丰内部工具与系统' },
              { text: '安全与合规实践', link: '/coding/HSBC/汇丰安全与合规实践' }
            ]
          }
        ]
      }
    ],

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hibernate-pano', ariaLabel: 'GitHub' },
      { icon: 'twitter', link: 'https://x.com/HibernatePano', ariaLabel: 'Twitter/X' }
    ],

    // 搜索
    search: {
      provider: 'local'
    },

    // 页脚
    footer: {
      message: '学而时习之，不亦说乎？',
      copyright: '© 2024 panbo.space. Built with VitePress.'
    },

    // Outline (右侧标题导航)
    outline: {
      level: [2, 3],
      label: '目录'
    },

    // 编辑链接
    editLink: {
      pattern: 'https://github.com/hibernate-pano/panbo.space/edit/main/:path',
      text: '在 GitHub 上编辑此页'
    }
  },

  // Vite 配置
  vite: {
    server: {
      host: '0.0.0.0'
    }
  }
})
