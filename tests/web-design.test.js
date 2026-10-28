import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAppearance} from '../src/native/src/theme.js';
test('website defaults to exact Kawaii-Cyber tokens and preserves explicit light theme',()=>{
 const p=applyAppearance({accentHex:'#00B8F0'},false);
 assert.equal(p.bg,'#0A0C12');assert.equal(p.accent,'#00E5FF');
 assert.equal(p.text,'#FFFFFF');assert.equal(p.muted,'#A0A8C0');
 assert.equal(applyAppearance({themeMode:'light'},true).dark,false);
});
test('high contrast strengthens the website borders and secondary text',()=>{
 const normal=applyAppearance({},true),high=applyAppearance({highContrast:true},true);
 assert.notEqual(normal.line,high.line);assert.notEqual(normal.muted,high.muted);
});
test('custom accent uses a matching readable button foreground',()=>{
 const p=applyAppearance({accentHex:'#100020'},true);
 assert.equal(p.accent,'#100020');assert.equal(p.onAccent,'#FFFFFF');
 assert.ok(p.accentSoft.includes('16,0,32'));
});
