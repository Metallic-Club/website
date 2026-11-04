import {games} from './catalog.js';

const styles={Adventure:['Explorer’s pack','Compass badge, trail effects, and an explorer nameplate.'],Action:['Arena collection','Victory effects, a profile banner, and a custom player nameplate.'],Obby:['Trail collection','Three colorful trails and a finish-line celebration.'],Simulation:['Builder’s collection','Decorative building finishes and a custom workshop sign.'],Roleplay:['City collection','A collection of room decorations and a custom player nameplate.'],Racing:['Pit crew collection','Vehicle paint finishes and a custom race number plate.']};
const known=new Map(games.map(game=>[game.id,game]));
export function passesFor(game){
  if(!game||!known.has(game.id))return [];
  const [title,description]=styles[game.genre]||styles.Adventure;
  return [{key:'collection',title,description,price:150,icon:'wardrobe'},
    {key:'supporter',title:'Supporter pass',description:'A supporter nameplate and an exclusive chat title. A little thank-you for supporting this game.',price:250,icon:'heart'},
    {key:'effects',title:'Celebration pack',description:'Extra emotes and celebration effects to use with friends. Cosmetic extras only.',price:100,icon:'achievement'}]
    .map(pass=>({...pass,id:game.id+'-'+pass.key,gameId:game.id,gameTitle:game.title}));
}
export function passById(id){const game=known.get(typeof id==='string'?id.split('-')[0]:'');return passesFor(game).find(pass=>pass.id===id)||null;}
export function normalizePasses(value){return Array.isArray(value)?[...new Set(value.filter(id=>passById(id)))].slice(0,games.length*3):[];}
export function buyPassPreview(state,id){
  const pass=passById(id),owned=normalizePasses(state.gamePasses);
  if(!pass)return {ok:false,error:'This game pass is unavailable.'};
  if(owned.includes(id))return {ok:false,error:'You already own this pass in the preview.'};
  if(!Number.isSafeInteger(state.previewAlloy)||state.previewAlloy<pass.price)return {ok:false,error:'You need '+pass.price+' Alloy in your preview balance.'};
  state.gamePasses=[...owned,id];state.previewAlloy-=pass.price;
  return {ok:true,pass};
}
export function createGamePassUI(ctx){
  const {icon,button,modal,dialog,render,persist,toast}=ctx;
  function page(game){
    const owned=new Set(ctx.state().gamePasses||[]);
    return `<section class="game-passes"><div class="section-top"><div><h2>Game passes</h2><p class="section-sub">One-time extras for this game.</p></div><span class="muted small-text">${ctx.state().previewAlloy.toLocaleString()} Alloy · Preview balance</span></div><div class="pass-grid">${passesFor(game).map(pass=>`<article class="pass-card"><div class="pass-symbol">${icon(pass.icon,32)}</div><span class="eyebrow">${owned.has(pass.id)?'IN YOUR COLLECTION':'ONE-TIME PASS'}</span><h3>${pass.title}</h3><p>${pass.description}</p>${owned.has(pass.id)?'<span class="pass-owned">'+icon('check',16)+' Owned in preview</span>':button('view-game-pass',icon('alloy',16)+' '+pass.price+' Alloy','button',`data-id="${pass.id}" aria-label="View ${pass.title}"`)}</article>`).join('')}</div><p class="fine-print">Example passes. Purchases use your browser’s preview balance, do not charge real money, and do not grant live in-game benefits.</p></section>`;
  }
  function handleAction(action,el){
    if(!['view-game-pass','buy-game-pass'].includes(action))return false;
    const pass=passById(el.dataset.id);if(!pass){toast('This game pass is unavailable.');return true;}
    if(action==='view-game-pass'){
      const state=ctx.state(),owned=state.gamePasses?.includes(pass.id),affordable=state.previewAlloy>=pass.price;
      modal('Game pass preview',`<div class="pass-dialog"><span class="pass-symbol">${icon(pass.icon,32)}</span><h3>${pass.title}</h3><p>${pass.description}</p><dl><div><dt>Game</dt><dd>${pass.gameTitle}</dd></div><div><dt>One-time cost</dt><dd>${pass.price} Alloy</dd></div><div><dt>Preview balance</dt><dd>${state.previewAlloy.toLocaleString()} Alloy</dd></div></dl><p class="fine-print">This only previews a purchase in this browser. No real payment or live entitlement is created.</p>${owned?'<p>Already owned in this preview.</p>':button('buy-game-pass',affordable?'Preview purchase · '+pass.price+' Alloy':'Not enough preview Alloy','button primary full',`data-id="${pass.id}" ${affordable?'':'disabled'}`)}</div>`);
    }else{const result=buyPassPreview(ctx.state(),pass.id);if(!result.ok)toast(result.error);else{dialog.close();persist('Game pass added to your preview collection.');render();}}
    return true;
  }
  return {page,handleAction};
}
