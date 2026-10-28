import {test,expect} from '@playwright/test';

for(const width of [360,768,1440]){
 test('kawaii game layout and roster at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/play');
  await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
  await expect(page.locator('.puppy-platform')).toBeVisible();
  await page.screenshot({path:'/tmp/puppy-play-'+width+'.png',fullPage:true});
  if(width>=1000){
   await expect(page.getByRole('heading',{name:'Today’s goals',exact:true})).toBeVisible();
   await expect(page.getByRole('heading',{name:'Pup Care Status'})).toBeVisible();
   await page.getByRole('button',{name:'Roster',exact:true}).click();
   await expect(page.getByTestId('desktop-roster-shop')).toBeVisible();
   await expect(page.getByText('Puppy Shop',{exact:true})).toBeVisible();
  }else await page.getByRole('tab',{name:'🐶 Roster'}).click();
  await expect(page.getByTestId('current-puppy-hero')).toBeVisible();
  const grid=page.getByTestId('puppy-roster-grid');
  await expect(grid).toBeVisible();
  await expect(grid.locator('button button')).toHaveCount(0);
  await page.screenshot({path:'/tmp/puppy-roster-'+width+'.png',fullPage:true});
  if(width===360)expect(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
  await page.getByRole('textbox',{name:'Search puppies or ID'}).fill('no matching puppy');
  await expect(page.getByText('No puppies match these filters.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
test('casino dialog supports cancel, keyboard focus and continue',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/play');
 await page.getByRole('button',{name:'Casino',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Puppy Casino'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Go Back',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'Casino',exact:true}).click();
 await dialog.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByText('🐾 Casino Chip Wallet',{exact:false})).toBeVisible();
});

test('long puppy names, custom accents and reduced motion remain usable',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.addInitScript(()=>{
  localStorage.setItem('puppy_test_authoritative_kotlin_save_v1',JSON.stringify({revision:1,updatedAt:new Date().toISOString(),saveData:{format:'puppy-clicker-cloud-save',version:1,stores:{puppy_clicker_save:{values:{puppy_name:'WWWWWWWWWWWWWWWWWW',puppy_style:'classic',unlocked_puppies:['classic'],energy:100,fullness:100,happiness:100,cleanliness_v5:100,bond_v5:10},types:{}}}}}));
 });
 await page.goto('/play');
 await expect(page.locator('.platform-name h2')).toHaveText('WWWWWWWWWWWWWWWWWW');
 await expect(page.locator('.platform-name')).toHaveCSS('overflow-wrap','anywhere');
 expect(await page.locator('.cyber-tap').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await expect(page.locator('.platform-portrait img').first()).toHaveAttribute('src',/\/assets\/transparent\/v1\/v1_classic.png/);
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'Appearance',exact:true}).click();
 await page.getByRole('button',{name:'Custom Color',exact:true}).click();
 await page.getByRole('textbox',{name:'Custom accent HEX'}).fill('#100020');
 await page.getByRole('button',{name:'Apply Custom Color',exact:true}).click();
 await page.getByRole('switch',{name:'Reduced motion',exact:true}).click();
 await page.getByRole('switch',{name:'High contrast',exact:true}).click();
 await page.getByRole('button',{name:'← Back to Play',exact:true}).click();
 await expect(page.locator('.platform-paws span').first()).toHaveCSS('animation-name','none');
 await expect(page.locator('.cyber-tap')).toHaveCSS('color','rgb(255, 255, 255)');
 expect(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--accent-cyan'))).toBe('#100020');
 expect(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--cyber-border'))).toBe('#A0BDD0');
});

test('casino dialog scrolls its actions into view on short screens',async({page})=>{
 await page.setViewportSize({width:1440,height:360});
 await page.goto('/play');
 await page.getByRole('button',{name:'Casino',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Puppy Casino'});
 await expect(dialog).toHaveCSS('overflow-y','auto');
 await dialog.getByRole('button',{name:'Continue',exact:true}).scrollIntoViewIfNeeded();
 await expect(dialog.getByRole('button',{name:'Continue',exact:true})).toBeInViewport();
 await page.screenshot({path:'/tmp/puppy-casino.png'});
 await dialog.getByRole('button',{name:'Go Back',exact:true}).click();
 await expect(dialog).toHaveCount(0);
});
