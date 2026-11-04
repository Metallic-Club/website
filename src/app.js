import {createStorefront} from './storefront.js';
import {passesFor,createGamePassUI} from './game-passes.js';
import {createGroupNewsUI} from './group-news-ui.js';
import {groupNewsNotifications} from './group-news.js';
import {createAccountLinksUI} from './account-links-ui.js';
import {accountBadges,normalizeYoutubeUrl} from './account-roles.js';
import {profilePermissions,privacyFormFields,privacyFromForm} from './privacy.js';
import {formatPlaytime,playerGameProgress,playedGames,progressTotals} from './game-progress.js';
import {createCreatorWorkspace} from './creator-workspace.js';
import {createGroupControls} from './group-controls.js';
import {assetById,clearFiles} from './creator-data.js';
import {canGroup} from './group-access.js';
import {loadAppearance,saveAppearance,applyAppearance,normalizeAppearance,defaultAppearance,themesPage} from './themes.js';
import {documentationPage,docArticles} from './documentation.js';
import { games } from './catalog.js';
import { searchSite } from './search.js';
import { createInviteGate } from './beta-access.js';
import { createBetaSession, requiresTester, testerReturnTo } from './beta-session.js';
import { pageWindow } from './pagination.js';
import { createLocalCatalog, createCatalogClient, metadataFor } from './catalog-service.js';
import {presenceFor,activityFor} from './presence.js';
import { loadState, saveState, filterGames, updateFriendship, escapeHtml as esc } from './store.js';
import { readRoute, routeWithParams, categories, friendTabs } from './router.js';
import {portrait,genericAvatar,community,personInfo} from './avatar.js';
import { SERVER_PRICE, groupMemberSections, groupRole, groupsForProfile, friendActivity, groupCategories, getGroups, findGroup, groupMembers, ownerForGame, friendsPlaying, friendSessions, sampleServers, serverAccess, friendJoinAccess, createServerPreview, reservedServerCards, updateGroupMembership } from './social.js';
import { genres, cosmeticSlots, creatorTypes, settingsSections, gameDetails, recommendGames, recommendationGenres, discoverGames, connections, mutualFriends, sampleFavorites, marketplaceAssets, assetMatches } from './platform.js';

let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw Error('Unavailable'); } }; }
let state = loadState(storage);
let appearance=loadAppearance(storage);
const sidebarStorageKey='metallic-sidebar-collapsed-v1';
let sidebarCollapsed=false;
try{sidebarCollapsed=storage.getItem(sidebarStorageKey)==='1';}catch{}
window.addEventListener('storage',event=>{if(event.key===sidebarStorageKey){sidebarCollapsed=event.newValue==='1';syncSidebarState();}});
const themeMedia=window.matchMedia('(prefers-color-scheme: light)');
function setAppearance(changes){appearance=normalizeAppearance({...appearance,...changes});applyAppearance(appearance,document.documentElement,themeMedia.matches);const saved=saveAppearance(storage,appearance);render();const status=document.querySelector('#theme-status');if(status)status.textContent=saved?'Theme preferences saved.':'Applied for this visit. Browser storage is unavailable.';}
applyAppearance(appearance,document.documentElement,themeMedia.matches);
themeMedia.addEventListener('change',()=>applyAppearance(appearance,document.documentElement,themeMedia.matches));
window.addEventListener('storage',event=>{if(event.key==='metallic-appearance-v1'){appearance=loadAppearance(storage);applyAppearance(appearance,document.documentElement,themeMedia.matches);if(route==='settings'&&params.get('section')==='themes')render();}});
let route, params, category = 'All', sort = 'recommended', friendTab = 'All friends', platform = 'Windows';
let settingsDirty = false, notificationsOpen = false;
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const inviteGate=createInviteGate({endpoint:document.querySelector('meta[name="metallic-beta-api"]')?.content||''});
const betaSession=createBetaSession({endpoint:document.querySelector('meta[name="metallic-beta-api"]')?.content||''});
let sessionTimer, loginBusy=false, sessionBusy=false;
function scheduleSessionCheck(){clearTimeout(sessionTimer);if(betaSession.hasAccess())sessionTimer=setTimeout(refreshSession,Math.max(0,betaSession.expiresAt()-Date.now()));}
async function refreshSession(){
  if(loginBusy||sessionBusy)return;
  const wasInside=requiresTester(readRoute(location.hash).route);
  const task=betaSession.check();
  if(wasInside){settingsDirty=false;if(dialog.open)dialog.close();render(false);}
  const result=await task;
  if(result.cancelled)return;
  scheduleSessionCheck();
  if(result.ok){state.profile.name=betaSession.user().username;const current=readRoute(location.hash);if(current.route==='login')navigate(testerReturnTo(current.params.get('returnTo')));else render(false);}
}
let inviteBusy=false;
const catalog = createCatalogClient({ local: createLocalCatalog(games, gameDetails), endpoint: document.querySelector('meta[name="metallic-catalog-api"]')?.content || '' });
let routeData = { key: '', status: 'idle', value: null }, routeController, routeSequence = 0;
function ensureCatalogData() {
  const kind = route === 'explore' ? 'list' : /^game\/[\w-]+$/.test(route) ? 'game' : null;
  if (!kind) { routeController?.abort(); routeData = { key: '', status: 'idle', value: null }; return; }
  const key = JSON.stringify([route, [...params], state.preferredGenres, state.favorites, state.hiddenGames]);
  if (routeData.key === key) return;
  routeController?.abort(); routeController = new AbortController();
  const sequence = ++routeSequence, requestParams = new URLSearchParams(params), snapshot = { preferredGenres:[...state.preferredGenres], favorites:[...state.favorites], hiddenGames:[...state.hiddenGames] };
  routeData = { key, status: 'loading', value: null };
  const task = kind === 'list' ? catalog.list(requestParams, snapshot, { signal: routeController.signal }) : catalog.get(route.split('/')[1], { signal: routeController.signal });
  task.then(value => { if (sequence !== routeSequence || routeData.key !== key) return; routeData = { key, status: 'ready', value }; render(); })
    .catch(error => { if (sequence !== routeSequence || routeData.key !== key || routeController.signal.aborted) return; routeData = { key, status: 'error', value: null }; render(); });
}
function catalogLoading() { return '<div class="catalog-loading" role="status" aria-label="Loading games">'+Array.from({length:6},()=>'<span class="skeleton-card"><i></i><b></b><small></small></span>').join('')+'<span class="sr-only">Loading games…</span></div>'; }
function catalogError() { return empty('Games are taking a little longer.','We couldn’t load the catalog. Your filters are saved.',button('retry-catalog','Try again','button primary')); }
function pageLinks(page, label='results', key='page') {
  if(page.pages<=1)return '';
  const url=value=>'#'+routeWithParams(route,params,{[key]:value===1?null:value});
  return `<nav class="pagination" aria-label="${esc(label)} pages"><span>${page.total?`${(page.start+1).toLocaleString()}–${page.end.toLocaleString()} of ${page.total.toLocaleString()}`:'0 results'}</span><div>${page.page>1?`<a class="button small" href="${url(page.page-1)}" rel="prev" aria-label="Previous page of ${esc(label)}">← Previous</a>`:'<button class="button small" disabled>← Previous</button>'}<span class="page-number">Page ${page.page} of ${page.pages}</span>${page.page<page.pages?`<a class="button small" href="${url(page.page+1)}" rel="next" aria-label="Next page of ${esc(label)}">Next →</a>`:'<button class="button small" disabled>Next →</button>'}</div></nav>`;
}

const icons = {
  connections: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  themes: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.5-3.3 1.5 1.5 0 0 1 1.2-2.5H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10.5" cy="6.8" r=".8"/><circle cx="15" cy="7.5" r=".8"/><circle cx="17.5" cy="11" r=".8"/>',
  docs: '<path d="M4 3h12l4 4v14H4zM15 3v5h5M8 12h8M8 16h6"/>',
  home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
  explore: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  wardrobe: '<path d="m8 3 4 3 4-3 6 5-4 4-2-2v11H8V10l-2 2-4-4z"/>',
  create: '<path d="M12 3v18M3 12h18"/>',
  alloy: '<path d="m12 2 9 5v10l-9 5-9-5V7zM12 7l4 2v6l-4 2-4-2V9z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  friends: '<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 4 5"/>',
  settings: '<path d="M19.46 9.72L21.78 9.92L21.78 14.08L19.46 14.28L18.89 15.66L20.39 17.45L17.45 20.39L15.66 18.89L14.28 19.46L14.08 21.78L9.92 21.78L9.72 19.46L8.34 18.89L6.55 20.39L3.61 17.45L5.11 15.66L4.54 14.28L2.22 14.08L2.22 9.92L4.54 9.72L5.11 8.34L3.61 6.55L6.55 3.61L8.34 5.11L9.72 4.54L9.92 2.22L14.08 2.22L14.28 4.54L15.66 5.11L17.45 3.61L20.39 6.55L18.89 8.34Z"/><circle cx="12" cy="12" r="3.2"/>',
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
  crown: '<path d="m3 6 5 4 4-6 4 6 5-4-2 13H5zM6 22h12"/>',
  groups: '<circle cx="12" cy="5" r="3"/><circle cx="4" cy="9" r="2"/><circle cx="20" cy="9" r="2"/><path d="M8 21v-5a4 4 0 0 1 8 0v5ZM1 20v-4a3 3 0 0 1 5-2M23 20v-4a3 3 0 0 0-5-2"/>',
  marketplace: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18M8 7V4h8v3M9 15h6"/>',
  models: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
  audio: '<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
  plugins: '<path d="M8 3v5m8-5v5M5 8h14v4a7 7 0 0 1-14 0zM12 19v3"/>',
  filter: '<path d="M3 6h18M6 12h12M9 18h6"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  achievement: '<circle cx="12" cy="9" r="6"/><path d="m8 14-2 8 6-3 6 3-2-8M10 9l2 2 3-4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
function icon(name, size = 20) { return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.explore}</svg>`; }
function presenceDot(name) {
  const status=presenceFor(state,name);
  return `<i class="presence ${status.key}" data-presence="${status.key}" role="img" aria-label="${status.label}" title="${status.label}"></i>`;
}
const brand = () => `<a class="brand" href="${['','login','signup'].includes(route)?'#/':'#/home'}"><span class="brand-glyph">M</span><span class="brand-word">Metallic <span class="brand-beta">BETA</span></span></a>`;
function activityText(name,text='') {
  const status=activityFor(state,name);
  return `<span class="activity-text" data-presence="${status.key}">${esc(status.key==='playing'&&text?text:status.text)}</span>`;
}
const referenceAvatar = (_index = 0, cls = '') => genericAvatar(cls, '');
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
  return `<article class="game-card"><a class="game-card-link" href="#/game/${encodeURIComponent(game.id)}" aria-label="${esc(game.title)}${Number.isFinite(game.playtimeMinutes)?', '+(game.playtimeMinutes?formatPlaytime(game.playtimeMinutes)+' played':'not played yet'):''}">
    <span class="game-art"><img class="poster-art" src="${esc(game.art)}" alt="" loading="lazy" decoding="async" width="240" height="240">
      ${state.favorites.includes(game.id) ? `<span class="saved-marker" title="Saved to favorites">${icon('heart',13)}</span>` : ''}
    </span><span class="game-title">${esc(game.title)}</span>
    <span class="game-stats"><span class="stat-rating" aria-label="${game.rating} percent liked">${icon('thumbs',13)} ${game.rating}%</span><span aria-label="${esc(game.playing)} playing">${icon('profile',13)} ${esc(game.playing)}</span></span>
    ${Number.isFinite(game.playtimeMinutes)?`<span class="game-playtime">${icon('clock',12)} ${game.playtimeMinutes?formatPlaytime(game.playtimeMinutes)+' played':'Not played yet'}</span>`:''}
  </a><div class="game-quick-play">${button('play','<svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4 18 12 6 20Z"/></svg>','game-play',`data-id="${esc(game.id)}" data-title="${esc(game.title)}" aria-label="Play ${esc(game.title)}"`)}</div></article>`;
}
function shelf(title, subtitle, items, id, destination = 'explore') {
  if(!items.length)return '';
  return `<section class="home-section"><div class="section-top"><div><h2>${title}</h2>${subtitle ? `<p class="section-sub">${subtitle}</p>` : ''}</div>
    <div class="section-actions">${link(destination,'See all '+icon('arrow',15),'view-all')}
    <div class="shelf-controls">${button('scroll','‹','slide-btn',`data-target="${id}" data-direction="-1" aria-label="Scroll ${title} left"`)}${button('scroll','›','slide-btn',`data-target="${id}" data-direction="1" aria-label="Scroll ${title} right"`)}</div></div></div>
    <div class="card-scroller" id="${id}" tabindex="0" role="region" aria-label="${title} games">${items.slice(0,8).map(card).join('')}</div></section>`;
}
function navItem(id, label) { return `<a class="side-link ${(route === id || route.startsWith(id+'/')) ? 'active' : ''}" href="#/${id}" title="${esc(label)}" ${(route === id || route.startsWith(id+'/')) ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span>${id === 'friends' && state.requests.length ? `<span class="nav-count">${state.requests.length}</span>` : ''}</a>`; }
function shell(content, publicPage = false) {
  const primary=[['home','Home'],['explore','Explore'],['wardrobe','Wardrobe']];
  const mainNav=primary.map(([id,label])=>`<a href="#/${id}" class="${route===id?'active':''}" ${route===id?'aria-current="page"':''}>${label}</a>`).join('');
  const unread=notificationItems().filter(item=>!state.readNotifications.includes(item.id)).length;
  return `<header class="topbar">${!publicPage?button('menu',icon('menu'),'mobile-menu sidebar-toggle','aria-label="Toggle navigation" aria-controls="sidebar" aria-expanded="false"'):''}${brand()}
    ${!publicPage?`<nav class="topnav" aria-label="Main navigation">${mainNav}</nav>`:''}
    ${!publicPage?`<form class="top-search" id="search-form" role="search">${icon('search',18)}<input id="site-search" name="q" type="search" placeholder="Search games, people, groups" aria-label="Search games, people, and groups" value="${esc(route==='search'?params.get('q')||'':'')}" autocomplete="off" maxlength="160" aria-controls="search-suggestions" aria-expanded="false"><button class="search-submit" type="submit" aria-label="Search">${icon('arrow',16)}</button><div id="search-suggestions" hidden aria-label="Search suggestions"></div></form>
    <div class="top-actions">${button('notifications',icon('bell')+(unread?'<span class="notification-dot"></span>':''),'plain-icon','id="notification-toggle" aria-label="Notifications" aria-controls="notification-popover" aria-expanded="false"')}<a href="#/alloy" class="wallet" title="Preview Alloy balance">${icon('alloy',19)}<span>${state.previewAlloy.toLocaleString()}</span></a><a href="#/profile" class="top-profile" aria-label="View your profile">${avatar()}<span class="username">${esc(state.profile.name)}</span></a></div>`:`<div class="top-actions">${link('login','Log in','button quiet')}${link('signup','Redeem invite','button primary')}</div>`}</header>
    ${!publicPage?`<section id="notification-popover" class="notification-popover" role="region" aria-label="Notification inbox" hidden></section><button class="mobile-backdrop" data-action="menu" aria-label="Close navigation"></button>
    <aside class="sidebar" id="sidebar"><span class="side-section-label">COMMUNITY</span><nav class="nav-group" aria-label="Community navigation">${navItem('friends','Friends')}${navItem('groups','Groups')}${navItem('marketplace','Marketplace')}</nav><span class="side-section-label">YOUR ACCOUNT</span><nav class="nav-group" aria-label="Account navigation">${navItem('alloy','Buy Alloy')}${navItem('settings','Settings')}</nav><span class="side-section-label">METALLIC</span><nav class="nav-group" aria-label="Platform tools">${navItem('create','Create')}${navItem('download','Download')}${navItem('docs','Documentation')}</nav><div class="sidebar-bottom"><div class="premium-box"><div class="premium-title">${icon('download',17)} Your next adventure</div><p>Get the latest on the Metallic launcher.</p>${link('download','Launcher availability','premium-link')}</div><a class="sidebar-about" href="#/">About Metallic ${icon('arrow',14)}</a>${button('logout','Log out','button small sidebar-logout')}</div></aside>`:''}
    <main id="main" tabindex="-1" class="${publicPage?'public-page':'page'}"><div class="${publicPage?'public-content':'content'}">${content}<footer class="footer"><span>© ${new Date().getFullYear()} Metallic <span class="demo-label">Closed beta · Tester access only</span></span><div class="footer-links">${link('','About','')}${publicPage?link('login','Tester log in',''):link('download','Download','')+link('marketplace','Marketplace','')+link('settings','Settings','')}</div></footer></div></main>`;
}
function landing() {
  return `<section class="landing-hero beta-landing-hero"><div class="hero-copy"><span class="beta-pill"><span class="beta-status-dot"></span> CLOSED BETA · INVITE ONLY</span><h1>Play games.<br>Build what you want.</h1><p>Metallic is a platform for fun, engaging games and the people who make them. We’re building the tools developers need to create the games they want to make.</p><div class="button-row">${link('signup','I have an invite '+icon('arrow',18))}${link('login','Tester log in','button')}</div><small>Only signed-in beta testers can access the platform. New accounts require an invite code.</small></div><div class="hero-mosaic">${[games[0],games[1],games[4],games[5]].map(g=>`<div class="beta-world"><img src="${g.art}" alt="${esc(g.title)} concept artwork" width="360" height="360"><span>${esc(g.title)}</span></div>`).join('')}<div class="mosaic-caption">Example games. <span>Metallic is still in development.</span></div></div></section>
    <section class="beta-note"><span>${icon('create',22)}</span><div><strong>Still in development.</strong><p>The launcher, games, and development tools are still being worked on. Access is limited to invited beta testers.</p></div>${link('login','Tester log in →','text-link')}</section>
    <section class="beta-how"><div class="beta-section-intro"><span class="eyebrow">PLAY AND CREATE</span><h2>For players and developers.</h2><p>Play games made by the community, or develop and share your own.</p></div><div class="beta-steps"><article><span class="beta-step">01</span><h3>Find games you enjoy</h3><p>Discover games made by other developers, play with friends, and come back to your favorites.</p></article><article><span class="beta-step">02</span><h3>Make your own games</h3><p>We’re working on tools for building, testing, and publishing games, so you can focus on what you want to create.</p></article><article><span class="beta-step">03</span><h3>Test with us</h3><p>Invited testers get access while we work on the platform. Games and features may be unfinished or unavailable during the beta.</p></article></div></section>
    <section class="beta-bottom"><div><span class="eyebrow">CLOSED BETA</span><h2>Have an invite?</h2><p>Enter your code to get started. If you already have a tester account, log in.</p></div><div>${link('signup','Enter invite code '+icon('arrow',17),'button primary')}${link('login','Already a tester? Log in','text-link')}</div></section>
    <section class="beta-faq"><h2>Questions about the beta</h2><details><summary>Who can use Metallic?</summary><p>Access is limited to invited beta testers. You need an invite code to register and a tester account to log in.</p></details><details><summary>Are games available yet?</summary><p>Metallic and its launcher are still in development. The games shown here are examples, not live releases.</p></details><details><summary>Can I customize my avatar?</summary><p>Not yet. The wardrobe is still in development. All profiles use a generic icon for now.</p></details></section>`;
}
function friendStrip() {
  return `<section class="home-section friends-section"><div class="section-top"><h2>Friends <span class="muted">(${state.friends.length})</span></h2>${link('friends','See all '+icon('arrow',15),'view-all')}</div>
    <div class="friends-list"><a class="friend" href="#/friends?tab=find"><span class="friend-picture add">${icon('create',28)}</span><span class="friend-name">Add friends</span><span class="friend-activity">Find your people</span></a>
    ${state.friends.slice(0,12).map(name => { const person=personInfo(name), activity=friendActivity(state,name); return `<div class="friend home-friend-preview" data-friend-preview="${esc(name)}"><a class="friend-profile" href="#/profile?user=${encodeURIComponent(name)}"><span class="friend-picture">${referenceAvatar(person.avatar)}${presenceDot(name)}</span><span class="friend-name">${accountName(name)}</span></a><button type="button" class="friend-activity activity-trigger" data-action="friend-preview" aria-label="See activity for ${esc(name)}" aria-controls="friend-activity-popover" aria-expanded="false">${activityText(name,activity?'In game':'')} ${icon('arrow',10)}</button></div>`; }).join('')}</div>
    <div id="friend-activity-popover" class="friend-activity-popover" popover="manual" role="region" aria-label="Friend activity"></div></section>`;
}
function home() { return storefront.home(); }
function explore() { return storefront.explore(); }
function gamePage() {
  if(routeData.status==='loading')return pageHead('Loading game','Getting your next adventure ready.')+catalogLoading();
  if(routeData.status==='error')return pageHead('Game unavailable','Try again in a moment.')+catalogError();
  const game=routeData.value;if(!game)return notFound();
  if(catalog.remote)return remoteGamePage(game);
  const info=gameDetails[game.id], servers=sampleServers(game.id), owned=reservedServerCards(state,game.id), owner=ownerForGame(game.id);
  const serverTab=params.get('tab')==='servers',achievementTab=params.get('tab')==='achievements',passTab=params.get('tab')==='passes';
  const requested=params.get('user'),progressName=requested&&(requested===state.profile.name||state.friends.includes(requested)||community.some(person=>person.name===requested))?requested:state.profile.name;
  const progress=playerGameProgress(game,progressName,state.profile.name);
  const gameSectionLink=(tab,label)=>{const query=new URLSearchParams();if(tab)query.set('tab',tab);if(progressName!==state.profile.name)query.set('user',progressName);else if(params.get('viewAs'))query.set('viewAs',params.get('viewAs'));const selected=(params.get('tab')||'')===tab||!tab&&!['servers','achievements','passes'].includes(params.get('tab'));return `<a href="#/game/${game.id}${query.size?'?'+query:''}" class="${selected?'selected':''}" ${selected?'aria-current="page"':''}>${label}</a>`;};
  const descriptions={Adventure:'Explore the unknown, discover hidden corners, and find your own path through a world full of possibility.',Action:'Bring your best moves, take on a new challenge, and team up with friends for your next adventure.',Obby:'Jump, dodge, and find your rhythm. Every obstacle is another chance to beat your personal best.',Simulation:'Start with a little imagination and make a world your own. Build, discover, and see where your curiosity takes you.',Roleplay:'Meet up with friends, find your favorite corner of the city, and create a story that belongs to you.',Racing:'Find your line and chase the perfect lap. A new personal best is waiting around the next corner.'};
  return `${link('explore','← Explore games','text-link')}<section class="game-detail game-overview"><div class="game-keyart"><img class="detail-art" src="${game.art}" alt="${esc(game.title)} artwork"><span>GAME PREVIEW</span></div><div><span class="eyebrow">${game.genre} · ${info.mode}</span><h1>${esc(game.title)}</h1><p class="game-creator">By ${creatorLink(game.id)}</p><p>${descriptions[game.genre]}</p><div class="game-tag-row">${info.tags.map(tag=>`<span>${tag}</span>`).join('')}</div><div class="detail-stats"><div><strong>${game.rating}%</strong><span>Liked</span></div><div><strong>${game.playing}</strong><span>Active players</span></div><div><strong>${servers.length}</strong><span>Sample servers</span></div></div>${gameProgressSummary(game,progressName)}<div class="game-actions">${button('play',icon('play',22)+' Play','button play-button',`data-id="${game.id}"`)}${button('favorite',icon('heart',18)+(state.favorites.includes(game.id)?' Favorited':' Favorite'),`button ${state.favorites.includes(game.id)?'is-saved':''}`,`data-id="${game.id}" aria-pressed="${state.favorites.includes(game.id)}"`)}${button('share',icon('share',18),'button','aria-label="Share game"')}</div><p class="fine-print">Game activity, playtime, and achievements are sample data. Live gameplay is not connected.</p></div></section>
    ${gameFriends(game.id)}<nav class="game-page-tabs" aria-label="Game sections">${gameSectionLink('','Overview')}${gameSectionLink('achievements','Achievements ('+progress.total+')')}${gameSectionLink('passes','Game passes ('+passesFor(game).length+')')}${gameSectionLink('servers','Servers ('+servers.length+')')}</nav>
    ${passTab?gamePassUI.page(game):achievementTab?gameAchievementDetails(game,progressName):serverTab?`
    <section class="reserved-servers-section"><div class="section-top"><div><h2>Your servers <span class="muted">(${owned.length})</span></h2><p class="section-sub">Your own space, with public or invite-only access.</p></div>${button('create-server',icon('create',16)+' Create private server','button',`data-id="${game.id}"`)}</div><div class="private-server-price"><span>${icon('alloy',18)} <strong>${SERVER_PRICE} Alloy</strong><small>One-time preview creation cost</small></span><span>Preview balance: <strong>${state.previewAlloy.toLocaleString()} Alloy</strong></span></div>${owned.length?`<div class="server-list">${owned.map(serverCard).join('')}</div>`:'<div class="reserved-empty">'+icon('friends',23)+'<p>Make room for your friends. Create a server and decide who can join.</p></div>'}</section>
    <section class="public-servers-section"><div class="section-top"><div><h2>Active servers</h2><p class="section-sub">Hover or focus a player to see their name.</p></div><label class="sort-label">Sort by<select id="server-sort"><option value="available" ${params.get('serverSort')==='available'||!params.get('serverSort')?'selected':''}>Available spaces</option><option value="players" ${params.get('serverSort')==='players'?'selected':''}>Most players</option></select></label></div><div class="server-list">${[...servers].sort((a,b)=>params.get('serverSort')==='players'?b.players.length-a.players.length:(b.capacity-b.players.length)-(a.capacity-a.players.length)).map(serverCard).join('')}</div><p class="fine-print">These are sample sessions. Join controls preview a launcher handoff; they do not start or connect to a live game.</p></section>
    `:`<section class="game-about"><h2>About this game</h2><p>${descriptions[game.genre]}</p><div class="game-facts"><div><span>Creator</span><strong>${creatorLink(game.id)}</strong></div><div><span>Play style</span><strong>${info.mode}</strong></div><div><span>Mood</span><strong>${info.mood}</strong></div><div><span>Play on</span><strong>Metallic Launcher</strong></div></div></section>`}
    ${shelf('You might also like','Keep exploring',games.filter(item=>item.id!==game.id).sort((a,b)=>Number(b.genre===game.genre)-Number(a.genre===game.genre)).slice(0,8),'related',`explore?category=${game.genre}`)}`;
}
function remoteGamePage(game) {
  const info=metadataFor(game);
  return `${link('explore','← Explore games','text-link')}<section class="game-detail game-overview"><div class="game-keyart"><img class="detail-art" src="${esc(game.art)}" alt="${esc(game.title)} artwork" width="960" height="540" fetchpriority="high"></div><div><span class="eyebrow">${esc(game.genre)} · ${esc(info.mode)}</span><h1>${esc(game.title)}</h1><div class="game-tag-row">${info.tags.map(tag=>'<span>'+esc(tag)+'</span>').join('')}</div><div class="detail-stats"><div><strong>${game.rating}%</strong><span>Liked</span></div><div><strong>${esc(game.playing)}</strong><span>Playing</span></div></div>${link('download','View launcher availability','button primary')}</div></section><nav class="game-page-tabs" aria-label="Game sections">${link('game/'+encodeURIComponent(game.id),'Overview',params.get('tab')!=='passes'?'selected':'')}${link('game/'+encodeURIComponent(game.id)+'?tab=passes','Game passes',params.get('tab')==='passes'?'selected':'')}</nav>${params.get('tab')==='passes'?'<section class="game-passes"><h2>Game passes</h2><p class="muted">Game passes are not connected to the live catalog yet.</p></section>':'<section class="game-about"><h2>About this game</h2><p>'+esc(game.title)+' · '+esc(info.mode)+' · '+esc(info.mood)+'</p><p class="fine-print">Game information is supplied by the catalog. Live server browsing and launcher joining are not connected.</p></section>'}`;
}
function auth() {
  const signup=route==='signup', granted=signup&&inviteGate.hasAccess();
  const inviteForm=`<div class="invite-lock">${icon('achievement',19)}<span>INVITATION REQUIRED</span></div><p class="invite-intro">Metallic is in closed beta. Enter your invite code to unlock the signup preview.</p><form id="invite-form"><div class="field"><label for="invite-code">Invite code</label><input id="invite-code" name="invite" required minlength="8" maxlength="64" placeholder="Enter your invite code" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="invite-help invite-error"><small id="invite-help">Use the code provided by the Metallic team.</small></div><p id="invite-error" class="invite-error" role="alert"></p><button class="button primary full" type="submit" ${inviteBusy?'disabled':''}>${inviteBusy?'Verifying…':'Verify invite '+icon('arrow',17)}</button></form><p class="invite-no-code">No code yet? Registration is invite-only while we build the platform. New access details will be shared as the beta progresses.</p>`;
  const accountForm=`${granted?'<div class="invite-verified">'+icon('check',17)+' Invite verified for this visit</div>':''}<form id="auth-form">${signup?`<div class="field"><label for="auth-username">Username</label><input id="auth-username" name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="Choose your username" aria-describedby="username-help"><small id="username-help">3–20 letters, numbers, or underscores.</small></div>`:''}<div class="field"><label for="auth-email">Email address</label><input id="auth-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div><div class="field"><label for="password">Password</label><div class="password-field"><input name="password" id="password" type="password" required minlength="8" autocomplete="${signup?'new-password':'current-password'}" placeholder="At least 8 characters" aria-describedby="password-help">${button('password','Show','password-toggle','aria-label="Show password" aria-pressed="false"')}</div><small id="password-help">${signup?'Use a sample password for this preview.':'Sign in with your invited beta tester account.'}</small></div>${!signup?button('recovery','Forgot your password?','text-button recovery-link'):''}<div class="form-notice">${signup?'Signup preview only. This does not create an account or grant platform access. Your email and password are never saved or sent.':betaSession.configured?'Platform access requires an active beta tester account.':'Tester sign-in is not connected yet. Platform access remains locked.'}</div><p id="auth-error" class="invite-error" role="alert"></p><button class="button primary full" type="submit" ${!signup&&(!betaSession.configured||loginBusy)?'disabled':''}>${signup?'Preview invited signup':loginBusy?'Signing in…':'Log in'} ${icon('arrow',17)}</button></form>`;
  return `<div class="auth-layout"><div class="auth-story"><span class="eyebrow">METALLIC · CLOSED BETA</span><h2>Play games.<br>Build what you want.</h2><img src="art/game-5.svg" alt="A Metallic game in development" width="640" height="480"><p>A platform for people who play games and people who make them. Currently in closed beta.</p></div><section class="auth-card"><span class="brand-glyph">M</span><h1>${signup?'Redeem your invite':'Log in to Metallic'}</h1>${signup&&!granted?inviteForm:accountForm}<p class="tester-access-note">The platform is available only to signed-in beta testers.</p><p class="auth-switch">${signup?'Already have an account? '+link('login','Log in','text-link'):'Have an invite code? '+link('signup','Redeem it','text-link')}</p></section></div>`;
}
function download() { return `${pageHead('The adventure starts here.','Your home for every Metallic game.')}<section class="download-hero"><div><span class="eyebrow">METALLIC LAUNCHER</span><h2>Less waiting.<br>More playing.</h2><p>One home for your games, your friends, and whatever you discover next.</p><div class="categories">${['Windows','macOS','Linux'].map(p=>button('platform',p,`cat ${platform===p?'selected':''}`,`data-value="${p}" aria-pressed="${platform===p}"`)).join('')}</div><button class="button primary download-button" disabled>${icon('download')} ${platform} release coming soon</button><p class="fine-print">The launcher is in development. An installer will appear here when an official release is available.</p></div><div class="launcher-mock"><div class="window-dots"><i></i><i></i><i></i><span>Metallic Launcher · Preview</span></div><img src="art/game-1.svg" alt="Launcher game preview"><div><strong>Your next adventure</strong><span>Cyber Raven: Neon Protocol</span><span class="launch-preview">${icon('play',15)} Jump in</span></div></div></section><div class="feature-columns download-features"><article><span class="step">01</span><h3>Get the launcher</h3><p>Download the official installer for your device when it becomes available.</p></article><article><span class="step">02</span><h3>Make yourself at home</h3><p>Sign in with your Metallic account and bring your identity with you.</p></article><article><span class="step">03</span><h3>Find your next favorite</h3><p>Explore games and jump into something new.</p></article></div><div class="panel"><h3>${platform} availability</h3><p class="muted">Release date, supported ${platform} versions, and system requirements will be confirmed with the first official launcher build.</p></div>`; }
function wardrobe() {
  return `${pageHead('Wardrobe','Avatar customization is still in development.')}<section class="wardrobe-wip"><span class="wip-symbol">${icon('wardrobe',48)}</span><h2>Work in progress</h2><p>Nothing to see here yet.</p>${link('home','Back to Home '+icon('arrow',16),'button')}</section>`;
}
function create(){return creatorWorkspace.createPage();}
const packs = [{amount:400,price:'$4.99'},{amount:800,price:'$9.99'},{amount:1700,price:'$19.99'},{amount:4500,price:'$49.99'}];
function alloy() { return `${pageHead('Buy Alloy','More ways to make Metallic your own.')}<section class="alloy-intro"><div class="alloy-coin">${icon('alloy',72)}</div><div><span class="eyebrow">MAKE MORE OF METALLIC</span><h2>Put your own spin on play.</h2><p>Personalize your avatar and discover more ways to express yourself.</p></div><div class="balance"><span>Preview balance</span><strong>${icon('alloy',24)} ${state.previewAlloy.toLocaleString()}</strong></div></section><div class="notice"><span>${icon('alloy')}<span><strong>Store preview</strong><small>Illustrative packs and prices. Purchases are not available and no payment is collected.</small></span></span></div><div class="alloy-packs">${packs.map((p,i)=>`<article class="alloy-pack ${i===2?'featured':''}">${i===2?'<span class="pack-ribbon">A little extra possibility</span>':''}${icon('alloy',44)}<h2>${p.amount.toLocaleString()}</h2><p>Alloy</p><strong class="pack-price">${p.price} <small>USD</small></strong>${button('review-pack','Preview pack','button '+(i===2?'primary':''),`data-index="${i}"`)}</article>`).join('')}</div><section class="faq"><h2>Good to know</h2><details><summary>What is Alloy?</summary><p>Alloy is the planned virtual currency for Metallic, designed for avatar items and in-game content.</p></details><details><summary>Can I buy Alloy now?</summary><p>Not yet. This is a store preview. Payment processing, final pricing, and purchase terms will be added before the store launches.</p></details><details><summary>Will my preview balance be saved?</summary><p>The displayed ${state.previewAlloy.toLocaleString()} Alloy is sample content. It is not a real wallet or a transferable balance.</p></details></section>`; }
function profile() {
  const requested=params.get('user'), own=!requested||requested===state.profile.name;
  const person=own?null:community.find(p=>p.name===requested)||(state.friends.includes(requested)?personInfo(requested):null);
  if(!own&&!person)return notFound();
  const name=own?state.profile.name:requested, friends=own?state.friends:[...new Set([...(connections[name]||[]),...(state.friends.includes(name)?[state.profile.name]:[])])], mutual=own?[]:mutualFriends(state,name);
  const viewAs=own&&['friend','others'].includes(params.get('viewAs'))?params.get('viewAs'):'',access=profilePermissions(state,name,viewAs);
  const preview=own?`<div class="profile-preview-bar"><div><label for="profile-audience">View profile as</label><select id="profile-audience"><option value="" ${!viewAs?'selected':''}>Myself</option><option value="friend" ${viewAs==='friend'?'selected':''}>A friend</option><option value="others" ${viewAs==='others'?'selected':''}>Other players</option></select></div><p>${viewAs?'Previewing your saved privacy settings.':'Only you can see this control.'}</p></div>`:'';
  if(!access.profile)return preview+pageHead(esc(name),'This profile is private.')+link('settings?section=privacy','Privacy settings','button');
  const favorites=games.filter(game=>(own?state.favorites:(sampleFavorites[name]||[])).includes(game.id));
  const publishedCreations=games.filter(game=>{const owner=ownerForGame(game.id);return owner.type==='user'&&owner.id===name;});
  const favoritePage=pageWindow(favorites,params.get('favoritePage'));
  const profileActivity=!own&&presenceFor(state,name).key==='playing'?friendActivity(state,name):null;
  const profileJoin=profileActivity?.access.allowed?button('join-friend',icon('play',18)+' Join game','button play-button',`data-name="${esc(name)}"`):'';
  const friendAction=state.friends.includes(name)?button('remove-friend','Friends '+icon('check',16),'button',`data-name="${esc(name)}"`):state.requests.includes(name)?button('accept-friend','Accept request','button primary',`data-name="${esc(name)}"`):state.outgoing.includes(name)?button('cancel-friend','Cancel request','button',`data-name="${esc(name)}"`):button('add-friend','Add friend','button primary',`data-name="${esc(name)}"`);
  return `${preview}<section class="profile-cover"><div class="cover-mark">M</div><span class="eyebrow">${own?'YOUR CORNER OF METALLIC':'PLAYER PROFILE'}</span></section>
    <section class="profile-header">${own?avatar(0,'profile-avatar'):referenceAvatar(person.avatar,'profile-avatar')}<div><h1>${accountName(name)}</h1><p>@${esc(name)} <span class="profile-online">${activityText(name)}</span></p>
    ${!own&&access.friends?`<a class="mutual-summary" href="#/profile?user=${encodeURIComponent(name)}&friends=mutual"><span>${mutual.length} mutual friend${mutual.length===1?'':'s'}</span></a>`:''}</div><div class="profile-header-action">${own?link('settings?section=account','Edit profile','button'):friendAction}${profileJoin}</div></section>
    <div class="account-profile-layout"><div class="profile-main-column">
    ${access.friends?profileFriends(friends,own,mutual,params.get('friends')==='mutual',!!viewAs):privateProfileSection('Friends list')}
    ${access.favorites?`<section class="profile-section"><div class="section-top"><h2>Favorite games <span class="muted">(${favorites.length})</span></h2>${own?link('explore','Find more →','view-all'):''}</div>${favorites.length?`<div class="game-grid profile-games">${favoritePage.items.map(card).join('')}</div>`:'<div class="inline-empty">No favorite games yet.'+(own?' '+link('explore','Find your next favorite →','text-link'):'')+'</div>'}${pageLinks(favoritePage,'favorite games','favoritePage')}</section>`:privateProfileSection('Favorite games')}
    <section class="profile-section"><div class="section-top"><h2>Creations <span class="muted">(${publishedCreations.length})</span></h2>${own?link('create','Creator hub →','view-all'):''}</div>${publishedCreations.length?`<div class="game-grid profile-games">${publishedCreations.map(card).join('')}</div>`:'<div class="inline-empty">No published games yet.'+(own?' '+link('create?tab=templates','Choose a template →','text-link'):'')+'</div>'}</section>
    ${access.groups?profileGroups(name,own&&!viewAs):privateProfileSection('Groups')}
    ${access.achievements?profileAchievements(name,access.playtime,viewAs):privateProfileSection('Achievements')}
    </div><aside class="profile-meta-column"><section class="panel profile-about"><h3>About</h3><p>${esc(own?state.profile.bio:person.bio)||'No bio yet.'}</p><span class="tag">${own?'Your profile':'Sample player'}</span>${profileYoutube(own,person)}${access.playtime?profilePlaytime(name):'<div class="profile-playtime profile-private-inline">Playtime is private.</div>'}${own?link('wardrobe','Wardrobe · Work in progress','button full'):''}</section></aside></div>`;
}
function privateProfileSection(label){return `<section class="profile-section profile-private"><h2>${icon('lock',16)}${label}</h2><p>This information is private.</p></section>`;}
function progressAccess(name){return profilePermissions(state,name,params.get('viewAs'));}
function profileAchievements(name,showPlaytime=true,viewAs='') {
  const records=playedGames(games,name,state.profile.name).sort((a,b)=>showPlaytime?b.minutesPlayed-a.minutesPlayed:a.game.title.localeCompare(b.game.title)),totals=progressTotals(records),page=pageWindow(records,params.get('achievementPage'),6);
  return `<section class="profile-section profile-achievements"><div class="section-top"><h2>Achievements</h2><span class="muted small-text">Sample progress</span></div>${records.length?`<p class="achievement-overview">${totals.unlocked} of ${totals.total} unlocked across ${totals.games} games</p><div class="achievement-game-grid">${page.items.map(record=>`<a class="achievement-game-card" href="#/game/${record.game.id}?tab=achievements${name===state.profile.name?'':'&user='+encodeURIComponent(name)}${viewAs?'&viewAs='+viewAs:''}"><img src="${record.game.art}" alt="" loading="lazy" width="80" height="80"><div><h3>${esc(record.game.title)}</h3><span class="achievement-count">${record.unlocked} / ${record.total} unlocked</span><progress value="${record.unlocked}" max="${record.total}" aria-label="${esc(record.game.title)}: ${record.unlocked} of ${record.total} achievements unlocked"></progress>${showPlaytime?`<span class="achievement-playtime">${icon('clock',12)} ${formatPlaytime(record.minutesPlayed)} played</span>`:''}</div></a>`).join('')}</div>`:'<div class="inline-empty">No game progress to show yet.</div>'}${pageLinks(page,'achievement games','achievementPage')}</section>`;
}
function profilePlaytime(name) {
  const totals=progressTotals(playedGames(games,name,state.profile.name));
  return `<div class="profile-playtime"><span>Total playtime</span><strong>${formatPlaytime(totals.minutesPlayed)}</strong><small>${totals.games} games · Sample gameplay stats</small></div>`;
}
function gameProgressSummary(game,name) {
  const access=progressAccess(name),progress=playerGameProgress(game,name,state.profile.name),viewAs=name===state.profile.name&&['friend','others'].includes(params.get('viewAs'))?params.get('viewAs'):'';
  return `<div class="game-progress-summary"><div><span>${name===state.profile.name?'Your':esc(name)+"’s"} playtime</span><strong>${access.playtime?formatPlaytime(progress.minutesPlayed):'Private'}</strong></div>${access.achievements?`<a href="#/game/${game.id}?tab=achievements${name===state.profile.name?'':'&user='+encodeURIComponent(name)}${viewAs?'&viewAs='+viewAs:''}"><span>Achievements</span><strong>${progress.unlocked} / ${progress.total} unlocked</strong></a>`:'<div><span>Achievements</span><strong>Private</strong></div>'}</div>`;
}
function gameAchievementDetails(game,name) {
  const access=progressAccess(name);
  if(!access.achievements)return privateProfileSection('Achievements');
  const progress=playerGameProgress(game,name,state.profile.name);
  return `<section class="game-achievements"><div class="section-top"><div><h2>Achievements</h2><p class="section-sub">${name===state.profile.name?'Your progress':esc(name)+"’s progress"}${access.playtime?' · '+formatPlaytime(progress.minutesPlayed)+' played':''}</p></div><strong>${progress.unlocked} / ${progress.total} unlocked</strong></div><progress value="${progress.unlocked}" max="${progress.total}" aria-label="${progress.unlocked} of ${progress.total} achievements unlocked"></progress><div class="game-achievement-list">${progress.achievements.map(item=>`<article class="achievement-item ${item.unlocked?'unlocked':'locked'}"><span class="achievement-symbol">${icon(item.unlocked?'check':'lock',22)}</span><div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p></div><span class="achievement-state">${item.unlocked?'Unlocked':'Locked'}</span></article>`).join('')}</div></section>`;
}
function profileGroups(name,own) {
  const groups=groupsForProfile(state,name), groupPage=pageWindow(groups,params.get('profileGroupPage'));
  return `<section class="profile-section profile-groups"><div class="section-top"><h2>Groups <span class="muted">(${groups.length})</span></h2>${own?link('groups','Discover groups →','view-all'):''}</div>${groups.length?`<div class="profile-group-grid">${groupPage.items.map(group=>`<a class="profile-group-card" href="#/groups/${group.id}"><span class="profile-group-emblem">${groupEmblem(group)}${group.owned?`<span class="group-owner-icon" aria-label="Group owner" title="Group owner">${icon('crown',15)}</span>`:''}</span><span class="profile-group-info"><strong>${esc(group.name)}</strong><small class="profile-group-role">${esc(group.role)}</small></span>${icon('arrow',15)}</a>`).join('')}</div>`:'<div class="inline-empty">'+(own?'You haven’t joined a group yet. '+link('groups','Find your community →','text-link'):'No groups to show yet.')+'</div>'}${pageLinks(groupPage,'profile groups','profileGroupPage')}</section>`;
}
function settings() {
  const section=Object.hasOwn(settingsSections,params.get('section'))?params.get('section'):'account';
  const sectionIcons={account:'profile',connections:'connections',themes:'themes',notifications:'bell',discovery:'explore',security:'lock'};
  let content='';
  if(section==='themes')content=themesPage(appearance);
  if(section==='connections')content=settingsForm(section,accountLinks.fields());
  if(section==='account')content=settingsForm(section,`<label for="setting-name">Username</label><input id="setting-name" name="name" aria-label="Username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" value="${esc(state.profile.name)}"><small class="field-hint">3–20 letters, numbers, or underscores.</small><label for="setting-bio">Bio</label><textarea id="setting-bio" name="bio" maxlength="240" rows="4">${esc(state.profile.bio)}</textarea><small class="field-hint">A little about you, in 240 characters or less.</small>${link('settings?section=connections','Manage linked accounts →','text-link')}<div class="account-readonly"><span>Sign-in email</span><strong>Available with live accounts</strong></div>`);
  if(section==='privacy')content=settingsForm(section,`<label for="setting-visibility">Who can view my profile?</label><select id="setting-visibility" name="visibility">${['Everyone','Friends only','Only me'].map(v=>`<option ${state.profile.visibility===v?'selected':''}>${v}</option>`).join('')}</select>${privacyFormFields(state.privacy)}<h3>Interactions</h3><label for="setting-friend-policy">Who can send me friend requests?</label><select id="setting-friend-policy" name="friendPolicy">${['Everyone','Friends of friends','Nobody'].map(v=>`<option ${state.friendPolicy===v?'selected':''}>${v}</option>`).join('')}</select><label for="setting-join-policy">Who can join me in games?</label><select id="setting-join-policy" name="joinPolicy">${['Everyone','Friends','Nobody'].map(value=>`<option ${state.joinPolicy===value?'selected':''}>${value}</option>`).join('')}</select><label class="toggle-row"><span><strong>Show my activity</strong><small>Let friends see what I’m playing.</small></span><input type="checkbox" name="activity" role="switch" ${state.activity?'checked':''}></label><p class="fine-print">Preferences are saved in this browser. Live account privacy is not connected yet. ${link('profile?viewAs=others','Preview my profile →','text-link')}</p>`);
  if(section==='notifications')content=settingsForm(section,`<label class="toggle-row"><span><strong>Friend requests</strong><small>See incoming friend requests in your inbox.</small></span><input name="notifications" type="checkbox" role="switch" ${state.notifications?'checked':''}></label><label class="toggle-row"><span><strong>Platform updates</strong><small>See welcome messages and platform announcements.</small></span><input name="updates" type="checkbox" role="switch" ${state.updateNotifications?'checked':''}></label><div class="settings-info">${icon('bell',20)}<p>Notifications open from the bell in the top right. These preferences control your preview inbox.</p></div>`);
  if(section==='discovery')content=settingsForm(section,`<fieldset class="genre-preferences"><legend>What do you like to play?</legend><p>Pick a few genres. Your favorites also help shape your recommendations.</p><div>${genres.map(genre=>`<label><input name="genres" type="checkbox" value="${genre}" ${state.preferredGenres.includes(genre)?'checked':''}><span>${genre}</span></label>`).join('')}</div></fieldset><div class="settings-info">${icon('explore',20)}<p>${state.hiddenGames.length} hidden games. Hidden games stay out of your recommendations.</p></div>${state.hiddenGames.length?button('reset-hidden','Restore hidden games','button small'):''}`);
  if(section==='security')content=`<section class="panel security-section"><h2>Security</h2><p class="settings-description">Your account access, in one place.</p><div class="security-row"><span>${icon('settings',22)}<span><strong>Password</strong><small>Live account authentication is not connected.</small></span></span><button class="button small" disabled>Change password</button></div><div class="security-row"><span>${icon('check',22)}<span><strong>Two-step verification</strong><small>Available when live accounts launch.</small></span></span><span class="tag">Coming later</span></div><div class="security-row"><span>${icon('profile',22)}<span><strong>Active sessions</strong><small>This preview does not create an authenticated session.</small></span></span></div></section>`;
  if(section==='data')content=`<section class="panel"><h2>Preview data</h2><p class="settings-description">Your preview stays in this browser.</p><div class="data-summary"><div><strong>${state.favorites.length}</strong><span>Favorite games</span></div><div><strong>${state.creatorAssets.length}</strong><span>Local assets</span></div><div><strong>${state.friends.length}</strong><span>Friends</span></div></div><p class="muted small-text">Profile details, game preferences, saved looks, and imported assets are stored locally. Emails and passwords are never stored.</p><div class="reset-panel"><div><h3>Reset preview</h3><p class="muted">Restore the sample data and remove your local changes.</p></div>${button('reset-demo','Reset preview','button danger')}</div></section>`;
  return `${pageHead('Settings','Your account. Your preferences.')}<div class="settings-layout"><nav class="settings-nav" aria-label="Settings sections">${Object.entries(settingsSections).map(([id,[label]])=>`<a href="#/settings?section=${id}" class="${section===id?'active':''}" ${section===id?'aria-current="page"':''}>${icon(sectionIcons[id]||'settings',18)}${label}</a>`).join('')}</nav><div class="settings-section-content">${content}</div></div>`;
}
function friends() {
  const query=params.get('person')||'';
  const list=friendTab==='Requests'?state.requests:friendTab==='Sent'?state.outgoing:friendTab==='Find people'?community.map(p=>p.name).filter(n=>n!==state.profile.name&&!state.friends.includes(n)&&!state.requests.includes(n)):state.friends;
  const shown=list.filter(name=>name.toLowerCase().includes(query.trim().toLowerCase()));
  const friendPage=pageWindow(shown,params.get('page'));
  const online=state.friends.filter(name=>presenceFor(state,name).key!=='offline').length;
  return `${pageHead('Friends',`${state.friends.length} friends · ${online} online`,link('friends?tab=find',icon('create',17)+' Add friends','button primary'))}
    <div class="friends-toolbar"><div class="line-tabs" role="group" aria-label="Friends categories">${Object.entries(friendTabs).map(([key,label])=>button('friend-tab',label+(['Requests','Sent'].includes(label)?` <span>${label==='Requests'?state.requests.length:state.outgoing.length}</span>`:''),friendTab===label?'selected':'',`data-value="${key}" aria-pressed="${friendTab===label}"`)).join('')}</div>
    <form id="friend-search" class="top-search">${icon('search',17)}<input type="search" maxlength="160" name="person" aria-label="Search people" placeholder="Search people" value="${esc(query)}"><button class="search-submit" type="submit" aria-label="Find people by name">${icon('arrow',16)}</button></form></div>
    <p class="result-count" role="status">${shown.length} ${friendTab==='Requests'?'pending request'+(shown.length===1?'':'s'):friendTab==='Sent'?'sent request'+(shown.length===1?'':'s'):friendTab==='Find people'?'people to discover':'friend'+(shown.length===1?'':'s')}${query?' matching “'+esc(query)+'”':''}</p>
    <div class="friend-grid">${friendPage.items.map(name=>{const p=personInfo(name);const sent=state.outgoing.includes(name);return `<article class="panel friend-card"><a class="friend-card-identity" href="#/profile?user=${encodeURIComponent(name)}"><span class="friend-picture">${referenceAvatar(p.avatar)}${presenceDot(name)}</span><h3>${accountName(name)}</h3></a><p class="muted">${friendTab==='Requests'?'Wants to connect':friendTab==='Sent'||sent?'Request pending':activityText(name)}</p><div class="button-row">
      ${friendTab==='Requests'?button('accept-friend','Accept','button primary small',`data-name="${esc(name)}"`)+button('decline-friend','Ignore','button small',`data-name="${esc(name)}"`):friendTab==='Sent'||sent?button('cancel-friend','Cancel request','button small',`data-name="${esc(name)}"`):friendTab==='Find people'?button('add-friend',icon('create',14)+' Add friend','button primary small',`data-name="${esc(name)}"`):link('profile?user='+encodeURIComponent(name),'View profile','button small')+button('remove-friend','Remove','button quiet small',`data-name="${esc(name)}"`)}</div></article>`;}).join('')}</div>
    ${pageLinks(friendPage,'friends')}
    ${!shown.length?empty(query?'No people found':friendTab==='Requests'?'All caught up':friendTab==='Sent'?'No pending requests':'Find your people',query?'Try a different name.':friendTab==='Requests'?'New friend requests will appear here.':'Discover someone new to explore with.',query?button('clear-people','Clear search','button primary'):link('friends?tab=find','Find people')):''}
    <p class="fine-print">Preview community. Friend requests stay in this browser and are not sent to real people.</p>`;
}
function notFound() { return `${pageHead('Page not found','This world is still uncharted.')}${empty('Let’s get you back to exploring.','The page you’re looking for doesn’t exist.',link('home','Back to Home'))}`; }
function notificationItems() {
  return [
    ...groupNewsNotifications(state),
    ...(state.notifications?state.requests.map(name=>({id:'request-'+name,title:`${name} sent you a friend request`,description:'Find your next adventure together.',to:'friends?tab=requests',name})):[]),
    ...(state.updateNotifications?[{id:'welcome',title:'Welcome to Metallic',description:'Your friends, games, and creations in one place.',to:'home'}]:[]),
  ];
}
function updateNotificationPopover(open=notificationsOpen) {
  const popover=document.querySelector('#notification-popover');if(!popover)return;
  notificationsOpen=open;popover.hidden=!open;
  const toggle=document.querySelector('#notification-toggle');toggle?.setAttribute('aria-expanded',String(open));
  const allItems=notificationItems(), items=allItems.slice(0,20), unread=allItems.filter(item=>!state.readNotifications.includes(item.id)).length;
  toggle?.querySelector('.notification-dot')?.remove();
  if(unread)toggle?.insertAdjacentHTML('beforeend','<span class="notification-dot"></span>');
  popover.innerHTML=`<div class="notification-popover-head"><div><h2>Notifications</h2><span>${unread} unread</span></div>${button('close-notifications',icon('close',17),'plain-icon','aria-label="Close notifications"')}</div>
    ${items.length?`<div class="notification-list">${items.map(item=>`<a class="notification-entry ${state.readNotifications.includes(item.id)?'read':''}" href="#/${item.to}" data-action="read-notification" data-id="${item.id}">${item.name?referenceAvatar(personInfo(item.name).avatar):`<span class="notification-symbol">${icon('bell',19)}</span>`}<span><strong>${esc(item.title)}</strong><small>${esc(item.description)}</small></span>${!state.readNotifications.includes(item.id)?'<i></i>':''}</a>`).join('')}</div>`:'<div class="notification-empty">'+icon('bell',30)+'<h3>You’re all caught up</h3><p>Your notifications will appear here.</p></div>'}
    ${allItems.length>20?link('friends?tab=requests','View all friend requests →','notification-more'):''}<div class="notification-popover-footer">${button('read-all-notifications','Mark all as read','text-button',unread?'':'disabled')}${link('settings?section=notifications','Preferences','text-link')}</div>`;
}
function profileFriends(names, owner, mutual=[], mutualOnly=false, preview=false) {
  const displayed=mutualOnly?mutual:names, friendPage=pageWindow(displayed,params.get('friendPage'));
  return `<section class="profile-section profile-friends"><div class="section-top"><h2>Friends <span class="muted">(${names.length})</span></h2>${owner&&!preview?link('friends','See all →','view-all'):''}</div>
    ${!owner?`<div class="profile-friend-filters">${link('profile?user='+encodeURIComponent(params.get('user')||state.profile.name),'All friends',!mutualOnly?'selected':'')}${link('profile?user='+encodeURIComponent(params.get('user')||state.profile.name)+'&friends=mutual',`Mutual friends (${mutual.length})`,mutualOnly?'selected':'')}</div>`:''}
    ${displayed.length?`<div class="friends-list">${friendPage.items.map(name=>{const info=name===state.profile.name?{name,activity:state.activity?'Online':'Offline',avatar:0}:personInfo(name);return `<a class="friend" href="#/profile?user=${encodeURIComponent(name)}"><span class="friend-picture">${info.avatar===0?avatar():referenceAvatar(info.avatar)}${presenceDot(name)}</span><span class="friend-name">${accountName(name)}</span><span class="friend-activity">${mutual.includes(name)?'Mutual friend':activityText(name)}</span></a>`;}).join('')}</div>`:`<div class="inline-empty">${mutualOnly?'You don’t share any friends yet.':'No friends to show yet.'}${owner&&!preview?' '+link('friends?tab=find','Find people →','text-link'):''}</div>`}${pageLinks(friendPage,'profile friends','friendPage')}</section>`;
}
function settingsForm(section,fields) {
  return `<form id="settings-form" class="settings-form section-settings-form" data-section="${section}"><section class="panel"><h2>${settingsSections[section][0]}</h2><p class="settings-description">${settingsSections[section][1]}</p>${fields}</section><div class="settings-save"><span class="muted small-text">Saved to this browser</span><button type="submit" class="button primary">${icon('check',17)} Save changes</button></div></form>`;
}
function marketplace(){return creatorWorkspace.marketplacePage();}
function preferenceEditor() {
  modal('Make discovery yours',`<p class="muted">Choose the genres you enjoy. Your favorite games help us find more, too.</p><form id="preference-form"><fieldset class="genre-preferences"><legend>Your favorite genres</legend><div>${genres.map(genre=>`<label><input type="checkbox" name="genres" value="${genre}" ${state.preferredGenres.includes(genre)?'checked':''}><span>${genre}</span></label>`).join('')}</div></fieldset><p class="fine-print">Preferences are saved in this browser.</p><button type="submit" class="button primary full">Save preferences</button></form>`);
}
function accountName(name){return `<span class="account-name"><span class="account-name-text">${esc(name)}</span>${name===state.profile.name?'':accountBadges(personInfo(name))}</span>`;}
function profileYoutube(own,person){
  const url=own?normalizeYoutubeUrl(state.profile.youtubeUrl):person?.youtube?.linked&&person.youtube.ownershipVerified?'https://www.youtube.com/channel/'+person.youtube.channelId:'';
  return url?`<p class="account-roles-note"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">YouTube ${icon('arrow',12)}</a>${!own?' · Sample linked channel':''}</p>`:'';
}
function creatorLink(gameId) {
  const owner=ownerForGame(gameId);
  return link(owner.type==='group'?'groups/'+owner.id:'profile?user='+encodeURIComponent(owner.id),owner.type==='user'?accountName(owner.name):esc(owner.name),'creator-owner-link');
}
function playerPreview(name,serverId,index) {
  const tooltip='player-'+serverId+'-'+index;
  return `<a class="server-player" href="#/profile?user=${encodeURIComponent(name)}" aria-label="${esc(name)}" aria-describedby="${tooltip}" title="${esc(name)}">${name===state.profile.name?avatar():referenceAvatar(personInfo(name).avatar)}<span class="player-tooltip" id="${tooltip}" role="tooltip">${accountName(name)}</span></a>`;
}
function serverCard(server) {
  const access=serverAccess(server,state);
  return `<article class="server-card"><div class="server-card-header"><div><h3>${esc(server.name)}</h3><p><span class="server-state ${server.active?'active':''}"></span>${server.mine?'Your preview reservation':server.region} <span>· ${server.players.length}/${server.capacity} players</span></p></div><span class="tag">${server.visibility==='private'?'Invite only':'Public'}</span></div>
    <div class="server-card-content"><div class="server-player-list">${server.players.length?server.players.map((name,index)=>playerPreview(name,server.id,index)).join(''):'<span class="server-empty-players">Ready for your next gathering.</span>'}</div><div class="server-card-actions">${server.mine?button('manage-server','Configure','button small',`data-id="${server.id}"`):''}${button('join-server',access.allowed?(server.mine?'Preview join':'Join server'):access.reason,`button ${access.allowed?'primary':''} small`,`data-id="${server.id}" data-game="${server.gameId}" ${access.allowed?'':'disabled'}`)}</div></div>
    ${server.mine?`<p class="server-access-note">${server.visibility==='public'?'Anyone can join when the server is running.':server.allowFriends?'Your friends and invited players can join.':server.invited.length+' invited player'+(server.invited.length===1?'':'s')+' · Only you and invited players can join.'} This reservation is a local preview.</p>`:''}</article>`;
}
function gameFriends(gameId) {
  const playing=friendsPlaying(state,gameId), servers=sampleServers(gameId);
  return `<section class="game-friends-section"><div class="section-top"><h2>Friends playing <span class="muted">(${playing.length})</span></h2>${link('friends','All friends →','view-all')}</div>${playing.length?`<div class="playing-friends-grid">${playing.map(session=>{const access=friendJoinAccess(state,session,servers.find(server=>server.id===session.serverId));return `<article class="playing-friend"><a href="#/profile?user=${encodeURIComponent(session.name)}">${referenceAvatar(personInfo(session.name).avatar)}<span><strong>${accountName(session.name)}</strong><small>${session.joinsEnabled?'In a public server':'Joins are turned off'}</small></span></a>${button('join-friend',access.allowed?'Join friend':access.reason,`button ${access.allowed?'primary':''} small`,`data-name="${session.name}" ${access.allowed?'':'disabled'}`)}</article>`;}).join('')}</div>`:'<div class="inline-empty">None of your friends are playing this game right now.</div>'}</section>`;
}
function serverEditor(gameId,existing) {
  const game=games.find(game=>game.id===(existing?.gameId||gameId));if(!game)return;
  const affordable=state.previewAlloy>=SERVER_PRICE;
  modal(existing?'Configure your server':'Create private server',`<p class="muted">${esc(game.title)}</p><form id="server-form" data-game="${game.id}" data-id="${existing?.id||crypto.randomUUID()}" data-editing="${existing?'1':'0'}"><label for="server-name">Server name</label><input id="server-name" name="name" required maxlength="40" placeholder="Your gathering place" value="${esc(existing?.name||'')}"><fieldset class="server-visibility"><legend>Who can join?</legend><label><input type="radio" name="visibility" value="private" ${!existing||existing.visibility==='private'?'checked':''}><span><strong>Private</strong><small>Only you and the people you invite.</small></span></label><label><input type="radio" name="visibility" value="public" ${existing?.visibility==='public'?'checked':''}><span><strong>Public</strong><small>Anyone can find and join the server.</small></span></label></fieldset><div class="private-access-options" ${existing?.visibility==='public'?'hidden':''}><label class="checkbox-label"><input type="checkbox" name="allowFriends" ${existing?.allowFriends?'checked':''}> Allow all of my friends</label>${state.friends.length?`<fieldset class="server-invites"><legend>Invite specific friends</legend>${state.friends.map(name=>`<label><input type="checkbox" name="invited" value="${esc(name)}" ${existing?.invited.includes(name)?'checked':''}>${referenceAvatar(personInfo(name).avatar)}<span>${esc(name)}</span></label>`).join('')}</fieldset>`:''}</div>
    <div class="server-cost-summary"><span>${existing?'Configuration cost':'Creation cost'}</span><strong>${existing?'No additional Alloy':SERVER_PRICE+' Alloy'}</strong><span>Preview balance</span><strong>${state.previewAlloy.toLocaleString()} Alloy</strong></div><p class="fine-print">${existing?'Update your local reservation.':'Creation uses the demo Alloy balance only.'} No live server is started.</p><p class="form-error" id="server-form-error" role="alert"></p><button type="submit" class="button primary full" ${!existing&&!affordable?'disabled':''}>${existing?'Save server settings':'Create — '+SERVER_PRICE+' Alloy'}</button>${!existing&&!affordable?'<p class="form-error">Not enough preview Alloy. '+link('alloy','View Alloy store','text-link')+'</p>':''}</form>`);
}
function groupEmblem(group,size='') { if(group.image)return `<span class="group-emblem group-color-${group.color||'silver'} ${size}"><img src="${esc(group.image)}" alt="${esc(group.name)} group image"></span>`;return `<span class="group-emblem group-color-${group.color||'silver'} ${size}" aria-hidden="true">${esc(group.emblem||group.name[0].toUpperCase())}</span>`; }
function groupAction(group) {
  if(groupControls.editable(group))return link('groups/'+group.id+'/manage','Manage group','button');
  if(state.groupMemberships.includes(group.id))return button('leave-group',icon('check',16)+' Leave group','button',`data-id="${group.id}"`);
  if(state.groupRequests.includes(group.id))return button('cancel-group-request','Cancel request','button',`data-id="${group.id}"`);
  return button('join-group',group.joinPolicy==='approval'?'Request to join':'Join group','button primary',`data-id="${group.id}"`);
}
function groupsPage() {
  const mine=params.get('tab')==='mine', query=(params.get('q')||'').trim().toLowerCase(), category=params.get('category')||'All';
  const groups=getGroups(state).filter(group=>(!mine||group.mine||state.groupMemberships.includes(group.id)||state.groupRequests.includes(group.id))&&(!query||`${group.name} ${group.description}`.toLowerCase().includes(query))&&(category==='All'||group.category===category));
  const groupPage=pageWindow(groups,params.get('page'));
  return `${pageHead('Groups','Find your people. Build something together.',button('new-group',icon('create',17)+' Create group','button primary'))}<section class="groups-intro"><div><span class="eyebrow">A SHARED INTEREST. A SHARED WORLD.</span><h2>Good ideas grow together.</h2><p>Meet people who love what you love—or start a group and create your next game as a team.</p></div><div class="groups-intro-emblems">${getGroups(state).slice(0,3).map(group=>groupEmblem(group)).join('')}</div></section><nav class="group-browse-tabs" aria-label="Group browsing">${link('groups','Discover groups',!mine?'selected':'')}${link('groups?tab=mine','My groups',mine?'selected':'')}</nav><form id="group-search" class="group-search-form"><div class="group-search-input">${icon('search',18)}<input type="search" name="q" aria-label="Search groups" placeholder="Find a group" value="${esc(params.get('q')||'')}"></div><label>Interest<select name="category"><option value="All">All interests</option>${groupCategories.map(value=>`<option ${category===value?'selected':''}>${value}</option>`).join('')}</select></label><button type="submit" class="button">Search</button></form><div class="section-top"><h2>${mine?'Your communities':'Find a place to belong'}</h2><span class="result-count" role="status">${groups.length} group${groups.length===1?'':'s'}</span></div><div class="group-grid">${groupPage.items.map(group=>`<article class="group-card"><a href="#/groups/${group.id}" class="group-card-link">${groupEmblem(group)}<span class="group-category">${group.category}</span><h3>${esc(group.name)}</h3><p>${esc(group.description)}</p></a><div class="group-card-footer"><span>${groupMembers(group,state).length} member${groupMembers(group,state).length===1?'':'s'}</span>${link('groups/'+group.id,'View group →','text-link')}</div>${group.mine?'<span class="group-owned">Owner</span>':state.groupMemberships.includes(group.id)?'<span class="group-owned">Joined</span>':state.groupRequests.includes(group.id)?'<span class="group-owned">Request pending</span>':''}</article>`).join('')}</div>${pageLinks(groupPage,'groups')}${!groups.length?empty('Your people are out there.','Try another search, discover a group, or start your own.',button('new-group','Create a group','button primary')):''}<p class="fine-print">Sample communities and local groups. Membership changes stay in this browser.</p>`;
}
function groupPage() {
  const group=findGroup(state,route.split('/')[1]);if(!group)return notFound();
  const members=groupMembers(group,state), tab=['about','games','members','news'].includes(params.get('tab'))?params.get('tab'):'about';
  const published=games.filter(game=>group.games.includes(game.id));
  return `${link('groups','← All groups','text-link')}<section class="group-cover group-color-${group.color}"><span>GROUP · ${group.category.toUpperCase()}</span><div>${esc(group.emblem)}</div></section><header class="group-profile-header">${groupEmblem(group,'large')}<div><h1>${esc(group.name)}</h1><p>By ${link('profile?user='+encodeURIComponent(group.owner),esc(group.owner),'text-link')} <span>· ${members.length} members</span></p></div><div>${groupAction(group)}</div></header><nav class="group-detail-tabs" aria-label="Group sections">${[['about','About'],['games','Games ('+(published.length)+')'],['news','News'],['members','Members ('+members.length+')']].map(([value,label])=>link('groups/'+group.id+(value==='about'?'':'?tab='+value),label,tab===value?'selected':'')).join('')}</nav>
    ${tab==='about'?`<div class="group-about-layout"><section><div class="group-announcement"><span class="eyebrow">GROUP SHOUT</span><p>${esc(group.shout)}</p><span>From ${esc(group.shoutBy||group.owner)}</span></div><section class="panel group-description"><h2>About this group</h2><p>${esc(group.description)||'Tell your members what brings this group together.'}</p><div class="group-facts"><div><span>Interest</span><strong>${group.category}</strong></div><div><span>Membership</span><strong>${group.joinPolicy==='approval'?'Approval required':'Open to everyone'}</strong></div></div></section></section><aside class="panel group-build-together">${icon('create',30)}<h2>Create as a group</h2><p>Give your next game a home, with your group as its creator.</p>${canGroup(group,state.profile.name,'createGames')?link('create?tab=templates&group='+group.id,'Choose a game template','button primary full'):'<p class="fine-print">Your role needs permission to create group games.</p>'}</aside></div>`:''}
    ${tab==='games'?`<div class="section-top"><div><h2>Group games</h2><p class="section-sub">Worlds made by ${esc(group.name)}.</p></div>${canGroup(group,state.profile.name,'createGames')?link('create?tab=templates&group='+group.id,'Choose a template','button small'):''}</div>${published.length?`<div class="game-grid">${published.map(card).join('')}</div>`:empty('No published games yet.','Start with a local template and build your game in Studio.')}`:''}
    ${tab==='news'?groupNews.page(group):''}
    ${tab==='members'?groupMemberSections(group,state).map((section,index)=>{const page=pageWindow(section.members,params.get('rolePage-'+index));return `<section class="member-role-section"><div class="section-top"><h2>${esc(section.name)} <span class="muted">(${section.members.length})</span></h2></div><ul class="role-member-list">${page.items.map(name=>`<li><a href="#/profile?user=${encodeURIComponent(name)}">${name===state.profile.name?avatar():referenceAvatar(personInfo(name).avatar)}<span><strong>${accountName(name)}</strong><small>${activityText(name)}</small></span></a></li>`).join('')}</ul>${pageLinks(page,section.name+' members','rolePage-'+index)}</section>`;}).join(''):''}<p class="fine-print">${group.mine?'Your group is a browser-local preview. Live collaboration and publishing are not connected.':'Sample group. Joining or requesting membership does not send a message to real people.'}</p>`;
}
function groupEditor(existing) {
  modal(existing?'Manage your group':'Create a group',`<p class="muted">A place for a shared interest or your next group game.</p><form id="group-form" data-id="${existing?.id||''}"><label for="group-name">Group name</label><input id="group-name" name="name" required minlength="3" maxlength="40" value="${esc(existing?.name||'')}" placeholder="Give your community a name"><label for="group-description">Description</label><textarea id="group-description" name="description" rows="3" maxlength="500" placeholder="What brings your group together?">${esc(existing?.description||'')}</textarea><label for="group-category">Shared interest</label><select id="group-category" name="category">${groupCategories.map(category=>`<option ${existing?.category===category||!existing&&category==='Creating'?'selected':''}>${category}</option>`).join('')}</select><label for="group-membership">Membership</label><select id="group-membership" name="joinPolicy"><option value="open" ${existing?.joinPolicy!=='approval'?'selected':''}>Open — anyone can join</option><option value="approval" ${existing?.joinPolicy==='approval'?'selected':''}>Approval — request to join</option></select><p class="fine-print">Your group is saved locally. Invitations, shared editing, and publishing will connect with the live platform.</p><button type="submit" class="button primary full">${existing?'Save group':'Create group'}</button></form>`);
}
function previewServerJoin(server,friend) {
  const game=games.find(game=>game.id===server.gameId);
  modal(friend?'Join '+esc(friend):server.mine?'Preview your reservation':'Join server',`<div class="join-game-preview"><img src="${game.art}" alt=""><div><h3>${esc(game.title)}</h3><p>${esc(server.name)}</p><span class="tag">${server.players.length}/${server.capacity} players</span></div></div><p class="muted">${server.mine?'Your reservation is saved in this browser. It is not a running game server.':'This previews joining the selected session. The launcher handoff will connect when live gameplay is available.'}</p>${link('download',icon('download',17)+' View launcher availability','button primary full')}`);
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
const workspaceContext={state:()=>state,params:()=>params,route:()=>route,icon,link,button,pageHead,pageLinks,empty,notFound,modal,dialog,navigate,render,persist,toast,groupEmblem,accountName,save:()=>saveState(storage,state)};
const storefront=createStorefront({...workspaceContext,games,catalog,routeData:()=>routeData,card,friendStrip,catalogLoading,catalogError});
const gamePassUI=createGamePassUI(workspaceContext);
const creatorWorkspace=createCreatorWorkspace(workspaceContext);
const groupControls=createGroupControls(workspaceContext);
const groupNews=createGroupNewsUI(workspaceContext);
const accountLinks=createAccountLinksUI({...workspaceContext,isSettingsDirty:()=>settingsDirty},document.querySelector('meta[name="metallic-connections-api"]')?.content||'');
function render(preserveFocus=true) {
  closeFriendPreview();
  const focus=preserveFocus?focusIdentity():null;
  const editing=preserveFocus&&document.activeElement?.matches('#site-search')?{value:document.activeElement.value}:null;
  ({route,params,category,sort,friendTab}=readRoute(location.hash));
  if(requiresTester(route)&&!betaSession.hasAccess()){
    const destination=testerReturnTo(location.hash.replace(/^#/,''));
    history.replaceState(null,'','#/login?'+new URLSearchParams({returnTo:destination}));
    lastHash=location.hash;
    ({route,params,category,sort,friendTab}=readRoute(location.hash));
    settingsDirty=false;if(dialog.open)dialog.close();
  }
  ensureCatalogData();
  const pages={'':landing,home,explore,search:searchPage,login:auth,signup:auth,download,wardrobe,create,alloy,profile,settings,friends,marketplace,groups:groupsPage,docs:()=>documentationPage(route,params)};
  const page=Object.hasOwn(pages,route)?pages[route]:/^game\/[\w-]+$/.test(route)?gamePage:/^assets\/[\w-]+$/.test(route)?()=>creatorWorkspace.assetPage(route.split('/')[1]):/^groups\/[\w-]+\/manage$/.test(route)?groupControls.controlPage:route.startsWith('groups/')?groupPage:route.startsWith('docs/')?()=>documentationPage(route,params):notFound;
  const titles={'':'Closed beta',home:'Home',explore:'Explore',search:'Search',signup:'Invite access',login:'Log in',download:'Download',wardrobe:'Wardrobe',create:'Creator hub',alloy:'Buy Alloy',profile:'Profile',settings:'Settings',friends:'Friends',marketplace:'Creator Marketplace',groups:'Groups',docs:'Documentation'};
  const game=route.startsWith('game/')?catalog.peek(route.split('/')[1]):null;
  document.title=`${(route.startsWith('assets/')?assetById(state,route.split('/')[1])?.name:null) || (route.startsWith('docs/')?docArticles.find(article=>article.id===route.slice(5))?.title:null) || (route.startsWith('groups/')?findGroup(state,route.split('/')[1])?.name:null) || game?.title || (Object.hasOwn(titles,route)?titles[route]:'Page not found')} | Metallic`;
  document.body.classList.remove('nav-open');
  notificationsOpen=false;
  app.innerHTML=shell(page(),['','login','signup'].includes(route));
  syncSidebarState();
  creatorWorkspace.mountPreviews();
  accountLinks.mount();
  if(route==='settings')settingsDirty=false;
  updateShelfControls();
  if(editing&&document.querySelector('#site-search'))document.querySelector('#site-search').value=editing.value;
  restoreFocus(focus);
  if(!preserveFocus&&route.startsWith('groups/')&&params.get('tab')==='news'&&params.get('post'))document.getElementById('news-post-'+params.get('post'))?.scrollIntoView({block:'start'});
}
function navigate(destination) {
  if(location.hash==='#'+destination)render(); else location.hash=destination;
}
function setQuery(changes) {
  // The URL updates before hashchange fires; use it so rapid edits cannot lose filters.
  const current=readRoute(location.hash);
  if(!Object.keys(changes).every(key=>['page','friendPage','groupPage','memberPage','assetPage','profileGroupPage','favoritePage','creationPage','achievementPage'].includes(key)))changes={page:null,friendPage:null,groupPage:null,memberPage:null,assetPage:null,...changes};
  navigate(routeWithParams(current.route,current.params,changes));
}
function syncSidebarState() {
  const mobile=innerWidth<=820;
  document.body.classList.toggle('sidebar-collapsed',!mobile&&sidebarCollapsed);
  const toggle=document.querySelector('.sidebar-toggle');if(!toggle)return;
  const label=mobile?'Toggle navigation':sidebarCollapsed?'Expand sidebar':'Collapse sidebar';
  toggle.setAttribute('aria-label',label);toggle.title=label;
  toggle.setAttribute('aria-expanded',String(mobile?document.body.classList.contains('nav-open'):!sidebarCollapsed));
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
  clearTimeout(suggestionTimer);
  const results=document.querySelector('#search-suggestions');if(results)results.hidden=true;
  document.querySelector('#site-search')?.setAttribute('aria-expanded','false');
}
function searchPerson(person) {
  return `<a class="search-person-card" href="#/profile${person.own?'':'?user='+encodeURIComponent(person.name)}">${person.own?avatar():referenceAvatar(personInfo(person.name).avatar)}<span><strong>${accountName(person.name)}</strong><small>@${esc(person.name)}${person.own?' · You':state.friends.includes(person.name)?' · Friend':''}</small></span>${icon('arrow',16)}</a>`;
}
function searchGroup(group) {
  return `<a class="search-group-card" href="#/groups/${group.id}">${groupEmblem(group)}<span><strong>${esc(group.name)}</strong><small>${esc(group.category)} · ${groupMembers(group,state).length} member${groupMembers(group,state).length===1?'':'s'}</small></span>${icon('arrow',16)}</a>`;
}
function searchPage() {
  const query=(params.get('q')||'').slice(0,160), results=searchSite(state,query), labels={all:'All',games:'Games',people:'People',groups:'Groups'}, tab=Object.hasOwn(labels,params.get('type'))?params.get('type'):'all';
  const total=Object.values(results).reduce((sum,items)=>sum+items.length,0);
  const section=(type,renderItems)=>{
    if(!results[type].length||tab!=='all'&&tab!==type)return '';
    const page=pageWindow(results[type],tab==='all'?1:params.get('page'),tab==='all'?6:12);
    return `<section class="site-search-section"><div class="section-top"><h2>${labels[type]} <span class="muted">(${results[type].length.toLocaleString()})</span></h2>${tab==='all'&&results[type].length>6?link('search?'+new URLSearchParams({q:query,type}),'See all →','view-all'):''}</div>${renderItems(page.items)}${tab!=='all'?pageLinks(page,labels[type].toLowerCase()):''}</section>`;
  };
  return `${pageHead('Search',query?'Results for “'+esc(query)+'”':'Find games, people, and communities.')}<nav class="site-search-tabs" aria-label="Search categories">${Object.entries(labels).map(([type,label])=>link('search?'+new URLSearchParams({q:query,...(type==='all'?{}:{type})}),label+' <span>'+(type==='all'?total:results[type].length).toLocaleString()+'</span>',tab===type?'selected':'')).join('')}</nav><p class="search-result-count" role="status">${(tab==='all'?total:results[tab].length).toLocaleString()} result${(tab==='all'?total:results[tab].length)===1?'':'s'}${query?' for “'+esc(query)+'”':''}</p>${section('games',items=>`<div class="game-grid">${items.map(card).join('')}</div>`)}${section('people',items=>`<div class="search-people-grid">${items.map(searchPerson).join('')}</div>`)}${section('groups',items=>`<div class="search-groups-grid">${items.map(searchGroup).join('')}</div>`)}${!query.trim()?empty('What are you looking for?','Search for a game title, a player’s username, or a group in the top bar.'):!(tab==='all'?total:results[tab].length)?empty('No '+(tab==='all'?'results':labels[tab].toLowerCase())+' found.','Try another name or choose a different search category.'):''}`;
}
let suggestionTimer;
function suggestSearch(query) {
  closeSuggestions();
  if(query.trim().length<2){closeSuggestions();return;}
  suggestionTimer=setTimeout(()=>renderSuggestions(query.slice(0,160)),120);
}
function renderSuggestions(query) {
  const results=document.querySelector('#search-suggestions'), input=document.querySelector('#site-search');if(!results||input?.value.trim()!==query.trim()||!document.activeElement?.closest('#search-form'))return;
  if(!query.trim()){closeSuggestions();return;}
  const matches=searchSite(state,query);
  results.innerHTML=`${matches.games.length?'<span class="suggestions-label">Games</span>'+matches.games.slice(0,3).map(g=>`<a href="#/game/${g.id}"><img src="${g.art}" alt=""><span><strong>${esc(g.title)}</strong><small>${g.genre} · ${g.playing} playing</small></span>${icon('arrow',14)}</a>`).join(''):''}${matches.people.length?'<span class="suggestions-label">People</span>'+matches.people.slice(0,3).map(searchPerson).join(''):''}${matches.groups.length?'<span class="suggestions-label">Groups</span>'+matches.groups.slice(0,3).map(searchGroup).join(''):''}${!Object.values(matches).some(items=>items.length)?'<p>No matches yet. Try another name.</p>':''}<a class="all-results" href="#/search?q=${encodeURIComponent(query.trim())}">${icon('search',16)} See all results</a>`;
  results.hidden=false;document.querySelector('#site-search').setAttribute('aria-expanded','true');
}
let activeFriendTrigger=null, friendCloseTimer;
function closeFriendPreview() {
  clearTimeout(friendCloseTimer);
  document.querySelector('#friend-activity-popover')?.hidePopover();
  activeFriendTrigger?.querySelector('.activity-trigger')?.setAttribute('aria-expanded','false');
  activeFriendTrigger=null;
}
function showFriendPreview(trigger) {
  const menu=document.querySelector('#friend-activity-popover');if(!menu||!trigger)return;
  clearTimeout(friendCloseTimer);
  if(activeFriendTrigger===trigger&&menu.matches(':popover-open'))return;
  closeFriendPreview();activeFriendTrigger=trigger;
  const name=trigger.dataset.friendPreview, info=personInfo(name), activity=friendActivity(state,name);
  menu.innerHTML=`<span class="friend-popover-label">${accountName(name)} · ${activityText(name,activity?'Playing now':'')}</span>${activity?`<a class="friend-playing-game" href="#/game/${activity.game.id}"><img src="${activity.game.art}" alt=""><span><strong>${esc(activity.game.title)}</strong><small>${esc(activity.game.genre)}</small></span></a><div class="friend-popover-actions">${link('profile?user='+encodeURIComponent(name),'View profile','text-link')}${button('join-friend',activity.access.allowed?'Join':activity.access.reason,'button primary small',`data-name="${esc(name)}" ${activity.access.allowed?'':'disabled'}`)}</div>`:`<p>${info.activity==='Offline'?'This friend is offline.':'This friend isn’t playing a game right now.'}</p>${link('profile?user='+encodeURIComponent(name),'View profile →','text-link')}`}`;
  menu.setAttribute('aria-label',name+' activity');menu.showPopover();
  trigger.querySelector('.activity-trigger').setAttribute('aria-expanded','true');
  const anchor=trigger.getBoundingClientRect(), rect=menu.getBoundingClientRect();
  menu.style.left=Math.max(10,Math.min(anchor.left+anchor.width/2-rect.width/2,innerWidth-rect.width-10))+'px';
  menu.style.top=Math.max(10,Math.min(anchor.bottom+7,innerHeight-rect.height-10))+'px';
}
function scheduleFriendClose(related) {
  const menu=document.querySelector('#friend-activity-popover');
  if(related&&(activeFriendTrigger?.contains(related)||menu?.contains(related)))return;
  clearTimeout(friendCloseTimer);friendCloseTimer=setTimeout(closeFriendPreview,140);
}
const scrollPositions=new Map();
let lastHash=location.hash;
window.addEventListener('hashchange',()=>{
  if(location.hash===lastHash)return;
  const next=readRoute(location.hash), previous=readRoute(lastHash);
  if(requiresTester(previous.route)&&!betaSession.hasAccess())settingsDirty=false;
  if(settingsDirty && previous.route==='settings') {
    const destination=location.hash.slice(1);
    history.replaceState(null,'',lastHash);
    modal('Leave without saving?',`<p class="muted">Your profile changes have not been saved.</p>${button('discard-settings','Discard changes','button danger',`data-value="${esc(destination)}"`)} ${button('close-dialog','Keep editing','button')}`);
    return;
  }
  groupControls.resetImage();
  if(previous.route==='signup'&&next.route!=='signup'){inviteGate.clear();inviteBusy=false;}
  if(previous.route==='login'&&next.route!=='login'&&loginBusy){betaSession.clear();loginBusy=false;}
  const samePage=next.route===previous.route && next.params.get('user')===previous.params.get('user');
  const paging=['page','friendPage','profileGroupPage','favoritePage','creationPage','achievementPage','memberPage'].some(key=>next.params.get(key)!==previous.params.get(key));
  const previousScroll=scrollY, previousFocus=samePage?focusIdentity():null;
  scrollPositions.set(lastHash,previousScroll);lastHash=location.hash;
  if(dialog.open)dialog.close();
  render(false);
  if(paging){const target=document.querySelector('#browse-games,.site-search-section,.profile-friends,.achievement-game-grid,.marketplace-grid,.friend-grid,.group-grid,.marketplace-grid');target?.scrollIntoView({block:'start'});document.querySelector('#main').focus({preventScroll:true});}
  else window.scrollTo(0,samePage?previousScroll:(scrollPositions.get(lastHash)||0));
  if(samePage&&!paging)restoreFocus(previousFocus);else document.querySelector('#main').focus({preventScroll:true});
});
document.addEventListener('click',async e=>{
  if(e.target.closest('.skip-link')){e.preventDefault();document.querySelector('#main').focus();return;}
  if(!e.target.closest('#search-form'))closeSuggestions();
  if(!e.target.closest('[data-friend-preview],#friend-activity-popover'))closeFriendPreview();
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
  if(requiresTester(readRoute(location.hash).route)&&!betaSession.hasAccess()){render(false);return;}
  const {action,value,id,name}=el.dataset;
  if(gamePassUI.handleAction(action,el))return;
  if(await creatorWorkspace.handleAction(action,el))return;
  if(groupControls.handleAction(action,el))return;
  if(groupNews.handleAction(action,el))return;
  if(await accountLinks.handleAction(action,el))return;
  switch(action){
    case 'theme-mode':if(['dark','light','system'].includes(value))setAppearance({mode:value});break;
    case 'theme-accent':setAppearance({accent:value});break;
    case 'theme-reset':setAppearance(defaultAppearance);break;
    case 'doc-anchor':{const heading=document.getElementById(el.dataset.target)?.querySelector('h2');heading?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});heading?.focus({preventScroll:true});break;}
    case 'copy-doc-code':{const code=document.getElementById(el.dataset.target)?.textContent;if(code)try{await navigator.clipboard.writeText(code);el.textContent='Copied';toast('Code copied.');}catch{toast('Clipboard is unavailable. Select the code to copy it.');}break;}
    case 'logout':{
      clearTimeout(sessionTimer);settingsDirty=false;sessionBusy=true;
      const task=betaSession.logout();if(dialog.open)dialog.close();navigate('/login');render(false);
      const result=await task;sessionBusy=false;if(!result.ok)toast('Signed out of this view. The account service could not confirm session revocation.');break;
    }
    case 'retry-catalog':catalog.clear();routeData.key='';render();break;
    case 'remove-filter':setQuery({[el.dataset.key]:null});break;
    case 'clear-game-filters':setQuery({category:null,mode:null,mood:null,tag:null,rating:null,unplayed:null});break;
    case 'menu':if(innerWidth<=820)setMenu(!document.querySelector('#sidebar').classList.contains('open'));else{sidebarCollapsed=!sidebarCollapsed;try{storage.setItem(sidebarStorageKey,sidebarCollapsed?'1':'0');}catch{}syncSidebarState();}break;
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
    case 'scroll':{const shelf=document.getElementById(el.dataset.target);shelf.scrollBy({left:Number(el.dataset.direction)*Math.max(240,shelf.clientWidth*.8),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});break;}
    case 'dismiss-launcher':state.launcherDismissed=true;persist('Launcher notice hidden. Downloads are always in the menu.');render();break;
    case 'category':setQuery({category:value==='All'?null:value});break;
    case 'clear-search':navigate('/explore');break;
    case 'favorite':if(games.some(g=>g.id===id)){state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist(state.favorites.includes(id)?'Added to your favorites.':'Removed from favorites.');render();}break;
    case 'play':modal('Your next adventure is on its way',`<p class="muted">${esc(games.find(g=>g.id===id)?.title||el.dataset.title||'This game')} will open in the Metallic launcher when live gameplay is available.</p><p>This is a preview game. No game has been launched.</p>${link('download',icon('download',18)+' View launcher availability','button primary full')}`);break;
    case 'share':try{await navigator.clipboard.writeText(location.href);toast('Game link copied.');}catch{modal('Share this game',`<label for="share-url">Game link</label><input id="share-url" class="share-url" readonly value="${esc(location.href)}"><p class="fine-print">Copy this link. Viewers still need access to this private preview.</p>`);document.querySelector('#share-url').select();}break;
    case 'password':{const input=document.querySelector('#password');const show=input.type==='password';input.type=show?'text':'password';el.textContent=show?'Hide':'Show';el.setAttribute('aria-label',show?'Hide password':'Show password');el.setAttribute('aria-pressed',String(show));break;}
    case 'recovery':modal('Account recovery',`<p class="muted">Account recovery will be available through the beta account service. Contact the Metallic team if you need help with your tester account.</p>${link('login','Back to log in','button primary full')}`);break;
    case 'platform':platform=value;render();break;
    case 'create-server':serverEditor(id);break;
    case 'manage-server':{const server=state.reservedServers.find(server=>server.id===id);if(server)serverEditor(server.gameId,server);break;}
    case 'join-server':{
      const server=[...sampleServers(el.dataset.game),...reservedServerCards(state,el.dataset.game)].find(server=>server.id===id);
      const access=serverAccess(server,state);if(!access.allowed){toast(access.reason);break;}
      previewServerJoin(server);break;
    }
    case 'friend-preview':showFriendPreview(el.closest('[data-friend-preview]'));if(e.detail===0)document.querySelector('#friend-activity-popover a')?.focus();break;
    case 'join-friend':{
      const session=friendSessions.find(session=>session.name===name);
      const server=session?sampleServers(session.gameId).find(server=>server.id===session.serverId):null;
      const access=friendJoinAccess(state,session,server);if(!access.allowed){toast(access.reason);break;}
      closeFriendPreview();previewServerJoin(server,name);break;
    }
    case 'new-group':groupEditor();break;
    case 'join-group':case 'leave-group':case 'cancel-group-request':{
      const group=findGroup(state,id), actionName=action==='join-group'?'join':action==='leave-group'?'leave':'cancel';
      if(updateGroupMembership(state,group,actionName)){persist(actionName==='join'?(group.joinPolicy==='approval'?'Preview join request saved.':'You joined the group preview.'):actionName==='leave'?'You left the group preview.':'Preview join request canceled.');render();}break;
    }
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
    case 'reset-demo':modal('Reset this preview?',`<p class="muted">Your favorites, profile changes, imported files, and local groups will be removed.</p>${button('confirm-reset','Reset preview','button danger')} ${button('close-dialog','Keep my data','button')}`);break;
    case 'confirm-reset':try{await clearFiles();}catch{toast('Could not clear local files. Try again.');break;}state=loadState({getItem:()=>null});settingsDirty=false;persist('Preview reset.');dialog.close();render();break;
  }
});
document.addEventListener('submit',async e=>{
  const form=e.target;
  if(!['docs-search-form','invite-form','search-form','friend-search','auth-form','settings-form','creator-upload-form','group-profile-form','group-shout-form','group-role-form','group-add-member-form','group-news-form','preference-form','discovery-filter-form','game-search-form','marketplace-search','server-form','group-form','group-search'].includes(form.id)&&!form.dataset.groupMember)return;
  e.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form);
  if(form.id==='docs-search-form'){navigate('/docs'+(data.get('q').trim()?'?q='+encodeURIComponent(data.get('q').trim()):''));return;}
  if(form.id==='invite-form'){
    if(inviteBusy)return;
    inviteBusy=true;const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Verifying…';
    const result=await inviteGate.verify(data.get('invite'));
    if(route!=='signup'||!form.isConnected)return;
    inviteBusy=false;
    if(result.ok){form.reset();render();return;}
    document.querySelector('#invite-error').textContent=result.message||'Verification was cancelled. Please try again.';
    submit.disabled=false;submit.textContent='Verify invite';return;
  }
  if(form.id==='search-form'){closeSuggestions();navigate(routeWithParams('search',new URLSearchParams(),{q:data.get('q').trim()}));}
  if(form.id==='game-search-form'){setQuery({q:data.get('q').trim()||null,spotlight:null});return;}
  if(form.id==='friend-search')setQuery({person:data.get('person').trim()});
  if(form.id==='auth-form'){
    if(route==='signup'){
      if(!inviteGate.hasAccess()){toast('A verified invite is required.');render();return;}
      inviteGate.clear();form.reset();toast('Signup preview complete. An active beta tester account is still required to log in.');navigate('/login');return;
    }
    if(route!=='login'||loginBusy)return;
    loginBusy=true;const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Signing in…';
    const result=await betaSession.login(data.get('email'),data.get('password'));
    form.reset();if(!form.isConnected||route!=='login')return;
    loginBusy=false;
    if(result.ok){state.profile.name=betaSession.user().username;scheduleSessionCheck();navigate(testerReturnTo(params.get('returnTo')));return;}
    document.querySelector('#auth-error').textContent=result.message||'Unable to verify beta access. Please try again.';
    submit.disabled=!betaSession.configured;submit.textContent='Log in';return;
  }
  if(!betaSession.hasAccess()){render(false);return;}
  if(form.id==='group-news-form'){groupNews.submit(form);return;}
  if(form.id==='creator-upload-form'){await creatorWorkspace.importAsset(form);return;}
  if(['group-profile-form','group-shout-form','group-role-form','group-add-member-form'].includes(form.id)||form.dataset.groupMember){await groupControls.submit(form);return;}
  if(form.id==='settings-form'){
    const section=form.dataset.section;
    if(section==='account'){state.profile.name=data.get('name');state.profile.bio=data.get('bio').trim();}
    if(section==='connections'){const rawChannel=data.get('youtubeUrl')?.trim()||'',youtubeUrl=normalizeYoutubeUrl(rawChannel);if(rawChannel&&!youtubeUrl){toast('Enter a YouTube channel or handle URL.');return;}state.profile.youtubeUrl=youtubeUrl;}
    if(section==='privacy'){state.profile.visibility=data.get('visibility');state.privacy=privacyFromForm(data);state.friendPolicy=data.get('friendPolicy');state.joinPolicy=data.get('joinPolicy');state.activity=data.has('activity');}
    if(section==='notifications'){state.notifications=data.has('notifications');state.updateNotifications=data.has('updates');}
    if(section==='discovery')state.preferredGenres=data.getAll('genres').filter(genre=>genres.includes(genre));
    settingsDirty=false;persist('Your settings are saved.');render();
  }
  if(form.id==='preference-form'){state.preferredGenres=data.getAll('genres').filter(genre=>genres.includes(genre));persist('Discovery updated for you.');dialog.close();render();}
  if(form.id==='discovery-filter-form'){
    const changes=Object.fromEntries(['q','category','mood','mode','tag','rating'].map(key=>[key,data.get(key)==='All'?null:data.get(key)?.trim()||null]));
    changes.unplayed=data.has('unplayed')?'1':null;setQuery(changes);
  }
  if(form.id==='marketplace-search')setQuery({q:data.get('q').trim()||null,type:data.get('type')||null,price:data.get('price')||null,slot:null});
  if(form.id==='server-form'){
    const name=data.get('name').trim(), visibility=data.get('visibility');
    if(!name||name.length>40){document.querySelector('#server-name').setCustomValidity('Enter a name of 1–40 characters.');form.reportValidity();return;}
    const details={gameId:form.dataset.game,name,visibility,invited:data.getAll('invited'),allowFriends:data.has('allowFriends')};
    if(form.dataset.editing==='1'){
      const server=state.reservedServers.find(server=>server.id===form.dataset.id);
      if(!server||!['public','private'].includes(visibility))return;
      Object.assign(server,{name,visibility,invited:visibility==='private'?details.invited.filter(name=>state.friends.includes(name)):[],allowFriends:visibility==='private'&&details.allowFriends});
      persist('Server settings saved. No additional Alloy used.');
    }else{
      const result=createServerPreview(state,details,form.dataset.id);
      if(!result.ok){document.querySelector('#server-form-error').textContent=result.error;return;}
      persist(result.duplicate?'Your reservation already exists.':'Server preview created. '+SERVER_PRICE+' demo Alloy used.');
    }
    dialog.close();render();
  }
  if(form.id==='group-search')setQuery({q:data.get('q').trim()||null,category:data.get('category')==='All'?null:data.get('category')});
  if(form.id==='group-form'){
    const name=data.get('name').trim();if(name.length<3){document.querySelector('#group-name').setCustomValidity('Enter a group name of at least 3 characters.');form.reportValidity();return;}
    const existing=state.myGroups.find(group=>group.id===form.dataset.id);
    if(!existing&&state.myGroups.length>=30){toast('The preview supports up to 30 groups.');return;}
    const group={id:existing?.id||crypto.randomUUID(),name,description:data.get('description').trim(),category:data.get('category'),joinPolicy:data.get('joinPolicy')};
    if(existing)Object.assign(existing,group);else state.myGroups.push(group);
    persist(existing?'Your group is updated.':'Your group preview is ready.');dialog.close();navigate('/groups/'+group.id);
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='site-search')suggestSearch(e.target.value);
  if(['server-name','group-name'].includes(e.target.id))e.target.setCustomValidity('');
  if(e.target.closest('#settings-form')){settingsDirty=true;document.querySelector('.settings-save .muted').textContent='Unsaved changes';}
});
document.addEventListener('change',e=>{
  creatorWorkspace.change(e);groupControls.change(e);
  if(e.target.id==='theme-text-size'){setAppearance({textSize:e.target.value});return;}
  if(e.target.id==='theme-contrast'){setAppearance({contrast:e.target.checked});return;}
  if(e.target.id==='sort')setQuery({sort:e.target.value==='recommended'?null:e.target.value});
  if(e.target.id==='profile-audience'){setQuery({viewAs:e.target.value||null});return;}
  if(e.target.id==='server-sort')setQuery({serverSort:e.target.value==='available'?null:e.target.value});
  if(e.target.closest('#server-form')&&e.target.name==='visibility')document.querySelector('.private-access-options').hidden=e.target.value==='public';
  if(e.target.closest('#settings-form')){settingsDirty=true;document.querySelector('.settings-save .muted').textContent='Unsaved changes';}
});
document.addEventListener('pointerover',e=>{const trigger=e.target.closest('[data-friend-preview]');if(trigger)showFriendPreview(trigger);else if(e.target.closest('#friend-activity-popover'))clearTimeout(friendCloseTimer);});
document.addEventListener('pointerout',e=>{if(e.target.closest('[data-friend-preview],#friend-activity-popover'))scheduleFriendClose(e.relatedTarget);});
document.addEventListener('focusout',e=>{if(e.target.closest('[data-friend-preview],#friend-activity-popover'))scheduleFriendClose(e.relatedTarget);});
document.addEventListener('focusin',e=>{const trigger=e.target.closest('[data-friend-preview]');if(trigger)showFriendPreview(trigger);else if(e.target.closest('#friend-activity-popover'))clearTimeout(friendCloseTimer);else closeFriendPreview();if(e.target.id==='site-search')suggestSearch(e.target.value);if(!e.target.closest('#search-form'))closeSuggestions();if(notificationsOpen&&!e.target.closest('#notification-popover,#notification-toggle'))updateNotificationPopover(false);});
document.addEventListener('keydown',e=>{
  const inField=e.target.matches('input,textarea,select')||e.target.isContentEditable;
  if(e.key==='/'&&!inField&&!dialog.open){const search=document.querySelector('#site-search');if(search){e.preventDefault();search.focus();}}
  if(e.key==='ArrowDown'&&e.target.closest('[data-friend-preview]')){e.preventDefault();showFriendPreview(e.target.closest('[data-friend-preview]'));document.querySelector('#friend-activity-popover a')?.focus();}
  if(e.key==='Tab'&&!e.shiftKey&&e.target.classList.contains('activity-trigger')&&activeFriendTrigger){e.preventDefault();document.querySelector('#friend-activity-popover a')?.focus();}
  if(e.key==='Escape'){const trigger=activeFriendTrigger?.querySelector('.activity-trigger');closeFriendPreview();trigger?.focus();closeFriendPreview();closeSuggestions();if(notificationsOpen){updateNotificationPopover(false);document.querySelector('#notification-toggle')?.focus();}if(document.body.classList.contains('nav-open'))setMenu(false);}
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
document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement&&!e.target.dataset.fallback){e.target.dataset.fallback='1';e.target.src='art/game-unavailable.svg';}},true);
document.addEventListener('scroll',e=>{if(!e.target.closest?.('#friend-activity-popover'))closeFriendPreview();if(e.target.classList?.contains('card-scroller'))updateShelfControls();},true);
window.addEventListener('resize',()=>{closeFriendPreview();if(innerWidth>820&&document.body.classList.contains('nav-open'))setMenu(false);syncSidebarState();updateShelfControls();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
window.addEventListener('focus',()=>{if(!loginBusy)refreshSession();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!loginBusy)refreshSession();});
window.addEventListener('pageshow',event=>{if(event.persisted)refreshSession();});
render();
refreshSession();
