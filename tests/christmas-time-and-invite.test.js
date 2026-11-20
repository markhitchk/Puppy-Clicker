import test from 'node:test';
import assert from 'node:assert/strict';
import {adventUnlockTime} from '../src/native/web/adventUnlockTime.js';
import {friendInviteUrl,readInviteCode} from '../src/friendInvite.js';
test('December 1 UTC unlock falls on November 30 in Pacific time',()=>{
 const result=adventUnlockTime(1,'en-US','America/Los_Angeles');
 assert.equal(result.timestamp,Date.UTC(2026,11,1));assert.match(result.utc,/1 December 2026.*00:00 UTC/);assert.match(result.local,/Nov 30, 2026.*4:00 PM/);
});
test('friend invite link uses a fixed production URL and validated code',()=>{
 const url=new URL(friendInviteUrl('pup-1234-abcd-5678'));assert.equal(url.origin,'https://puppy-clicker.vercel.app');assert.equal(url.pathname,'/account');assert.equal(url.searchParams.get('mode'),'register');assert.equal(readInviteCode(url.search),'PUP-1234-ABCD-5678');assert.equal(friendInviteUrl('https://malicious.test'),'');assert.equal(readInviteCode('?invite=invalid'),null);
});
