/**
 * HAST pass for the article pipeline.
 *
 * Two jobs, both of them editorial rather than cosmetic:
 *
 * 1. Strip the hand-written `## 目录` block. Every long article carried one,
 *    duplicating the outline the site already builds from the headings. The
 *    generated outline is authoritative, so the manual one is removed at build
 *    time — the Markdown sources keep it for the author's own reference.
 *
 * 2. Wrap tables in a scroll container. The widest ones (the HSBC reference
 *    notes run 79 table rows) overflowed the reading column, and the page's
 *    `overflow-x: hidden` clipped them with no way to reach the overflow.
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
    ],
  }
}
