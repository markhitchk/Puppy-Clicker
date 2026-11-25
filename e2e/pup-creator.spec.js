import {test,expect} from '@playwright/test';

test('creator loads the V1 template and supports paint, undo, redo and export',async({page})=>{
 await page.goto('/creator');
 await expect(page.getByRole('heading',{name:'Pup Creator Studio'})).toBeVisible();
 await expect(page.getByText('Canvas ready',{exact:true})).toBeVisible();
 const canvas=page.locator('canvas[aria-label="Puppy artwork"]');
 const initial=await canvas.evaluate(c=>c.toDataURL());
 const box=await canvas.boundingBox();
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.4);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:8});
 await page.mouse.up();
 const painted=await canvas.evaluate(c=>c.toDataURL());
 expect(painted).not.toBe(initial);
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 expect(await canvas.evaluate(c=>c.toDataURL())).toBe(initial);
 await page.getByRole('button',{name:'Redo',exact:true}).click();
 expect(await canvas.evaluate(c=>c.toDataURL())).toBe(painted);
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export .pup'}).click();
 expect((await download).suggestedFilename()).toMatch(/\.pup$/);
});

test('creator supports blank transparent artwork and V2 templates',async({page})=>{
 await page.goto('/creator');
 await expect(page.getByText('Canvas ready',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'V2 template'}).click();
 await expect(page.getByText('Canvas ready',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Blank canvas'}).click();
 expect(await page.locator('canvas[aria-label="Puppy artwork"]').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.every(v=>v===0))).toBe(true);
});
