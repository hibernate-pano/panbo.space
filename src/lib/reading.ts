/**
 * Reading preferences — the contract between the site owner (backend defaults)
 * and the reader (per-device overrides).
 *
 * The owner picks the default for each axis in `src/data/site.ts`. A reader may
 * override any axis from the in-page panel; overrides live in localStorage and
 * are applied before first paint so the page never reflows after load.
 */

export type ReadingKey = 'fontSize' | 'measure' | 'lineHeight' | 'paraGap'

export type ReadingOption = {
  value: string
  label: string
  /** The CSS value this option maps to. */
  css: string
}

export type ReadingScale = {
  label: string
  /** CSS custom property this axis drives. */
  cssVar: string
  options: ReadingOption[]
}

export const readingScales: Record<ReadingKey, ReadingScale> = {
  fontSize: {
    label: '字号',
    cssVar: '--reading-font-size',
    options: [
      { value: 'sm', label: '小', css: '15.5px' },
      { value: 'md', label: '标准', css: '17px' },
      { value: 'lg', label: '大', css: '18.5px' },
      { value: 'xl', label: '特大', css: '20px' },
    ],
  },
  measure: {
    label: '栏宽',
    cssVar: '--reading-width',
    options: [
      { value: 'sm', label: '窄', css: '620px' },
      { value: 'md', label: '标准', css: '720px' },
      { value: 'lg', label: '宽', css: '800px' },
    ],
  },
  lineHeight: {
    label: '行距',
    cssVar: '--reading-line-height',
    options: [
      { value: 'sm', label: '紧凑', css: '1.72' },
      { value: 'md', label: '舒适', css: '1.9' },
      { value: 'lg', label: '宽松', css: '2.1' },
    ],
  },
  paraGap: {
    label: '段距',
    cssVar: '--reading-para-gap',
    options: [
      { value: 'sm', label: '紧凑', css: '0.72' },
      { value: 'md', label: '标准', css: '1' },
      { value: 'lg', label: '宽松', css: '1.35' },
    ],
  },
}

export const readingKeys = Object.keys(readingScales) as ReadingKey[]

export const readingStorageKey = 'panbo:reading'

export const isReadingKey = (value: string): value is ReadingKey =>
  Object.prototype.hasOwnProperty.call(readingScales, value)

/** The CSS value an option key maps to, or undefined when the key is unknown. */
export const readingCssValue = (key: ReadingKey, optionKey: string): string | undefined =>
  readingScales[key].options.find((option) => option.value === optionKey)?.css

/**
 * Resolve the owner's defaults into a `{ optionKey → cssValue }` map plus the
 * option keys themselves. Both are needed: the keys tell the panel which option
 * is active, the css values are what the page actually renders with.
 */
export const resolveReadingDefaults = (
  defaults: Record<ReadingKey, string>,
): { keys: Record<ReadingKey, string>; css: Record<ReadingKey, string> } => {
  const keys = {} as Record<ReadingKey, string>
  const css = {} as Record<ReadingKey, string>

  for (const key of readingKeys) {
    const optionKey = defaults[key]
    const value = readingCssValue(key, optionKey)

    if (!value) {
      throw new Error(`Unknown reading option "${optionKey}" for axis "${key}"`)
    }

    keys[key] = optionKey
    css[key] = value
  }

  return { keys, css }
}
