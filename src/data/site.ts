export const siteConfig = {
  name: 'panbo.space',
  title: 'Panbo Space',
  description: '程序员与思考者的内容档案。记录工程实践、技术判断与长期思考。',
  site: 'https://www.panbo.space',
  author: {
    name: 'Panbo',
    role: 'Senior Full-Stack Engineer',
    company: 'HSBC',
  },
  social: {
    github: 'https://github.com/hibernate-pano',
    x: 'https://x.com/HibernatePano',
  },
  hero: {
    eyebrow: 'Independent Research Archive',
    title: '把工程经验写成档案，把长期思考写成文字。',
    summary:
      '不追热点，不做资讯流。这里是一套持续演化的个人知识系统——关于银行系统、分布式架构、技术判断，以及技术之外的思考。',
    primaryCta: {
      label: '浏览全部',
      href: '/archive',
    },
    secondaryCta: {
      label: '了解更多',
      href: '/about',
    },
  },
} as const
