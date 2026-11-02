import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTemplates,publicAssets,normalizeAssets,validateFiles,voteAsset,ratingFor,assetById,collectEntryFiles} from '../src/creator-data.js';
import {readFile} from 'node:fs/promises';
import {defaultRoles,canGroup,assignGroupRole,saveGroupRole,normalizeGroupConfig} from '../src/group-access.js';
import {loadState,saveState,defaults} from '../src/store.js';
import {findGroup} from '../src/social.js';

const group=()=>({id:'test-group',owner:'OwnerUser',members:['OwnerUser','AdminUser','ModUser','BuilderUser'],roles:{AdminUser:'Admin',ModUser:'Moderator',BuilderUser:'Developer'},roleDefinitions:structuredClone(defaultRoles)});

test('group controls enforce membership, individual permissions and rank boundaries',()=>{
  const value=group();assert.equal(canGroup(value,'OwnerUser','manageRoles'),true);assert.equal(canGroup(value,'AdminUser','editProfile'),true);assert.equal(canGroup(value,'ModUser','editProfile'),false);assert.equal(canGroup(value,'BuilderUser','createGames'),true);assert.equal(canGroup(value,'Visitor','createGames'),false);
  assert.equal(assignGroupRole(value,'ModUser','OwnerUser','Member'),false);
  assert.equal(assignGroupRole(value,'ModUser','AdminUser','Member'),false);
  assert.equal(assignGroupRole(value,'ModUser','ModUser','Admin'),false);
  assert.equal(assignGroupRole(value,'ModUser','BuilderUser','Admin'),false);
  assert.equal(assignGroupRole(value,'AdminUser','BuilderUser','Moderator'),true);
  assert.equal(value.roles.BuilderUser,'Moderator');
});

test('role editors cannot escalate their own role, grant unheld permissions or duplicate ranks',()=>{
  const value=group();assert.equal(saveGroupRole(value,'AdminUser',{name:'Manager',rank:150,permissions:['manageRoles']}),false);
  assert.equal(saveGroupRole(value,'OwnerUser',{name:'Owner',rank:254,permissions:[]}),false);
  assert.equal(saveGroupRole(value,'OwnerUser',{name:'Audio creator',rank:50,permissions:[]}),false);
  assert.equal(saveGroupRole(value,'OwnerUser',{name:'Audio creator',rank:60,permissions:['createGames']}),true);
  assert.equal(saveGroupRole(value,'OwnerUser',{name:'Manager',rank:200,permissions:['manageMembers','manageRoles']},'Admin'),true);
  assert.equal(value.roles.AdminUser,'Manager');
  assert.equal(saveGroupRole(value,'AdminUser',{name:'Super manager',rank:201,permissions:['manageRoles']},'Manager'),false);
  assert.equal(saveGroupRole(value,'AdminUser',{name:'Editor',rank:90,permissions:['editProfile']}),false);
  assert.equal(saveGroupRole(value,'AdminUser',{name:'Member manager',rank:90,permissions:['manageMembers']}),true);
});

test('group profile, image, roles and assignments survive reload with protected ownership',()=>{
  const state=structuredClone(defaults);state.myGroups=[{id:'my-team',name:'My team',category:'Creating',joinPolicy:'open'}];
  state.groupConfigs={'my-team':{name:'Our team',description:'A shared space',category:'Art',image:'data:image/webp;base64,AAAA',shout:'Hello',owner:'Imposter',members:['heroX_x'],roles:{heroX_x:'Developer'},roleDefinitions:defaultRoles}};
  let raw;assert.equal(saveState({setItem:(_,value)=>raw=value},state),true);const loaded=loadState({getItem:()=>raw}),value=findGroup(loaded,'my-team');
  assert.equal(value.name,'Our team');assert.equal(value.category,'Art');assert.equal(value.owner,state.profile.name);assert.equal(value.roles.heroX_x,'Developer');assert.ok(value.image.startsWith('data:image/webp'));
  assert.equal(normalizeGroupConfig({image:'javascript:alert(1)',roleDefinitions:[{name:'Owner',rank:255,permissions:['manageRoles']}]}).image,undefined);
});

test('asset imports reject empty, oversized, unsafe and mismatched files before storage',()=>{
  assert.ok(validateFiles([],'models'));assert.ok(validateFiles([{name:'bad.exe',size:8}],'models'));
  assert.ok(validateFiles([{name:'empty.obj',size:0}],'models'));assert.ok(validateFiles([{name:'huge.obj',size:51*1024*1024}],'models'));
  assert.ok(validateFiles([{name:'music.wav',size:100}],'textures'));assert.equal(validateFiles([{name:'my-template.json',size:10}],'templates'),'');assert.equal(validateFiles([{name:'model.glb',size:10}],'models'),'');
  assert.equal(normalizeAssets([{id:'old',name:'Old record',type:'models'}]).length,0);
  const assets=normalizeAssets([{id:'local-model',name:' My model ',type:'models',files:[{key:'local-model-0',name:'model.glb',size:120}],tags:['Trees','Trees'],price:999,listing:true}]);
  assert.equal(assets.length,1);assert.equal(assets[0].local,true);assert.equal(assets[0].price,0);assert.equal(Object.hasOwn(assets[0],'listing'),false);assert.deepEqual(assets[0].tags,['Trees']);
});

test('asset votes switch or toggle without accumulating repeated votes and survive reload',()=>{
  const state=structuredClone(defaults),asset=assetById(state,'city-kit'),base=ratingFor(state,asset);
  assert.equal(voteAsset(state,asset.id,1),true);assert.equal(ratingFor(state,asset).likes,base.likes+1);
  voteAsset(state,asset.id,-1);assert.equal(ratingFor(state,asset).likes,base.likes);assert.equal(ratingFor(state,asset).dislikes,base.dislikes+1);
  voteAsset(state,asset.id,-1);assert.equal(ratingFor(state,asset).dislikes,base.dislikes);assert.equal(voteAsset(state,'missing',1),false);
  voteAsset(state,asset.id,1);state.inventory.push(asset.id);const restored=loadState({getItem:()=>JSON.stringify(state)});assert.equal(restored.assetVotes[asset.id],1);assert.ok(restored.inventory.includes(asset.id));assert.equal(defaultTemplates.length,4);
});

test('folder drops read all directory batches and nested files with a shared file limit',async()=>{
  const file=name=>({isFile:true,file:resolve=>resolve({name,size:10})});
  const folder=batches=>({isDirectory:true,createReader:()=>{let i=0;return {readEntries:resolve=>resolve(batches[i++]||[])};}});
  const entries=[folder([[file('one.json')],[folder([[file('two.json')]])]])];
  assert.deepEqual((await collectEntryFiles(entries)).map(item=>item.name),['one.json','two.json']);
  await assert.rejects(collectEntryFiles(entries,1),/no more than 1 files/);
});

test('asset concept previews and starter illustrations resolve to standalone SVG artwork',async()=>{
  for(const asset of [...publicAssets,...defaultTemplates]){
    const source=await readFile(new URL('../public/'+asset.art,import.meta.url),'utf8');assert.match(source,/<svg[^>]+xmlns=/);assert.match(source,/viewBox=/);
  }
});
