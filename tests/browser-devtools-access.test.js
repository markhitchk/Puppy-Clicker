import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Regression guard: no website module may bring back a global browser
// inspection, right-click, or keyboard-shortcut blocker.
const srcRoot=fileURLToPath(new URL('../src/',import.meta.url));
const webModules=readdirSync(srcRoot,{recursive:true})
 .filter(path=>/\.(?:js|jsx|ts|tsx|mjs)$/.test(path))
 .map(path=>join(srcRoot,path))
 .filter(path=>statSync(path).isFile());

test('web app does not install DevTools shortcut or right-click deterrents',()=>{
 assert.ok(!existsSync(new URL('../src/inspectionDeterrent.js',import.meta.url)));
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.ok(!app.includes('installInspectionDeterrent'));
 for(const path of webModules){
  const source=readFileSync(path,'utf8');
  assert.doesNotMatch(source,/installInspectionDeterrent/,path);
  assert.doesNotMatch(source,/\boncontextmenu\s*=/i,path);
  assert.doesNotMatch(source,/addEventListener\s*\(\s*['"]contextmenu['"]/i,path);
  assert.doesNotMatch(source,/\b(?:key|event\.key)\s*===?\s*['"]f12['"]/i,path);
 }
});

test('permanent browser compatibility requirement is documented',()=>{
 const policy=readFileSync(new URL('../docs/browser-devtools-compatibility.md',import.meta.url),'utf8');
 for(const token of ['F12','Ctrl+Shift+I','Right-click','PupEye','server-side','/play','/settings','/account']){
  assert.ok(policy.includes(token),'Policy missing '+token);
 }
});
