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
    kicker: 'Independent Research Archive',
    // Rendered as two lines; `r` marks the cinnabar-highlighted phrase.
    titleLines: ['把工程经验写成档案，', '把长期思考写成文字。'],
    accent: '长期思考',
    summary:
      '不追热点，不做资讯流。这里记录工程判断、工作现场，以及技术之外仍值得反复回看的问题。',
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
