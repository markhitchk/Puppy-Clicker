import {test,expect} from '@playwright/test';

test('content hyperlinks are button-shaped anchors with native navigation and the footer stays static',async({page})=>{
 await page.goto('/settings');
 const privacy=page.getByRole('link',{name:'Privacy policy',exact:true});
 await expect(privacy).toHaveAttribute('href','/legal/privacy');
 const display=await privacy.evaluate(el=>getComputedStyle(el).display);
 expect(['flex','inline-flex']).toContain(display);
 await expect(privacy).toHaveCSS('text-decoration-line','none');
 const border=await privacy.evaluate(el=>getComputedStyle(el).borderStyle);
 expect(border).toBe('solid');
 await privacy.click();
 await expect(page).toHaveURL(/\/legal\/privacy\/?$/);
 await page.goto('/');
 await expect(page.locator('footer.site-footer')).toBeVisible();
 await expect(page.locator('footer.site-footer a, footer.site-footer button')).toHaveCount(0);
});

test('Browser Settings supports quick-search, clear, and section shortcuts without losing controls',async({page})=>{
 await page.goto('/settings');
 const panels=page.locator('.browser-settings-grid > .browser-settings-panel');
 await expect(panels).toHaveCount(5);
 await expect(page.getByRole('navigation',{name:'Jump to settings'}).getByRole('link')).toHaveCount(5);
 const input=page.getByRole('searchbox',{name:'Find a setting'});
 await input.fill('notification');
 await expect(panels.filter({visible:true})).toHaveCount(1);
 await expect(page.getByRole('heading',{name:'Notifications & display'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Appearance & accessibility'})).toBeHidden();
 await page.getByRole('button',{name:'Clear search'}).click();
 await expect(panels.filter({visible:true})).toHaveCount(5);
 await page.getByRole('navigation',{name:'Jump to settings'}).getByRole('link',{name:/Pointer/}).click();
 await expect(page).toHaveURL(/#puppy-pointer-settings$/);
});

test('Browser Settings undo restores the last saved change and supports keyboard controls',async({page})=>{
 await page.goto('/settings');
 const motion=page.getByRole('switch',{name:'Reduced motion'});
 const initial=await motion.isChecked();
 if(initial)await motion.uncheck();else await motion.check();
 await expect(motion).toBeChecked({checked:!initial});
 await page.getByRole('button',{name:'Undo last change'}).click();
 await expect(motion).toBeChecked({checked:initial});
 await expect(page.getByRole('button',{name:'Undo last change'})).toHaveCount(0);
 await page.getByRole('searchbox',{name:'Find a setting'}).focus();
 await page.keyboard.type('pointer');
 await expect(page.getByRole('heading',{name:'Puppy mouse pointer'})).toBeVisible();
});

test('mobile settings controls and shortcut row do not overflow the page',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/settings');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(2);
 const search=page.getByRole('searchbox',{name:'Find a setting'});
 await expect(search).toBeVisible();
 await expect(search).toHaveCSS('min-height','44px');
});

test('PupEye primary actions preserve the bright primary fill instead of inheriting generic anchor backgrounds',async({page})=>{
 await page.goto('/pupeye');
 const links=page.locator('.pupeye-page a.pupeye-button--primary');
 expect(await links.count()).toBeGreaterThan(0);
 for(const link of await links.all()){
  await expect(link).toHaveCSS('text-decoration-line','none');
  expect(await link.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
 }
});
test('settings shortcuts form a readable grid on phone and desktop',async({page})=>{
 for(const width of [390,1188]){
  await page.setViewportSize({width,height:768});
  await page.goto('/settings');
  const nav=page.getByRole('navigation',{name:'Jump to settings'});
  await expect(nav).toHaveCSS('display','grid');
  const dimensions=await nav.evaluate(el=>({overflow:el.scrollWidth-el.clientWidth,buttons:[...el.querySelectorAll('a')].map(a=>a.getBoundingClientRect().width)}));
  expect(dimensions.overflow).toBeLessThanOrEqual(2);
  expect(Math.max(...dimensions.buttons)-Math.min(...dimensions.buttons)).toBeLessThanOrEqual(2);
 }
});
