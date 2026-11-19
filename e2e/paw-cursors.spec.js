import {test,expect} from '@playwright/test';

// Existing settings regressions explicitly opt in to saved customization.
// The separate cookie-privacy suite tests the no-consent and reject paths.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('puppy-clicker:cookie-choice:v1',JSON.stringify({
   version:1,essential:true,functional:true,analytics:false,advertising:false,savedAt:Date.now()
  }));
 });
});


test('paw cursor assets are available and used site-wide with a mouse',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
 for(const name of ['puppy_pointer_dark_default','puppy_pointer_dark_hover','puppy_pointer_dark_click','puppy_pointer_dark_grab','puppy_pointer_dark_text_select','puppy_pointer_dark_precision','puppy_pointer_dark_link','puppy_pointer_dark_not_allowed']){
  const response=await page.request.get('/assets/pointers/'+name+'.png');
  expect(response.ok(),name+' missing').toBe(true);
 }
 const pointer=page.locator('.site-nav a[href="/play"]');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_default_32.png');
 expect(await pointer.evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_link_32.png');
 await pointer.hover();
 expect(await pointer.evaluate(node=>getComputedStyle(node).cursor)).toContain('puppy_pointer_dark_hover_32.png');
});

test('Puppy mouse pointer toggle applies instantly to the entire site and persists',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/play');
 await expect(page.getByTestId('desktop-navigation')).toBeVisible();
 await page.getByTestId('desktop-navigation').getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Play & performance',exact:true}).click();
 const toggle=page.getByRole('switch',{name:'Puppy mouse pointer'});
 await expect(toggle).toBeChecked();
 await toggle.uncheck();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','disabled');
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','disabled');
 expect(await page.locator('body').evaluate(node=>getComputedStyle(node).cursor)).not.toContain('puppy_pointer_dark_default_32.png');

 await page.goto('/play');
 await page.getByTestId('desktop-navigation').getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Play & performance',exact:true}).click();
 await page.getByRole('switch',{name:'Puppy mouse pointer'}).check();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-puppy-cursor','enabled');
});
