import type { APIRoute } from 'astro'

const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#061F19"/>
    <rect x="0" y="0" width="1200" height="76" fill="#61FF83"/>
    <text x="66" y="50" fill="#1D6854" font-family="IBM Plex Mono, monospace" font-size="32" font-weight="700" letter-spacing="2">PANBO</text>
    <text x="242" y="50" fill="#1D6854" font-family="IBM Plex Mono, monospace" font-size="32" font-weight="700" letter-spacing="2">.SPACE</text>
    <text x="66" y="180" fill="#63FF86" font-family="IBM Plex Mono, monospace" font-size="21" font-weight="600" letter-spacing="3">> INDEPENDENT RESEARCH ARCHIVE</text>
    <text x="66" y="320" fill="#B9FFD0" font-family="IBM Plex Mono, Noto Sans SC, sans-serif" font-size="72" font-weight="700">把工程经验写成档案，</text>
    <text x="66" y="410" fill="#B9FFD0" font-family="IBM Plex Mono, Noto Sans SC, sans-serif" font-size="72" font-weight="700">把长期思考写成文字。</text>
    <text x="66" y="470" fill="#B7DCC8" font-family="IBM Plex Mono, Noto Sans SC, sans-serif" font-size="26">工程判断 / 工作现场 / 长期思考</text>
    <text x="66" y="530" fill="#7BA894" font-family="IBM Plex Mono, monospace" font-size="18" letter-spacing="2">A quiet archive for notes that deserve to be revisited.</text>
  </svg>
`

export const GET: APIRoute = () =>
  new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
