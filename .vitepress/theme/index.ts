import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Theme toggle functionality
    if (typeof window !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        const createThemeToggle = () => {
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
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          `
          
          // Position styles
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
            margin-left: 12px;
            flex-shrink: 0;
          `
          
          // Icon styles
          const sunIcon = toggleBtn.querySelector('.sun-icon')
          const moonIcon = toggleBtn.querySelector('.moon-icon')
          if (sunIcon) sunIcon.style.cssText = 'width:18px;height:18px;stroke:var(--vp-c-text-2);display:none;'
          if (moonIcon) moonIcon.style.cssText = 'width:18px;height:18px;stroke:var(--vp-c-text-2);'
          
          toggleBtn.addEventListener('click', () => {
            const isLight = document.documentElement.classList.contains('light')
            if (isLight) {
              document.documentElement.classList.remove('light')
              localStorage.setItem('theme', 'dark')
              if (sunIcon) sunIcon.style.display = 'none'
              if (moonIcon) moonIcon.style.display = 'block'
            } else {
              document.documentElement.classList.add('light')
              localStorage.setItem('theme', 'light')
              if (sunIcon) sunIcon.style.display = 'block'
              if (moonIcon) moonIcon.style.display = 'none'
            }
          })
          
          // Find the correct place in nav bar
          const actionArea = navBar.querySelector('.VPNavBarActions')
          if (actionArea) {
            const themeContainer = document.createElement('div')
            themeContainer.style.cssText = 'display:flex;align-items:center;'
            themeContainer.appendChild(toggleBtn)
            actionArea.insertBefore(themeContainer, actionArea.firstChild)
          }
          
          // Initialize theme
          const savedTheme = localStorage.getItem('theme')
          if (savedTheme === 'light') {
            document.documentElement.classList.add('light')
            if (sunIcon) sunIcon.style.display = 'block'
            if (moonIcon) moonIcon.style.display = 'none'
          } else {
            if (sunIcon) sunIcon.display = 'none'
            if (moonIcon) moonIcon.style.display = 'block'
          }
        }
        
        setTimeout(createThemeToggle, 500)
        setTimeout(createThemeToggle, 1000)
        setTimeout(createThemeToggle, 2000)
      })
    }
    
    // Reading progress bar
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
