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
  assert.match(entry.large,/-[a-f0-9]{12}-640\.webp$/);
  assert.match(entry.full,/-[a-f0-9]{12}-1536\.webp$/);
  const bytes=await readFile(new URL('.'+entry.small,root+'/'));
  const metadata=await sharp(bytes).metadata();
  assert.ok(metadata.width<=256&&metadata.height<=256);
  assert.equal(metadata.width,entry.smallWidth,'small srcSet descriptor matches real width');
  assert.equal(metadata.hasAlpha,true,'puppy backgrounds remain transparent');
  let previousWidth=metadata.width;
  for(const variant of ['large','full']){
   const upscale=await sharp(await readFile(new URL('.'+entry[variant],root+'/'))).metadata();
   assert.equal(upscale.width,entry[variant+'Width'],variant+' srcSet descriptor matches real width');
   assert.ok(upscale.width>previousWidth,variant+' portrait is genuinely larger');
   assert.equal(upscale.hasAlpha,true,'full-size artwork retains transparent edges');
   previousWidth=upscale.width;
  }
  small+=bytes.length;
  original+=(await stat(new URL('.'+entry.fallback,root+'/'))).size;
 }
 assert.ok(small<800*1024);
 assert.ok(small<original*.04);
});
