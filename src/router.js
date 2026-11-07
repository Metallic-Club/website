import {genres,normalizeGenre} from './genres.js';
export const categories = ['All', ...genres];
export const friendTabs = { all: 'All friends', requests: 'Requests', sent: 'Sent', find: 'Find people' };

export function readRoute(hash) {
  const value = hash.replace(/^#/, '') || '/';
  const split = value.indexOf('?');
  const route = (split < 0 ? value : value.slice(0, split)).replace(/^\/+|\/+$/g, '').replace(/^experience\//, 'game/');
  const params = new URLSearchParams(split < 0 ? '' : value.slice(split + 1));
  const genre=normalizeGenre(params.get('category'));if(genre)params.set('category',genre);
  return {
    route, params,
    category: categories.includes(params.get('category')) ? params.get('category') : 'All',
    sort: ['recommended', 'rating', 'players', 'name'].includes(params.get('sort')) ? params.get('sort') : 'recommended',
    friendTab: Object.hasOwn(friendTabs, params.get('tab')) ? friendTabs[params.get('tab')] : 'All friends',
  };
}
export function routeWithParams(route, current, changes) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === '' || value === undefined) params.delete(key);
    else if (Array.isArray(value)) {
      params.delete(key);
      for (const entry of value) params.append(key, entry);
    } else params.set(key, value);
  }
  return `/${route}${params.size ? '?' + params.toString() : ''}`;
}
