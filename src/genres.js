export const genres=Object.freeze([
  'Action','Adventure','Education','Entertainment','Obby & Platformer',
  'Party & Casual','Puzzle','RPG','Roleplay & Avatar Sim','Shooter','Shopping',
  'Simulation','Social','Sports & Racing','Strategy','Survival','Utility & Other',
]);
const aliases=Object.freeze({Obby:'Obby & Platformer',Roleplay:'Roleplay & Avatar Sim',Racing:'Sports & Racing'});
export function normalizeGenre(value){
  if(typeof value!=='string')return '';
  const genre=Object.hasOwn(aliases,value)?aliases[value]:value;
  return genres.includes(genre)?genre:'';
}
// Existing example progress and cosmetic pass sets keep their definitions when
// a sample game's public genre label changes.
const sampleFamilies=Object.freeze({'Obby & Platformer':'Obby','Roleplay & Avatar Sim':'Roleplay','Sports & Racing':'Racing',Shooter:'Action',Strategy:'Action',Survival:'Adventure',Puzzle:'Action'});
export const sampleGenreFamily=genre=>Object.hasOwn(sampleFamilies,genre)?sampleFamilies[genre]:genre;
