import type { APIRoute } from 'astro'
import { formatDate, getAllPosts, trackLabels } from '../../lib/posts'
import { svgShell, ogTheme, ogWordmark, svgHeaders, trackColor } from '../../lib/og-theme'

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const measureUnit = (char: string): number => (char.charCodeAt(0) < 256 ? 0.58 : 1)

const wrapText = (value: string, maxUnits: number, maxLines: number): string[] => {
  const chars = [...value.trim()]
  const lines: string[] = []
  let current = ''
  let currentUnits = 0
  let consumed = 0

  for (const char of chars) {
    const charUnits = measureUnit(char)

    if (current && currentUnits + charUnits > maxUnits) {
      lines.push(current.trim())
      current = char
      currentUnits = charUnits
      if (lines.length === maxLines) break
    } else {
      current += char
      currentUnits += charUnits
    }

    consumed += 1
  }

  if (lines.length < maxLines && current) {
    lines.push(current.trim())
  }

  if (consumed < chars.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[，。；、,.;:!? ]+$/u, '')}…`
  }

  return lines
}

export const getStaticPaths = async () => {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    params: { slug: post.data.slug },
  }))
}

export const GET: APIRoute = async ({ params }) => {
  const posts = await getAllPosts()
  const post = posts.find((entry) => entry.data.slug === params.slug)

  if (!post) {
    return new Response('Not found', { status: 404 })
  }

  const track = escapeXml(trackLabels[post.data.track])
  const hue = trackColor[post.data.track] ?? ogTheme.accent
  const titleLines = wrapText(post.data.title, 15, 3).map(escapeXml)
  const summaryLines = wrapText(post.data.summary, 26, 2).map(escapeXml)

  const svg = svgShell(`
    ${ogWordmark(56)}

    <!-- Track label with its own hue -->
    <g transform="translate(72 148)">
      <rect x="0" y="0" width="${26 + track.length * 15}" height="38" rx="19" fill="${hue}" fill-opacity="0.1"/>
      <circle cx="19" cy="19" r="5" fill="${hue}"/>
      <text x="36" y="25" fill="${hue}" font-family="${ogTheme.sans}" font-size="19" font-weight="600" letter-spacing="0.4">${track}</text>
    </g>

    <!-- Title -->
    <text x="72" y="290" fill="${ogTheme.ink}" font-family="${ogTheme.serif}" font-size="66" font-weight="500" letter-spacing="-1.5">
      ${titleLines.map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 80}">${line}</tspan>`).join('')}
    </text>

    <!-- Summary -->
    <text x="72" y="${296 + titleLines.length * 80}" fill="${ogTheme.muted}" font-family="${ogTheme.sans}" font-size="26" font-weight="400">
      ${summaryLines.map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 38}">${line}</tspan>`).join('')}
    </text>

    <!-- Footer rule -->
    <line x1="72" y1="556" x2="1128" y2="556" stroke="${ogTheme.hairline}" stroke-width="1"/>
    <text x="72" y="594" fill="${ogTheme.faint}" font-family="${ogTheme.sans}" font-size="20" font-weight="500" letter-spacing="1.6">PANBO.SPACE</text>
    <text x="1128" y="594" text-anchor="end" fill="${ogTheme.faint}" font-family="${ogTheme.mono}" font-size="19" letter-spacing="1">${escapeXml(formatDate(post.data.publishedAt))}</text>
  `)

  return new Response(svg, { headers: svgHeaders() })
}
