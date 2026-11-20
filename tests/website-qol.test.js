import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('content navigation keeps anchor semantics while buttonifying textual links',()=>{
 const buttons=read('src/styles/shared/buttons.css');
 assert.match(buttons,/\.site-frame a\[href\]/);
 assert.match(buttons,/\.site-footer a/);
 assert.match(buttons,/\.meet-puppy-link/);
 assert.match(buttons,/a:has\(img\)/);
 assert.match(buttons,/focus-visible/);
 assert.match(buttons,/prefers-reduced-motion:reduce/);
});

test('browser settings has category search, shortcuts, undo and five independently hideable panels',()=>{
 const settings=read('src/BrowserSettings.jsx');
 const styles=read('src/styles/shared/settings.css');
 assert.match(settings,/id="browser-settings-search" type="search"/);
 assert.match(settings,/aria-label="Jump to settings"/);
 assert.match(settings,/Undo last change/);
 assert.match(settings,/saveWebPreferences\(undoPrefs\)/);
 assert.equal((settings.match(/hidden=\{!matches\(categoryKeywords\[/g)||[]).length,5);
 assert.match(settings,/role="status"/);
 assert.match(styles,/\.browser-settings-panel\[hidden\]\{display:none!important\}/);
 assert.match(styles,/\.browser-settings-shortcuts/);
});

test('footer maintains logo-only navigation with accessible brand dialogs',()=>{
 const home=read('src/App.jsx');
 const footer=home.slice(home.indexOf('<footer className="site-footer"'),home.indexOf('</footer>',home.indexOf('<footer className="site-footer"')));
 assert.doesNotMatch(footer,/<a\b/);
 assert.equal((footer.match(/<button\b/g)||[]).length,2,'only brandmark and modal close controls');
 assert.match(footer,/FOOTER_BRANDS\.map/);
 assert.match(footer,/aria-haspopup="dialog"/);
 assert.match(footer,/<dialog\b/);
 assert.match(footer,/site-footer-logo-close/);
});
