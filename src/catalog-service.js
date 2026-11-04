import { pageWindow, compactCount } from './pagination.js';
const idPattern = /^[A-Za-z0-9_-]{1,64}$/;
const sorts = new Set(['recommended', 'players', 'rating', 'name']);
export const metadataFor = (game, details = {}) => game.metadata || details[game.id] || { tags: [], mode: 'Multiplayer', mood: 'Immersive' };
const stableKey = (params, state) => JSON.stringify({ filters: ['q','category','mood','mode','tag','rating','sort','unplayed'].map(key=>[key,(params.get(key)||'').slice(0,160)]),
  genres: [...(state.preferredGenres || [])].sort(), favorites: [...(state.favorites || [])].sort(), hidden: [...(state.hiddenGames || [])].sort() });
export function createLocalCatalog(catalog, details = {}, { cacheSize = 20 } = {}) {
  const byId = new Map(catalog.map(game => [game.id, game]));
  const records = catalog.map(game => ({ game, info: metadataFor(game, details), players: compactCount(game.playing),
    text: [game.title, game.genre, ...metadataFor(game, details).tags].join(' ').toLowerCase() }));
  const cache = new Map();
  function list(params = new URLSearchParams(), state = {}) {
    const key = stableKey(params, state);
    let matches = cache.get(key);
    if (!matches) {
      const favorites = new Set(state.favorites || []), hidden = new Set(state.hiddenGames || []);
      const weights = new Map((state.preferredGenres || []).map(genre => [genre, 5]));
      for (const id of favorites) { const game = byId.get(id); if (game) weights.set(game.genre, (weights.get(game.genre) || 0) + 3); }
      const q = (params.get('q') || '').trim().toLowerCase().slice(0, 160), genre = params.get('category') || 'All';
      const mood = params.get('mood') || 'All', mode = params.get('mode') || 'All', rating = Number(params.get('rating')) || 0, tag=(params.get('tag')||'').trim().slice(0,30).toLowerCase();
      const sort = sorts.has(params.get('sort')) ? params.get('sort') : 'recommended';
      matches = records.filter(({ game, info, text }) => !hidden.has(game.id) && (!q || text.includes(q)) && (genre === 'All' || game.genre === genre)
        && (mood === 'All' || info.mood === mood) && (mode === 'All' || info.mode === mode) && (!tag || info.tags.some(value=>value.toLowerCase()===tag)) && game.rating >= rating
        && (params.get('unplayed') !== '1' || !favorites.has(game.id)));
      const score = game => (weights.get(game.genre) || 0) * 10 + game.rating / 10 + (favorites.has(game.id) ? -25 : 2);
      matches.sort((a, b) => (sort === 'players' ? b.players - a.players : sort === 'rating' ? b.game.rating - a.game.rating
        : sort === 'name' ? a.game.title.localeCompare(b.game.title) : score(b.game) - score(a.game)) || a.game.id.localeCompare(b.game.id, undefined, { numeric: true }));
      matches = matches.map(record => record.game);
      cache.set(key, matches);
      if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
    } else { cache.delete(key); cache.set(key, matches); }
    return pageWindow(matches, params.get('page') || 1, 12);
  }
  return { list, get: id => byId.get(id) || null, cacheEntries: () => cache.size };
}
function validateGame(value, base) {
  if (!value || !idPattern.test(value.id) || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 120
    || typeof value.genre !== 'string' || value.genre.length > 40 || !Number.isFinite(value.rating) || value.rating < 0 || value.rating > 100
    || typeof value.playing !== 'string' || value.playing.length > 20 || typeof value.art !== 'string') throw Error('Invalid game response.');
  const art = new URL(value.art, base);
  if (art.protocol !== 'https:' && !(art.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(art.hostname))) throw Error('Invalid artwork URL.');
  const info = value.metadata || {};
  return { id: value.id, title: value.title, genre: value.genre, rating: value.rating, playing: value.playing, art: art.href,
    metadata: { mode: ['Solo', 'Co-op', 'Multiplayer'].includes(info.mode) ? info.mode : 'Multiplayer',
      mood: typeof info.mood === 'string' ? info.mood.slice(0, 40) : 'Immersive',
      tags: Array.isArray(info.tags) ? info.tags.filter(tag => typeof tag === 'string').slice(0, 6).map(tag => tag.slice(0, 30)) : [] } };
}
// Optional read-only catalog endpoint. Accounts, joins, currency and publishing remain separate services.
export function createCatalogClient({ local, endpoint = '', fetchImpl = globalThis.fetch, timeoutMs = 8000, ttlMs = 30000, cacheSize = 20 } = {}) {
  const cache = new Map(), known = new Map();
  if (endpoint) { const url = new URL(endpoint); if (url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw Error('Catalog API must use HTTPS.'); }
  async function request(path, params, signal) {
    signal?.throwIfAborted();
    const url = new URL(endpoint.replace(/\/$/, '') + path);
    url.search = params.toString();
    const key = url.href, hit = cache.get(key);
    if (hit && hit.expires > Date.now()) { cache.delete(key); cache.set(key, hit); return structuredClone(hit.value); }
    const controller = new AbortController();
    const cancel = () => controller.abort(signal?.reason);
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('Catalog request timed out.')), timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit' });
      if(response.status===404&&path!=='/v1/games')return null;
      if (!response.ok) throw Error(response.status === 429 ? 'Too many requests. Try again in a moment.' : 'The game catalog is unavailable. Try again.');
      if (Number(response.headers.get('content-length')) > 250000) throw Error('Catalog response is too large.');
      let body='';
      if(response.body?.getReader){const reader=response.body.getReader(), decoder=new TextDecoder();let bytes=0;try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>250000){await reader.cancel();throw Error('Catalog response is too large.');}body+=decoder.decode(chunk.value,{stream:true});}body+=decoder.decode();}finally{reader.releaseLock();}}
      else body=await response.text();
      if (body.length > 250000) throw Error('Catalog response is too large.');
      const data = JSON.parse(body);
      let value;
      if (path === '/v1/games') {
        if (!Array.isArray(data.items) || data.items.length > 12 || !Number.isSafeInteger(data.total) || data.total < 0 || data.total > 1000000000 || data.total < data.items.length) throw Error('Invalid catalog page.');
        const items = data.items.map(game => validateGame(game, endpoint));
        if (new Set(items.map(game => game.id)).size !== items.length) throw Error('Duplicate games in catalog response.');
        const page = Math.max(1, Number(params.get('page')) || 1), pages = Math.max(1, Math.ceil(data.total / 12));
        value = { items, total: data.total, page, pages, size: 12, start: (page - 1) * 12, end: Math.min(page * 12, data.total) };
      } else value = data === null ? null : validateGame(data, endpoint);
      controller.signal.throwIfAborted();
      cache.set(key, { value, expires: Date.now() + ttlMs });
      while (cache.size > cacheSize) cache.delete(cache.keys().next().value);
      for (const game of (value?.items || (value ? [value] : []))) { known.delete(game.id); known.set(game.id, game); }
      while (known.size > 200) known.delete(known.keys().next().value);
      return structuredClone(value);
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  return { remote: Boolean(endpoint), peek: id => known.get(id) || local.get(id),
    async list(params, state, { signal } = {}) {
      if (!endpoint) { signal?.throwIfAborted(); return local.list(params, state); }
      const query = new URLSearchParams([...params].filter(([key]) => ['q', 'category', 'mood', 'mode', 'tag', 'rating', 'sort', 'page'].includes(key)).map(([key,value])=>[key,value.slice(0,key==='tag'?30:160)]));
      query.set('limit', '12');
      const page=query.get('page')||'1';query.set('page',/^\d{1,7}$/.test(page)&&Number(page)>0?page:'1');
      return request('/v1/games', query, signal);
    },
    async get(id, { signal } = {}) { if (!idPattern.test(id)) return null; if (!endpoint) return local.get(id); return request('/v1/games/' + encodeURIComponent(id), new URLSearchParams(), signal); },
    clear() { cache.clear(); },
  };
}
