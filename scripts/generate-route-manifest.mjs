import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const ROOT = process.cwd()
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts')
const GENERATED_DIR = path.join(ROOT, 'src', 'generated')

const walkMarkdownFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(absolutePath)))
      continue
    }

    if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(absolutePath)
    }
  }

  return files
}

const files = await walkMarkdownFiles(POSTS_DIR)

const manifest = []
const redirects = []

for (const file of files.sort((left, right) => left.localeCompare(right, 'zh-CN'))) {
  const raw = await fs.readFile(file, 'utf8')
  const parsed = matter(raw)
  const data = parsed.data
  const canonicalPath = `/posts/${data.slug}`
  const legacyPaths = Array.isArray(data.legacyPaths) ? data.legacyPaths : []

  manifest.push({
    title: data.title,
    slug: data.slug,
    path: canonicalPath,
    track: data.track,
    topic: data.topic || null,
    series: data.series || null,
    publishedAt: data.publishedAt,
    updatedAt: data.updatedAt || null,
    featured: Boolean(data.featured),
    draft: Boolean(data.draft),
    legacyPaths,
  })

  for (const legacyPath of legacyPaths) {
    redirects.push({
      source: legacyPath,
      destination: canonicalPath,
      permanent: true,
    })

    if (legacyPath !== '/' && !legacyPath.endsWith('/')) {
      redirects.push({
        source: `${legacyPath}/`,
        destination: canonicalPath,
        permanent: true,
      })
    }
  }
}

await fs.mkdir(GENERATED_DIR, { recursive: true })
await fs.writeFile(
  path.join(GENERATED_DIR, 'route-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
)
await fs.writeFile(
  path.join(GENERATED_DIR, 'redirects.json'),
  `${JSON.stringify(redirects, null, 2)}\n`,
)

const vercelConfig = {
  framework: 'astro',
  installCommand: 'pnpm install --frozen-lockfile',
  buildCommand: 'pnpm build',
  outputDirectory: 'dist',
  redirects,
}

await fs.writeFile(
  path.join(ROOT, 'vercel.json'),
  `${JSON.stringify(vercelConfig, null, 2)}\n`,
)

console.log(`Generated ${manifest.length} canonical routes and ${redirects.length} redirects.`)
