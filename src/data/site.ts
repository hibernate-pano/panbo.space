export const siteConfig = {
  name: 'panbo.space',
  title: 'Panbo Space',
  description: '程序员与思考者的内容花园，记录工程实践、工作现场与长期思考。',
  site: 'https://www.panbo.space',
  author: {
    name: 'Panbo',
    role: 'Senior Full-Stack Developer',
    company: 'HSBC',
  },
  social: {
    github: 'https://github.com/hibernate-pano',
    x: 'https://x.com/HibernatePano',
  },
  hero: {
    eyebrow: 'Programmer + Thinker',
    title: '把工程经验与长期思考写成可反复阅读的文章。',
    summary:
      '这里不做资讯流，不追热点。它更像一套持续演化的个人知识系统，记录银行级工程实践、技术判断，以及技术之外的思考。',
    primaryCta: {
      label: '开始阅读',
      href: '/archive',
    },
    secondaryCta: {
      label: '浏览主题',
      href: '/topics/java',
    },
  },
} as const
