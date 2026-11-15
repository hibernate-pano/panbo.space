/**
 * Two Shiki themes for 校正紙.
 *
 * The palette is closed: paper, ink, vermilion, blueprint blue. A stock
 * theme (GitHub, One Dark) spends six hues on a code block and that reads
 * as a foreign object on a proofing sheet. Here the roles are few and
 * deliberate:
 *
 *   ink        the manuscript itself
 *   ink-muted  string literals — quoted matter, set back
 *   blue       the proofreader's pencil: comments, names, numbers, tags
 *   vermilion  errors only — illegal syntax, never decoration
 *
 * Keywords are ink set bold, the way a proofreader underlines a term.
 */

const light = {
  name: 'proof-sheet-light',
  type: 'light',
  colors: {
    'editor.background': '#dfdfd6',
    'editor.foreground': '#161616',
  },
  settings: [
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: '#1f4fa8' },
    },
    {
      scope: [
        'keyword',
        'keyword.control',
        'keyword.operator',
        'keyword.other',
        'storage',
        'storage.type',
        'storage.modifier',
        'punctuation.definition.keyword',
      ],
      settings: { foreground: '#161616', fontStyle: 'bold' },
    },
    {
      scope: ['string', 'string.quoted', 'string.template', 'string.regexp', 'punctuation.definition.string'],
      settings: { foreground: '#55554f' },
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'constant.character',
        'constant.other',
        'support.constant',
        'variable.other.constant',
      ],
      settings: { foreground: '#1f4fa8' },
    },
    {
      scope: [
        'entity.name.function',
        'entity.name.type',
        'entity.name.class',
        'entity.name.tag',
        'entity.other.attribute-name',
        'support.function',
        'support.class',
        'support.type',
        'meta.function-call',
        'variable.function',
        'meta.tag',
      ],
      settings: { foreground: '#1f4fa8' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
      settings: { foreground: '#16161678' },
    },
    {
      scope: ['variable', 'variable.other', 'variable.parameter', 'meta.object-literal.key'],
      settings: { foreground: '#161616' },
    },
    {
      scope: ['invalid', 'invalid.illegal', 'invalid.deprecated'],
      settings: { foreground: '#d33a2c' },
    },
  ],
}

const dark = {
  name: 'proof-sheet-dark',
  type: 'dark',
  colors: {
    'editor.background': '#1c1c19',
    'editor.foreground': '#e9e9e2',
  },
  settings: [
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: '#7a9cd8' },
    },
    {
      scope: [
        'keyword',
        'keyword.control',
        'keyword.operator',
        'keyword.other',
        'storage',
        'storage.type',
        'storage.modifier',
        'punctuation.definition.keyword',
      ],
      settings: { foreground: '#e9e9e2', fontStyle: 'bold' },
    },
    {
      scope: ['string', 'string.quoted', 'string.template', 'string.regexp', 'punctuation.definition.string'],
      settings: { foreground: '#a9a9a1' },
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'constant.character',
        'constant.other',
        'support.constant',
        'variable.other.constant',
      ],
      settings: { foreground: '#7a9cd8' },
    },
    {
      scope: [
        'entity.name.function',
        'entity.name.type',
        'entity.name.class',
        'entity.name.tag',
        'entity.other.attribute-name',
        'support.function',
        'support.class',
        'support.type',
        'meta.function-call',
        'variable.function',
        'meta.tag',
      ],
      settings: { foreground: '#7a9cd8' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
      settings: { foreground: '#e9e9e278' },
    },
    {
      scope: ['variable', 'variable.other', 'variable.parameter', 'meta.object-literal.key'],
      settings: { foreground: '#e9e9e2' },
    },
    {
      scope: ['invalid', 'invalid.illegal', 'invalid.deprecated'],
      settings: { foreground: '#e5584a' },
    },
  ],
}

export const proofSheetThemes = { light, dark }
