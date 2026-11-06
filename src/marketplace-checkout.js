import {publicAssets} from './creator-data.js';

export const listings = publicAssets.filter(asset => asset.type !== 'cosmetics');
const listingsById = new Map(listings.map(asset => [asset.id, asset]));
export const listingFor = id => listingsById.get(id);
export const cartLimit = 30;

const sampleWishlists = new Map([
  ['heroX_x', ['player-controller', 'sci-door', 'checkpoint-system']],
  ['CRIMSONSLAYER', ['city-kit', 'terrain-painter']],
  ['00RIP_INDRA', ['nature-kit', 'city-loops']],
  ['PixelNova', ['align-tools', 'slate-material']],
  ['CloudBuilder', ['nature-kit', 'forest-sound']],
  ['LunaBlocks', ['checkpoint-system', 'woven-texture']],
]);

export function friendWishlist(state, name) {
  if (!name || name === state.profile.name || !state.friends.includes(name)) return [];
  return (sampleWishlists.get(name) || []).map(listingFor);
}

export function wasGifted(state, recipient, id) {
  return state.marketGifts.some(gift => gift.recipient === recipient && gift.assetId === id);
}

export function cartItems(state) {
  return [...new Set(state.marketCart)].map(listingFor).filter(asset => asset && asset.price > 0 && !state.inventory.includes(asset.id)).slice(0, cartLimit);
}

export function normalizeMarketplaceState(data, state) {
  state.marketCart = Array.isArray(data.marketCart) ? data.marketCart : [];
  state.marketCart = cartItems(state).map(asset => asset.id);
  const seen = new Set();
  state.marketGifts = [];
  for (const gift of Array.isArray(data.marketGifts) ? data.marketGifts : []) {
    if (!gift || !sampleWishlists.get(gift.recipient)?.includes(gift.assetId)) continue;
    const key = `${gift.recipient}:${gift.assetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    state.marketGifts.push({recipient: gift.recipient, assetId: gift.assetId});
  }
}

export function checkoutQuote(state, ids, recipient = '') {
  const fail = error => ({error});
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length > cartLimit) return fail('Choose items to check out.');
  const items = unique.map(listingFor);
  if (items.some(asset => !asset)) return fail('An item is no longer available.');

  if (recipient) {
    const wishlist = friendWishlist(state, recipient);
    if (items.length !== 1 || !wishlist.some(asset => asset.id === unique[0])) {
      return fail('Choose an item from a current friend’s wishlist.');
    }
    if (wasGifted(state, recipient, unique[0])) return fail('You already gifted this item in the preview.');
  } else {
    if (items.some(asset => !asset.price || state.inventory.includes(asset.id))) {
      return fail('An item is free or already in your inventory.');
    }
    if (state.inventory.length + items.length > 200) return fail('Your preview inventory is full.');
  }

  const total = items.reduce((sum, asset) => sum + asset.price, 0);
  const affordable = Number.isSafeInteger(state.previewAlloy) && state.previewAlloy >= total;
  return {items, total, affordable};
}

export function completeCheckout(state, ids, recipient, expectedTotal, save) {
  const quote = checkoutQuote(state, ids, recipient);
  if (quote.error) return quote;
  if (quote.total !== expectedTotal) return {error: 'The order changed. Review the new total before confirming.'};
  if (!quote.affordable) return {error: 'Your preview Alloy balance is too low.'};

  const before = {
    previewAlloy: state.previewAlloy,
    inventory: state.inventory,
    marketCart: state.marketCart,
    marketGifts: state.marketGifts,
    savedAssets: state.savedAssets,
  };
  state.previewAlloy -= quote.total;
  if (recipient) {
    state.marketGifts = [...state.marketGifts, {recipient, assetId: quote.items[0].id}];
  } else {
    const purchased = new Set(quote.items.map(asset => asset.id));
    state.inventory = [...state.inventory, ...purchased];
    state.marketCart = state.marketCart.filter(id => !purchased.has(id));
    state.savedAssets = state.savedAssets.filter(id => !purchased.has(id));
  }
  if (!save()) {
    Object.assign(state, before);
    return {error: 'Checkout could not be saved. Try again when browser storage is available.'};
  }
  return quote;
}
