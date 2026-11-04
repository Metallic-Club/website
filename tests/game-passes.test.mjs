import test from 'node:test';
import assert from 'node:assert/strict';
import {games} from '../src/catalog.js';
import {passesFor,passById,normalizePasses,buyPassPreview} from '../src/game-passes.js';
import {defaults,loadState,saveState,STORAGE_KEY} from '../src/store.js';
test('game passes belong to known games and have unique positive one-time prices',()=>{
  const passes=games.flatMap(passesFor);
  assert.equal(passes.length,games.length*3);assert.equal(new Set(passes.map(pass=>pass.id)).size,passes.length);
  for(const pass of passes){assert.ok(Number.isSafeInteger(pass.price)&&pass.price>0);assert.equal(passById(pass.id).gameId,pass.gameId);}
  assert.deepEqual(passesFor({id:'unknown'}),[]);assert.equal(passById('1-supporter-extra'),null);
});
test('buying a sample pass deducts its exact cost and prevents repeat charges',()=>{
  const state=structuredClone(defaults),pass=passesFor(games[0])[0],balance=state.previewAlloy;
  assert.equal(buyPassPreview(state,pass.id).ok,true);assert.equal(state.previewAlloy,balance-pass.price);assert.deepEqual(state.gamePasses,[pass.id]);
  const after=structuredClone(state);assert.equal(buyPassPreview(state,pass.id).ok,false);assert.deepEqual(state,after);
});
test('invalid passes and insufficient or malformed balances never mutate preview state',()=>{
  const pass=passesFor(games[0])[0];
  for(const balance of [0,pass.price-1,-10,NaN,Infinity,1.5,'200']){
    const state={gamePasses:[],previewAlloy:balance},before=structuredClone(state);assert.equal(buyPassPreview(state,pass.id).ok,false);assert.deepEqual(state,before);
  }
  const state=structuredClone(defaults),before=structuredClone(state);assert.equal(buyPassPreview(state,'unknown').ok,false);assert.deepEqual(state,before);
});
test('pass ownership is normalized and persists as browser-only preview data',()=>{
  assert.deepEqual(normalizePasses(['1-supporter','1-supporter','unknown',null,'__proto__']),['1-supporter']);assert.deepEqual(normalizePasses('1-supporter'),[]);
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},state=structuredClone(defaults);
  assert.equal(buyPassPreview(state,'1-supporter').ok,true);assert.equal(saveState(storage,state),true);
  const reloaded=loadState(storage);assert.deepEqual(reloaded.gamePasses,['1-supporter']);assert.equal(reloaded.previewAlloy,state.previewAlloy);
  storage.setItem(STORAGE_KEY,JSON.stringify({gamePasses:['1-supporter','forged']}));assert.deepEqual(loadState(storage).gamePasses,['1-supporter']);
});
