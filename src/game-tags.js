export const gameTagLimit = 8;
export const tagFilterLimit = 5;
export const gameTagLength = 30;

export function normalizeGameTags(values, limit = gameTagLimit) {
  const tags = new Map();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const tag = value.trim().replace(/\s+/g, ' ').slice(0, gameTagLength).trimEnd();
    const key = tag.toLowerCase();
    if (!tag || tags.has(key)) continue;
    tags.set(key, tag);
    if (tags.size === limit) break;
  }
  return [...tags.values()];
}

export const selectedGameTags = params => normalizeGameTags(params.getAll('tag'), tagFilterLimit);
