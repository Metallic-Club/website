import test from 'node:test';
import assert from 'node:assert/strict';
import { createInviteGate, normalizeInviteCode, inviteFormatValid } from '../src/beta-access.js';
import { portrait, genericAvatar } from '../src/avatar.js';
const code='TEST-INVITE-ONLY';
const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
test('registration remains closed without an invite backend or a valid verification',async()=>{
  let calls=0;
  const gate=createInviteGate({fetchImpl:async()=>{calls++;throw Error('Should not run');}});
  assert.equal((await gate.verify(code)).ok,false);assert.equal(gate.hasAccess(),false);assert.equal(calls,0);
  assert.equal(normalizeInviteCode(' test-invite-only '),code);assert.equal(inviteFormatValid('<script>'),false);
  assert.throws(()=>createInviteGate({endpoint:'http://untrusted.example.com'}),/HTTPS/);
  assert.throws(()=>createInviteGate({endpoint:'https://example.com?secret=x'}),/HTTPS/);
});
test('only a server verification grants short-lived in-memory signup access',async()=>{
  let time=Date.now(), valid=true, seen;
  const gate=createInviteGate({endpoint:'https://beta.example.com',now:()=>time,fetchImpl:async(url,options)=>{
    seen={url,options};return response({valid,ticket:'server-signed-test-ticket-1234',expiresAt:new Date(time+60000).toISOString()});
  }});
  assert.equal((await gate.verify(code)).ok,true);assert.equal(gate.hasAccess(),true);
  assert.equal(seen.options.credentials,'omit');assert.equal(seen.options.cache,'no-store');assert.deepEqual(JSON.parse(seen.options.body),{code});
  time+=60001;assert.equal(gate.hasAccess(),false);
  await gate.verify(code);gate.clear();assert.equal(gate.hasAccess(),false);
  await gate.verify(code);valid=false;await gate.verify(code);assert.equal(gate.hasAccess(),false);
  assert.equal(createInviteGate().hasAccess(),false);
});
test('invalid, expired, rate-limited, failed and cancelled invite checks never unlock signup',async()=>{
  const time=Date.now();
  for(const payload of [{valid:true,ticket:'short',expiresAt:new Date(time+60000).toISOString()},{valid:true,ticket:'server-signed-test-ticket-1234',expiresAt:new Date(time-1).toISOString()},{valid:true,ticket:'server-signed-test-ticket-1234',expiresAt:new Date(time+3600000).toISOString()},{valid:false}]){
    const gate=createInviteGate({endpoint:'https://beta.example.com',fetchImpl:async()=>response(payload),now:()=>time});assert.equal((await gate.verify(code)).ok,false);assert.equal(gate.hasAccess(),false);
  }
  for(const status of [400,429,503]){const gate=createInviteGate({endpoint:'https://beta.example.com',fetchImpl:async()=>new Response('',{status})});assert.equal((await gate.verify(code)).ok,false);assert.equal(gate.hasAccess(),false);}
  let finish;
  const gate=createInviteGate({endpoint:'https://beta.example.com',fetchImpl:async()=>new Promise(resolve=>finish=resolve)});
  const pending=gate.verify(code);gate.clear();finish(response({valid:true,ticket:'server-signed-test-ticket-1234',expiresAt:new Date(time+60000).toISOString()}));assert.equal((await pending).ok,false);assert.equal(gate.hasAccess(),false);
});
test('all portrait variants render the same generic icon while customization is unavailable',()=>{
  const first=portrait({outfit:'Explorer',color:'#394c60',accessory:'Cap'});
  assert.equal(first,portrait({outfit:'Streetwear',color:'#d97c47',accessory:'Headphones'}));
  assert.match(first,/generic-avatar/);assert.doesNotMatch(first,/#394c60|#d97c47/);
  assert.match(genericAvatar('custom','Profile "icon"'),/Profile &quot;icon&quot;/);
});
