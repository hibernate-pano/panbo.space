<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

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

const { theme } = useData()

const panbo = computed(() => theme.value.panbo as ThemeData)
const home = computed(() => panbo.value.home)
const archive = computed(() => panbo.value.archive)

const digestSections = computed(() =>
  archive.value.map((section) => ({
    title: section.title,
    description: section.description,
    count: section.groups.reduce((total, group) => total + group.count, 0),
    href: section.groups[0]?.posts[0]?.path ?? '/archive',
  })),
)

const cyberCommands = computed(() => [
  ...home.value.primaryFeatures.map((feature) => ({
    label: feature.title,
    href: feature.href,
    cmd: 'open',
    arg: feature.title.toLowerCase().replace(/\s+/g, '-'),
  })),
  {
    label: '总索引',
    href: '/archive',
    cmd: 'cat',
    arg: './archive',
  },
])
</script>

<template>
  <div class="panbo-home-wrap">
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
        <div>
          <p class="digest-kicker">Digest View</p>
          <h1>panbo.space</h1>
          <p>为高频浏览准备的知识索引视角，技术优先，辅以思考与哲学。</p>
        </div>
        <div class="digest-stat-board">
          <div v-for="stat in home.stats" :key="stat.label" class="digest-stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </header>

      <div class="digest-layout">
        <section class="digest-panel digest-panel--latest">
          <div class="panbo-section-head">
            <span class="panbo-section-kicker">Recently Updated</span>
            <h2>更新流</h2>
          </div>
          <ul class="digest-post-list">
            <li v-for="post in home.latest" :key="post.path">
              <a :href="post.path">
                <span class="group">{{ post.groupLabel }}</span>
                <span class="title">{{ post.title }}</span>
                <span class="date">{{ post.updatedAt ?? 'recent' }}</span>
              </a>
            </li>
          </ul>
        </section>

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
            <span class="panbo-section-kicker">Quick Access</span>
            <h2>精选入口</h2>
          </div>
          <div class="digest-essay-stack">
            <a v-for="post in home.essays" :key="post.path" :href="post.path" class="digest-essay-card">
              <strong>{{ post.title }}</strong>
              <span>{{ post.excerpt }}</span>
            </a>
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
      </div>
    </section>

    <section class="panbo-home panbo-home--cyber">
      <div class="cyber-shell">
        <header class="cyber-hero">
          <p class="cyber-kicker">$ whoami</p>
          <h1>panbo.space</h1>
          <p class="cyber-deck">
            Senior Full-Stack @ HSBC ｜ Java / React / Distributed Systems
          </p>
        </header>

        <div class="cyber-grid">
          <section class="cyber-panel">
            <div class="cyber-panel__title">$ ls ./tracks</div>
            <ul class="cyber-command-list">
              <li v-for="command in cyberCommands" :key="command.label">
                <a :href="command.href">
                  <span class="cmd">{{ command.cmd }}</span>
                  <span class="arg">{{ command.arg }}</span>
                  <span class="label">{{ command.label }}</span>
                </a>
              </li>
            </ul>
          </section>

          <section class="cyber-panel">
            <div class="cyber-panel__title">$ git log --oneline -n 6</div>
            <ul class="cyber-post-list">
              <li v-for="post in home.latest.slice(0, 6)" :key="post.path">
                <a :href="post.path">
                  <span class="hash">{{ post.commitShort ?? 'HEAD' }}</span>
                  <span class="title">{{ post.title }}</span>
                </a>
              </li>
            </ul>
          </section>

          <section class="cyber-panel">
            <div class="cyber-panel__title">$ cat ./notes</div>
            <div class="cyber-note-stack">
              <a v-for="post in home.essays.slice(0, 3)" :key="post.path" :href="post.path">
                <strong>{{ post.title }}</strong>
                <span>{{ post.excerpt }}</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>
