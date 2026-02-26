import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Theme toggle - 纯文本符号
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
        // 使用纯文本符号
        toggle.innerHTML = `
          <button class="theme-btn" title="切换主题 / Toggle Theme">
            <span class="sun">[+]</span>
            <span class="moon">[-]</span>
          </button>
        `
        
        const style = document.createElement('style')
        style.textContent = `
          #custom-theme-toggle {
            display: flex;
            align-items: center;
            margin: 0 6px;
          }
          #custom-theme-toggle .theme-btn {
            width: 28px;
            height: 28px;
            border-radius: 2px;
            border: 1px solid var(--vp-c-border);
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--vp-font-family-mono);
            font-size: 0.9rem;
            color: var(--vp-c-text-2);
          }
          #custom-theme-toggle .theme-btn:hover {
            border-color: var(--vp-c-brand);
            color: var(--vp-c-brand);
          }
          :root .sun { display: inline; }
          :root .moon { display: none; }
          :root.dark .sun { display: none; }
          :root.dark .moon { display: inline; }
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
          document.documentElement.classList.remove('dark')
        }
      }
      
      setTimeout(initThemeToggle, 500)
      setTimeout(initThemeToggle, 1000)
    }
    
    // Reading progress bar - 纯文本风格
    if (typeof window !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        const progressBar = document.createElement('div')
        progressBar.style.cssText = 'position:fixed;top:0;left:0;width:0%;height:2px;background:var(--vp-c-brand);z-index:9999'
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
