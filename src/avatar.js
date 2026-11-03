import {sampleAccounts} from './sample-accounts.js';
import { escapeHtml as esc } from './store.js';
export function genericAvatar(cls = '', label = 'Generic profile picture') {
  return `<svg class="avatar generic-avatar ${esc(cls)}" viewBox="0 0 100 100" ${label ? 'role="img" aria-label="'+esc(label)+'"' : 'aria-hidden="true"'}><rect width="100" height="100" fill="#2c2f36"/><circle cx="50" cy="35" r="17" fill="#9ca3af"/><path d="M17 94v-9a33 33 0 0 1 66 0v9" fill="#9ca3af"/></svg>`;
}
// Keep the portrait interface compatible while avatar customization is in development.
export function portrait(_state, cls = '', label = 'Generic profile picture') { return genericAvatar(cls, label); }
export const community = sampleAccounts;
export const personInfo = name => community.find(p => p.name === name) || { name, avatar: 1, activity: 'Offline', bio: 'A member of the preview community.' };
