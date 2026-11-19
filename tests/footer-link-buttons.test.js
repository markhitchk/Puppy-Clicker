import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('homepage has a traditional footer with all three original brand logos',()=>{
 const home=read('src/App.jsx');
 const css=read('src/styles.css');
 assert.match(home,/className="site-footer"/);
 assert.match(home,/className="site-footer-brands"/);
 assert.match(home,/className="site-footer-bottom"/);
 assert.match(home,/className="site-footer-links"/);
 for(const [asset,alt] of [
  ['harleys_studios.png',"Harley's Studios logo"],
  ['puppy_clicker.png','Puppy Clicker game logo'],
  ['PupEye.png','PupEye anti-cheat logo']
 ]){
  assert.ok(home.includes('/assets/logos/'+asset),'Missing '+asset);
  assert.ok(home.includes('alt="'+alt+'"'),'Missing accessible logo label '+alt);
 }
 for(const url of ['/legal/privacy','/legal/terms','/privacy','/account/privacy','/pupeye']){
  assert.ok(home.includes('<a href="'+url+'">')||home.includes('<a href="'+url+'" className='),url);
 }
 assert.ok(home.includes('href="mailto:harleytg.hq@gmail.com"'));
 assert.doesNotMatch(home,/className="site-footer-links"[^]*?className="pup-link-button"/);
 assert.match(css,/\.site-footer-links a\{[^}]*border:0;/);
 assert.match(css,/\.site-footer-links a\{[^}]*background:transparent;/);
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
 assert.ok(styles.includes('.site-footer-links'));
 assert.ok(styles.includes('.website-privacy-actions'));
});
