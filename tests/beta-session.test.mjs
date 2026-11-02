import test from 'node:test';
import assert from 'node:assert/strict';
import {createBetaSession,requiresTester,testerReturnTo} from '../src/beta-session.js';
const time=Date.now();
const payload=(overrides={})=>({authenticated:true,betaTester:true,user:{id:'tester-id',username:'BetaTester'},expiresAt:new Date(time+60000).toISOString(),...overrides});
const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('only landing, login and invite routes are public, and returns stay internal',()=>{
  for(const route of ['', 'login','signup'])assert.equal(requiresTester(route),false);
  for(const route of ['home','explore','profile','game/1','groups/example','download','search','wardrobe','create','alloy','settings','friends','marketplace','unknown'])assert.equal(requiresTester(route),true);
  assert.equal(testerReturnTo('/explore?category=Action&page=2'),'/explore?category=Action&page=2');
  for(const url of ['https://evil.example','//evil.example','/\\evil.example','/login','/signup','/#/home',null])assert.equal(testerReturnTo(url),'/home');
});
test('no backend and no locally claimed identity can grant tester access',async()=>{
  let calls=0;const session=createBetaSession({fetchImpl:()=>{calls++;throw Error();},authenticated:true,betaTester:true});
  assert.equal((await session.check()).ok,false);assert.equal((await session.login('sample@example.com','sample-password')).ok,false);
  assert.equal(session.hasAccess(),false);assert.equal(session.user(),null);assert.equal(calls,0);
  assert.throws(()=>createBetaSession({endpoint:'http://untrusted.example'}),/HTTPS/);
});
test('verified beta sessions expire and rechecks immediately remove stale access',async()=>{
  let now=time,resolveCheck;const session=createBetaSession({endpoint:'https://beta.example',now:()=>now,fetchImpl:async()=>response(payload())});
  assert.equal((await session.check()).ok,true);assert.equal(session.hasAccess(),true);assert.equal(session.user().username,'BetaTester');
  session.user().username='LocalOverride';assert.equal(session.user().username,'BetaTester');
  now+=60001;assert.equal(session.hasAccess(),false);assert.equal(session.user(),null);
  const waiting=createBetaSession({endpoint:'https://beta.example',now:()=>time,fetchImpl:()=>new Promise(resolve=>resolveCheck=resolve)});
  const pending=waiting.check();assert.equal(waiting.hasAccess(),false);waiting.clear();resolveCheck(response(payload()));assert.equal((await pending).ok,false);assert.equal(waiting.hasAccess(),false);
});
test('non-testers, expired or malformed sessions, and API failures remain locked',async()=>{
  for(const data of [payload({authenticated:false}),payload({betaTester:false}),payload({expiresAt:new Date(time-1).toISOString()}),payload({expiresAt:new Date(time+86400001).toISOString()}),payload({user:{id:'',username:'BetaTester'}}),payload({user:{id:'id',username:'<script>'}}),{}]){
    const session=createBetaSession({endpoint:'https://beta.example',now:()=>time,fetchImpl:async()=>response(data)});
    assert.equal((await session.check()).ok,false);assert.equal(session.hasAccess(),false);
  }
  for(const status of [401,403,429,503]){const session=createBetaSession({endpoint:'https://beta.example',fetchImpl:async()=>new Response('',{status})});assert.equal((await session.check()).ok,false);assert.equal(session.hasAccess(),false);}
  const offline=createBetaSession({endpoint:'https://beta.example',fetchImpl:async()=>{throw Error('offline');}});assert.equal((await offline.check()).ok,false);
});
test('login uses a credentialed uncached server request and logout clears access',async()=>{
  const seen=[];const session=createBetaSession({endpoint:'https://beta.example',now:()=>time,fetchImpl:async(url,options)=>{seen.push({url,options});return url.endsWith('logout')?new Response(null,{status:204}):response(payload());}});
  assert.equal((await session.login('tester@example.com','test-only-password')).ok,true);
  assert.equal(seen[0].url,'https://beta.example/v1/beta/login');assert.equal(seen[0].options.credentials,'include');assert.equal(seen[0].options.cache,'no-store');assert.equal(seen[0].options.redirect,'error');
  assert.deepEqual(JSON.parse(seen[0].options.body),{email:'tester@example.com',password:'test-only-password'});
  const logout=session.logout();assert.equal(session.hasAccess(),false);assert.equal((await logout).ok,true);assert.equal(session.user(),null);
});
test('a pending recheck or a failed recheck cannot retain prior authorization',async()=>{
  let next=()=>Promise.resolve(response(payload()));
  const session=createBetaSession({endpoint:'https://beta.example',now:()=>time,fetchImpl:()=>next()});await session.check();assert.equal(session.hasAccess(),true);
  let finish;next=()=>new Promise(resolve=>finish=resolve);const pending=session.check();assert.equal(session.hasAccess(),false);
  finish(new Response('',{status:401}));assert.equal((await pending).ok,false);assert.equal(session.hasAccess(),false);
});
