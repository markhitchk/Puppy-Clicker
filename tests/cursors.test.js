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

test('nested controls inherit one cursor state and disabled wins over pressed/hover',()=>{
 const allElementsSelector="body *";
 assert.ok(css.includes(allElementsSelector));
 assert.ok(css.includes("cursor: var(--puppy-current-cursor, var(--puppy-default)) !important;"));
 // A single inherited custom property is used rather than overriding each
 // button child with a separate URL, which caused mismatches in nested RNW spans.
 assert.ok(!css.includes("cursor: var(--puppy-link) !important;"));
 assert.ok(css.includes(":where(:active)"));
 assert.ok(css.includes(":where(:hover)"));
 const pressed=css.indexOf("--puppy-current-cursor: var(--puppy-click);");
 const disabled=css.indexOf("--puppy-current-cursor: var(--puppy-not-allowed);");
 assert.ok(pressed>=0 && disabled>pressed);
 assert.ok(css.includes(":where(:disabled, [disabled], [aria-disabled='true'])"));
});
test('touch stops sticky mouse hover until an actual hardware pointer moves again',()=>{
 assert.ok(css.includes(":not([data-puppy-cursor-input='touch'])"));
 assert.ok(app.includes("root.dataset.puppyCursorInput=primaryMouse.matches?'mouse':'touch'"));
 assert.ok(app.includes("event.pointerType==='touch'"));
 assert.ok(app.includes("event.pointerType==='mouse'||event.pointerType==='pen'"));
 assert.ok(app.includes("addEventListener('pointerdown',pointerInput"));
 assert.ok(app.includes("addEventListener('pointermove',pointerMovement"));
 assert.ok(app.includes("addEventListener('pointerover',pointerMovement"));
 assert.ok(app.includes("removeEventListener('pointerdown',pointerInput"));
});
