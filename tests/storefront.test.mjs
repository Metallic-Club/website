import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorefront} from '../src/storefront.js';
import {games} from '../src/catalog.js';
import {defaults,escapeHtml as esc} from '../src/store.js';
import {createLocalCatalog} from '../src/catalog-service.js';
import {gameDetails} from '../src/platform.js';
const make=(query='',changes={})=>{
  const state={...structuredClone(defaults),...changes},params=new URLSearchParams(query),catalog=createLocalCatalog(games,gameDetails);
  const ui=createStorefront({games,state:()=>state,params:()=>params,catalog:{remote:false},routeData:()=>({status:'ready',value:catalog.list(params,state)}),icon:()=>'',link:(to,text,cls='')=>`<a href="#/${to}" class="${cls}">${text}</a>`,button:(action,text,cls='',extra='')=>`<button data-action="${action}" ${extra}>${text}</button>`,pageHead:(title,subtitle)=>`<h1>${title}</h1><p>${subtitle}</p>`,pageLinks:page=>`<nav>Page ${page.page} of ${page.pages}</nav>`,card:game=>`<article data-game="${game.id}">${esc(game.title)}</article>`,contentTrigger:()=>'<button aria-label="More actions"></button>',friendStrip:()=>'<section>Friends</section>',catalogLoading:()=>'<p>Loading</p>',catalogError:()=>'<p>Error</p>',empty:(title,text)=>`<p>${title} ${text}</p>`});
  return {ui,state};
};
test('home shows Continue and Favorites together without a large showcase',()=>{
  const {ui}=make('',{profile:{name:'<unsafe>',bio:''}}),html=ui.home();assert.match(html,/Welcome back, &lt;unsafe&gt;/);assert.match(html,/Continue playing/);assert.match(html,/Favorites/);assert.match(html,/Friends/);assert.doesNotMatch(html,/store-showcase|home-library-tabs/);assert.equal((html.match(/data-game=/g)||[]).length,12);
  assert.match(html,/Keep your favorites here/);assert.match(html,/Save Cyber Raven: Neon Protocol to favorites/);
});
test('saved games have their own bounded rail and stay out of recommendations',()=>{
  const {ui}=make('',{favorites:['1','15','26']}),html=ui.home();
  const favorites=html.split('id="favorite-games"')[1].split('</section>')[0];assert.equal((favorites.match(/data-game=/g)||[]).length,3);assert.ok(favorites.indexOf('Moonlight Gardens')<favorites.indexOf('Sunset Coast'));assert.match(favorites,/aria-pressed="true"/);
  const recommendations=html.split('id="recommended-games"')[1];assert.doesNotMatch(recommendations,/data-game="(?:1|15|26)"/);
  const many=make('',{favorites:games.map(game=>game.id)}).ui.home();const bounded=many.split('id="favorite-games"')[1].split('</section>')[0];assert.equal((bounded.match(/data-game=/g)||[]).length,8);assert.match(many,/View all 32/);
});
test('explore respects filters and paging without inserting unrelated featured games',()=>{
  const filtered=make('category=Sports+%26+Racing&rating=90&view=list').ui.explore();assert.doesNotMatch(filtered,/store-showcase/);assert.match(filtered,/Matching games/);assert.match(filtered,/Remove Sports &amp; Racing filter/);assert.doesNotMatch(filtered,/Cyber Raven/);
  const second=make('page=2&view=list').ui.explore();assert.doesNotMatch(second,/store-showcase/);assert.match(second,/Page 2 of 3/);assert.equal((second.match(/class="store-game-row"/g)||[]).length,12);
});
test('list and grid controls preserve filters and escape search terms',()=>{
  const html=make('view=grid&category=Action&q=%3Cscript%3E').ui.explore();assert.match(html,/store-results-grid|No games match these filters/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/category=Action/);
  const list=make('view=list').ui.explore();assert.equal((list.match(/class="store-game-row"/g)||[]).length,12);assert.match(list,/game-search-form/);assert.match(list,/<details class="store-refine">/);assert.doesNotMatch(list,/store-showcase/);
});
test('specific tags remain visible in filter chips and survive switching layouts',()=>{
  const html=make('category=Survival&mode=Co-op&tag=Survival').ui.explore();assert.match(html,/Tag: Survival/);assert.match(html,/Remove Survival filter/);assert.match(html,/tag=Survival/);assert.match(html,/value="Survival"/);assert.doesNotMatch(html,/Cyber Raven: Neon Protocol/);
});
test('Explore defaults to a grid, exposes every genre, and has no disinterest controls',()=>{
  const html=make().ui.explore();assert.match(html,/class="game-grid store-results-grid"/);assert.doesNotMatch(html,/store-game-row|Not interested|hide-game|store-options|store-dismiss/);assert.match(html,/Education/);assert.match(html,/Obby &amp; Platformer/);assert.match(html,/Utility &amp; Other/);assert.match(html,/view=list/);
  const list=make('view=list&category=Sports+%26+Racing').ui.explore();assert.equal((list.match(/class="store-game-row"/g)||[]).length,4);assert.doesNotMatch(list,/Not interested|hide-game/);assert.match(list,/Save Coastal Karting to favorites/);
});
