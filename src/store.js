export const STORAGE_KEY = 'metallic-demo-v1';
export const defaults = {
  profile: { name: 'RavenDev', bio: 'Building worlds. Finding adventures.', visibility: 'Everyone' },
  outfit: 'Classic', color: '#394c60', favorites: [], friends: ['heroX_x', 'CRIMSONSLAYER', '00RIP_INDRA'],
  requests: ['PixelNova', 'CloudBuilder'], projects: [], notifications: true, activity: true,
};
export function loadState(storage) {
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!data || typeof data !== 'object') return structuredClone(defaults);
    const state = structuredClone(defaults);
    for (const key of ['favorites', 'friends', 'requests']) if (Array.isArray(data[key])) state[key] = data[key].filter(x => typeof x === 'string');
    if (Array.isArray(data.projects)) state.projects = data.projects.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.template === 'string');
    if (data.profile && typeof data.profile === 'object') for (const key of ['name', 'bio', 'visibility']) if (typeof data.profile[key] === 'string') state.profile[key] = data.profile[key];
    if (['Classic', 'Explorer', 'Streetwear'].includes(data.outfit)) state.outfit = data.outfit;
    if (/^#[a-f0-9]{6}$/i.test(data.color)) state.color = data.color;
    for (const key of ['notifications', 'activity']) if (typeof data[key] === 'boolean') state[key] = data[key];
    return state;
  } catch { return structuredClone(defaults); }
}
export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function filterGames(games, query = '', category = 'All', sort = 'recommended') {
  const result = games.filter(g => (category === 'All' || g.genre === category) && `${g.title} ${g.genre}`.toLowerCase().includes(query.trim().toLowerCase()));
  return sort === 'rating' ? result.sort((a, b) => b.rating - a.rating) : sort === 'name' ? result.sort((a,b) => a.title.localeCompare(b.title)) : result;
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
