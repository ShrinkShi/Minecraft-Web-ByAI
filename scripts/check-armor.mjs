import assert from 'node:assert/strict';
import {Inventory} from '../src/inventory.js';
import {Equipment,EQUIPMENT_SLOTS} from '../src/equipment.js';
import {armorReduction,mitigateArmorDamage} from '../src/armor-rules.js';
import {executeCommand} from '../src/commands.js';

function testEquipmentSlots(){
  assert.deepEqual(EQUIPMENT_SLOTS,['head','chest','legs','feet']);
  const inventory=new Inventory('survival'),equipment=new Equipment();
  inventory.cursor={id:'leather_helmet',count:1};
  assert.equal(equipment.click('chest',inventory,0),false);assert.equal(inventory.cursor.id,'leather_helmet');
  assert.equal(equipment.click('head',inventory,0),true);assert.equal(inventory.cursor,null);assert.deepEqual(equipment.get('head'),{id:'leather_helmet',count:1});assert.equal(equipment.armorPoints(),1);
  assert.equal(equipment.click('head',inventory,0),true);assert.deepEqual(inventory.cursor,{id:'leather_helmet',count:1});assert.equal(equipment.get('head'),null);
  inventory.cursor={id:'leather_chestplate',count:1};assert.equal(equipment.click('chest',inventory,2),true);assert.equal(equipment.armorPoints(),3);
}

function testEquipmentSnapshotAndDrain(){
  const snapshot={slots:{head:{id:'leather_helmet',count:1},chest:{id:'leather_chestplate',count:1},legs:{id:'leather_leggings',count:1},feet:{id:'leather_boots',count:1}}};
  const equipment=new Equipment(snapshot);assert.equal(equipment.armorPoints(),7);assert.deepEqual(equipment.snapshot(),snapshot);
  const restored=new Equipment({slots:{head:{id:'leather_chestplate',count:1},chest:{id:'leather_chestplate',count:99},legs:{id:'block:1',count:1},feet:{id:'leather_boots',count:1}}});
  assert.equal(restored.get('head'),null);assert.deepEqual(restored.get('chest'),{id:'leather_chestplate',count:1});assert.equal(restored.get('legs'),null);assert.deepEqual(restored.get('feet'),{id:'leather_boots',count:1});
  const drained=equipment.drain();assert.deepEqual(drained,[{id:'leather_helmet',count:1},{id:'leather_chestplate',count:1},{id:'leather_leggings',count:1},{id:'leather_boots',count:1}]);assert.equal(equipment.armorPoints(),0);assert.ok(EQUIPMENT_SLOTS.every(slot=>equipment.get(slot)===null));
}

function testArmorRules(){
  assert.equal(armorReduction(0),0);assert.ok(Math.abs(armorReduction(7)-.28)<1e-12);assert.equal(armorReduction(20),.8);assert.equal(armorReduction(40),.8);
  assert.equal(mitigateArmorDamage(10,0),10);assert.ok(Math.abs(mitigateArmorDamage(10,7)-7.2)<1e-12);assert.ok(Math.abs(mitigateArmorDamage(10,20)-2)<1e-12);
  assert.throws(()=>armorReduction(-1),RangeError);assert.throws(()=>mitigateArmorDamage(-1,7),RangeError);assert.throws(()=>armorReduction(7,{perPoint:.04,maxReduction:2}),RangeError);
}

function testArmorGiveCommand(){
  const inventory=new Inventory('survival'),player={position:{x:0,y:64,z:0}};let changed=0;
  const ctx={player,inventory,inventoryChanged(){changed++;},setMode(){},teleport(){},setTime(){},setWeather(){}};
  const result=executeCommand('/give minecraft:leather_chestplate 1',ctx);assert.equal(result.ok,true);assert.deepEqual(inventory.slots[0],{id:'leather_chestplate',count:1});assert.equal(changed,1);
}

testEquipmentSlots();testEquipmentSnapshotAndDrain();testArmorRules();testArmorGiveCommand();console.log('equipment + armor checks: PASS');