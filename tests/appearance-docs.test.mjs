import test from 'node:test';import assert from 'node:assert/strict';
import {defaultAppearance,normalizeAppearance,loadAppearance,saveAppearance,applyAppearance,accents} from '../src/themes.js';
import {docArticles,searchDocumentation,documentationPage,highlightLuau} from '../src/documentation.js';
test('appearance defaults to orange and rejects unsafe or unsupported settings',()=>{
  assert.deepEqual(normalizeAppearance(null),defaultAppearance);
  assert.deepEqual(normalizeAppearance({mode:'<script>',accent:'constructor',textSize:'900px',contrast:'true'}),defaultAppearance);
  assert.equal(loadAppearance({getItem:()=>'{broken'}).accent,'orange');
  assert.equal(saveAppearance({setItem:()=>{throw Error();}},defaultAppearance),false);
});
test('appearance persists independently of profile state and resolves system changes',()=>{
  let stored;const storage={getItem:()=>stored,setItem:(_key,value)=>stored=value};
  saveAppearance(storage,{mode:'system',accent:'violet',textSize:'large',contrast:true});const prefs=loadAppearance(storage);
  const props=new Map(),root={dataset:{},style:{setProperty:(key,value)=>props.set(key,value)}};
  applyAppearance(prefs,root,true);assert.equal(root.dataset.theme,'light');assert.equal(root.dataset.textSize,'large');assert.equal(root.dataset.contrast,'true');assert.equal(props.get('--accent'),accents.violet.light);
  applyAppearance(prefs,root,false);assert.equal(root.dataset.theme,'dark');assert.equal(props.get('--accent'),accents.violet.color);
});
test('documentation has valid unique chapter and section destinations and bounded search',()=>{
  assert.equal(new Set(docArticles.map(article=>article.id)).size,docArticles.length);
  for(const article of docArticles){assert.equal(new Set(article.sections.map(section=>section.id)).size,article.sections.length);assert.ok(article.summary&&article.sections.length);assert.match(documentationPage('docs/'+article.id,new URLSearchParams()),new RegExp(article.title.replace(/[&]/g,'&')));}
  assert.ok(searchDocumentation('PLAYER').some(article=>article.id==='api-players'));assert.ok(searchDocumentation('collectible').length>0);assert.equal(searchDocumentation('no-such-article').length,0);assert.ok(searchDocumentation('').length<=20);
});
test('documentation escapes search and code, and identifies proposed engine APIs',()=>{
  const html=documentationPage('docs',new URLSearchParams({q:'<script>alert(1)</script>'}));assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
  assert.match(highlightLuau('local text = "<img onerror=bad>"'),/&lt;img/);assert.doesNotMatch(highlightLuau('<script>'),/<script>/);
  for(const id of ['api-instance','api-vector3','api-signals','api-players','collectible','interactive-door'])assert.match(documentationPage('docs/'+id,new URLSearchParams()),/not a released SDK/);
  assert.match(documentationPage('docs/missing',new URLSearchParams()),/Article not found/);
});
