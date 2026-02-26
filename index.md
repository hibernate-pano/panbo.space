---
layout: page
title: 首页
---

<style>
/* ============================================
   数字斯多葛主义 (Digital Stoicism)
   UI Design: Absolute Restraint & Pure Logic

   1. 色彩体系：单色系与焦点
   2. 字体排印：哲学与代码的对话
   3. 空间布局：网格与边框
   4. 交互逻辑：目的驱动
   5. 视觉符号：ASCII与纯文本
   ============================================ */

/* ============================================
   CSS Variables - 色彩系统
   ============================================ */
:root, :root:not(.dark) {
  /* 浅色模式 - 羊皮纸 */
  --bg-primary:    #F4F4F0;
  --bg-secondary:  #EAEAE5;
  --bg-tertiary:   #E0E0DA;

  --text-primary:  #2C2C2C;
  --text-secondary:#5A5A55;
  --text-muted:    #8A8A85;

  /* 强调色 - 沉静蓝 */
  --accent:        #4682B4;
  --accent-light:  #6A9ED4;
  --accent-soft:  rgba(70, 130, 180, 0.1);

  --border:        #D0D0C8;
  --border-light:  #E0E0D8;

  /* 终端风格 */
  --terminal-green: #4AF626;

  /* 字体 */
  --font-serif-cn:   'Noto Serif SC', 'Songti SC', serif;
  --font-serif-en:  'EB Garamond', 'Times New Roman', serif;
  --font-mono:      'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

  --code-bg:       #E8E8E3;
  --code-border:   #D0D0C8;
}

:root.dark {
  /* 深色模式 - 深夜终端 */
  --bg-primary:    #121212;
  --bg-secondary:  #1A1A1D;
  --bg-tertiary:   #242428;

  --text-primary:  #E0E0E0;
  --text-secondary:#A0A0A0;
  --text-muted:    #606060;

  /* 强调色 - 终端绿 */
  --accent:        #4AF626;
  --accent-light:  #6AF846;
  --accent-soft:   rgba(74, 246, 38, 0.15);

  --border:        #2A2A2E;
  --border-light:  #3A3A40;

  /* 终端风格 */
  --terminal-green: #4AF626;

  /* 字体 */
  --font-serif-cn:   'Noto Serif SC', 'Songti SC', serif;
  --font-serif-en:  'EB Garamond', 'Times New Roman', serif;
  --font-mono:      'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

  --code-bg:       #1A1A1D;
  --code-border:   #2A2A2E;
}

/* ============================================
   Base Reset
   ============================================ */
html {
  color-scheme: light;
}

:root.dark html {
  color-scheme: dark;
}

body {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  font-family: var(--font-serif-cn);
  line-height: 1.7;
  margin: 0;
  padding: 0;
}

/* ============================================
   首页容器 - 去除VitePress默认布局
   ============================================ */
.home-page {
  min-height: 100vh;
  padding: 0;
  margin: 0;
  background: var(--bg-primary);
  position: relative;
}

/* 极简网格背景 */
.home-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--border-light) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-light) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

:root.dark .home-grid {
  background-image:
    linear-gradient(rgba(74, 246, 38, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 246, 38, 0.03) 1px, transparent 1px);
}

/* ============================================
   主内容区域 - 居中对齐
   ============================================ */
.home-content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  padding: 80px 24pxpx;
}

/* ============================================
   60 Header - 极简风格
   ============================================ */
.site-header {
  text-align: center;
  margin-bottom: 72px;
  padding-top: 40px;
}

.site-title {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.25em;
  text-transform: uppercase;
  margin-bottom: 24px;
}

.site-title::before {
  content: '/* ';
  color: var(--accent);
}

.site-title::after {
  content: ' */';
  color: var(--accent);
}

.name-title {
  font-family: var(--font-serif-en);
  font-size: 3.5rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  margin: 0 0 12px;
  line-height: 1.2;
}

.name-subtitle {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 24px;
  letter-spacing: 0.05em;
}

/* 哲学座右铭 */
.motto {
  font-family: var(--font-serif-cn);
  font-size: 1rem;
  color: var(--text-muted);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.9;
  position: relative;
  padding: 16px 0;
}

.motto::before {
  content: '「';
  font-family: var(--font-serif-en);
  font-size: 2rem;
  color: var(--accent);
  opacity: 0.4;
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
}

.motto::after {
  content: '」';
  font-family: var(--font-serif-en);
  font-size: 2rem;
  color: var(--accent);
  opacity: 0.4;
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
}

/* ============================================
   分割线 - ASCII 风格
   ============================================ */
.divider {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--border);
  text-align: center;
  margin: 48px 0;
  letter-spacing: 0.3em;
}

/* ============================================
   章节导航 - 极简边框风格
   ============================================ */
.sections-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  margin-bottom: 48px;
}

.section-card {
  background: var(--bg-primary);
  padding: 28px 20px;
  text-decoration: none;
  display: block;
  transition: background 0.15s ease;
}

.section-card:hover {
  background: var(--bg-secondary);
}

.section-icon {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--accent);
  margin-bottom: 12px;
  display: block;
}

.section-title {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-desc {
  font-family: var(--font-serif-cn);
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ============================================
   终端风格自我介绍
   ============================================ */
.terminal-block {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 20px 24px;
  margin-bottom: 40px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.terminal-dot {
  width: 8px;
  height: 8px;
  border-radius: 0;
}

.dot-red { background: #C23B22; }
.dot-yellow { background: #C9A227; }
.dot-green { background: var(--terminal-green); }

.terminal-title {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-left: 8px;
}

.terminal-line {
  color: var(--text-secondary);
  line-height: 1.9;
  display: flex;
  align-items: flex-start;
}

.terminal-line::before {
  content: '$';
  color: var(--accent);
  margin-right: 10px;
  flex-shrink: 0;
}

.terminal-line .comment {
  color: var(--text-muted);
  font-style: italic;
}

/* ============================================
   技术栈 - 标签风格
   ============================================ */
.tech-section {
  margin-bottom: 40px;
}

.section-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 16px;
  display: block;
}

.section-label::before {
  content: '# ';
  color: var(--accent);
}

.tech-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-tag {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 5px 12px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.tech-tag:hover {
  border-color: var(--accent);
  color: var(--accent);
  cursor: default;
}

/* ============================================
   链接区块 - 纯文本风格
   ============================================ */
.links-section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

.link-item {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  transition: color 0.15s ease;
}

.link-item::before {
  content: '->';
  color: var(--accent);
  font-size: 0.7rem;
}

.link-item:hover {
  color: var(--accent);
}

.link-item[href^="http"]::after {
  content: ' [ext]';
  font-size: 0.65rem;
  color: var(--text-muted);
}

/* ============================================
   底部引用
   ============================================ */
.footer-quote {
  text-align: center;
  margin-top: 56px;
  font-family: var(--font-serif-en);
  font-style: italic;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.footer-quote::before {
  content: '—— ';
}

.footer-quote::after {
  content: ' ——';
}

/* ============================================
   响应式设计
   ============================================ */
@media (max-width: 768px) {
  .home-content {
    padding: 48px 16px 40px;
  }

  .name-title {
    font-size: 2.5rem;
  }

  .motto {
    font-size: 0.9rem;
  }

  .sections-grid {
    grid-template-columns: 1fr;
    gap: 1px;
  }

  .section-card {
    padding: 24px 16px;
  }

  .terminal-block {
    font-size: 0.75rem;
    padding: 16px;
  }

  .home-grid {
    background-size: 30px 30px;
  }
}

/* ============================================
   减少动画 (Accessibility)
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
</style>

<!-- 首页内容 -->
<div class="home-page">
  <div class="home-grid"></div>

  <div class="home-content">
    <!-- Header -->
    <header class="site-header">
      <p class="site-title">panbo.space</p>
      <h1 class="name-title">Panbo</h1>
      <p class="name-subtitle">Java Engineer & Philosophy Enthusiast</p>
      <p class="motto">
        偶尔思考，偶尔编码<br>
        在代码中寻找秩序，在哲学中寻找意义
      </p>
    </header>

    <!-- 分割线 -->
    <p class="divider">/* --- */</p>

    <!-- 章节导航 -->
    <nav class="sections-grid">
      <a href="/coding/" class="section-card">
        <span class="section-icon">[CODE]</span>
        <h3 class="section-title">技术记录</h3>
        <p class="section-desc">Java、架构、数据库<br>与代码为伴的日常</p>
      </a>

      <a href="/philosophy/" class="section-card">
        <span class="section-icon">[PHI]</span>
        <h3 class="section-title">哲学专栏</h3>
        <p class="section-desc">尼采、康德、存在主义<br>思考人类处境与意义</p>
      </a>

      <a href="/thinking/" class="section-card">
        <span class="section-icon">[IDEA]</span>
        <h3 class="section-title">思考碎片</h3>
        <p class="section-desc">生活感悟、读书笔记<br>灵光一现的记录</p>
      </a>
    </nav>

    <!-- 终端风格自我介绍 -->
    <div class="terminal-block">
      <div class="terminal-header">
        <span class="terminal-dot dot-red"></span>
        <span class="terminal-dot dot-yellow"></span>
        <span class="terminal-dot dot-green"></span>
        <span class="terminal-title">about-me.sh</span>
      </div>
      <div class="terminal-line">
        <span class="comment"># 一名普通的程序员，喜欢写代码和思考</span>
      </div>
      <div class="terminal-line">
        <span class="comment"># 相信技术可以改变世界</span>
      </div>
      <div class="terminal-line">
        <span class="comment"># 但更相信思考的力量</span>
      </div>
      <div class="terminal-line">
        <span class="comment"># 学而时习之，不亦说乎</span>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="tech-section">
      <span class="section-label">Tech Stack</span>
      <div class="tech-grid">
        <span class="tech-tag">Java</span>
        <span class="tech-tag">Spring</span>
        <span class="tech-tag">React</span>
        <span class="tech-tag">MySQL</span>
        <span class="tech-tag">Redis</span>
        <span class="tech-tag">Docker</span>
        <span class="tech-tag">K8s</span>
        <span class="tech-tag">Git</span>
      </div>
    </div>

    <!-- 链接 -->
    <nav class="links-section">
      <a href="https://github.com/hibernate-pano" target="_blank" class="link-item">GitHub</a>
      <a href="https://x.com/HibernatePano" target="_blank" class="link-item">Twitter/X</a>
      <a href="/about" class="link-item">About</a>
    </nav>

    <!-- 底部引用 -->
    <p class="footer-quote">学而时习之，不亦说乎</p>
  </div>
</div>
