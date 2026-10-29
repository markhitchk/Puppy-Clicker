import test from 'node:test';
import assert from 'node:assert/strict';
import roster from '../src/data/roster.js';
import {matchPuppy,puppyAssetId,puppyDetailsHref,readPuppyQuery,withoutPuppyQuery} from '../src/puppyLinks.js';

const midnight=roster.find(p=>p.id==='midnight');
const frost=roster.find(p=>p.id==='v2_frost');

test('public share links use the canonical asset ID, not only the game ID',()=>{
 assert.equal(puppyAssetId(midnight),'v1_midnight');
 assert.equal(puppyDetailsHref(midnight),'/puppies?pup=v1_midnight');
 assert.equal(puppyDetailsHref(frost),'/puppies?pup=v2_frost');
});

test('all supported detail URLs resolve both asset IDs and game IDs',()=>{
 for(const search of ['?pup=v1_midnight','?id=v1_midnight','?asset=v1_midnight','?puppy=v1_midnight','?=v1_midnight','?v1_midnight','?pup=midnight','?pup=v1_midnight.png']){
  const p=matchPuppy(roster,readPuppyQuery(search));
  assert.equal(p?.id,'midnight',search);
 }
 assert.equal(matchPuppy(roster,readPuppyQuery('?pup=v2_frost'))?.id,'v2_frost');
});

test('invalid and unrelated URLs are ignored rather than showing the wrong puppy',()=>{
 assert.equal(readPuppyQuery('?utm_source=discord'),null);
 assert.equal(matchPuppy(roster,'not_a_real_puppy'),null);
 assert.equal(matchPuppy(roster,'v1_midnight%2F%2E%2E'),null);
 assert.equal(matchPuppy(roster,'x'.repeat(200)),null);
});

test('closing removes the puppy key without dropping unrelated query parameters',()=>{
 assert.equal(withoutPuppyQuery('?pup=v1_midnight&utm_source=discord'),'?utm_source=discord');
 assert.equal(withoutPuppyQuery('?=v1_midnight'),'' );
 assert.equal(withoutPuppyQuery('?v1_midnight'),'' );
 assert.equal(withoutPuppyQuery('?asset=v1_midnight&id=midnight&ref=friend'),'?ref=friend');
});
