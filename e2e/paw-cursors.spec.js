import {test,expect} from '@playwright/test';

test('paw cursor assets are available and used site-wide with a mouse',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
 for(const name of ['paw_default','paw_hover','paw_click','paw_drag','paw_text','paw_casino','paw_link','paw_disabled']){
  const response=await page.request.get('/assets/cursors/'+name+'.svg');
  expect(response.ok(),name+' missing').toBe(true);
 }
 const pointer=page.locator('.site-nav a[href="/play"]');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).toContain('paw_default.svg');
 expect(await pointer.evaluate(node=>getComputedStyle(node).cursor)).toContain('paw_link.svg');
 await pointer.hover();
 expect(await pointer.evaluate(node=>getComputedStyle(node).cursor)).toContain('paw_hover.svg');
});

test('Puppy mouse pointer toggle applies instantly to the entire site and persists',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/play');
 await expect(page.getByTestId('desktop-navigation')).toBeVisible();
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'Play & performance',exact:true}).click();
 const toggle=page.getByRole('switch',{name:'Puppy mouse pointer'});
 await expect(toggle).toBeChecked();
 await toggle.uncheck();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','disabled');
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','disabled');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).not.toContain('paw_default.svg');

 await page.goto('/play');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'Play & performance',exact:true}).click();
 await page.getByRole('switch',{name:'Puppy mouse pointer'}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
});
