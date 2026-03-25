<script setup lang="ts">
import { onMounted, ref } from 'vue'

type ThemeId = 'editorial' | 'digest' | 'cyber'

const THEME_STORAGE_KEY = 'panbo-theme'
const DARK_STORAGE_KEY = 'panbo-dark-mode'

const themes: Array<{ id: ThemeId; label: string }> = [
  { id: 'editorial', label: 'Read' },
  { id: 'digest', label: 'Digest' },
  { id: 'cyber', label: 'Cyber' },
]

const currentTheme = ref<ThemeId>('editorial')
const isDark = ref(false)

function applyTheme(theme: ThemeId, darkMode: boolean): void {
  const root = document.documentElement
  root.classList.remove('theme-editorial', 'theme-digest', 'theme-cyber')
  root.classList.add(`theme-${theme}`)
  root.classList.toggle('dark', darkMode)
  root.dataset.panboTheme = theme
  window.dispatchEvent(new CustomEvent('panbo-theme-change'))
}

function setTheme(theme: ThemeId): void {
  currentTheme.value = theme
  localStorage.setItem(THEME_STORAGE_KEY, theme)
  applyTheme(theme, isDark.value)
}

function toggleDarkMode(): void {
  isDark.value = !isDark.value
  localStorage.setItem(DARK_STORAGE_KEY, String(isDark.value))
  applyTheme(currentTheme.value, isDark.value)
}

onMounted(() => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null
  const savedDark = localStorage.getItem(DARK_STORAGE_KEY)

  if (savedTheme && themes.some((theme) => theme.id === savedTheme)) {
    currentTheme.value = savedTheme
  }

  if (savedDark === null) {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  } else {
    isDark.value = savedDark === 'true'
  }

  applyTheme(currentTheme.value, isDark.value)
})
</script>

<template>
  <div class="panbo-theme-switcher" aria-label="Theme switcher">
    <div class="panbo-theme-switcher__group" role="tablist" aria-label="Theme presets">
      <button
        v-for="theme in themes"
        :key="theme.id"
        :class="{ 'is-active': currentTheme === theme.id }"
        type="button"
        @click="setTheme(theme.id)"
      >
        {{ theme.label }}
      </button>
    </div>

    <button
      class="panbo-theme-switcher__mode"
      type="button"
      :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
      @click="toggleDarkMode"
    >
      {{ isDark ? '☾' : '☀' }}
    </button>
  </div>
</template>
