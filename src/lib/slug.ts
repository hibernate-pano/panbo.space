export const sanitizeSlug = (input: string): string =>
  input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

export const toTopicSlug = (topic: string): string => sanitizeSlug(topic)
