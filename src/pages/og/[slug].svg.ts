import type { APIRoute } from 'astro'
import { getAllPosts, trackLabels } from '../../lib/posts'

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
  const titleLines = wrapText(post.data.title, 15.5, 3).map(escapeXml)
  const summaryLines = wrapText(post.data.summary, 27, 2).map(escapeXml)

  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#061F19"/>
      <rect x="0" y="0" width="1200" height="76" fill="#61FF83"/>
      <text x="60" y="50" fill="#1D6854" font-family="IBM Plex Mono, monospace" font-size="32" font-weight="700" letter-spacing="2">PANBO</text>
      <text x="236" y="50" fill="#1D6854" font-family="IBM Plex Mono, monospace" font-size="32" font-weight="700" letter-spacing="2">.SPACE</text>
      <text x="66" y="166" fill="#63FF86" font-family="IBM Plex Mono, monospace" font-size="21" font-weight="600" letter-spacing="3">> ${track}</text>
      <text x="66" y="330" fill="#B9FFD0" font-family="IBM Plex Mono, Noto Sans SC, sans-serif" font-size="64" font-weight="700">
        ${titleLines.map((line, index) => `<tspan x="66" dy="${index === 0 ? 0 : 84}">${line}</tspan>`).join('')}
      </text>
      <text x="66" y="452" fill="#B7DCC8" font-family="IBM Plex Mono, Noto Sans SC, sans-serif" font-size="27">
        ${summaryLines.map((line, index) => `<tspan x="66" dy="${index === 0 ? 0 : 40}">${line}</tspan>`).join('')}
      </text>
      <rect x="66" y="526" width="420" height="44" rx="8" fill="#1D6854"/>
      <text x="86" y="553" fill="#B9FFD0" font-family="IBM Plex Mono, monospace" font-size="20" font-weight="700" letter-spacing="3">// PANBO.SPACE</text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
