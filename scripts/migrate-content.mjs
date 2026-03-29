import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const ROOT = process.cwd()
const LEGACY_DIRS = ['coding', 'thinking', 'philosophy']
const OUTPUT_DIR = path.join(ROOT, 'src', 'content', 'posts')
const FEATURED_PATHS = new Set([
  '/coding/架构心得/领域驱动设计DDD在银行系统的实战',
  '/coding/Java/Java并发编程完全指南',
  '/coding/分布式系统/分布式系统设计原则与最佳实践',
  '/thinking/关于学习',
  '/philosophy/存在的重量-自由-荒谬与责任',
])

const walkMarkdownFiles = async (dir) => {
  const entries = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(relativePath)))
      continue
    }

    if (entry.name.endsWith('.md')) {
      files.push(relativePath)
    }
  }

  return files
}

const toPosix = (value) => value.split(path.sep).join('/')

const sanitizeSlug = (input) =>
  input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

const getGitDate = (file) => {
  try {
    const output = execSync(`git log -1 --format=%cs -- ${JSON.stringify(toPosix(file))}`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()

    return output || null
  } catch {
    return null
  }
}

const stripFrontmatter = (raw) => {
  if (!raw.startsWith('---\n')) return raw

  const end = raw.indexOf('\n---\n', 4)
  if (end === -1) return raw

  return raw.slice(end + 5)
}

const stripLeadingTitle = (content) => {
  const lines = content.split('\n')
  let index = 0

  while (index < lines.length && !lines[index].trim()) {
    index += 1
  }

  if (index < lines.length && /^#\s+/.test(lines[index].trim())) {
    lines.splice(index, 1)
    while (index < lines.length && !lines[index].trim()) {
      lines.splice(index, 1)
    }
  }

  return lines.join('\n').trimStart()
}

const cleanInlineMarkdown = (text) =>
  text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const extractTitle = (body, fallback) => {
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim()
    }
  }

  return fallback
}

const extractSummary = (body) => {
  let inFence = false

  for (const line of body.split('\n')) {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      inFence = !inFence
      continue
    }

    if (
      inFence ||
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('>') ||
      trimmed.startsWith(':::') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('|') ||
      trimmed.startsWith('<') ||
      /^\[\[toc\]\]$/i.test(trimmed) ||
      /^\[toc\]$/i.test(trimmed) ||
      /^\d+\./.test(trimmed)
    ) {
      continue
    }

    const cleaned = cleanInlineMarkdown(trimmed)
    if (!cleaned) continue
    return cleaned.length > 140 ? `${cleaned.slice(0, 140).trim()}…` : cleaned
  }

  return '持续记录技术实践、系统设计与长期思考。'
}

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

const deriveMeta = (relativeFile) => {
  const segments = toPosix(relativeFile).replace(/\.md$/, '').split('/')

  if (segments[0] === 'thinking') {
    return { track: 'thinking' }
  }

  if (segments[0] === 'philosophy') {
    return { track: 'philosophy' }
  }

  if (segments[0] !== 'coding') {
    return { track: 'engineering' }
  }

  if (segments[1] === 'HSBC') {
    return {
      track: 'work',
      topic: 'HSBC',
      series: segments.length > 3 ? segments[2] : undefined,
    }
  }

  return {
    track: 'engineering',
    topic: segments[1] && segments.length > 2 ? segments[1] : '知识体系',
    series: segments.length > 3 ? segments[2] : undefined,
  }
}

const buildOutputPath = ({ track, topic, series, slug }) => {
  const segments = [OUTPUT_DIR, track]
  if (topic) segments.push(topic)
  if (series) segments.push(series)
  segments.push(`${slug}.md`)
  return path.join(...segments)
}

await fs.rm(OUTPUT_DIR, { recursive: true, force: true })

const files = (
  await Promise.all(LEGACY_DIRS.map((dir) => walkMarkdownFiles(dir)))
).flat()

const manifest = []

for (const relativeFile of files.sort((left, right) => left.localeCompare(right, 'zh-CN'))) {
  const absoluteFile = path.join(ROOT, relativeFile)
  const raw = await fs.readFile(absoluteFile, 'utf8')
  const parsed = matter(raw)
  const bodyWithoutFrontmatter = stripFrontmatter(raw)
  const baseName = path.basename(relativeFile, '.md')
  const title = String(parsed.data.title || extractTitle(bodyWithoutFrontmatter, baseName)).trim()
  const summary = String(parsed.data.summary || parsed.data.description || extractSummary(bodyWithoutFrontmatter)).trim()
  const slug = sanitizeSlug(String(parsed.data.slug || baseName))
  const gitDate = getGitDate(relativeFile)
  const publishedAt = String(parsed.data.publishedAt || parsed.data.date || gitDate || new Date().toISOString().slice(0, 10))
  const updatedAtValue = parsed.data.updatedAt ? String(parsed.data.updatedAt) : gitDate
  const updatedAt = updatedAtValue && updatedAtValue !== publishedAt ? updatedAtValue : undefined
  const legacyPath = `/${toPosix(relativeFile).replace(/\.md$/, '')}`
  const { track, topic, series } = deriveMeta(relativeFile)
  const tags = normalizeTags(parsed.data.tags)
  const featured = FEATURED_PATHS.has(legacyPath) || Boolean(parsed.data.featured)
  const draft = Boolean(parsed.data.draft)
  const cleanBody = stripLeadingTitle(bodyWithoutFrontmatter)

  const nextFrontmatter = {
    title,
    summary,
    publishedAt,
    ...(updatedAt ? { updatedAt } : {}),
    track,
    ...(topic ? { topic } : {}),
    ...(series ? { series } : {}),
    tags,
    featured,
    draft,
    slug,
    legacyPaths: [legacyPath],
  }

  const outputPath = buildOutputPath({ track, topic, series, slug })
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, matter.stringify(cleanBody, nextFrontmatter))

  manifest.push({
    title,
    slug,
    path: `/posts/${slug}`,
    track,
    topic: topic || null,
    series: series || null,
    publishedAt,
    updatedAt: updatedAt || null,
    featured,
    draft,
    legacyPaths: [legacyPath],
    source: relativeFile,
  })
}

await fs.mkdir(path.join(ROOT, 'src', 'generated'), { recursive: true })
await fs.writeFile(
  path.join(ROOT, 'src', 'generated', 'migration-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
)

console.log(`Migrated ${manifest.length} posts into src/content/posts.`)
