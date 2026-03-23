<template>
  <div class="theme-switcher">
    <button
      class="theme-btn"
      :class="{ active: currentTheme === 'cyber' }"
      title="Cyberpunk 主题"
      @click="setTheme('cyber')"
    >
      <span class="theme-icon">◉</span>
      <span class="theme-name">CYBER</span>
    </button>
    <button
      class="theme-btn"
      :class="{ active: currentTheme === 'editorial' }"
      title="Editorial 主题"
      @click="setTheme('editorial')"
    >
      <span class="theme-icon">◎</span>
      <span class="theme-name">READ</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentTheme = ref('cyber')

function setTheme(theme: string) {
  currentTheme.value = theme
  localStorage.setItem('panbo-theme', theme)
  
  // Dispatch custom event for cross-theme communication
  window.dispatchEvent(new CustomEvent('panbo-theme-change', { detail: { theme } }))
  
  // Update active button immediately
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).classList.contains(theme === 'cyber' ? 'cyber' : 'editorial'))
  })
}

onMounted(() => {
  const saved = localStorage.getItem('panbo-theme')
  if (saved) {
    currentTheme.value = saved
  }
})
</script>

<style scoped>
.theme-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  cursor: pointer;
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-3);
  transition: all 0.2s ease;
  border-radius: 2px;
}

.theme-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.theme-btn.active {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-dim);
  color: var(--vp-c-brand);
}

.theme-icon {
  font-size: 0.8rem;
}

.theme-name {
  font-weight: 600;
}
</style>
