import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/native/web/cursors.css',import.meta.url),'utf8');
const sync=readFileSync(new URL('../scripts/sync-puppy-pointers.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const prefs=readFileSync(new URL('../src/native/web/preferences.js',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const states=['default','hover','click','text_select','link','grab','grabbing','not_allowed','working','precision','alternate','secondary'];

test('all 24 original Android cursors are referenced for light and dark browser themes',()=>{
 for(const theme of ['dark','light']){
  assert.match(css,new RegExp(`data-puppy-cursor-theme='${theme}'`));
  for(const state of states)
   assert.ok(css.includes(`/assets/pointers/puppy_pointer_${theme}_${state}.png`),`${theme}/${state}`);
 }
 assert.ok(sync.includes('Mobile/assets/pointers'));
 assert.ok(sync.includes('64')&&sync.includes('isPng64'));
 for(const state of states)assert.ok(sync.includes(`'${state}'`),state);
});
test('both Vite dev and build prepare the canonical cursor assets',()=>{
 assert.ok(pkg.scripts.dev.includes('node scripts/sync-puppy-pointers.mjs &&'));
 assert.ok(pkg.scripts.build.includes('node scripts/sync-puppy-pointers.mjs &&'));
});
test('website and game use preference theme, system theme, and mouse-only cursor rules',()=>{
 assert.match(css,/\@media \(any-hover: hover\) and \(any-pointer: fine\)/);
 assert.ok(css.includes("data-testid='puppy-scratch-coating'"));
 assert.ok(css.includes("var(--puppy-not-allowed)"));
 assert.ok(app.includes('dataset.puppyCursorTheme'));
 assert.ok(app.includes("systemTheme.addEventListener('change'"));
 assert.ok(prefs.includes('themeMode:cleaned.themeMode'));
});
