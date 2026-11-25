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
 const p=JSON.parse(Buffer.concat(chunks).toString());expect(p.version).toBe(2);expect(p.sourceTemplateId).toBe('test_v1_crash_dummy');expect(p.layers).toHaveLength(2);
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
