import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../api/_lib/adminPolicy.js';

test('suspensions require a future expiry; timed/permanent bans remain supported',()=>{
 assert.equal(typeof policy.validateRestrictionInput,'function');
 const future=new Date(Date.now()+3600000).toISOString();
 assert.throws(()=>policy.validateRestrictionInput({action:'suspend-account',reason:'Review needed'}),{code:'SUSPENSION_EXPIRY_REQUIRED'});
 assert.throws(()=>policy.validateRestrictionInput({action:'suspend-account',reason:'Review needed',expiresAt:'2000-01-01T00:00:00Z'}),{code:'INVALID_BAN_EXPIRY'});
 assert.equal(policy.validateRestrictionInput({action:'suspend-account',reason:'Review needed',expiresAt:future}).type,'suspension');
 assert.equal(policy.validateRestrictionInput({action:'ban-account',reason:'Repeated abuse'}).expiresAt,null);
 assert.throws(()=>policy.validateRestrictionInput({action:'role-update',reason:'Review needed'}),{code:'INVALID_ADMIN_ACTION'});
});

test('effective standing ignores revoked and elapsed restrictions and prioritizes bans',()=>{
 assert.equal(typeof policy.restrictionStanding,'function');
 const now=Date.parse('2026-10-29T18:00:00Z');
 const suspension={id:'s',status:'active',reason_code:'WEB_ADMIN_SUSPENSION',expires_at:'2026-10-29T19:00:00Z'};
 assert.equal(policy.restrictionStanding([suspension],now).status,'suspended');
 assert.equal(policy.restrictionStanding([suspension],now+3600000).status,'active');
 assert.equal(policy.restrictionStanding([{...suspension,revoked_at:'2026-10-29T17:00:00Z'}],now).status,'active');
 assert.equal(policy.restrictionStanding([suspension,{id:'b',status:'active',reason_code:'WEB_ADMIN',expires_at:null}],now).status,'banned');
});
