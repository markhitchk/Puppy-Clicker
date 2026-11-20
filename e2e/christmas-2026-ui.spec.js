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

test('snowfall is visible by default on every website route without enabling winter colors',async({page})=>{
 for(const route of ['/','/pupdex','/play','/account','/leaderboard','/settings','/26xmas']){
  await page.goto(route);
  const snow=page.locator('.xmas26-snow-overlay');
  await expect(snow).toHaveCount(1);
  await expect(snow).toBeVisible();
  await expect(snow).toHaveCSS('pointer-events','none');
  await expect(snow.locator('.xmas26-flake')).toHaveCount(42);
 }
});
test('sitewide snowfall respects reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 await expect(page.locator('.xmas26-flake').first()).toHaveCSS('animation-name','none');
});

// The fixture starts signed in unless the signedout query parameter is present.
test('existing Pup Account session opens the Christmas calendar without signing in again',async({page})=>{
 await page.goto('/26xmas');
 const hub=page.locator('.xmas26-page');
 await expect(hub.getByRole('button',{name:'Refresh account rewards'})).toBeVisible();
 await expect(hub.getByRole('button',{name:'Sign in to collect gifts'})).toHaveCount(0);
 await expect(hub.getByText('Sign in to collect your gifts when the event opens.')).toHaveCount(0);
 await expect(hub.locator('.pup-advent-door')).toHaveCount(25);
 await page.reload();
 await expect(hub.getByRole('button',{name:'Refresh account rewards'})).toBeVisible();
 await expect(hub.getByRole('button',{name:'Sign in to collect gifts'})).toHaveCount(0);
});
test('signed-out Christmas visitors can preview gifts and choose to sign in',async({page})=>{
 await page.goto('/26xmas?signedout=1');
 const hub=page.locator('.xmas26-page');
 await expect(hub.locator('.pup-advent-door')).toHaveCount(25);
 await expect(hub.getByRole('button',{name:'Refresh account rewards'})).toHaveCount(0);
 await hub.getByRole('button',{name:'Sign in to collect gifts'}).click();
 await expect(page.getByTestId('pup-auth-form')).toBeVisible();
 await expect(page).toHaveURL(/collect=1/);
});
test('legacy collect links still recognize existing verified accounts',async({page})=>{
 await page.goto('/26xmas?collect=1');
 await expect(page.getByRole('button',{name:'Refresh account rewards'})).toBeVisible();
 await expect(page.getByTestId('pup-auth-form')).toHaveCount(0);
});
