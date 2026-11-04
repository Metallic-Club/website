import test from 'node:test';
import assert from 'node:assert/strict';
import {genres,normalizeGenre} from '../src/genres.js';
import {games} from '../src/catalog.js';
import {gameDetails} from '../src/platform.js';
import {defaults,loadState,filterGames} from '../src/store.js';
import {readRoute} from '../src/router.js';
import {createLocalCatalog} from '../src/catalog-service.js';
import {achievementsFor} from '../src/game-progress.js';
test('all 17 requested genres are canonical and every sample game belongs to one',()=>{
  assert.deepEqual([...genres],['Action','Adventure','Education','Entertainment','Obby & Platformer','Party & Casual','Puzzle','RPG','Roleplay & Avatar Sim','Shooter','Shopping','Simulation','Social','Sports & Racing','Strategy','Survival','Utility & Other']);
  assert.ok(games.every(game=>genres.includes(game.genre)));assert.equal(normalizeGenre('__proto__'),'');assert.equal(normalizeGenre(null),'');
});
test('legacy genre links and saved interests migrate without dropping preferences',()=>{
  const storage={getItem:()=>JSON.stringify({preferredGenres:['Obby','Roleplay','Racing','Action','Adventure','Education','Entertainment']})};
  assert.deepEqual(loadState(storage).preferredGenres,['Obby & Platformer','Roleplay & Avatar Sim','Sports & Racing','Action','Adventure','Education','Entertainment']);
  assert.deepEqual(loadState({getItem:()=>JSON.stringify({preferredGenres:[...genres]})}).preferredGenres,[...genres]);
  for(const [old,current] of [['Obby','Obby & Platformer'],['Roleplay','Roleplay & Avatar Sim'],['Racing','Sports & Racing']]){
    const route=readRoute('#/explore?category='+old);assert.equal(route.category,current);assert.equal(route.params.get('category'),current);
    assert.ok(filterGames(games,'',old).every(game=>game.genre===current));
  }
});
test('ampersand genres, survival tags, and empty genres filter accurately',()=>{
  const catalog=createLocalCatalog(games,gameDetails);
  const racing=catalog.list(new URLSearchParams({category:'Sports & Racing'}),defaults);assert.equal(racing.total,4);assert.ok(racing.items.every(game=>game.genre==='Sports & Racing'));
  const survival=catalog.list(new URLSearchParams({category:'Survival',mode:'Co-op',tag:'Survival'}),defaults);assert.equal(survival.total,3);
  assert.equal(catalog.list(new URLSearchParams({category:'Education'}),defaults).total,0);
});
test('renaming genres keeps existing example achievement definitions stable',()=>{
  for(const [id,total,key] of [['2',6,'checkpoint'],['6',5,'meetup'],['9',6,'first-finish'],['12',6,'first-victory'],['14',6,'first-victory'],['19',6,'first-victory'],['20',6,'first-victory'],['10',8,'first-discovery']]){
    const achievements=achievementsFor(games.find(game=>game.id===id));assert.equal(achievements.length,total);assert.ok(achievements.some(item=>item.key===key));
  }
});
