import {test,expect} from '@playwright/test';

test('puppy asset deep link opens a public in-game-style details dialog',async ({page})=>{
 await page.goto('/puppies?pup=v1_midnight');
 const dialog=page.locator('dialog.meet-puppy-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Puppy Details'})).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Midnight'})).toBeVisible();
 await expect(dialog.getByText('v1_midnight')).toBeVisible();
 await expect(dialog.getByText('A moonlit version of the original pup.')).toBeVisible();
 await expect(dialog.getByText('Special unlock')).toBeVisible();
 await dialog.getByRole('button',{name:'Close puppy details'}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page).toHaveURL(/\/puppies$/);
});

test('public puppy cards open details without a reload, and Escape closes them',async ({page})=>{
 await page.goto('/puppies');
 const card=page.getByRole('link',{name:'View Midnight puppy details'});
 await expect(card).toHaveAttribute('href','/puppies?pup=v1_midnight');
 await card.click();
 await expect(page).toHaveURL(/\/puppies\?pup=v1_midnight$/);
 await expect(page.locator('dialog.meet-puppy-dialog')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('dialog.meet-puppy-dialog')).toHaveCount(0);
 await expect(page).toHaveURL(/\/puppies$/);
});

test('asset aliases and home preview links resolve correctly',async ({page})=>{
 await page.goto('/puppies?=v1_midnight');
 await expect(page.locator('dialog.meet-puppy-dialog').getByRole('heading',{name:'Midnight'})).toBeVisible();
 await page.goto('/');
 await page.getByRole('link',{name:'View Buddy puppy details'}).click();
 await expect(page).toHaveURL(/\/puppies\?pup=v1_classic$/);
 await expect(page.locator('dialog.meet-puppy-dialog').getByRole('heading',{name:'Buddy'})).toBeVisible();
});


test('public puppy modal retains the same dark visual hierarchy as the game on Android-size screens',async ({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/puppies?pup=v2_test_crash_dummy');
 const dialog=page.locator('dialog.meet-puppy-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Crash Test Pup V2'})).toBeVisible();
 await expect(dialog.getByText('v2_test_crash_dummy')).toBeVisible();
 await expect(dialog.getByText('Testing only')).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Retry Art'})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Done'})).toBeVisible();
 const styles=await dialog.evaluate(node=>{
  const computed=getComputedStyle(node);
  const close=node.querySelector('.meet-detail-close')?.getBoundingClientRect();
  const title=node.querySelector('.meet-detail-heading h2')?.getBoundingClientRect();
  const identity=node.querySelector('.meet-detail-identity');
  const actions=node.querySelector('.meet-detail-actions');
  const buttons=Array.from(node.querySelectorAll('.meet-detail-primary'));
  const box=node.getBoundingClientRect();
  return {
   bg:computed.backgroundColor,
   radius:parseFloat(computed.borderTopLeftRadius),
   width:box.width,
   left:box.left,
   right:box.right,
   top:box.top,
   bottom:box.bottom,
   closeRight:close?.right,
   titleRight:title?.right,
   identityGrid:getComputedStyle(identity).display,
   actionGrid:getComputedStyle(actions).display,
   primaryBackgrounds:buttons.map(x=>getComputedStyle(x).backgroundColor),
   primaryWidths:buttons.map(x=>x.getBoundingClientRect().width)
  };
 });
 // An unstyled HTML <dialog> is white with square browser-default buttons.
 // Reject it before a release, including when CSS imports get lost in Vite.
 expect(styles.bg).toBe('rgb(19, 47, 59)');
 expect(styles.radius).toBeGreaterThanOrEqual(20);
 expect(styles.width).toBeLessThanOrEqual(360);
 expect(styles.left).toBeGreaterThanOrEqual(0);
 expect(styles.right).toBeLessThanOrEqual(361);
 expect(styles.top).toBeGreaterThanOrEqual(0);
 expect(styles.bottom).toBeLessThanOrEqual(781);
 expect(styles.closeRight).toBeGreaterThan(styles.titleRight);
 expect(styles.identityGrid).toBe('grid');
 expect(styles.actionGrid).toBe('grid');
 expect(styles.primaryBackgrounds).toEqual(['rgb(0, 220, 237)','rgb(0, 220, 237)']);
 expect(styles.primaryWidths.every(width=>width>280)).toBe(true);
});

test('public puppy dialog can dismiss by tapping outside on mobile',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/puppies?pup=v1_midnight');
 const dialog=page.locator('dialog.meet-puppy-dialog');
 await expect(dialog).toBeVisible();
 await page.mouse.click(2,2);
 await expect(dialog).toHaveCount(0);
 await expect(page).toHaveURL(/\/puppies$/);
});
