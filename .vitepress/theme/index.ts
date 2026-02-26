import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Theme toggle functionality
    if (typeof window !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        // 创建主题切换按钮
        const createThemeToggle = () => {
          // 如果已经存在就不创建
          if (document.getElementById('theme-toggle-btn')) return
          
          const navBar = document.querySelector('.VPNavBar')
          if (!navBar) return
          
          const toggleBtn = document.createElement('button')
          toggleBtn.id = 'theme-toggle-btn'
          toggleBtn.className = 'theme-toggle'
          toggleBtn.title = '切换主题'
          toggleBtn.innerHTML = `
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          `
          toggleBtn.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: var(--vp-c-bg-soft, #21262D);
            border: 1px solid var(--vp-c-border, #30363D);
            cursor: pointer;
            transition: all 0.2s ease;
            margin: 0 8px;
          `
          
          // 点击切换主题
          toggleBtn.addEventListener('click', () => {
            const isLight = document.documentElement.classList.contains('light')
            if (isLight) {
              // 切换到深色
              document.documentElement.classList.remove('light')
              localStorage.setItem('theme', 'dark')
              toggleBtn.querySelector('.sun-icon').style.display = 'none'
              toggleBtn.querySelector('.moon-icon').style.display = 'block'
            } else {
              // 切换到亮色
              document.documentElement.classList.add('light')
              localStorage.setItem('theme', 'light')
              toggleBtn.querySelector('.sun-icon').style.display = 'block'
              toggleBtn.querySelector('.moon-icon').style.display = 'none'
            }
          })
          
          // 添加到导航栏
          const actionArea = navBar.querySelector('.VPNavBarActions')
          if (actionArea) {
            actionArea.insertBefore(toggleBtn, actionArea.firstChild)
          } else {
            navBar.appendChild(toggleBtn)
          }
          
          // 初始化主题状态
          const savedTheme = localStorage.getItem('theme')
          if (savedTheme === 'light') {
            document.documentElement.classList.add('light')
            toggleBtn.querySelector('.sun-icon').style.display = 'block'
            toggleBtn.querySelector('.moon-icon').style.display = 'none'
          } else {
            // 默认深色
            document.documentElement.classList.remove('light')
            toggleBtn.querySelector('.sun-icon').style.display = 'none'
            toggleBtn.querySelector('.moon-icon').style.display = 'block'
          }
        }
        
        // 延迟创建，确保导航栏加载完成
        setTimeout(createThemeToggle, 500)
        setTimeout(createThemeToggle, 1000)
        setTimeout(createThemeToggle, 2000)
      })
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
