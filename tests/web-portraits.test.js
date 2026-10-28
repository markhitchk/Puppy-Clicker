import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import sharp from 'sharp';

test('bundled thumbnails retain transparency and cut the total roster artwork below 800 KB',async()=>{
 const root=new URL('../public',import.meta.url);
 const entries=JSON.parse(await readFile(new URL('../src/native/web/portraitManifest.json',import.meta.url),'utf8'));
 assert.ok(Object.keys(entries).length>=30);
 let original=0,small=0;
 for(const entry of Object.values(entries)){
  assert.match(entry.small,/-[a-f0-9]{12}-256\.webp$/);
  const bytes=await readFile(new URL('.'+entry.small,root+'/'));
  const metadata=await sharp(bytes).metadata();
  assert.ok(metadata.width<=256&&metadata.height<=256);
  assert.equal(metadata.hasAlpha,true,'puppy backgrounds remain transparent');
  small+=bytes.length;
  original+=(await stat(new URL('.'+entry.fallback,root+'/'))).size;
 }
 assert.ok(small<800*1024);
 assert.ok(small<original*.04);
});
