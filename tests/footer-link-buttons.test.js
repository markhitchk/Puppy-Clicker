import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('site footer contains grouped navigation buttons, not dotted text links',()=>{
 const home=read('src/App.jsx');
 assert.match(home,/className="site-footer"/);
 assert.match(home,/className="site-footer-brand"/);
 assert.match(home,/className="site-footer-links"/);
 assert.match(home,/className="home-account-recovery pup-link-button"/);
 for(const url of ['/account','/recovery','/privacy','/legal/privacy','/legal/terms','/pupeye']){
  assert.ok(home.includes('<a href="'+url+'">')||home.includes('<a href="'+url+'" className='),url);
 }
 assert.doesNotMatch(home,/Made for puppy fans/);
});
test('legal and privacy routes retain proper hrefs with button-style navigation',()=>{
 const legal=read('src/LegalReader.jsx');
 const privacy=read('src/WebPrivacy.jsx');
 const rights=read('src/privacy/PrivacyCenter.jsx');
 const styles=read('src/styles.css');
 assert.ok(legal.includes('legal-document-actions'));
 assert.ok(legal.includes('className="pup-link-button legal-inline-button"'));
 assert.ok(legal.includes('window.print()'));
 assert.ok(privacy.includes('className="website-privacy-actions"'));
 assert.ok(privacy.includes('className="pup-link-button is-primary"'));
 assert.ok(rights.includes('className="pup-link-button"'));
 assert.ok(styles.includes('.site-footer-links'));
 assert.ok(styles.includes('.website-privacy-actions'));
});
