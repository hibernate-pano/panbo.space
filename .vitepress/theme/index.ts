import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Theme toggle - use .dark class
    if (typeof window !== 'undefined') {
      const initThemeToggle = () => {
        if (document.getElementById('custom-theme-toggle')) return
        
        const nav = document.querySelector('.VPNavBar')
        if (!nav) {
          setTimeout(initThemeToggle, 300)
          return
        }
        
        const toggle = document.createElement('div')
        toggle.id = 'custom-theme-toggle'
        toggle.innerHTML = `
          <button class="theme-btn" title="切换主题">
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          `
        
        const style = document.createElement('style')
        style.textContent = `
          #custom-theme-toggle {
            display: flex;
            align-items: center;
            margin: 0 8px;
          }
          #custom-theme-toggle .theme-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: 1px solid var(--vp-c-border);
            background: var(--vp-c-bg-soft);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          #custom-theme-toggle .theme-btn:hover {
            border-color: var(--vp-c-brand);
          }
          #custom-theme-toggle .sun-icon,
          #custom-theme-toggle .moon-icon {
            width: 18px;
            height: 18px;
            stroke: var(--vp-c-text-2);
          }
          /* 默认浅色模式显示月亮，深色模式显示太阳 */
          :root .sun-icon { display: none; }
          :root .moon-icon { display: block; }
          :root.dark .sun-icon { display: block; }
          :root.dark .moon-icon { display: none; }
        `
        document.head.appendChild(style)
        
        const actions = document.querySelector('.VPNavBarActions')
        if (actions) {
          actions.insertBefore(toggle, actions.firstChild)
        }
        
        // Toggle between light and dark
        toggle.querySelector('.theme-btn').addEventListener('click', () => {
          const isDark = document.documentElement.classList.contains('dark')
          if (isDark) {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
          } else {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
          }
        })
        
        // Initialize theme from localStorage
        const saved = localStorage.getItem('theme')
        if (saved === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          // Default is light, ensure dark is removed
          document.documentElement.classList.remove('dark')
        }
      }
      
      setTimeout(initThemeToggle, 500)
      setTimeout(initThemeToggle, 1000)
    }
    
    // Reading progress bar
    if (typeof window !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        const progressBar = document.createElement('div')
        progressBar.style.cssText = 'position:fixed;top:0;left:0;width:0%;height:3px;background:var(--vp-c-brand);z-index:9999;transition:width 0.1s'
        document.body.appendChild(progressBar)
        
        const update = () => {
          const scroll = window.scrollY
          const height = document.documentElement.scrollHeight - window.innerHeight
          progressBar.style.width = (scroll / height * 100) + '%'
        }
        window.addEventListener('scroll', update, { passive: true })
      })
    }
  }
}
