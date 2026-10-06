// Shared visual language for generated OG cards — warm paper, ink text,
// coral accent, and one per-track hue so cards stay recognizable in a feed.
export const ogTheme = {
  bg: '#FAF9F5',
  ink: '#1A1A18',
  muted: '#6D6A62',
  faint: '#98948A',
  hairline: '#E8E4D9',
  accent: '#BD5C38',
  serif: 'Newsreader, Georgia, Songti SC, serif',
  sans: 'Inter, -apple-system, PingFang SC, sans-serif',
  mono: 'IBM Plex Mono, ui-monospace, monospace',
} as const

export const trackColor: Record<string, string> = {
  thinking: '#BD5C38',
  philosophy: '#75619C',
  psychology: '#3F7D70',
  work: '#52759B',
  engineering: '#9A6F36',
  games: '#5F8248',
}

export const svgShell = (inner: string) => `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="${ogTheme.accent}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${ogTheme.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="${ogTheme.bg}"/>
    <ellipse cx="600" cy="60" rx="520" ry="300" fill="url(#glow)"/>
    ${inner}
  </svg>
`

// Wordmark lockup reused across cards
export const ogWordmark = (y = 60) => `
  <g transform="translate(72 ${y})">
    <path d="M6 0.6 8.1 6.4 14 8.3l-5.9 1.9L6 16l-2.1-5.8L-2 8.3l5.9-1.9L6 0.6Z" fill="${ogTheme.accent}" transform="scale(1.1) translate(2 2)"/>
    <text x="26" y="17" fill="${ogTheme.ink}" font-family="${ogTheme.serif}" font-size="30" font-weight="500" letter-spacing="-0.5">panbo<tspan fill="${ogTheme.accent}">.</tspan>space</text>
  </g>
`

export const svgHeaders = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
  ...extra,
})
