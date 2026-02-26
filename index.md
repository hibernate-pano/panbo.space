---
layout: custom
title: Panbo.space - Java && React Developer
---

<style>
/* Hero Section Override */
.VPHero {
  display: none !important;
}

/* Custom Home Page */
.custom-home {
  min-height: calc(100vh - var(--vp-nav-height));
  padding: 0;
  margin: 0;
  background: #0a0a0f;
  position: relative;
  overflow: hidden;
}

/* Animated Grid Background */
.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(60px, 60px); }
}

/* Gradient Orbs */
.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 8s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent);
  top: -100px;
  right: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent);
  bottom: -50px;
  left: -50px;
  animation-delay: -3s;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.2), transparent);
  top: 40%;
  left: 30%;
  animation-delay: -5s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

/* Content Container */
.home-content {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px;
}

/* Terminal Style */
.terminal {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 24px;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 48px;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.terminal-header {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot-red { background: #ef4444; }
.dot-yellow { background: #eab308; }
.dot-green { background: #22c55e; }

.terminal-line {
  color: #a5b4fc;
  min-height: 24px;
  display: flex;
  align-items: center;
}

.terminal-line::before {
  content: '➜';
  color: #22c55e;
  margin-right: 12px;
  flex-shrink: 0;
}

/* Typewriter cursor */
.type-cursor {
  display: inline-block;
  width: 10px;
  height: 18px;
  background: #22c55e;
  margin-left: 2px;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Profile Section */
.profile-section {
  text-align: center;
  margin-bottom: 64px;
}

.avatar-container {
  position: relative;
  display: inline-block;
  margin-bottom: 24px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: white;
  position: relative;
  z-index: 1;
}

.avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4);
  animation: rotate 3s linear infinite;
  z-index: 0;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.avatar-ring::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: #0a0a0f;
}

.name-title {
  font-family: 'Archivo', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.title-desc {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.25rem;
  color: #94a3b8;
  margin-bottom: 16px;
}

.motto {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  color: #64748b;
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Tech Stack */
.tech-section {
  margin-bottom: 64px;
}

.section-title {
  font-family: 'Archivo', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '>';
  color: #3b82f6;
  font-family: 'JetBrains Mono', monospace;
}

.tech-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.tech-tag {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 8px 16px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;
  color: #93c5fd;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.tech-tag:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
}

/* Action Buttons */
.action-section {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 64px;
}

.action-btn {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  padding: 14px 32px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Posts Section */
.posts-section {
  margin-bottom: 64px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.post-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  text-decoration: none;
  display: block;
}

.post-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
}

.post-card-title {
  font-family: 'Archivo', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
  line-height: 1.4;
}

.post-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.85rem;
}

.post-category {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 10px;
  border-radius: 4px;
}

.post-arrow {
  color: #64748b;
  margin-left: auto;
  transition: transform 0.3s ease;
}

.post-card:hover .post-arrow {
  transform: translateX(4px);
  color: #3b82f6;
}

/* Social Links */
.social-section {
  text-align: center;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.social-links {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.social-link {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.3s ease;
}

.social-link:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #60a5fa;
  transform: translateY(-2px);
}

/* Footer Quote */
.footer-quote {
  text-align: center;
  margin-top: 64px;
  padding: 24px;
  font-family: 'Space Grotesk', sans-serif;
  color: #475569;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .home-content {
    padding: 48px 16px;
  }

  .name-title {
    font-size: 1.75rem;
  }

  .title-desc {
    font-size: 1rem;
  }

  .terminal {
    font-size: 12px;
    padding: 16px;
  }

  .avatar {
    width: 100px;
    height: 100px;
    font-size: 40px;
  }

  .action-section {
    flex-direction: column;
    align-items: center;
  }

  .action-btn {
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .grid-bg,
  .gradient-orb,
  .avatar-ring,
  .type-cursor {
    animation: none;
  }

  .tech-tag,
  .action-btn,
  .post-card,
  .social-link {
    transition: none;
  }
}
</style>

<!-- Custom Home Page -->
<div class="custom-home">
  <!-- Background Effects -->
  <div class="grid-bg"></div>
  <div class="gradient-orb orb-1"></div>
  <div class="gradient-orb orb-2"></div>
  <div class="gradient-orb orb-3"></div>

  <div class="home-content">
    <!-- Terminal Intro -->
    <div class="terminal">
      <div class="terminal-header">
        <span class="terminal-dot dot-red"></span>
        <span class="terminal-dot dot-yellow"></span>
        <span class="terminal-dot dot-green"></span>
      </div>
      <div class="terminal-line">npm install @panbo/developer</div>
      <div class="terminal-line">npm run build-life -- --backend=java --frontend=react</div>
      <div class="terminal-line">cat about-me.md <span class="type-cursor"></span></div>
    </div>

    <!-- Profile Section -->
    <div class="profile-section">
      <div class="avatar-container">
        <div class="avatar-ring"></div>
        <div class="avatar">P</div>
      </div>
      <h1 class="name-title">Panbo</h1>
      <p class="title-desc">Java && React Developer</p>
      <p class="motto">
        子曰：学而时习之，不亦说乎？<br>
        持续学习，持续输出，探索技术的边界
      </p>
    </div>

    <!-- Tech Stack -->
    <div class="tech-section">
      <h2 class="section-title">Tech Stack</h2>
      <div class="tech-grid">
        <span class="tech-tag">☕ Java</span>
        <span class="tech-tag">⚛️ React</span>
        <span class="tech-tag">🍃 Spring Boot</span>
        <span class="tech-tag">⚡ Redis</span>
        <span class="tech-tag">🐬 MySQL</span>
        <span class="tech-tag">☸️ Kubernetes</span>
        <span class="tech-tag">🐳 Docker</span>
        <span class="tech-tag">📂 Git</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="action-section">
      <a href="/coding/Redis/Redis%20介绍和基本命令" class="action-btn primary">
        <span>进入技术频道</span>
        <span>→</span>
      </a>
      <a href="/thinking/关于贫穷" class="action-btn secondary">
        <span>思考记录</span>
        <span>→</span>
      </a>
      <a href="/about" class="action-btn secondary">
        <span>关于我</span>
        <span>→</span>
      </a>
    </div>

    <!-- Recent Posts -->
    <div class="posts-section">
      <h2 class="section-title">最近更新</h2>
      <div class="posts-grid">
        <a href="/coding/Redis/Redis 线程 IO 模型" class="post-card">
          <h3 class="post-card-title">Redis 线程 IO 模型</h3>
          <div class="post-card-meta">
            <span class="post-category">Redis</span>
            <span class="post-arrow">→</span>
          </div>
        </a>
        <a href="/coding/架构心得/项目稳定性 -- 限流" class="post-card">
          <h3 class="post-card-title">项目稳定性 -- 限流</h3>
          <div class="post-card-meta">
            <span class="post-category">架构</span>
            <span class="post-arrow">→</span>
          </div>
        </a>
        <a href="/coding/架构心得/项目稳定性 -- 幂等" class="post-card">
          <h3 class="post-card-title">项目稳定性 -- 幂等</h3>
          <div class="post-card-meta">
            <span class="post-category">架构</span>
            <span class="post-arrow">→</span>
          </div>
        </a>
        <a href="/coding/HSBC/汇丰业务线基本常识" class="post-card">
          <h3 class="post-card-title">汇丰业务线基本常识</h3>
          <div class="post-card-meta">
            <span class="post-category">HSBC</span>
            <span class="post-arrow">→</span>
          </div>
        </a>
      </div>
    </div>

    <!-- Social Links -->
    <div class="social-section">
      <div class="social-links">
        <a href="https://github.com/hibernate-pano" target="_blank" class="social-link" title="GitHub">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
        </a>
        <a href="https://x.com/HibernatePano" target="_blank" class="social-link" title="Twitter/X">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
        </a>
      </div>
    </div>

    <!-- Footer Quote -->
    <div class="footer-quote">
      <p>学而时习之，不亦说乎？</p>
    </div>
  </div>
</div>
