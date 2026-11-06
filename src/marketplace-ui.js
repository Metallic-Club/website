import {escapeHtml as esc} from './store.js';
import {assetMatches, creatorTypes} from './platform.js';
import {pageWindow} from './pagination.js';
import {routeWithParams} from './router.js';
import {cartItems, cartLimit, checkoutQuote, completeCheckout, friendWishlist, listingFor, listings, wasGifted} from './marketplace-checkout.js';

export const listingKinds = {assets: 'Assets', packs: 'Asset packs', systems: 'Systems'};
export const listingLabels = {assets: 'Asset', packs: 'Asset pack', systems: 'System'};
const descriptions = {
  assets: 'Individual models, materials, sounds, and tools.',
  packs: 'Collections of assets built to work together.',
  systems: 'Gameplay components such as player movement and checkpoints.',
};
const types = {models: creatorTypes.models, textures: creatorTypes.textures, audio: creatorTypes.audio, plugins: 'Scripts & plugins'};
const prices = {free: 'Free', paid: 'Paid'};
const sorts = {relevance: 'Relevance', low: 'Price: low to high', high: 'Price: high to low', name: 'Name'};
const priceLabel = amount => amount ? `${amount.toLocaleString()} Alloy` : 'Free';
const cartRoute = 'marketplace?view=cart';

export function createMarketplace(ctx, assetCard) {
  const {state, params, route, pageHead, pageLinks, empty, link, button, icon, modal, dialog, toast, render, persist} = ctx;
  let pendingCheckout;

  function cartLink() {
    return link(cartRoute, `${icon('cart', 18)} Cart (${cartItems(state()).length})`, 'button');
  }

  function cards(assets, actionFor) {
    return `<div class="marketplace-grid market-listings">${assets.map(asset => `<div>${assetCard(asset, true)}${actionFor ? actionFor(asset) : ''}</div>`).join('')}</div>`;
  }

  function select(label, name, options, selected, placeholder) {
    return `<label>${label}<select name="${name}">${placeholder ? `<option value="">${placeholder}</option>` : ''}${Object.entries(options).map(([value, text]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
  }

  function browse() {
    const filters = new URLSearchParams(params());
    const sort = Object.hasOwn(sorts, filters.get('order')) ? filters.get('order') : 'relevance';
    if (!Object.hasOwn(listingKinds, filters.get('kind'))) filters.delete('kind');
    if (!Object.hasOwn(types, filters.get('type'))) filters.delete('type');
    if (!Object.hasOwn(prices, filters.get('price'))) filters.delete('price');
    filters.delete('slot');
    const query = (filters.get('q') || '').trim().slice(0, 160);
    if (query) filters.set('q', query);
    else filters.delete('q');
    const filtered = ['q', 'kind', 'type', 'price'].some(key => filters.get(key));
    const items = listings.filter(asset => assetMatches(asset, filters));
    if (sort === 'low') items.sort((a, b) => a.price - b.price);
    if (sort === 'high') items.sort((a, b) => b.price - a.price);
    if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));

    const categoryLink = (value, label) => link(routeWithParams('marketplace', filters, {kind: value, page: null}).slice(1), label, (filters.get('kind') || null) === value ? 'selected' : '');
    const navigation = `<nav class="creator-library-tabs market-kinds" aria-label="Listing categories">${categoryLink(null, 'All listings')}${Object.entries(listingKinds).map(([value, label]) => categoryLink(value, label)).join('')}</nav>`;
    const form = `<form id="marketplace-search" class="marketplace-filters market-refine" role="search">
      <div class="market-search">${icon('search', 18)}<input type="search" name="q" maxlength="160" aria-label="Search marketplace" placeholder="Search names, tags, or creators" value="${esc(filters.get('q') || '')}"></div>
      ${select('File type', 'type', types, filters.get('type'), 'Any type')}
      ${select('Price', 'price', prices, filters.get('price'), 'Any price')}
      ${select('Sort by', 'order', sorts, sort, '')}
      <button class="button" type="submit">Search</button>
    </form>`;

    if (!filtered && sort === 'relevance') {
      const sections = Object.entries(listingKinds).map(([value, label]) => {
        const section = items.filter(asset => asset.kind === value);
        return `<section class="market-shelf"><div class="section-top"><div><h2>${label}</h2><p class="section-sub">${descriptions[value]}</p></div>${link(`marketplace?kind=${value}`, `View all ${section.length} ${label.toLowerCase()} ${icon('arrow', 15)}`, 'view-all')}</div>${cards(section.slice(0, 4))}</section>`;
      }).join('');
      return navigation + form + sections;
    }

    const page = pageWindow(items, filters.get('page'));
    const heading = filters.get('q') ? `Results for “${esc(filters.get('q'))}”` : listingKinds[filters.get('kind')] || 'Listings';
    return navigation + form + `<div class="section-top"><h2>${heading}</h2><span class="result-count" role="status">${items.length} ${items.length === 1 ? 'listing' : 'listings'}</span></div>`
      + (items.length ? cards(page.items) + pageLinks(page, 'listings') : empty('No matching listings', 'Try a different search or change your filters.', link('marketplace', 'Clear filters', 'button')));
  }

  function collection(view) {
    const owned = view === 'inventory';
    const ids = owned ? state().inventory : state().savedAssets;
    const items = listings.filter(asset => ids.includes(asset.id));
    const page = pageWindow(items, params().get('page'));
    return `<div class="section-top"><h2>${owned ? 'Marketplace inventory' : 'Your wishlist'}</h2><span class="result-count">${items.length} items</span></div>`
      + (items.length ? cards(page.items, owned ? null : asset => button('market-wish', 'Remove from wishlist', 'button small full', `data-id="${asset.id}"`)) + pageLinks(page, owned ? 'inventory' : 'wishlist')
        : empty(owned ? 'Your marketplace inventory is empty' : 'Your wishlist is empty', owned ? 'Find assets for your next project.' : 'Use the heart on an item page to save something for later.', link('marketplace', 'Browse listings', 'button')));
  }

  function friends() {
    const current = state();
    const recipient = params().get('friend');
    const allFriends = current.friends.filter(name => name !== current.profile.name);
    const back = link('marketplace?view=friends', '← All friends', 'text-link');
    if (recipient && !allFriends.includes(recipient)) {
      return empty('Wishlist unavailable', 'Choose a current friend to view their wishlist.', back);
    }
    if (recipient) {
      const items = friendWishlist(current, recipient);
      return back + `<div class="section-top market-shelf"><div><h2>${esc(recipient)}’s wishlist</h2><p class="section-sub">Sample wishlist</p></div></div>`
        + (items.length ? cards(items, asset => wasGifted(current, recipient, asset.id)
          ? '<span class="button small full" aria-disabled="true">Gifted in preview</span>'
          : button('market-gift', `${icon('gift', 16)} Gift${asset.price ? ` for ${priceLabel(asset.price)}` : ' for free'}`, 'button small full', `data-id="${asset.id}" data-name="${esc(recipient)}" aria-label="Gift ${esc(asset.name)} to ${esc(recipient)}"`))
          : empty('This wishlist is empty', 'Check another friend’s wishlist.', back));
    }
    const page = pageWindow(allFriends, params().get('page'));
    return '<div class="section-top"><div><h2>Friends’ wishlists</h2><p class="section-sub">Choose a friend to see their sample wishlist.</p></div></div>'
      + (page.total ? `<ul class="role-member-list">${page.items.map(name => `<li>${link('marketplace?view=friends&friend=' + encodeURIComponent(name), `<div><strong>${ctx.accountName(name)}</strong><small>${friendWishlist(current, name).length} wishes</small></div>${icon('arrow', 16)}`, '')}</li>`).join('')}</ul>${pageLinks(page, 'friends’ wishlists')}`
        : empty('No friends to show', 'Add friends to browse their wishlists.', link('friends', 'Find friends', 'button')));
  }

  function cart() {
    const current = state();
    const items = cartItems(current);
    if (!items.length) return empty('Your cart is empty', 'Add paid listings to buy them together.', link('marketplace', 'Browse listings', 'button'));
    const total = items.reduce((sum, asset) => sum + asset.price, 0);
    return `<div class="market-cart-layout"><section class="panel"><h2>Cart (${items.length})</h2><ul class="market-cart-list">${items.map(asset => `<li><img src="${esc(asset.art)}" alt="" width="80" height="45"><div>${link('assets/' + asset.id, esc(asset.name), 'text-link')}<small>${listingLabels[asset.kind]} · ${priceLabel(asset.price)}</small></div>${button('market-remove', 'Remove', 'button small', `data-id="${asset.id}" aria-label="Remove ${esc(asset.name)} from cart"`)}</li>`).join('')}</ul></section>
      <aside class="panel"><h2>Order summary</h2>${summary(total)}${button('market-review-cart', 'Review purchase', 'button primary full')}<p class="fine-print">Checkout uses your preview Alloy balance.</p></aside></div>`;
  }

  function summary(total) {
    return `<dl class="market-total"><div><dt>Total</dt><dd>${total.toLocaleString()} Alloy</dd></div><div><dt>Preview balance</dt><dd>${state().previewAlloy.toLocaleString()} Alloy</dd></div></dl>`;
  }

  function page() {
    const requested = params().get('view');
    const view = ['inventory', 'wishlist', 'friends', 'cart'].includes(requested) ? requested : params().get('saved') === '1' ? 'wishlist' : 'browse';
    const modes = {browse: 'Browse', inventory: 'Inventory', wishlist: 'Wishlist', friends: 'Friends’ wishlists'};
    const content = view === 'browse' ? browse() : view === 'friends' ? friends() : view === 'cart' ? cart() : collection(view);
    return pageHead('Creator Marketplace', 'Find assets, packs, and systems for your next game.', `<div class="button-row market-header-actions">${link('create', 'Creator library', 'button')}${cartLink()}</div>`)
      + `<nav class="marketplace-modes" aria-label="Marketplace view">${Object.entries(modes).map(([key, label]) => link(key === 'browse' ? 'marketplace' : `marketplace?view=${key}`, label, view === key ? 'selected' : '')).join('')}</nav>`
      + content + '<p class="fine-print">Sample marketplace. Purchases and gifts use preview Alloy. Gift records are saved in this browser.</p>';
  }

  function actions(asset) {
    const current = state();
    const listing = listingFor(asset.id);
    const owned = current.inventory.includes(asset.id);
    if (!listing && asset.price && !owned) return '';

    const saved = current.savedAssets.includes(asset.id);
    const inCart = current.marketCart.includes(asset.id);
    const data = `data-id="${asset.id}"`;
    let primary;
    if (owned) primary = button('inventory-asset', `${icon('check', 18)} In inventory`, 'button primary', `${data} disabled`);
    else if (listing?.price) primary = button('market-buy', `${icon('alloy', 18)} Buy for ${priceLabel(asset.price)}`, 'button primary', data);
    else primary = button('inventory-asset', `${icon('create', 18)} Add to inventory`, 'button primary', data);

    const cartAction = listing?.price && !owned
      ? inCart ? link(cartRoute, `${icon('cart', 17)} View cart`, 'button') : button('market-add', `${icon('cart', 17)} Add to cart`, 'button', data)
      : '';
    const wish = listing && !owned ? button('market-wish', `${icon('heart', 17)} ${saved ? 'Wishlisted' : 'Wishlist'}`, 'button', `${data} aria-pressed="${saved}"`) : '';
    return (listing ? `<div class="market-price"><strong>${priceLabel(asset.price)}</strong><span>${listingLabels[asset.kind]} · ${asset.price ? 'One-time purchase' : 'Add to your library'}</span></div>` : '')
      + `<div class="asset-detail-actions market-item-actions">${primary}${cartAction}${wish}</div>`;
  }

  function review(ids, recipient = '', fromCart = false) {
    const current = state();
    const quote = checkoutQuote(current, ids, recipient);
    if (quote.error) return toast(quote.error);
    pendingCheckout = {ids, recipient, total: quote.total, fromCart, owner: current.profile.name, route: route(), query: params().toString()};
    const recipientText = recipient ? `<p>Gift to <strong>${esc(recipient)}</strong></p>` : '<p>These items will be added to your inventory.</p>';
    modal(recipient ? 'Confirm gift' : 'Confirm purchase', `${recipientText}<ul class="asset-files">${quote.items.map(asset => `<li><span>${esc(asset.name)}</span><span>${priceLabel(asset.price)}</span></li>`).join('')}</ul>${summary(quote.total)}
      <p class="fine-print">${recipient ? 'This records a gift in your browser preview.' : 'This purchase uses your browser’s preview Alloy.'}</p>
      ${quote.affordable ? '' : '<p class="form-error">Your preview Alloy balance is too low.</p>'}
      <div class="button-row">${button('close-dialog', 'Cancel', 'button')}${button('market-confirm', recipient ? 'Confirm gift' : 'Confirm purchase', 'button primary', quote.affordable ? '' : 'disabled')}</div>`);
  }

  function confirm(element) {
    const checkout = pendingCheckout;
    pendingCheckout = undefined;
    const current = state();
    if (!checkout || !dialog.open || !dialog.contains(element) || checkout.owner !== current.profile.name || checkout.route !== route() || checkout.query !== params().toString()) return;
    if (checkout.fromCart && cartItems(current).map(asset => asset.id).join(',') !== checkout.ids.join(',')) {
      dialog.close();
      toast('Your cart changed. Review it again before confirming.');
      return;
    }
    const result = completeCheckout(current, checkout.ids, checkout.recipient, checkout.total, ctx.save);
    dialog.close();
    if (result.error) return toast(result.error);
    toast(checkout.recipient ? `Gift recorded for ${checkout.recipient} in this preview.` : 'Purchase complete. Your items are in inventory.');
    render();
  }

  function handleAction(action, element) {
    if (!action.startsWith('market-')) return false;
    const {id, name} = element.dataset;
    const current = state();
    const asset = listingFor(id);
    if (action === 'market-confirm') confirm(element);
    else if (action === 'market-review-cart') review(cartItems(current).map(item => item.id), '', true);
    else if (action === 'market-remove') {
      current.marketCart = current.marketCart.filter(item => item !== id);
      persist('Removed from your cart.');
      render();
    } else if (asset && action === 'market-buy') review([id]);
    else if (asset && action === 'market-gift' && name) review([id], name);
    else if (asset && action === 'market-add' && asset.price && !current.inventory.includes(id)) {
      const ids = cartItems(current).map(item => item.id);
      if (ids.includes(id)) return true;
      if (ids.length >= cartLimit) toast(`Your cart can contain up to ${cartLimit} items.`);
      else {
        current.marketCart = [...ids, id];
        persist('Added to your cart.');
        render();
      }
    } else if (asset && action === 'market-wish') {
      const saved = current.savedAssets.includes(id);
      current.savedAssets = saved ? current.savedAssets.filter(item => item !== id) : [...current.savedAssets, id];
      persist(saved ? 'Removed from your wishlist.' : 'Added to your wishlist.');
      render();
    }
    return true;
  }

  return {page, actions, handleAction};
}
