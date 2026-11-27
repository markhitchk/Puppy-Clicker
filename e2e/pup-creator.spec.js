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
 const p=JSON.parse(Buffer.concat(chunks).toString());expect(p.version).toBe(2);expect(p.sourceTemplateId).toBe('classic');expect(p.layers).toHaveLength(2);
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
 const leaks=await c.evaluate(async el=>{const img=new Image();img.src='/assets/creator/roster_v2_honey.png';await img.decode();const source=document.createElement('canvas');source.width=el.width;source.height=el.height;const x=source.getContext('2d');x.drawImage(img,0,0);const a=x.getImageData(0,0,el.width,el.height).data,b=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(b[i]>a[i])n++;return n;});
 expect(leaks).toBe(0);
});

test('signed-in player previews and submits exactly one package, then sees delivery receipt',async({page})=>{
 let requests=0;
 await page.route('**/api/creator',async route=>{
  const body=route.request().postDataJSON();requests++;
  expect(route.request().headers().authorization).toBe('Bearer e2e-only-token');
  expect(body.action).toBe('submit');expect(body.acceptTerms).toBe(true);
  expect(body.project.sourceTemplateId).toBe('classic');
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

test('actual V1 and V2 roster templates omit snow and preserve original dark ink',async({page})=>{
 for(const generation of ['v1','v2']){
  await page.goto('/creator/'+generation);await ready(page);
  await expect(page.getByTestId('winter-snow')).toHaveCount(0);
  const aligned=await artwork(page).evaluate(async(el,g)=>{const img=new Image();img.src='/assets/creator/roster_'+(g==='v1'?'classic':'v2_honey')+'.png';await img.decode();const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(img,0,0);const a=c.getContext('2d').getImageData(0,0,256,256).data,b=el.getContext('2d').getImageData(0,0,256,256).data;let dark=0;for(let i=0;i<a.length;i+=4){if(!a[i+3]&&b[i+3])return false;if(a[i+3]===255&&.2126*a[i]+.7152*a[i+1]+.0722*a[i+2]<=50){if(b[i+3]!==255)return false;dark++;}}return dark>1000;},generation);
  expect(aligned).toBe(true);
 }
 await page.goto('/');await expect(page.getByTestId('winter-snow')).toBeAttached();
});

test('PupDex opens creator with the exact selected roster puppy',async({page})=>{
 await page.goto('/pupdex?pup=v2_biscuit');
 await page.getByRole('link',{name:'Create from this puppy',exact:true}).click();
 await expect(page).toHaveURL(/\/creator\?pup=v2_biscuit$/);
 await ready(page);
 await expect(page.getByRole('combobox',{name:'Roster puppy template'})).toHaveValue('v2_biscuit');
 await expect(page.getByRole('img',{name:'Original roster artwork'})).toHaveAttribute('src',/^\/assets\/portraits\/v2_biscuit-[0-9a-f]+-256\.webp$/);
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export .pup'}).click();
 const file=await dl,stream=await file.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const p=JSON.parse(Buffer.concat(chunks).toString());expect(p.sourceTemplateId).toBe('v2_biscuit');expect(p.templateVersion).toBe(4);
});


test('dense touch stroke avoids synchronous display readback and keeps undo intact',async({page})=>{
 await page.goto('/creator');await ready(page);const c=artwork(page);const initial=await c.evaluate(el=>el.toDataURL());
 const reads=await c.evaluate(el=>{const ctx=el.getContext('2d'),original=ctx.getImageData.bind(ctx);let reads=0;ctx.getImageData=(...args)=>{reads++;return original(...args);};const b=el.getBoundingClientRect();const emit=(type,x,y)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:77,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:b.x+b.width*x,clientY:b.y+b.height*y}));try{emit('pointerdown',.4,.4);for(let i=0;i<160;i++)emit('pointermove',.4+.2*i/160,.45+.12*Math.sin(i/15));const during=reads;emit('pointerup',.6,.5);return during;}finally{ctx.getImageData=original;}});
 expect(reads).toBe(0);expect(await c.evaluate(el=>el.toDataURL())).not.toBe(initial);
 await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await c.evaluate(el=>el.toDataURL())).toBe(initial);
});
test('a V2 pup link opens on its own generation and the template buttons keep the pup',async({page})=>{
 // Slow the template art so the pre-load state is visible, as on a real network.
 await page.route('**/assets/creator/roster_*.png',async route=>{await new Promise(r=>setTimeout(r,800));await route.continue();});
 await page.goto('/creator?pup=v2_prism');
 await expect(page.getByText('Generation: V2 · Prism',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'V2 template'})).toHaveAttribute('aria-pressed','true');
 await ready(page);
 const picker=page.getByLabel('Roster puppy template');
 await page.getByRole('button',{name:'V2 template'}).click();
 await expect(picker).toHaveValue('v2_prism');
 await page.getByRole('button',{name:'V1 template'}).click();await ready(page);
 await expect(picker).toHaveValue('classic');
 await page.getByRole('button',{name:'V2 template'}).click();await ready(page);
 await expect(picker).toHaveValue('v2_prism');
 await expect(page.getByText('Generation: V2 · Prism',{exact:false})).toBeVisible();
 const values=await picker.locator('option').evaluateAll(o=>o.map(x=>x.value));
 expect(new Set(values).size).toBe(values.length);
});
