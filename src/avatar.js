import { escapeHtml as esc } from './store.js';
export function genericAvatar(cls = '', label = 'Generic profile picture') {
  return `<svg class="avatar generic-avatar ${esc(cls)}" viewBox="0 0 100 100" ${label ? 'role="img" aria-label="'+esc(label)+'"' : 'aria-hidden="true"'}><rect width="100" height="100" fill="#2c2f36"/><circle cx="50" cy="35" r="17" fill="#9ca3af"/><path d="M17 94v-9a33 33 0 0 1 66 0v9" fill="#9ca3af"/></svg>`;
}
// Keep the portrait interface compatible while avatar customization is in development.
export function portrait(_state, cls = '', label = 'Generic profile picture') { return genericAvatar(cls, label); }
export const community = [
  { name: 'heroX_x', avatar: 1, activity: 'Playing Cyber Raven', game: '1', bio: 'Always up for one more adventure.' },
  { name: 'CRIMSONSLAYER', avatar: 2, activity: 'Playing Cyber Raven', game: '1', bio: 'Exploring worlds and chasing high scores.' },
  { name: '00RIP_INDRA', avatar: 3, activity: 'Playing Rift Hunters', game: '3', bio: 'New worlds. New challenges.' },
  { name: 'PixelNova', avatar: 1, activity: 'Offline', bio: 'Making small worlds with big ideas.' },
  { name: 'CloudBuilder', avatar: 2, activity: 'Using Studio', bio: 'Building something new every day.' },
  { name: 'LunaBlocks', avatar: 3, activity: 'Online', bio: 'Here for the adventures and the people.' },
  { name: 'NeonFox', avatar: 1, activity: 'Offline', bio: 'Racing into the next chapter.' },
  { name: 'OrbitKai', avatar: 2, activity: 'Online', bio: 'See you among the stars.' },
];
export const personInfo = name => community.find(p => p.name === name) || { name, avatar: 1, activity: 'Offline', bio: 'A member of the preview community.' };
