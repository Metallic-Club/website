export const groupPermissions={editProfile:'Edit name, image & description',postShout:'Post announcements',postNews:'Publish group news',manageMembers:'Manage member roles',manageRoles:'Create & edit roles',createGames:'Create group games'};
export const defaultRoles=[
  {name:'Admin',rank:200,permissions:['editProfile','postShout','postNews','manageMembers','createGames']},
  {name:'Moderator',rank:100,permissions:['postShout','manageMembers']},
  {name:'Developer',rank:50,permissions:['createGames','postNews']},
  {name:'Member',rank:1,permissions:[]},
];
export function normalizeRoles(input){
  if(!Array.isArray(input))return structuredClone(defaultRoles);
  const seen=new Set(['owner','member']),ranks=new Set([1]);
  const roles=input.filter(role=>role&&typeof role.name==='string'&&/^[\w -]{2,24}$/.test(role.name.trim())&&!seen.has(role.name.trim().toLowerCase())&&seen.add(role.name.trim().toLowerCase())&&Number.isInteger(role.rank)&&role.rank>1&&role.rank<255&&!ranks.has(role.rank)&&ranks.add(role.rank)).slice(0,20).map(role=>({name:role.name.trim(),rank:role.rank,permissions:[...new Set((Array.isArray(role.permissions)?role.permissions:[]).filter(key=>Object.hasOwn(groupPermissions,key)))]}));
  return [...roles,{name:'Member',rank:1,permissions:[]}].sort((a,b)=>b.rank-a.rank);
}
export function roleFor(group,name){
  if(group.owner===name)return {name:'Owner',rank:255,permissions:Object.keys(groupPermissions)};
  if(!group.members.includes(name))return {name:'Guest',rank:0,permissions:[]};
  const role=(group.roleDefinitions||defaultRoles).find(role=>role.name===group.roles?.[name]);
  return role||{name:'Member',rank:1,permissions:[]};
}
export const canGroup=(group,name,permission)=>!!group&&Object.hasOwn(groupPermissions,permission)&&roleFor(group,name).permissions.includes(permission);
export function assignGroupRole(group,actor,member,roleName){
  const own=roleFor(group,actor),target=roleFor(group,member),next=(group.roleDefinitions||defaultRoles).find(role=>role.name===roleName);
  if(!canGroup(group,actor,'manageMembers')||!group.members.includes(member)||actor===member||member===group.owner||!next||target.rank>=own.rank||next.rank>=own.rank)return false;
  if(group.owner!==actor&&next.permissions.some(key=>!own.permissions.includes(key)))return false;
  group.roles={...group.roles,[member]:next.name};return true;
}
export function saveGroupRole(group,actor,details,previousName=''){
  if(!canGroup(group,actor,'manageRoles'))return false;
  const own=roleFor(group,actor),roles=group.roleDefinitions||structuredClone(defaultRoles),existing=roles.find(role=>role.name===previousName);
  const name=typeof details.name==='string'?details.name.trim():'';
  if(!/^[\w -]{2,24}$/.test(name)||['owner','member','guest'].includes(name.toLowerCase())||!Number.isInteger(details.rank)||details.rank<=1||details.rank>=own.rank||existing&&(existing.name==='Member'||existing.rank>=own.rank)||previousName&&!existing)return false;
  if(roles.some(role=>role!==existing&&(role.name.toLowerCase()===name.toLowerCase()||role.rank===details.rank)))return false;
  if(!Array.isArray(details.permissions)||details.permissions.some(key=>!own.permissions.includes(key)||!Object.hasOwn(groupPermissions,key))||!existing&&roles.length>=21)return false;
  group.roleDefinitions=[...roles.filter(role=>role!==existing),{name,rank:details.rank,permissions:[...new Set(details.permissions)]}].sort((a,b)=>b.rank-a.rank);
  if(existing)for(const member of Object.keys(group.roles||{}))if(group.roles[member]===existing.name)group.roles[member]=name;
  return true;
}
export function normalizeGroupConfig(input){
  const data=input&&typeof input==='object'?input:{};
  const config={roleDefinitions:normalizeRoles(data.roleDefinitions),roles:{}};
  for(const key of ['name','description','shout'])if(typeof data[key]==='string')config[key]=data[key].trim().slice(0,key==='name'?40:500);
  if(config.name&&config.name.length<3)delete config.name;
  if(typeof data.image==='string'&&data.image.length<=140000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data.image))config.image=data.image;
  if(['open','approval'].includes(data.joinPolicy))config.joinPolicy=data.joinPolicy;
  if(typeof data.shoutBy==='string'&&/^[A-Za-z0-9_]{3,20}$/.test(data.shoutBy))config.shoutBy=data.shoutBy;
  if(['Gaming','Creating','Roleplay','Racing','Art','Music'].includes(data.category))config.category=data.category;
  if(Array.isArray(data.members))config.members=[...new Set(data.members.filter(name=>typeof name==='string'&&/^[A-Za-z0-9_]{3,20}$/.test(name)))].slice(0,200);
  for(const [member,role] of Object.entries(data.roles&&typeof data.roles==='object'?data.roles:{}).slice(0,200))if(/^[A-Za-z0-9_]{3,20}$/.test(member)&&config.roleDefinitions.some(item=>item.name===role))config.roles[member]=role;
  return config;
}
