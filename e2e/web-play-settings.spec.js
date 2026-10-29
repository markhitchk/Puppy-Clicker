import {test,expect} from '@playwright/test';

for(const [width,height] of [[320,568],[360,640],[390,844],[768,1024],[844,390],[1280,600],[1280,720],[1440,900]]){
 test('Play fits one screen at '+width+'x'+height,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/play');
  await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Switch Puppy/i})).toHaveCount(0);
  await expect(page.locator('.cyber-tap')).toBeInViewport({ratio:1});
  await expect(page.locator('.next-reward')).toBeInViewport({ratio:1});
  await expect(page.locator('.platform-portrait img')).toBeInViewport({ratio:1});
  const puppy=await page.locator('.platform-portrait img').boundingBox();
  expect(puppy.height).toBeGreaterThanOrEqual(64);
  const platform=await page.locator('.puppy-platform').boundingBox();
  expect(Math.abs(puppy.x+puppy.width/2-platform.x-platform.width/2)).toBeLessThan(2);
  const viewport=page.getByTestId('play-viewport');
  expect(await viewport.evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
  const reward=await page.locator('.next-reward').boundingBox();
  const bottomBar=page.getByTestId('game-bottom-bar');
  if(await bottomBar.count()){
   const nav=await bottomBar.boundingBox();expect(reward.y+reward.height).toBeLessThanOrEqual(nav.y+1);
   await expect(bottomBar.getByText('Rewards',{exact:true})).toBeInViewport({ratio:1});
  }else{
   await expect(page.getByRole('heading',{name:'Pup Care Status',exact:true})).toBeInViewport({ratio:1});
   await expect(page.getByRole('button',{name:'🎁 Rewards & daily goals'})).toBeInViewport({ratio:1});
   const care=await page.locator('.compact-care').boundingBox();
   const bond=await page.locator('.web-care-row').last().boundingBox();
   expect(bond.y+bond.height).toBeLessThanOrEqual(care.y+care.height);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:'/tmp/play-fit-'+width+'x'+height+'.png'});
 });
}

test('website settings save browser preferences across cloud actions and reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/play');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Website Settings'})).toBeVisible();
 await expect(page.getByText(/Android|APK|guest save|React Native preview|Google Play|Haptic/i)).toHaveCount(0);
 await page.getByRole('button',{name:'Appearance',exact:true}).click();
 await page.getByRole('button',{name:'Custom Color',exact:true}).click();
 await page.getByRole('textbox',{name:'Custom accent HEX'}).fill('#100020');
 await page.getByRole('button',{name:'Apply Custom Color',exact:true}).click();
 await page.getByRole('switch',{name:'Reduced motion',exact:true}).click();
 await page.getByRole('button',{name:'← Back to Play',exact:true}).click();
 await page.getByRole('button',{name:'Tap Buddy to earn Treats'}).click();
 await expect(page.getByRole('button',{name:'Treats exact balance: 2'})).toBeVisible();
 expect(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--accent-cyan'))).toBe('#100020');
 await page.reload();
 await expect(page.getByRole('button',{name:'Tap Buddy to earn Treats'})).toBeVisible();
 await expect(page.locator('.platform-paws span').first()).toHaveCSS('animation-name','none');
 expect(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--accent-cyan'))).toBe('#100020');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'Browser data',exact:true}).click();
 await page.getByRole('button',{name:'Reset browser preferences',exact:true}).click();
 await page.getByRole('button',{name:'Confirm reset',exact:true}).click();
 await page.getByRole('button',{name:'← Back to Play',exact:true}).click();
 await expect(page.getByRole('button',{name:'Treats exact balance: 2'})).toBeVisible();
 expect(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--accent-cyan'))).toBe('#00E5FF');
});

test('website settings display real cloud state and browser notification support',async({page})=>{
 await page.goto('/play');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'Pup Account & cloud save',exact:true}).click();
 await expect(page.getByText('Cloud progress is connected.',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Manage Pup Account'})).toHaveAttribute('href','/account');
 await page.getByRole('button',{name:'Notifications',exact:true}).click();
 await expect(page.getByText('Reminders run while this website is open.',{exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/website-settings.png'});
});

test('reload stays disabled until every queued gameplay action finishes',async({page})=>{
 await page.goto('/play?slowgameplay=1');
 const tap=page.getByRole('button',{name:'Tap Buddy to earn Treats'});
 await tap.click();await tap.click();await tap.click();
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('button',{name:'About this website',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('puppy_test_authoritative_kotlin_save_v1')||'null')?.saveData?.stores?.puppy_clicker_save?.values?.treats)).toBe(2);
 await expect(page.getByRole('button',{name:'Reload website',exact:true})).toBeDisabled();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('puppy_test_authoritative_kotlin_save_v1')||'null')?.saveData?.stores?.puppy_clicker_save?.values?.treats)).toBe(6);
 await expect(page.getByRole('button',{name:'Reload website',exact:true})).toBeEnabled();
});
