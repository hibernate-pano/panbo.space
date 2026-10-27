import type { ImageMetadata } from 'astro'
import videoSpeedController from '../assets/projects/video-speed-controller.webp'
import folio from '../assets/projects/folio.webp'
import tapstack from '../assets/projects/tapstack.webp'
import folome from '../assets/projects/folome.webp'
import rednoteDownloader from '../assets/projects/rednote-downloader.webp'
import mangaTranslator from '../assets/projects/manga-translator.webp'
import inputSmarter from '../assets/projects/input-smarter.webp'
import studybook from '../assets/projects/studybook.webp'
import youtubeDigest from '../assets/projects/youtube-digest.webp'
import lagoon from '../assets/projects/lagoon.webp'
import tt from '../assets/projects/tt.webp'
import foodguard from '../assets/projects/foodguard.webp'
import houseBuyingAssistant from '../assets/projects/house-buying-assistant.webp'

export type ProjectLink = {
  label: string
  href: string
}

export type ProjectUpdate = {
  date: string
  summary: string
  report?: ProjectLink
}

/** 作品图版：一块 16:10 的界面图。 */
export type ProjectImage = {
  src: ImageMetadata
  alt: string
}

export type ProjectKind = 'chrome-extension' | 'web-app' | 'mac-app' | 'ios-app'

export type Project = {
  name: string
  tagline: string
  kind: ProjectKind
  kindLabel: string
  stack: string[]
  updatedAt: string
  status: string
  image: ProjectImage
  repoUrl?: string
  privateRepo?: boolean
  liveUrl?: string
  storeUrl?: string
  report?: ProjectLink
  updates: ProjectUpdate[]
}

// 收录标准：最近 30 天内在仓库里有真实提交（最少的一个也有 6 次）。
// 排序看 updatedAt —— 一律取该仓库的最新提交日期，不是"我什么时候改的这份清单"。
export const projects: Project[] = [
  {
    name: 'Video Speed Controller',
    tagline: '极简网页视频工具，只做三件事：网页全屏、倍速播放、播放控制。装完即用，用完即忘。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'TypeScript', 'Vitest'],
    updatedAt: '2026-10-27',
    status: 'v6.2.0 已上架',
    image: {
      src: videoSpeedController,
      alt: '全屏播放时的倍速控制条，右下角可调速与设置',
    },
    repoUrl: 'https://github.com/hibernate-pano/chrome-plugin-video-manager',
    storeUrl:
      'https://chromewebstore.google.com/detail/video-speed-controller/mennabljgjphikgaiahngapedibccmei',
    report: {
      label: '上线手册',
      href: 'https://github.com/hibernate-pano/chrome-plugin-video-manager/blob/main/docs/LAUNCH.md',
    },
    updates: [
      {
        date: '2026-10-27',
        summary:
          '商店文案漂到线上去了 —— 拆成按 locale 的粘贴件，再加一道守卫守住；上传前加版本号闸门。',
      },
      {
        date: '2026-10-23',
        summary: '读完商店页做竞品分析：天花板约 10 万用户，而当时 23 个用户不是产品判负，是分发没做完。',
      },
      {
        date: '2026-10-23',
        summary:
          '决定不做站点级默认速度 —— 让用户从默认速度开始、自行调整；同一轮把「简介不许跟真实能力跑偏」写成测试。',
      },
    ],
  },
  {
    name: 'Folio 阅读助手',
    tagline: '极简的 Chrome 阅读扩展：一键剥离广告、导航与悬浮元素，只留下正文与恰到好处的排版。本地优先。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'React', 'Readability', 'Shadow DOM'],
    updatedAt: '2026-10-27',
    status: 'v3.9.0 发版准备中',
    image: {
      src: folio,
      alt: '阅读模式重排后的文章页：标题、代码块与复制按钮',
    },
    repoUrl: 'https://github.com/hibernate-pano/chrome-plugin-reading-extension',
    report: {
      label: '发行说明 v3.9.0',
      href: 'https://github.com/hibernate-pano/chrome-plugin-reading-extension/blob/main/docs/release-notes-v3.9.0.md',
    },
    updates: [
      {
        date: '2026-10-27',
        summary: '补上隐私政策与商店上架材料，为 3.9.0 发版做准备。',
      },
      {
        date: '2026-10-26',
        summary: '定版 v3.9.0：收紧覆盖率阈值，把列表分块的表述对齐 CHANGELOG 里的真实用例数。',
      },
      {
        date: '2026-10-26',
        summary: '落实收尾评审的 Minor 意见，并补上 CSS 回归保护。',
      },
    ],
  },
  {
    name: 'TapStack',
    tagline: '面向重度浏览器用户的工作会话保险箱：把当前窗口存成一个会话并关掉它们，随时找回，跨设备恢复。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'TypeScript', 'React', 'IndexedDB', 'Supabase'],
    updatedAt: '2026-10-26',
    status: 'v1.29.0 已上架',
    image: {
      src: tapstack,
      alt: '扩展面板里的一串会话，可保存并关闭标签页',
    },
    repoUrl: 'https://github.com/hibernate-pano/chrome-plugin-one-tab',
    storeUrl: 'https://chromewebstore.google.com/detail/tapstack/bbbpnccbclnnphchghpfmcjjfhigepbk',
    report: {
      label: '验证报告',
      href: 'https://github.com/hibernate-pano/chrome-plugin-one-tab/blob/main/docs/verification-report-2026-10-13.html',
    },
    updates: [
      {
        date: '2026-10-26',
        summary: 'v1.29.0 过审上架，公开页已是 1.29.0；把线上文案欠账入账。',
      },
      {
        date: '2026-10-26',
        summary: '撤销提示整套下线、提示条回到右上角；点扩展图标一定会打开标签管理器。',
      },
      {
        date: '2026-10-24',
        summary:
          '界面与交互回到 v1.25.1，1.27.0 的后端与安全修复一条不退；悬停提示条不再被压成「一个汉字一行」。',
      },
    ],
  },
  {
    name: 'folome',
    tagline: '本地 RSS 阅读器：三栏阅读体验，零依赖的服务端抓取与存储。无登录、无账号、无订阅。',
    kind: 'mac-app',
    kindLabel: 'Mac 应用',
    stack: ['Node.js 零依赖', 'Tauri 2', 'SQLite'],
    updatedAt: '2026-10-26',
    status: 'v2.5.0',
    image: {
      src: folome,
      alt: '三栏 RSS 阅读器：订阅源、文章列表与正文',
    },
    privateRepo: true,
    report: {
      label: 'macOS 外壳设计',
      href: 'https://github.com/hibernate-pano/folome/blob/main/docs/12-macos-app-shell-design.md',
    },
    updates: [
      {
        date: '2026-10-26',
        summary: '2.5.0：托盘换单色 template 图标，新文章通知与菜单栏角标上线。',
      },
      {
        date: '2026-10-26',
        summary:
          '订阅管理面板 —— 看全、逐条改、能批量处理；「已订阅」改由服务端裁决，不再按地址字符串猜。',
      },
      {
        date: '2026-10-26',
        summary: '修掉后端重启后残留一个白屏窗口的问题。',
      },
    ],
  },
  {
    name: '小红书下载器',
    tagline: '在小红书网页上一键保存视频与图片：原始画质、真实进度、批量可选、命名可预期。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'TypeScript'],
    updatedAt: '2026-10-25',
    status: 'v1.3.2 商店首发备料',
    image: {
      src: rednoteDownloader,
      alt: '小红书笔记页，右侧下载面板列出待保存的视频',
    },
    repoUrl: 'https://github.com/hibernate-pano/chrome-plugin-rednote-downloader',
    report: {
      label: '上架信息',
      href: 'https://github.com/hibernate-pano/chrome-plugin-rednote-downloader/blob/master/docs/store-listing.md',
    },
    updates: [
      {
        date: '2026-10-25',
        summary: '商店上架素材与文案落盘：截图/宣传图生成脚本、隐私政策、上架信息。',
      },
      {
        date: '2026-10-25',
        summary: '修掉扩展 UI 漏进页面 DOM —— hover 按钮样式失效，每页左上角挂着一个灰按钮。',
      },
      {
        date: '2026-10-24',
        summary:
          '修掉「视频解析经常失败」—— 抓 HTML 快路在真站点上 100% 白抓；解析主路改回隐藏 iframe，快路必须自证一致才准接手。',
      },
    ],
  },
  {
    name: 'Manga Translator',
    tagline: '在浏览器里直接翻译外文漫画：调用任意 OpenAI 兼容视觉模型，译文叠加在原图气泡上，不离开漫画站。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'Vision LLM', 'React', 'Tesseract.js'],
    updatedAt: '2026-10-25',
    status: 'v2.1.1 商店提审中',
    image: {
      src: mangaTranslator,
      alt: '漫画页上的译文气泡叠加在原图里',
    },
    repoUrl: 'https://github.com/hibernate-pano/chrome-plugin-manga-translator',
    report: {
      label: '架构笔记',
      href: 'https://github.com/hibernate-pano/chrome-plugin-manga-translator/blob/main/docs/architecture-notes.md',
    },
    updates: [
      {
        date: '2026-10-25',
        summary: '2.1.1 顶替 v2.1.0 提审，台账记下取消与自证；商店的标题与摘要改成 manifest 里的中文原文。',
      },
      {
        date: '2026-10-25',
        summary: '失败要当场看得见，取消要真的停得住。',
      },
      {
        date: '2026-10-24',
        summary: '三道会撒谎的门禁，现在说的是它真正检查的那件事。',
      },
    ],
  },
  {
    name: 'input-smarter',
    tagline: '按应用自动切换 macOS 输入法：只复刻核心能力，本机自用，无账号、无自动更新、无网络请求。',
    kind: 'mac-app',
    kindLabel: 'Mac 应用',
    stack: ['Swift', 'SwiftUI', '辅助功能 API'],
    updatedAt: '2026-10-25',
    status: 'v0.0.1',
    image: {
      src: inputSmarter,
      alt: '设置窗口：已配置的 app 与各自固定的输入法',
    },
    repoUrl: 'https://github.com/hibernate-pano/input-smarter',
    updates: [
      {
        date: '2026-10-25',
        summary: '应用图标一套画法，bundle 图标与菜单栏标记共用。',
      },
      {
        date: '2026-10-24',
        summary: '菜单栏在辅助功能没授权时给出提示并跳到系统设置；全局设置开关进菜单栏，快捷键在设置窗口里录。',
      },
      {
        date: '2026-10-23',
        summary: '0.0.1 发布：按应用自动切换 macOS 输入法，菜单里标明当前 app 绑定的输入法。',
      },
    ],
  },
  {
    name: '学记 Studybook',
    tagline: '一个学习平台，不是工具集合：输入一个词、一段 PDF 或整本书，AI 流式解析，产出的每条知识都沉淀成同一个学习对象。',
    kind: 'web-app',
    kindLabel: 'Web 应用',
    stack: ['Next.js', 'TypeScript', 'React', 'Vercel'],
    updatedAt: '2026-10-24',
    status: 'v1.20.4',
    image: {
      src: studybook,
      alt: '学记首页：输入一个词，顺着网络学下去',
    },
    privateRepo: true,
    liveUrl: 'https://studywithme.panbo.space',
    report: {
      label: '10-14 专家体检',
      href: 'https://github.com/hibernate-pano/study-with-me/blob/main/docs/health-check-2026-10-14-expert-team.md',
    },
    updates: [
      {
        date: '2026-10-24',
        summary: 'v1.20.4 —— C1 门禁覆盖全部成卡来源，第五轮体检修复。',
      },
      {
        date: '2026-10-24',
        summary: '写下学记 v2 的设计文档与实施计划：一本书的研读流水线，30 个任务。',
      },
      {
        date: '2026-10-20',
        summary: 'v1.20.3 —— C1 裂缝彻底兑现，测练接入知识库。',
      },
    ],
  },
  {
    name: 'YouTube Digest',
    tagline: '把每个 YouTube 视频变成深度学习素材：字幕、双语翻译、AI 概览、时间戳笔记收进一个侧边栏。',
    kind: 'chrome-extension',
    kindLabel: 'Chrome 扩展',
    stack: ['Chrome MV3', 'TypeScript'],
    updatedAt: '2026-10-22',
    status: 'v1.8.0',
    image: {
      src: youtubeDigest,
      alt: 'YouTube 播放页，右侧是 AI 概览与章节笔记',
    },
    repoUrl: 'https://github.com/hibernate-pano/youtube-digest',
    report: {
      label: '10-20 审计 R4',
      href: 'https://github.com/hibernate-pano/youtube-digest/blob/main/docs/AUDIT-2026-10-20-R4.md',
    },
    updates: [
      {
        date: '2026-10-22',
        summary: 'v1.8.0 —— 长视频不再换来长等待；失败用读者的语言告知，清缓存同时清掉计数。',
      },
      {
        date: '2026-10-22',
        summary: '写下这一轮的真实审计：线上服务到底能回答什么，以及哪三件事需要人来决定。',
      },
      {
        date: '2026-10-22',
        summary: '商店上架信息随面板当前状态重建 —— 文档承诺的每一句，都是代码守得住的。',
      },
    ],
  },
  {
    name: 'Lagoon',
    tagline: '苹果生态的 AI 收件箱操作系统：键盘优先的邮件分诊机，一天打开两次、十分钟清零，常驻反而是失败。',
    kind: 'mac-app',
    kindLabel: 'Mac 应用',
    stack: ['Swift', 'Hummingbird', 'SQLite', 'IMAP'],
    updatedAt: '2026-10-22',
    status: 'V3 embedded',
    image: {
      src: lagoon,
      alt: 'Lagoon 的快捷键表浮层，左侧是邮箱栏目',
    },
    repoUrl: 'https://github.com/hibernate-pano/lagoon-email',
    report: {
      label: '只读 AI 宪法',
      href: 'https://github.com/hibernate-pano/lagoon-email/blob/main/docs/superpowers/specs/2026-10-02-advisory-only-ai-constitution-design.md',
    },
    updates: [
      {
        date: '2026-10-22',
        summary: '第四轮审查修复的工作树快照（92 个文件）。',
      },
      {
        date: '2026-10-21',
        summary: '修掉第三轮修复前的 14 条未批准警告，闸门转绿。',
      },
      {
        date: '2026-10-16',
        summary: '落地全方位审查修复轮（F-01…F-18），审查报告与执行报告落盘。',
      },
    ],
  },
  {
    name: 'tt',
    tagline: 'macOS 本地听写工具：按住 Fn 说话，松开即转写，结果写回当前光标处。录音交给本机 whisper.cpp，音频不出本机。',
    kind: 'mac-app',
    kindLabel: 'Mac 应用',
    stack: ['Swift', 'whisper.cpp', '辅助功能 API'],
    updatedAt: '2026-10-19',
    status: '本机自用',
    image: {
      src: tt,
      alt: 'TT 启动页：按住 Fn 说话，松开即转写',
    },
    updates: [
      {
        date: '2026-10-19',
        summary: '文本整理去掉语气词规则层，接入可选的本地大模型整理；输出可信度闸门与 settings 崩溃一并修掉。',
      },
      {
        date: '2026-10-19',
        summary: '写回后验证：粘贴没生效时回退到结果窗口；处理态覆盖到写回结束，不再被重叠写回覆盖剪贴板。',
      },
      {
        date: '2026-10-19',
        summary: '辅助功能权限轮询 —— 授权后无需重启。',
      },
    ],
  },
  {
    name: 'FoodGuard 糖友助手',
    tagline: '糖友的日常饮食决策助手：扫条码或拍配料表，给出升糖风险判定与糖 / 碳水量化占比，结论由你自己下。',
    kind: 'ios-app',
    kindLabel: 'iOS 应用',
    stack: ['SwiftUI', '本地规则引擎', 'LLM 成分提取'],
    updatedAt: '2026-10-09',
    status: 'v2.4.0 Sprint 2',
    image: {
      src: foodguard,
      alt: 'FoodGuard 应用图标',
    },
    privateRepo: true,
    report: {
      label: '路线图',
      href: 'https://github.com/hibernate-pano/FoodGuard/blob/main/docs/roadmap-2026-10-08.md',
    },
    updates: [
      {
        date: '2026-10-09',
        summary: 'Sprint 2：今日时间对照 + 手工录入 + 份量编辑 + 餐段分段。',
      },
      {
        date: '2026-10-09',
        summary: '限流分类验收固化，每条断言用独立的 XFF 桶；onboarding 静默默认修复，CI 接入门禁。',
      },
      {
        date: '2026-10-08',
        summary: '隐私承诺落地为行为：token 移出仓库、访问日志剔除条码、风险引擎对未知项保守聚合。',
      },
    ],
  },
  {
    name: '西安买房助手',
    tagline: '为西安买房人提供「小区 → 学区 → 学校」一站式查询，围绕一个家庭的真实购房决策组织产品。',
    kind: 'web-app',
    kindLabel: 'Web 应用',
    stack: ['Next.js 15', 'React 19', 'Postgres', 'Vercel'],
    updatedAt: '2026-10-04',
    status: 'v0.1.0',
    image: {
      src: houseBuyingAssistant,
      alt: '西安买房助手的「我的案子」页面',
    },
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
  store: projects.filter((project) => project.storeUrl).length,
})

// HTML5 forbids whitespace in id, and half these names are Latin + CJK.
export const toAnchor = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')

// 首页那条作品带：每种应用类型各挑一个，正好对上那句「Chrome 扩展、Web 应用、
// Mac 应用和一个 iOS 应用」。
export const featuredProjects = (): Project[] =>
  ['Video Speed Controller', '学记 Studybook', 'folome', 'FoodGuard 糖友助手']
    .map((name) => projects.find((project) => project.name === name))
    .filter((project): project is Project => Boolean(project))
