import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('homepage footer only contains the three static official logos and copyright',()=>{
 const home=read('src/App.jsx');
 const css=read('src/styles.css');
 const start=home.indexOf('<footer className="site-footer"');
 const end=home.indexOf('</footer>',start);
 assert.ok(start>=0&&end>start);
 const footer=home.slice(start,end);
 assert.match(footer,/className="site-footer-brands"/);
 assert.match(footer,/className="site-footer-bottom"/);
 for(const [asset,alt] of [
  ['harleys_studios.png',"Harley's Studios logo"],
  ['puppy_clicker.png','Puppy Clicker game logo'],
  ['PupEye.png','PupEye anti-cheat logo']
 ]){
  assert.ok(footer.includes('/assets/logos/'+asset),'Missing '+asset);
  assert.ok(footer.includes('alt="'+alt+'"'),'Missing accessible label '+alt);
 }
 assert.match(footer,/All rights reserved/);
 assert.doesNotMatch(footer,/<a\b|<button\b|<nav\b|<form\b|href\s*=|onClick\s*=/i);
 assert.doesNotMatch(footer,/site-footer-links|mailto:/);
 assert.doesNotMatch(css,/\.site-footer-links/);
 assert.match(css,/\.site-footer-brandmark img\{/);
 assert.match(home,/className="home-account-recovery pup-link-button"/);
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
 assert.ok(styles.includes('.website-privacy-actions'));
});
