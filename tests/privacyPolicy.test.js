import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePrivacyRequest,publicRequestRows,privacyRequestsAllowed} from '../api/_lib/privacyPolicy.js';
test('accepts only declared rights without caller-supplied account ownership',()=>{
 assert.deepEqual(normalizePrivacyRequest({type:'access',note:' hello '}),{type:'access',note:'hello'});
 assert.throws(()=>normalizePrivacyRequest({type:'erase',account_uuid:'other'}),/PRIVACY_INVALID_REQUEST/);
 assert.throws(()=>normalizePrivacyRequest({type:'invalid'}),/PRIVACY_INVALID_REQUEST/);
});
test('public receipt hides account identifiers and staff review notes',()=>{
 assert.deepEqual(publicRequestRows([{id:'x',type:'erase',state:'received',account_uuid:'private',internal_notes:'secret',submitted_at:'now',deadline_at:'later'}]),
 [{requestId:'x',type:'erase',state:'received',submittedAt:'now',deadlineAt:'later',updatedAt:null}]);
});
test('daily intake limit does not block read-only list',()=>{assert.equal(privacyRequestsAllowed(4),true);assert.equal(privacyRequestsAllowed(5),false)});
