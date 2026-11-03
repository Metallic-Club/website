import {sampleAccounts} from './sample-accounts.js';
import {escapeHtml as esc} from './store.js';
export function genericAvatar(cls='',label='Generic profile picture') {
  return `<img class="avatar generic-avatar ${esc(cls)}" src="art/profile-placeholder.svg" alt="${esc(label)}" width="100" height="100" decoding="async">`;
}
export function portrait(_state,cls='',label='Generic profile picture'){return genericAvatar(cls,label);}
export const community=sampleAccounts;
export const personInfo=name=>community.find(person=>person.name===name)||{name,avatar:1,activity:'Offline',bio:'A member of the preview community.'};
