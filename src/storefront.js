import {escapeHtml as esc} from './store.js';
import {recommendGames,gameDetails,genres} from './platform.js';
import {metadataFor} from './catalog-service.js';
import {playedGames,playerGameProgress,formatPlaytime} from './game-progress.js';
import {routeWithParams} from './router.js';

export function createStorefront(ctx){
  const {games,icon,link,button,pageHead,pageLinks,card,friendStrip,catalogLoading,catalogError,empty}=ctx;
  const url=(params,changes)=>esc('#'+routeWithParams('explore',params,{page:null,spotlight:null,...changes}));
  const stats=game=>`<span>${icon('thumbs',13)} ${game.rating}% liked</span><span>${icon('friends',13)} ${esc(game.playing)} playing</span>`;
  const tags=game=>`<div class="store-tags">${metadataFor(game,gameDetails).tags.slice(0,3).map(tag=>'<span>'+esc(tag)+'</span>').join('')}</div>`;
  function saveButton(game,cls='store-save'){
    const saved=ctx.state().favorites.includes(game.id);
    return button('favorite',icon('heart',15),cls,`data-id="${esc(game.id)}" aria-pressed="${saved}" aria-label="${saved?'Remove':'Save'} ${esc(game.title)} ${saved?'from':'to'} favorites" title="${saved?'Remove from favorites':'Save to favorites'}"`);
  }
  function libraryCard(game){
    return `<div class="store-library-item">${card(game)}${ctx.catalog.remote?'':saveButton(game)}</div>`;
  }
  function rail(title,subtitle,items,id,extra='',emptyContent=''){
    return `<section class="store-shelf" aria-labelledby="${id}-heading"><div class="section-top"><div><h2 id="${id}-heading">${title}</h2><p class="section-sub">${subtitle}</p></div><div class="store-shelf-actions">${extra}${items.length>3?`<div class="shelf-controls">${button('scroll','‹','slide-btn',`data-target="${id}" data-direction="-1" aria-label="Scroll ${title} left"`)}${button('scroll','›','slide-btn',`data-target="${id}" data-direction="1" aria-label="Scroll ${title} right"`)}</div>`:''}</div></div>${items.length?`<div class="store-rail ${id==='continue-games'?'continue-rail':''}" id="${id}" tabindex="0" role="region" aria-label="${title}">${items.map(game=>libraryCard(game)).join('')}</div>`:emptyContent}</section>`;
  }
  function home(){
    const state=ctx.state(),recent=playedGames(games,state.profile.name,state.profile.name);
    const byId=new Map(games.map(game=>[game.id,game]));
    const favorites=state.favorites.map(id=>byId.get(id)).filter(Boolean).reverse();
    const continued=recent.slice(0,8).map(record=>({...record.game,playtimeMinutes:record.minutesPlayed}));
    const favoriteCards=favorites.slice(0,8).map(game=>({...game,playtimeMinutes:playerGameProgress(game,state.profile.name,state.profile.name).minutesPlayed}));
    const inLibrary=new Set([...recent.map(record=>record.game.id),...state.favorites]);
    const recommended=recommendGames(games,state).filter(game=>!inLibrary.has(game.id)).slice(0,6);
    const minutes=recent.reduce((sum,record)=>sum+record.minutesPlayed,0);
    const favoritesEmpty=`<div class="store-favorites-empty"><span>${icon('heart',25)}</span><div><h3>Keep your favorites here</h3><p>Use the heart on any game to save it to this list.</p></div>${link('explore','Find games '+icon('arrow',15),'button small')}</div>`;
    return `<div class="store-home home-dashboard">${pageHead('Home','Welcome back, '+esc(state.profile.name)+'.',link('explore','Explore games '+icon('arrow',16),'button small'))}
      <div class="store-home-columns"><div class="store-home-main">
      ${rail('Continue playing','Pick up where you left off. Sample play history.',continued,'continue-games','',empty('Find your first game','Your recently played games will appear here.',link('explore','Explore games','button')))}
      ${rail('Favorites',favorites.length?favorites.length+' saved game'+(favorites.length===1?'':'s')+'. Always easy to find.':'Your saved games, all together.',favoriteCards,'favorite-games',favorites.length>8?link('profile','View all '+favorites.length,'view-all'):'',favoritesEmpty)}
      ${recommended.length?rail('For you',state.preferredGenres.length?'Based on your interests and favorites.':'A few games outside your recent list.',recommended,'recommended-games',link('explore','See more →','view-all')):''}
      </div><aside class="store-home-aside" aria-label="Friends and library">${friendStrip()}<section class="store-library-summary"><span class="eyebrow">YOUR TIME ON METALLIC</span><strong>${formatPlaytime(minutes)}</strong><p>Across ${recent.length} games · Sample playtime</p>${link('profile','View your profile →','text-link')}</section></aside></div></div>`;
  }
  function row(game){
    const info=metadataFor(game,gameDetails);
    return `<article class="store-game-row"><a href="#/game/${encodeURIComponent(game.id)}" class="store-row-link"><img src="${esc(game.art)}" alt="" width="240" height="135" loading="lazy" decoding="async"><div><h3>${esc(game.title)}</h3><p>${esc(game.genre)} · ${esc(info.mode)}</p>${tags(game)}</div><div class="store-row-stats">${stats(game)}</div></a><div class="store-row-actions">${ctx.catalog.remote?link('game/'+encodeURIComponent(game.id),'View','button small'):button('play',icon('play',18),'button play-button store-row-play',`data-id="${esc(game.id)}" aria-label="Play ${esc(game.title)}"`)}${ctx.catalog.remote?'':saveButton(game,'store-row-save')}${ctx.contentTrigger('game',game.id,game.title)}</div></article>`;
  }
  function filters(page){
    const params=ctx.params(),active=['category','mood','mode','tag','rating','unplayed'].filter(key=>params.get(key)&&params.get(key)!=='All').length;
    const fields=[['category','Genre',['All',...genres]],['mode','Play style',['All','Solo','Co-op','Multiplayer']],['mood','Mood',['All','Relaxed','Competitive','Immersive','Social','Quick play']]];
    const availableTags=[...new Set([...games,...(page?.items||[])].flatMap(game=>metadataFor(game,gameDetails).tags))].sort((a,b)=>a.localeCompare(b));
    if(params.get('tag')&&!availableTags.some(tag=>tag.toLowerCase()===params.get('tag').trim().toLowerCase()))availableTags.unshift(params.get('tag').slice(0,30));
    return `<details class="store-refine"><summary>${icon('filter',17)}<strong>Filters${active?' <span class="store-filter-count">'+active+'</span>':''}</strong><span class="store-filter-hint">Genre, play style, tags & more</span><span class="store-filter-chevron" aria-hidden="true">⌄</span></summary>
      <form id="discovery-filter-form"><input type="hidden" name="q" value="${esc(params.get('q')||'')}"><div class="store-filter-grid">${fields.map(([name,label,values])=>`<div><label for="filter-${name}">${label}</label><select id="filter-${name}" name="${name}">${values.map(value=>`<option value="${esc(value)}" ${(params.get(name)||'All')===value?'selected':''}>${value==='All'?'Any '+(name==='category'?'genre':name==='mode'?'style':'mood'):esc(value)}</option>`).join('')}</select></div>`).join('')}<div><label for="filter-tag">Specific tag</label><select id="filter-tag" name="tag"><option value="">Any tag</option>${availableTags.map(tag=>`<option value="${esc(tag)}" ${tag.toLowerCase()===(params.get('tag')||'').trim().toLowerCase()?'selected':''}>${esc(tag)}</option>`).join('')}</select></div><div><label for="filter-rating">Player rating</label><select id="filter-rating" name="rating"><option value="">Any rating</option><option value="90" ${params.get('rating')==='90'?'selected':''}>90% and above</option><option value="95" ${params.get('rating')==='95'?'selected':''}>95% and above</option></select></div>${!ctx.catalog.remote?`<label class="store-hide-favorites"><input type="checkbox" name="unplayed" ${params.get('unplayed')==='1'?'checked':''}><span>Hide my favorites</span></label>`:''}</div><div class="store-filter-footer"><p>Filters work together. Try Survival + Co-op + a 90% rating.</p><div>${button('clear-game-filters','Reset filters','text-button')}<button class="button" type="submit">Apply filters</button></div></div></form></details>`;
  }
  function explore(){
    const params=ctx.params(),state=ctx.state(),routeData=ctx.routeData(),page=routeData.status==='ready'?routeData.value:null,sort=params.get('sort')||'recommended',grid=params.get('view')!=='list';
    const chips=[...params].filter(([key,value])=>['q','category','mood','mode','tag','rating','unplayed'].includes(key)&&value&&value!=='All');
    const hasFilters=chips.length>0;
    return `<div class="store-explore">${pageHead('Explore','Find a game for whatever you feel like playing.')}
      <form id="game-search-form" class="store-search" role="search"><label for="explore-search" class="sr-only">Search games</label>${icon('search',20)}<input id="explore-search" name="q" type="search" maxlength="160" placeholder="Search by name, genre, or tag" value="${esc(params.get('q')||'')}"><button class="button" type="submit">Search</button></form>
      <div class="store-genre-bar"><label for="browse-genre">Genre</label><select id="browse-genre" aria-label="Browse by genre"><option value="All">All genres</option>${genres.map(genre=>`<option value="${esc(genre)}" ${params.get('category')===genre?'selected':''}>${esc(genre)}</option>`).join('')}</select><span>Choose a genre, or combine filters below.</span></div>
      ${filters(page)}
      <section id="browse-games" class="store-results discovery-results"><div class="section-top"><div><h2>${params.get('q')?'Results for “'+esc(params.get('q'))+'”':hasFilters?'Matching games':sort==='players'?'Popular right now':sort==='rating'?'Top rated games':'Browse games'}</h2><p class="section-sub" role="status">${page?page.total.toLocaleString()+' game'+(page.total===1?'':'s'):routeData.status==='loading'?'Finding games…':''}${hasFilters?' · Filters applied':''}</p></div><div class="store-result-tools"><nav class="store-view-switch" aria-label="Game layout">${[['list','List'],['grid','Grid']].map(([view,label])=>`<a href="${url(params,{view:view==='grid'?null:view,page:params.get('page')})}" ${(grid?view==='grid':view==='list')?'aria-current="true"':''}>${label}</a>`).join('')}</nav><label class="sort-label">Sort by<select id="sort" aria-label="Sort games">${[['recommended','For you'],['players','Most popular'],['rating','Top rated'],['name','Name']].map(([value,label])=>`<option value="${value}" ${sort===value?'selected':''}>${label}</option>`).join('')}</select></label></div></div>
      ${chips.length?`<div class="active-filters" aria-label="Active game filters">${chips.map(([key,value])=>button('remove-filter',esc(key==='q'?'“'+value+'”':key==='rating'?value+'%+ liked':key==='unplayed'?'Favorites hidden':key==='tag'?'Tag: '+value:value)+' '+icon('close',12),'filter-chip',`data-key="${key}" aria-label="Remove ${esc(key==='unplayed'?'hide favorites':value)} filter"`)).join('')}${button('clear-search','Clear all','text-button')}</div>`:''}
      ${routeData.status==='loading'?catalogLoading():routeData.status==='error'?catalogError():page?.total?`<div class="${grid?'game-grid store-results-grid':'store-game-list'}">${page.items.map(game=>grid?libraryCard(game):row(game)).join('')}</div>${pageLinks(page,'games')}`:!ctx.catalog.remote&&state.hiddenGames.length&&!hasFilters?empty('No recommendations left.','Restore hidden games to browse them again.',button('reset-hidden','Restore hidden games','button')):empty('No games match these filters.','Try removing a tag, changing the genre, or choosing another play style.',button('clear-search','Clear all filters','button'))}</section>
      <div class="store-discovery-note"><span>${icon('explore',17)} ${state.preferredGenres.length?'Recommendations use your interests and favorites.':'Want recommendations that fit you?'}</span>${button('preferences','Choose your interests','text-button')}</div></div>`;
  }
  return {home,explore};
}
