import {test,expect} from '@playwright/test';
import {collectionCapabilities} from '../src/puppyCollectionModes.js';

test('collection permissions are area-specific and fail closed',()=>{
 for(const area of ['inventory','pupdex','unknown']){
  const caps=collectionCapabilities(area,{owned:true,current:true,freeTest:true});
  expect(caps.canUse).toBe(false);
  expect(caps.canRename).toBe(false);
  expect(caps.canFavorite).toBe(false);
  expect(collectionCapabilities(area,{owned:false,freeTest:true}).canClaim).toBe(false);
 }
 expect(collectionCapabilities('roster',{owned:true}).canUse).toBe(true);
 expect(collectionCapabilities('roster',{owned:true,current:true}).canRename).toBe(true);
 expect(collectionCapabilities('roster',{owned:true}).canFavorite).toBe(true);
 expect(collectionCapabilities('roster',{owned:false,freeTest:true}).canClaim).toBe(true);
 expect(collectionCapabilities('roster',{owned:false,freeTest:false}).canClaim).toBe(false);
});

test('read-only inventory and public PupDex share one details surface',async({page})=>{
 await page.goto('/account/inventory');
 await page.getByRole('button',{name:'View Buddy puppy details'}).click();
 let modal=page.locator('dialog.collection-details');
 await expect(modal).toHaveAttribute('data-collection-mode','inventory');
 await expect(modal.getByRole('button',{name:'View Asset'})).toBeVisible();
 await expect(modal.getByRole('button',{name:'Rename Puppy'})).toHaveCount(0);
 await expect(modal.getByRole('button',{name:'Use Puppy',exact:true})).toHaveCount(0);
 await expect(modal.getByRole('button',{name:/puppy (from|to) favorites/})).toHaveCount(0);
 await modal.getByRole('button',{name:'Done'}).click();
 await page.goto('/pupdex?pup=v1_classic');
 modal=page.locator('dialog.collection-details');
 await expect(modal).toHaveAttribute('data-collection-mode','pupdex');
 await expect(modal.getByRole('button',{name:'View Asset'})).toBeVisible();
 await expect(modal.getByRole('button',{name:'Use Puppy',exact:true})).toHaveCount(0);
});

test('roster uses the shared dialog and asks for confirmation before selecting',async({page})=>{
 await page.setViewportSize({width:360,height:850});
 await page.goto('/play');
 await page.getByRole('tab',{name:'🐶 Roster'}).click();
 const grid=page.getByTestId('puppy-roster-grid');
 await grid.getByRole('button',{name:'Inspect Sunny'}).click();
 const modal=page.locator('dialog.collection-details');
 await expect(modal).toHaveAttribute('data-collection-mode','roster');
 await modal.getByRole('button',{name:'Use Puppy',exact:true}).click();
 await expect(modal.getByRole('button',{name:'Confirm use puppy'})).toBeVisible();
 await modal.getByRole('button',{name:'Cancel'}).click();
 await expect(modal.getByRole('button',{name:'Use Puppy',exact:true})).toBeVisible();
 await modal.getByRole('button',{name:'Done'}).click();
 await expect(grid.locator('[data-pup-card="classic"]')).toHaveAttribute('data-current','true');
});
