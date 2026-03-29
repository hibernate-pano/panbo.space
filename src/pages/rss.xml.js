import rss from '@astrojs/rss'
import { getAllPosts, toPostPath } from '../lib/posts'
import { siteConfig } from '../data/site'

export const GET = async (context) => {
  const posts = await getAllPosts()

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.updatedAt ?? post.data.publishedAt,
      link: toPostPath(post),
    })),
  })
}
