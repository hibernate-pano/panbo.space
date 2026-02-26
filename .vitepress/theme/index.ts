import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

/* @vue/runtime-core */
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-features-after': () => h('div', { class: 'stoic-home' }, [
        h('div', { class: 'stoic-grid' }),
        h('div', { class: 'stoic-content' }, [
          // Header
          h('header', { class: 'stoic-header' }, [
            h('h1', { class: 'stoic-title' }, 'panbo.space'),
            h('p', { class: 'stoic-subtitle' }, 'Coding && Thinking')
          ]),
          // Terminal
          h('div', { class: 'stoic-terminal' }, [
            h('div', { class: 'stoic-terminal-line' }, 'Developer: Panbo'),
            h('div', { class: 'stoic-terminal-line' }, 'Focus: Java / React / System Design'),
            h('div', { class: 'stoic-terminal-line' }, 'Philosophy: 学而时习之')
          ]),
          // Profile
          h('section', { class: 'stoic-profile' }, [
            h('h2', { class: 'stoic-profile-title' }, 'About'),
            h('p', { class: 'stoic-name' }, 'Panbo'),
            h('p', { class: 'stoic-role' }, 'Java && React Developer'),
            h('p', { class: 'stoic-motto' }, [
              '子曰：学而时习之，不亦说乎？',
              h('br'),
              '持续学习，持续输出，探索技术的边界'
            ])
          ]),
          // Tech Stack
          h('section', { class: 'stoic-tech' }, [
            h('h2', { class: 'stoic-section-title' }, 'Tech Stack'),
            h('div', { class: 'stoic-tags' }, [
              'Java', 'Spring Boot', 'React', 'Redis', 'MySQL', 'Kubernetes', 'Docker'
            ].map(tech => h('span', { class: 'stoic-tag' }, tech)))
          ]),
          // Navigation
          h('nav', { class: 'stoic-nav' }, [
            h('h2', { class: 'stoic-section-title' }, 'Navigation'),
            h('ul', { class: 'stoic-nav-list' }, [
              { text: '思考记录', link: '/thinking/关于贫穷' },
              { text: '哲学专栏', link: '/philosophy/尼采' },
              { text: '技术频道', link: '/coding/Java/Java并发编程完全指南' },
              { text: 'HSBC', link: '/coding/HSBC/汇丰入职指南' },
              { text: '关于', link: '/about' }
            ].map(item => h('li', { class: 'stoic-nav-item' },
              h('a', { href: item.link, class: 'stoic-nav-link' }, item.text)
            )))
          ]),
          // Recent Posts
          h('section', { class: 'stoic-posts' }, [
            h('h2', { class: 'stoic-section-title' }, 'Recent Updates'),
            h('ul', { class: 'stoic-post-list' }, [
              { title: 'React 入门系列课程', category: 'React', link: '/coding/React/React 入门系列课程', year: '2026' },
              { title: 'Redis 线程 IO 模型', category: 'Redis', link: '/coding/Redis/Redis 线程 IO 模型', year: '2026' },
              { title: 'synchronized 深入理解', category: 'Java', link: '/coding/Java/锁与并发控制/synchronized深入理解', year: '2026' }
            ].map(post => h('li', { class: 'stoic-post-item' },
              h('a', { href: post.link, class: 'stoic-post-link' }, [
                h('h3', { class: 'stoic-post-title' }, post.title),
                h('p', { class: 'stoic-post-meta' }, [
                  h('span', { class: 'category' }, post.category),
                  ' · ',
                  post.year
                ])
              ])
            )))
          ]),
          // Social
          h('section', { class: 'stoic-social' }, [
            h('h2', { class: 'stoic-social-title' }, 'Connect'),
            h('div', { class: 'stoic-social-list' }, [
              { text: 'GitHub', href: 'https://github.com/hibernate-pano' },
              { text: 'Twitter', href: 'https://x.com/HibernatePano' }
            ].map(link => h('a', { href: link.href, target: '_blank', class: 'stoic-social-link' }, link.text)))
          ]),
          // Footer
          h('footer', { class: 'stoic-footer' }, [
            h('p', { class: 'stoic-footer-text' }, 'Built with VitePress')
          ])
        ])
      ])
    })
  },
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

    // Reading progress bar
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
