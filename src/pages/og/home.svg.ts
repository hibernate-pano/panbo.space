import type { APIRoute } from 'astro'

const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#f4f5f6"/>
    <rect width="1200" height="18" fill="#da0011"/>
    <rect x="54" y="54" width="1092" height="522" rx="28" fill="#ffffff" stroke="#d9dde1"/>
    <path d="M830 54H1146V286L938 494H622L830 54Z" fill="#da0011" opacity="0.08"/>
    <path d="M92 110H214L256 188H134L92 110Z" fill="#da0011"/>
    <path d="M146 110H202L164 188H108L146 110Z" fill="#ffffff"/>
    <text x="92" y="244" fill="#da0011" font-family="IBM Plex Mono, monospace" font-size="24" letter-spacing="8">PANBO.SPACE</text>
    <text x="92" y="338" fill="#111318" font-family="Source Serif 4, Noto Serif SC, serif" font-size="72" font-weight="600">程序员与思考者的研究档案</text>
    <text x="92" y="410" fill="#48505a" font-family="Source Sans 3, Noto Sans SC, sans-serif" font-size="30">工程实践、工作现场与长期思考</text>
    <text x="92" y="520" fill="#111318" font-family="IBM Plex Mono, monospace" font-size="24">HSBC-inspired editorial redesign</text>
  </svg>
`

export const GET: APIRoute = () =>
  new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
