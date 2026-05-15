import type { APIRoute } from 'astro'

const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#f7f3eb"/>
    <rect x="38" y="38" width="1124" height="554" rx="30" fill="#fffdf9" stroke="#dfd4c4"/>
    <rect x="74" y="78" width="200" height="34" rx="17" fill="#f1ebe1" stroke="#e2d7c8"/>
    <circle cx="106" cy="95" r="8" fill="#c26b47"/>
    <text x="128" y="100" fill="#7f6d5b" font-family="IBM Plex Mono, monospace" font-size="16" letter-spacing="2.4">PANBO.SPACE</text>
    <path d="M912 38H1162V220C1110 302 1021 384 895 466H694C808 355 881 212 912 38Z" fill="#c26b47" opacity="0.08"/>
    <path d="M790 98H1088" stroke="#dfd4c4"/>
    <path d="M790 140H1036" stroke="#dfd4c4"/>
    <path d="M790 182H1004" stroke="#dfd4c4"/>
    <text x="74" y="196" fill="#8a7966" font-family="IBM Plex Mono, monospace" font-size="18" letter-spacing="4">INDEPENDENT RESEARCH ARCHIVE</text>
    <text x="74" y="308" fill="#2f241b" font-family="Source Serif 4, Noto Serif SC, serif" font-size="78" font-weight="600">把工程经验写成档案，</text>
    <text x="74" y="398" fill="#2f241b" font-family="Source Serif 4, Noto Serif SC, serif" font-size="78" font-weight="600">把长期思考写成文字。</text>
    <text x="74" y="472" fill="#61513f" font-family="Source Sans 3, Noto Sans SC, sans-serif" font-size="28">工程判断 / 工作现场 / 长期思考</text>
    <text x="74" y="528" fill="#8a7966" font-family="Source Sans 3, Noto Sans SC, sans-serif" font-size="24">A quiet archive for notes that deserve to be revisited.</text>
  </svg>
`

export const GET: APIRoute = () =>
  new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
