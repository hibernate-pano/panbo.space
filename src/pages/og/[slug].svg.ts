import type { APIRoute } from 'astro'
import { getAllPosts, trackLabels } from '../../lib/posts'

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const measureUnit = (char: string): number => (/[\u0000-\u00ff]/.test(char) ? 0.58 : 1)

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
      <rect width="1200" height="630" fill="#f4f5f6"/>
      <rect width="1200" height="18" fill="#da0011"/>
      <rect x="54" y="54" width="1092" height="522" rx="28" fill="#ffffff" stroke="#d9dde1"/>
      <path d="M862 54H1146V274L964 456H680L862 54Z" fill="#da0011" opacity="0.08"/>
      <path d="M92 100H214L256 178H134L92 100Z" fill="#da0011"/>
      <path d="M146 100H202L164 178H108L146 100Z" fill="#ffffff"/>
      <text x="92" y="228" fill="#da0011" font-family="IBM Plex Mono, monospace" font-size="24" letter-spacing="8">${track}</text>
      <text x="92" y="308" fill="#111318" font-family="Source Serif 4, Noto Serif SC, serif" font-size="62" font-weight="600">
        ${titleLines.map((line, index) => `<tspan x="92" dy="${index === 0 ? 0 : 76}">${line}</tspan>`).join('')}
      </text>
      <text x="92" y="514" fill="#48505a" font-family="Source Sans 3, Noto Sans SC, sans-serif" font-size="28">
        ${summaryLines.map((line, index) => `<tspan x="92" dy="${index === 0 ? 0 : 40}">${line}</tspan>`).join('')}
      </text>
      <text x="92" y="546" fill="#111318" font-family="IBM Plex Mono, monospace" font-size="24">panbo.space</text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
