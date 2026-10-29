import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const component=read('../src/MeetPuppies.jsx');
const css=read('../src/puppy-details.css');
const globalCss=read('../src/styles.css');

test('public puppy dialog imports its CSS directly, independently of site-wide stylesheet',()=>{
 assert.match(component,/import\s+["']\.\/puppy-details\.css["']/);
 assert.ok(!globalCss.includes('@import "./puppy-details.css"'));
});

test('public modal has dark surface, rounded close control, two-column portrait and full-width actions',()=>{
 for(const rule of [
  '.meet-puppy-dialog{','.meet-detail-heading{','.meet-detail-close{',
  '.meet-detail-identity{','.meet-detail-pills{','.meet-detail-about{',
  '.meet-detail-actions{','.meet-detail-secondary,.meet-detail-primary{',
  '.meet-detail-primary{','.meet-detail-disclaimer{'
 ])assert.ok(css.includes(rule),rule);
 assert.match(css,/background:#132f3b/);
 assert.match(css,/grid-template-columns:170px minmax\(0,1fr\)/);
 assert.match(css,/border-radius:999px/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/max-height:calc\(100dvh - 28px\)/);
});

test('public page does not imply ownership and uses app for authenticated puppy selection',()=>{
 assert.ok(component.includes('Ownership and unlock status are checked in your Pup Account'));
 assert.ok(component.includes('href="/play"'));
 assert.ok(component.includes('Retry Art'));
 assert.ok(component.includes('onDismiss'));
});
