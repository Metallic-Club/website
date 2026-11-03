export const roleDefinitions=Object.freeze({
  'platform-owner':{label:'Platform owner',description:'The official Metallic account',color:'#f3ac59',shape:'crown'},
  'head-admin':{label:'Head admin',description:'Metallic site administrator',color:'#ef817b',shape:'shield'},
  admin:{label:'Admin',description:'Metallic administrator',color:'#c2a1ef',shape:'shield'},
  mod:{label:'Mod',description:'Metallic moderator',color:'#7ac9a2',shape:'shield'},
  youtuber:{label:'YouTuber',description:'Linked YouTube channel with over 100,000 subscribers',color:'#f47b86',shape:'video'},
  verified:{label:'Verified',description:'Recognized developer or community figure',color:'#75b9f5',shape:'check'},
});
export function normalizeYoutubeUrl(value){
  if(typeof value!=='string'||value.length>200)return '';
  try{
    const url=new URL(value.trim());
    if(url.protocol!=='https:'||url.username||url.password||url.port||!['youtube.com','www.youtube.com'].includes(url.hostname))return '';
    if(!/^\/(?:@[A-Za-z0-9_.-]{2,30}|channel\/UC[A-Za-z0-9_-]{22}|(?:c|user)\/[A-Za-z0-9_.-]{1,60})\/?$/.test(url.pathname))return '';
    return 'https://www.youtube.com'+url.pathname.replace(/\/$/,'');
  }catch{return '';}
}
// Input must come from trusted account records. Editable names, biographies,
// channel URLs and local storage are never role assignments or proof of ownership.
export function accountRoles(account){
  if(!account||typeof account!=='object')return [];
  const roles=[];
  if(account.id==='metallic-official'&&account.platformRole==='platform-owner')roles.push('platform-owner');
  else if(['head-admin','admin','mod'].includes(account.platformRole))roles.push(account.platformRole);
  const channel=account.youtube;
  if(channel?.linked===true&&channel.ownershipVerified===true&&/^UC[A-Za-z0-9_-]{22}$/.test(channel.channelId)
    &&Number.isSafeInteger(channel.subscriberCount)&&channel.subscriberCount>100000)roles.push('youtuber');
  if(account.verifiedCreator===true&&!roles.some(role=>['platform-owner','head-admin','admin','mod'].includes(role)))roles.push('verified');
  return roles;
}
export function accountBadges(account){
  return accountRoles(account).map(role=>{
    const info=roleDefinitions[role],label=info.label+' · '+info.description;
    const shape=info.shape==='crown'?'<path d="m3 6 4 3 5-6 5 6 4-3-2 13H5Z" fill="currentColor"/><path d="m9 13 2 2 4-4" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>':
      info.shape==='shield'?'<path d="m12 2 9 4v6c0 5-5 9-9 11-4-2-9-6-9-11V6Z" fill="currentColor"/><path d="m7 12 3 3 7-7" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>':
      info.shape==='video'?'<rect x="1" y="4" width="22" height="16" rx="5" fill="currentColor"/><path d="m10 8 7 4-7 4Z" fill="#171717"/>':
      '<path d="m12 1 3 2 4 1 1 4 3 4-3 4-1 4-4 1-3 2-3-2-4-1-1-4-3-4 3-4 1-4 4-1Z" fill="currentColor"/><path d="m7 12 3 3 7-7" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    return `<span class="account-badge" data-account-role="${role}" role="img" aria-label="${label}" title="${label}" style="color:${info.color}"><svg viewBox="0 0 24 24" aria-hidden="true">${shape}</svg></span>`;
  }).join('');
}
