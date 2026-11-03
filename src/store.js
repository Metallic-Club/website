import {normalizeNewsState} from './group-news.js';
import {normalizeYoutubeUrl} from './account-roles.js';
import {normalizePrivacy} from './privacy.js';
import {normalizeAssets} from './creator-data.js';
import {normalizeGroupConfig} from './group-access.js';
import { games } from './catalog.js';
import { compactCount } from './pagination.js';
import { genres, cosmeticSlots, creatorTypes } from './platform.js';
import { DEFAULT_ALLOY, normalizeSocialState } from './social.js';
export const STORAGE_KEY = 'metallic-demo-v1';
export const outfits = ['Classic', 'Explorer', 'Streetwear'];
export const accessories = ['None', 'Cap', 'Headphones'];
export const colors = [
  { value: '#394c60', name: 'Slate blue' }, { value: '#7e4fba', name: 'Violet' },
  { value: '#a84354', name: 'Crimson' }, { value: '#3e8274', name: 'Forest' },
  { value: '#d0a554', name: 'Gold' }, { value: '#e5e7eb', name: 'Cloud' },
  { value: '#24262b', name: 'Charcoal' }, { value: '#d97c47', name: 'Terracotta' },
];
export const defaults = {
  privacy: normalizePrivacy(),
  groupNewsPosts: [], groupNewsSubscriptions: {}, discordPreview: false,
  profile: { name: 'RavenDev', bio: 'Building worlds. Finding adventures.', visibility: 'Everyone', youtubeUrl: '' },
  outfit: 'Classic', color: '#394c60', accessory: 'None', favorites: [], friends: ['heroX_x', 'CRIMSONSLAYER', '00RIP_INDRA'],
  requests: ['PixelNova', 'CloudBuilder'], outgoing: [], notifications: true, activity: true, launcherDismissed: false,
  preferredGenres: [], hiddenGames: [], creatorAssets: [], inventory: [], assetVotes: {}, groupConfigs: {}, savedAssets: [], readNotifications: [],
  updateNotifications: true, friendPolicy: 'Everyone',
  previewAlloy: DEFAULT_ALLOY, reservedServers: [], myGroups: [], groupMemberships: [], groupRequests: [], joinPolicy: 'Friends',
};
const username = value => typeof value === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(value);
const gameIds = new Set(games.map(game => game.id));
const unique = (list, valid, limit = 200) => [...new Set(list.filter(valid))].slice(0, limit);
export function loadState(storage) {
  const state = structuredClone(defaults);
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if(typeof raw==='string'&&raw.length>512000)return state;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return state;
    state.privacy = normalizePrivacy(data.privacy);
    if (Array.isArray(data.favorites)) state.favorites = unique(data.favorites, id => gameIds.has(id));
    if (Array.isArray(data.hiddenGames)) state.hiddenGames = unique(data.hiddenGames, id => gameIds.has(id));
    if (Array.isArray(data.preferredGenres)) state.preferredGenres = unique(data.preferredGenres, genre => genres.includes(genre), 6);
    for (const key of ['savedAssets', 'readNotifications']) if (Array.isArray(data[key])) state[key] = unique(data[key], value => typeof value === 'string' && /^[\w-]{1,80}$/.test(value));
    state.creatorAssets=normalizeAssets(data.creatorAssets);
    if(Array.isArray(data.inventory))state.inventory=unique(data.inventory,value=>typeof value==='string'&&/^[\w-]{1,80}$/.test(value));
    for(const [id,vote] of Object.entries(data.assetVotes&&typeof data.assetVotes==='object'?data.assetVotes:{}).slice(0,200))if(/^[\w-]{1,80}$/.test(id)&&[1,-1].includes(vote))state.assetVotes[id]=vote;
    for(const [id,config] of Object.entries(data.groupConfigs&&typeof data.groupConfigs==='object'?data.groupConfigs:{}).slice(0,35))if(/^[\w-]{1,64}$/.test(id))state.groupConfigs[id]=normalizeGroupConfig(config);
    for (const key of ['friends', 'requests', 'outgoing']) if (Array.isArray(data[key])) state[key] = unique(data[key], username);
    state.requests = state.requests.filter(name => !state.friends.includes(name));
    state.outgoing = state.outgoing.filter(name => !state.friends.includes(name) && !state.requests.includes(name));
    if (data.profile && typeof data.profile === 'object') {
      if (username(data.profile.name)) state.profile.name = data.profile.name;
      state.profile.youtubeUrl = normalizeYoutubeUrl(data.profile.youtubeUrl);
      if (typeof data.profile.bio === 'string') state.profile.bio = data.profile.bio.slice(0, 240);
      if (['Everyone', 'Friends only', 'Only me'].includes(data.profile.visibility)) state.profile.visibility = data.profile.visibility;
    }
    if (outfits.includes(data.outfit)) state.outfit = data.outfit;
    if (accessories.includes(data.accessory)) state.accessory = data.accessory;
    if (typeof data.color === 'string' && /^#[a-f0-9]{6}$/i.test(data.color)) state.color = data.color;
    for (const key of ['notifications', 'activity', 'launcherDismissed', 'updateNotifications', 'discordPreview']) if (typeof data[key] === 'boolean') state[key] = data[key];
    if (['Everyone', 'Friends of friends', 'Nobody'].includes(data.friendPolicy)) state.friendPolicy = data.friendPolicy;
    normalizeSocialState(data, state);
    normalizeNewsState(data,state);
  } catch { /* Unavailable or corrupt storage uses safe defaults. */ }
  return state;
}
export function saveState(storage, state) {
  try { const value=JSON.stringify(state);if(value.length>512000)return false;storage.setItem(STORAGE_KEY,value);return true; } catch { return false; }
}
export function filterGames(games, query = '', category = 'All', sort = 'recommended') {
  const result = games.filter(g => (category === 'All' || g.genre === category) && `${g.title} ${g.genre}`.toLowerCase().includes(query.trim().toLowerCase()));
  if (sort === 'players') {
    return result.sort((a, b) => compactCount(b.playing) - compactCount(a.playing));
  }
  return sort === 'rating' ? result.sort((a, b) => b.rating - a.rating) : sort === 'name' ? result.sort((a,b) => a.title.localeCompare(b.title)) : result;
}
// Preview transitions model requests without contacting real users.
export function updateFriendship(state, action, name) {
  if (!username(name) || name === state.profile.name) return false;
  if (action === 'send' && ![...state.friends, ...state.requests, ...state.outgoing].includes(name)) state.outgoing.push(name);
  else if (action === 'accept' && state.requests.includes(name)) {
    state.requests = state.requests.filter(n => n !== name);
    state.outgoing = state.outgoing.filter(n => n !== name);
    if (!state.friends.includes(name)) state.friends.push(name);
  } else if (action === 'decline') state.requests = state.requests.filter(n => n !== name);
  else if (action === 'cancel') state.outgoing = state.outgoing.filter(n => n !== name);
  else if (action === 'remove') state.friends = state.friends.filter(n => n !== name);
  else return false;
  return true;
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
