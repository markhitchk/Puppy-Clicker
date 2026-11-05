import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('live web play UI uses React Native components that Android can mirror without HTML',()=>{
 const app=source('src/native/App.jsx');
 const chrome=source('src/shared-ui/PupGameChrome.jsx');
 assert.match(app,/from '\.\.\/shared-ui\/PupGameChrome\.jsx'/);
 for(const name of ['PupResourceStrip','PupNeedPill','PupQuickAction']){
  assert.ok(chrome.includes('export function '+name+'('));
  assert.ok(app.includes('<'+name));
 }
 assert.match(chrome,/from 'react-native'/);
 assert.doesNotMatch(chrome,/<(?:div|span|button|article)\b|\b(?:window|document|localStorage|sessionStorage)\s*\./);
});
