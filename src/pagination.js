export const PAGE_SIZE = 12;
export function pageWindow(items, requested = 1, size = PAGE_SIZE) {
  size = Number.isInteger(size) ? Math.max(1, Math.min(48, size)) : PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = /^\d{1,7}$/.test(String(requested)) ? Math.min(pages, Math.max(1, Number(requested))) : 1;
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), page, pages, size, total: items.length, start, end: Math.min(start + size, items.length) };
}
export function compactCount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
  const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?)\s*([KMB])?$/i);
  return match ? Number(match[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[match[2]?.toUpperCase()] || 1) : 0;
}
