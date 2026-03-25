<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const ASCII_ART = `
 ██████╗  █████╗ ███╗   ██╗██████╗  ██████╗    ███████╗██████╗  █████╗  ██████╗███████╗
 ██╔══██╗██╔══██╗████╗  ██║██╔══██╗██╔═══██╗   ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝
 ██████╔╝███████║██╔██╗ ██║██████╔╝██║   ██║   ███████╗██████╔╝███████║██║     █████╗
 ██╔═══╝ ██╔══██║██║╚██╗██║██╔══██╗██║   ██║   ╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝
 ██║     ██║  ██║██║ ╚████║██████╔╝╚██████╔╝██╗███████║██║     ██║  ██║╚██████╗███████╗
 ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝`

type StatItem = {
  label: string
  value: number
}

type FeatureItem = {
  eyebrow?: string
  title: string
  description: string
  href: string
  meta?: string
}

type PostItem = {
  title: string
  path: string
  sectionLabel: string
  groupLabel: string
  excerpt: string
  updatedAt: string | null
  commitShort: string | null
}

type QuickLink = {
  title: string
  description: string
  href: string
  external?: boolean
}

type ArchiveGroup = {
  key: string
  title: string
  count: number
  posts: PostItem[]
}

type ArchiveSection = {
  key: string
  title: string
  description: string
  groups: ArchiveGroup[]
}

type ThemeData = {
  home: {
    stats: StatItem[]
    primaryFeatures: FeatureItem[]
    secondaryFeatures: FeatureItem[]
    latest: PostItem[]
    essays: PostItem[]
    quickLinks: QuickLink[]
  }
  archive: ArchiveSection[]
}

const { theme, frontmatter } = useData()

const panbo = computed(() => theme.value.panbo as ThemeData)
const home = computed(() => panbo.value.home)
const archive = computed(() => panbo.value.archive)
const isHomePage = computed(() => frontmatter.value.layout === 'home')

const digestSections = computed(() =>
  archive.value.map((section) => ({
    title: section.title,
    description: section.description,
    count: section.groups.reduce((total, group) => total + group.count, 0),
    href: section.groups[0]?.posts[0]?.path ?? '/archive',
  })),
)

const digestLead = computed(() => home.value.primaryFeatures[0])
const digestFeatureStack = computed(() => home.value.primaryFeatures.slice(1))
const digestBeats = computed(() => {
  const coding = archive.value.find((section) => section.key === 'coding')
  return coding?.groups.slice(0, 8).map((group) => ({
    title: group.title,
    count: group.count,
    href: group.posts[0]?.path ?? '/archive',
    sample: group.posts[0]?.title ?? '',
  })) ?? []
})

const newspaperEditorials = computed(() => home.value.secondaryFeatures.slice(0, 3))
const newspaperLeadStories = computed(() => home.value.primaryFeatures.slice(0, 3))
const newspaperClassifieds = computed(() => home.value.quickLinks.slice(0, 6))
const newspaperDesk = computed(() => home.value.latest.slice(0, 6))
const newspaperArchive = computed(() =>
  archive.value
    .flatMap((section) =>
      section.groups.map((group) => ({
        title: group.title,
        count: group.count,
        href: group.posts[0]?.path ?? '/archive',
        sample: group.posts[0]?.title ?? section.description,
      })),
    )
    .slice(0, 8),
)

const cyberNavItems = computed(() => {
  const links = [
    { cmd: 'cd', arg: './coding', desc: '技术频道', href: home.value.primaryFeatures[0]?.href ?? '/archive' },
    { cmd: 'cd', arg: './thinking', desc: '思考记录', href: home.value.secondaryFeatures[0]?.href ?? '/thinking/关于学习' },
    { cmd: 'cd', arg: './philosophy', desc: '哲学专栏', href: home.value.secondaryFeatures[1]?.href ?? '/philosophy/存在的重量-自由-荒谬与责任' },
    { cmd: 'cd', arg: './hsbc', desc: '工作现场', href: home.value.secondaryFeatures[2]?.href ?? '/coding/HSBC/汇丰Senior-FullStack-Developer技术栈与思考' },
    { cmd: 'cat', arg: './archive', desc: '总索引', href: '/archive' },
    { cmd: 'cat', arg: './about.md', desc: '关于我', href: '/about' },
  ]
  return links
})

const cyberTechStack = computed(() => [
  { name: 'java', ver: '^21.0.0', tree: '├──' },
  { name: 'spring-boot', ver: '^3.2.0', tree: '├──' },
  { name: 'spring-cloud', ver: '^2023.0', tree: '├──' },
  { name: 'react', ver: '^18.3.0', tree: '├──' },
  { name: 'typescript', ver: '^5.4.0', tree: '├──' },
  { name: 'redis', ver: '^7.2.0', tree: '├──' },
  { name: 'mysql', ver: '^8.0.0', tree: '├──' },
  { name: 'docker', ver: '^25.0.0', tree: '├──' },
  { name: 'kubernetes', ver: '^1.29.0', tree: '├──' },
  { name: 'aws', ver: '^latest', tree: '└──' },
])

const cyberRecent = computed(() =>
  home.value.latest.slice(0, 6).map((post) => ({
    ...post,
    hash: post.commitShort ?? 'HEAD',
  })),
)

const cyberSocialLinks = computed(() =>
  home.value.quickLinks.filter((link) => link.external).slice(0, 2),
)
</script>

<template>
  <div v-if="isHomePage" class="panbo-home-wrap">
    <section class="panbo-home panbo-home--editorial">
      <header class="editorial-hero">
        <p class="editorial-kicker">Issue 03 · Technical Essays</p>
        <h1>panbo.space</h1>
        <p class="editorial-deck">
          以银行级工程实践为主线，记录后端、分布式、基础设施与长期思考。
        </p>
        <div class="editorial-stat-row">
          <div v-for="stat in home.stats" :key="stat.label" class="editorial-stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </header>

      <section class="editorial-section">
        <div class="panbo-section-head">
          <span class="panbo-section-kicker">Primary Tracks</span>
          <h2>先看技术主线</h2>
        </div>
        <div class="editorial-feature-grid">
          <a
            v-for="feature in home.primaryFeatures"
            :key="feature.title"
            :href="feature.href"
            class="editorial-feature-card"
          >
            <span class="eyebrow">{{ feature.eyebrow }}</span>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <span class="meta">{{ feature.meta }}</span>
          </a>
        </div>
      </section>

      <section class="editorial-section">
        <div class="panbo-section-head">
          <span class="panbo-section-kicker">Latest</span>
          <h2>最近更新</h2>
        </div>
        <ul class="editorial-latest-list">
          <li v-for="post in home.latest" :key="post.path">
            <a :href="post.path">
              <span class="label">{{ post.sectionLabel }}</span>
              <span class="title">{{ post.title }}</span>
              <span class="date">{{ post.updatedAt ?? 'recent' }}</span>
            </a>
          </li>
        </ul>
      </section>

      <section class="editorial-section editorial-section--secondary">
        <div class="panbo-section-head">
          <span class="panbo-section-kicker">Secondary Lines</span>
          <h2>思考、哲学与工作现场</h2>
        </div>
        <div class="editorial-secondary-grid">
          <a
            v-for="feature in home.secondaryFeatures"
            :key="feature.title"
            :href="feature.href"
            class="editorial-secondary-card"
          >
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </a>
        </div>
      </section>

      <section class="editorial-section editorial-section--essay">
        <div class="panbo-section-head">
          <span class="panbo-section-kicker">Longer Thoughts</span>
          <h2>技术之外</h2>
        </div>
        <div class="editorial-essay-grid">
          <a v-for="post in home.essays" :key="post.path" :href="post.path" class="editorial-essay-card">
            <span>{{ post.groupLabel }}</span>
            <h3>{{ post.title }}</h3>
            <p>{{ post.excerpt }}</p>
          </a>
        </div>
      </section>

      <nav class="editorial-utility-grid">
        <a
          v-for="link in home.quickLinks"
          :key="link.title"
          :href="link.href"
          class="editorial-utility-card"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noreferrer noopener' : undefined"
        >
          <strong>{{ link.title }}</strong>
          <span>{{ link.description }}</span>
        </a>
      </nav>
    </section>

    <section class="panbo-home panbo-home--digest">
      <header class="digest-hero">
        <div class="digest-hero__main">
          <p class="digest-kicker">Digest View</p>
          <h1>panbo.space</h1>
          <p class="digest-deck">
            为高频浏览准备的知识索引视角。它不像 <em>Read</em> 那样沉浸，而更像一份持续更新的技术 briefing。
          </p>
          <div class="digest-stat-inline">
            <div v-for="stat in home.stats" :key="stat.label" class="digest-stat-inline__item">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </div>
          </div>
        </div>
        <aside class="digest-issue-card">
          <p class="digest-issue-card__eyebrow">Current framing</p>
          <h2>技术优先，索引先行。</h2>
          <p class="digest-issue-card__body">
            先快速找到系统设计、后端、分布式与基础设施，再回到思考与哲学。
          </p>
          <div class="digest-stat-board">
            <div v-for="stat in home.stats" :key="stat.label" class="digest-stat">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </div>
          </div>
        </aside>
      </header>

      <div class="digest-layout">
        <section class="digest-panel digest-panel--feature">
          <div class="panbo-section-head">
            <span class="panbo-section-kicker">Lead Desk</span>
            <h2>主线专题</h2>
          </div>
          <a v-if="digestLead" :href="digestLead.href" class="digest-lead-story">
            <span class="eyebrow">{{ digestLead.eyebrow }}</span>
            <strong>{{ digestLead.title }}</strong>
            <p>{{ digestLead.description }}</p>
            <em>{{ digestLead.meta }}</em>
          </a>
          <div class="digest-feature-stack">
            <a
              v-for="feature in digestFeatureStack"
              :key="feature.title"
              :href="feature.href"
              class="digest-feature-card"
            >
              <span class="eyebrow">{{ feature.eyebrow }}</span>
              <strong>{{ feature.title }}</strong>
              <p>{{ feature.description }}</p>
            </a>
          </div>
        </section>

        <section class="digest-panel digest-panel--latest">
          <div class="panbo-section-head">
            <span class="panbo-section-kicker">Recently Updated</span>
            <h2>更新流</h2>
          </div>
          <ul class="digest-post-list">
            <li v-for="(post, index) in home.latest" :key="post.path">
              <a :href="post.path">
                <span class="index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="group">{{ post.groupLabel }}</span>
                <span class="title">{{ post.title }}</span>
                <span class="date">{{ post.updatedAt ?? 'recent' }}</span>
              </a>
            </li>
          </ul>
        </section>

        <section class="digest-rail">
          <section class="digest-panel">
            <div class="panbo-section-head">
              <span class="panbo-section-kicker">Sections</span>
              <h2>栏目导航</h2>
            </div>
            <div class="digest-section-grid">
              <a v-for="section in digestSections" :key="section.title" :href="section.href" class="digest-section-card">
                <strong>{{ section.title }}</strong>
                <span>{{ section.description }}</span>
                <em>{{ section.count }} 篇</em>
              </a>
            </div>
          </section>

          <section class="digest-panel">
            <div class="panbo-section-head">
              <span class="panbo-section-kicker">Beyond Tech</span>
              <h2>技术之外</h2>
            </div>
            <div class="digest-essay-stack">
              <a v-for="post in home.essays" :key="post.path" :href="post.path" class="digest-essay-card">
                <strong>{{ post.title }}</strong>
                <span>{{ post.excerpt }}</span>
              </a>
            </div>
          </section>

          <section class="digest-panel">
            <div class="panbo-section-head">
              <span class="panbo-section-kicker">Quick Access</span>
              <h2>精选入口</h2>
            </div>
            <div class="digest-link-stack">
              <a
                v-for="link in home.quickLinks"
                :key="link.title"
                :href="link.href"
                :target="link.external ? '_blank' : undefined"
                :rel="link.external ? 'noreferrer noopener' : undefined"
              >
                <strong>{{ link.title }}</strong>
                <span>{{ link.description }}</span>
              </a>
            </div>
          </section>
        </section>
      </div>

      <section class="digest-beats">
        <div class="panbo-section-head">
          <span class="panbo-section-kicker">Topic Beats</span>
          <h2>按技术主线快速跳转</h2>
        </div>
        <div class="digest-beat-grid">
          <a v-for="beat in digestBeats" :key="beat.title" :href="beat.href" class="digest-beat-card">
            <strong>{{ beat.title }}</strong>
            <span>{{ beat.sample }}</span>
            <em>{{ beat.count }} 篇</em>
          </a>
        </div>
      </section>

      <section class="digest-secondary-ribbon">
        <a
          v-for="feature in home.secondaryFeatures"
          :key="feature.title"
          :href="feature.href"
          class="digest-secondary-ribbon__item"
        >
          <strong>{{ feature.title }}</strong>
          <span>{{ feature.description }}</span>
        </a>
      </section>
    </section>

    <section class="panbo-home panbo-home--cyber">
      <div class="cyber-grid"></div>
      <div class="cyber-glow cyber-glow--top"></div>
      <div class="cyber-glow cyber-glow--bottom"></div>

      <div class="cyber-shell">
        <div class="cyber-content">
          <pre class="cyber-ascii" aria-label="panbo.space">{{ ASCII_ART }}</pre>
          <p class="cyber-tagline">
            &gt; Coding && Thinking <span class="blink">█</span>
          </p>

          <section class="cyber-terminal">
            <div class="cyber-terminal-header">
              <div class="cyber-terminal-dots"><span></span><span></span><span></span></div>
              <span class="cyber-terminal-title">panbo@blog ~ %</span>
            </div>
            <div class="cyber-terminal-body">
              <div class="cyber-terminal-cmd">whoami</div>
              <div class="cyber-terminal-output">
                <div><span class="key">name</span>: <span class="val">"Panbo"</span></div>
                <div><span class="key">role</span>: <span class="val">"Senior Full-Stack @ HSBC"</span></div>
                <div><span class="key">focus</span>: <span class="val">["System Design", "Backend", "Frontend"]</span></div>
                <div><span class="key">motto</span>: <span class="val">"学而时习之，不亦说乎？"</span></div>
              </div>
              <div class="cyber-terminal-cmd cyber-terminal-cmd--next">
                cat README.md <span class="cyber-terminal-cursor"></span>
              </div>
              <div class="cyber-terminal-output">
                <div class="comment">// 持续学习，持续输出。</div>
                <div class="comment">// 在技术探索的路上，记录每一次思考与成长。</div>
              </div>
            </div>
          </section>

          <section class="cyber-tech">
            <div class="cyber-section-title"><span class="prefix">$</span> npm list --depth=0</div>
            <ul class="cyber-tech-list">
              <li v-for="item in cyberTechStack" :key="item.name" class="cyber-tech-item">
                <span class="tree">{{ item.tree }}</span>
                <span class="name">{{ item.name }}</span>
                <span class="ver">@{{ item.ver }}</span>
              </li>
            </ul>
          </section>

          <section class="cyber-nav">
            <div class="cyber-section-title"><span class="prefix">$</span> ls -la ./sections</div>
            <ul class="cyber-nav-list">
              <li v-for="item in cyberNavItems" :key="item.arg" class="cyber-nav-item">
                <a :href="item.href" class="cyber-nav-link">
                  <span class="prompt">$</span>
                  <span class="cmd">{{ item.cmd }}</span>
                  <span class="arg">{{ item.arg }}</span>
                  <span class="desc"># {{ item.desc }}</span>
                </a>
              </li>
            </ul>
          </section>

          <section class="cyber-posts">
            <div class="cyber-section-title"><span class="prefix">$</span> git log --oneline -n 6</div>
            <ul class="cyber-post-list">
              <li v-for="post in cyberRecent" :key="post.path" class="cyber-post-item">
                <a :href="post.path" class="cyber-post-link">
                  <span class="cyber-post-hash">{{ post.hash }}</span>
                  <span class="cyber-post-title">{{ post.title }}</span>
                  <span class="cyber-post-meta">
                    <span class="tag">#{{ post.groupLabel }}</span>
                    ({{ post.updatedAt ?? 'recent' }})
                  </span>
                </a>
              </li>
            </ul>
          </section>

          <section class="cyber-social">
            <div class="cyber-section-title"><span class="prefix">$</span> cat .links</div>
            <div class="cyber-social-list">
              <a
                v-for="link in cyberSocialLinks"
                :key="link.title"
                :href="link.href"
                target="_blank"
                rel="noreferrer noopener"
                class="cyber-social-link"
              >
                {{ link.title }}
              </a>
            </div>
          </section>

          <footer class="cyber-footer">
            <p class="cyber-footer-text">/* Built with VitePress | panbo.space */</p>
          </footer>
        </div>
      </div>
    </section>

    <section class="panbo-home panbo-home--newspaper">
      <header class="newspaper-frontpage">
        <div class="newspaper-masthead">
          <div class="newspaper-masthead__meta">
            <span>Panbo Morning Edition</span>
            <span>Shanghai</span>
            <span>Est. 2024</span>
          </div>
          <p class="newspaper-masthead__kicker">editorials · feature stories · classifieds</p>
          <h1>panbo.space</h1>
          <p class="newspaper-masthead__deck">
            一份放进现代浏览器里的旧报纸：技术、系统设计与长期思考，以泛黄纸页与沉稳排版重新排版。
          </p>
        </div>

        <div class="newspaper-banner">
          <div class="newspaper-banner__lead">
            <p class="label">Feature Story</p>
            <a :href="newspaperLeadStories[0]?.href ?? '/archive'">
              <h2>{{ newspaperLeadStories[0]?.title ?? '持续记录技术实践与长期思考' }}</h2>
            </a>
            <p>
              {{ newspaperLeadStories[0]?.description ?? '从后端、分布式到前端，把复杂系统拆成可以复用的经验。' }}
            </p>
          </div>

          <div class="newspaper-banner__illustration" aria-hidden="true">
            <div class="newspaper-illustration"></div>
          </div>

          <div class="newspaper-banner__bulletin">
            <p class="label">Late Bulletin</p>
            <ul>
              <li v-for="post in newspaperDesk.slice(0, 3)" :key="post.path">
                <a :href="post.path">
                  <strong>{{ post.title }}</strong>
                  <span>{{ post.updatedAt ?? 'recent' }}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <div class="newspaper-sheet">
        <section class="newspaper-column newspaper-column--editorials">
          <div class="newspaper-heading">
            <span>Editorials</span>
            <h2>评论版</h2>
          </div>
          <a
            v-for="feature in newspaperEditorials"
            :key="feature.title"
            :href="feature.href"
            class="newspaper-editorial"
          >
            <strong>{{ feature.title }}</strong>
            <p>{{ feature.description }}</p>
          </a>
        </section>

        <section class="newspaper-column newspaper-column--features">
          <div class="newspaper-heading">
            <span>Feature Stories</span>
            <h2>专题深读</h2>
          </div>

          <article
            v-for="feature in newspaperLeadStories.slice(1)"
            :key="feature.title"
            class="newspaper-story"
          >
            <p class="eyebrow">{{ feature.eyebrow }}</p>
            <a :href="feature.href">
              <h3>{{ feature.title }}</h3>
            </a>
            <p>{{ feature.description }}</p>
            <span>{{ feature.meta }}</span>
          </article>

          <div class="newspaper-heading newspaper-heading--wire">
            <span>News Wire</span>
            <h2>最新文章</h2>
          </div>
          <ul class="newspaper-wire">
            <li v-for="post in newspaperDesk" :key="post.path">
              <a :href="post.path">
                <span class="group">{{ post.groupLabel }}</span>
                <strong>{{ post.title }}</strong>
                <span class="date">{{ post.updatedAt ?? 'recent' }}</span>
              </a>
            </li>
          </ul>
        </section>

        <aside class="newspaper-column newspaper-column--classifieds">
          <div class="newspaper-heading">
            <span>Classifieds</span>
            <h2>分类广告</h2>
          </div>
          <div class="newspaper-classifieds">
            <a
              v-for="link in newspaperClassifieds"
              :key="link.title"
              :href="link.href"
              :target="link.external ? '_blank' : undefined"
              :rel="link.external ? 'noreferrer noopener' : undefined"
              class="newspaper-classified"
            >
              <strong>{{ link.title }}</strong>
              <span>{{ link.description }}</span>
            </a>
          </div>

          <div class="newspaper-ledger">
            <p class="newspaper-ledger__title">Edition Facts</p>
            <div v-for="stat in home.stats" :key="stat.label" class="newspaper-ledger__row">
              <span>{{ stat.label }}</span>
              <strong>{{ stat.value }}</strong>
            </div>
          </div>
        </aside>
      </div>

      <section class="newspaper-index">
        <div class="newspaper-heading">
          <span>City Desk</span>
          <h2>栏目索引</h2>
        </div>
        <div class="newspaper-index__grid">
          <a v-for="item in newspaperArchive" :key="item.title" :href="item.href" class="newspaper-index__item">
            <strong>{{ item.title }}</strong>
            <p>{{ item.sample }}</p>
            <span>{{ item.count }} 篇</span>
          </a>
        </div>
      </section>
    </section>
  </div>
</template>
