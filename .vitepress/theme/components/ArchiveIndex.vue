<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

type PostItem = {
  title: string
  path: string
  excerpt: string
  updatedAt: string | null
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

const { theme } = useData()
const sections = computed(() => (theme.value.panbo as { archive: ArchiveSection[] }).archive)
</script>

<template>
  <div class="panbo-archive">
    <header class="panbo-archive__hero">
      <p class="panbo-archive__kicker">Archive</p>
      <h1>总索引</h1>
      <p>按栏目、主题与文章入口浏览整个博客，不再依赖全站大侧边栏。</p>
    </header>

    <section v-for="section in sections" :key="section.key" class="panbo-archive__section">
      <div class="panbo-archive__section-head">
        <div>
          <p class="panbo-archive__section-kicker">{{ section.title }}</p>
          <h2>{{ section.description }}</h2>
        </div>
      </div>

      <div class="panbo-archive__group-grid">
        <article v-for="group in section.groups" :key="group.key" class="panbo-archive__group">
          <header>
            <div>
              <h3>{{ group.title }}</h3>
              <p>{{ group.count }} 篇</p>
            </div>
          </header>

          <ul>
            <li v-for="post in group.posts" :key="post.path">
              <a :href="post.path">
                <span class="title">{{ post.title }}</span>
                <span class="excerpt">{{ post.excerpt }}</span>
                <span class="date">{{ post.updatedAt ?? 'recent' }}</span>
              </a>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>
