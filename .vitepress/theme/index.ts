import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './base.css'
import './custom.css'
import '../theme-editorial/styles/editorial.css'
import '../theme-digest/styles/digest.css'
import '../theme-newspaper/styles/newspaper.css'
import ArchiveIndex from './components/ArchiveIndex.vue'
import ThemeHome from './components/ThemeHome.vue'
import NavThemeSwitcher from './NavThemeSwitcher.vue'

type ThemeId = 'editorial' | 'digest' | 'cyber' | 'newspaper'

type WindowWithPanbo = Window & {
  __PANBO_RUNTIME__?: boolean
}

const THEME_STORAGE_KEY = 'panbo-theme'
const DARK_STORAGE_KEY = 'panbo-dark-mode'

function setThemeClass(theme: ThemeId, isDark: boolean): void {
  const root = document.documentElement
  root.classList.remove('theme-editorial', 'theme-digest', 'theme-cyber', 'theme-newspaper')
  root.classList.add(`theme-${theme}`)
  root.classList.toggle('dark', isDark)
  root.dataset.panboTheme = theme
}

function resolveInitialState(): { theme: ThemeId; isDark: boolean } {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null
  const savedDark = localStorage.getItem(DARK_STORAGE_KEY)
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  return {
    theme: savedTheme === 'digest' || savedTheme === 'cyber' || savedTheme === 'editorial' || savedTheme === 'newspaper'
      ? savedTheme
      : 'editorial',
    isDark: savedDark === null ? systemDark : savedDark === 'true',
  }
}

function ensureProgressBar(): HTMLElement | null {
  const existing = document.querySelector<HTMLElement>('.panbo-progress__fill')
  if (existing) return existing

  const bar = document.createElement('div')
  bar.className = 'panbo-progress'
  bar.innerHTML = '<div class="panbo-progress__fill"></div>'
  document.body.appendChild(bar)

  return bar.querySelector<HTMLElement>('.panbo-progress__fill')
}

function syncScrollState(): void {
  const root = document.documentElement
  const fill = ensureProgressBar()
  const scrollable = root.scrollHeight - root.clientHeight
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0

  root.classList.toggle('panbo-scrolled', window.scrollY > 18)
  if (fill) {
    fill.style.transform = `scaleX(${progress})`
  }
}

function initRuntime(): void {
  const state = resolveInitialState()
  setThemeClass(state.theme, state.isDark)
  syncScrollState()

  window.addEventListener('scroll', syncScrollState, { passive: true })
  window.addEventListener('resize', syncScrollState)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (localStorage.getItem(DARK_STORAGE_KEY) !== null) return
    const currentTheme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null) ?? 'editorial'
    setThemeClass(currentTheme, event.matches)
    syncScrollState()
  })
  window.addEventListener('panbo-theme-change', syncScrollState)
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-features-after': () => h(ThemeHome),
      'nav-bar-content-after': () => h(NavThemeSwitcher),
    })
  },
  enhanceApp({ app }) {
    app.component('ArchiveIndex', ArchiveIndex)

    if (typeof window === 'undefined') return

    const runtimeWindow = window as WindowWithPanbo
    if (!runtimeWindow.__PANBO_RUNTIME__) {
      runtimeWindow.__PANBO_RUNTIME__ = true
      initRuntime()
    } else {
      syncScrollState()
    }
  },
}
