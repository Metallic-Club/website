import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, loadState, saveState} from '../src/store.js';
import {assetMatches} from '../src/platform.js';
import {cartItems, checkoutQuote, completeCheckout, friendWishlist, listings, wasGifted} from '../src/marketplace-checkout.js';

test('marketplace sections separate packs and systems and search includes tags', () => {
  assert.equal(listings.some(asset => asset.type === 'cosmetics'), false);
  const filters = new URLSearchParams({kind: 'systems', q: 'camera movement', price: 'paid'});
  assert.deepEqual(listings.filter(asset => assetMatches(asset, filters)).map(asset => asset.id), ['player-controller']);
  assert.ok(listings.some(asset => asset.kind === 'packs' && asset.id === 'city-kit'));
});

test('bulk checkout saves once and rolls back every change when saving fails', () => {
  const state = structuredClone(defaults);
  state.marketCart = ['city-kit', 'player-controller'];
  state.savedAssets = ['city-kit'];
  const before = structuredClone(state);
  assert.ok(completeCheckout(state, state.marketCart, '', 740, () => false).error);
  assert.deepEqual(state, before);
  let raw;
  assert.equal(completeCheckout(state, state.marketCart, '', 740, () => saveState({setItem: (_, data) => {raw = data;}}, state)).total, 740);
  const reloaded = loadState({getItem: () => raw});
  assert.deepEqual(reloaded.inventory, ['city-kit', 'player-controller']);
  assert.deepEqual(reloaded.savedAssets, []);
  assert.deepEqual(cartItems(reloaded), []);
  assert.equal(reloaded.previewAlloy, before.previewAlloy - 740);
  assert.ok(checkoutQuote(reloaded, ['city-kit']).error);
});

test('checkout rejects stale totals, insufficient balances, and unavailable items', () => {
  const state = structuredClone(defaults);
  state.previewAlloy = 100;
  const before = structuredClone(state);
  const shouldNotSave = () => assert.fail('Failed quotes must not save');
  assert.ok(completeCheckout(state, ['city-kit'], '', 1, shouldNotSave).error);
  assert.ok(completeCheckout(state, ['city-kit'], '', 480, shouldNotSave).error);
  assert.ok(completeCheckout(state, ['signal-cap'], '', 75, shouldNotSave).error);
  assert.ok(completeCheckout(state, ['forest-sound'], '', 0, shouldNotSave).error);
  assert.deepEqual(state, before);
});

test('gifts require a current friend and wishlist item and do not enter buyer inventory', () => {
  const state = structuredClone(defaults);
  assert.ok(friendWishlist(state, 'heroX_x').some(asset => asset.id === 'player-controller'));
  assert.equal(friendWishlist(state, 'PixelNova').length, 0);
  assert.ok(checkoutQuote(state, ['city-kit'], 'heroX_x').error);
  assert.ok(checkoutQuote(state, ['align-tools'], 'PixelNova').error);
  assert.equal(completeCheckout(state, ['player-controller'], 'heroX_x', 260, () => true).total, 260);
  assert.equal(wasGifted(state, 'heroX_x', 'player-controller'), true);
  assert.ok(checkoutQuote(state, ['player-controller'], 'heroX_x').error);
  assert.deepEqual(state.inventory, []);
  assert.equal(state.previewAlloy, defaults.previewAlloy - 260);
  state.friends = [];
  assert.ok(checkoutQuote(state, ['sci-door'], 'heroX_x').error);
});

test('old saved assets still load and cart and gift records are normalized', () => {
  const data = {savedAssets: ['city-kit'], inventory: ['city-kit'], marketCart: ['city-kit', 'nature-kit', 'nature-kit', 'forest-sound', 'signal-cap', 'bad'], marketGifts: [{recipient: 'heroX_x', assetId: 'checkpoint-system'}, {recipient: 'heroX_x', assetId: 'checkpoint-system'}, {recipient: 'heroX_x', assetId: 'city-kit'}]};
  const state = loadState({getItem: () => JSON.stringify(data)});
  assert.deepEqual(state.savedAssets, ['city-kit']);
  assert.deepEqual(state.marketCart, ['nature-kit']);
  assert.deepEqual(state.marketGifts, [{recipient: 'heroX_x', assetId: 'checkpoint-system'}]);
});
