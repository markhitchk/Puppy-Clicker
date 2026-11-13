import {test,expect} from '@playwright/test';

test('paw cursor assets are available and used site-wide with a mouse',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
 for(const name of ['puppy_pointer_dark_default','puppy_pointer_dark_hover','puppy_pointer_dark_click','puppy_pointer_dark_grab','puppy_pointer_dark_text_select','puppy_pointer_dark_precision','puppy_pointer_dark_link','puppy_pointer_dark_not_allowed']){
  const response=await page.request.get('/assets/pointers/'+name+'.png');
  expect(response.ok(),name+' missing').toBe(true);
 }
 const pointer=page.locator('.site-nav a[href="/play"]');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_default_64.png');
 expect(await pointer.evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_link_64.png');
 await pointer.hover();
 expect(await pointer.evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_hover_64.png');
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
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).not.toContain('puppy_pointer_dark_default_64.png');

 await page.goto('/play');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'Play & performance',exact:true}).click();
 await page.getByRole('switch',{name:'Puppy mouse pointer'}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
});
