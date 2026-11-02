import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { createLocalCatalog } from '../src/catalog-service.js';
const catalog=Array.from({length:10000},(_,i)=>({id:String(i+1),title:'Synthetic World '+i,genre:['Adventure','Action','Racing'][i%3],rating:70+i%30,playing:String(i*100),art:'art/game-1.svg',metadata:{tags:['World','Benchmark'],mode:i%2?'Solo':'Co-op',mood:'Immersive'}}));
const state={favorites:['1','8'],hiddenGames:['2'],preferredGenres:['Adventure']};
const start=performance.now(), repo=createLocalCatalog(catalog), setupMs=performance.now()-start, samples=[];
for(let i=0;i<100;i++){const params=new URLSearchParams({q:i%3?'World':'Benchmark',sort:['players','rating','name','recommended'][i%4],page:String(1+i%20)});const before=performance.now();const page=repo.list(params,state);samples.push(performance.now()-before);assert.ok(page.items.length<=12);assert.equal(page.total,9999);}
samples.sort((a,b)=>a-b);assert.ok(repo.cacheEntries()<=20);
console.log(JSON.stringify({fixtureGames:catalog.length,queries:samples.length,indexSetupMs:+setupMs.toFixed(2),medianQueryMs:+samples[50].toFixed(2),p95QueryMs:+samples[94].toFixed(2),maxRenderedItems:12,maxCacheEntries:repo.cacheEntries(),scope:'Local synthetic catalog; not a concurrent-user or backend load test.'},null,2));
