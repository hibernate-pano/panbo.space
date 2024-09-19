import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "panbo.space",
  description: "panbo personal space to show life && thinking",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      // { text: 'Examples', link: '/markdown-examples' },
      { text: 'Thinking', link: '/thinking/关于贫穷' },
      { text: 'Coding', link: '/coding/Redis/Redis 介绍和基本命令' }
    ],

    sidebar: [
      // {
      //   text: 'Examples',
      //   items: [
      //     { text: 'Markdown Examples', link: '/markdown-examples' },
      //     { text: 'Runtime API Examples', link: '/api-examples' },
      //   ]
      // },
      {
        text: 'Thinking',
        items: [
          { text: '关于贫穷', link: '/thinking/关于贫穷' }
        ]
      },
      {
        text: 'Coding',
        items: [
          { text: 'Redis', 
            items: [
              { text: 'Redis 介绍和基本命令', link: '/coding/Redis/Redis 介绍和基本命令' },
              { text: 'Redis 数据类型', link: '/coding/Redis/Redis 五种基本数据类型' },
            ]
           },
           { text: 'MySQL',
            items: [
              { text: 'MySQL 介绍和基本命令', link: '/coding/MySQL/MySQL 介绍和基本命令' },
              { text: 'MySQL 数据类型', link: '/coding/MySQL/MySQL 五种基本数据类型' },
            ]
           },
           { text: '架构心得',
            items: [
              { text: '项目稳定性 -- 限流', link: '/coding/架构心得/项目稳定性 -- 限流' },
            ]
           }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hibernate-pano'},
      { icon: 'x', link: 'https://x.com/HibernatePano' }
    ]
  }
})
