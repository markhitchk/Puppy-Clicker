import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePrivacyReview} from '../api/_lib/privacyReview.js';
test('erasure cannot be marked completed through staff triage',()=>{
 assert.throws(()=>validatePrivacyReview('erase','received','completed','Manual review'),/PRIVACY_ERASURE_VERIFICATION_REQUIRED/);
});
test('status changes require meaningful reasons and no reopen of closed request',()=>{
 assert.throws(()=>validatePrivacyReview('access','received','completed','x'),/PRIVACY_REVIEW_INVALID/);
 assert.throws(()=>validatePrivacyReview('access','completed','in_progress','reason here'),/PRIVACY_REQUEST_CLOSED/);
 assert.deepEqual(validatePrivacyReview('access','received','in_progress','reviewing now'),{state:'in_progress',reason:'reviewing now'});
});
