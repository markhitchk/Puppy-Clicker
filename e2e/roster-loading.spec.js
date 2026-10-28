import {test,expect} from '@playwright/test';

for(const width of [360,1440])test('roster uses small lazy portraits and keeps current puppy stable at '+width,async({page})=>{
 await page.setViewportSize({width,height:900});
 // Online catalog outages must never block the bundled collection.
 await page.route('https://api.github.com/repos/markhitchk/pup-clinker/contents/assets*',route=>route.abort());
 await page.goto('/play');
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
 if(width>=1000)await page.getByRole('button',{name:'Roster',exact:true}).click();
 else await page.getByRole('tab',{name:'🐶 Roster'}).click();
 const grid=page.getByTestId('puppy-roster-grid');
 await expect(grid).toBeVisible();
 const images=grid.locator('img');
 expect(await images.count()).toBeGreaterThan(20);
 await expect(images.first()).toHaveAttribute('loading','lazy');
 await expect(images.first()).toHaveAttribute('src',/\/assets\/portraits\/.*-256.webp/);
 await expect.poll(()=>images.first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 const source=await images.first().evaluate(img=>img.currentSrc);
 const response=await page.request.get(source);
 expect((await response.body()).byteLength).toBeLessThan(45000);
 await grid.getByRole('button',{name:'Inspect Sunny',exact:true}).click();
 await expect(page.getByTestId('current-puppy-hero').getByText('Buddy',{exact:true})).toBeVisible();
});

test('failed optimized artwork falls back to the original image without retry loops',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/assets/portraits/*.webp',route=>route.abort());
 await page.goto('/play');
 await page.getByRole('button',{name:'Roster',exact:true}).click();
 const first=page.getByTestId('puppy-roster-grid').locator('img').first();
 await expect(first).toHaveAttribute('src',/\/assets\/transparent\/v1\/v1_classic.png/);
 await expect.poll(()=>first.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 expect(errors).toEqual([]);
});
