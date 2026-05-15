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
      <rect width="1200" height="630" fill="#f7f3eb"/>
      <rect x="38" y="38" width="1124" height="554" rx="30" fill="#fffdf9" stroke="#dfd4c4"/>
      <rect x="72" y="72" width="160" height="32" rx="16" fill="#f1ebe1" stroke="#e2d7c8"/>
      <text x="94" y="93" fill="#a85a39" font-family="IBM Plex Mono, monospace" font-size="16" letter-spacing="2.2">${track}</text>
      <path d="M914 38H1162V210C1110 286 1028 362 916 438H736C832 332 892 199 914 38Z" fill="#c26b47" opacity="0.08"/>
      <path d="M794 94H1088" stroke="#dfd4c4"/>
      <path d="M794 136H1044" stroke="#dfd4c4"/>
      <path d="M794 178H1008" stroke="#dfd4c4"/>
      <text x="72" y="158" fill="#8a7966" font-family="IBM Plex Mono, monospace" font-size="18" letter-spacing="4">PANBO.SPACE</text>
      <text x="72" y="254" fill="#2f241b" font-family="Source Serif 4, Noto Serif SC, serif" font-size="62" font-weight="600">
        ${titleLines.map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 76}">${line}</tspan>`).join('')}
      </text>
      <text x="72" y="474" fill="#61513f" font-family="Source Sans 3, Noto Sans SC, sans-serif" font-size="28">
        ${summaryLines.map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 40}">${line}</tspan>`).join('')}
      </text>
      <text x="72" y="548" fill="#8a7966" font-family="Source Sans 3, Noto Sans SC, sans-serif" font-size="22">A quiet archive for engineering judgment and long-form thinking.</text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
