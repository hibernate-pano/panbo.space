export type ProjectLink = {
  label: string
  href: string
}

export type ProjectUpdate = {
  date: string
  summary: string
  report?: ProjectLink
}

export type ProjectKind = 'chrome-extension' | 'web-app' | 'mac-app'

export type Project = {
  name: string
  tagline: string
  kind: ProjectKind
  kindLabel: string
  stack: string[]
  updatedAt: string
  status: string
  repoUrl?: string
  privateRepo?: boolean
  liveUrl?: string
  report?: ProjectLink
  updates: ProjectUpdate[]
}

export const projects: Project[] = [
  {
    name: 'TapStack',
    tagline: '面向重度浏览器用户的工作会话保险箱：把当前窗口保存成可恢复的工作现场，并跨设备同步。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'TypeScript', 'IndexedDB', 'Supabase'],
    updatedAt: '2026-10-06',
    status: '活跃开发',
    repoUrl: 'https://github.com/hibernate-pano/chrome-plugin-one-tab',
    report: {
      label: '健康检查报告',
      href: 'https://github.com/hibernate-pano/chrome-plugin-one-tab/blob/main/docs/health-check-2026-10-06-expert-team.md',
    },
    updates: [
      {
        date: '2026-10-06',
        summary: '迁移文件名非法被静默跳过的缺陷修复：改名 + 补台账 + 双闸防复发；补齐拖拽排序 18 个测试用例。',
      },
      {
        date: '2026-10-06',
        summary: 'CI 触发器守卫同步，verify 降级为手动触发；修掉 lockfile 与 package.json 不同步导致的首推红灯。',
      },
      {
        date: '2026-10-05',
        summary: '线上 P0 实测结论落档，记录写同步 SQL 踩到的 3 个坑；完成外部专家团队视角的全量健康检查。',
        report: {
          label: '10-05 健康检查',
          href: 'https://github.com/hibernate-pano/chrome-plugin-one-tab/blob/main/docs/health-check-2026-10-05.md',
        },
      },
    ],
  },
  {
    name: 'Lagoon',
    tagline: '苹果生态的 AI 收件箱操作系统：键盘优先的邮件分诊机，一天打开两次、十分钟清零。',
    kind: 'mac-app',
    kindLabel: 'Mac 应用',
    stack: ['Swift', 'SwiftUI', '嵌入式 SQLite', 'IMAP'],
    updatedAt: '2026-10-06',
    status: 'MVP3 迭代中',
    repoUrl: 'https://github.com/hibernate-pano/lagoon-email',
    report: {
      label: '产品设计文档',
      href: 'https://github.com/hibernate-pano/lagoon-email/blob/main/docs/superpowers/specs/2026-09-09-lagoon-email-design.md',
    },
    updates: [
      {
        date: '2026-10-06',
        summary: 'MVP3：三栏布局支持自定义拖曳排序，加权弹性补偿让分栏拖动手感顺滑；两层嵌套 split view 拆分重构。',
      },
      {
        date: '2026-10-06',
        summary: '管理动作补齐 + 已发送列表 + 三栏导航扫视效率优化；版本升至 3.2.0，用户手册同步到当前能力。',
      },
      {
        date: '2026-10-05',
        summary: 'IMAP 回填窗口从「UID 槽位」改为「消息条数」；API 鉴权从 fail-open 改为 fail-closed。',
      },
    ],
  },
  {
    name: 'Concept Digger',
    tagline: '一个学习平台：输入一个词、一段 PDF 或整本书，AI 流式解析并沉淀为可检验、可保持的学习闭环。',
    kind: 'web-app',
    kindLabel: 'Web 应用',
    stack: ['Next.js', 'TypeScript', 'Vercel'],
    updatedAt: '2026-10-06',
    status: '活跃开发',
    repoUrl: 'https://github.com/hibernate-pano/study-with-me',
    liveUrl: 'https://studywithme.panbo.space',
    report: {
      label: '专家团队体检报告',
      href: 'https://github.com/hibernate-pano/study-with-me/blob/main/docs/health-check-2026-10-05-expert-team.md',
    },
    updates: [
      {
        date: '2026-10-06',
        summary: '修掉前端 3 个 P0：流式响应残缺入库、知识网络退化、compare 页卸载内存泄漏；CSP 修复真正上线。',
      },
      {
        date: '2026-10-06',
        summary: '清理 24 处未使用代码残留，noUnusedLocals 设为常驻门禁。',
      },
      {
        date: '2026-10-05',
        summary: '书籍学习（EPUB 解析）设计方案与学习平台重构 spec 落地。',
        report: {
          label: '重构 spec',
          href: 'https://github.com/hibernate-pano/study-with-me/blob/main/docs/superpowers/specs/2026-10-05-learning-platform-redesign.md',
        },
      },
    ],
  },
  {
    name: 'YouTube Digest',
    tagline: '把每个 YouTube 视频变成深度学习素材：字幕、双语翻译、AI 概览、时间戳笔记收进一个侧边栏。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'TypeScript'],
    updatedAt: '2026-10-06',
    status: 'v1.4.0',
    repoUrl: 'https://github.com/hibernate-pano/youtube-digest',
    report: {
      label: '项目评审报告',
      href: 'https://github.com/hibernate-pano/youtube-digest/blob/feat/new-feature/docs/PROJECT-REVIEW-2026-10-05.md',
    },
    updates: [
      {
        date: '2026-10-06',
        summary: '让测试真正进入 CI 门禁，并修正审查报告里两处误判。',
      },
      {
        date: '2026-10-06',
        summary: '补全词汇功能三端错配的逐层证据链。',
      },
      {
        date: '2026-10-05',
        summary: 'v1.4.0 发布；沉淀端到端验证方法（含 Chrome headless 对扩展的限制）。',
      },
    ],
  },
  {
    name: 'Manga Translator',
    tagline: '在浏览器里直接翻译外文漫画：调用任意 OpenAI 兼容视觉模型，译文覆盖原图，排版风格保留。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'Vision LLM', 'TypeScript'],
    updatedAt: '2026-10-05',
    status: 'v2.0 审计收尾',
    repoUrl: 'https://github.com/hibernate-pano/chrome-plugin-manga-translator',
    report: {
      label: '架构笔记',
      href: 'https://github.com/hibernate-pano/chrome-plugin-manga-translator/blob/main/docs/architecture-notes.md',
    },
    updates: [
      {
        date: '2026-10-05',
        summary: '审计收尾：修掉两个阻断发布的缺陷，清理 v2.0.0 遗漏的死代码。',
      },
      {
        date: '2026-10-05',
        summary: '安全加固：检测到 base URL 会明文传输 API key 时向用户发出警告。',
      },
      {
        date: '2026-10-05',
        summary: '覆盖率诚实化：封住 service worker 的测试缺口，让覆盖率分母真实。',
      },
    ],
  },
  {
    name: 'Video Speed Controller',
    tagline: '极简网页视频工具，只做三件事：网页全屏、倍速播放、播放控制。装完即用，用完即忘。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'TypeScript', 'Vitest'],
    updatedAt: '2026-10-06',
    status: '私有仓库',
    privateRepo: true,
    updates: [
      {
        date: '2026-10-06',
        summary: '封堵 QA 盲区：vitest 覆盖面、设置热更新接线、版本号一致性守护。',
      },
      {
        date: '2026-10-04',
        summary: '6.0.5 反馈修复版：网页全屏接管失败不再静默；首次使用引导上线（只出现一次）。',
      },
      {
        date: '2026-10-04',
        summary: '截图验收抓到引导文案两个肉眼可见缺陷并修复。',
      },
    ],
  },
  {
    name: '西安买房助手',
    tagline: '为西安买房人提供「小区 → 学区 → 学校」一站式查询，围绕一个家庭的真实购房决策组织产品。',
    kind: 'web-app',
    kindLabel: 'Web 应用',
    stack: ['Next.js 15', 'React 19', 'Tailwind CSS', 'Vercel'],
    updatedAt: '2026-10-04',
    status: '私有仓库',
    privateRepo: true,
    liveUrl: 'https://house-buying-assistant.vercel.app',
    updates: [
      {
        date: '2026-10-04',
        summary: '产品叙事重构：About 页诚实说明这个产品帮做什么决定、数据边界在哪。',
      },
      {
        date: '2026-10-04',
        summary: '学区检索引用官方划片文本；未匹配划片名的一键人工复核后台上线。',
      },
      {
        date: '2026-10-04',
        summary: '清除 V0.1 演示数据，重复数据自愈机制上线。',
      },
    ],
  },
]

export const getSortedProjects = (): Project[] =>
  [...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

export const getProjectStats = () => ({
  total: projects.length,
  public: projects.filter((project) => project.repoUrl).length,
  live: projects.filter((project) => project.liveUrl).length,
})
