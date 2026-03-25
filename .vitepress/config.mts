import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { defineConfig, type DefaultTheme } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

type SectionKey = 'coding' | 'thinking' | 'philosophy'

type PostMeta = {
  title: string
  path: string
  sectionKey: SectionKey
  sectionLabel: string
  groupKey: string
  groupLabel: string
  excerpt: string
  updatedAt: string | null
  commitShort: string | null
  featured: boolean
  homeHidden: boolean
}

const ROOT = process.cwd()

const SECTION_LABELS: Record<SectionKey, string> = {
  coding: '技术',
  thinking: '思考',
  philosophy: '哲学',
}

const CODING_GROUP_ORDER = [
  '架构心得',
  '工程实践',
  'Java',
  'MySQL',
  'Redis',
  'React',
  'SpringCloud',
  '分布式系统',
  'Docker',
  'Kubernetes',
  'DevOps',
  '安全',
  'BigData',
  'HSBC',
]

const TOP_LEVEL_ORDER: Record<string, number> = Object.fromEntries(
  CODING_GROUP_ORDER.map((name, index) => [name, index]),
)

const FEATURED_PATHS = new Set([
  '/coding/架构心得/领域驱动设计DDD在银行系统的实战',
  '/coding/Java/Java并发编程完全指南',
  '/coding/分布式系统/分布式系统设计原则与最佳实践',
  '/thinking/关于学习',
  '/philosophy/存在的重量-自由-荒谬与责任',
])

const EXCLUDED_FILES = new Set([
  'index.md',
  'about.md',
  'markdown-examples.md',
  'api-examples.md',
])

function walkMarkdownFiles(dir: string): string[] {
  const entries = readdirSync(join(ROOT, dir), { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const rel = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(rel))
      continue
    }
    if (!entry.name.endsWith('.md') || EXCLUDED_FILES.has(entry.name)) continue
    files.push(rel)
  }

  return files
}

function parseFrontmatter(raw: string): { data: Record<string, string | boolean>; content: string } {
  if (!raw.startsWith('---\n')) {
    return { data: {}, content: raw }
  }

  const end = raw.indexOf('\n---\n', 4)
  if (end === -1) {
    return { data: {}, content: raw }
  }

  const data: Record<string, string | boolean> = {}
  const block = raw.slice(4, end)
  const content = raw.slice(end + 5)

  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([\w-]+):\s*(.*)$/)
    if (!match) continue

    const key = match[1]
    let value = match[2].trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (value === 'true' || value === 'false') {
      data[key] = value === 'true'
      continue
    }

    data[key] = value
  }

  return { data, content }
}

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractExcerpt(content: string): string {
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (
      line.startsWith('#') ||
      line.startsWith('>') ||
      line.startsWith('-') ||
      line.startsWith('*') ||
      line.startsWith('|') ||
      line.startsWith('<') ||
      line.startsWith('```') ||
      /^\d+\./.test(line)
    ) {
      continue
    }

    const cleaned = cleanInlineMarkdown(line)
    if (!cleaned) continue
    return cleaned.length > 96 ? `${cleaned.slice(0, 96).trim()}…` : cleaned
  }

  return '持续记录技术实践、系统设计与长期思考。'
}

const gitCache = new Map<string, { updatedAt: string | null; commitShort: string | null }>()

function getGitMeta(file: string): { updatedAt: string | null; commitShort: string | null } {
  const cached = gitCache.get(file)
  if (cached) return cached

  try {
    const rel = relative(ROOT, join(ROOT, file)).split(sep).join('/')
    const output = execSync(`git log -1 --format=%cs|%h -- ${JSON.stringify(rel)}`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()

    const [updatedAt, commitShort] = output.split('|')
    const meta = {
      updatedAt: updatedAt || null,
      commitShort: commitShort || null,
    }
    gitCache.set(file, meta)
    return meta
  } catch {
    const fallback = { updatedAt: null, commitShort: null }
    gitCache.set(file, fallback)
    return fallback
  }
}

function toLink(file: string): string {
  return `/${file.replace(/\\/g, '/').replace(/\.md$/, '')}`
}

function getPriority(title: string): number {
  if (/完全指南|入门|快速入门|技术参考|指南|规划/.test(title)) return 0
  if (/实战|实践|设计|体系|详解/.test(title)) return 1
  return 2
}

function comparePosts(a: PostMeta, b: PostMeta): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1
  if (a.updatedAt && b.updatedAt && a.updatedAt !== b.updatedAt) {
    return a.updatedAt > b.updatedAt ? -1 : 1
  }
  if (a.updatedAt && !b.updatedAt) return -1
  if (!a.updatedAt && b.updatedAt) return 1

  const priorityDelta = getPriority(a.title) - getPriority(b.title)
  if (priorityDelta !== 0) return priorityDelta

  return a.title.localeCompare(b.title, 'zh-CN')
}

function compareRecent(a: PostMeta, b: PostMeta): number {
  if (a.updatedAt && b.updatedAt && a.updatedAt !== b.updatedAt) {
    return a.updatedAt > b.updatedAt ? -1 : 1
  }
  if (a.updatedAt && !b.updatedAt) return -1
  if (!a.updatedAt && b.updatedAt) return 1
  return a.title.localeCompare(b.title, 'zh-CN')
}

function buildPost(file: string): PostMeta {
  const raw = readFileSync(join(ROOT, file), 'utf-8')
  const { data, content } = parseFrontmatter(raw)
  const path = toLink(file)
  const segments = file.replace(/\.md$/, '').split(/[\\/]/)
  const sectionKey = segments[0] as SectionKey
  const sectionLabel = SECTION_LABELS[sectionKey]
  const groupKey =
    sectionKey === 'thinking' && !segments[1]
      ? '思考记录'
      : sectionKey === 'philosophy'
        ? '哲学专栏'
        : segments[1] ?? sectionKey
  const groupLabel = sectionKey === 'philosophy' ? '哲学专栏' : groupKey

  const { updatedAt, commitShort } = getGitMeta(file)
  const title = typeof data.title === 'string' && data.title ? data.title : segments.at(-1) ?? file
  const excerpt =
    typeof data.description === 'string' && data.description
      ? data.description
      : extractExcerpt(content)

  return {
    title,
    path,
    sectionKey,
    sectionLabel,
    groupKey,
    groupLabel,
    excerpt,
    updatedAt,
    commitShort,
    featured:
      FEATURED_PATHS.has(path) || (typeof data.featured === 'boolean' && data.featured),
    homeHidden: typeof data.homeHidden === 'boolean' ? data.homeHidden : false,
  }
}

const posts = ['coding', 'thinking', 'philosophy']
  .flatMap((dir) => walkMarkdownFiles(dir))
  .map(buildPost)
  .sort(comparePosts)

function topGroupSort(name: string): number {
  return TOP_LEVEL_ORDER[name] ?? 999
}

function buildTechDropdownItems(): DefaultTheme.NavItemWithLink[] {
  const groups = Array.from(
    new Set(
      posts
        .filter((post) => post.sectionKey === 'coding')
        .map((post) => post.groupKey),
    ),
  ).sort((a, b) => topGroupSort(a) - topGroupSort(b) || a.localeCompare(b, 'zh-CN'))

  return groups.map((group) => {
    const lead = posts
      .filter((post) => post.sectionKey === 'coding' && post.groupKey === group)
      .sort(comparePosts)[0]

    return {
      text: group,
      link: lead?.path ?? '/archive',
    }
  })
}

function buildCodingSidebarBranch(dir: string, depth = 0): DefaultTheme.SidebarItem[] {
  const absolute = join(ROOT, dir)
  const entries = readdirSync(absolute, { withFileTypes: true })

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => topGroupSort(a.name) - topGroupSort(b.name) || a.name.localeCompare(b.name, 'zh-CN'))

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .filter((entry) => !EXCLUDED_FILES.has(entry.name))
    .map((entry) => buildPost(join(dir, entry.name)))
    .sort(comparePosts)

  const fileItems: DefaultTheme.SidebarItem[] = files.map((post) => ({
    text: post.title,
    link: post.path,
  }))

  const dirItems: DefaultTheme.SidebarItem[] = directories.map((entry) => ({
    text: entry.name,
    collapsed: true,
    items: buildCodingSidebarBranch(join(dir, entry.name), depth + 1),
  }))

  if (depth === 0) {
    return dirItems.concat(fileItems)
  }

  return fileItems.concat(dirItems)
}

function buildThinkingSidebar(): DefaultTheme.SidebarItem[] {
  const rootPosts = posts
    .filter((post) => post.sectionKey === 'thinking' && post.groupKey === '思考记录')
    .sort(comparePosts)

  const silverPosts = posts
    .filter((post) => post.sectionKey === 'thinking' && post.groupKey === '银发经济')
    .sort(comparePosts)

  return [
    {
      text: '思考记录',
      collapsed: false,
      items: rootPosts.map((post) => ({ text: post.title, link: post.path })),
    },
    {
      text: '银发经济',
      collapsed: true,
      items: silverPosts.map((post) => ({ text: post.title, link: post.path })),
    },
  ]
}

function buildPhilosophySidebar(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '哲学专栏',
      collapsed: false,
      items: posts
        .filter((post) => post.sectionKey === 'philosophy')
        .sort(comparePosts)
        .map((post) => ({ text: post.title, link: post.path })),
    },
  ]
}

function sectionCount(sectionKey: SectionKey): number {
  return posts.filter((post) => post.sectionKey === sectionKey).length
}

const latestPosts = posts
  .filter((post) => !post.homeHidden && post.sectionKey === 'coding')
  .sort(compareRecent)
  .slice(0, 8)
const essayPosts = posts
  .filter((post) => !post.homeHidden && post.sectionKey !== 'coding')
  .sort(compareRecent)
  .slice(0, 4)

const archiveSections = [
  {
    key: 'coding',
    title: '技术',
    description: '以银行级系统设计、后端工程、分布式与基础设施为主线的长期技术沉淀。',
    groups: CODING_GROUP_ORDER.filter((group) =>
      posts.some((post) => post.sectionKey === 'coding' && post.groupKey === group),
    ).map((group) => ({
      key: group,
      title: group,
      count: posts.filter((post) => post.sectionKey === 'coding' && post.groupKey === group).length,
      posts: posts
        .filter((post) => post.sectionKey === 'coding' && post.groupKey === group)
        .sort(comparePosts),
    })),
  },
  {
    key: 'thinking',
    title: '思考',
    description: '关于成长、关系、学习、时间与银发经济的持续写作。',
    groups: [
      {
        key: '思考记录',
        title: '思考记录',
        count: posts.filter((post) => post.sectionKey === 'thinking' && post.groupKey === '思考记录').length,
        posts: posts
          .filter((post) => post.sectionKey === 'thinking' && post.groupKey === '思考记录')
          .sort(comparePosts),
      },
      {
        key: '银发经济',
        title: '银发经济',
        count: posts.filter((post) => post.sectionKey === 'thinking' && post.groupKey === '银发经济').length,
        posts: posts
          .filter((post) => post.sectionKey === 'thinking' && post.groupKey === '银发经济')
          .sort(comparePosts),
      },
    ].filter((group) => group.count > 0),
  },
  {
    key: 'philosophy',
    title: '哲学',
    description: '尼采、叔本华与存在主义，作为技术之外的另一条思考主线。',
    groups: [
      {
        key: 'philosophy',
        title: '哲学专栏',
        count: posts.filter((post) => post.sectionKey === 'philosophy').length,
        posts: posts.filter((post) => post.sectionKey === 'philosophy').sort(comparePosts),
      },
    ],
  },
]

const panboThemeData = {
  home: {
    stats: [
      { label: '技术文章', value: sectionCount('coding') },
      { label: '思考与哲学', value: sectionCount('thinking') + sectionCount('philosophy') },
      { label: '知识栏目', value: archiveSections.reduce((total, section) => total + section.groups.length, 0) },
    ],
    primaryFeatures: [
      {
        eyebrow: 'Systems',
        title: '架构与工程',
        description: '围绕银行级系统设计、DDD、安全与工程治理的主线写作。',
        href: '/coding/架构心得/领域驱动设计DDD在银行系统的实战',
        meta: `${posts.filter((post) => post.groupKey === '架构心得' || post.groupKey === '工程实践').length} 篇沉淀`,
      },
      {
        eyebrow: 'Backend',
        title: 'Java 与服务端',
        description: '从并发、JVM、Spring 到数据库与缓存的后端实践。',
        href: '/coding/Java/Java并发编程完全指南',
        meta: `${posts.filter((post) => ['Java', 'MySQL', 'Redis'].includes(post.groupKey)).length} 篇专题`,
      },
      {
        eyebrow: 'Distributed',
        title: '分布式与基础设施',
        description: '微服务、容器、Kubernetes、DevOps 与可观测性的系统化记录。',
        href: '/coding/分布式系统/分布式系统设计原则与最佳实践',
        meta: `${posts.filter((post) => ['分布式系统', 'SpringCloud', 'Docker', 'Kubernetes', 'DevOps', 'BigData'].includes(post.groupKey)).length} 篇文章`,
      },
    ],
    secondaryFeatures: [
      {
        title: '思考记录',
        description: '关于学习、时间、关系与社会观察的个人写作。',
        href: '/thinking/关于学习',
      },
      {
        title: '哲学专栏',
        description: '以尼采、叔本华与存在处境为轴心的人文阅读。',
        href: '/philosophy/存在的重量-自由-荒谬与责任',
      },
      {
        title: 'HSBC 现场',
        description: '围绕银行科技工作流、业务线与实战经验的职业记录。',
        href: '/coding/HSBC/汇丰Senior-FullStack-Developer技术栈与思考',
      },
    ],
    latest: latestPosts,
    essays: essayPosts,
    quickLinks: [
      { title: '总索引', description: '按栏目浏览全站内容。', href: '/archive' },
      { title: '关于我', description: 'Panbo 的工作背景与写作母题。', href: '/about' },
      { title: 'GitHub', description: '查看项目与代码仓库。', href: 'https://github.com/hibernate-pano', external: true },
      { title: 'X / Twitter', description: '关注更新与碎片化输出。', href: 'https://x.com/HibernatePano', external: true },
    ],
  },
  archive: archiveSections,
}

const themeConfig = {
  nav: [
    { text: '首页', link: '/' },
    { text: '技术', items: buildTechDropdownItems() },
    { text: '思考', link: '/thinking/关于学习' },
    { text: '哲学', link: '/philosophy/存在的重量-自由-荒谬与责任' },
    { text: '汇丰', link: '/coding/HSBC/汇丰Senior-FullStack-Developer技术栈与思考' },
    { text: '总索引', link: '/archive' },
    { text: '关于', link: '/about' },
  ],
  sidebar: {
    '/coding/': buildCodingSidebarBranch('coding'),
    '/thinking/': buildThinkingSidebar(),
    '/philosophy/': buildPhilosophySidebar(),
    '/about': [],
    '/archive': [],
  },
  search: {
    provider: 'local',
    options: {
      detailedView: true,
    },
  },
  footer: {
    message: '记录技术实践，也记录长期思考。',
    copyright: '© 2024-2026 panbo.space | Built with VitePress',
  },
  docFooter: {
    prev: '← 上一篇',
    next: '下一篇 →',
  },
  outline: {
    level: [2, 3],
    label: '目录',
  },
  returnToTop: '↑ 返回顶部',
  editLink: {
    pattern: 'https://github.com/hibernate-pano/panbo.space/edit/main/:path',
    text: '在 GitHub 上修改',
  },
  socialLinks: [
    { icon: 'github', link: 'https://github.com/hibernate-pano', ariaLabel: 'GitHub' },
    { icon: 'twitter', link: 'https://x.com/HibernatePano', ariaLabel: 'Twitter/X' },
  ],
  panbo: panboThemeData,
} as DefaultTheme.Config & { panbo: typeof panboThemeData }

export default withMermaid(
  defineConfig({
    ignoreDeadLinks: true,
    title: 'panbo.space',
    description: 'Coding && Thinking - 技术博客与思考记录',
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
    themeConfig,
    vite: {
      server: {
        host: '0.0.0.0',
      },
      build: {
        chunkSizeWarningLimit: 1500,
      },
      css: {
        codeSplit: true,
      },
    },
  }),
)
