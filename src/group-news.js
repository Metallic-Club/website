import {findGroup,getGroups} from './social.js';
import {canGroup} from './group-access.js';

const idPattern=/^[A-Za-z0-9_-]{1,64}$/;
const namePattern=/^[A-Za-z0-9_]{3,20}$/;
export const sampleNews=[
  {id:'metallic-building-update',groupId:'metallic-studio',author:'CloudBuilder',title:'A new place to build',body:'We are working on more starter templates and a smoother first session in Studio. Share what you would like to build next.',createdAt:'2026-11-02T16:00:00Z',notify:true},
  {id:'metallic-worlds-update',groupId:'metallic-studio',author:'PixelNova',title:'More worlds to explore',body:'The sample catalog has new places to visit, from coastal towns to mountain circuits. Take a look and tell us which ones you enjoy.',createdAt:'2026-11-03T09:00:00Z',notify:true},
  {id:'riftforge-party-update',groupId:'riftforge',author:'00RIP_INDRA',title:'Bring your party',body:'Our next update focuses on playing together. We are testing new routes and cooperative objectives.',createdAt:'2026-11-02T18:00:00Z',notify:true},
];
export function normalizeNewsState(data,state){
  const groups=new Set(getGroups(state).map(group=>group.id)),seen=new Set(sampleNews.map(post=>post.id));
  state.groupNewsPosts=(Array.isArray(data.groupNewsPosts)?data.groupNewsPosts:[]).filter(post=>post&&typeof post.id==='string'&&idPattern.test(post.id)&&!seen.has(post.id)&&seen.add(post.id)&&groups.has(post.groupId)&&typeof post.author==='string'&&namePattern.test(post.author)&&typeof post.title==='string'&&post.title.trim()&&post.title.length<=100&&typeof post.body==='string'&&post.body.trim()&&post.body.length<=3000&&typeof post.createdAt==='string'&&Number.isFinite(Date.parse(post.createdAt))).slice(0,100).map(post=>({id:post.id,groupId:post.groupId,author:post.author,title:post.title.trim(),body:post.body.trim(),createdAt:new Date(post.createdAt).toISOString(),notify:post.notify===true}));
  state.groupNewsSubscriptions={};
  for(const [id,on] of Object.entries(data.groupNewsSubscriptions&&typeof data.groupNewsSubscriptions==='object'?data.groupNewsSubscriptions:{}).slice(0,40))if(groups.has(id)&&on===true)state.groupNewsSubscriptions[id]=true;
}
export function newsForGroup(state,groupId){
  if(!findGroup(state,groupId))return [];
  return [...sampleNews,...(state.groupNewsPosts||[])].filter(post=>post.groupId===groupId).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||a.id.localeCompare(b.id));
}
export function setNewsSubscription(state,groupId,enabled){
  if(!findGroup(state,groupId)||typeof enabled!=='boolean')return false;
  if(enabled)state.groupNewsSubscriptions[groupId]=true;else delete state.groupNewsSubscriptions[groupId];
  return true;
}
export function publishGroupNews(state,groupId,details,id,now=Date.now()){
  details=details||{};
  const group=findGroup(state,groupId),author=state.profile.name;
  if(!group||!canGroup(group,author,'postNews'))return {ok:false,error:'Your group role cannot publish news.'};
  const title=typeof details.title==='string'?details.title.trim():'',body=typeof details.body==='string'?details.body.trim():'';
  if(!title||title.length>100||!body||body.length>3000||typeof id!=='string'||!idPattern.test(id)||!Number.isFinite(new Date(now).getTime()))return {ok:false,error:'Enter a title and post of up to 3,000 characters.'};
  if((state.groupNewsPosts||[]).length>=100)return {ok:false,error:'This preview has reached its limit of 100 news posts.'};
  if([...sampleNews,...state.groupNewsPosts].some(post=>post.id===id))return {ok:false,error:'This post has already been published.'};
  const post={id,groupId,author,title,body,createdAt:new Date(now).toISOString(),notify:details.notify===true};
  state.groupNewsPosts.push(post);return {ok:true,post};
}
export function groupNewsNotifications(state){
  return Object.keys(state.groupNewsSubscriptions||{}).filter(id=>state.groupNewsSubscriptions[id]===true).flatMap(id=>{
    const group=findGroup(state,id);return group?newsForGroup(state,id).filter(post=>post.notify&&post.author!==state.profile.name).map(post=>({id:'group-news-'+post.id,title:group.name,description:post.title,to:'groups/'+id+'?tab=news&post='+encodeURIComponent(post.id),createdAt:post.createdAt})):[];
  }).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,40);
}
