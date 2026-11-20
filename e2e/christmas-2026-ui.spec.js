import {test,expect} from '@playwright/test';

for(const width of [320,360,412,1366]){
 test('Christmas hub shows decorated PupDex-style Advent cards at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/26xmas');
  const hub=page.locator('.xmas26-page');
  await expect(hub.getByRole('heading',{name:'Santa Paws Christmas 2026'})).toBeVisible();
  await expect(hub.locator('.xmas26-tree')).toHaveCount(2);
  await expect(page.locator('.xmas26-flake')).toHaveCount(42);
  await expect(page.locator('.xmas26-snow-overlay')).toHaveCSS('position','fixed');
  expect((await hub.locator('.xmas26-hero').boundingBox()).height).toBeLessThan(215);
  await expect(page.locator('.xmas26-snow-overlay .xmas26-snow-layer')).toHaveCount(2);
  await expect(hub.locator('.pup-advent-door')).toHaveCount(25);
  await expect(hub.locator('.pup-advent-door svg')).toHaveCount(25);
  await expect(hub.locator('.pup-advent-door.finale')).toHaveCount(1);
  await expect(hub.locator('.pup-advent-door').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  await hub.getByRole('button',{name:/December 25,/}).click();
  const dialog=page.getByRole('dialog',{name:'December 25 gift'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Christmas Jackpot',{exact:true})).toBeVisible();
  await expect(dialog.getByText(/10,000 Treats/)).toBeVisible();
  await dialog.getByRole('button',{name:'Close gift details'}).click();
  await expect(dialog).toHaveCount(0);
  await hub.getByRole('button',{name:/Hide winter effects/}).click();
  await expect(page.locator('.xmas26-snow-overlay .xmas26-snow-layer')).toHaveCount(0);
  await expect(hub.locator('.xmas26-tree')).toHaveCount(0);
  await hub.getByRole('button',{name:/Show winter effects/}).click();
  await expect(hub.locator('.xmas26-tree')).toHaveCount(2);
 });
}
test('reduced-motion preference stops falling snow',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/26xmas');
 const snow=page.locator('.xmas26-snow-layer').first();
 await expect(snow).toHaveCSS('animation-name','none');
});
