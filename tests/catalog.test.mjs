import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalCatalog, createCatalogClient } from '../src/catalog-service.js';
import { pageWindow, compactCount } from '../src/pagination.js';
const state={favorites:[],hiddenGames:[],preferredGenres:[]};
const game=(id,playing='1K')=>({id:String(id),title:'World '+id,genre:'Adventure',rating:90,playing,art:'https://cdn.example.com/game.svg',metadata:{tags:['Space'],mode:'Co-op',mood:'Immersive'}});
const local=createLocalCatalog([game(1)]);
const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('page windows clamp invalid input and never return more than the bounded page size',()=>{
  const items=Array.from({length:1000},(_,i)=>i);
  assert.deepEqual(pageWindow(items,'2',12).items,items.slice(12,24));
  assert.equal(pageWindow(items,'999999',12).page,84);
  assert.equal(pageWindow(items,'<script>',12).page,1);
  assert.equal(pageWindow(items,1,1000000).items.length,48);
  assert.equal(pageWindow([],1).total,0);
  assert.equal(compactCount('1.2M'),1200000);assert.equal(compactCount('980K'),980000);assert.equal(compactCount('bad'),0);
});
test('10,000-game catalog returns stable non-overlapping pages and combines metadata filters',()=>{
  const catalog=Array.from({length:10000},(_,i)=>game(i+1,i===9999?'1.2M':i+'K'));
  const repo=createLocalCatalog(catalog);
  const first=repo.list(new URLSearchParams('sort=players'),state), second=repo.list(new URLSearchParams('sort=players&page=2'),state);
  assert.equal(first.items.length,12);assert.equal(first.total,10000);
  assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,24);
  assert.equal(catalog[0].id,'1');
  const filtered=repo.list(new URLSearchParams('q=Space&mode=Co-op&rating=90&unplayed=1'),{...state,favorites:['1'],hiddenGames:['2']});
  assert.equal(filtered.total,9998);assert.ok(filtered.items.every(item=>!['1','2'].includes(item.id)));
  for(let i=0;i<35;i++)repo.list(new URLSearchParams({q:'World '+i}),state);
  assert.ok(repo.cacheEntries()<=20);
});
test('popular sorting compares complete magnitudes and ties are deterministic',()=>{
  const repo=createLocalCatalog([game(3,'999K'),game(1,'1M'),game(2,'1M')]);
  assert.deepEqual(repo.list(new URLSearchParams('sort=players'),state).items.map(item=>item.id),['1','2','3']);
});
test('catalog client caches bounded pages, normalizes query input and avoids exposing account preferences',async()=>{
  let calls=0,last;
  const client=createCatalogClient({local,endpoint:'https://api.example.com',fetchImpl:async url=>{calls++;last=url;return response({items:[game(1)],total:1});}});
  const params=new URLSearchParams('q=World&page=bad&token=secret');
  const first=await client.list(params,{...state,favorites:['private']});first.items[0].title='Changed';
  assert.equal((await client.list(params,state)).items[0].title,'World 1');assert.equal(calls,1);
  assert.equal(last.searchParams.get('limit'),'12');assert.equal(last.searchParams.get('page'),'1');assert.equal(last.searchParams.get('token'),null);assert.equal(last.searchParams.get('favorites'),null);
});
test('malformed, excessive or unsafe API payloads never enter the catalog cache',async()=>{
  for(const data of [{items:Array.from({length:13},(_,i)=>game(i)),total:13},{items:[game(1),game(1)],total:2},{items:[{...game(1),art:'javascript:alert(1)'}],total:1},{items:[game(1)],total:-1}]){
    const client=createCatalogClient({local,endpoint:'https://api.example.com',fetchImpl:async()=>response(data)});
    await assert.rejects(client.list(new URLSearchParams(),state));
  }
  const client=createCatalogClient({local,endpoint:'https://api.example.com',fetchImpl:async()=>new Response('x'.repeat(250001))});
  await assert.rejects(client.list(new URLSearchParams(),state),/too large/);
  assert.throws(()=>createCatalogClient({local,endpoint:'http://unsafe.example.com'}),/HTTPS/);
});
test('catalog requests can be cancelled, time out, retry after failure and handle missing games',async()=>{
  const waiting=async(url,{signal})=>new Promise((resolve,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
  const client=createCatalogClient({local,endpoint:'https://api.example.com',fetchImpl:waiting,timeoutMs:20});
  const controller=new AbortController(), request=client.list(new URLSearchParams(),state,{signal:controller.signal});controller.abort();await assert.rejects(request);
  await assert.rejects(client.list(new URLSearchParams(),state),/timed out/);
  let fail=true;
  const retry=createCatalogClient({local,endpoint:'https://api.example.com',fetchImpl:async()=>{if(fail){fail=false;return new Response('',{status:503});}return response({items:[game(1)],total:1});}});
  await assert.rejects(retry.list(new URLSearchParams(),state));assert.equal((await retry.list(new URLSearchParams(),state)).total,1);
  const missing=createCatalogClient({local,endpoint:'https://api.example.com',fetchImpl:async()=>new Response('',{status:404})});assert.equal(await missing.get('missing'),null);
});
