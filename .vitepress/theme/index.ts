import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Theme toggle
    if (typeof window !== 'undefined') {
      // 等待 VitePress 加载完成
      const initThemeToggle = () => {
        if (document.getElementById('custom-theme-toggle')) return
        
        const nav = document.querySelector('.VPNavBar')
        if (!nav) {
          setTimeout(initThemeToggle, 300)
          return
        }
        
        // 创建主题切换按钮
        const toggle = document.createElement('div')
        toggle.id = 'custom-theme-toggle'
        toggle.innerHTML = `
          <button class="theme-btn" title="切换主题">
            <span class="theme-icon sun">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            </span>
            <span class="theme-icon moon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </span>
          </button>
        `
        
        // 添加样式
        const style = document.createElement('style')
        style.textContent = `
          #custom-theme-toggle {
            display: flex;
            align-items: center;
            margin: 0 8px;
          }
          #custom-theme-toggle .theme-btn {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            border: 1px solid var(--vp-c-border);
            background: var(--vp-c-bg-soft);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }
          #custom-theme-toggle .theme-btn:hover {
            border-color: var(--vp-c-brand);
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(88, 166, 255, 0.2);
          }
          #custom-theme-toggle .theme-icon {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #custom-theme-toggle .theme-icon svg {
            width: 20px;
            height: 20px;
            stroke: var(--vp-c-text-2);
          }
          #custom-theme-toggle .sun {
            opacity: 0;
            transform: rotate(-90deg) scale(0.5);
          }
          #custom-theme-toggle .moon {
            opacity: 1;
            transform: rotate(0) scale(1);
          }
          :root:not(.light) #custom-theme-toggle .sun {
            opacity: 0;
            transform: rotate(-90deg) scale(0.5);
          }
          :root:not(.light) #custom-theme-toggle .moon {
            opacity: 1;
            transform: rotate(0) scale(1);
          }
          :root.light #custom-theme-toggle .sun {
            opacity: 1;
            transform: rotate(0) scale(1);
          }
          :root.light #custom-theme-toggle .moon {
            opacity: 0;
            transform: rotate(90deg) scale(0.5);
          }
          /* 确保按钮在导航栏正确位置 */
          .VPNavBarActions {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        `
        document.head.appendChild(style)
        
        // 添加到导航栏
        const actions = document.querySelector('.VPNavBarActions')
        if (actions) {
          actions.insertBefore(toggle, actions.firstChild)
        }
        
        // 点击切换主题
        toggle.querySelector('.theme-btn').addEventListener('click', () => {
          const isLight = document.documentElement.classList.contains('light')
          if (isLight) {
            document.documentElement.classList.remove('light')
            localStorage.setItem('theme', 'dark')
          } else {
            document.documentElement.classList.add('light')
            localStorage.setItem('theme', 'light')
          }
        })
        
        // 初始化主题状态
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme === 'light') {
          document.documentElement.classList.add('light')
        }
      }
      
      // 延迟初始化
      setTimeout(initThemeToggle, 500)
      setTimeout(initThemeToggle, 1000)
      setTimeout(initThemeToggle, 2000)
    }
    
    // 阅读进度条
    if (typeof window !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        const progressBar = document.createElement('div')
        progressBar.id = 'reading-progress-bar'
        progressBar.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 0%;
          height: 3px;
          background: linear-gradient(90deg, #3FB950, #58A6FF);
          z-index: 9999;
          transition: width 0.1s ease-out;
        `
        document.body.appendChild(progressBar)

        const updateProgress = () => {
          const scrollTop = window.scrollY
          const docHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = (scrollTop / docHeight) * 100
          progressBar.style.width = progress + '%'
        }

        window.addEventListener('scroll', updateProgress, { passive: true })

        const isDocPage = document.querySelector('.vp-doc')
        if (!isDocPage) {
          progressBar.style.display = 'none'
        }
      })
    }
  }
}
