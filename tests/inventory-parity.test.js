import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/InventoryScreen.jsx',import.meta.url),'utf8');
const card=readFileSync(new URL('../src/PuppyCollectionCard.jsx',import.meta.url),'utf8');
const details=readFileSync(new URL('../src/PuppyCollectionDetails.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/shared/inventory.css',import.meta.url),'utf8');

test('account and play inventory share one redesigned component and read-only source of truth',()=>{
 assert.match(source,/export default function InventoryScreen/);
 assert.match(source,/export function AccountInventoryPage/);
 assert.match(source,/pup-inventory-play/);
 assert.match(source,/pup-inventory-account/);
 assert.match(source,/game\.unlockedPuppies/);
 assert.match(source,/usePuppyRarity\(\)/);
 assert.match(source,/catalog\.rows\.find/);
 assert.doesNotMatch(source,/localStorage\.setItem|Math\.random|newBetaKotlinSave|act\(\{type:'switch'/);
});
test('owned puppy cards use catalog rarity, foil, separated badges and full artwork viewer',()=>{
 assert.match(source,/<PuppyCollectionCard area="inventory"/);
 assert.match(source,/<PuppyCollectionDetails area="inventory"/);
 assert.match(card,/meet-puppy-card collection-card/);
 assert.match(card,/data-rarity=\{tier\}/);
 assert.match(card,/className="meet-puppy-badge meet-puppy-badge-rarity"/);
 assert.match(details,/PuppyAssetViewer/);
 assert.match(details,/Copy Link/);
 assert.match(details,/View Asset/);
 assert.match(details,/Open in PupDex/);
 assert.match(css,/pup-inventory-puppy/);
 assert.match(css,/rarity-rgb/);
 assert.match(css,/prefers-reduced-motion/);
});
const palette=readFileSync(new URL('../src/styles/shared/rarity.css',import.meta.url),'utf8');
test('inventory ticket and upgrade rarity use catalog palette but balances are neutral',()=>{
 for(const tier of ['common','uncommon','rare','epic','legendary'])assert.ok(palette.includes('data-rarity="'+tier+'"'));
 assert.match(source,/data-rarity=\{rarity\.toLowerCase\(\)\}/);
 assert.match(source,/data-rarity=\{upgrade\.rarity\?\.toLowerCase\(\)\|\|'neutral'\}/);
 assert.match(source,/data-rarity="neutral" key=\{key\}/);
 assert.match(source,/No owned puppies match these filters/);
});
