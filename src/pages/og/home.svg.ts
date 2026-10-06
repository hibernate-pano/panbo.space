import type { APIRoute } from 'astro'
import { svgShell, ogTheme, ogWordmark, svgHeaders } from '../../lib/og-theme'

const svg = svgShell(`
    ${ogWordmark(56)}

    <text x="72" y="266" fill="${ogTheme.ink}" font-family="${ogTheme.serif}" font-size="82" font-weight="500" letter-spacing="-2">
      <tspan x="72" dy="0">把工程经验写成档案，</tspan>
      <tspan x="72" dy="98">把长期思考写成文字。</tspan>
    </text>

    <text x="72" y="486" fill="${ogTheme.muted}" font-family="${ogTheme.sans}" font-size="28">工程判断 / 工作现场 / 长期思考</text>

    <line x1="72" y1="556" x2="1128" y2="556" stroke="${ogTheme.hairline}" stroke-width="1"/>
    <text x="72" y="594" fill="${ogTheme.faint}" font-family="${ogTheme.sans}" font-size="20" font-weight="500" letter-spacing="1.6">PANBO.SPACE</text>
    <text x="1128" y="594" text-anchor="end" fill="${ogTheme.faint}" font-family="${ogTheme.mono}" font-size="19" letter-spacing="1">A QUIET ARCHIVE</text>
  `)

export const GET: APIRoute = () => new Response(svg, { headers: svgHeaders() })
