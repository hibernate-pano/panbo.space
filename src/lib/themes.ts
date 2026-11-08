/**
 * The four palettes the site ships with, and the rules for moving between
 * them.
 *
 * `light` and `dark` are the editorial pair; the two HSBC ones are the
 * professional variants. Every palette is a set of CSS custom properties
 * (see `src/styles/global.css` and `src/styles/theme-hsbc.css`), so
 * switching is a single attribute write on <html>.
 */

export type ThemeId = 'light' | 'dark' | 'hsbc-light' | 'hsbc-dark'

export const themes: ThemeId[] = ['light', 'dark', 'hsbc-light', 'hsbc-dark']

/** The browser chrome colour that follows the theme. */
export const themeColors: Record<ThemeId, string> = {
  light: '#f8f6f1',
  dark: '#14120f',
  'hsbc-light': '#ffffff',
  'hsbc-dark': '#0d1117',
}

/** The storage key. The older `theme` key held only light/dark and is
    read once as a fallback so existing readers keep their choice. */
export const themeStorageKey = 'panbo:theme'

export const legacyThemeStorageKey = 'theme'

export const isThemeId = (value: string | null | undefined): value is ThemeId =>
  !!value && (themes as string[]).includes(value)

/**
 * Resolve the theme to paint with, before first paint.
 *
 * Order of preference: the current key, then the legacy key, then the
 * operating system.
 */
export const resolveInitialTheme = (): ThemeId => {
  let stored: string | null = null
  let legacy: string | null = null

  try {
    stored = localStorage.getItem(themeStorageKey)
    legacy = localStorage.getItem(legacyThemeStorageKey)
  } catch {}

  if (isThemeId(stored)) return stored
  if (legacy === 'light' || legacy === 'dark') return legacy

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
