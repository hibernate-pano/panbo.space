---
layout: home
---

<style>
/* ============================================
   数字斯多葛主义首页
   Digital Stoicism - Absolute Restraint
   ============================================ */

/* 隐藏默认 VitePress 元素 */
.home .VPHero,
.home .VPFeatures,
.home .VPContent > .container > .vp-doc > div:first-child,
.home .VPContent > .container > .vp-doc > h1 {
  display: none !important;
}

/* 主容器 */
.stoic-home {
  min-height: calc(100vh - var(--vp-nav-height));
  background: var(--vp-c-bg);
  padding: 0;
  margin: 0;
}

/* 网格背景 - 静态而非动画 */
.stoic-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.03;
  background-image:
    linear-gradient(var(--vp-c-text-2) 1px, transparent 1px),
    linear-gradient(90deg, var(--vp-c-text-2) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* 内容容器 */
.stoic-content {
  position: relative;
  z-index: 1;
  max-width: 65ch;
  margin: 0 auto;
  padding: 80px 24px;
}

/* Header - 类似代码注释 */
.stoic-header {
  margin-bottom: 64px;
  border-bottom: 1px solid var(--vp-c-border);
  padding-bottom: 24px;
}

.stoic-header::before {
  /* ============================================ */
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
  margin-bottom: 16px;
  letter-spacing: 0.05em;
}

.stoic-title {
  font-family: var(--vp-font-family-mono);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  letter-spacing: -0.03em;
  margin-bottom: 8px;
}

.stoic-subtitle {
  font-family: var(--vp-font-family-base);
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  font-style: italic;
}

/* Terminal 风格简介 */
.stoic-terminal {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  padding: 20px;
  margin-bottom: 48px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  line-height: 1.8;
}

.stoic-terminal::before {
  content: "> cat README.md";
  display: block;
  color: var(--vp-c-brand);
  margin-bottom: 12px;
}

.stoic-terminal-line {
  color: var(--vp-c-text-2);
  padding-left: 0;
}

.stoic-terminal-line::before {
  content: "$ ";
  color: var(--vp-c-text-3);
  margin-right: 8px;
}

/* 个人简介 */
.stoic-profile {
  margin-bottom: 48px;
}

.stoic-profile-title {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 16px;
}

.stoic-profile-title::before {
  content: "// ";
  color: var(--vp-c-brand);
}

.stoic-name {
  font-family: var(--vp-font-family-mono);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}

.stoic-role {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  color: var(--vp-c-brand);
  margin-bottom: 16px;
}

.stoic-motto {
  font-family: var(--vp-font-family-base);
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  border-left: 2px solid var(--vp-c-border);
  padding-left: 16px;
}

/* 技术栈 - 极简标签 */
.stoic-tech {
  margin-bottom: 48px;
}

.stoic-section-title {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 16px;
}

.stoic-section-title::before {
  content: "## ";
  color: var(--vp-c-brand);
}

.stoic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stoic-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  padding: 4px 10px;
}

/* 导航按钮 - 硬边矩形 */
.stoic-nav {
  margin-bottom: 48px;
}

.stoic-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.stoic-nav-item {
  margin-bottom: 8px;
}

.stoic-nav-link {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  text-decoration: none;
  padding: 8px 12px;
  border: 1px solid transparent;
}

.stoic-nav-link:hover {
  color: var(--vp-c-brand);
  border-color: var(--vp-c-border);
  background: var(--vp-c-bg-alt);
}

.stoic-nav-link::before {
  content: "[ ] ";
  color: var(--vp-c-text-3);
  margin-right: 8px;
}

.stoic-nav-link:hover::before {
  content: "[x] ";
  color: var(--vp-c-brand);
}

/* 最近文章 */
.stoic-posts {
  margin-bottom: 48px;
}

.stoic-post-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.stoic-post-item {
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 12px 0;
}

.stoic-post-item:last-child {
  border-bottom: none;
}

.stoic-post-link {
  display: block;
  text-decoration: none;
}

.stoic-post-title {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.stoic-post-link:hover .stoic-post-title {
  color: var(--vp-c-brand);
}

.stoic-post-meta {
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
}

.stoic-post-meta .category {
  color: var(--vp-c-brand);
}

.stoic-post-meta .category::before {
  content: "#";
}

/* 社交链接 - ASCII 风格 */
.stoic-social {
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-border);
  margin-top: 48px;
}

.stoic-social-title {
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.stoic-social-list {
  display: flex;
  gap: 16px;
}

.stoic-social-link {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.stoic-social-link:hover {
  color: var(--vp-c-brand);
  border-bottom-color: var(--vp-c-brand);
}

.stoic-social-link::after {
  content: " [->]";
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
}

/* 页脚 */
.stoic-footer {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-border);
  text-align: center;
}

.stoic-footer-text {
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  color: var(--vp-c-text-3);
}

.stoic-footer-text::before {
  content: "\2f\2a ";
}

.stoic-footer-text::after {
  content: " \2a\2f";
}

/* 响应式 */
@media (max-width: 768px) {
  .stoic-content {
    padding: 40px 16px;
  }

  .stoic-title {
    font-size: 1.4rem;
  }

  .stoic-header::before {
    font-size: 0.55rem;
  }

  .stoic-terminal {
    font-size: 0.7rem;
    padding: 16px;
  }

  .stoic-tags {
    gap: 6px;
  }

  .stoic-tag {
    font-size: 0.65rem;
    padding: 3px 8px;
  }
}
</style>

<!-- 数字斯多葛主义首页 -->
<div class="stoic-home">
  <div class="stoic-grid"></div>

  <div class="stoic-content">
    <!-- 头部 -->
    <header class="stoic-header">
      <h1 class="stoic-title">panbo.space</h1>
      <p class="stoic-subtitle">Coding && Thinking</p>
    </header>

    <!-- Terminal 风格自我介绍 -->
    <div class="stoic-terminal">
      <div class="stoic-terminal-line">Developer: Panbo</div>
      <div class="stoic-terminal-line">Focus: Java / React / System Design</div>
      <div class="stoic-terminal-line">Philosophy: 学而时习之</div>
    </div>

    <!-- 个人简介 -->
    <section class="stoic-profile">
      <h2 class="stoic-profile-title">About</h2>
      <p class="stoic-name">Panbo</p>
      <p class="stoic-role">Java && React Developer</p>
      <p class="stoic-motto">
        子曰：学而时习之，不亦说乎？<br>
        持续学习，持续输出，探索技术的边界
      </p>
    </section>

    <!-- 技术栈 -->
    <section class="stoic-tech">
      <h2 class="stoic-section-title">Tech Stack</h2>
      <div class="stoic-tags">
        <span class="stoic-tag">Java</span>
        <span class="stoic-tag">Spring Boot</span>
        <span class="stoic-tag">React</span>
        <span class="stoic-tag">Redis</span>
        <span class="stoic-tag">MySQL</span>
        <span class="stoic-tag">Kubernetes</span>
        <span class="stoic-tag">Docker</span>
      </div>
    </section>

    <!-- 导航 -->
    <nav class="stoic-nav">
      <h2 class="stoic-section-title">Navigation</h2>
      <ul class="stoic-nav-list">
        <li class="stoic-nav-item">
          <a href="/thinking/关于贫穷" class="stoic-nav-link">思考记录</a>
        </li>
        <li class="stoic-nav-item">
          <a href="/philosophy/尼采" class="stoic-nav-link">哲学专栏</a>
        </li>
        <li class="stoic-nav-item">
          <a href="/coding/Java/Java并发编程完全指南" class="stoic-nav-link">技术频道</a>
        </li>
        <li class="stoic-nav-item">
          <a href="/coding/HSBC/汇丰入职指南" class="stoic-nav-link">HSBC</a>
        </li>
        <li class="stoic-nav-item">
          <a href="/about" class="stoic-nav-link">关于</a>
        </li>
      </ul>
    </nav>

    <!-- 最近文章 -->
    <section class="stoic-posts">
      <h2 class="stoic-section-title">Recent Updates</h2>
      <ul class="stoic-post-list">
        <li class="stoic-post-item">
          <a href="/coding/React/React 入门系列课程" class="stoic-post-link">
            <h3 class="stoic-post-title">React 入门系列课程</h3>
            <p class="stoic-post-meta"><span class="category">React</span> · 2026</p>
          </a>
        </li>
        <li class="stoic-post-item">
          <a href="/coding/Redis/Redis 线程 IO 模型" class="stoic-post-link">
            <h3 class="stoic-post-title">Redis 线程 IO 模型</h3>
            <p class="stoic-post-meta"><span class="category">Redis</span> · 2026</p>
          </a>
        </li>
        <li class="stoic-post-item">
          <a href="/coding/Java/锁与并发控制/synchronized深入理解" class="stoic-post-link">
            <h3 class="stoic-post-title">synchronized 深入理解</h3>
            <p class="stoic-post-meta"><span class="category">Java</span> · 2026</p>
          </a>
        </li>
      </ul>
    </section>

    <!-- 社交链接 -->
    <section class="stoic-social">
      <h2 class="stoic-social-title">Connect</h2>
      <div class="stoic-social-list">
        <a href="https://github.com/hibernate-pano" target="_blank" class="stoic-social-link">GitHub</a>
        <a href="https://x.com/HibernatePano" target="_blank" class="stoic-social-link">Twitter</a>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="stoic-footer">
      <p class="stoic-footer-text">Built with VitePress</p>
    </footer>
  </div>
</div>
