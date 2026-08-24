import assert from 'node:assert/strict';
import {CREATIVE_START,ITEMS} from '../src/items.js';
import {CREATIVE_CATALOG_CATEGORIES,CREATIVE_CATALOG_ITEMS,creativeCatalogCategoryFor,listCreativeCatalog} from '../src/creative-catalog.js';

const historicalStarter=['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21'];
assert.deepEqual(CREATIVE_START,historicalStarter,'catalog work must not redefine the historical starter inventory');
assert.equal(Object.isFrozen(CREATIVE_CATALOG_CATEGORIES),true);
assert.equal(Object.isFrozen(CREATIVE_CATALOG_ITEMS),true);
const categoryIds=new Set(CREATIVE_CATALOG_CATEGORIES.map(category=>category.id));
assert.equal(categoryIds.size,CREATIVE_CATALOG_CATEGORIES.length,'creative catalog category ids must be unique');
for(const category of CREATIVE_CATALOG_CATEGORIES){assert.equal(Object.isFrozen(category),true);assert.equal(typeof category.label,'string');assert.ok(category.label.length>0);}

const registryIds=Object.keys(ITEMS),catalogIds=CREATIVE_CATALOG_ITEMS.map(entry=>entry.id);
assert.equal(catalogIds.length,registryIds.length,'creative catalog must cover the whole ITEMS registry');
assert.equal(new Set(catalogIds).size,catalogIds.length,'creative catalog must not duplicate registered items');
assert.deepEqual([...catalogIds].sort(),[...registryIds].sort(),'creative catalog ids must exactly match ITEMS');
for(const entry of CREATIVE_CATALOG_ITEMS){assert.equal(Object.isFrozen(entry),true);assert.equal(entry.name,ITEMS[entry.id].name);assert.equal(entry.stack,ITEMS[entry.id].stack);assert.ok(categoryIds.has(entry.category),`${entry.id} must use a known creative category`);}

for(const [itemId,category] of [['block:1','building'],['bed','building'],['wooden_pickaxe','tools'],['iron_axe','tools'],['iron_sword','combat'],['leather_helmet','combat'],['apple','food'],['wheat_seeds','nature'],['bone_meal','nature'],['iron_ingot','materials'],['stick','materials']])assert.equal(creativeCatalogCategoryFor(itemId),category,`${itemId} category`);
assert.equal(creativeCatalogCategoryFor('missing-item'),null);
assert.strictEqual(listCreativeCatalog(),CREATIVE_CATALOG_ITEMS,'unfiltered catalog should reuse the frozen canonical view');
assert.deepEqual(listCreativeCatalog({query:'铁剑'}).map(entry=>entry.id),['iron_sword']);
assert.deepEqual(listCreativeCatalog({query:'iron sword'}).map(entry=>entry.id),['iron_sword'],'search should tokenize normalized item ids');
assert.ok(listCreativeCatalog({category:'combat',query:'铁'}).some(entry=>entry.id==='iron_sword'));
assert.equal(listCreativeCatalog({category:'combat',query:'铁'}).some(entry=>entry.id==='iron_axe'),false,'tool metadata must win over combat metadata');
assert.ok(listCreativeCatalog({category:'building'}).every(entry=>entry.category==='building'));
assert.throws(()=>listCreativeCatalog({category:'unknown'}),RangeError);
assert.throws(()=>listCreativeCatalog({query:null}),TypeError);

console.log(`Creative catalog OK (${CREATIVE_CATALOG_ITEMS.length} items)`);
