import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import { getPostTags, toTagSlug } from './post-tags'
import { toTopicSlug } from './slug'

export type PostEntry = CollectionEntry<'posts'>

export type TrackKey = PostEntry['data']['track']

export const trackLabels: Record<TrackKey, string> = {
  engineering: 'Engineering',
  thinking: 'Thinking',
  philosophy: 'Philosophy',
  work: 'Work Notes',
  games: 'Games',
}

const collator = new Intl.Collator('zh-CN')

const stripMarkdown = (input: string): string =>
  input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const getReadingTime = (body: string): number => {
  const cleaned = stripMarkdown(body)
  const hanCount = (cleaned.match(/[\p{Script=Han}]/gu) ?? []).length
  const latinWords = (
    cleaned.replace(/[\p{Script=Han}]/gu, ' ').match(/\b[\p{Letter}\p{Number}]+\b/gu) ?? []
  ).length

  return Math.max(1, Math.round((hanCount + latinWords) / 320))
}

export const formatDate = (value: Date): string =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)

export const comparePosts = (left: PostEntry, right: PostEntry): number => {
  const updatedLeft = left.data.updatedAt ?? left.data.publishedAt
  const updatedRight = right.data.updatedAt ?? right.data.publishedAt

  if (updatedLeft.getTime() !== updatedRight.getTime()) {
    return updatedRight.getTime() - updatedLeft.getTime()
  }

  if (left.data.featured !== right.data.featured) {
    return left.data.featured ? -1 : 1
  }

  return collator.compare(left.data.title, right.data.title)
}

export const getAllPosts = async (): Promise<PostEntry[]> => {
  const posts = await getCollection('posts', ({ data }) => (import.meta.env.PROD ? !data.draft : true))
  return posts.sort(comparePosts)
}

export const toPostPath = (post: PostEntry): string => `/posts/${post.data.slug}`

export const getLatestPosts = async (limit = 6): Promise<PostEntry[]> => {
  const posts = await getAllPosts()
  return posts.slice(0, limit)
}

export const getFeaturedPosts = async (limit = 6): Promise<PostEntry[]> => {
  const posts = await getAllPosts()
  const featured = posts.filter((post) => post.data.featured)
  return featured.slice(0, limit)
}

export const getPostsByTrack = async (track: TrackKey): Promise<PostEntry[]> => {
  const posts = await getAllPosts()
  return posts.filter((post) => post.data.track === track)
}

export const getTopicMap = async (): Promise<Map<string, PostEntry[]>> => {
  const posts = await getAllPosts()
  const topicMap = new Map<string, PostEntry[]>()

  for (const post of posts) {
    if (!post.data.topic) continue
    const bucket = topicMap.get(post.data.topic) ?? []
    bucket.push(post)
    topicMap.set(post.data.topic, bucket)
  }

  return new Map(
    [...topicMap.entries()]
      .sort((left, right) => collator.compare(left[0], right[0]))
      .map(([topic, topicPosts]) => [topic, topicPosts.sort(comparePosts)]),
  )
}

export const getTopicBySlug = async (
  topicSlug: string,
): Promise<{ topic: string; posts: PostEntry[] } | null> => {
  const topicMap = await getTopicMap()

  for (const [topic, posts] of topicMap.entries()) {
    if (toTopicSlug(topic) === topicSlug) {
      return { topic, posts }
    }
  }

  return null
}

export const getTagMap = async (): Promise<Map<string, PostEntry[]>> => {
  const posts = await getAllPosts()
  const tagMap = new Map<string, PostEntry[]>()

  for (const post of posts) {
    for (const tag of getPostTags(post)) {
      const bucket = tagMap.get(tag) ?? []
      bucket.push(post)
      tagMap.set(tag, bucket)
    }
  }

  return new Map(
    [...tagMap.entries()]
      .sort((left, right) => collator.compare(left[0], right[0]))
      .map(([tag, tagPosts]) => [tag, tagPosts.sort(comparePosts)]),
  )
}

export const getTagDirectory = async (limit?: number) => {
  const tagMap = await getTagMap()
  const directory = [...tagMap.entries()]
    .map(([tag, posts]) => ({
      tag,
      slug: toTagSlug(tag),
      count: posts.length,
    }))
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count
      return collator.compare(left.tag, right.tag)
    })

  return typeof limit === 'number' ? directory.slice(0, limit) : directory
}

export const getTagBySlug = async (
  tagSlug: string,
): Promise<{ tag: string; posts: PostEntry[] } | null> => {
  const tagMap = await getTagMap()

  for (const [tag, posts] of tagMap.entries()) {
    if (toTagSlug(tag) === tagSlug) {
      return { tag, posts }
    }
  }

  return null
}

export const getRelatedTags = async (
  currentTag: string,
  limit = 8,
): Promise<Array<{ tag: string; slug: string; count: number }>> => {
  const current = await getTagBySlug(toTagSlug(currentTag))
  if (!current) return []

  const relatedCounts = new Map<string, number>()

  for (const post of current.posts) {
    for (const tag of getPostTags(post)) {
      if (tag === current.tag) continue
      relatedCounts.set(tag, (relatedCounts.get(tag) ?? 0) + 1)
    }
  }

  return [...relatedCounts.entries()]
    .map(([tag, count]) => ({
      tag,
      slug: toTagSlug(tag),
      count,
    }))
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count
      return collator.compare(left.tag, right.tag)
    })
    .slice(0, limit)
}

export const getAvailableFilters = async () => {
  const posts = await getAllPosts()
  const topics = [
    ...new Set(
      posts
        .map((post) => post.data.topic)
        .filter((topic): topic is string => Boolean(topic)),
    ),
  ].sort((left, right) => collator.compare(left, right))
  const tags = [...new Set(posts.flatMap((post) => getPostTags(post)))].sort((left, right) => collator.compare(left, right))
  const years = [...new Set(posts.map((post) => String(post.data.publishedAt.getFullYear())))].sort().reverse()

  return {
    topics,
    tags,
    years,
  }
}
