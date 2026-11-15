/**
 * HAST pass for the article pipeline.
 *
 * Three jobs, all of them editorial rather than cosmetic:
 *
 * 1. Strip the hand-written `## 目录` block. Every long article carried one,
 *    duplicating the outline the site already builds from the headings. The
 *    generated outline is authoritative, so the manual one is removed at build
 *    time — the Markdown sources keep it for the author's own reference.
 *
 * 2. Wrap tables in a scroll container. The widest ones (the HSBC reference
 *    notes run 79 table rows) overflowed the reading column, and the page's
 *    `overflow-x: hidden` clipped them with no way to reach the overflow.
 *
 * 3. Wrap every code block in a proof-sheet frame: a head strip carrying the
 *    language label, so the label and the copy action stay put while the code
 *    itself scrolls horizontally.
 */

const TOC_HEADING = '目录'

const isElement = (node, tagName) =>
  node && node.type === 'element' && node.tagName === tagName

const textOf = (node) => {
  if (!node) return ''
  if (node.type === 'text') return node.value
  if (Array.isArray(node.children)) return node.children.map(textOf).join('')
  return ''
}

/**
 * Remove the `## 目录` heading, the ordered list under it, and the thematic
 * break that closes the block.
 */
const stripManualToc = (node, ctx) => {
  const parent = ctx.parent(node)
  if (!parent || !Array.isArray(parent.children)) return

  const index = ctx.indexOf(node)
  if (index === undefined) return

  const doomed = [{ node, index }]

  for (let cursor = index + 1; cursor < parent.children.length; cursor += 1) {
    const candidate = parent.children[cursor]

    // Blank lines between the heading and the list.
    if (candidate.type === 'text' && candidate.value.trim() === '') {
      doomed.push({ node: candidate, index: cursor })
      continue
    }

    // The list itself, and the rule that closes the block.
    if (isElement(candidate, 'ol') || isElement(candidate, 'ul') || isElement(candidate, 'hr')) {
      doomed.push({ node: candidate, index: cursor })
      continue
    }

    break
  }

  // Removal invalidates the handles that follow it, so take the block apart
  // from the end: the rule first, the list, then the heading itself.
  doomed.sort((left, right) => right.index - left.index)

  for (const target of doomed) {
    ctx.removeNode(target.node)
  }
}

/** Give every table a horizontal scroll container. */
const wrapTables = (node, ctx) => {
  ctx.wrapNode(node, {
    type: 'element',
    tagName: 'div',
    properties: { className: ['table-scroll'] },
    children: [],
  })
}

/** Read the fence language, whichever stage of the pipeline wrote it. */
const languageOf = (node) => {
  const fromPre = node.properties?.dataLanguage ?? node.properties?.['data-language']
  if (typeof fromPre === 'string' && fromPre) return fromPre

  const code = node.children?.find(
    (child) => child.type === 'element' && child.tagName === 'code',
  )
  if (!code) return ''

  if (typeof code.data?.lang === 'string' && code.data.lang) return code.data.lang

  const className = code.properties?.className
  const classes = Array.isArray(className) ? className : []
  const match = classes.find(
    (entry) => typeof entry === 'string' && entry.startsWith('language-'),
  )
  return match ? match.slice('language-'.length) : ''
}

/**
 * Frame a highlighted block: head strip (language + room for the copy
 * button) above the scrolling `<pre>`. Mermaid fences are excluded — the
 * runtime turns those into figures.
 */
const frameCodeBlock = (node) => {
  const language = languageOf(node)
  if (!language || language === 'mermaid') return

  const label = language === 'plaintext' || language === 'text' ? 'text' : language

  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['code-block'], dataLanguage: label },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-block__head'] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['code-block__lang'] },
            children: [{ type: 'text', value: label }],
          },
        ],
      },
      node,
    ],
  }
}

export default function editorialPlugin() {
  return {
    name: 'editorial',
    element: [
      {
        filter: ['h2'],
        visit(node, ctx) {
          if (textOf(node).trim() !== TOC_HEADING) return
          stripManualToc(node, ctx)
        },
      },
      {
        filter: ['table'],
        visit(node, ctx) {
          wrapTables(node, ctx)
        },
      },
      {
        filter: ['pre'],
        visit(node, ctx) {
          const framed = frameCodeBlock(node)
          if (framed) ctx.replaceNode(node, framed)
        },
      },
    ],
  }
}
