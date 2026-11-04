import {sampleGenreFamily} from './genres.js';
// Illustrative gameplay records for the website preview. Launcher activity is
// not measured by the browser; live progress will come from the game service.
const sets={
  Adventure:[['first-session','First steps','Enter this world for the first time.'],['first-discovery','Off the beaten path','Discover a new area.'],['first-quest','A job well done','Complete your first quest.'],['hidden-path','Hidden in plain sight','Find a secret route.'],['teamwork','Better together','Complete an objective with another player.'],['collector','A growing collection','Collect every item in a set.'],['explorer','Every corner','Visit every region.'],['finale','The journey continues','Finish the main adventure.']],
  Action:[['first-session','Ready for action','Play your first match.'],['first-victory','First victory','Win a match.'],['teamwork','Team player','Complete a team objective.'],['streak','On a roll','Win three matches in a row.'],['specialist','Specialist','Complete a character challenge.'],['mastery','Arena regular','Reach the final progression milestone.']],
  Obby:[['first-session','On your feet','Start your first course.'],['checkpoint','One jump at a time','Reach a checkpoint.'],['first-clear','Finish line','Complete a course.'],['speedrun','Against the clock','Beat the course time target.'],['flawless','Without a scratch','Finish a course without falling.'],['mastery','Course complete','Complete every course.']],
  Simulation:[['first-session','A fresh start','Begin your first session.'],['first-build','Made by you','Build your first structure.'],['gatherer','Gatherer','Collect a full set of basic resources.'],['upgrade','Moving up','Upgrade your first building.'],['community','A helping hand','Complete a community task.'],['mastery','Built to last','Reach the final building milestone.']],
  Roleplay:[['first-session','Welcome to the neighborhood','Visit the city for the first time.'],['meetup','Meet the neighbors','Join a community activity.'],['home','Make yourself at home','Set up your first home.'],['explorer','Around town','Visit every district.'],['community','Part of the community','Complete every city activity.']],
  Racing:[['first-session','Start your engines','Enter your first race.'],['first-finish','Across the line','Finish a race.'],['podium','On the podium','Place in the top three.'],['personal-best','A little faster','Beat your previous lap record.'],['clean-race','Clean racing','Finish a race without a collision.'],['mastery','Circuit champion','Win on every circuit.']],
};
const history={
  self:[['1',382,['first-session','first-discovery','first-quest','hidden-path','teamwork']],['2',148,['first-session','checkpoint','first-clear']],['5',740,['first-session','first-build','gatherer','upgrade']],['9',90,['first-session','first-finish']],['6',40,['first-session']],['3',210,['first-session','first-victory']]],
  heroX_x:[['1',1640,['first-session','first-discovery','first-quest','hidden-path','teamwork','collector']],['3',900,['first-session','first-victory','teamwork','streak','specialist']],['2',270,['first-session','checkpoint','first-clear','speedrun']]],
  CRIMSONSLAYER:[['4',2240,['first-session','first-victory','teamwork','streak','specialist']],['14',680,['first-session','first-victory','teamwork']],['1',120,['first-session']]],
  '00RIP_INDRA':[['3',3200,['first-session','first-victory','teamwork','streak','specialist','mastery']],['8',870,['first-session','first-discovery','first-quest']]],
  PixelNova:[['5',945,['first-session','first-build','gatherer','upgrade','community']],['13',560,['first-session','first-build','gatherer']]],
  CloudBuilder:[['5',1200,['first-session','first-build','gatherer','upgrade','community','mastery']],['11',780,['first-session','first-build','gatherer','upgrade']]],
  LunaBlocks:[['13',1800,['first-session','first-build','gatherer','upgrade','community','mastery']],['6',230,['first-session','meetup']]],
  NeonFox:[['9',2400,['first-session','first-finish','podium','personal-best','clean-race','mastery']]],
  OrbitKai:[['7',610,['first-session','first-discovery','first-quest','hidden-path']]],
  "Metallic": [["15", 95, ["first-session"]], ["1", 40, ["first-session"]]],
  "AstraAdmin": [["16", 152, ["first-session"]], ["2", 59, ["first-session"]]],
  "AtlasAdmin": [["17", 209, ["first-session"]], ["3", 78, ["first-session"]]],
  "SageMod": [["18", 266, ["first-session"]], ["4", 97, ["first-session"]]],
  "FramePilot": [["15", 323, ["first-session"]], ["5", 116, ["first-session"]]],
  "StudioMoss": [["20", 380, ["first-session"]], ["6", 135, ["first-session"]]],
  "HarborWorks": [["21", 437, ["first-session"]], ["7", 154, ["first-session"]]],
  "CrystalByte": [["16", 494, ["first-session"]], ["8", 173, ["first-session"]]],
  "Frostleaf": [["17", 551, ["first-session"]], ["9", 192, ["first-session"]]],
  "IronHarbor": [["18", 608, ["first-session"]], ["10", 211, ["first-session"]]],
  "VoltWorkshop": [["25", 665, ["first-session"]], ["11", 230, ["first-session"]]],
  "PrismForge": [["20", 722, ["first-session"]], ["12", 249, ["first-session"]]],
  "CloudSkipper": [["21", 779, ["first-session"]], ["13", 268, ["first-session"]]],
  "EmberArcade": [["22", 836, ["first-session"]], ["14", 287, ["first-session"]]],
  "NovaSteps": [["23", 893, ["first-session"]], ["1", 306, ["first-session"]]],
  "WillowCraft": [["26", 950, ["first-session"]], ["2", 325, ["first-session"]]],
  "MapleLane": [["27", 1007, ["first-session"]], ["3", 344, ["first-session"]]],
  "BoardwalkBee": [["28", 1064, ["first-session"]], ["4", 363, ["first-session"]]],
  "SkyrailWorks": [["15", 1121, ["first-session"]], ["5", 382, ["first-session"]]],
  "PineCircuit": [["30", 1178, ["first-session"]], ["6", 401, ["first-session"]]],
  "CoralKart": [["31", 1235, ["first-session"]], ["7", 420, ["first-session"]]],
  "AeroShift": [["32", 1292, ["first-session"]], ["8", 439, ["first-session"]]],
  "CobaltWave": [["19", 1349, ["first-session"]], ["9", 458, ["first-session"]]],
  "RiverRune": [["20", 1406, ["first-session"]], ["10", 477, ["first-session"]]],

};
const recordsFor=(name,currentUsername)=>name===currentUsername?history.self:Object.hasOwn(history,name)&&name!=='self'?history[name]:[];
export function formatPlaytime(value){
  const minutes=Number.isFinite(value)?Math.max(0,Math.floor(value)):0,hours=Math.floor(minutes/60),remaining=minutes%60;
  return hours?hours.toLocaleString('en-US')+'h'+(remaining?' '+remaining+'m':''):minutes+'m';
}
export function achievementsFor(game){return (sets[sampleGenreFamily(game.genre)]||sets.Adventure).map(([key,name,description])=>({id:game.id+':'+key,key,name,description}));}
export function playerGameProgress(game,name,currentUsername){
  const record=recordsFor(name,currentUsername).find(([id])=>id===game.id),earned=new Set(record?.[2]||[]);
  const achievements=achievementsFor(game).map(item=>({...item,unlocked:earned.has(item.key)}));
  const unlocked=achievements.filter(item=>item.unlocked).length,total=achievements.length;
  return {game,minutesPlayed:record?.[1]||0,achievements,unlocked,total,percent:Math.round(unlocked/total*100)};
}
export function playedGames(catalog,name,currentUsername){
  const byId=new Map(catalog.map(game=>[game.id,game]));
  return recordsFor(name,currentUsername).map(([id])=>byId.get(id)).filter(Boolean).map(game=>playerGameProgress(game,name,currentUsername));
}
export function progressTotals(records){return records.reduce((total,record)=>({minutesPlayed:total.minutesPlayed+record.minutesPlayed,unlocked:total.unlocked+record.unlocked,total:total.total+record.total,games:total.games+1}),{minutesPlayed:0,unlocked:0,total:0,games:0});}
