import {test,expect} from '@playwright/test';
test('iPhone menu opens and navigates on the first tap',async({page})=>{
 await page.goto('/');
 const toggle=page.locator('.site-nav-toggle');
 await toggle.tap();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await page.locator('.site-nav a[href="/creator"]').tap();
 await expect(page).toHaveURL(/\/creator$/);
 await expect(page.getByText('Canvas ready',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add layer',exact:true}).tap();
 await expect(page.getByRole('button',{name:'Paint 2',exact:true})).toBeVisible();
});
test('iPhone homepage CTA stays in place and activates on a single tap',async({page})=>{
 await page.goto('/');
 const cta=page.locator('.hero-actions a[href="/play"]');
 await expect(cta).toHaveCSS('touch-action','manipulation');
 await cta.tap();
 await expect(page).toHaveURL(/\/play$/);
});
test('iPhone consent controls and dialog close on first tap',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Manage choices',exact:true}).tap();
 await expect(page.getByRole('dialog',{name:/Cookies & website storage/})).toBeVisible();
 await page.getByRole('button',{name:'Close cookie preferences'}).tap();
 await expect(page.getByRole('dialog',{name:/Cookies & website storage/})).toHaveCount(0);
 await page.getByRole('button',{name:'Necessary only',exact:true}).tap();
 await expect(page.locator('.puppy-cookie-banner')).toHaveCount(0);
});
test('iPhone drawing and undo work with touch input',async({page})=>{
 await page.goto('/creator/v2');
 await expect(page.getByText('Canvas ready',{exact:true})).toBeVisible();
 const c=page.locator('canvas[aria-label="Puppy artwork"]');
 await c.scrollIntoViewIfNeeded();const b=await c.boundingBox();const initial=await c.evaluate(el=>el.toDataURL());
 await page.touchscreen.tap(b.x+b.width*.5,b.y+b.height*.48);
 expect(await c.evaluate(el=>el.toDataURL())).not.toBe(initial);
 await page.getByRole('button',{name:'Undo',exact:true}).tap();
 expect(await c.evaluate(el=>el.toDataURL())).toBe(initial);
});
