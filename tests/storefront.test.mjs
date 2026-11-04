import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorefront} from '../src/storefront.js';
import {games} from '../src/catalog.js';
import {defaults,escapeHtml as esc} from '../src/store.js';
import {createLocalCatalog} from '../src/catalog-service.js';
import {gameDetails} from '../src/platform.js';
const make=(query='',changes={})=>{
  const state={...structuredClone(defaults),...changes},params=new URLSearchParams(query),catalog=createLocalCatalog(games,gameDetails);
  const ui=createStorefront({games,state:()=>state,params:()=>params,catalog:{remote:false},routeData:()=>({status:'ready',value:catalog.list(params,state)}),icon:()=>'',link:(to,text,cls='')=>`<a href="#/${to}" class="${cls}">${text}</a>`,button:(action,text,cls='',extra='')=>`<button data-action="${action}" ${extra}>${text}</button>`,pageHead:(title,subtitle)=>`<h1>${title}</h1><p>${subtitle}</p>`,pageLinks:page=>`<nav>Page ${page.page} of ${page.pages}</nav>`,card:game=>`<article data-game="${game.id}">${esc(game.title)}</article>`,friendStrip:()=>'<section>Friends</section>',catalogLoading:()=>'<p>Loading</p>',catalogError:()=>'<p>Error</p>',empty:(title,text)=>`<p>${title} ${text}</p>`});
  return {ui,state};
};
test('home keeps its library and friends while limiting featured choices',()=>{
  const {ui}=make('',{profile:{name:'<unsafe>',bio:''}}),html=ui.home();assert.match(html,/Welcome back, &lt;unsafe&gt;/);assert.match(html,/Your games/);assert.match(html,/Friends/);assert.equal((html.match(/aria-current="true"/g)||[]).length,1);assert.equal((html.match(/data-game=/g)||[]).length,9);
  const favorites=make('library=favorites').ui.home();assert.match(favorites,/Save games to find them here/);
});
test('explore respects filters and paging without inserting unrelated featured games',()=>{
  const filtered=make('category=Racing&rating=90').ui.explore();assert.doesNotMatch(filtered,/store-showcase/);assert.match(filtered,/Games for your filters/);assert.match(filtered,/Remove Racing filter/);assert.doesNotMatch(filtered,/Cyber Raven/);
  const second=make('page=2').ui.explore();assert.doesNotMatch(second,/store-showcase/);assert.match(second,/Page 2 of 3/);assert.equal((second.match(/class="store-game-row"/g)||[]).length,12);
});
test('list and grid controls preserve filters and escape search terms',()=>{
  const html=make('view=grid&category=Action&q=%3Cscript%3E').ui.explore();assert.match(html,/store-results-grid|No games found/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/category=Action/);
  const list=make().ui.explore();assert.equal((list.match(/class="store-game-row"/g)||[]).length,12);assert.match(list,/FEATURED &amp; RECOMMENDED|FEATURED & RECOMMENDED/);
});
