import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('password visibility component preserves the native input and password-manager metadata',()=>{
 const c=read('src/PasswordField.jsx');
 assert.match(c,/useState\(false\)/);
 assert.match(c,/type=\{visible\?"text":"password"\}/);
 assert.match(c,/type="button"/);
 assert.match(c,/aria-controls=\{id\}/);
 assert.match(c,/aria-pressed=\{visible\}/);
 assert.match(c,/\{\.\.\.inputProps\}/);
 assert.match(c,/setVisible\(current=>!current\)/);
});

test('all website password flows share the same visibility widget',()=>{
 const count=(p)=>(read(p).match(/<PasswordField\b/g)||[]).length;
 assert.equal(count('src/native/web/AccountGate.jsx'),1,'sign-in');
 assert.equal(count('src/WebRegister.jsx'),2,'registration and confirm');
 assert.equal(count('src/App.jsx'),2,'account credentials and confirm');
 assert.equal(count('src/Recovery.jsx'),2,'verified password recovery');
 assert.equal(count('src/RecoveryPage.jsx'),2,'recovery reset');
 const css=read('src/styles/shared/account.css');
 assert.match(css,/\.pup-password-field>input/);
 assert.match(css,/\.pup-password-field>\.pup-password-visibility/);
});

test('remaining website text links use action-shaped anchors; footer is not buttonified',()=>{
 const paths=['src/CommunityChat.jsx','src/DiscordSignupForm.jsx','src/AdminPortal.jsx','src/AdminChat.jsx','src/PupEyePages.jsx','src/InventoryScreen.jsx','src/LegalReader.jsx','src/SiteAccountMenu.jsx','src/native/web/AccountGate.jsx'];
 for(const p of paths)assert.match(read(p),/pup-link-button/,p);
 const homepage=read('src/App.jsx');
 const footer=homepage.slice(homepage.indexOf('<footer className="site-footer"'),homepage.indexOf('</footer>',homepage.indexOf('<footer className="site-footer"')));
 assert.doesNotMatch(footer,/<a\b|<button\b/);
});
