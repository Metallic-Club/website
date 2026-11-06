import {sampleAccounts} from './sample-accounts.js';

// Shared policy for profile sections. Live services must apply the same policy
// before returning private records; browser rendering is only a preview.
export const privacySections = Object.freeze({
  friends: 'Friends list', playtime: 'Playtime', achievements: 'Achievements',
  favorites: 'Favorite games', groups: 'Groups',
});
export const defaultPrivacy = Object.freeze(Object.fromEntries(Object.keys(privacySections).map(key => [key,
  Object.freeze({others: !['friends', 'favorites'].includes(key), friends: !['friends', 'favorites'].includes(key)}),
])));
const record = value => value && typeof value === 'object' && !Array.isArray(value);
export function normalizePrivacy(value) {
  return Object.fromEntries(Object.keys(privacySections).map(key => {
    const entry = record(value) && Object.hasOwn(value, key) ? value[key] : null;
    return [key, Object.fromEntries(['others', 'friends'].map(audience => [audience,
      record(entry) && Object.hasOwn(entry, audience) ? entry[audience] === true : defaultPrivacy[key][audience],
    ]))];
  }));
}
export function resolveProfilePrivacy(policy, {owner = false, friend = false, visibility = 'Everyone'} = {}) {
  const profile = owner || visibility === 'Everyone' || visibility === 'Friends only' && friend;
  const normalized = normalizePrivacy(policy), audience = friend ? 'friends' : 'others';
  return {profile, ...Object.fromEntries(Object.keys(privacySections).map(key => [key, owner || profile && normalized[key][audience]]))};
}
export function profilePermissions(state, name, viewAs = '') {
  const own = name === state.profile.name;
  const preview = own && ['friend', 'others'].includes(viewAs);
  const sampleVisibility = own ? undefined : sampleAccounts.find(account => account.name === name)?.friendsVisibility;
  const samplePolicy = sampleVisibility === 'public' || sampleVisibility === 'friends'
    ? {...defaultPrivacy, friends: {others: sampleVisibility === 'public', friends: true}}
    : defaultPrivacy;
  return resolveProfilePrivacy(own ? state.privacy : samplePolicy, {
    owner: own && !preview,
    friend: preview ? viewAs === 'friend' : !own && state.friends.includes(name),
    visibility: own ? state.profile.visibility : 'Everyone',
  });
}
export function privacyFormFields(policy) {
  const normalized = normalizePrivacy(policy);
  return `<div class="privacy-sections"><h3>Profile sections</h3><p class="muted small-text">Choose what friends and other players can see. You can always see your own information. Friends lists and favorites start private for both audiences.</p>${Object.entries(privacySections).map(([key, label]) => `<fieldset class="privacy-section"><legend>${label}</legend><div class="privacy-audiences">${[['others', 'Other players'], ['friends', 'Friends']].map(([audience, audienceLabel]) => `<div><label for="privacy-${key}-${audience}">${audienceLabel}</label><select id="privacy-${key}-${audience}" name="privacy-${key}-${audience}" aria-label="${label}: ${audienceLabel}"><option value="hidden" ${!normalized[key][audience] ? 'selected' : ''}>Hidden</option><option value="visible" ${normalized[key][audience] ? 'selected' : ''}>Visible</option></select></div>`).join('')}</div></fieldset>`).join('')}</div>`;
}
export function privacyFromForm(data) {
  return normalizePrivacy(Object.fromEntries(Object.keys(privacySections).map(key => [key,
    Object.fromEntries(['others', 'friends'].map(audience => [audience, data.get(`privacy-${key}-${audience}`) === 'visible'])),
  ])));
}
