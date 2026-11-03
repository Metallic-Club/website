import test from 'node:test';
import assert from 'node:assert/strict';
import {games} from '../src/catalog.js';
import {achievementsFor,playerGameProgress,playedGames,progressTotals,formatPlaytime} from '../src/game-progress.js';

test('game achievement totals come from unique game-scoped definitions',()=>{
  const allIds=[];
  for(const game of games){
    const definitions=achievementsFor(game);assert.ok(definitions.length>=5);assert.ok(definitions.every(item=>item.name&&item.description));allIds.push(...definitions.map(item=>item.id));
    const progress=playerGameProgress(game,'RavenDev','RavenDev');assert.equal(progress.total,definitions.length);assert.equal(progress.unlocked,progress.achievements.filter(item=>item.unlocked).length);assert.ok(progress.unlocked>=0&&progress.unlocked<=progress.total);
  }
  assert.equal(new Set(allIds).size,allIds.length);
});

test('profiles show separate per-game progress and keep the same own history after a display-name change',()=>{
  const game=games.find(game=>game.id==='1');
  const own=playerGameProgress(game,'RavenDev','RavenDev'),renamed=playerGameProgress(game,'Mattoid','Mattoid'),friend=playerGameProgress(game,'heroX_x','Mattoid');
  assert.equal(own.unlocked,5);assert.equal(own.total,8);assert.equal(own.minutesPlayed,382);assert.equal(renamed.unlocked,own.unlocked);assert.equal(renamed.minutesPlayed,own.minutesPlayed);assert.equal(friend.unlocked,6);assert.equal(friend.minutesPlayed,1640);
  assert.equal(playerGameProgress(game,'NoSuchPlayer','Mattoid').unlocked,0);assert.equal(playerGameProgress(game,'NoSuchPlayer','Mattoid').minutesPlayed,0);
  assert.deepEqual(playedGames(games,'constructor','Mattoid'),[]);assert.deepEqual(playedGames(games,'self','Mattoid'),[]);
});

test('history only resolves available games, totals agree, and reading progress never mutates its source',()=>{
  const records=playedGames(games,'Mattoid','Mattoid'),totals=progressTotals(records);
  assert.equal(totals.games,6);assert.equal(totals.minutesPlayed,1610);assert.equal(totals.unlocked,17);assert.equal(totals.total,37);
  const available=games.filter(game=>game.id==='2');assert.deepEqual(playedGames(available,'Mattoid','Mattoid').map(record=>record.game.id),['2']);
  records[0].achievements.length=0;records.reverse();assert.equal(playedGames(games,'Mattoid','Mattoid')[0].achievements.length,8);assert.equal(playedGames(games,'Mattoid','Mattoid')[0].game.id,'1');
});

test('playtime formatting handles minute/hour boundaries and invalid or fractional input',()=>{
  for(const [input,expected] of [[0,'0m'],[59,'59m'],[60,'1h'],[61,'1h 1m'],[1610,'26h 50m'],[-1,'0m'],[NaN,'0m'],[Infinity,'0m'],[1.9,'1m']])assert.equal(formatPlaytime(input),expected);
});
