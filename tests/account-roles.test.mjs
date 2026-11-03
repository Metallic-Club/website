import test from 'node:test';
import assert from 'node:assert/strict';
import {accountRoles,accountBadges,normalizeYoutubeUrl,roleDefinitions} from '../src/account-roles.js';
import {sampleAccounts} from '../src/sample-accounts.js';
import {loadState} from '../src/store.js';
import {games} from '../src/catalog.js';
import {gameDetails} from '../src/platform.js';
import {ownerForGame,friendActivity} from '../src/social.js';

test('all account roles have sample accounts and official ownership requires the official account ID',()=>{
  for(const role of Object.keys(roleDefinitions))assert.ok(sampleAccounts.some(account=>accountRoles(account).includes(role)),role);
  assert.deepEqual(accountRoles({name:'Metallic',platformRole:'platform-owner'}),[]);
  assert.deepEqual(accountRoles({id:'ordinary-player',platformRole:'platform-owner'}),[]);
  assert.deepEqual(accountRoles({id:'metallic-official',platformRole:'platform-owner'}),['platform-owner']);
  assert.deepEqual(accountRoles({platformRole:'constructor',verifiedCreator:'true'}),[]);
});
test('YouTuber recognition requires linked ownership proof and strictly more than 100,000 subscribers',()=>{
  const youtube={linked:true,ownershipVerified:true,channelId:'UC'+'a'.repeat(22),subscriberCount:100001};
  assert.deepEqual(accountRoles({youtube}),['youtuber']);
  for(const changes of [{linked:false},{ownershipVerified:false},{ownershipVerified:'true'},{channelId:'not-a-channel'},{subscriberCount:100000},{subscriberCount:'120000'},{subscriberCount:Infinity},{subscriberCount:-1}])assert.deepEqual(accountRoles({youtube:{...youtube,...changes}}),[]);
  assert.deepEqual(accountRoles({youtubeUrl:'https://www.youtube.com/@bigcreator',bio:'200k subscribers'}),[]);
});
test('badges expose descriptive role labels and never render arbitrary supplied HTML or roles',()=>{
  const badge=accountBadges(sampleAccounts.find(account=>account.name==='SageMod'));
  assert.match(badge,/aria-label="Mod · Metallic moderator"/);assert.match(badge,/title="Mod · Metallic moderator"/);
  assert.match(badge,/data-account-role="mod"/);assert.equal(accountBadges({platformRole:'"><script>'}), '');
  assert.equal(accountBadges({name:'<script>',id:'unknown'}),'');
});
test('YouTube profile links are canonical and editable profile data cannot persist account claims',()=>{
  assert.equal(normalizeYoutubeUrl('https://youtube.com/@StudioMoss/?tracking=x'),'https://www.youtube.com/@StudioMoss');
  for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/@channel','https://evil.test/@channel','https://youtube.com@evil.test/@channel','https://user:password@youtube.com/@channel','https://www.youtube.com/watch?v=123'])assert.equal(normalizeYoutubeUrl(url),'');
  const state=loadState({getItem:()=>JSON.stringify({profile:{name:'Metallic',youtubeUrl:'https://www.youtube.com/@mychannel',platformRole:'platform-owner',verifiedCreator:true},platformRole:'head-admin',youtube:{linked:true,ownershipVerified:true,subscriberCount:999999}})});
  assert.equal(state.profile.youtubeUrl,'https://www.youtube.com/@mychannel');
  assert.deepEqual(accountRoles(state.profile),[]);assert.deepEqual(accountRoles(state),[]);
});
test('expanded sample catalog and community have unique identities, searchable metadata and valid creators',()=>{
  assert.ok(games.length>=32);assert.ok(sampleAccounts.length>=32);
  assert.equal(new Set(games.map(game=>game.id)).size,games.length);assert.equal(new Set(games.map(game=>game.art)).size,games.length);
  assert.equal(new Set(sampleAccounts.map(account=>account.id)).size,sampleAccounts.length);
  assert.equal(new Set(sampleAccounts.map(account=>account.name.toLowerCase())).size,sampleAccounts.length);
  for(const game of games){assert.ok(gameDetails[game.id]?.tags.length);const owner=ownerForGame(game.id);if(owner.type==='user')assert.ok(sampleAccounts.some(account=>account.name===owner.name));}
  const state=loadState({getItem:()=>null});
  for(const account of sampleAccounts)if(account.game){assert.ok(games.some(game=>game.id===account.game));if(!state.friends.includes(account.name))state.friends.push(account.name);const activity=friendActivity(state,account.name);assert.equal(activity.game.id,account.game);if(account.name!=='CRIMSONSLAYER')assert.equal(activity.access.allowed,true);}
});
