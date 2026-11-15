import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { satteri } from '@astrojs/markdown-satteri'
import editorialPlugin from './src/plugins/rehype-editorial.mjs'
import { proofSheetThemes } from './src/lib/shiki-proof.mjs'

export default defineConfig({
  site: 'https://www.panbo.space',
  output: 'static',
  trailingSlash: 'never',
  integrations: [mdx(), sitemap()],
  markdown: {
    // Strip the hand-written table of contents and make wide tables scrollable.
    processor: satteri({ hastPlugins: [editorialPlugin] }),
    shikiConfig: {
      // Emit both themes as CSS variables so code can follow the site theme.
      // The themes are custom: the palette is closed at paper, ink,
      // vermilion and blueprint blue, so a stock rainbow theme would fight
      // the rest of the page.
      themes: proofSheetThemes,
      defaultColor: false,
      // Wrapping breaks the box drawings and ASCII diagrams several of the
      // articles use; the block scrolls instead.
      wrap: false,
    },
  },
  vite: {
    server: {
      host: true,
    },
  },
})
