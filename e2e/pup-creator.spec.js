import {test,expect} from '@playwright/test';
const artwork=page=>page.locator('canvas[aria-label="Puppy artwork"]');
const ready=async page=>expect(page.getByText('Canvas ready',{exact:true})).toBeVisible();
const paint=async page=>{
 const c=artwork(page),box=await c.boundingBox();
 await page.mouse.move(box.x+box.width*.40,box.y+box.height*.40);
 await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.60,{steps:8});await page.mouse.up();
};
test('V1 outline editor paints, clips, undoes, redoes and exports v2 package',async({page})=>{
 await page.goto('/creator');await ready(page);
 const c=artwork(page),initial=await c.evaluate(el=>el.toDataURL());
 const initialPixels=await c.evaluate(el=>{const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;return {corner:data[3],nonzero:data.filter((x,i)=>i%4===3&&x>0).length};});
 expect(initialPixels.corner).toBe(0);expect(initialPixels.nonzero).toBeGreaterThan(0);
 await paint(page);const painted=await c.evaluate(el=>el.toDataURL());expect(painted).not.toBe(initial);
 await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await c.evaluate(el=>el.toDataURL())).toBe(initial);
 await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await c.evaluate(el=>el.toDataURL())).toBe(painted);
 await page.getByRole('button',{name:'Add layer',exact:true}).click();await expect(page.getByRole('button',{name:'Paint 2',exact:true})).toBeVisible();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export .pup'}).click();const file=await dl;expect(file.suggestedFilename()).toMatch(/\.pup$/);
 const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const p=JSON.parse(Buffer.concat(chunks).toString());expect(p.version).toBe(2);expect(p.sourceTemplateId).toBe('creator_v1_clean');expect(p.layers).toHaveLength(2);
});
test('V2 direct route retains immutable outline after clearing paint',async({page})=>{
 await page.goto('/creator/v2');await ready(page);await expect(page.getByRole('button',{name:'V2 template'})).toHaveAttribute('aria-pressed','true');
 const c=artwork(page),initial=await c.evaluate(el=>el.toDataURL());await paint(page);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Clear paint'}).click();
 expect(await c.evaluate(el=>el.toDataURL())).toBe(initial);
});
test('painting across the entire canvas never colors outside source alpha',async({page})=>{
 await page.goto('/creator/v2');await ready(page);const c=artwork(page);
 await page.getByRole('button',{name:'Rectangle',exact:true}).click();await page.getByLabel('Filled shapes').check();
 const b=await c.boundingBox();await page.mouse.move(b.x+1,b.y+1);await page.mouse.down();await page.mouse.move(b.x+b.width-1,b.y+b.height-1);await page.mouse.up();
 const leaks=await c.evaluate(async el=>{const img=new Image();img.src='/assets/test/v2_test_crash_dummy.png';await img.decode();const source=document.createElement('canvas');source.width=el.width;source.height=el.height;const x=source.getContext('2d');x.drawImage(img,0,0);const a=x.getImageData(0,0,el.width,el.height).data,b=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(b[i]>a[i])n++;return n;});
 expect(leaks).toBe(0);
});

test('signed-in player previews and submits exactly one package, then sees delivery receipt',async({page})=>{
 let requests=0;
 await page.route('**/api/creator',async route=>{
  const body=route.request().postDataJSON();requests++;
  expect(route.request().headers().authorization).toBe('Bearer e2e-only-token');
  expect(body.action).toBe('submit');expect(body.acceptTerms).toBe(true);
  expect(body.project.sourceTemplateId).toBe('creator_v1_clean');
  expect(body.project.name).toBe('Community test pup');
  await route.fulfill({json:{ok:true,submission:{id:'00000000-0000-4000-8000-000000000001',delivery:'delivered'}}});
 });
 await page.goto('/creator');await ready(page);
 await page.getByLabel('Puppy name',{exact:true}).fill('Community test pup');
 await page.getByLabel('Description',{exact:true}).fill('Browser integration fixture');
 await page.getByRole('button',{name:'Review submission',exact:true}).click();
 await expect(page.getByRole('img',{name:'Final masked submission preview'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Submit to Discord',exact:true})).toBeDisabled();
 await page.getByLabel(/I own or have permission to submit/).check();
 await page.getByRole('button',{name:'Submit to Discord',exact:true}).click();
 await expect(page.getByText(/Delivered to Discord/)).toBeVisible();
 expect(requests).toBe(1);
});
test('published creator puppy appears in PupDex with official artwork and credit',async({page})=>{
 const id='v1_creator_'+'a'.repeat(24);
 await page.addInitScript(row=>localStorage.setItem('e2e_creator_roster',JSON.stringify([row])),{id,name:'Community test pup',description:'Browser test',generation:'v1',creatorCredit:'TestPlayer'});
 await page.route('**/api/creator-art?id='+id,route=>route.fulfill({status:200,contentType:'image/png',path:'public/assets/test/v1_test_crash_dummy.png'}));
 await page.goto('/pupdex?pup='+id);
 const dialog=page.getByRole('dialog');await expect(dialog.getByText('Community test pup',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Created by @TestPlayer')).toBeVisible();
 await expect(dialog.getByText('Community reward',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('img',{name:'Community test pup puppy artwork'})).toHaveAttribute('src','/api/creator-art?id='+id);
});
test('touchscreen pointer paints inside V2 silhouette on a phone viewport',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();
 try{
  await page.goto('/creator/v2');await ready(page);const c=artwork(page);
  const initial=await c.evaluate(el=>el.toDataURL());await c.scrollIntoViewIfNeeded();const b=await c.boundingBox();
  await page.touchscreen.tap(b.x+b.width*.5,b.y+b.height*.48);
  expect(await c.evaluate(el=>el.toDataURL())).not.toBe(initial);
 }finally{await context.close();}
});

test('clean V1 and V2 templates omit the crash forehead target and snow',async({page})=>{
 for(const generation of ['v1','v2']){
  await page.goto('/creator/'+generation);await ready(page);
  await expect(page.getByTestId('winter-snow')).toHaveCount(0);
  const clear=await artwork(page).evaluate(el=>{const c=el.getContext('2d');return [[126,54],[123,51],[126,44]].every(([x,y])=>c.getImageData(x,y,1,1).data[3]===0);});
  expect(clear).toBe(true);
 }
 await page.goto('/');await expect(page.getByTestId('winter-snow')).toBeAttached();
});
