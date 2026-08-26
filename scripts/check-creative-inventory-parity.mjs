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
  ['gui.creative_tab_items','creative-tab-items.png'],
  ['gui.creative_tab_search','creative-tab-search.png'],
  ['gui.creative_tab_inventory','creative-tab-inventory.png']
]){
  const record=assetRecord(key);assert.ok(record,`${key} must be registered`);assert.equal(record.directCanonical,undefined);assert.equal(record.minecraftVersion,'1.20.1');assert.equal(requireAssetUrl(key),`./assets/gui/${file}`,`${key} must resolve through the deterministic GUI runtime boundary`);
}

console.log('creative catalog block classification + deterministic GUI assets: PASS');
