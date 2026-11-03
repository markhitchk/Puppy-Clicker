import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('all Platform.OS references in puppy game have a corresponding react-native import',()=>{
 const source=readFileSync(new URL('../src/native/App.jsx',import.meta.url),'utf8');
 assert.match(source,/\bPlatform\.OS\b/,'this guard must inspect the actual game references');
 const moduleImport=source.match(/import\s*\{([^}]+)\}\s*from\s*['"]react-native['"]/m);
 assert.ok(moduleImport,'game must import react-native symbols');
 const imports=new Set(moduleImport[1].split(',').map(item=>item.trim().split(/\s+as\s+/)[0]));
 assert.ok(imports.has('Platform'),'Platform.OS would otherwise crash at render time (PUPPY-CRASH-902)');
});
