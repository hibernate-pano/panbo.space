<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Theme = 'cyber' | 'editorial' | 'digest' | 'newspaper'

const props = defineProps<{
  currentTheme?: Theme
}>()

const emit = defineEmits<{
  (e: 'change', theme: Theme): void
}>()

const activeTheme = ref<Theme>(props.currentTheme || 'editorial')

const themes: { id: Theme; label: string; icon: string }[] = [
  { id: 'editorial', label: 'READ', icon: '◉' },
  { id: 'digest', label: 'DIGEST', icon: '◎' },
  { id: 'newspaper', label: 'GAZETTE', icon: '◌' },
  { id: 'cyber', label: 'CYBER', icon: '◈' },
]

const switchTheme = (theme: Theme) => {
  activeTheme.value = theme
  localStorage.setItem('panbo-theme', theme)
  emit('change', theme)
}

onMounted(() => {
  const saved = localStorage.getItem('panbo-theme') as Theme | null
  if (saved && themes.some(t => t.id === saved)) {
    activeTheme.value = saved
  }
})
</script>

<template>
  <div class="theme-switcher">
    <button
      v-for="theme in themes"
      :key="theme.id"
      :class="['theme-btn', { active: activeTheme === theme.id }]"
      :title="`Switch to ${theme.label} theme`"
      @click="switchTheme(theme.id)"
    >
      <span class="theme-icon">{{ theme.icon }}</span>
      <span class="theme-label">{{ theme.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--vp-c-bg-soft, #f3f0ea);
  border: 1px solid var(--vp-c-border, #e0d9cf);
  border-radius: 6px;
}

.dark .theme-switcher {
  background: var(--vp-c-bg-soft, #252019);
  border-color: var(--vp-c-border, #3a332a);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--vp-font-family-mono, 'JetBrains Mono', monospace);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3, #9c938a);
  transition: all 0.2s ease;
}

.theme-btn:hover {
  color: var(--vp-c-text-2, #5c5650);
  background: var(--vp-c-bg-mute, #ece7df);
}

.dark .theme-btn:hover {
  color: var(--vp-c-text-2, #b8ad9f);
  background: var(--vp-c-bg-mute, #302a22);
}

.theme-btn.active {
  background: var(--vp-c-bg-elv, #ffffff);
  color: var(--vp-c-brand-1, #a85a32);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.dark .theme-btn.active {
  background: var(--vp-c-bg-elv, #2d2720);
  color: var(--vp-c-brand-1, #c4784a);
}

.theme-icon {
  font-size: 0.7rem;
}

.theme-label {
  font-weight: 600;
}
</style>
