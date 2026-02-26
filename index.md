---
layout: home
---

<style>
/* ============================================
   首页隐藏默认元素
   ============================================ */
.VPHero,
.home .VPFeatures,
.home .VPContent > .container > .vp-doc > div:first-child,
.home .VPContent > .container > .vp-doc > h1 {
  display: none !important;
}

/* ============================================
   自定义首页容器
   ============================================ */
.custom-home {
  min-height: calc(100vh - 56px);
  padding: 0;
  margin: 0;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

/* 极简网格背景 */
.home-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.6;
}

/* 哲学装饰元素 - 柏拉图图形 */
.philosophy-decoration {
  position: absolute;
  opacity: 0.08;
}

.decoration-circle {
  width: 300px;
  height: 300px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  top: 10%;
  left: -100px;
}

.decoration-square {
  width: 200px;
  height: 200px;
  border: 1px solid var(--accent);
  bottom: 20%;
  right: -50px;
}

.decoration-triangle {
  width: 0;
  height: 0;
  border-left: 80px solid transparent;
  border-right: 80px solid transparent;
  border-bottom: 140px solid var(--accent);
  opacity: 0.05;
  top: 40%;
  right: 15%;
}

/* ============================================
   主内容区域
   ============================================ */
.home-content {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 80px 24px;
}

/* 欢迎标语 */
.welcome-section {
  text-align: center;
  margin-bottom: 64px;
}

.welcome-text {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-muted);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.welcome-text::before {
  content: '◈ ';
  color: var(--accent);
}

.welcome-text::after {
  content: ' ◈';
  color: var(--accent);
}

/* 名字标题 */
.name-title {
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.03em;
  margin-bottom: 8px;
  line-height: 1.1;
}

.name-subtitle {
  font-family: var(--font-serif-en);
  font-size: 1.25rem;
  color: var(--text-secondary);
  font-style: italic;
  margin-bottom: 16px;
}

/* 哲学座右铭 */
.motto {
  font-family: var(--font-serif-cn);
  font-size: 1.05rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.8;
  position: relative;
  padding: 20px 0;
}

.motto::before {
  content: '「';
  font-family: var(--font-display);
  font-size: 3rem;
  color: var(--accent);
  opacity: 0.3;
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  line-height: 1;
}

.motto::after {
  content: '」';
  font-family: var(--font-display);
  font-size: 3rem;
  color: var(--accent);
  opacity: 0.3;
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  line-height: 1;
}

/* ============================================
   章节导航
   ============================================ */
.sections-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 56px;
}

.section-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 28px 24px;
  text-decoration: none;
  display: block;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.section-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.section-card:hover {
  border-color: var(--accent-soft);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.section-card:hover::before {
  transform: scaleX(1);
}

.section-icon {
  font-size: 1.5rem;
  margin-bottom: 12px;
  display: block;
}

.section-title {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: 0.05em;
}

.section-desc {
  font-family: var(--font-serif-cn);
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* 特殊颜色 - 哲学 */
.section-card.philosophy .section-icon {
  color: #B8922A;
}

.section-card.philosophy:hover {
  border-color: rgba(184, 146, 42, 0.3);
}

/* 特殊颜色 - 技术 */
.section-card.tech .section-icon {
  color: #5B8DEF;
}

.section-card.tech:hover {
  border-color: rgba(91, 141, 239, 0.3);
}

/* 特殊颜色 - 思考 */
.section-card.thinking .section-icon {
  color: #9B6DC6;
}

.section-card.thinking:hover {
  border-color: rgba(155, 109, 198, 0.3);
}

/* ============================================
   终端风格介绍
   ============================================ */
.terminal-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 48px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.terminal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-1 { background: #E06C75; }
.dot-2 { background: #E5C07B; }
.dot-3 { background: #98C379; }

.terminal-title {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-left: 8px;
}

.terminal-line {
  color: var(--text-secondary);
  line-height: 1.8;
  display: flex;
  align-items: flex-start;
}

.terminal-line::before {
  content: '$';
  color: var(--accent);
  margin-right: 12px;
  flex-shrink: 0;
}

.terminal-line .comment {
  color: var(--text-muted);
  font-style: italic;
}

/* ============================================
   技术栈
   ============================================ */
.tech-section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.section-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.section-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  white-space: nowrap;
}

.tech-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tech-tag {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 14px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.tech-tag:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ============================================
   社交链接
   ============================================ */
.social-section {
  text-align: center;
  padding-top: 32px;
  border-top: 1px solid var(--border);
  margin-top: 48px;
}

.social-links {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.social-link {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.25s ease;
}

.social-link:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-2px);
}

.social-link svg {
  width: 18px;
  height: 18px;
}

/* 底部引用 */
.footer-quote {
  text-align: center;
  margin-top: 32px;
  font-family: var(--font-serif-en);
  font-style: italic;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.footer-quote::before {
  content: '— ';
}

.footer-quote::after {
  content: ' —';
}

/* ============================================
   响应式设计
   ============================================ */
@media (max-width: 768px) {
  .home-content {
    padding: 48px 16px;
  }

  .name-title {
    font-size: 2.5rem;
  }

  .name-subtitle {
    font-size: 1rem;
  }

  .motto {
    font-size: 0.95rem;
    padding: 24px 0;
  }

  .sections-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .section-card {
    padding: 20px;
  }

  .terminal-section {
    font-size: 0.8rem;
    padding: 16px;
  }

  .tech-grid {
    gap: 8px;
  }

  .tech-tag {
    padding: 5px 10px;
    font-size: 0.7rem;
  }

  /* 隐藏装饰元素 */
  .philosophy-decoration {
    display: none;
  }
}

/* ============================================
   减少动画
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .section-card,
  .tech-tag,
  .social-link {
    transition: none;
  }

  .section-card::before {
    display: none;
  }
}
</style>

<!-- 自定义首页 -->
<div class="custom-home">
  <!-- 背景元素 -->
  <div class="home-grid"></div>
  <div class="philosophy-decoration decoration-circle"></div>
  <div class="philosophy-decoration decoration-square"></div>
  <div class="philosophy-decoration decoration-triangle"></div>

  <div class="home-content">
    <!-- 欢迎语 -->
    <div class="welcome-section">
      <p class="welcome-text">Welcome</p>
      <h1 class="name-title">Panbo</h1>
      <p class="name-subtitle">Java Engineer &amp; Philosophy Enthusiast</p>
      <p class="motto">
        偶尔思考，偶尔编码<br>
        在代码中寻找秩序，在哲学中寻找意义
      </p>
    </div>

    <!-- 三个主要板块 -->
    <div class="sections-grid">
      <a href="/coding/" class="section-card tech">
        <span class="section-icon">⌘</span>
        <h3 class="section-title">技术记录</h3>
        <p class="section-desc">Java、React、架构设计<br>与代码为伴的日常</p>
      </a>

      <a href="/philosophy/" class="section-card philosophy">
        <span class="section-icon">☦</span>
        <h3 class="section-title">哲学专栏</h3>
        <p class="section-desc">尼采、康德、存在主义<br>思考人类处境与意义</p>
      </a>

      <a href="/thinking/" class="section-card thinking">
        <span class="section-icon">✧</span>
        <h3 class="section-title">思考碎片</h3>
        <p class="section-desc">生活感悟、读书笔记<br>灵光一现的记录</p>
      </a>
    </div>

    <!-- 终端风格介绍 -->
    <div class="terminal-section">
      <div class="terminal-header">
        <span class="terminal-dot dot-1"></span>
        <span class="terminal-dot dot-2"></span>
        <span class="terminal-dot dot-3"></span>
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
      <div class="section-header">
        <span class="section-label">Tech Stack</span>
      </div>
      <div class="tech-grid">
        <span class="tech-tag">Java</span>
        <span class="tech-tag">Spring Boot</span>
        <span class="tech-tag">React</span>
        <span class="tech-tag">MySQL</span>
        <span class="tech-tag">Redis</span>
        <span class="tech-tag">Docker</span>
        <span class="tech-tag">Kubernetes</span>
        <span class="tech-tag">Git</span>
        <span class="tech-tag">Linux</span>
      </div>
    </div>

    <!-- 社交链接 -->
    <div class="social-section">
      <div class="social-links">
        <a href="https://github.com/hibernate-pano" target="_blank" class="social-link" title="GitHub">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
        <a href="https://x.com/HibernatePano" target="_blank" class="social-link" title="Twitter/X">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4l11.733 16h4.267l-11.733 -16z"/>
            <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/>
          </svg>
        </a>
        <a href="/about" class="social-link" title="About">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </a>
      </div>
    </div>

    <!-- 底部引用 -->
    <p class="footer-quote">学而时习之，不亦说乎</p>
  </div>
</div>
