import assert from 'node:assert/strict';
import {assetRecord,requireAssetUrl} from '../src/asset-manifest.js';
import {creativeCatalogCategoryFor,listCreativeCatalog} from '../src/creative-catalog.js';

assert.equal(creativeCatalogCategoryFor('white_wool'),'building','source-backed wool must be grouped with building blocks');
assert.ok(listCreativeCatalog({category:'building'}).some(entry=>entry.id==='white_wool'));
assert.ok(listCreativeCatalog({category:'building'}).some(entry=>entry.id==='block:1'));
assert.equal(creativeCatalogCategoryFor('apple'),'food');
assert.equal(creativeCatalogCategoryFor('iron_pickaxe'),'tools');
assert.equal(creativeCatalogCategoryFor('iron_sword'),'combat');

for(const [key,file] of [
  ['gui.creative_tab_items','tab_items.png'],
  ['gui.creative_tab_search','tab_item_search.png'],
  ['gui.creative_tab_inventory','tab_inventory.png'],
  ['gui.creative_tabs','tabs.png']
]){
  const record=assetRecord(key);assert.ok(record,`${key} must be registered`);assert.equal(record.directCanonical,true);assert.equal(record.minecraftVersion,'1.20.1');assert.ok(requireAssetUrl(key).endsWith(`/creative_inventory/${file}`),`${key} must use the canonical creative inventory texture`);
}

console.log('creative catalog block classification + canonical GUI assets: PASS');
