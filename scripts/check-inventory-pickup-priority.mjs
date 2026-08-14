import assert from 'node:assert/strict';
import {Inventory} from '../src/inventory.js';
import {HOTBAR_START} from '../src/inventory-layout.js';

let inv=new Inventory('survival');assert.equal(inv.addPickup('stick',5),0);assert.deepEqual(inv.slots[HOTBAR_START],{id:'stick',count:5});assert.equal(inv.slots[0],null,'first ground pickup should enter hotbar before main inventory');

inv=new Inventory('survival');inv.slots[HOTBAR_START]={id:'stick',count:63};inv.slots[0]={id:'stick',count:20};assert.equal(inv.addPickup('stick',2),0);assert.equal(inv.slots[HOTBAR_START].count,64);assert.deepEqual(inv.slots[HOTBAR_START+1],{id:'stick',count:1},'pickup should use another hotbar slot before merging into main inventory');assert.equal(inv.slots[0].count,20);

inv=new Inventory('survival');for(let i=HOTBAR_START;i<36;i++)inv.slots[i]={id:'wooden_pickaxe',count:1};inv.slots[0]={id:'stick',count:20};assert.equal(inv.addPickup('stick',3),0);assert.equal(inv.slots[0].count,23,'full hotbar falls back to main inventory merging');

inv=new Inventory('survival');assert.equal(inv.add('stick',1),0);assert.deepEqual(inv.slots[0],{id:'stick',count:1});assert.equal(inv.slots[HOTBAR_START],null,'non-pickup add keeps existing main-inventory-first empty-slot semantics');
inv=new Inventory('survival');inv.slots[HOTBAR_START]={id:'stick',count:63};assert.equal(inv.add('stick',1),0);assert.equal(inv.slots[HOTBAR_START].count,64);assert.equal(inv.slots[0],null,'ordinary add must preserve the legacy global merge-before-empty behavior');
console.log('ground pickup hotbar priority + ordinary add compatibility: PASS');
