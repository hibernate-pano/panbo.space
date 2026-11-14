// Shared visual language for generated OG cards — proof-sheet paper, ink,
// vermilion for the stamp, blueprint blue for annotation, and a serif
// display face. Everything is square: the OG card is a proofing sheet.
export const ogTheme = {
  bg: '#E9E9E2',
  ink: '#161616',
  muted: '#161616AB',
  faint: '#16161678',
  hairline: '#1616161F',
  accent: '#D33A2C',
  blue: '#1F4FA8',
  serif: 'Noto Serif SC, Songti SC, STSong, serif',
  latin: 'Newsreader, Songti SC, serif',
  sans: '-apple-system, PingFang SC, Microsoft YaHei, sans-serif',
  mono: 'IBM Plex Mono, ui-monospace, monospace',
} as const

export const trackColor: Record<string, string> = {
  thinking: '#D33A2C',
  philosophy: '#1F4FA8',
  psychology: '#3F7D70',
  health: '#8E6C88',
  work: '#52759B',
  engineering: '#9A6F36',
  games: '#5F8248',
}

export const svgShell = (inner: string) => `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="${ogTheme.bg}"/>
    ${inner}
  </svg>
`

// Wordmark lockup reused across cards — a square vermilion stamp
export const ogWordmark = (y = 60) => `
  <g transform="translate(72 ${y})">
    <rect x="0" y="0" width="40" height="40" fill="${ogTheme.accent}"/>
    <text x="20" y="28" text-anchor="middle" fill="${ogTheme.bg}" font-family="${ogTheme.serif}" font-size="24" font-weight="700">盘</text>
    <text x="56" y="27" fill="${ogTheme.ink}" font-family="${ogTheme.serif}" font-size="28" font-weight="700">panbo.space</text>
  </g>
`

export const svgHeaders = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
  ...extra,
})
