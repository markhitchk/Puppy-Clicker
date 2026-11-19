import {test,expect} from '@playwright/test';

// Synthetic, cancelable events verify that website JavaScript does not stop
// browser-native inspection shortcuts. Browser chrome itself is outside
// Playwright's page automation; the OS/browser chooses which shortcuts work.
const developerShortcuts=[
 {key:'F12'},
 {key:'I',ctrlKey:true,shiftKey:true},
 {key:'J',ctrlKey:true,shiftKey:true},
 {key:'C',ctrlKey:true,shiftKey:true},
 {key:'U',ctrlKey:true},
 {key:'I',metaKey:true,altKey:true},
 {key:'J',metaKey:true,altKey:true},
 {key:'C',metaKey:true,altKey:true},
 {key:'U',metaKey:true,altKey:true}
];

for(const route of ['/','/play','/settings','/account','/recovery','/pupeye']){
 test('developer shortcuts and right-click are not blocked on '+route,async({page})=>{
  await page.goto(route);
  await expect(page.locator('body')).toBeVisible();
  // Wait for site UI to mount, so React effects have had a chance to run.
  await expect(page.locator('#root')).not.toBeEmpty();
  const outcome=await page.evaluate(shortcuts=>{
   const keyResults=shortcuts.map(init=>{
    const event=new KeyboardEvent('keydown',{...init,bubbles:true,cancelable:true});
    document.body.dispatchEvent(event);
    return {shortcut:init.key,prevented:event.defaultPrevented};
   });
   const event=new MouseEvent('contextmenu',{button:2,bubbles:true,cancelable:true});
   document.body.dispatchEvent(event);
   return {keyResults,rightClickPrevented:event.defaultPrevented,consoleUsable:typeof console?.log==='function'};
  },developerShortcuts);
  for(const entry of outcome.keyResults)expect(entry.prevented,route+' intercepted '+entry.shortcut).toBe(false);
  expect(outcome.rightClickPrevented,route+' prevented right-click').toBe(false);
  expect(outcome.consoleUsable).toBe(true);
 });
}
