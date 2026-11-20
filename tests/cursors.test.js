import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/styles/shared/cursors.css',import.meta.url),'utf8');
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
 assert.match(css,/\@media\s*\(any-hover: hover\) and \(any-pointer: fine\)/);
 assert.ok(css.includes("data-testid='puppy-scratch-coating'"));
 assert.ok(css.includes("var(--puppy-not-allowed)"));
 assert.ok(app.includes('dataset.puppyCursorTheme'));
 assert.ok(app.includes("systemTheme.addEventListener('change'"));
 assert.ok(prefs.includes('detail:{...cleaned}'));
 assert.ok(app.includes('dataset.puppyTheme'));
 assert.ok(app.includes('dataset.puppyCursorTheme'));
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


test('Puppy cursor uses the original artwork with custom size CSS variables',()=>{
 const sized=readFileSync(new URL('../src/styles/shared/cursor-sizes.css',import.meta.url),'utf8');
 for(const [name,px] of [['compact',48],['default',64],['large',96]]){
  for(const theme of ['dark','light']){
   assert.ok(sized.includes(`data-puppy-cursor-theme='${theme}'][data-puppy-cursor-size='${name}'`));
   for(const state of states)
    assert.ok(sized.includes(`/assets/pointers/themes/puppy_pointer_${theme}_${state}_${px}.png`),theme+' '+state+' '+name);
  }
 }
 assert.ok(!sized.includes('paw_pointer_'));
 assert.ok(!css.includes('/assets/cursors/paw_'));
 assert.ok(sync.includes('generateThemedVariants'));
 assert.ok(sync.includes('contrast-outline-v3-custom-size24-96'));
 assert.ok(sync.includes('const SIZES=[24,32,40,48,56,64,72,80,88,96]'));
 assert.ok(app.includes('root.dataset.puppyCursorSize=effectivePointerSizeKey(prefs)'));
 assert.ok(app.includes('const cursorSize=effectivePointerSize(prefs)'));
 assert.ok(app.includes('for(const [property,state,fallback] of puppyCursorVariants)'));
 assert.ok(app.includes('root.style.setProperty(property,'));
 assert.ok(app.includes('root.dataset.puppyPointerHalo=prefs.puppyPointerClickHighlight&&!prefs.reducedMotion'));
 assert.ok(app.includes('pointerThemeFor(prefs,systemTheme.matches)'));
});

test("cursor hotspots match the canonical Android pack and fallback preserves artwork",()=>{
 assert.ok(app.includes("const hotspot=Math.floor(cursorSize/4)"));
 assert.ok(!app.includes("state==='precision'?Math.floor(cursorSize/2)"));
 assert.ok(app.includes("const fallbackSize=Math.min(32,pointerSizeLimit())"));
 assert.ok(app.includes("if(signature!==cursorSignature)"));
 assert.ok(app.includes("const fallbackHotspot=Math.floor(fallbackSize/4)"));
 assert.ok(app.includes("cursorSize===fallbackSize?'':"));
 assert.ok(css.includes("(pointer: coarse)"));

 const sized=readFileSync(new URL('../src/styles/shared/cursor-sizes.css',import.meta.url),'utf8');
 for(const match of sized.matchAll(/precision_(\d+)\.png'\) (\d+) (\d+)/g)){
  assert.equal(Number(match[2]),Number(match[1])/4);
  assert.equal(Number(match[3]),Number(match[1])/4);
 }
});
