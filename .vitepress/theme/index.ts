import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Theme toggle functionality
    if (typeof window !== 'undefined') {
      const initThemeToggle = () => {
        if (document.getElementById('custom-theme-toggle')) return

        const nav = document.querySelector('.VPNavBar')
        if (!nav) {
          setTimeout(initThemeToggle, 300)
          return
        }

        // Create theme toggle button
        const toggle = document.createElement('div')
        toggle.id = 'custom-theme-toggle'
        toggle.innerHTML = `
          <button class="theme-btn" title="Toggle Theme" aria-label="Toggle Theme">
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
        `

        // Inject styles
        const style = document.createElement('style')
        style.textContent = `
          #custom-theme-toggle {
            display: flex;
            align-items: center;
            margin: 0 12px;
          }
          #custom-theme-toggle .theme-btn {
            width: 36px;
            height: 36px;
            border: 1px solid var(--border);
            background: var(--bg-tertiary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: none;
            border-radius: 2px;
          }
          #custom-theme-toggle .theme-btn:hover {
            border-color: var(--accent);
          }
          #custom-theme-toggle .sun-icon,
          #custom-theme-toggle .moon-icon {
            width: 16px;
            height: 16px;
            stroke: var(--text-secondary);
            transition: none;
          }
          #custom-theme-toggle .theme-btn:hover .sun-icon,
          #custom-theme-toggle .theme-btn:hover .moon-icon {
            stroke: var(--accent);
          }
          :root .sun-icon { display: block; }
          :root .moon-icon { display: none; }
          :root.dark .sun-icon { display: none; }
          :root.dark .moon-icon { display: block; }
        `
        document.head.appendChild(style)

        const actions = document.querySelector('.VPNavBarActions')
        if (actions) {
          actions.insertBefore(toggle, actions.firstChild)
        }

        // Toggle theme
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

        // Initialize theme
        const saved = localStorage.getItem('theme')
        if (saved === 'dark') {
          document.documentElement.classList.add('dark')
        } else if (saved === 'light') {
          document.documentElement.classList.remove('dark')
        } else {
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
          } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
          }
        }
      }

      setTimeout(initThemeToggle, 500)

      // Reading progress bar - simple style
      document.addEventListener('DOMContentLoaded', () => {
        const progressBar = document.createElement('div')
        progressBar.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 0%;
          height: 2px;
          background: var(--accent);
          z-index: 9999;
          transition: none;
        `
        document.body.appendChild(progressBar)

        const update = () => {
          const scroll = window.scrollY
          const height = document.documentElement.scrollHeight - window.innerHeight
          const progress = height > 0 ? (scroll / height * 100) : 0
          progressBar.style.width = progress + '%'
        }
        window.addEventListener('scroll', update, { passive: true })
      })
    }
  }
}
