import assert from 'node:assert/strict';
import {CraftingGrid} from '../src/recipes.js';
import {Inventory} from '../src/inventory.js';

const grid=new CraftingGrid(2);grid.slots[0]={id:'wooden_pickaxe',count:1,damage:7};assert.deepEqual(grid.drain(),[{id:'wooden_pickaxe',count:1,damage:7}]);assert.equal(grid.slots.every(slot=>slot===null),true);
const inventory=new Inventory('survival');grid.slots[0]={id:'wooden_pickaxe',count:1,damage:11};assert.deepEqual(grid.clearTo(inventory),[]);assert.deepEqual(inventory.slots[0],{id:'wooden_pickaxe',count:1,damage:11},'closing crafting must not repair a worn tool');
const legacy=new Inventory('survival',{slots:[{id:'removed_mod_item',count:2},...Array(35).fill(null)]});assert.deepEqual(legacy.slots[0],{id:'removed_mod_item',count:2});const legacyGrid=new CraftingGrid(2);legacyGrid.slots[0]=legacy.removeAt(0,2);assert.deepEqual(legacyGrid.slots[0],{id:'removed_mod_item',count:2});assert.deepEqual(legacyGrid.clearTo(legacy),[]);assert.deepEqual(legacy.slots[0],{id:'removed_mod_item',count:2},'crafting close must preserve a legacy unknown local stack');
console.log('crafting grid drain/close preserves durability and legacy item instance state: PASS');
