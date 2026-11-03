import test from 'node:test';
import assert from 'node:assert/strict';
import {loadState,saveState,escapeHtml} from '../src/store.js';
import {findGroup,groupMemberSections} from '../src/social.js';
import {canGroup} from '../src/group-access.js';
import {publishGroupNews,newsForGroup,setNewsSubscription,groupNewsNotifications} from '../src/group-news.js';
import {createGroupNewsUI} from '../src/group-news-ui.js';
import {createDiscordLink,validateDiscordAuthorizeUrl} from '../src/discord-link.js';
import {createAccountLinksUI} from '../src/account-links-ui.js';
const state=()=>loadState({getItem:()=>null});
const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const authorize=()=>new URL('https://discord.com/oauth2/authorize?client_id=123456789012345678&response_type=code&scope=identify&state='+('a'.repeat(24))+'&redirect_uri='+encodeURIComponent('https://api.example.test/oauth/discord/callback'));

test('group members are grouped once per role, with the owner and higher ranks first',()=>{
  const value=state(),group=findGroup(value,'metallic-studio'),sections=groupMemberSections(group,value);
  assert.deepEqual(sections.map(section=>section.name),['Owner','Admin','Developer','Member']);
  const names=sections.flatMap(section=>section.members);assert.equal(new Set(names).size,names.length);assert.equal(names.length,group.members.length);
  assert.deepEqual(sections[0].members,['CloudBuilder']);assert.deepEqual(sections[2].members,['PixelNova']);
});
test('news posting is permission-controlled and invalid or duplicate submissions cannot mutate posts',()=>{
  const value=state(),details={title:'Update',body:'New routes are ready.',notify:true};
  assert.equal(publishGroupNews(value,'metallic-studio',details,'post-1').ok,false);assert.equal(value.groupNewsPosts.length,0);
  value.profile.name='PixelNova';assert.equal(canGroup(findGroup(value,'metallic-studio'),'PixelNova','postNews'),true);
  assert.equal(publishGroupNews(value,'metallic-studio',details,'post-1').ok,true);
  const before=JSON.stringify(value.groupNewsPosts);
  for(const [data,id] of [[details,'post-1'],[{title:'',body:'Text'},'post-2'],[{title:'Title',body:'x'.repeat(3001)},'post-3'],[details,undefined]])assert.equal(publishGroupNews(value,'metallic-studio',data,id).ok,false);
  assert.equal(JSON.stringify(value.groupNewsPosts),before);
});
test('news notifications honor per-group opt-in, silent posts, and author exclusion',()=>{
  const value=state();assert.deepEqual(groupNewsNotifications(value),[]);
  assert.equal(setNewsSubscription(value,'unknown',true),false);setNewsSubscription(value,'metallic-studio',true);
  assert.equal(groupNewsNotifications(value).length,2);assert.ok(groupNewsNotifications(value).every(item=>item.to.startsWith('groups/metallic-studio?tab=news&post=')));
  value.profile.name='CloudBuilder';publishGroupNews(value,'metallic-studio',{title:'Silent update',body:'No ping.',notify:false},'silent');publishGroupNews(value,'metallic-studio',{title:'My update',body:'My post.',notify:true},'own-post');
  assert.ok(groupNewsNotifications(value).every(item=>!['group-news-own-post','group-news-silent'].includes(item.id)));
  value.profile.name='RavenDev';assert.ok(groupNewsNotifications(value).some(item=>item.id==='group-news-own-post'));
  setNewsSubscription(value,'metallic-studio',false);assert.deepEqual(groupNewsNotifications(value),[]);
});
test('posts and subscription preferences survive reload and malformed records are bounded and rejected',()=>{
  const value=state();value.profile.name='CloudBuilder';publishGroupNews(value,'metallic-studio',{title:'A saved update',body:'Still here after reload.',notify:true},'saved-post');setNewsSubscription(value,'metallic-studio',true);
  let saved;const storage={getItem:()=>saved,setItem:(_,data)=>{saved=data;}};saveState(storage,value);assert.deepEqual(loadState(storage).groupNewsPosts,value.groupNewsPosts);assert.deepEqual(loadState(storage).groupNewsSubscriptions,value.groupNewsSubscriptions);
  const restored=loadState({getItem:()=>JSON.stringify({groupNewsPosts:[{id:undefined,groupId:'metallic-studio',author:'CloudBuilder',title:'Bad',body:'Bad',createdAt:new Date().toISOString()}],groupNewsSubscriptions:{unknown:true,'metallic-studio':'true'},discordPreview:true,discordId:'123456789012345678',verified:true})});
  assert.deepEqual(restored.groupNewsPosts,[]);assert.deepEqual(restored.groupNewsSubscriptions,{});assert.equal(restored.discordPreview,true);assert.equal(restored.discordId,undefined);assert.equal(restored.verified,undefined);
});
test('news titles and bodies render as text rather than executable markup',()=>{
  const value=state();value.profile.name='CloudBuilder';publishGroupNews(value,'metallic-studio',{title:'<script>Title</script>',body:'<img src=x onerror=alert(1)>',notify:true},'escaped-post');
  const ui=createGroupNewsUI({state:()=>value,params:()=>new URLSearchParams(),button:()=>'',icon:()=>'',link:(_to,label)=>label,accountName:escapeHtml,pageLinks:()=>''});
  const html=ui.page(findGroup(value,'metallic-studio'));assert.match(html,/&lt;script&gt;Title/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script>|<img src=x/);
});
test('Discord authorization only accepts the identity code flow with state and the account-service callback',()=>{
  assert.equal(validateDiscordAuthorizeUrl(authorize().href,'https://api.example.test'),authorize().href);
  for(const [key,val] of [['scope','identify email'],['response_type','token'],['state',''],['redirect_uri','https://evil.test/callback'],['client_secret','secret']]){const url=authorize();url.searchParams.set(key,val);assert.throws(()=>validateDiscordAuthorizeUrl(url.href,'https://api.example.test'));}
  const bad=authorize();bad.hostname='discord.com.evil.test';assert.throws(()=>validateDiscordAuthorizeUrl(bad.href,'https://api.example.test'));
});
test('Discord connection requests use the authenticated service and never promote unverified claims',async()=>{
  const calls=[],client=createDiscordLink({endpoint:'https://api.example.test',fetchImpl:async(url,options)=>{calls.push({url,options});return response(url.endsWith('/start')?{authorizeUrl:authorize().href}:{linked:true,verified:true,discordId:'123456789012345678',username:'sample_discord'});}});
  assert.equal((await client.get()).discordId,'123456789012345678');assert.equal(await client.start(),authorize().href);await client.unlink();
  assert.deepEqual(calls.map(call=>call.options.method),['GET','POST','DELETE']);assert.ok(calls.every(call=>call.options.credentials==='include'&&call.options.cache==='no-store'));
  for(const payload of [{linked:true,verified:false,discordId:'123456789012345678',username:'forged'},{linked:true,verified:true,discordId:123,username:'bad'}]){const fake=createDiscordLink({endpoint:'https://api.example.test',fetchImpl:async()=>response(payload)});await assert.rejects(fake.get());}
  assert.equal(createDiscordLink().configured,false);await assert.rejects(createDiscordLink().get());
  assert.throws(()=>createDiscordLink({endpoint:'https://user:pass@api.example.test'}));
});
test('late Discord responses cannot carry connection details into a different account or view',async t=>{
  const pending=[];t.mock.method(globalThis,'fetch',()=>new Promise(resolve=>pending.push(resolve)));
  const value=state();let route='settings';
  const ui=createAccountLinksUI({state:()=>value,route:()=>route,params:()=>new URLSearchParams('section=connections'),isSettingsDirty:()=>false,render:()=>{},button:()=>''},'https://api.example.test');
  ui.mount();assert.equal(pending.length,1);
  route='home';ui.mount();value.profile.name='SecondUser';route='settings';ui.mount();assert.equal(pending.length,2);
  pending[0](response({linked:true,verified:true,discordId:'123456789012345678',username:'OldDiscord'}));await new Promise(resolve=>setImmediate(resolve));
  assert.doesNotMatch(ui.fields(),/OldDiscord/);
  pending[1](response({linked:true,verified:true,discordId:'987654321098765432',username:'CurrentDiscord'}));await new Promise(resolve=>setImmediate(resolve));
  assert.match(ui.fields(),/CurrentDiscord/);assert.doesNotMatch(ui.fields(),/OldDiscord/);
});
