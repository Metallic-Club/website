import { games } from './catalog.js';
import { loadState, saveState, filterGames, updateFriendship, outfits, accessories, colors, templates, escapeHtml as esc } from './store.js';
import { readRoute, routeWithParams, categories, friendTabs } from './router.js';
import { portrait, community, personInfo } from './avatar.js';

let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw Error('Unavailable'); } }; }
let state = loadState(storage);
let route, params, category = 'All', sort = 'recommended', friendTab = 'All friends', wardrobeTab = 'Outfits', platform = 'Windows';
let draftOutfit = state.outfit, draftColor = state.color, draftAccessory = state.accessory;
let avatarBack = false, settingsDirty = false;
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
  return `<a class="game-card" href="#/experience/${game.id}" aria-label="${esc(game.title)}">
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
    <div class="card-scroller" id="${id}" tabindex="0" role="region" aria-label="${title} experiences">${items.map(card).join('')}</div></section>`;
}
function navItem(id, label) { return `<a class="side-link ${route === id ? 'active' : ''}" href="#/${id}" ${route === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span>${id === 'friends' && state.requests.length ? `<span class="nav-count">${state.requests.length}</span>` : ''}</a>`; }
function shell(content, publicPage = false) {
  return `<header class="topbar">${!publicPage ? button('menu', icon('menu'), 'mobile-menu', 'aria-label="Toggle navigation" aria-controls="sidebar" aria-expanded="false"') : ''}${brand()}<nav class="topnav" aria-label="Main navigation">${link('explore','Explore','')}${link('create','Create','')}${link('download','Download','')}</nav>${!publicPage ? `<form class="top-search" id="search-form" role="search">${icon('search',18)}<input id="site-search" name="q" type="search" placeholder="Search experiences" aria-label="Search experiences" value="${esc(params.get('q') || '')}" autocomplete="off" aria-controls="search-suggestions" aria-expanded="false"><button class="search-submit" type="submit" aria-label="Search">${icon('arrow',16)}</button><div id="search-suggestions" hidden aria-label="Experience suggestions"></div></form><div class="top-actions">${button('notifications',icon('bell')+(state.notifications&&state.requests.length?'<span class="notification-dot"></span>':''),'plain-icon','aria-label="Notifications"')}<a href="#/alloy" class="wallet" title="Sample Alloy balance">${icon('alloy',19)}<span>1,450</span></a><a href="#/profile" class="top-profile">${avatar()}<span class="username">${esc(state.profile.name)}</span></a></div>` : `<div class="top-actions">${link('login','Log in','button quiet')}${link('signup','Sign up','button primary')}</div>`}</header>${!publicPage ? `<button class="mobile-backdrop" data-action="menu" aria-label="Close navigation"></button><aside class="sidebar" id="sidebar"><a class="sidebar-profile" href="#/profile">${avatar()}<span>${esc(state.profile.name)}<small>Personal space</small></span></a><nav class="nav-group" aria-label="Your platform">${navItem('home','Home')}${navItem('explore','Explore')}${navItem('wardrobe','Wardrobe')}${navItem('friends','Friends')}</nav><nav class="nav-group" aria-label="Your tools">${navItem('create','Create')}${navItem('alloy','Buy Alloy')}${navItem('profile','Profile')}${navItem('settings','Settings')}</nav><div class="sidebar-bottom"><div class="premium-box"><div class="premium-title">${icon('download',17)} Take play further</div><p>Your next adventure starts with the Metallic launcher.</p>${link('download','Get the launcher','premium-link')}</div><a class="sidebar-about" href="#/">About Metallic ${icon('arrow',14)}</a></div></aside>` : ''}<main id="main" tabindex="-1" class="${publicPage ? 'public-page' : 'page'}"><div class="${publicPage ? 'public-content' : 'content'}">${content}<footer class="footer"><span>© ${new Date().getFullYear()} Metallic <span class="demo-label">Platform preview · Sample content</span></span><div class="footer-links">${link('','About','')}${link('download','Download','')}${link('create','Create','')}${link('settings','Settings','')}</div></footer></div></main>${!publicPage?`<nav class="mobile-tabs" aria-label="Mobile navigation">${[['home','Home'],['explore','Explore'],['wardrobe','Avatar'],['friends','Friends'],['create','Create']].map(([id,label])=>`<a href="#/${id}" class="${route===id?'active':''}" ${route===id?'aria-current="page"':''}>${icon(id,21)}<span>${label}</span></a>`).join('')}</nav>`:''}`;
}
function landing() {
  return `<section class="landing-hero"><div class="hero-copy"><span class="eyebrow"><span class="live-dot"></span> A new place to play</span><h1>Find your people.<br>Build your world.</h1><p>Jump into new experiences, make your own adventures, and turn a little imagination into something extraordinary.</p><div class="button-row">${link('signup','Join Metallic '+icon('arrow',18))}${link('explore','Explore experiences','button')}</div><small>Play. Create. Make it yours.</small></div><div class="hero-mosaic">${[games[0],games[1],games[4],games[5]].map(g=>`<a href="#/experience/${g.id}"><img src="${g.art}" alt="${esc(g.title)}"><span>${esc(g.title)}</span></a>`).join('')}<div class="mosaic-caption">A world of possibilities. <span>Made by you.</span></div></div></section><section class="landing-intro"><span class="eyebrow">THIS IS METALLIC</span><h2>One platform.<br>Endless ways to belong.</h2><div class="feature-columns"><article>${icon('explore',28)}<h3>Follow your curiosity</h3><p>From obstacle courses to open worlds, discover a new favorite around every corner.</p>${link('explore','Find your next adventure →','text-link')}</article><article>${icon('wardrobe',28)}<h3>Show up as yourself</h3><p>Make an avatar that feels like you. Experiment with a new look and make your mark.</p>${link('wardrobe','Make it yours →','text-link')}</article><article>${icon('create',28)}<h3>Start with an idea</h3><p>Dream up your own experience. Build a space for your friends and the next generation of players.</p>${link('create','Meet the creator hub →','text-link')}</article></div></section>${shelf('A little inspiration','A first look at the worlds of Metallic',games.slice(0,6),'landing-games')}<section class="cta-panel"><div><span class="eyebrow">YOUR NEXT CHAPTER</span><h2>Good things start with play.</h2><p>Take a look around. There’s a place for you here.</p></div>${link('home','Explore the platform '+icon('arrow',18))}</section>`;
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
    ${favorites.length ? shelf('Your favorites','Always worth coming back to',favorites,'favorites','profile') : ''}
    <section class="home-section"><div class="section-top"><div><h2>Recommended for you</h2><p class="section-sub">A new favorite is just around the corner</p></div>${link('explore','See all '+icon('arrow',15),'view-all')}</div>
    ${filters()}<div class="game-grid" id="game-results">${filterGames(games,'',category).slice(0,12).map(card).join('')}</div></section>
    ${shelf('Popular right now','Find out what everyone is exploring',filterGames(games,'','All','players').slice(0,8),'popular','explore?sort=players')}
    ${shelf('Top rated','Community favorites',filterGames(games,'','All','rating').slice(0,8),'top-rated','explore?sort=rating')}`;
}
function filters() {
  return `<div class="discover-bar"><div class="categories" role="group" aria-label="Experience categories">${categories.map(c=>button('category',c==='All'?'For you':c,`cat ${category===c?'selected':''}`,`data-value="${c}" aria-pressed="${category===c}"`)).join('')}</div></div>`;
}
function explore() {
  const query=params.get('q')||'';
  const results=filterGames(games,query,category,sort);
  return `${pageHead(query?'Search experiences':'Explore',query?'Find a world that fits your mood.':'There’s always something new to discover.')}
    ${!query && category==='All' ? `<div class="discovery-spotlights"><a class="spotlight" href="#/experience/1"><img src="art/game-1.svg" alt=""><span><small>FEATURED EXPERIENCE</small><strong>Enter the neon frontier.</strong><span>Cyber Raven: Neon Protocol ${icon('arrow',18)}</span></span></a><a class="spotlight" href="#/experience/13"><img src="art/game-13.svg" alt=""><span><small>TAKE IT SLOW</small><strong>A little room to grow.</strong><span>Pixel Farmstead ${icon('arrow',18)}</span></span></a></div>` : ''}
    <div class="section-top"><h2>${query?'Results for “'+esc(query)+'”':'Discover experiences'}</h2><label class="sort-label" for="sort">Sort by <select id="sort">${[['recommended','Recommended'],['players','Most popular'],['rating','Top rated'],['name','Name']].map(([value,label])=>`<option value="${value}" ${sort===value?'selected':''}>${label}</option>`).join('')}</select></label></div>
    ${filters()}<div class="results-summary"><p class="result-count" role="status">${results.length} experience${results.length===1?'':'s'}${category!=='All'?' in '+category:''}</p>${query||category!=='All'?button('clear-search','Clear filters','text-button'):''}</div>
    <div class="game-grid">${results.map(card).join('')}</div>${!results.length?empty('No experiences found','Try a different title or clear your filters.',button('clear-search','Explore all experiences','button primary')):''}`;
}
function experience() {
  const game=games.find(g=>g.id===route.split('/')[1]);
  if(!game)return notFound();
  const descriptions={Adventure:'Explore the unknown, discover hidden corners, and find your own path through a world full of possibility.',Action:'Bring your best moves, take on a new challenge, and team up with friends for your next adventure.',Obby:'Jump, dodge, and find your rhythm. Every obstacle is another chance to beat your personal best.',Simulation:'Start with a little imagination and make a world your own. Build, discover, and see where your curiosity takes you.',Roleplay:'Meet up with friends, find your favorite corner of the city, and create a story that belongs to you.',Racing:'Find your line and chase the perfect lap. A new personal best is waiting around the next corner.'};
  const related=[...games.filter(g=>g.id!==game.id&&g.genre===game.genre),...games.filter(g=>g.id!==game.id&&g.genre!==game.genre)].slice(0,8);
  return `${link('explore','← Explore experiences','text-link')}<div class="experience-detail"><img class="detail-art" src="${game.art}" alt="${esc(game.title)} artwork"><div><span class="eyebrow">${game.genre}</span><h1>${esc(game.title)}</h1><p class="experience-creator">By <strong>Metallic Studio</strong><span class="verified" aria-label="Sample creator">${icon('check',12)}</span></p><p>${descriptions[game.genre]}</p><div class="detail-stats"><div><strong>${game.rating}%</strong><span>Liked</span></div><div><strong>${game.playing}</strong><span>Active players</span></div><div><strong>${game.genre}</strong><span>Genre</span></div></div>
    <div class="experience-actions">${button('play',icon('play',22)+' Play','button play-button',`data-id="${game.id}"`)}${button('favorite',icon('heart',18)+(state.favorites.includes(game.id)?' Favorited':' Favorite'),`button ${state.favorites.includes(game.id)?'is-saved':''}`,`data-id="${game.id}" aria-pressed="${state.favorites.includes(game.id)}"`)}${button('share',icon('share',18),'button','aria-label="Share experience"')}</div><p class="fine-print">Preview experience · Live gameplay is not available yet.</p></div></div>
    <section class="experience-about"><h2>About this experience</h2><p>${descriptions[game.genre]}</p><div class="experience-facts"><div><span>Creator</span><strong>Metallic Studio</strong></div><div><span>Genre</span><strong>${game.genre}</strong></div><div><span>Availability</span><strong>Preview catalog</strong></div><div><span>Play on</span><strong>Metallic Launcher</strong></div></div></section>
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
function download() { return `${pageHead('The adventure starts here.','Your home for every Metallic experience.')}<section class="download-hero"><div><span class="eyebrow">METALLIC LAUNCHER</span><h2>Less waiting.<br>More playing.</h2><p>One home for your experiences, your friends, and whatever you discover next.</p><div class="categories">${['Windows','macOS','Linux'].map(p=>button('platform',p,`cat ${platform===p?'selected':''}`,`data-value="${p}" aria-pressed="${platform===p}"`)).join('')}</div><button class="button primary download-button" disabled>${icon('download')} ${platform} release coming soon</button><p class="fine-print">The launcher is in development. An installer will appear here when an official release is available.</p></div><div class="launcher-mock"><div class="window-dots"><i></i><i></i><i></i><span>Metallic Launcher · Preview</span></div><img src="art/game-1.svg" alt="Launcher experience preview"><div><strong>Your next adventure</strong><span>Cyber Raven: Neon Protocol</span><span class="launch-preview">${icon('play',15)} Jump in</span></div></div></section><div class="feature-columns download-features"><article><span class="step">01</span><h3>Get the launcher</h3><p>Download the official installer for your device when it becomes available.</p></article><article><span class="step">02</span><h3>Make yourself at home</h3><p>Sign in with your Metallic account and bring your identity with you.</p></article><article><span class="step">03</span><h3>Find your next favorite</h3><p>Explore experiences and jump into something new.</p></article></div><div class="panel"><h3>${platform} availability</h3><p class="muted">Release date, supported ${platform} versions, and system requirements will be confirmed with the first official launcher build.</p></div>`; }
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
function create() { return `${pageHead('Creator hub','Every great world starts with an idea.',button('new-project',icon('create',18)+' New experience','button primary'))}<section class="creator-hero"><div><span class="eyebrow">MAKE SOMETHING ONLY YOU CAN</span><h2>Your imagination.<br>Their next adventure.</h2><p>Start a project, shape a world, and get ready to share it.</p>${button('new-project','Start creating '+icon('arrow',17),'button primary')}</div><img src="art/game-11.svg" alt="Skyforge world inspiration"></section><div class="section-top"><h2>Your experiences <span class="muted">(${state.projects.length})</span></h2><span class="muted small-text">Local drafts</span></div>${state.projects.length?`<div class="project-grid">${state.projects.map(p=>`<article class="panel project-card"><div class="project-art">${icon('create',44)}</div><span class="tag">Draft</span><h3>${esc(p.name)}</h3><p class="muted">${esc(p.template)} template</p><div class="button-row">${button('edit-project','Edit draft','button small',`data-id="${esc(p.id)}"`)}${button('delete-project','Delete','button quiet small',`data-id="${esc(p.id)}"`)}</div></article>`).join('')}</div>`:empty('Your next big idea belongs here','Create your first experience to start your collection.',button('new-project','Create an experience','button primary'))}<div class="feature-columns"><article><span class="step">01</span><h3>Start small</h3><p>Choose a template and give your idea a name. A great experience begins with a simple concept.</p></article><article><span class="step">02</span><h3>Make it playable</h3><p>Build your world in Metallic Studio when the creator tools are released.</p></article><article><span class="step">03</span><h3>Bring people together</h3><p>Test with friends, refine your idea, and get ready to publish.</p></article></div>`; }
const packs = [{amount:400,price:'$4.99'},{amount:800,price:'$9.99'},{amount:1700,price:'$19.99'},{amount:4500,price:'$49.99'}];
function alloy() { return `${pageHead('Buy Alloy','More ways to make Metallic your own.')}<section class="alloy-intro"><div class="alloy-coin">${icon('alloy',72)}</div><div><span class="eyebrow">MAKE MORE OF METALLIC</span><h2>Put your own spin on play.</h2><p>Personalize your avatar and discover more ways to express yourself.</p></div><div class="balance"><span>Sample balance</span><strong>${icon('alloy',24)} 1,450</strong></div></section><div class="notice"><span>${icon('alloy')}<span><strong>Store preview</strong><small>Illustrative packs and prices. Purchases are not available and no payment is collected.</small></span></span></div><div class="alloy-packs">${packs.map((p,i)=>`<article class="alloy-pack ${i===2?'featured':''}">${i===2?'<span class="pack-ribbon">A little extra possibility</span>':''}${icon('alloy',44)}<h2>${p.amount.toLocaleString()}</h2><p>Alloy</p><strong class="pack-price">${p.price} <small>USD</small></strong>${button('review-pack','Preview pack','button '+(i===2?'primary':''),`data-index="${i}"`)}</article>`).join('')}</div><section class="faq"><h2>Good to know</h2><details><summary>What is Alloy?</summary><p>Alloy is the planned virtual currency for Metallic, designed for avatar items and in-experience content.</p></details><details><summary>Can I buy Alloy now?</summary><p>Not yet. This is a store preview. Payment processing, final pricing, and purchase terms will be added before the store launches.</p></details><details><summary>Will my preview balance be saved?</summary><p>The displayed 1,450 Alloy is sample content. It is not a real wallet or a transferable balance.</p></details></section>`; }
function profile() {
  const user=params.get('user');
  if(user && user!==state.profile.name){
    const person=community.find(p=>p.name===user)|| (state.friends.includes(user)?personInfo(user):null);
    if(!person)return notFound();
    const isFriend=state.friends.includes(user), incoming=state.requests.includes(user), sent=state.outgoing.includes(user);
    return `${link('friends','← Back to friends','text-link')}<section class="profile-cover guest-cover"><div class="cover-mark">M</div></section><section class="profile-header">${referenceAvatar(person.avatar,'profile-avatar')}<div><h1>${esc(user)}</h1><p>@${esc(user)} <span class="profile-online">${person.activity}</span></p></div><div class="profile-friend-action">${isFriend?button('remove-friend','Friends '+icon('check',16),'button',`data-name="${esc(user)}"`):incoming?button('accept-friend','Accept request','button primary',`data-name="${esc(user)}"`):sent?button('cancel-friend','Cancel request','button',`data-name="${esc(user)}"`):button('add-friend','Add friend','button primary',`data-name="${esc(user)}"`)}</div></section>
      <div class="profile-layout"><aside class="panel profile-about"><h3>About</h3><p>${esc(person.bio)}</p><span class="tag">Sample profile</span></aside><section><h2>${person.game?'Currently playing':'Explore together'}</h2><div class="game-grid profile-games">${(person.game?games.filter(g=>g.id===person.game):games.slice(0,3)).map(card).join('')}</div></section></div>`;
  }
  const favorites=games.filter(g=>state.favorites.includes(g.id));
  return `<section class="profile-cover"><div class="cover-mark">M</div><span class="eyebrow">YOUR CORNER OF METALLIC</span></section><section class="profile-header">${avatar(0,'profile-avatar')}<div><h1>${esc(state.profile.name)}</h1><p>@${esc(state.profile.name)} ${state.activity?'<span class="profile-online">● Online in preview</span>':''}</p></div>${link('settings','Edit profile','button')}</section>
    <div class="profile-layout"><aside><section class="panel profile-about"><h3>About</h3><p>${esc(state.profile.bio)||'Tell people a little about yourself.'}</p><div class="profile-numbers"><a href="#/friends"><strong>${state.friends.length}</strong><span>Friends</span></a><a href="#/create"><strong>${state.projects.length}</strong><span>Creations</span></a></div>${link('wardrobe','Customize avatar '+icon('arrow',15),'button full')}</section><section class="profile-avatar-stage">${mannequin(state.outfit,state.color,state.accessory,false)}<span>Currently wearing · ${state.outfit}</span></section></aside>
    <section><div class="section-top"><h2>Favorite experiences <span class="muted">(${favorites.length})</span></h2>${link('explore','Discover more →','view-all')}</div>${favorites.length?`<div class="game-grid profile-games">${favorites.map(card).join('')}</div>`:empty('Keep your favorites close','Favorite an experience to find it here.',link('explore','Explore experiences'))}
    ${friendStrip()}<section class="home-section"><div class="section-top"><h2>Creations</h2>${link('create','Creator hub →','view-all')}</div>${state.projects.length?state.projects.map(p=>`<div class="creation-row"><span>${icon('create')} ${esc(p.name)}</span>${button('edit-project','Edit draft','button small',`data-id="${esc(p.id)}"`)}</div>`).join(''):empty('Your ideas belong here','Start your first experience and make something your own.',link('create','Start creating'))}</section></section></div>`;
}
function settings() { return `${pageHead('Settings','Make Metallic work for you.')}<form id="settings-form" class="settings-form"><section class="panel"><div class="settings-heading">${icon('profile',24)}<div><h2>Profile</h2><p>Your name and a little about you.</p></div></div><label>Display name<input name="name" aria-label="Display name" value="${esc(state.profile.name)}" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+"><small>3–20 letters, numbers, or underscores.</small></label><label>Bio<textarea aria-label="Bio" name="bio" maxlength="240" rows="3">${esc(state.profile.bio)}</textarea><small>Tell your story in 240 characters or less.</small></label></section><section class="panel"><div class="settings-heading">${icon('settings',24)}<div><h2>Privacy & preferences</h2><p>Preview your preferences for the platform.</p></div></div><label>Who can view my profile?<select name="visibility">${['Everyone','Friends only','Only me'].map(v=>`<option ${state.profile.visibility===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="toggle-row"><span><strong>Show my activity</strong><small>Let friends see what you’re playing.</small></span><input type="checkbox" name="activity" role="switch" ${state.activity?'checked':''}></label><label class="toggle-row"><span><strong>Friend notifications</strong><small>See friend request reminders in this preview.</small></span><input type="checkbox" name="notifications" role="switch" ${state.notifications?'checked':''}></label><p class="fine-print">Preferences are saved locally. Visibility and activity controls will take effect across accounts when the platform is connected.</p></section><div class="settings-save"><span class="muted small-text">Saved to this browser</span><button class="button primary" type="submit">${icon('check',17)} Save changes</button></div></form><section class="panel reset-panel"><div><h3>Reset preview data</h3><p class="muted">Restore the sample profile, outfits, friends, and drafts.</p></div>${button('reset-demo','Reset preview','button danger')}</section>`; }
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
  const pages={'':landing,home,explore,login:auth,signup:auth,download,wardrobe,create,alloy,profile,settings,friends};
  const page=Object.hasOwn(pages,route)?pages[route]:/^experience\/\d+$/.test(route)?experience:notFound;
  const titles={'':'A world of possibilities',home:'Home',explore:'Explore',signup:'Sign up',login:'Log in',download:'Download',wardrobe:'Wardrobe',create:'Creator hub',alloy:'Buy Alloy',profile:'Profile',settings:'Settings',friends:'Friends'};
  const game=games.find(g=>route===`experience/${g.id}`);
  document.title=`${game?.title || (Object.hasOwn(titles,route)?titles[route]:'Page not found')} | Metallic`;
  document.body.classList.remove('nav-open');
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
function suggestExperiences(query) {
  const results=document.querySelector('#search-suggestions');if(!results)return;
  if(!query.trim()){closeSuggestions();return;}
  const matches=filterGames(games,query).slice(0,4);
  results.innerHTML=`<span class="suggestions-label">Experiences</span>${matches.map(g=>`<a href="#/experience/${g.id}"><img src="${g.art}" alt=""><span><strong>${esc(g.title)}</strong><small>${g.genre} · ${g.playing} playing</small></span>${icon('arrow',14)}</a>`).join('')}${!matches.length?'<p>No matching experiences</p>':''}<a class="all-results" href="#/explore?q=${encodeURIComponent(query.trim())}">${icon('search',16)} Search all experiences</a>`;
  results.hidden=false;document.querySelector('#site-search').setAttribute('aria-expanded','true');
}
function projectEditor(project) {
  modal(project?'Edit experience':'Create an experience',`<p class="muted">${project?'Shape your idea before you start building.':'Every great world starts with an idea.'}</p><form id="project-form" data-id="${esc(project?.id||'')}"><label for="project-name">Experience name</label><input id="project-name" name="name" required maxlength="60" value="${esc(project?.name||'')}" placeholder="My first world"><label for="project-template">Starting template</label><select id="project-template" name="template">${templates.map(t=>`<option ${project?.template===t?'selected':''}>${t}</option>`).join('')}</select><label for="project-description">Description</label><textarea id="project-description" name="description" maxlength="500" rows="3" placeholder="What will players discover?">${esc(project?.description||'')}</textarea><p class="fine-print">Saved as a local draft. Studio editing and publishing are coming later.</p><button class="button primary full" type="submit">${project?'Save draft':'Create draft'} ${icon('arrow',17)}</button></form>`);
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
  const navigation=e.target.closest('a[href^="#/"]');
  if(navigation&&settingsDirty&&route==='settings'){
    e.preventDefault();modal('Leave without saving?',`<p class="muted">Your profile changes have not been saved.</p>${button('discard-settings','Discard changes','button danger',`data-value="${esc(navigation.getAttribute('href').slice(1))}"`)} ${button('close-dialog','Keep editing','button')}`);return;
  }
  if(navigation&&document.body.classList.contains('nav-open'))setMenu(false);
  const el=e.target.closest('[data-action]');if(!el)return;
  const {action,value,id,name}=el.dataset;
  switch(action){
    case 'menu':setMenu(!document.querySelector('#sidebar').classList.contains('open'));break;
    case 'close-dialog':dialog.close();break;
    case 'discard-settings':settingsDirty=false;dialog.close();navigate(value);break;
    case 'notifications':modal('Notifications',state.notifications?`<div class="notification-summary">${icon('friends',28)}<h3>${state.requests.length?'You have friend requests':'You’re all caught up'}</h3><p class="muted">${state.requests.length?`${state.requests.length} people want to connect in the preview.`:'New activity will appear here.'}</p></div>${link('friends?tab=requests','View friend requests','button primary full')}`:'<p class="muted">Friend notifications are turned off.</p>'+link('settings','Manage preferences'));break;
    case 'scroll':{const shelf=document.getElementById(el.dataset.target);shelf.scrollBy({left:Number(el.dataset.direction)*Math.max(240,shelf.clientWidth*.8),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});break;}
    case 'dismiss-launcher':state.launcherDismissed=true;persist('Launcher notice hidden. Downloads are always in the menu.');render();break;
    case 'category':setQuery({category:value==='All'?null:value});break;
    case 'clear-search':navigate('/explore');break;
    case 'favorite':if(games.some(g=>g.id===id)){state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist(state.favorites.includes(id)?'Added to your favorites.':'Removed from favorites.');render();}break;
    case 'play':modal('Your next adventure is on its way',`<p class="muted">${esc(games.find(g=>g.id===id)?.title||'This experience')} will open in the Metallic launcher when live gameplay is available.</p><p>This is a preview experience. No game has been launched.</p>${link('download',icon('download',18)+' View launcher availability','button primary full')}`);break;
    case 'share':try{await navigator.clipboard.writeText(location.href);toast('Experience link copied.');}catch{modal('Share this experience',`<label for="share-url">Experience link</label><input id="share-url" class="share-url" readonly value="${esc(location.href)}"><p class="fine-print">Copy this link. Viewers still need access to this private preview.</p>`);document.querySelector('#share-url').select();}break;
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
  if(!['search-form','friend-search','auth-form','project-form','settings-form'].includes(form.id))return;
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
    persist(existing?'Draft updated.':'Your experience draft is ready.');dialog.close();render();
  }
  if(form.id==='settings-form'){
    state.profile={name:data.get('name'),bio:data.get('bio').trim(),visibility:data.get('visibility')};
    state.activity=data.has('activity');state.notifications=data.has('notifications');settingsDirty=false;
    persist('Your settings are saved.');render();
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='site-search')suggestExperiences(e.target.value);
  if(e.target.id==='project-name')e.target.setCustomValidity('');
  if(e.target.closest('#settings-form')){settingsDirty=true;document.querySelector('.settings-save .muted').textContent='Unsaved changes';}
});
document.addEventListener('change',e=>{
  if(e.target.id==='sort')setQuery({sort:e.target.value==='recommended'?null:e.target.value});
  if(e.target.closest('#settings-form')){settingsDirty=true;document.querySelector('.settings-save .muted').textContent='Unsaved changes';}
});
document.addEventListener('focusin',e=>{if(!e.target.closest('#search-form'))closeSuggestions();});
document.addEventListener('keydown',e=>{
  const inField=e.target.matches('input,textarea,select')||e.target.isContentEditable;
  if(e.key==='/'&&!inField&&!dialog.open){const search=document.querySelector('#site-search');if(search){e.preventDefault();search.focus();}}
  if(e.key==='Escape'){closeSuggestions();if(document.body.classList.contains('nav-open'))setMenu(false);}
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
