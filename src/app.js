import { games } from './catalog.js';
import { loadState, saveState, filterGames, updateFriendship, outfits, accessories, colors, templates, escapeHtml as esc } from './store.js';
import { readRoute, routeWithParams, categories, friendTabs } from './router.js';
import { portrait, community, personInfo } from './avatar.js';
import { genres, cosmeticSlots, creatorTypes, settingsSections, gameDetails, recommendGames, recommendationGenres, discoverGames, connections, mutualFriends, sampleFavorites, badges, marketplaceAssets, assetMatches } from './platform.js';

let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw Error('Unavailable'); } }; }
let state = loadState(storage);
let route, params, category = 'All', sort = 'recommended', friendTab = 'All friends', wardrobeTab = 'Outfits', platform = 'Windows';
let draftOutfit = state.outfit, draftColor = state.color, draftAccessory = state.accessory;
let avatarBack = false, settingsDirty = false, notificationsOpen = false;
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
  explore: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  wardrobe: '<path d="m8 3 4 3 4-3 6 5-4 4-2-2v11H8V10l-2 2-4-4z"/>',
  create: '<path d="M12 3v18M3 12h18"/>',
  alloy: '<path d="m12 2 9 5v10l-9 5-9-5V7zM12 7l4 2v6l-4 2-4-2V9z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  friends: '<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 4 5"/>',
  settings: '<path d="m9 3-1 3-3 1v4l2 1-2 2v4l3 1 1 3h6l1-3 3-1v-4l-2-2 2-1V7l-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0v6l-2 4h16l-2-4zM10 21h4"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 8 15 8 15s13-10 8-15z"/>',
  play: '<path d="m8 4 13 8-13 8z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  thumbs: '<path d="M7 10v11H3V10zM7 10l5-7c2 0 3 1 2 4l-1 3h6q3 0 2 4l-2 7H7"/>',
  rotate: '<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M5 12v9h14v-9"/>',
  marketplace: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18M8 7V4h8v3M9 15h6"/>',
  models: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
  audio: '<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
  plugins: '<path d="M8 3v5m8-5v5M5 8h14v4a7 7 0 0 1-14 0zM12 19v3"/>',
  filter: '<path d="M3 6h18M6 12h12M9 18h6"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/>',
  badge: '<circle cx="12" cy="9" r="6"/><path d="m8 14-2 8 6-3 6 3-2-8M10 9l2 2 3-4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
function icon(name, size = 20) { return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.explore}</svg>`; }
const brand = () => `<a class="brand" href="${['','login','signup'].includes(route)?'#/':'#/home'}"><span class="brand-glyph">M</span><span class="brand-word">Metallic</span></a>`;
const referenceAvatar = (index = 0, cls = '') => `<img class="avatar ${cls}" src="art/avatar-${index % 4}.svg" alt="" width="72" height="72">`;
const avatar = (index = 0, cls = '') => index === 0 ? portrait(state, cls) : referenceAvatar(index, cls);
const link = (to, text, cls = 'button primary') => `<a class="${cls}" href="#/${to}">${text}</a>`;
const button = (action, text, cls = 'button', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
function persist(message) { const saved = saveState(storage, state); toast(saved ? message : `${message} for this visit. Browser storage is unavailable.`); }
let toastTimer;
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000); }
function modal(title, body) { dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${button('close-dialog', icon('close'), 'plain-icon', 'aria-label="Close dialog"')}</div>${body}`; if (!dialog.open) dialog.showModal(); }
const pageHead = (title, subtitle, action = '') => `<div class="page-head"><div><h1>${title}</h1><p class="welcome">${subtitle}</p></div>${action}</div>`;
const empty = (title, text, action = '') => `<div class="empty-state">${icon('explore', 36)}<h3>${title}</h3><p>${text}</p>${action}</div>`;
function card(game) {
  return `<a class="game-card" href="#/game/${game.id}" aria-label="${esc(game.title)}">
    <span class="game-art"><img class="poster-art" src="${game.art}" alt="" loading="lazy" width="240" height="240">
      <span class="game-genre">${game.genre}</span><span class="game-play">${icon('play', 18)}</span>
      ${state.favorites.includes(game.id) ? `<span class="saved-marker" title="Saved to favorites">${icon('heart',13)}</span>` : ''}
    </span><span class="game-title">${esc(game.title)}</span>
    <span class="game-stats"><span class="stat-rating" aria-label="${game.rating} percent liked">${icon('thumbs',13)} ${game.rating}%</span><span aria-label="${esc(game.playing)} playing">${icon('profile',13)} ${esc(game.playing)}</span></span>
  </a>`;
}
function shelf(title, subtitle, items, id, destination = 'explore') {
  return `<section class="home-section"><div class="section-top"><div><h2>${title}</h2>${subtitle ? `<p class="section-sub">${subtitle}</p>` : ''}</div>
    <div class="section-actions">${link(destination,'See all '+icon('arrow',15),'view-all')}
    <div class="shelf-controls">${button('scroll','‹','slide-btn',`data-target="${id}" data-direction="-1" aria-label="Scroll ${title} left"`)}${button('scroll','›','slide-btn',`data-target="${id}" data-direction="1" aria-label="Scroll ${title} right"`)}</div></div></div>
    <div class="card-scroller" id="${id}" tabindex="0" role="region" aria-label="${title} games">${items.map(card).join('')}</div></section>`;
}
function navItem(id, label) { return `<a class="side-link ${route === id ? 'active' : ''}" href="#/${id}" ${route === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span>${id === 'friends' && state.requests.length ? `<span class="nav-count">${state.requests.length}</span>` : ''}</a>`; }
function shell(content, publicPage = false) {
  const primary=[['home','Home'],['explore','Explore'],['wardrobe','Wardrobe'],['create','Create']];
  const mainNav=primary.map(([id,label])=>`<a href="#/${id}" class="${route===id?'active':''}" ${route===id?'aria-current="page"':''}>${label}</a>`).join('');
  const unread=notificationItems().filter(item=>!state.readNotifications.includes(item.id)).length;
  return `<header class="topbar">${!publicPage?button('menu',icon('menu'),'mobile-menu','aria-label="Toggle navigation" aria-controls="sidebar" aria-expanded="false"'):''}${brand()}
    <nav class="topnav" aria-label="Main navigation">${mainNav}</nav>
    ${!publicPage?`<form class="top-search" id="search-form" role="search">${icon('search',18)}<input id="site-search" name="q" type="search" placeholder="Search games" aria-label="Search games" value="${esc(params.get('q')||'')}" autocomplete="off" aria-controls="search-suggestions" aria-expanded="false"><button class="search-submit" type="submit" aria-label="Search">${icon('arrow',16)}</button><div id="search-suggestions" hidden aria-label="Game suggestions"></div></form>
    <div class="top-actions">${button('notifications',icon('bell')+(unread?'<span class="notification-dot"></span>':''),'plain-icon','id="notification-toggle" aria-label="Notifications" aria-controls="notification-popover" aria-expanded="false"')}<a href="#/alloy" class="wallet" title="Sample Alloy balance">${icon('alloy',19)}<span>1,450</span></a><a href="#/profile" class="top-profile" aria-label="View your profile">${avatar()}<span class="username">${esc(state.profile.name)}</span></a></div>`:`<div class="top-actions">${link('login','Log in','button quiet')}${link('signup','Sign up','button primary')}</div>`}</header>
    ${!publicPage?`<section id="notification-popover" class="notification-popover" role="region" aria-label="Notification inbox" hidden></section><button class="mobile-backdrop" data-action="menu" aria-label="Close navigation"></button>
    <aside class="sidebar" id="sidebar"><span class="side-section-label">COMMUNITY</span><nav class="nav-group" aria-label="Community navigation">${navItem('friends','Friends')}${navItem('marketplace','Marketplace')}</nav><span class="side-section-label">YOUR ACCOUNT</span><nav class="nav-group" aria-label="Account navigation">${navItem('alloy','Buy Alloy')}${navItem('settings','Settings')}</nav><span class="side-section-label">METALLIC</span><nav class="nav-group" aria-label="Platform tools">${navItem('download','Download')}</nav><div class="sidebar-bottom"><div class="premium-box"><div class="premium-title">${icon('download',17)} Your next adventure</div><p>Get the latest on the Metallic launcher.</p>${link('download','Launcher availability','premium-link')}</div><a class="sidebar-about" href="#/">About Metallic ${icon('arrow',14)}</a></div></aside>`:''}
    <main id="main" tabindex="-1" class="${publicPage?'public-page':'page'}"><div class="${publicPage?'public-content':'content'}">${content}<footer class="footer"><span>© ${new Date().getFullYear()} Metallic <span class="demo-label">Platform preview · Sample content</span></span><div class="footer-links">${link('','About','')}${link('download','Download','')}${link('marketplace','Marketplace','')}${link('settings','Settings','')}</div></footer></div></main>`;
}
function landing() {
  return `<section class="landing-hero"><div class="hero-copy"><span class="eyebrow"><span class="live-dot"></span> A new place to play</span><h1>Find your people.<br>Build your world.</h1><p>Jump into new games, make your own adventures, and turn a little imagination into something extraordinary.</p><div class="button-row">${link('signup','Join Metallic '+icon('arrow',18))}${link('explore','Explore games','button')}</div><small>Play. Create. Make it yours.</small></div><div class="hero-mosaic">${[games[0],games[1],games[4],games[5]].map(g=>`<a href="#/game/${g.id}"><img src="${g.art}" alt="${esc(g.title)}"><span>${esc(g.title)}</span></a>`).join('')}<div class="mosaic-caption">A world of possibilities. <span>Made by you.</span></div></div></section><section class="landing-intro"><span class="eyebrow">THIS IS METALLIC</span><h2>One platform.<br>Endless ways to belong.</h2><div class="feature-columns"><article>${icon('explore',28)}<h3>Follow your curiosity</h3><p>From obstacle courses to open worlds, discover a new favorite around every corner.</p>${link('explore','Find your next adventure →','text-link')}</article><article>${icon('wardrobe',28)}<h3>Show up as yourself</h3><p>Make an avatar that feels like you. Experiment with a new look and make your mark.</p>${link('wardrobe','Make it yours →','text-link')}</article><article>${icon('create',28)}<h3>Start with an idea</h3><p>Dream up your own game. Build a space for your friends and the next generation of players.</p>${link('create','Meet the creator hub →','text-link')}</article></div></section>${shelf('A little inspiration','A first look at the worlds of Metallic',games.slice(0,6),'landing-games')}<section class="cta-panel"><div><span class="eyebrow">YOUR NEXT CHAPTER</span><h2>Good things start with play.</h2><p>Take a look around. There’s a place for you here.</p></div>${link('home','Explore the platform '+icon('arrow',18))}</section>`;
}
function friendStrip() {
  return `<section class="home-section friends-section"><div class="section-top"><h2>Friends <span class="muted">(${state.friends.length})</span></h2>${link('friends','See all '+icon('arrow',15),'view-all')}</div>
    <div class="friends-list"><a class="friend" href="#/friends?tab=find"><span class="friend-picture add">${icon('create',28)}</span><span class="friend-name">Add friends</span><span class="friend-activity">Find your people</span></a>
    ${state.friends.map(name => { const person=personInfo(name); return `<a class="friend" href="#/profile?user=${encodeURIComponent(name)}" title="${esc(name)} · ${person.activity}">
      <span class="friend-picture">${referenceAvatar(person.avatar)}${person.activity!=='Offline'?`<i class="presence ${person.game?'playing':'online'}"></i>`:''}</span>
      <span class="friend-name">${esc(name)}</span><span class="friend-activity">${person.activity}</span></a>`; }).join('')}</div></section>`;
}
function home() {
  const favorites = games.filter(g => state.favorites.includes(g.id));
  return `${pageHead('Home',`Welcome back, ${esc(state.profile.name)}`,link('wardrobe',avatar()+' Customize avatar','avatar-shortcut'))}
    ${friendStrip()}
    ${shelf('Continue','Pick up where you left off',games.slice(0,6),'continue')}
    ${!state.launcherDismissed ? `<div class="launcher-strip"><span>${icon('download')}<span><strong>Take Metallic with you</strong><small>Get the latest on the launcher.</small></span></span><div>${link('download','View launcher','button small')}${button('dismiss-launcher',icon('close',16),'plain-icon','aria-label="Dismiss launcher notice"')}</div></div>` : ''}
    ${favorites.length ? shelf('Favorite games','Always worth coming back to',favorites,'favorites','profile') : ''}
    <section class="home-section"><div class="section-top"><div><h2>Recommended for you</h2><p class="section-sub">A new favorite is just around the corner</p></div>${link('explore','See all '+icon('arrow',15),'view-all')}</div>
    ${filters()}<div class="game-grid" id="game-results">${filterGames(recommendGames(games,state),'',category).slice(0,12).map(card).join('')}</div></section>
    ${shelf('Popular right now','Find out what everyone is exploring',filterGames(games,'','All','players').slice(0,8),'popular','explore?sort=players')}
    ${shelf('Top rated','Community favorites',filterGames(games,'','All','rating').slice(0,8),'top-rated','explore?sort=rating')}`;
}
function filters() {
  return `<div class="discover-bar"><div class="categories" role="group" aria-label="Game categories">${categories.map(c=>button('category',c==='All'?'For you':c,`cat ${category===c?'selected':''}`,`data-value="${c}" aria-pressed="${category===c}"`)).join('')}</div></div>`;
}
function explore() {
  const query=params.get('q')||'', ranked=recommendGames(games,state), weights=recommendationGenres(games,state);
  const interest=[...weights].sort((a,b)=>b[1]-a[1]).find(([genre])=>ranked.some(game=>game.genre===genre))?.[0];
  const filtered=['q','category','mood','mode','rating','unplayed'].some(key=>params.get(key)&&params.get(key)!=='All');
  const results=discoverGames(games,state,params), feature=ranked.find(g=>!state.favorites.includes(g.id))||ranked[0];
  const related=interest?ranked.filter(game=>game.genre===interest):ranked.filter(game=>gameDetails[game.id].mood==='Immersive');
  const filterFields=[['category','Genre',['All',...genres]],['mood','In the mood for',['All','Relaxed','Competitive','Immersive','Social','Quick play']],['mode','Play style',['All','Solo','Co-op','Multiplayer']]];
  return `${pageHead('Explore','Find the games that feel like you.',button('preferences',icon('settings',16)+' Tune your recommendations','button small'))}
    <div class="explore-layout"><div class="explore-main">
    ${!filtered&&sort==='recommended'&&feature?`<section class="personalized-hero"><img src="${feature.art}" alt=""><div><span class="eyebrow">${weights.has(feature.genre)?'BECAUSE YOU ENJOY '+feature.genre.toUpperCase():'YOUR NEXT DISCOVERY'}</span><h2>${esc(feature.title)}</h2><p>${interest?'More of what you love, with somewhere new to explore.':'Start with a little curiosity. Find your next favorite.'}</p><div class="game-tag-row">${gameDetails[feature.id].tags.map(tag=>`<span>${tag}</span>`).join('')}</div><div class="discovery-hero-actions">${link('game/'+feature.id,'View game '+icon('arrow',17),'button primary')}${button('hide-game','Not interested','text-button',`data-id="${feature.id}"`)}</div></div></section>
    <div class="discovery-preferences-note"><span>${icon('heart',18)} ${interest?'Recommendations use your genre preferences and favorite games.':'Make this space yours. Pick a few genres to get started.'}</span>${button('preferences',interest?'Edit interests':'Choose interests','text-button')}</div>
    ${related.length?shelf(interest?'Because you enjoy '+interest:'Get lost in a new world',interest?'Picked using your interests':'Games for your curious side',related.slice(0,8),'interest-games','explore?category='+(interest||'Adventure')):''}
    ${shelf('Better with friends','A few worlds worth sharing',ranked.filter(game=>gameDetails[game.id].mode==='Co-op').slice(0,8),'coop-games','explore?mode=Co-op')}
    ${shelf('A change of pace','Something a little different',ranked.filter(game=>game.genre!==interest&&gameDetails[game.id].mood==='Relaxed').slice(0,8),'relaxed-games','explore?mood=Relaxed')}`:''}
    <section class="discovery-results"><div class="section-top"><div><h2>${query?'Results for “'+esc(query)+'”':filtered?'Games for your mood':'More games for you'}</h2><p class="section-sub">${filtered?'Combine filters to find something specific.':interest?'A mix shaped by what you like.':'Choose interests for a more personal selection.'}</p></div><label class="sort-label">Sort by<select id="sort">${[['recommended','For you'],['rating','Top rated'],['players','Most popular'],['name','Name']].map(([value,label])=>`<option value="${value}" ${sort===value?'selected':''}>${label}</option>`).join('')}</select></label></div>
    <div class="results-summary"><span class="result-count" role="status">${results.length} game${results.length===1?'':'s'}</span>${filtered?button('clear-search','Clear filters','text-button'):''}</div><div class="game-grid discovery-game-grid">${results.map(card).join('')}</div>${!results.length?empty('Nothing fits those filters yet.','Try another genre, mood, or play style.',button('clear-search','Clear filters','button primary')):''}</section>
    ${!filtered?shelf('Popular with players','The community’s current favorites',filterGames(games,'','All','players').slice(0,8),'explore-popular','explore?sort=players'):''}
    </div><aside class="explore-filters"><div class="filter-heading"><h2>${icon('filter',18)} Find your game</h2>${button('toggle-filters','Show filters','filter-toggle','aria-expanded="false"')}${filtered?button('clear-search','Reset','text-button'):''}</div><form id="discovery-filter-form"><label for="discovery-query">Search games</label><input id="discovery-query" name="q" type="search" placeholder="Title or tag" value="${esc(query)}">${filterFields.map(([name,label,values])=>`<label for="filter-${name}">${label}</label><select id="filter-${name}" name="${name}">${values.map(value=>`<option value="${value}" ${(params.get(name)||'All')===value?'selected':''}>${value==='All'?'Any '+(name==='category'?'genre':name==='mood'?'mood':'style'):value}</option>`).join('')}</select>`).join('')}
    <label for="filter-rating">Player rating</label><select id="filter-rating" name="rating"><option value="">Any rating</option><option value="90" ${params.get('rating')==='90'?'selected':''}>90% and above</option><option value="95" ${params.get('rating')==='95'?'selected':''}>95% and above</option></select><label class="checkbox-label"><input type="checkbox" name="unplayed" ${params.get('unplayed')==='1'?'checked':''}> Hide my favorites</label><button type="submit" class="button primary full">Apply filters</button></form>
    <div class="filter-personal-note"><h3>Your taste, your picks.</h3><p>${state.preferredGenres.length?state.preferredGenres.join(' · '):'No genre preferences yet.'}</p>${button('preferences','Manage interests','text-button')}</div></aside></div>`;
}
function gamePage() {
  const game=games.find(g=>g.id===route.split('/')[1]);
  if(!game)return notFound();
  const descriptions={Adventure:'Explore the unknown, discover hidden corners, and find your own path through a world full of possibility.',Action:'Bring your best moves, take on a new challenge, and team up with friends for your next adventure.',Obby:'Jump, dodge, and find your rhythm. Every obstacle is another chance to beat your personal best.',Simulation:'Start with a little imagination and make a world your own. Build, discover, and see where your curiosity takes you.',Roleplay:'Meet up with friends, find your favorite corner of the city, and create a story that belongs to you.',Racing:'Find your line and chase the perfect lap. A new personal best is waiting around the next corner.'};
  const related=[...games.filter(g=>g.id!==game.id&&g.genre===game.genre),...games.filter(g=>g.id!==game.id&&g.genre!==game.genre)].slice(0,8);
  return `${link('explore','← Explore games','text-link')}<div class="game-detail"><img class="detail-art" src="${game.art}" alt="${esc(game.title)} artwork"><div><span class="eyebrow">${game.genre}</span><h1>${esc(game.title)}</h1><p class="game-creator">By <strong>Metallic Studio</strong><span class="verified" aria-label="Sample creator">${icon('check',12)}</span></p><p>${descriptions[game.genre]}</p><div class="detail-stats"><div><strong>${game.rating}%</strong><span>Liked</span></div><div><strong>${game.playing}</strong><span>Active players</span></div><div><strong>${game.genre}</strong><span>Genre</span></div></div>
    <div class="game-actions">${button('play',icon('play',22)+' Play','button play-button',`data-id="${game.id}"`)}${button('favorite',icon('heart',18)+(state.favorites.includes(game.id)?' Favorited':' Favorite'),`button ${state.favorites.includes(game.id)?'is-saved':''}`,`data-id="${game.id}" aria-pressed="${state.favorites.includes(game.id)}"`)}${button('share',icon('share',18),'button','aria-label="Share game"')}</div><p class="fine-print">Preview game · Live gameplay is not available yet.</p></div></div>
    <section class="game-about"><h2>About this game</h2><p>${descriptions[game.genre]}</p><div class="game-facts"><div><span>Creator</span><strong>Metallic Studio</strong></div><div><span>Genre</span><strong>${game.genre}</strong></div><div><span>Availability</span><strong>Preview catalog</strong></div><div><span>Play on</span><strong>Metallic Launcher</strong></div></div></section>
    ${shelf('You might also like','Keep exploring',related,'related',`explore?category=${game.genre}`)}`;
}
function auth() {
  const signup=route==='signup';
  return `<div class="auth-layout"><div class="auth-story"><span class="eyebrow">WELCOME TO METALLIC</span><h2>Your next adventure<br>starts here.</h2><img src="art/game-5.svg" alt="Void Crafters world"><p>A little imagination. A whole new world.</p></div>
    <section class="auth-card"><span class="brand-glyph">M</span><h1>${signup?'Sign up for Metallic':'Log in to Metallic'}</h1><p>${signup?'A new world of possibilities starts with you.':'Pick up where you left off.'}</p>
    <form id="auth-form">${signup?`<div class="field"><label for="auth-username">Username</label><input id="auth-username" name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="Choose your username" aria-describedby="username-help"><small id="username-help">3–20 letters, numbers, or underscores.</small></div>`:''}
    <div class="field"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div>
    <div class="field"><label for="password">Password</label><div class="password-field"><input name="password" id="password" type="password" required minlength="8" autocomplete="${signup?'new-password':'current-password'}" placeholder="At least 8 characters" aria-describedby="password-help">${button('password','Show','password-toggle','aria-label="Show password" aria-pressed="false"')}</div><small id="password-help">Use a sample password for this preview.</small></div>
    ${!signup?button('recovery','Forgot your password?','text-button recovery-link'):''}
    <div class="form-notice">Preview only. No account is created. Your email and password are never saved or sent.</div><button class="button primary full" type="submit">${signup?'Preview sign up':'Preview log in'} ${icon('arrow',17)}</button></form>
    <div class="auth-divider"><span>or</span></div>${link('home','Explore as a guest','button full')}<p class="auth-switch">${signup?'Already exploring? '+link('login','Log in','text-link'):'New to Metallic? '+link('signup','Sign up','text-link')}</p></section></div>`;
}
function download() { return `${pageHead('The adventure starts here.','Your home for every Metallic game.')}<section class="download-hero"><div><span class="eyebrow">METALLIC LAUNCHER</span><h2>Less waiting.<br>More playing.</h2><p>One home for your games, your friends, and whatever you discover next.</p><div class="categories">${['Windows','macOS','Linux'].map(p=>button('platform',p,`cat ${platform===p?'selected':''}`,`data-value="${p}" aria-pressed="${platform===p}"`)).join('')}</div><button class="button primary download-button" disabled>${icon('download')} ${platform} release coming soon</button><p class="fine-print">The launcher is in development. An installer will appear here when an official release is available.</p></div><div class="launcher-mock"><div class="window-dots"><i></i><i></i><i></i><span>Metallic Launcher · Preview</span></div><img src="art/game-1.svg" alt="Launcher game preview"><div><strong>Your next adventure</strong><span>Cyber Raven: Neon Protocol</span><span class="launch-preview">${icon('play',15)} Jump in</span></div></div></section><div class="feature-columns download-features"><article><span class="step">01</span><h3>Get the launcher</h3><p>Download the official installer for your device when it becomes available.</p></article><article><span class="step">02</span><h3>Make yourself at home</h3><p>Sign in with your Metallic account and bring your identity with you.</p></article><article><span class="step">03</span><h3>Find your next favorite</h3><p>Explore games and jump into something new.</p></article></div><div class="panel"><h3>${platform} availability</h3><p class="muted">Release date, supported ${platform} versions, and system requirements will be confirmed with the first official launcher build.</p></div>`; }
function mannequin(outfit=draftOutfit,color=draftColor,accessory=draftAccessory,back=avatarBack) {
  return `<div class="mannequin ${outfit.toLowerCase()} ${back?'back-view':''} accessory-${accessory.toLowerCase()}" style="--shirt:${esc(color)}" role="img" aria-label="${esc(outfit)} avatar with ${accessory==='None'?'no accessory':accessory.toLowerCase()}, ${back?'back':'front'} view"><div class="figure-head"><i></i><i></i><span></span><div class="figure-accessory"></div></div><div class="figure-body"><b>M</b></div><div class="figure-arm left"></div><div class="figure-arm right"></div><div class="figure-leg left"></div><div class="figure-leg right"></div></div>`;
}
function wardrobe() {
  const dirty=draftOutfit!==state.outfit||draftColor!==state.color||draftAccessory!==state.accessory;
  return `${pageHead('Wardrobe','Make every adventure a little more you.',button('save-outfit',icon('check',17)+' Save look','button primary',dirty?'':'disabled'))}
    <div class="wardrobe-layout"><section class="avatar-preview"><div class="avatar-preview-top"><span class="eyebrow">YOUR AVATAR</span><span class="tag">${dirty?'Unsaved changes':'Equipped'}</span></div><div class="avatar-stage">${mannequin()}</div>
    <div class="avatar-controls">${button('rotate-avatar',icon('rotate',16)+' '+(avatarBack?'Front view':'Back view'),'button small',`aria-pressed="${avatarBack}"`)}</div><h2>${esc(state.profile.name)}</h2><p>${esc(draftOutfit)} · ${colors.find(c=>c.value===draftColor)?.name||'Custom color'}</p><div class="equipped-items"><span>${icon('wardrobe',16)} ${draftOutfit}</span>${draftAccessory!=='None'?`<span>${draftAccessory}</span>`:''}</div></section>
    <section class="wardrobe-inventory"><div class="line-tabs" role="group" aria-label="Wardrobe categories">${['Outfits','Accessories','Colors'].map(t=>button('wardrobe-tab',t,wardrobeTab===t?'selected':'',`data-value="${t}" aria-pressed="${wardrobeTab===t}"`)).join('')}</div>
    <div class="inventory-heading"><div><h2>${wardrobeTab==='Colors'?'Choose a color':wardrobeTab==='Accessories'?'The finishing touch':'Your outfits'}</h2><p class="muted">${wardrobeTab==='Colors'?'A fresh color for your favorite look.':'Select an item to try it on.'}</p></div><span class="tag">${wardrobeTab==='Colors'?colors.length:3} items</span></div>
    ${wardrobeTab==='Colors'?`<div class="color-grid">${colors.map(c=>`<button type="button" class="color-choice ${draftColor===c.value?'selected':''}" data-action="color" data-value="${c.value}" aria-label="${c.name}" aria-pressed="${draftColor===c.value}"><span style="--swatch:${c.value}">${draftColor===c.value?icon('check',24):''}</span><strong>${c.name}</strong></button>`).join('')}</div>`:
    `<div class="outfit-grid">${(wardrobeTab==='Accessories'?accessories:outfits).map((name,i)=>`<button type="button" class="outfit-card ${(wardrobeTab==='Accessories'?draftAccessory:draftOutfit)===name?'selected':''}" data-action="${wardrobeTab==='Accessories'?'accessory':'outfit'}" data-value="${name}" aria-pressed="${(wardrobeTab==='Accessories'?draftAccessory:draftOutfit)===name}"><span class="outfit-art style-${i}">${portrait({outfit:wardrobeTab==='Outfits'?name:draftOutfit,color:draftColor,accessory:wardrobeTab==='Accessories'?name:draftAccessory},'', '')}<i>${icon('check',14)}</i></span><strong>${name}</strong><small>Owned</small></button>`).join('')}</div>`}
    <div class="wardrobe-save-note"><p>${dirty?'You have unsaved changes. Save your look to update your profile.':'Your saved look appears on your profile and across Metallic.'}</p>${button('reset-outfit','Reset changes','text-button',dirty?'':'disabled')}</div></section></div>`;
}
function create() {
  const tab=Object.hasOwn(creatorTypes,params.get('tab'))?params.get('tab'):'games';
  const slot=cosmeticSlots.includes(params.get('slot'))?params.get('slot'):'';
  const listings=params.get('view')==='listings';
  const items=tab==='games'?state.projects:state.creatorAssets.filter(asset=>asset.type===tab&&(!slot||asset.subcategory===slot)&&(!listings||asset.listing));
  const singular={games:'game',models:'model',audio:'audio',plugins:'plugin',cosmetics:'cosmetic'}[tab];
  return `${pageHead('Creator hub','Build the next thing players fall in love with.',button(tab==='games'?'new-project':'new-asset',icon('create',17)+' New '+singular,'button primary',`data-value="${tab}"`))}
    <div class="creator-topline"><nav class="creator-category-tabs" aria-label="Creator categories">${Object.entries(creatorTypes).map(([key,label])=>link('create?tab='+key,icon(key==='games'?'play':key==='cosmetics'?'wardrobe':key,18)+label,key===tab?'selected':'')).join('')}</nav>${link('marketplace','Creator Marketplace '+icon('arrow',16),'button small')}</div>
    ${tab==='cosmetics'?`<nav class="cosmetic-slots" aria-label="Cosmetic categories">${link('create?tab=cosmetics','All cosmetics',!slot?'selected':'')}${cosmeticSlots.map(name=>link('create?tab=cosmetics&slot='+name,name,slot===name?'selected':'')).join('')}</nav>`:''}
    <section class="creator-workspace-head"><div><span class="eyebrow">YOUR LIBRARY</span><h2>${slot||creatorTypes[tab]}</h2><p>${tab==='games'?'Plan, organize, and build your games.':tab==='models'?'Reusable models, meshes, and materials for your worlds.':tab==='audio'?'Music, ambience, and sounds that bring a game to life.':tab==='plugins'?'Tools that make creating a little easier.':'Wearable ideas, organized by where they belong.'}</p></div><div class="creator-total"><strong>${items.length}</strong><span>${listings?'listing drafts':'local drafts'}</span></div></section>
    ${tab!=='games'?`<nav class="creator-library-tabs" aria-label="Library view">${link('create?tab='+tab+(slot?'&slot='+slot:''),'My assets',!listings?'selected':'')}${link('create?tab='+tab+'&view=listings'+(slot?'&slot='+slot:''),'Listing drafts',listings?'selected':'')}</nav>`:''}
    ${items.length?`<div class="creator-draft-grid">${items.map(item=>`<article class="creator-draft-card"><div class="draft-cover color-${tab==='audio'?'purple':tab==='cosmetics'?'amber':'blue'}">${assetIcon(tab)}<span class="tag">${item.listing?'Listing draft':'Draft'}</span></div><div class="draft-card-body"><h3>${esc(item.name)}</h3><p>${esc(tab==='games'?item.template:item.subcategory||creatorTypes[tab])}</p><div class="button-row">${button(tab==='games'?'edit-project':'edit-asset','Edit','button small',`data-id="${esc(item.id)}"`)}${tab==='games'?button('delete-project','Delete','button quiet small',`data-id="${esc(item.id)}"`):button('prepare-listing',item.listing?'Edit listing':'Prepare listing','button small',`data-id="${esc(item.id)}"`)}</div></div></article>`).join('')}</div>`:
    empty(listings?'Your first listing starts here.':`Your next ${singular} starts here.`,listings?'Create an asset, then prepare its marketplace listing.':tab==='games'?'Give your idea a name and choose a starting template.':'Organize an idea, add its details, and prepare it for your creator library.',button(tab==='games'?'new-project':'new-asset','Create '+singular,'button primary',`data-value="${tab}"`))}
    <section class="creator-market-banner"><span class="market-banner-icon">${icon('marketplace',34)}</span><div><span class="eyebrow">MADE FOR CREATORS</span><h2>Build with the community.</h2><p>Find models, audio, plugins, and cosmetics—or prepare your own assets for sale.</p></div>${link('marketplace','Browse Marketplace '+icon('arrow',17),'button')}</section>
    <p class="fine-print">Local planning drafts. Asset uploads, Studio editing, marketplace publication, and sales will connect when creator services launch.</p>`;
}
const packs = [{amount:400,price:'$4.99'},{amount:800,price:'$9.99'},{amount:1700,price:'$19.99'},{amount:4500,price:'$49.99'}];
function alloy() { return `${pageHead('Buy Alloy','More ways to make Metallic your own.')}<section class="alloy-intro"><div class="alloy-coin">${icon('alloy',72)}</div><div><span class="eyebrow">MAKE MORE OF METALLIC</span><h2>Put your own spin on play.</h2><p>Personalize your avatar and discover more ways to express yourself.</p></div><div class="balance"><span>Sample balance</span><strong>${icon('alloy',24)} 1,450</strong></div></section><div class="notice"><span>${icon('alloy')}<span><strong>Store preview</strong><small>Illustrative packs and prices. Purchases are not available and no payment is collected.</small></span></span></div><div class="alloy-packs">${packs.map((p,i)=>`<article class="alloy-pack ${i===2?'featured':''}">${i===2?'<span class="pack-ribbon">A little extra possibility</span>':''}${icon('alloy',44)}<h2>${p.amount.toLocaleString()}</h2><p>Alloy</p><strong class="pack-price">${p.price} <small>USD</small></strong>${button('review-pack','Preview pack','button '+(i===2?'primary':''),`data-index="${i}"`)}</article>`).join('')}</div><section class="faq"><h2>Good to know</h2><details><summary>What is Alloy?</summary><p>Alloy is the planned virtual currency for Metallic, designed for avatar items and in-game content.</p></details><details><summary>Can I buy Alloy now?</summary><p>Not yet. This is a store preview. Payment processing, final pricing, and purchase terms will be added before the store launches.</p></details><details><summary>Will my preview balance be saved?</summary><p>The displayed 1,450 Alloy is sample content. It is not a real wallet or a transferable balance.</p></details></section>`; }
function profile() {
  const requested=params.get('user'), own=!requested||requested===state.profile.name;
  const person=own?null:community.find(p=>p.name===requested)||(state.friends.includes(requested)?personInfo(requested):null);
  if(!own&&!person)return notFound();
  const name=own?state.profile.name:requested, friends=own?state.friends:[...new Set([...(connections[name]||[]),...(state.friends.includes(name)?[state.profile.name]:[])])], mutual=own?[]:mutualFriends(state,name);
  const favorites=games.filter(game=>(own?state.favorites:(sampleFavorites[name]||[])).includes(game.id));
  const friendAction=state.friends.includes(name)?button('remove-friend','Friends '+icon('check',16),'button',`data-name="${esc(name)}"`):state.requests.includes(name)?button('accept-friend','Accept request','button primary',`data-name="${esc(name)}"`):state.outgoing.includes(name)?button('cancel-friend','Cancel request','button',`data-name="${esc(name)}"`):button('add-friend','Add friend','button primary',`data-name="${esc(name)}"`);
  return `<section class="profile-cover"><div class="cover-mark">M</div><span class="eyebrow">${own?'YOUR CORNER OF METALLIC':'PLAYER PROFILE'}</span></section>
    <section class="profile-header">${own?avatar(0,'profile-avatar'):referenceAvatar(person.avatar,'profile-avatar')}<div><h1>${esc(name)}</h1><p>@${esc(name)} ${own?(state.activity?'<span class="profile-online">● Online in preview</span>':''):`<span class="profile-online">${person.activity}</span>`}</p>
    ${!own?`<a class="mutual-summary" href="#/profile?user=${encodeURIComponent(name)}&friends=mutual"><span class="avatar-stack">${mutual.slice(0,3).map(n=>referenceAvatar(personInfo(n).avatar)).join('')}</span><span>${mutual.length} mutual friend${mutual.length===1?'':'s'}</span></a>`:''}</div><div class="profile-header-action">${own?link('settings?section=account','Edit profile','button'):friendAction}</div></section>
    <div class="account-profile-layout"><div class="profile-main-column">
    ${profileFriends(friends,own,mutual,params.get('friends')==='mutual')}
    <section class="profile-section"><div class="section-top"><h2>Favorite games <span class="muted">(${favorites.length})</span></h2>${own?link('explore','Find more →','view-all'):''}</div>${favorites.length?`<div class="game-grid profile-games">${favorites.map(card).join('')}</div>`:'<div class="inline-empty">No favorite games yet.'+(own?' '+link('explore','Find your next favorite →','text-link'):'')+'</div>'}</section>
    <section class="profile-section"><div class="section-top"><h2>Creations <span class="muted">(${own?state.projects.length:0})</span></h2>${own?link('create','Creator hub →','view-all'):''}</div>${own&&state.projects.length?state.projects.map(project=>`<div class="creation-row"><span>${icon('create')} ${esc(project.name)}</span>${button('edit-project','Edit draft','button small',`data-id="${esc(project.id)}"`)}</div>`).join(''):'<div class="inline-empty">'+(own?'Your next idea belongs here. '+link('create','Create a game →','text-link'):'No published games yet.')+'</div>'}</section>
    <section class="profile-section"><div class="section-top"><h2>Badges</h2><span class="muted small-text">Preview collection</span></div><div class="badge-grid">${badges.slice(0,own?3:2).map((badge,i)=>`<article class="profile-badge"><span class="badge-emblem badge-${i}">${icon(badge.icon,28)}</span><div><h3>${badge.name}</h3><p>${badge.description}</p></div></article>`).join('')}</div></section>
    </div><aside class="profile-meta-column"><section class="panel profile-about"><h3>About</h3><p>${esc(own?state.profile.bio:person.bio)||'No bio yet.'}</p><span class="tag">${own?'Your profile':'Sample player'}</span>${own?link('wardrobe','Customize avatar →','button full'):''}</section>${own?`<section class="profile-avatar-stage">${mannequin(state.outfit,state.color,state.accessory,false)}<span>Currently wearing · ${state.outfit}</span></section>`:''}</aside></div>`;
}
function settings() {
  const section=Object.hasOwn(settingsSections,params.get('section'))?params.get('section'):'account';
  let content='';
  if(section==='account')content=settingsForm(section,`<label for="setting-name">Username</label><input id="setting-name" name="name" aria-label="Username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" value="${esc(state.profile.name)}"><small class="field-hint">3–20 letters, numbers, or underscores.</small><label for="setting-bio">Bio</label><textarea id="setting-bio" name="bio" maxlength="240" rows="4">${esc(state.profile.bio)}</textarea><small class="field-hint">A little about you, in 240 characters or less.</small><div class="account-readonly"><span>Sign-in email</span><strong>Available with live accounts</strong></div>`);
  if(section==='privacy')content=settingsForm(section,`<label for="setting-visibility">Who can view my profile?</label><select id="setting-visibility" name="visibility">${['Everyone','Friends only','Only me'].map(v=>`<option ${state.profile.visibility===v?'selected':''}>${v}</option>`).join('')}</select><label for="setting-friend-policy">Who can send me friend requests?</label><select id="setting-friend-policy" name="friendPolicy">${['Everyone','Friends of friends','Nobody'].map(v=>`<option ${state.friendPolicy===v?'selected':''}>${v}</option>`).join('')}</select><label class="toggle-row"><span><strong>Show my activity</strong><small>Let friends see what I’m playing.</small></span><input type="checkbox" name="activity" role="switch" ${state.activity?'checked':''}></label><p class="fine-print">Privacy preferences are saved locally. Cross-account privacy controls will apply when live accounts are connected.</p>`);
  if(section==='notifications')content=settingsForm(section,`<label class="toggle-row"><span><strong>Friend requests</strong><small>See incoming friend requests in your inbox.</small></span><input name="notifications" type="checkbox" role="switch" ${state.notifications?'checked':''}></label><label class="toggle-row"><span><strong>Platform updates</strong><small>See welcome messages and platform announcements.</small></span><input name="updates" type="checkbox" role="switch" ${state.updateNotifications?'checked':''}></label><div class="settings-info">${icon('bell',20)}<p>Notifications open from the bell in the top right. These preferences control your preview inbox.</p></div>`);
  if(section==='discovery')content=settingsForm(section,`<fieldset class="genre-preferences"><legend>What do you like to play?</legend><p>Pick a few genres. Your favorites also help shape your recommendations.</p><div>${genres.map(genre=>`<label><input name="genres" type="checkbox" value="${genre}" ${state.preferredGenres.includes(genre)?'checked':''}><span>${genre}</span></label>`).join('')}</div></fieldset><div class="settings-info">${icon('explore',20)}<p>${state.hiddenGames.length} hidden games. Hidden games stay out of your recommendations.</p></div>${state.hiddenGames.length?button('reset-hidden','Restore hidden games','button small'):''}`);
  if(section==='security')content=`<section class="panel security-section"><h2>Security</h2><p class="settings-description">Your account access, in one place.</p><div class="security-row"><span>${icon('settings',22)}<span><strong>Password</strong><small>Live account authentication is not connected.</small></span></span><button class="button small" disabled>Change password</button></div><div class="security-row"><span>${icon('check',22)}<span><strong>Two-step verification</strong><small>Available when live accounts launch.</small></span></span><span class="tag">Coming later</span></div><div class="security-row"><span>${icon('profile',22)}<span><strong>Active sessions</strong><small>This preview does not create an authenticated session.</small></span></span></div></section>`;
  if(section==='data')content=`<section class="panel"><h2>Preview data</h2><p class="settings-description">Your preview stays in this browser.</p><div class="data-summary"><div><strong>${state.favorites.length}</strong><span>Favorite games</span></div><div><strong>${state.projects.length+state.creatorAssets.length}</strong><span>Creator drafts</span></div><div><strong>${state.friends.length}</strong><span>Friends</span></div></div><p class="muted small-text">Profile details, game preferences, saved looks, and drafts are stored locally. Emails and passwords are never stored.</p><div class="reset-panel"><div><h3>Reset preview</h3><p class="muted">Restore the sample data and remove your local changes.</p></div>${button('reset-demo','Reset preview','button danger')}</div></section>`;
  return `${pageHead('Settings','Your account. Your preferences.')}<div class="settings-layout"><nav class="settings-nav" aria-label="Settings sections">${Object.entries(settingsSections).map(([id,[label]])=>`<a href="#/settings?section=${id}" class="${section===id?'active':''}" ${section===id?'aria-current="page"':''}>${icon(id==='account'?'profile':id==='notifications'?'bell':id==='discovery'?'explore':'settings',18)}${label}</a>`).join('')}</nav><div class="settings-section-content">${content}</div></div>`;
}
function friends() {
  const query=params.get('person')||'';
  const list=friendTab==='Requests'?state.requests:friendTab==='Sent'?state.outgoing:friendTab==='Find people'?community.map(p=>p.name).filter(n=>n!==state.profile.name&&!state.friends.includes(n)&&!state.requests.includes(n)):state.friends;
  const shown=list.filter(name=>name.toLowerCase().includes(query.trim().toLowerCase()));
  const online=state.friends.filter(name=>personInfo(name).activity!=='Offline').length;
  return `${pageHead('Friends',`${state.friends.length} friends · ${online} online`,link('friends?tab=find',icon('create',17)+' Add friends','button primary'))}
    <div class="friends-toolbar"><div class="line-tabs" role="group" aria-label="Friends categories">${Object.entries(friendTabs).map(([key,label])=>button('friend-tab',label+(['Requests','Sent'].includes(label)?` <span>${label==='Requests'?state.requests.length:state.outgoing.length}</span>`:''),friendTab===label?'selected':'',`data-value="${key}" aria-pressed="${friendTab===label}"`)).join('')}</div>
    <form id="friend-search" class="top-search">${icon('search',17)}<input type="search" name="person" aria-label="Search people" placeholder="Search people" value="${esc(query)}"><button class="search-submit" type="submit" aria-label="Find people by name">${icon('arrow',16)}</button></form></div>
    <p class="result-count" role="status">${shown.length} ${friendTab==='Requests'?'pending request'+(shown.length===1?'':'s'):friendTab==='Sent'?'sent request'+(shown.length===1?'':'s'):friendTab==='Find people'?'people to discover':'friend'+(shown.length===1?'':'s')}${query?' matching “'+esc(query)+'”':''}</p>
    <div class="friend-grid">${shown.map(name=>{const p=personInfo(name);const sent=state.outgoing.includes(name);return `<article class="panel friend-card"><a class="friend-card-identity" href="#/profile?user=${encodeURIComponent(name)}"><span class="friend-picture">${referenceAvatar(p.avatar)}${p.activity!=='Offline'?'<i class="presence"></i>':''}</span><h3>${esc(name)}</h3></a><p class="muted">${friendTab==='Requests'?'Wants to connect':friendTab==='Sent'||sent?'Request pending':p.activity}</p><div class="button-row">
      ${friendTab==='Requests'?button('accept-friend','Accept','button primary small',`data-name="${esc(name)}"`)+button('decline-friend','Ignore','button small',`data-name="${esc(name)}"`):friendTab==='Sent'||sent?button('cancel-friend','Cancel request','button small',`data-name="${esc(name)}"`):friendTab==='Find people'?button('add-friend',icon('create',14)+' Add friend','button primary small',`data-name="${esc(name)}"`):link('profile?user='+encodeURIComponent(name),'View profile','button small')+button('remove-friend','Remove','button quiet small',`data-name="${esc(name)}"`)}</div></article>`;}).join('')}</div>
    ${!shown.length?empty(query?'No people found':friendTab==='Requests'?'All caught up':friendTab==='Sent'?'No pending requests':'Find your people',query?'Try a different name.':friendTab==='Requests'?'New friend requests will appear here.':'Discover someone new to explore with.',query?button('clear-people','Clear search','button primary'):link('friends?tab=find','Find people')):''}
    <p class="fine-print">Preview community. Friend requests stay in this browser and are not sent to real people.</p>`;
}
function notFound() { return `${pageHead('Page not found','This world is still uncharted.')}${empty('Let’s get you back to exploring.','The page you’re looking for doesn’t exist.',link('home','Back to Home'))}`; }
function notificationItems() {
  return [
    ...(state.notifications?state.requests.map(name=>({id:'request-'+name,title:`${name} sent you a friend request`,description:'Find your next adventure together.',to:'friends?tab=requests',name})):[]),
    ...(state.updateNotifications?[{id:'welcome',title:'Welcome to Metallic',description:'Your friends, games, and creations in one place.',to:'home'}]:[]),
  ];
}
function updateNotificationPopover(open=notificationsOpen) {
  const popover=document.querySelector('#notification-popover');if(!popover)return;
  notificationsOpen=open;popover.hidden=!open;
  const toggle=document.querySelector('#notification-toggle');toggle?.setAttribute('aria-expanded',String(open));
  const items=notificationItems(), unread=items.filter(item=>!state.readNotifications.includes(item.id)).length;
  toggle?.querySelector('.notification-dot')?.remove();
  if(unread)toggle?.insertAdjacentHTML('beforeend','<span class="notification-dot"></span>');
  popover.innerHTML=`<div class="notification-popover-head"><div><h2>Notifications</h2><span>${unread} unread</span></div>${button('close-notifications',icon('close',17),'plain-icon','aria-label="Close notifications"')}</div>
    ${items.length?`<div class="notification-list">${items.map(item=>`<a class="notification-entry ${state.readNotifications.includes(item.id)?'read':''}" href="#/${item.to}" data-action="read-notification" data-id="${item.id}">${item.name?referenceAvatar(personInfo(item.name).avatar):`<span class="notification-symbol">${icon('bell',19)}</span>`}<span><strong>${esc(item.title)}</strong><small>${item.description}</small></span>${!state.readNotifications.includes(item.id)?'<i></i>':''}</a>`).join('')}</div>`:'<div class="notification-empty">'+icon('bell',30)+'<h3>You’re all caught up</h3><p>Your notifications will appear here.</p></div>'}
    <div class="notification-popover-footer">${button('read-all-notifications','Mark all as read','text-button',unread?'':'disabled')}${link('settings?section=notifications','Preferences','text-link')}</div>`;
}
function profileFriends(names, owner, mutual=[], mutualOnly=false) {
  const displayed=mutualOnly?mutual:names;
  return `<section class="profile-section profile-friends"><div class="section-top"><h2>Friends <span class="muted">(${names.length})</span></h2>${owner?link('friends','See all →','view-all'):''}</div>
    ${!owner?`<div class="profile-friend-filters">${link('profile?user='+encodeURIComponent(params.get('user')),'All friends',!mutualOnly?'selected':'')}${link('profile?user='+encodeURIComponent(params.get('user'))+'&friends=mutual',`Mutual friends (${mutual.length})`,mutualOnly?'selected':'')}</div>`:''}
    ${displayed.length?`<div class="friends-list">${displayed.map(name=>{const info=name===state.profile.name?{name,activity:state.activity?'Online':'Offline',avatar:0}:personInfo(name);return `<a class="friend" href="#/profile?user=${encodeURIComponent(name)}"><span class="friend-picture">${info.avatar===0?avatar():referenceAvatar(info.avatar)}${info.activity!=='Offline'?'<i class="presence"></i>':''}</span><span class="friend-name">${esc(name)}</span><span class="friend-activity">${mutual.includes(name)?'Mutual friend':info.activity}</span></a>`;}).join('')}</div>`:`<div class="inline-empty">${mutualOnly?'You don’t share any friends yet.':'No friends to show yet.'}${owner?' '+link('friends?tab=find','Find people →','text-link'):''}</div>`}</section>`;
}
function settingsForm(section,fields) {
  return `<form id="settings-form" class="settings-form section-settings-form" data-section="${section}"><section class="panel"><h2>${settingsSections[section][0]}</h2><p class="settings-description">${settingsSections[section][1]}</p>${fields}</section><div class="settings-save"><span class="muted small-text">Saved to this browser</span><button type="submit" class="button primary">${icon('check',17)} Save changes</button></div></form>`;
}
function assetIcon(type) { return icon(type==='cosmetics'?'wardrobe':type==='games'?'play':type,48); }
function assetCard(asset,own=false) {
  return `<article class="asset-card"><button type="button" class="asset-cover color-${asset.color||'blue'}" data-action="asset-details" data-id="${esc(asset.id)}" aria-label="View ${esc(asset.name)}">${assetIcon(asset.type)}<span>${esc(asset.subcategory||creatorTypes[asset.type])}</span></button><div class="asset-card-body"><h3>${esc(asset.name)}</h3><p>By ${esc(asset.creator||state.profile.name)}</p><div class="asset-card-footer"><strong>${asset.price?icon('alloy',14)+' '+asset.price.toLocaleString():'Free'}</strong>${own?'<span class="tag">Listing draft</span>':button('save-asset',icon('heart',15),'plain-icon',`data-id="${esc(asset.id)}" aria-label="${state.savedAssets.includes(asset.id)?'Unsave':'Save'} ${esc(asset.name)}" aria-pressed="${state.savedAssets.includes(asset.id)}"`)}</div></div></article>`;
}
function assetEditor(asset,type='models',listing=false) {
  type=asset?.type||type;
  if(!Object.hasOwn(creatorTypes,type)||type==='games')type='models';
  const subtypes=type==='cosmetics'?cosmeticSlots:type==='models'?['Models','Meshes','Materials']:type==='audio'?['Music','Sound effects','Ambience']:['Studio tools','Utilities','Importers'];
  const initial=asset?.subcategory||(cosmeticSlots.includes(params.get('slot'))?params.get('slot'):subtypes[0]);
  modal(listing?'Prepare marketplace listing':asset?'Edit asset':'Create '+({models:'model',audio:'audio',plugins:'plugin',cosmetics:'cosmetic'}[type]),
    `<form id="asset-form" data-id="${esc(asset?.id||'')}" data-type="${type}" data-listing="${listing||asset?.listing?'1':'0'}"><label for="asset-name">Asset name</label><input id="asset-name" name="name" required maxlength="60" value="${esc(asset?.name||'')}" placeholder="Give your idea a name"><label for="asset-subtype">${type==='cosmetics'?'Cosmetic category':'Asset category'}</label><select id="asset-subtype" name="subcategory">${subtypes.map(subtype=>`<option ${subtype===initial?'selected':''}>${subtype}</option>`).join('')}</select><label for="asset-description">Description</label><textarea id="asset-description" name="description" rows="3" maxlength="500" placeholder="What can other creators make with it?">${esc(asset?.description||'')}</textarea>
    ${listing||asset?.listing?`<label for="asset-price">Price in Alloy</label><input id="asset-price" name="price" type="number" min="0" max="1000000" step="1" required value="${asset?.price||0}"><small class="field-hint">Set 0 for a free asset.</small><div class="listing-status"><span class="tag">Unpublished</span><p>This saves a listing draft. File delivery, licensing, publication, and checkout are not connected yet.</p></div>`:'<p class="fine-print">Save the asset details now. File uploads will be available with creator services.</p>'}
    <button type="submit" class="button primary full">${listing||asset?.listing?'Save listing draft':'Save asset draft'}</button></form>`);
}
function marketplace() {
  const mine=params.get('mine')==='1', saved=params.get('saved')==='1';
  let items=mine?state.creatorAssets.filter(asset=>asset.listing).map(asset=>({...asset,creator:state.profile.name})):marketplaceAssets;
  items=items.filter(asset=>assetMatches(asset,params)&&(!saved||state.savedAssets.includes(asset.id)));
  return `${pageHead('Creator Marketplace','Great games start with great building blocks.',link('create?tab=models','Manage your assets '+icon('arrow',17),'button'))}
    <section class="marketplace-hero"><div><span class="eyebrow">BY CREATORS, FOR CREATORS</span><h2>A head start on your next idea.</h2><p>Models, music, plugins, and wearables. Find the pieces that make your world yours.</p></div><div class="market-hero-art">${icon('models',62)}${icon('audio',48)}${icon('plugins',38)}</div></section>
    <div class="marketplace-modes">${link('marketplace','Discover assets',!mine&&!saved?'selected':'')}${link('marketplace?saved=1','Saved assets'+(state.savedAssets.length?' ('+state.savedAssets.length+')':''),saved?'selected':'')}${link('marketplace?mine=1','My listing drafts',mine?'selected':'')}</div>
    <form id="marketplace-search" class="marketplace-filters"><div class="market-search">${icon('search',18)}<input name="q" type="search" aria-label="Search assets" placeholder="Search assets" value="${esc(params.get('q')||'')}"></div><label>Category<select name="type" id="market-type"><option value="">All assets</option>${Object.entries(creatorTypes).filter(([key])=>key!=='games').map(([key,label])=>`<option value="${key}" ${params.get('type')===key?'selected':''}>${label}</option>`).join('')}</select></label><label>Price<select name="price" id="market-price"><option value="">Any price</option><option value="free" ${params.get('price')==='free'?'selected':''}>Free</option><option value="paid" ${params.get('price')==='paid'?'selected':''}>Paid</option></select></label><button type="submit" class="button">Search</button></form>
    ${params.get('type')==='cosmetics'?`<div class="cosmetic-slots" role="group" aria-label="Marketplace cosmetic categories">${button('market-slot','All cosmetics',!params.get('slot')?'selected':'','data-value=""')}${cosmeticSlots.map(slot=>button('market-slot',slot,params.get('slot')===slot?'selected':'',`data-value="${slot}"`)).join('')}</div>`:''}
    <div class="section-top"><h2>${mine?'Your listing drafts':saved?'Saved assets':'Find your next building block'}</h2><span class="result-count" role="status">${items.length} asset${items.length===1?'':'s'}</span></div><div class="marketplace-grid">${items.map(asset=>assetCard(asset,mine)).join('')}</div>
    ${!items.length?empty(mine?'No listing drafts yet.':saved?'Keep your favorite assets close.':'No matching assets.',mine?'Create an asset in the creator hub, then prepare its listing.':saved?'Save an asset using the heart to find it here.':'Try another search or category.',link(mine?'create?tab=models':'marketplace',mine?'Open creator hub':'Browse all assets')):''}
    <p class="fine-print">Sample marketplace. Prices are illustrative. Checkout, asset downloads, and public sales are not available in this preview.</p>`;
}
function preferenceEditor() {
  modal('Make discovery yours',`<p class="muted">Choose the genres you enjoy. Your favorite games help us find more, too.</p><form id="preference-form"><fieldset class="genre-preferences"><legend>Your favorite genres</legend><div>${genres.map(genre=>`<label><input type="checkbox" name="genres" value="${genre}" ${state.preferredGenres.includes(genre)?'checked':''}><span>${genre}</span></label>`).join('')}</div></fieldset><p class="fine-print">Preferences are saved in this browser.</p><button type="submit" class="button primary full">Save preferences</button></form>`);
}
function focusIdentity(element=document.activeElement) {
  if(!element || element===document.body)return null;
  return { id:element.id, action:element.dataset?.action, value:element.dataset?.value,
    name:element.dataset?.name, item:element.dataset?.id, field:element.getAttribute('name') };
}
function restoreFocus(identity) {
  if(!identity)return;
  const target=identity.id ? document.getElementById(identity.id) : [...app.querySelectorAll('button,a,input,select,textarea')].find(el=>
    identity.action ? el.dataset.action===identity.action&&el.dataset.value===identity.value&&el.dataset.name===identity.name&&el.dataset.id===identity.item : identity.field&&el.getAttribute('name')===identity.field);
  if(target&&!target.disabled)target.focus({preventScroll:true});
  else document.querySelector('#main')?.focus({preventScroll:true});
}
function render(preserveFocus=true) {
  const focus=preserveFocus?focusIdentity():null;
  ({route,params,category,sort,friendTab}=readRoute(location.hash));
  const pages={'':landing,home,explore,login:auth,signup:auth,download,wardrobe,create,alloy,profile,settings,friends,marketplace};
  const page=Object.hasOwn(pages,route)?pages[route]:/^game\/\d+$/.test(route)?gamePage:notFound;
  const titles={'':'A world of possibilities',home:'Home',explore:'Explore',signup:'Sign up',login:'Log in',download:'Download',wardrobe:'Wardrobe',create:'Creator hub',alloy:'Buy Alloy',profile:'Profile',settings:'Settings',friends:'Friends',marketplace:'Creator Marketplace'};
  const game=games.find(g=>route===`game/${g.id}`);
  document.title=`${game?.title || (Object.hasOwn(titles,route)?titles[route]:'Page not found')} | Metallic`;
  document.body.classList.remove('nav-open');
  notificationsOpen=false;
  app.innerHTML=shell(page(),['','login','signup'].includes(route));
  if(route==='settings')settingsDirty=false;
  updateShelfControls();
  restoreFocus(focus);
}
function navigate(destination) {
  if(location.hash==='#'+destination)render(); else location.hash=destination;
}
function setQuery(changes) {
  // The URL updates before hashchange fires; use it so rapid edits cannot lose filters.
  const current=readRoute(location.hash);
  navigate(routeWithParams(current.route,current.params,changes));
}
function setMenu(open) {
  const sidebar=document.querySelector('#sidebar');if(!sidebar)return;
  sidebar.classList.toggle('open',open);
  document.querySelector('.mobile-backdrop').classList.toggle('open',open);
  document.querySelector('.mobile-menu').setAttribute('aria-expanded',String(open));
  document.body.classList.toggle('nav-open',open);
  document.querySelector('#main').inert=open;
  const bottom=document.querySelector('.mobile-tabs');if(bottom)bottom.inert=open;
  if(open)sidebar.querySelector('a').focus();else document.querySelector('.mobile-menu').focus();
}
function updateShelfControls() {
  document.querySelectorAll('[data-action="scroll"]').forEach(button=>{
    const shelf=document.getElementById(button.dataset.target);if(!shelf)return;
    button.disabled=button.dataset.direction==='-1'?shelf.scrollLeft<=2:shelf.scrollLeft+shelf.clientWidth>=shelf.scrollWidth-2;
  });
}
function closeSuggestions() {
  const results=document.querySelector('#search-suggestions');if(results)results.hidden=true;
  document.querySelector('#site-search')?.setAttribute('aria-expanded','false');
}
function suggestGames(query) {
  const results=document.querySelector('#search-suggestions');if(!results)return;
  if(!query.trim()){closeSuggestions();return;}
  const matches=filterGames(games,query).slice(0,4);
  results.innerHTML=`<span class="suggestions-label">Games</span>${matches.map(g=>`<a href="#/game/${g.id}"><img src="${g.art}" alt=""><span><strong>${esc(g.title)}</strong><small>${g.genre} · ${g.playing} playing</small></span>${icon('arrow',14)}</a>`).join('')}${!matches.length?'<p>No matching games</p>':''}<a class="all-results" href="#/explore?q=${encodeURIComponent(query.trim())}">${icon('search',16)} Search all games</a>`;
  results.hidden=false;document.querySelector('#site-search').setAttribute('aria-expanded','true');
}
function projectEditor(project) {
  modal(project?'Edit game':'Create a game',`<p class="muted">${project?'Shape your idea before you start building.':'Every great world starts with an idea.'}</p><form id="project-form" data-id="${esc(project?.id||'')}"><label for="project-name">Game name</label><input id="project-name" name="name" required maxlength="60" value="${esc(project?.name||'')}" placeholder="My first world"><label for="project-template">Starting template</label><select id="project-template" name="template">${templates.map(t=>`<option ${project?.template===t?'selected':''}>${t}</option>`).join('')}</select><label for="project-description">Description</label><textarea id="project-description" name="description" maxlength="500" rows="3" placeholder="What will players discover?">${esc(project?.description||'')}</textarea><p class="fine-print">Saved as a local draft. Studio editing and publishing are coming later.</p><button class="button primary full" type="submit">${project?'Save draft':'Create draft'} ${icon('arrow',17)}</button></form>`);
}
const scrollPositions=new Map();
let lastHash=location.hash;
window.addEventListener('hashchange',()=>{
  if(location.hash===lastHash)return;
  const next=readRoute(location.hash), previous=readRoute(lastHash);
  if(settingsDirty && previous.route==='settings') {
    const destination=location.hash.slice(1);
    history.replaceState(null,'',lastHash);
    modal('Leave without saving?',`<p class="muted">Your profile changes have not been saved.</p>${button('discard-settings','Discard changes','button danger',`data-value="${esc(destination)}"`)} ${button('close-dialog','Keep editing','button')}`);
    return;
  }
  const samePage=next.route===previous.route && next.params.get('user')===previous.params.get('user');
  const previousScroll=scrollY, previousFocus=samePage?focusIdentity():null;
  scrollPositions.set(lastHash,previousScroll);lastHash=location.hash;
  if(dialog.open)dialog.close();
  render(false);
  window.scrollTo(0,samePage?previousScroll:(scrollPositions.get(lastHash)||0));
  if(samePage)restoreFocus(previousFocus);else document.querySelector('#main').focus({preventScroll:true});
});
document.addEventListener('click',async e=>{
  if(e.target.closest('.skip-link')){e.preventDefault();document.querySelector('#main').focus();return;}
  if(!e.target.closest('#search-form'))closeSuggestions();
  if(!e.target.closest('#notification-toggle,#notification-popover')&&notificationsOpen)updateNotificationPopover(false);
  const navigation=e.target.closest('a[href^="#/"]');
  if(navigation&&settingsDirty&&route==='settings'){
    e.preventDefault();modal('Leave without saving?',`<p class="muted">Your profile changes have not been saved.</p>${button('discard-settings','Discard changes','button danger',`data-value="${esc(navigation.getAttribute('href').slice(1))}"`)} ${button('close-dialog','Keep editing','button')}`);return;
  }
  if(navigation&&document.body.classList.contains('nav-open')){
    // Navigate explicitly before the hidden drawer can cancel the link's activation.
    e.preventDefault();const destination=navigation.getAttribute('href').slice(1);setMenu(false);navigate(destination);
  }
  const el=e.target.closest('[data-action]');if(!el)return;
  const {action,value,id,name}=el.dataset;
  switch(action){
    case 'menu':setMenu(!document.querySelector('#sidebar').classList.contains('open'));break;
    case 'close-dialog':dialog.close();break;
    case 'discard-settings':settingsDirty=false;dialog.close();navigate(value);break;
    case 'notifications':closeSuggestions();updateNotificationPopover(!notificationsOpen);if(notificationsOpen)document.querySelector('#notification-popover button')?.focus();break;
    case 'close-notifications':updateNotificationPopover(false);document.querySelector('#notification-toggle')?.focus();break;
    case 'read-notification':if(!state.readNotifications.includes(id))state.readNotifications.push(id);saveState(storage,state);updateNotificationPopover(false);break;
    case 'read-all-notifications':state.readNotifications=[...new Set([...state.readNotifications,...notificationItems().map(item=>item.id)])];saveState(storage,state);updateNotificationPopover(true);document.querySelector('#notification-popover button')?.focus();break;
    case 'preferences':preferenceEditor();break;
    case 'hide-game':if(games.some(game=>game.id===id)){if(!state.hiddenGames.includes(id))state.hiddenGames.push(id);persist('We’ll recommend other games.');render();}break;
    case 'reset-hidden':state.hiddenGames=[];persist('Hidden games restored to discovery.');render();break;
    case 'toggle-filters':{const panel=el.closest('.explore-filters');const open=panel.classList.toggle('filters-open');el.setAttribute('aria-expanded',String(open));break;}
    case 'new-asset':assetEditor(null,value);break;
    case 'edit-asset':case 'prepare-listing':{const asset=state.creatorAssets.find(asset=>asset.id===id);if(asset)assetEditor(asset,asset.type,action==='prepare-listing');break;}
    case 'market-slot':setQuery({slot:value||null});break;
    case 'save-asset':if(marketplaceAssets.some(asset=>asset.id===id)){state.savedAssets=state.savedAssets.includes(id)?state.savedAssets.filter(value=>value!==id):[...state.savedAssets,id];persist(state.savedAssets.includes(id)?'Asset saved.':'Asset removed from saved items.');render();}break;
    case 'asset-details':{const asset=marketplaceAssets.find(asset=>asset.id===id)||state.creatorAssets.find(asset=>asset.id===id);if(!asset)break;const own=state.creatorAssets.some(item=>item.id===id);modal(esc(asset.name),`<div class="asset-detail-art color-${asset.color||'blue'}">${assetIcon(asset.type)}</div><p class="muted">${esc(creatorTypes[asset.type])} · ${esc(asset.subcategory)}</p><p>${esc(asset.description)||'No description yet.'}</p><div class="asset-detail-price"><strong>${asset.price?asset.price.toLocaleString()+' Alloy':'Free'}</strong><span class="tag">${own?'Unpublished listing':'Sample listing'}</span></div><p class="fine-print">Asset files, license terms, and checkout will be available when the marketplace launches.</p>${own?button('prepare-listing','Edit listing','button primary full',`data-id="${esc(id)}"`):'<button class="button primary full" disabled>Checkout coming later</button>'}`);break;}
    case 'scroll':{const shelf=document.getElementById(el.dataset.target);shelf.scrollBy({left:Number(el.dataset.direction)*Math.max(240,shelf.clientWidth*.8),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});break;}
    case 'dismiss-launcher':state.launcherDismissed=true;persist('Launcher notice hidden. Downloads are always in the menu.');render();break;
    case 'category':setQuery({category:value==='All'?null:value});break;
    case 'clear-search':navigate('/explore');break;
    case 'favorite':if(games.some(g=>g.id===id)){state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist(state.favorites.includes(id)?'Added to your favorites.':'Removed from favorites.');render();}break;
    case 'play':modal('Your next adventure is on its way',`<p class="muted">${esc(games.find(g=>g.id===id)?.title||'This game')} will open in the Metallic launcher when live gameplay is available.</p><p>This is a preview game. No game has been launched.</p>${link('download',icon('download',18)+' View launcher availability','button primary full')}`);break;
    case 'share':try{await navigator.clipboard.writeText(location.href);toast('Game link copied.');}catch{modal('Share this game',`<label for="share-url">Game link</label><input id="share-url" class="share-url" readonly value="${esc(location.href)}"><p class="fine-print">Copy this link. Viewers still need access to this private preview.</p>`);document.querySelector('#share-url').select();}break;
    case 'password':{const input=document.querySelector('#password');const show=input.type==='password';input.type=show?'text':'password';el.textContent=show?'Hide':'Show';el.setAttribute('aria-label',show?'Hide password':'Show password');el.setAttribute('aria-pressed',String(show));break;}
    case 'recovery':modal('Account recovery',`<p class="muted">Account recovery will be available when live accounts launch. Preview logins do not create an account or store a password.</p>${link('home','Explore the preview','button primary full')}`);break;
    case 'platform':platform=value;render();break;
    case 'wardrobe-tab':wardrobeTab=value;render();break;
    case 'outfit':if(outfits.includes(value))draftOutfit=value;render();break;
    case 'accessory':if(accessories.includes(value))draftAccessory=value;render();break;
    case 'color':if(colors.some(c=>c.value===value))draftColor=value;render();break;
    case 'rotate-avatar':avatarBack=!avatarBack;render();break;
    case 'save-outfit':state.outfit=draftOutfit;state.color=draftColor;state.accessory=draftAccessory;persist('Look saved. Your profile is up to date.');render();break;
    case 'reset-outfit':draftOutfit=state.outfit;draftColor=state.color;draftAccessory=state.accessory;render();toast('Restored your saved look.');break;
    case 'new-project':projectEditor();break;
    case 'edit-project':case 'project-details':{const project=state.projects.find(p=>p.id===id);if(project)projectEditor(project);break;}
    case 'delete-project':modal('Delete this draft?',`<p class="muted">This removes the draft from this browser.</p>${button('confirm-delete','Delete draft','button danger',`data-id="${esc(id)}"`)} ${button('close-dialog','Keep draft','button')}`);break;
    case 'confirm-delete':state.projects=state.projects.filter(p=>p.id!==id);persist('Draft deleted.');dialog.close();render();break;
    case 'review-pack':{const pack=packs[Number(el.dataset.index)];if(!pack)break;modal('Your Alloy pack',`<div class="checkout-preview">${icon('alloy',48)}<h3>${pack.amount.toLocaleString()} Alloy</h3><strong>${pack.price} USD</strong></div><p class="muted">Illustrative pricing. Checkout is not available. No money will be charged and your sample balance stays the same.</p><button class="button primary full" disabled>Checkout coming soon</button>`);break;}
    case 'friend-tab':setQuery({tab:value==='all'?null:value,person:null});break;
    case 'clear-people':setQuery({person:null});break;
    case 'find-people':navigate('/friends?tab=find');break;
    case 'accept-friend':case 'decline-friend':case 'add-friend':case 'cancel-friend':{
      const transitions={'accept-friend':['accept','Friend request accepted.'],'decline-friend':['decline','Friend request ignored.'],'add-friend':['send','Preview request sent.'],'cancel-friend':['cancel','Request canceled.']};
      const [transition,message]=transitions[action];if(updateFriendship(state,transition,name)){persist(message);render();}break;
    }
    case 'remove-friend':modal('Remove friend?',`<p>Remove ${esc(name)} from your preview friends?</p>${button('confirm-remove','Remove friend','button danger',`data-name="${esc(name)}"`)} ${button('close-dialog','Keep friend','button')}`);break;
    case 'confirm-remove':updateFriendship(state,'remove',name);persist('Friend removed.');dialog.close();render();break;
    case 'reset-demo':modal('Reset this preview?',`<p class="muted">Your favorites, outfits, profile changes, and local drafts will be removed.</p>${button('confirm-reset','Reset preview','button danger')} ${button('close-dialog','Keep my data','button')}`);break;
    case 'confirm-reset':state=loadState({getItem:()=>null});draftOutfit=state.outfit;draftColor=state.color;draftAccessory=state.accessory;settingsDirty=false;persist('Preview reset.');dialog.close();render();break;
  }
});
document.addEventListener('submit',e=>{
  const form=e.target;
  if(!['search-form','friend-search','auth-form','project-form','settings-form','asset-form','preference-form','discovery-filter-form','marketplace-search'].includes(form.id))return;
  e.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form);
  if(form.id==='search-form'){closeSuggestions();navigate(routeWithParams('explore',new URLSearchParams(),{q:data.get('q').trim()}));}
  if(form.id==='friend-search')setQuery({person:data.get('person').trim()});
  if(form.id==='auth-form'){if(route==='signup')state.profile.name=data.get('username');form.reset();persist('Welcome to the preview. No live account was created.');navigate('/home');}
  if(form.id==='project-form'){
    const name=data.get('name').trim();if(!name){document.querySelector('#project-name').setCustomValidity('Enter a name, not just spaces.');form.reportValidity();return;}
    const id=form.dataset.id;const existing=state.projects.find(p=>p.id===id);
    const project={id:existing?.id||crypto.randomUUID(),name,template:data.get('template'),description:data.get('description').trim()};
    if(existing)Object.assign(existing,project);else if(state.projects.length<100)state.projects.push(project);else{toast('The preview supports up to 100 local drafts.');return;}
    persist(existing?'Draft updated.':'Your game draft is ready.');dialog.close();render();
  }
  if(form.id==='settings-form'){
    const section=form.dataset.section;
    if(section==='account'){state.profile.name=data.get('name');state.profile.bio=data.get('bio').trim();}
    if(section==='privacy'){state.profile.visibility=data.get('visibility');state.friendPolicy=data.get('friendPolicy');state.activity=data.has('activity');}
    if(section==='notifications'){state.notifications=data.has('notifications');state.updateNotifications=data.has('updates');}
    if(section==='discovery')state.preferredGenres=data.getAll('genres').filter(genre=>genres.includes(genre));
    settingsDirty=false;persist('Your settings are saved.');render();
  }
  if(form.id==='preference-form'){state.preferredGenres=data.getAll('genres').filter(genre=>genres.includes(genre));persist('Discovery updated for you.');dialog.close();render();}
  if(form.id==='discovery-filter-form'){
    const changes=Object.fromEntries(['q','category','mood','mode','rating'].map(key=>[key,data.get(key)==='All'?null:data.get(key)?.trim()||null]));
    changes.unplayed=data.has('unplayed')?'1':null;setQuery(changes);
  }
  if(form.id==='marketplace-search')setQuery({q:data.get('q').trim()||null,type:data.get('type')||null,price:data.get('price')||null,slot:null});
  if(form.id==='asset-form'){
    const name=data.get('name').trim();if(!name){document.querySelector('#asset-name').setCustomValidity('Enter an asset name.');form.reportValidity();return;}
    const existing=state.creatorAssets.find(asset=>asset.id===form.dataset.id);
    const asset={id:existing?.id||crypto.randomUUID(),name,type:form.dataset.type,subcategory:data.get('subcategory'),description:data.get('description').trim(),price:Number(data.get('price')||existing?.price||0),listing:form.dataset.listing==='1'};
    if(existing)Object.assign(existing,asset);else if(state.creatorAssets.length<100)state.creatorAssets.push(asset);else{toast('This preview supports up to 100 asset drafts.');return;}
    persist(asset.listing?'Listing draft saved. It is not published.':'Asset draft saved.');dialog.close();render();
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='site-search')suggestGames(e.target.value);
  if(['project-name','asset-name'].includes(e.target.id))e.target.setCustomValidity('');
  if(e.target.closest('#settings-form')){settingsDirty=true;document.querySelector('.settings-save .muted').textContent='Unsaved changes';}
});
document.addEventListener('change',e=>{
  if(e.target.id==='sort')setQuery({sort:e.target.value==='recommended'?null:e.target.value});
  if(e.target.closest('#settings-form')){settingsDirty=true;document.querySelector('.settings-save .muted').textContent='Unsaved changes';}
});
document.addEventListener('focusin',e=>{if(!e.target.closest('#search-form'))closeSuggestions();if(notificationsOpen&&!e.target.closest('#notification-popover,#notification-toggle'))updateNotificationPopover(false);});
document.addEventListener('keydown',e=>{
  const inField=e.target.matches('input,textarea,select')||e.target.isContentEditable;
  if(e.key==='/'&&!inField&&!dialog.open){const search=document.querySelector('#site-search');if(search){e.preventDefault();search.focus();}}
  if(e.key==='Escape'){closeSuggestions();if(notificationsOpen){updateNotificationPopover(false);document.querySelector('#notification-toggle')?.focus();}if(document.body.classList.contains('nav-open'))setMenu(false);}
  if(e.key==='ArrowDown'&&e.target.id==='site-search'){const first=document.querySelector('#search-suggestions:not([hidden]) a');if(first){e.preventDefault();first.focus();}}
  if(e.target.closest('#search-suggestions')&&['ArrowDown','ArrowUp'].includes(e.key)){
    const links=[...document.querySelectorAll('#search-suggestions a')], index=links.indexOf(e.target);
    e.preventDefault();if(e.key==='ArrowUp'&&index===0)document.querySelector('#site-search').focus();else links[(index+(e.key==='ArrowDown'?1:-1)+links.length)%links.length].focus();
  }
  if(e.key==='Tab'&&document.body.classList.contains('nav-open')){
    const links=[...document.querySelectorAll('#sidebar a')],first=links[0],last=links.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
document.addEventListener('scroll',e=>{if(e.target.classList?.contains('card-scroller'))updateShelfControls();},true);
window.addEventListener('resize',()=>{if(innerWidth>820&&document.body.classList.contains('nav-open'))setMenu(false);updateShelfControls();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
render();
