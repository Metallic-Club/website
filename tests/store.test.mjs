import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, filterGames, escapeHtml, defaults } from '../src/store.js';
import { games } from '../src/catalog.js';
test('search combines case-insensitive query, category, and rating sort', () => {
  assert.equal(filterGames(games,'CYBER')[0].id,'1');
  assert.equal(filterGames(games,'cyber','Racing').length,0);
  const result = filterGames(games,'','Action','rating');
  assert.ok(result.every(g=>g.genre==='Action'));
  assert.ok(result.every((g,i)=>!i||result[i-1].rating>=g.rating));
  assert.equal(filterGames(games,'no such world').length,0);
});
test('state survives a local persistence round trip', () => {
  let value; const storage={getItem:()=>value,setItem:(_,v)=>{value=v;}};
  const state=loadState(storage);state.favorites=['1'];state.profile.name='NewPlayer';state.outfit='Explorer';
  assert.equal(saveState(storage,state),true);
  assert.equal(loadState(storage).profile.name,'NewPlayer');
  assert.deepEqual(loadState(storage).favorites,['1']);
  assert.equal(loadState(storage).outfit,'Explorer');
});
test('corrupt or blocked browser storage falls back without crashing', () => {
  assert.deepEqual(loadState({getItem:()=>'{broken'}),defaults);
  assert.deepEqual(loadState({getItem:()=>{throw Error('blocked');}}),defaults);
  assert.equal(saveState({setItem:()=>{throw Error('blocked');}},defaults),false);
  assert.deepEqual(loadState({getItem:()=>JSON.stringify({friends:'bad',color:'red;position:fixed',profile:null})}),defaults);
});
test('rendered user content is escaped', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
