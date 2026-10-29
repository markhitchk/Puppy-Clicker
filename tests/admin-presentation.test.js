import test from 'node:test';
import assert from 'node:assert/strict';
const presentation=await import('../src/adminPresentation.js').catch(()=>({}));
test('audit details use safe human-readable fields and names instead of raw JSON',()=>{
 assert.equal(typeof presentation.presentAuditEvent,'function');
 const result=presentation.presentAuditEvent({action_code:'WEB_BAN_CREATED',actorName:'HarleyTG',targetName:'Puppy',detail:{reason:'Repeated abuse',expiresAt:null,password:'must never appear',arbitrary:{token:'secret'}}});
 assert.equal(result.title,'Account banned');
 assert.equal(result.actor,'HarleyTG');
 assert.equal(result.target,'Puppy');
 assert.match(result.description,/Repeated abuse/);
 assert.match(result.description,/Permanent/);
 assert.doesNotMatch(result.description,/secret|password|arbitrary|\{/);
});
test('browser device names distinguish mobile, desktop and browsers',()=>{
 assert.equal(typeof presentation.describeDevice,'function');
 assert.deepEqual(presentation.describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/156.0.0.0 Safari/537.36'),{device:'Windows computer',browser:'Chrome'});
 assert.deepEqual(presentation.describeDevice('Mozilla/5.0 (Linux; Android 16; SM-A176U) AppleWebKit/537.36 Chrome/156.0.0.0 Mobile Safari/537.36'),{device:'Android phone or tablet',browser:'Chrome'});
 assert.equal(presentation.describeDevice('').device,'Unknown device');
});
test('presence expires after 90 seconds and ended sessions never show online',()=>{
 assert.equal(typeof presentation.sessionIsOnline,'function');
 const now=Date.parse('2026-10-29T19:00:00Z');
 const session={last_seen_at:'2026-10-29T18:59:00Z',ended_at:null};
 assert.equal(presentation.sessionIsOnline(session,now),true);
 assert.equal(presentation.sessionIsOnline(session,now+30000),false);
 assert.equal(presentation.sessionIsOnline({...session,ended_at:'2026-10-29T18:59:30Z'},now),false);
});
