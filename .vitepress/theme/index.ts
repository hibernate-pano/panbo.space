import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 添加阅读进度条
    if (typeof window !== 'undefined') {
      // 等待 DOM 加载完成
      document.addEventListener('DOMContentLoaded', () => {
        // 创建进度条容器
        const progressBar = document.createElement('div')
        progressBar.id = 'reading-progress-bar'
        progressBar.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 0%;
          height: 3px;
          background: linear-gradient(90deg, #2563EB, #3B82F6);
          z-index: 9999;
          transition: width 0.1s ease-out;
        `
        document.body.appendChild(progressBar)

        // 计算阅读进度
        const updateProgress = () => {
          const scrollTop = window.scrollY
          const docHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = (scrollTop / docHeight) * 100
          progressBar.style.width = progress + '%'
        }

        window.addEventListener('scroll', updateProgress, { passive: true })

        // 检测是否应该显示进度条（只在文档页面）
        const isDocPage = document.querySelector('.vp-doc')
        if (!isDocPage) {
          progressBar.style.display = 'none'
        }
      })
    }
  }
}
