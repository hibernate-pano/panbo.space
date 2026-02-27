import { h, onMounted, ref } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

const ASCII_ART = `
 ██████╗  █████╗ ███╗   ██╗██████╗  ██████╗    ███████╗██████╗  █████╗  ██████╗███████╗
 ██╔══██╗██╔══██╗████╗  ██║██╔══██╗██╔═══██╗   ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝
 ██████╔╝███████║██╔██╗ ██║██████╔╝██║   ██║   ███████╗██████╔╝███████║██║     █████╗
 ██╔═══╝ ██╔══██║██║╚██╗██║██╔══██╗██║   ██║   ╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝
 ██║     ██║  ██║██║ ╚████║██████╔╝╚██████╔╝██╗███████║██║     ██║  ██║╚██████╗███████╗
 ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝`

/* @vue/runtime-core */
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-features-after': () => h('div', { class: 'cyber-home' }, [
        // Background effects
        h('div', { class: 'cyber-grid' }),
        h('div', { class: 'cyber-glow cyber-glow--top' }),
        h('div', { class: 'cyber-glow cyber-glow--bottom' }),

        h('div', { class: 'cyber-content' }, [
          // ASCII Art Header
          h('pre', { class: 'cyber-ascii', 'aria-label': 'panbo.space' }, ASCII_ART),
          h('p', { class: 'cyber-tagline' }, [
            '> Coding && Thinking ',
            h('span', { class: 'blink' }, '█')
          ]),

          // Terminal - $ whoami
          h('div', { class: 'cyber-terminal' }, [
            h('div', { class: 'cyber-terminal-header' }, [
              h('div', { class: 'cyber-terminal-dots' }, [
                h('span'), h('span'), h('span')
              ]),
              h('span', { class: 'cyber-terminal-title' }, 'panbo@blog ~ %')
            ]),
            h('div', { class: 'cyber-terminal-body' }, [
              h('div', { class: 'cyber-terminal-cmd' }, 'whoami'),
              h('div', { class: 'cyber-terminal-output' }, [
                h('div', null, [h('span', { class: 'key' }, 'name'), ': ', h('span', { class: 'val' }, '"Panbo"')]),
                h('div', null, [h('span', { class: 'key' }, 'role'), ': ', h('span', { class: 'val' }, '"Java && React Developer @ HSBC"')]),
                h('div', null, [h('span', { class: 'key' }, 'focus'), ': ', h('span', { class: 'val' }, '["System Design", "Backend", "Frontend"]')]),
                h('div', null, [h('span', { class: 'key' }, 'motto'), ': ', h('span', { class: 'val' }, '"学而时习之，不亦说乎？"')])
              ]),
              h('div', { class: 'cyber-terminal-cmd', style: 'margin-top: 12px' }, [
                'cat README.md',
                h('span', { class: 'cyber-terminal-cursor' })
              ]),
              h('div', { class: 'cyber-terminal-output' }, [
                h('div', { class: 'comment' }, '// 持续学习，持续输出。'),
                h('div', { class: 'comment' }, '// 在技术探索的路上，记录每一次思考与成长。')
              ])
            ])
          ]),

          // Tech Stack - npm list style
          h('section', { class: 'cyber-tech' }, [
            h('div', { class: 'cyber-section-title' }, [
              h('span', { class: 'prefix' }, '$'),
              ' npm list --depth=0'
            ]),
            h('ul', { class: 'cyber-tech-list' }, [
              { name: 'java', ver: '^21.0.0', tree: '├──' },
              { name: 'spring-boot', ver: '^3.2.0', tree: '├──' },
              { name: 'spring-cloud', ver: '^2023.0', tree: '├──' },
              { name: 'react', ver: '^18.3.0', tree: '├──' },
              { name: 'typescript', ver: '^5.4.0', tree: '├──' },
              { name: 'redis', ver: '^7.2.0', tree: '├──' },
              { name: 'mysql', ver: '^8.0.0', tree: '├──' },
              { name: 'docker', ver: '^25.0.0', tree: '├──' },
              { name: 'kubernetes', ver: '^1.29.0', tree: '├──' },
              { name: 'aws', ver: '^latest', tree: '└──' }
            ].map(tech =>
              h('li', { class: 'cyber-tech-item' }, [
                h('span', { class: 'tree' }, tech.tree),
                ' ',
                h('span', { class: 'name' }, tech.name),
                h('span', { class: 'ver' }, `@${tech.ver}`)
              ])
            ))
          ]),

          // Navigation - Terminal commands
          h('nav', { class: 'cyber-nav' }, [
            h('div', { class: 'cyber-section-title' }, [
              h('span', { class: 'prefix' }, '$'),
              ' ls -la ./sections'
            ]),
            h('ul', { class: 'cyber-nav-list' }, [
              { cmd: 'cd', arg: './thinking', desc: '思考记录', link: '/thinking/关于贫穷' },
              { cmd: 'cd', arg: './philosophy', desc: '哲学专栏', link: '/philosophy/尼采' },
              { cmd: 'cd', arg: './coding', desc: '技术频道', link: '/coding/Java/Java并发编程完全指南' },
              { cmd: 'cd', arg: './hsbc', desc: 'HSBC 工作', link: '/coding/HSBC/汇丰入职指南' },
              { cmd: 'cat', arg: './about.md', desc: '关于我', link: '/about' }
            ].map(item =>
              h('li', { class: 'cyber-nav-item' },
                h('a', { href: item.link, class: 'cyber-nav-link' }, [
                  h('span', { class: 'prompt' }, '$'),
                  h('span', { class: 'cmd' }, item.cmd),
                  h('span', { class: 'arg' }, item.arg),
                  ' ',
                  h('span', { style: 'color: var(--vp-c-text-3); font-size: 0.7rem' }, `# ${item.desc}`)
                ])
              )
            ))
          ]),

          // Recent Posts - git log style
          h('section', { class: 'cyber-posts' }, [
            h('div', { class: 'cyber-section-title' }, [
              h('span', { class: 'prefix' }, '$'),
              ' git log --oneline -n 3'
            ]),
            h('ul', { class: 'cyber-post-list' }, [
              { title: 'React 入门系列课程', category: 'React', link: '/coding/React/React 入门系列课程', hash: 'a3f7c21', date: '2026' },
              { title: 'Redis 线程 IO 模型', category: 'Redis', link: '/coding/Redis/Redis线程IO模型', hash: 'e9b4d08', date: '2026' },
              { title: 'synchronized 深入理解', category: 'Java', link: '/coding/Java/锁与并发控制/synchronized深入理解', hash: 'f2c8a15', date: '2026' }
            ].map(post =>
              h('li', { class: 'cyber-post-item' },
                h('a', { href: post.link, class: 'cyber-post-link' }, [
                  h('span', { class: 'cyber-post-hash' }, post.hash),
                  h('span', { class: 'cyber-post-title' }, post.title),
                  h('span', { class: 'cyber-post-meta' }, [
                    h('span', { class: 'tag' }, `#${post.category}`),
                    ` (${post.date})`
                  ])
                ])
              )
            ))
          ]),

          // Social
          h('section', { class: 'cyber-social' }, [
            h('div', { class: 'cyber-section-title' }, [
              h('span', { class: 'prefix' }, '$'),
              ' cat .links'
            ]),
            h('div', { class: 'cyber-social-list' }, [
              { text: 'GitHub', href: 'https://github.com/hibernate-pano' },
              { text: 'Twitter / X', href: 'https://x.com/HibernatePano' }
            ].map(link =>
              h('a', {
                href: link.href,
                target: '_blank',
                rel: 'noopener',
                class: 'cyber-social-link'
              }, link.text)
            ))
          ]),

          // Footer
          h('footer', { class: 'cyber-footer' }, [
            h('p', { class: 'cyber-footer-text' }, '/* Built with VitePress | panbo.space */')
          ])
        ])
      ])
    })
  },
  enhanceApp({ app }) {
    // Theme toggle - terminal style [DARK] / [LIGHT]
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
          <button class="theme-btn" title="Toggle Theme">
            <span class="dark-label">[DARK]</span>
            <span class="light-label">[LIGHT]</span>
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
            height: 28px;
            padding: 0 8px;
            border-radius: 0 !important;
            border: 1px solid var(--vp-c-border);
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--vp-font-family-mono);
            font-size: 0.65rem;
            color: var(--vp-c-text-2);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: all 0.2s ease;
          }
          #custom-theme-toggle .theme-btn:hover {
            border-color: var(--vp-c-brand);
            color: var(--vp-c-brand);
            box-shadow: 0 0 8px var(--cyber-glow);
          }
          :root .dark-label { display: none; }
          :root .light-label { display: inline; }
          :root.dark .dark-label { display: inline; }
          :root.dark .light-label { display: none; }
        `
        document.head.appendChild(style)

        const actions = document.querySelector('.VPNavBarActions')
        if (actions) {
          actions.insertBefore(toggle, actions.firstChild)
        }

        toggle.querySelector('.theme-btn')!.addEventListener('click', () => {
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
        } else if (saved === 'light') {
          document.documentElement.classList.remove('dark')
        }
      }

      setTimeout(initThemeToggle, 500)
      setTimeout(initThemeToggle, 1000)
    }

    // Reading progress bar - green glow
    if (typeof window !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        const progressBar = document.createElement('div')
        progressBar.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 0%;
          height: 2px;
          background: var(--vp-c-brand);
          z-index: 9999;
          box-shadow: 0 0 8px var(--cyber-glow);
          transition: width 0.1s linear;
        `
        document.body.appendChild(progressBar)

        const update = () => {
          const scroll = window.scrollY
          const height = document.documentElement.scrollHeight - window.innerHeight
          if (height > 0) {
            progressBar.style.width = (scroll / height * 100) + '%'
          }
        }
        window.addEventListener('scroll', update, { passive: true })
      })
    }
  }
}
