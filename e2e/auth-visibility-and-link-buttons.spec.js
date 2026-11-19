import {test,expect} from '@playwright/test';

test('Pup Account sign-in password can be shown, hidden and submitted through the same native input',async({page})=>{
 await page.goto('/account?signedout=1');
 const password=page.locator('#pup-login-password');
 await expect(password).toHaveAttribute('type','password');
 await expect(password).toHaveAttribute('name','password');
 await expect(password).toHaveAttribute('autocomplete','current-password');
 await password.fill('ExamplePassword123!');
 const show=page.getByRole('button',{name:'Show login password'});
 await expect(show).toHaveAttribute('type','button');
 await show.click();
 await expect(password).toHaveAttribute('type','text');
 await expect(password).toHaveValue('ExamplePassword123!');
 await page.getByRole('button',{name:'Hide login password'}).click();
 await expect(password).toHaveAttribute('type','password');
 await expect(password).toHaveValue('ExamplePassword123!');
});

test('registration exposes individual show and hide controls for password and confirmation',async({page})=>{
 await page.goto('/register?signedout=1');
 await expect(page.getByRole('form',{name:'Create Pup Account'})).toBeVisible();
 const pass=page.locator('#reg-pass');
 const confirmation=page.locator('#reg-confirm');
 await pass.fill('StrongExample123!');
 await confirmation.fill('StrongExample123!');
 await page.getByRole('button',{name:'Show registration password',exact:true}).click();
 await expect(pass).toHaveAttribute('type','text');
 await expect(confirmation).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'Show registration confirmation password'}).click();
 await expect(confirmation).toHaveAttribute('type','text');
 await expect(confirmation).toHaveValue('StrongExample123!');
 await expect(pass).toHaveAttribute('autocomplete','new-password');
 await expect(confirmation).toHaveAttribute('name','confirm-password');
 await page.getByRole('button',{name:'Hide registration password',exact:true}).click();
 await expect(pass).toHaveAttribute('type','password');
});

test('phone registration password control stays within the viewport',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto('/register?signedout=1');
 const control=page.getByRole('button',{name:'Show registration password',exact:true});
 await control.scrollIntoViewIfNeeded();
 const b=await control.boundingBox();
 expect(b).toBeTruthy();
 expect(b.x).toBeGreaterThanOrEqual(0);
 expect(b.x+b.width).toBeLessThanOrEqual(361);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('legal consent, PupEye breadcrumbs and recovery remain button-shaped hyperlinks',async({page})=>{
 await page.goto('/register?signedout=1');
 for(const link of [page.getByRole('link',{name:'Terms of Use'}),page.getByRole('link',{name:'Privacy Policy'})]){
  await expect(link).toHaveClass(/pup-link-button/);
  await expect(link).toHaveAttribute('href',/\/legal\//);
 }
 await page.goto('/pupeye');
 await expect(page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Puppy Clicker'})).toHaveClass(/pup-link-button/);
 await page.goto('/account?signedout=1');
 const recovery=page.getByRole('link',{name:/Recover account/});
 await expect(recovery).toHaveClass(/pup-link-button/);
 await expect(recovery).toHaveAttribute('href','/recovery');
});
