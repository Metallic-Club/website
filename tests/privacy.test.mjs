import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPrivacy,normalizePrivacy,resolveProfilePrivacy,profilePermissions,privacyFromForm} from '../src/privacy.js';
import {defaults,loadState,saveState} from '../src/store.js';

test('new and existing profiles start with private friends and favorites for both audiences',()=>{
  for(const data of [null,{}, {profile:{name:'LegacyPlayer'}}]){
    const state=loadState({getItem:()=>JSON.stringify(data)});
    assert.deepEqual(state.privacy,normalizePrivacy());
    for(const friend of [false,true]){
      const access=resolveProfilePrivacy(state.privacy,{friend});
      assert.equal(access.friends,false);assert.equal(access.favorites,false);
      assert.equal(access.playtime,true);assert.equal(access.achievements,true);assert.equal(access.groups,true);
    }
  }
});
test('each section independently applies the selected audience without falling back to public access',()=>{
  for(const key of Object.keys(defaultPrivacy))for(const others of [false,true])for(const friends of [false,true]){
    const policy=normalizePrivacy({[key]:{others,friends}});
    assert.equal(resolveProfilePrivacy(policy)[key],others);
    assert.equal(resolveProfilePrivacy(policy,{friend:true})[key],friends);
    assert.equal(resolveProfilePrivacy(policy,{owner:true,visibility:'Only me'})[key],true);
  }
});
test('whole-profile visibility takes precedence over every section permission',()=>{
  const policy=Object.fromEntries(Object.keys(defaultPrivacy).map(key=>[key,{others:true,friends:true}]));
  for(const visibility of ['Only me','invalid'])for(const friend of [true,false]){
    assert.ok(Object.values(resolveProfilePrivacy(policy,{visibility,friend})).every(value=>value===false));
  }
  assert.equal(resolveProfilePrivacy(policy,{visibility:'Friends only'}).profile,false);
  assert.ok(Object.values(resolveProfilePrivacy(policy,{visibility:'Friends only',friend:true})).every(Boolean));
});
test('privacy normalization rejects inherited permissions, invalid values and unknown fields',()=>{
  assert.equal(normalizePrivacy({friends:{others:'true',friends:1}}).friends.others,false);
  assert.equal(normalizePrivacy({playtime:{others:'visible',friends:null}}).playtime.others,false);
  assert.deepEqual(normalizePrivacy(Object.create({friends:{others:true,friends:true}})),normalizePrivacy());
  assert.deepEqual(normalizePrivacy([]),normalizePrivacy());
  assert.equal(Object.hasOwn(normalizePrivacy({unknown:{others:true}}),'unknown'),false);
  const copy=normalizePrivacy();copy.friends.friends=true;assert.equal(defaultPrivacy.friends.friends,false);
});
test('saved settings survive reload and owner-only previews cannot change another player’s access',()=>{
  const state=structuredClone(defaults);state.privacy.playtime={others:false,friends:true};
  let value;const storage={getItem:()=>value,setItem:(_,next)=>{value=next;}};
  assert.equal(saveState(storage,state),true);const restored=loadState(storage);
  assert.deepEqual(restored.privacy,state.privacy);
  assert.equal(profilePermissions(restored,restored.profile.name).playtime,true);
  assert.equal(profilePermissions(restored,restored.profile.name,'others').playtime,false);
  assert.equal(profilePermissions(restored,restored.profile.name,'friend').playtime,true);
  assert.equal(profilePermissions(restored,'00RIP_INDRA','friend').friends,false);
  restored.profile.visibility='Only me';
  assert.equal(profilePermissions(restored,restored.profile.name,'friend').profile,false);
  assert.equal(profilePermissions(restored,restored.profile.name).profile,true);
});
test('sample friends lists follow public, friends-only, and private visibility',()=>{
  const state=structuredClone(defaults);
  assert.equal(profilePermissions(state,'heroX_x').friends,true);
  assert.equal(profilePermissions(state,'CRIMSONSLAYER').friends,true);
  assert.equal(profilePermissions(state,'00RIP_INDRA').friends,false);
  state.friends=[];
  assert.equal(profilePermissions(state,'heroX_x','friend').friends,false);
  assert.equal(profilePermissions(state,'CRIMSONSLAYER').friends,true);
  assert.equal(profilePermissions(state,'CRIMSONSLAYER').favorites,false);
  assert.equal(profilePermissions(state,state.profile.name,'friend').friends,false);
});
test('privacy form accepts only explicit visible values; missing fields stay hidden',()=>{
  const data=new FormData();data.set('privacy-friends-friends','visible');data.set('privacy-favorites-others','true');
  const policy=privacyFromForm(data);
  assert.equal(policy.friends.friends,true);assert.equal(policy.friends.others,false);
  assert.equal(policy.favorites.others,false);assert.equal(policy.playtime.friends,false);
});
