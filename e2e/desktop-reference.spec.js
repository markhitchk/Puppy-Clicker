import {test,expect} from '@playwright/test';

test('desktop follows the reference layout with real controls and three live goals',async({page})=>{
 await page.setViewportSize({width:1536,height:864});
 await page.goto('/play');
 await expect(page.getByTestId('desktop-navigation')).toBeVisible();
 await expect(page.locator('.desktop-play .puppy-identity')).toBeVisible();
 await expect(page.getByRole('button',{name:'Rename current puppy',exact:true})).toBeVisible();
 await expect(page.locator('.desktop-play')).toHaveCSS('background-image',/night-yard/);
 await expect(page.locator('.reference-goal')).toHaveCount(3);
 await expect(page.locator('.reference-care .care-bonus-box')).toBeVisible();
 const viewport=page.getByTestId('play-viewport');
 expect(await viewport.evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
 await expect(page.locator('.next-reward')).toBeInViewport({ratio:1});
 const top=await page.getByTestId('game-top-bar').boundingBox();expect(top.y).toBeLessThan(2);
 await page.getByRole('button',{name:'Rename current puppy',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Rename puppy',exact:true});
 await dialog.getByRole('textbox',{name:'Puppy name'}).fill('Cyber Buddy');
 await dialog.getByRole('button',{name:'Save name'}).click();
 await expect(page.getByRole('button',{name:'Tap Cyber Buddy to earn Treats'})).toBeVisible();
 await page.screenshot({path:'/tmp/desktop-reference-1536.png'});
 await page.getByRole('button',{name:'Help',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Puppy Clicker Help'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Discord',exact:true})).toHaveAttribute('href','https://discord.gg/HcZweHchbv');
});

for(const [width,height] of [[1000,600],[1000,900],[1100,900],[1100,720],[1280,720],[1920,1080]])test('desktop reference stays within viewport at '+width+'x'+height,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/play');
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
 await expect(page.locator('.reference-goal')).toHaveCount(3);
 await expect(page.locator('.next-reward')).toBeInViewport({ratio:1});
 const care=await page.locator('.reference-care').boundingBox(),bond=await page.locator('.web-care-row').last().boundingBox();
 expect(bond.y+bond.height).toBeLessThanOrEqual(care.y+care.height+1);
 expect(await page.locator('.reference-care').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
 expect(await page.locator('.streak-panel').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
 expect(await page.getByTestId('play-viewport').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:'/tmp/desktop-reference-'+width+'.png'});
});

 test('desktop dashboard remains readable with the website light theme',async({page})=>{
 await page.setViewportSize({width:1536,height:864});await page.goto('/play');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'Appearance',exact:true}).click();
 await page.getByRole('radio',{name:'Light',exact:true}).check();
 await page.getByRole('button',{name:'← Back to Play',exact:true}).click();
 const colors=await page.locator('.dashboard-panels>section').first().evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
 expect(colors.background).toBe('rgb(255, 255, 255)');expect(colors.color).toBe('rgb(23, 26, 29)');
 await expect(page.locator('.desktop-play .play-energy strong').first()).toHaveCSS('color','rgb(220, 229, 242)');
 await page.screenshot({path:'/tmp/desktop-reference-light.png'});
 });
