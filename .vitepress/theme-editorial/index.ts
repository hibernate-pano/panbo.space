/**
 * Editorial Theme for panbo.space — Enhanced Edition
 * Warm Magazine Aesthetic with Full Dark Mode Support
 */
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './styles/editorial.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-info': () => null,
      'home-features-after': () => h('div', { class: 'editorial-home' }, [
        // Masthead
        h('div', { class: 'editorial-masthead-wrap' }, [
          h('div', { class: 'editorial-masthead-inner' }, [
            h('div', { class: 'editorial-issue-badge' }, [
              h('span', { class: 'badge-text' }, 'A Personal Blog'),
              h('span', { class: 'badge-sep' }, '·'),
              h('span', { class: 'badge-text' }, 'Est. 2024'),
            ]),
            h('h1', { class: 'editorial-blog-title' }, 'panbo.space'),
            h('p', { class: 'editorial-blog-subtitle' },
              'Coding && Thinking · 技术博客与思考记录'
            ),
            h('p', { class: 'editorial-blog-author' },
              'Full-Stack Developer @ HSBC · Java && React'
            ),
          ])
        ]),

        // Category Sections
        h('div', { class: 'editorial-body' }, [
          // Categories Grid
          h('section', { class: 'editorial-categories' }, [
            h('div', { class: 'editorial-categories-inner' }, [
              h('h2', { class: 'editorial-section-label' }, 'Explore'),
              h('div', { class: 'editorial-card-grid' }, [
                // Thinking
                h('a', { href: '/thinking/关于贫穷', class: 'editorial-feature-card', 'data-category': 'thinking' }, [
                  h('span', { class: 'card-emoji' }, '💭'),
                  h('h3', { class: 'card-heading' }, '思考'),
                  h('p', { class: 'card-description' }, '关于生活、金钱、人际的深度思考'),
                  h('span', { class: 'card-link' }, '探索 →'),
                ]),
                // Philosophy
                h('a', { href: '/philosophy/尼采', class: 'editorial-feature-card', 'data-category': 'philosophy' }, [
                  h('span', { class: 'card-emoji' }, '☦'),
                  h('h3', { class: 'card-heading' }, '哲学'),
                  h('p', { class: 'card-description' }, '尼采、叔本华、存在主义的探索'),
                  h('span', { class: 'card-link' }, '探索 →'),
                ]),
                // Coding
                h('a', { href: '/coding/Java/Java并发编程完全指南', class: 'editorial-feature-card', 'data-category': 'coding' }, [
                  h('span', { class: 'card-emoji' }, '⌘'),
                  h('h3', { class: 'card-heading' }, '技术'),
                  h('p', { class: 'card-description' }, 'Java、React、分布式系统的实践'),
                  h('span', { class: 'card-link' }, '探索 →'),
                ]),
              ])
            ])
          ]),

          // Recent Posts
          h('section', { class: 'editorial-recent' }, [
            h('div', { class: 'editorial-recent-inner' }, [
              h('h2', { class: 'editorial-section-label' }, 'Recently Updated'),
              h('ul', { class: 'editorial-post-list' }, [
                { title: 'React Router v6 完全指南', cat: '前端', date: '2026-03-22', link: '/coding/React/React-Router-v6完全指南-银行系统实战' },
                { title: 'SkyWalking APM 链路追踪实战', cat: '分布式', date: '2026-03-22', link: '/coding/分布式系统/SkyWalking银行APM链路追踪实战' },
                { title: 'REST API 版本管理策略', cat: '工程实践', date: '2026-03-22', link: '/coding/工程实践/REST-API版本管理策略-银行系统演进实践' },
                { title: 'Kubernetes 网络与 Ingress', cat: 'DevOps', date: '2026-03-21', link: '/coding/Kubernetes/Kubernetes网络与Ingress-银行K8s生产架构' },
                { title: 'Seata 分布式事务实战', cat: '分布式', date: '2026-03-21', link: '/coding/分布式系统/Seata分布式事务实战-AT模式与TCC模式选型' },
              ].map(post =>
                h('li', { class: 'editorial-post-item' },
                  h('a', { href: post.link, class: 'editorial-post-link' }, [
                    h('span', { class: 'post-cat' }, post.cat),
                    h('span', { class: 'post-title' }, post.title),
                    h('span', { class: 'post-date' }, post.date),
                  ])
                )
              ))
            ])
          ]),

          // Navigation
          h('section', { class: 'editorial-nav-section' }, [
            h('div', { class: 'editorial-nav-inner' }, [
              h('h2', { class: 'editorial-section-label' }, 'Navigate'),
              h('nav', { class: 'editorial-nav-grid' }, [
                { text: 'Thinking', href: '/thinking/关于贫穷', desc: '生活与思考记录' },
                { text: 'Philosophy', href: '/philosophy/尼采', desc: '哲学专栏' },
                { text: 'Java', href: '/coding/Java/Java并发编程完全指南', desc: '后端技术' },
                { text: 'React', href: '/coding/React/React 入门系列课程', desc: '前端技术' },
                { text: 'HSBC', href: '/coding/HSBC/汇丰入职指南', desc: '工作经验' },
                { text: 'About', href: '/about', desc: '关于我' },
              ].map(item =>
                h('a', { href: item.href, class: 'editorial-nav-item' }, [
                  h('span', { class: 'nav-text' }, item.text),
                  h('span', { class: 'nav-desc' }, item.desc),
                ])
              ))
            ])
          ]),
        ]),

        // Footer
        h('footer', { class: 'editorial-footer' }, [
          h('div', { class: 'editorial-footer-inner' }, [
            h('p', { class: 'footer-copy' }, 'panbo.space · Built with VitePress'),
            h('div', { class: 'footer-links' }, [
              h('a', { href: 'https://github.com/hibernate-pano', target: '_blank' }, 'GitHub'),
              h('a', { href: 'https://x.com/HibernatePano', target: '_blank' }, 'Twitter'),
            ])
          ])
        ])
      ])
    })
  },
  enhanceApp({ app }) {
    if (typeof window === 'undefined') return

    // Apply editorial class to root
    document.documentElement.classList.add('theme-editorial')

    // Reading progress bar
    const bar = document.createElement('div')
    bar.className = 'editorial-progress'
    bar.innerHTML = '<div class="editorial-progress-fill"></div>'
    Object.assign(bar.style, {
      position: 'fixed', top: 0, left: 0, right: 0, height: '2px',
      background: 'transparent', zIndex: 9999
    })
    document.body.appendChild(bar)

    const fill = bar.querySelector('.editorial-progress-fill') as HTMLElement
    if (fill) {
      fill.style.cssText = 'height:100%;background:linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-2));transition:width 0.08s linear'
      window.addEventListener('scroll', () => {
        const h = document.documentElement.scrollHeight - document.documentElement.clientHeight
        fill.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%'
      }, { passive: true })
    }

    // Dark mode transition observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Trigger custom event for theme transitions
          window.dispatchEvent(new CustomEvent('themeclasschange', {
            detail: {
              isDark: document.documentElement.classList.contains('dark')
            }
          }))
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
  }
}
