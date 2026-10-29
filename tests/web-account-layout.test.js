import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('account and homepage actions have named, independent flex/grid containers',()=>{
 const jsx=read('src/App.jsx');
 assert.match(jsx,/className="home-account-actions"/);
 assert.match(jsx,/className="home-account-recovery"/);
 assert.match(jsx,/className="account-management-actions"/);
 assert.match(jsx,/className="portal-card account-management-card"/);
 const css=read('src/styles.css');
 assert.match(css,/\.home-account-actions\s*\{/);
 assert.match(css,/\.account-management-actions\s*\{/);
 assert.doesNotMatch(css,/\.account-content \.portal-card \.small-action\s*\{/);
});
