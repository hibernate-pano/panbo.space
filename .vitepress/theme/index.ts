import { h, onMounted, ref, computed } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

// Reading time calculation
function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const textLength = text.replace(/<[^>]*>/g, '').length
  return Math.ceil(textLength / wordsPerMinute)
}

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
    // All interactions need to run in browser only
    if (typeof window === 'undefined') return

    // ===== Page Loading Animation =====
    const removeLoadingScreen = () => {
      const loader = document.getElementById('cyber-loader')
      if (loader) {
        loader.style.opacity = '0'
        loader.style.transition = 'opacity 0.4s ease'
        setTimeout(() => loader.remove(), 400)
      }
    }

    // Create loading screen
    const createLoader = () => {
      if (document.getElementById('cyber-loader')) return

      const loader = document.createElement('div')
      loader.id = 'cyber-loader'
      loader.innerHTML = `
        <div class="loading-terminal">
          <div class="loading-line" style="--line-index: 0">> initializing...</div>
          <div class="loading-line" style="--line-index: 1">> loading modules</div>
          <div class="loading-line" style="--line-index: 2">> rendering page<span class="loading-cursor">█</span></div>
        </div>
      `
      loader.style.cssText = `
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--vp-c-bg);
        z-index: 9999;
        font-family: var(--vp-font-family-mono);
      `
      document.body.appendChild(loader)

      // Remove on load
      if (document.readyState === 'complete') {
        setTimeout(removeLoadingScreen, 600)
      } else {
        window.addEventListener('load', () => setTimeout(removeLoadingScreen, 600))
      }
    }

    // Delay loader to avoid flash on fast loads
    setTimeout(createLoader, 100)

    // ===== Create Keyboard Navigation Indicator =====
    const createKeyboardIndicator = () => {
      if (document.getElementById('keyboard-nav-indicator')) return

      const indicator = document.createElement('div')
      indicator.id = 'keyboard-nav-indicator'
      indicator.className = 'keyboard-nav-indicator'
      indicator.innerHTML = `
        <span class="nav-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </span>
      `
      document.body.appendChild(indicator)
    }
    setTimeout(createKeyboardIndicator, 500)

    // ===== Scroll-triggered Animations =====
    const initScrollAnimations = () => {
      const animatedElements = document.querySelectorAll(
        '.vp-doc h2, .vp-doc h3, .vp-doc p, .vp-doc ul, .vp-doc ol, .vp-doc blockquote, .vp-doc pre, .vp-doc table, .vp-doc img'
      )

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer.unobserve(entry.target)
            }
          })
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        }
      )

      animatedElements.forEach((el) => {
        el.classList.add('scroll-animate')
        observer.observe(el)
      })
    }

    setTimeout(initScrollAnimations, 800)

    // ===== Enhanced Keyboard Navigation =====
    const initKeyboardNav = () => {
      // Show keyboard navigation indicator when Tab is pressed
      let tabPressed = false
      const indicator = document.querySelector('.keyboard-nav-indicator')

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          tabPressed = true
          if (indicator) {
            indicator.classList.add('visible')
          }
        }
      })

      document.addEventListener('click', () => {
        if (tabPressed) {
          tabPressed = false
          setTimeout(() => {
            if (indicator) {
              indicator.classList.remove('visible')
            }
          }, 2000)
        }
      })

      // Keyboard shortcuts
      const handleKeyNav = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT' ||
            (e.target as HTMLElement).tagName === 'TEXTAREA') return

        const shortcuts: Record<string, () => void> = {
          // Navigation
          'h': () => {
            const homeLink = document.querySelector('a[href="/"]') as HTMLAnchorElement
            homeLink?.click()
          },
          // Search
          'f': () => {
            const searchInput = document.querySelector('.VPLocalSearchBox input') as HTMLInputElement
            searchInput?.focus()
          },
          // Next heading
          'j': () => {
            const nextHeading = document.querySelector('.VPDocOutlineItem.is-active + .VPDocOutlineItem a') as HTMLAnchorElement
            nextHeading?.click()
          },
          // Previous heading
          'k': () => {
            const prevItem = document.querySelector('.VPDocOutlineItem.is-active')?.previousElementSibling as HTMLElement
            const prevLink = prevItem?.querySelector('a') as HTMLAnchorElement
            prevLink?.click()
          }
        }

        const key = e.key.toLowerCase()
        if (shortcuts[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          shortcuts[key]()
        }
      }

      document.addEventListener('keydown', handleKeyNav)
    }

    setTimeout(initKeyboardNav, 1200)

    // ===== Touch Gesture Support =====
    const initTouchGestures = () => {
      let touchStartY = 0
      let touchEndY = 0

      document.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY
      }, { passive: true })

      document.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY
        handleSwipe()
      }, { passive: true })

      const handleSwipe = () => {
        const swipeThreshold = 100
        const diff = touchStartY - touchEndY

        // Swipe up - scroll to top
        if (diff > swipeThreshold) {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }

      // Show swipe hint on mobile
      if (window.innerWidth <= 768) {
        const showSwipeHint = () => {
          const hint = document.createElement('div')
          hint.className = 'swipe-up-hint'
          hint.textContent = '↑ swipe up to top'
          document.body.appendChild(hint)

          setTimeout(() => hint.classList.add('visible'), 3000)
          setTimeout(() => {
            hint.classList.remove('visible')
            setTimeout(() => hint.remove(), 300)
          }, 6000)
        }

        // Only show once per session
        if (!sessionStorage.getItem('swipeHintShown')) {
          sessionStorage.setItem('swipeHintShown', 'true')
          setTimeout(showSwipeHint, 5000)
        }
      }
    }

    setTimeout(initTouchGestures, 1500)

    // Theme toggle - terminal style [DARK] / [LIGHT]
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

    // ===== Enhanced Interactions =====

    // 1. Smooth scrolling for anchor links with highlight
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (link && link.hash && link.hash.startsWith('#')) {
        const id = link.hash.slice(1)
        const el = document.getElementById(id)
        if (el) {
          e.preventDefault()

          // Remove previous highlight
          document.querySelectorAll('.anchor-highlight').forEach(el => {
            el.classList.remove('anchor-highlight')
          })

          // Add highlight to target
          el.classList.add('anchor-highlight')

          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          history.pushState(null, '', link.hash)

          // Remove highlight after animation
          setTimeout(() => {
            el.classList.remove('anchor-highlight')
          }, 2000)
        }
      }
    })

    // 2. Back to top button
    const backToTop = document.createElement('div')
    backToTop.id = 'back-to-top'
    backToTop.innerHTML = '↑ TOP'
    backToTop.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      background: var(--vp-c-bg-soft);
      border: 1px solid var(--vp-c-brand);
      color: var(--vp-c-brand);
      font-family: var(--vp-font-family-mono);
      font-size: 0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9998;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 0 12px var(--cyber-glow);
      writing-mode: horizontal-tb;
      letter-spacing: 0.05em;
    `
    document.body.appendChild(backToTop)

    const updateBackToTop = () => {
      if (window.scrollY > 300) {
        backToTop.style.opacity = '1'
        backToTop.style.transform = 'translateY(0)'
      } else {
        backToTop.style.opacity = '0'
        backToTop.style.transform = 'translateY(20px)'
      }
    }
    window.addEventListener('scroll', updateBackToTop, { passive: true })

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })

    backToTop.addEventListener('mouseenter', () => {
      backToTop.style.background = 'var(--vp-c-brand)'
      backToTop.style.color = 'var(--vp-c-bg)'
    })
    backToTop.addEventListener('mouseleave', () => {
      backToTop.style.background = 'var(--vp-c-bg-soft)'
      backToTop.style.color = 'var(--vp-c-brand)'
    })

    // ===== Floating Action Button (FAB) =====
    const initFAB = () => {
      const fabContainer = document.createElement('div')
      fabContainer.className = 'fab-container'

      // Home button
      const homeBtn = document.createElement('button')
      homeBtn.className = 'fab-btn'
      homeBtn.innerHTML = '⌂'
      homeBtn.title = 'Home'
      homeBtn.innerHTML += '<span class="tooltip">Home</span>'
      homeBtn.addEventListener('click', () => {
        window.location.href = '/'
      })

      // Random article button
      const randomBtn = document.createElement('button')
      randomBtn.className = 'fab-btn'
      randomBtn.innerHTML = '⚄'
      randomBtn.title = 'Random Article'
      randomBtn.innerHTML += '<span class="tooltip">Random</span>'
      randomBtn.addEventListener('click', () => {
        // Get all article links from sidebar
        const links = document.querySelectorAll('.VPSidebar a')
        if (links.length > 0) {
          const randomLink = links[Math.floor(Math.random() * links.length)] as HTMLAnchorElement
          randomLink.click()
        }
      })

      fabContainer.appendChild(homeBtn)
      fabContainer.appendChild(randomBtn)
      document.body.appendChild(fabContainer)
    }
    setTimeout(initFAB, 2000)

    // 3. Image lightbox
    const lightbox = document.createElement('div')
    lightbox.id = 'image-lightbox'
    lightbox.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: zoom-out;
      opacity: 0;
      transition: opacity 0.25s ease;
    `
    lightbox.innerHTML = '<img src="" alt="" style="max-width: 90vw; max-height: 90vh; object-fit: contain; border: 1px solid var(--vp-c-brand); box-shadow: 0 0 40px var(--cyber-glow);">'
    document.body.appendChild(lightbox)

    const lightboxImg = lightbox.querySelector('img') as HTMLImageElement

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && !target.closest('.vp-code-group')) {
        const img = target as HTMLImageElement
        lightboxImg.src = img.src
        lightboxImg.alt = img.alt
        lightbox.style.display = 'flex'
        requestAnimationFrame(() => {
          lightbox.style.opacity = '1'
        })
        e.preventDefault()
      }
    })

    lightbox.addEventListener('click', () => {
      lightbox.style.opacity = '0'
      setTimeout(() => {
        lightbox.style.display = 'none'
        lightboxImg.src = ''
      }, 250)
    })

    // 4. Keyboard shortcuts
    const shortcuts: Record<string, () => void> = {
      't': () => document.getElementById('custom-theme-toggle')?.querySelector('button')?.click(),
      'g': () => {
        const search = document.querySelector('.VPLocalSearchBox input') as HTMLInputElement
        search?.focus()
      },
      'Escape': () => {
        if (lightbox.style.display === 'flex') {
          lightbox.click()
        }
        // Close keyboard shortcuts modal
        const modal = document.querySelector('.keyboard-shortcuts-modal') as HTMLElement
        if (modal?.classList.contains('visible')) {
          modal.classList.remove('visible')
        }
      },
      '?': () => {
        // Show keyboard shortcuts modal
        let modal = document.querySelector('.keyboard-shortcuts-modal') as HTMLElement
        if (!modal) {
          modal = document.createElement('div')
          modal.className = 'keyboard-shortcuts-modal'
          modal.innerHTML = `
            <div class="modal-content">
              <h3>⌨ Keyboard Shortcuts</h3>
              <div class="shortcut-row"><span>Search</span><kbd>g</kbd></div>
              <div class="shortcut-row"><span>Theme</span><kbd>t</kbd></div>
              <div class="shortcut-row"><span>Home</span><kbd>h</kbd></div>
              <div class="shortcut-row"><span>Next heading</span><kbd>j</kbd></div>
              <div class="shortcut-row"><span>Prev heading</span><kbd>k</kbd></div>
              <div class="shortcut-row"><span>Fullscreen code</span><kbd>Esc</kbd></div>
            </div>
          `
          document.body.appendChild(modal)

          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              modal.classList.remove('visible')
            }
          })
        }
        modal.classList.toggle('visible')
      }
    }

    document.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key.toLowerCase()
      if (shortcuts[key]) {
        shortcuts[key]()
      }
    })

    // ===== Search Results Keyboard Navigation =====
    const initSearchKeyboardNav = () => {
      document.addEventListener('keydown', (e) => {
        const searchBox = document.querySelector('.VPLocalSearchBox')
        if (!searchBox) return

        const searchInput = searchBox.querySelector('input') as HTMLInputElement
        const isSearchFocused = document.activeElement === searchInput

        // Arrow keys work when search is focused or results are visible
        if (!isSearchFocused && !searchBox.querySelector('.result-item')) return

        const resultItems = Array.from(searchBox.querySelectorAll('.result-item')) as HTMLElement[]
        if (resultItems.length === 0) return

        const currentIndex = resultItems.findIndex(item =>
          item.classList.contains('is-focus') || item.classList.contains('selected')
        )

        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          const nextIndex = currentIndex < resultItems.length - 1 ? currentIndex + 1 : 0
          resultItems.forEach(item => item.classList.remove('is-focus', 'selected'))
          resultItems[nextIndex].classList.add('is-focus', 'selected')
          resultItems[nextIndex].scrollIntoView({ block: 'nearest' })
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : resultItems.length - 1
          resultItems.forEach(item => item.classList.remove('is-focus', 'selected'))
          resultItems[prevIndex].classList.add('is-focus', 'selected')
          resultItems[prevIndex].scrollIntoView({ block: 'nearest' })
        } else if (e.key === 'Enter' && currentIndex >= 0) {
          e.preventDefault()
          const link = resultItems[currentIndex].querySelector('a')
          if (link) {
            (link as HTMLAnchorElement).click()
          }
        }
      })
    }
    setTimeout(initSearchKeyboardNav, 1500)

    // Keyboard shortcuts hint
    const shortcutsHint = document.createElement('div')
    shortcutsHint.id = 'shortcuts-hint'
    shortcutsHint.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      font-family: var(--vp-font-family-mono);
      font-size: 0.6rem;
      color: var(--vp-c-text-3);
      opacity: 0.5;
      z-index: 9997;
    `
    shortcutsHint.innerHTML = '⌨ t:theme g:search'
    document.body.appendChild(shortcutsHint)

    // 5. Reading time display
    const updateReadingTime = () => {
      const content = document.querySelector('.vp-doc')
      const existing = document.getElementById('reading-time')
      if (!content || existing) return

      const text = content.textContent || ''
      const minutes = calculateReadingTime(text)

      const timeDisplay = document.createElement('div')
      timeDisplay.id = 'reading-time'
      timeDisplay.style.cssText = `
        position: fixed;
        top: 58px;
        right: 24px;
        font-family: var(--vp-font-family-mono);
        font-size: 0.65rem;
        color: var(--vp-c-text-3);
        background: var(--vp-c-bg-soft);
        padding: 4px 10px;
        border: 1px solid var(--vp-c-border);
        z-index: 9997;
      `
      timeDisplay.innerHTML = `📖 ${minutes} min read`

      const nav = document.querySelector('.VPNav')
      if (nav) {
        nav.parentNode?.insertBefore(timeDisplay, nav.nextSibling)
      }
    }
    setTimeout(updateReadingTime, 1000)

    // 5b. Reading progress percentage
    const initReadingProgress = () => {
      const existing = document.getElementById('reading-progress-percent')
      if (existing) return

      const progressDisplay = document.createElement('div')
      progressDisplay.id = 'reading-progress-percent'
      progressDisplay.innerHTML = `
        <div class="progress-bar" style="--progress: 0%"></div>
        <span class="percent">0%</span>
      `
      progressDisplay.style.cssText = `
        position: fixed;
        top: 58px;
        right: 140px;
        font-family: var(--vp-font-family-mono);
        font-size: 0.7rem;
        color: var(--vp-c-text-3);
        background: var(--vp-c-bg-soft);
        padding: 4px 10px;
        border: 1px solid var(--vp-c-border);
        z-index: 9997;
        display: flex;
        align-items: center;
        gap: 8px;
      `

      const nav = document.querySelector('.VPNav')
      if (nav) {
        nav.parentNode?.insertBefore(progressDisplay, nav.nextSibling)
      }

      const updateProgress = () => {
        const scroll = window.scrollY
        const height = document.documentElement.scrollHeight - window.innerHeight
        const percent = height > 0 ? Math.round((scroll / height) * 100) : 0

        const progressBar = progressDisplay.querySelector('.progress-bar') as HTMLElement
        const percentText = progressDisplay.querySelector('.percent') as HTMLElement

        if (progressBar) {
          progressBar.style.setProperty('--progress', `${percent}%`)
        }
        if (percentText) {
          percentText.textContent = `${percent}%`
        }
      }

      window.addEventListener('scroll', updateProgress, { passive: true })
    }
    setTimeout(initReadingProgress, 1200)

    // 5c. Code block fullscreen
    const initCodeFullscreen = () => {
      const codeBlocks = document.querySelectorAll('.vp-doc div[class*="language-"]')

      codeBlocks.forEach((block) => {
        const container = block.parentElement
        if (!container) return

        // Check if fullscreen button already exists
        if (container.querySelector('.fullscreen-btn')) return

        const fullscreenBtn = document.createElement('button')
        fullscreenBtn.className = 'fullscreen-btn'
        fullscreenBtn.innerHTML = '⛶'
        fullscreenBtn.title = 'Fullscreen'
        fullscreenBtn.style.cssText = `
          position: absolute;
          top: 8px;
          right: 48px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--vp-c-border);
          color: var(--vp-c-text-3);
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s ease;
          z-index: 10;
        `

        fullscreenBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          block.classList.toggle('fullscreen')

          if (block.classList.contains('fullscreen')) {
            document.body.style.overflow = 'hidden'
          } else {
            document.body.style.overflow = ''
          }
        })

        container.style.position = 'relative'
        container.appendChild(fullscreenBtn)
      })

      // ESC to exit fullscreen
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const fullscreenBlock = document.querySelector('.vp-doc div[class*="language-"].fullscreen') as HTMLElement
          if (fullscreenBlock) {
            fullscreenBlock.classList.remove('fullscreen')
            document.body.style.overflow = ''
          }
        }
      })
    }
    setTimeout(initCodeFullscreen, 1500)

    // 5d. Image lazy loading with placeholder
    const initImageLazyLoad = () => {
      const images = document.querySelectorAll('.vp-doc img[loading="lazy"]')

      images.forEach((img) => {
        const image = img as HTMLImageElement

        // Add placeholder class
        image.setAttribute('data-placeholder', 'true')

        image.addEventListener('load', () => {
          image.removeAttribute('data-placeholder')
          image.classList.add('loaded')
        })

        image.addEventListener('error', () => {
          image.classList.add('error')
        })
      })

      // Progressive image loading
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              if (img.dataset.src) {
                img.src = img.dataset.src
                img.removeAttribute('data-src')
              }
              imageObserver.unobserve(img)
            }
          })
        })

        document.querySelectorAll('.vp-doc img[data-src]').forEach((img) => {
          imageObserver.observe(img)
        })
      }
    }
    setTimeout(initImageLazyLoad, 1000)

    // 5e. Sidebar collapse memory
    const initSidebarMemory = () => {
      const sidebarItems = document.querySelectorAll('.VPSidebarItem button')

      sidebarItems.forEach((button) => {
        const item = button.closest('.VPSidebarItem')
        const text = item?.querySelector('.text')?.textContent

        if (!text) return

        // Check localStorage for saved state
        const savedState = localStorage.getItem(`sidebar-${text}`)

        if (savedState === 'collapsed') {
          item?.classList.add('is-collapsed')
        }

        button.addEventListener('click', () => {
          item?.classList.toggle('is-collapsed')

          const isCollapsed = item?.classList.contains('is-collapsed')
          localStorage.setItem(`sidebar-${text}`, isCollapsed ? 'collapsed' : 'expanded')
        })
      })
    }
    setTimeout(initSidebarMemory, 1100)

    // 6. Better TOC - highlight current section
    const observeTOC = () => {
      const outline = document.querySelector('.VPDocOutline')
      if (!outline) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              document.querySelectorAll('.VPDocOutlineItem').forEach((item) => {
                item.classList.remove('is-active')
              })
              const id = entry.target.getAttribute('id')
              const activeItem = document.querySelector(`.VPDocOutlineItem a[href="#${id}"]`)?.closest('.VPDocOutlineItem')
              activeItem?.classList.add('is-active')
            }
          })
        },
        { rootMargin: '-100px 0px -66%' }
      )

      document.querySelectorAll('.vp-doc h2, .vp-doc h3').forEach((heading) => {
        observer.observe(heading)
      })
    }
    setTimeout(observeTOC, 1500)

    // ===== Image Zoom Lightbox =====
    const initImageZoom = () => {
      if (document.querySelector('.image-zoom-init')) return
      document.body.classList.add('image-zoom-init')

      const images = document.querySelectorAll('.vp-doc img')
      images.forEach(img => {
        (img as HTMLElement).dataset.zoomable = 'true'
      })

      const handleZoom = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.matches('.vp-doc img[data-zoomable]')) return

        if (target.classList.contains('zoomed')) {
          target.classList.remove('zoomed')
          document.body.style.overflow = ''
        } else {
          target.classList.add('zoomed')
          document.body.style.overflow = 'hidden'
        }
      }

      document.addEventListener('click', handleZoom)

      // Close zoom on Escape
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          const zoomed = document.querySelector('.vp-doc img.zoomed')
          if (zoomed) {
            zoomed.classList.remove('zoomed')
            document.body.style.overflow = ''
          }
        }
      })
    }

    setTimeout(initImageZoom, 1500)

    // Toast notification system
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      const existing = document.querySelector('.cyber-toast')
      if (existing) existing.remove()

      const toast = document.createElement('div')
      toast.className = `cyber-toast ${type}`
      toast.textContent = message
      document.body.appendChild(toast)

      requestAnimationFrame(() => {
        toast.classList.add('show')
      })

      setTimeout(() => {
        toast.classList.remove('show')
        setTimeout(() => toast.remove(), 300)
      }, 2500)
    }

    // Enhanced copy button with toast
    const initCopyToast = () => {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const copyBtn = target.closest('.vp-code-copy')
        if (copyBtn) {
          setTimeout(() => {
            if ((copyBtn as HTMLElement).classList.contains('copied')) {
              showToast('Copied to clipboard!')
            }
          }, 100)
        }
      })
    }
    setTimeout(initCopyToast, 500)

    // Navbar hide on scroll with scrolled state
    const initNavHideOnScroll = () => {
      const nav = document.querySelector('.VPNav')
      const navBar = document.querySelector('.VPNavBar')
      if (!nav || !navBar) return

      let lastScrollY = window.scrollY
      let ticking = false

      const updateNav = () => {
        const currentScrollY = window.scrollY

        // Add scrolled class when past threshold
        if (currentScrollY > 50) {
          navBar.classList.add('scrolled')
        } else {
          navBar.classList.remove('scrolled')
        }

        if (currentScrollY > 100) {
          if (currentScrollY > lastScrollY) {
            // Scrolling down - hide nav
            nav.classList.add('scroll-down')
            nav.classList.remove('nav-visible')
          } else {
            // Scrolling up - show nav
            nav.classList.remove('scroll-down')
            nav.classList.add('nav-visible')
          }
        } else {
          nav.classList.remove('scroll-down')
          nav.classList.add('nav-visible')
        }

        lastScrollY = currentScrollY
        ticking = false
      }

      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(updateNav)
          ticking = true
        }
      }, { passive: true })
    }
    setTimeout(initNavHideOnScroll, 600)

    // TOC back to top button
    const initTOCBackToTop = () => {
      const outline = document.querySelector('.VPDocOutline')
      if (!outline) return

      const backToTop = document.createElement('button')
      backToTop.className = 'back-to-top'
      backToTop.textContent = 'BACK TO TOP'

      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })

      outline.appendChild(backToTop)
    }
    setTimeout(initTOCBackToTop, 700)

    // Enhanced bottom progress bar
    const initBottomProgress = () => {
      const existing = document.getElementById('progress-bar-bottom')
      if (existing) return

      const progressContainer = document.createElement('div')
      progressContainer.id = 'progress-bar-bottom'
      progressContainer.innerHTML = `
        <div class="progress-fill">
          <div class="progress-glow"></div>
        </div>
      `
      progressContainer.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--vp-c-bg-alt);
        z-index: 9999;
      `
      document.body.appendChild(progressContainer)

      const progressFill = progressContainer.querySelector('.progress-fill') as HTMLElement

      const updateProgress = () => {
        const scroll = window.scrollY
        const height = document.documentElement.scrollHeight - window.innerHeight
        const percent = height > 0 ? (scroll / height * 100) : 0
        progressFill.style.width = percent + '%'
      }

      window.addEventListener('scroll', updateProgress, { passive: true })
    }
    setTimeout(initBottomProgress, 800)

    // ===== Konami Code Easter Egg =====
    const initKonamiCode = () => {
      const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'Keyb', 'Keya']
      let konamiIndex = 0

      document.addEventListener('keydown', (e) => {
        if (e.code === konamiCode[konamiIndex]) {
          konamiIndex++
          if (konamiIndex === konamiCode.length) {
            // Activate easter egg
            const overlay = document.createElement('div')
            overlay.className = 'konami-activated'
            overlay.innerHTML = `
              <div class="konami-message">
                <h1>🎉 KONAMI CODE</h1>
                <p style="font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2);">
                  You found the easter egg! <br>
                  <span style="color: var(--vp-c-brand);">> cd /cheatsheet && ./unlock_bonus.sh</span>
                </p>
              </div>
            `
            document.body.appendChild(overlay)
            setTimeout(() => {
              overlay.addEventListener('click', () => overlay.remove())
            }, 2000)
            konamiIndex = 0
          }
        } else {
          konamiIndex = 0
        }
      })
    }

    setTimeout(initKonamiCode, 3000)

    // ===== Smooth Image Loading =====
    const initSmoothImageLoad = () => {
      const images = document.querySelectorAll('.vp-doc img')
      images.forEach(img => {
        if (img.complete) {
          img.classList.add('loaded')
        } else {
          img.addEventListener('load', () => {
            img.classList.add('loaded')
          })
        }
      })
    }

    setTimeout(initSmoothImageLoad, 1500)

    // ===== Heading Anchor Click Feedback =====
    const initAnchorFeedback = () => {
      document.querySelectorAll('.vp-doc a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          const targetId = this.getAttribute('href')
          if (!targetId || targetId === '#') return

          const target = document.querySelector(targetId)
          if (target) {
            e.preventDefault()
            target.scrollIntoView({ behavior: 'smooth', block: 'start' })

            // Update URL without jump
            history.pushState(null, '', targetId)

            // Flash feedback
            target.style.transition = 'background-color 0.3s ease'
            target.style.backgroundColor = 'var(--cyber-glow)'
            setTimeout(() => {
              target.style.backgroundColor = ''
            }, 1000)
          }
        })
      })
    }

    setTimeout(initAnchorFeedback, 2000)

    // ===== Scroll to Top Button Enhancement =====
    const initScrollButtonEnhancement = () => {
      const scrollBtn = document.querySelector('#back-to-top')
      if (!scrollBtn) return

      // Change icon on hover
      scrollBtn.addEventListener('mouseenter', () => {
        scrollBtn.textContent = '↑'
      })

      scrollBtn.addEventListener('mouseleave', () => {
        scrollBtn.textContent = ''
      })
    }

    setTimeout(initScrollButtonEnhancement, 2500)

    // ===== Cursor Trail Effect =====
    const initCursorEffect = () => {
      if (window.matchMedia('(hover: none)').matches) return

      const cursorDot = document.createElement('div')
      cursorDot.className = 'cursor-dot'
      document.body.appendChild(cursorDot)

      const cursorOutline = document.createElement('div')
      cursorOutline.className = 'cursor-outline'
      document.body.appendChild(cursorOutline)

      let mouseX = 0, mouseY = 0
      let dotX = 0, dotY = 0
      let outlineX = 0, outlineY = 0

      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX
        mouseY = e.clientY
      })

      const animate = () => {
        // Smooth follow with easing
        dotX += (mouseX - dotX) * 0.5
        dotY += (mouseY - dotY) * 0.5
        outlineX += (mouseX - outlineX) * 0.2
        outlineY += (mouseY - outlineY) * 0.2

        cursorDot.style.left = dotX + 'px'
        cursorDot.style.top = dotY + 'px'
        cursorOutline.style.left = outlineX + 'px'
        cursorOutline.style.top = outlineY + 'px'

        requestAnimationFrame(animate)
      }

      animate()

      // Hide when leaving window
      document.addEventListener('mouseleave', () => {
        cursorDot.style.display = 'none'
        cursorOutline.style.display = 'none'
      })

      document.addEventListener('mouseenter', () => {
        cursorDot.style.display = 'block'
        cursorOutline.style.display = 'block'
      })
    }

    setTimeout(initCursorEffect, 3000)

    // ===== Page Transition Handler =====
    const initPageTransition = () => {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const link = target.closest('a') as HTMLAnchorElement

        if (link && link.href && link.href.startsWith(window.location.origin)) {
          // Add transition class
          document.body.style.opacity = '0'
          document.body.style.transition = 'opacity 0.2s ease'
        }
      })
    }

    setTimeout(initPageTransition, 2000)

    // Reading progress bar - green glow
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