import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEnforcementEmail,noticeFromHistory} from '../src/enforcementEmail.js';
const sample={type:'suspension',username:'pup',displayName:'<img onerror=alert(1)>',accountId:'PUP-TEST',reason:'<script>alert(1)</script>',expiresAt:'2030-01-01T00:00:00Z',contactEmail:'private@example.com'};
test('suspension uses amber, UTC, official assets, and escaped player fields',()=>{
 const n=buildEnforcementEmail(sample);
 assert.match(n.subject,/Suspension/);assert.match(n.html,/#ffd166/);
 assert.match(n.html,/2030-01-01 00:00:00 UTC/);assert.match(n.html,/puppy_clicker.png/);
 assert.match(n.html,/&lt;script&gt;/);assert.doesNotMatch(n.html,/<script>|<img onerror|private@example.com/);
 assert.match(n.text,/Silence is not consent/);
});
test('permanent ban has red status and no invented expiry',()=>{
 const n=buildEnforcementEmail({...sample,type:'ban',expiresAt:null});
 assert.match(n.subject,/Ban Notice/);assert.match(n.html,/#ffd1d6/);assert.match(n.text,/Until lifted by staff/);
});
test('history permits active manual single-account restrictions only',()=>{
 const u=[{id:'p',username:'pup',friendCode:'PUP-TEST'}];
 const b={id:'b',status:'active',reason_code:'WEB_ADMIN_SUSPENSION',expires_at:'2030-01-01T00:00:00Z',targets:[{playerId:'p'}]};
 const now=Date.parse('2026-01-01');
 assert.equal(noticeFromHistory(b,u,now).type,'suspension');
 assert.equal(noticeFromHistory({...b,status:'revoked'},u,now),null);
 assert.equal(noticeFromHistory({...b,expires_at:'2020-01-01'},u,now),null);
 assert.equal(noticeFromHistory({...b,reason_code:'EXTERNAL'},u,now),null);
 assert.equal(noticeFromHistory(b,[],now),null);
});
