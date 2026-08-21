import assert from 'node:assert/strict';
import {Inventory} from '../src/inventory.js';
import {Equipment,EQUIPMENT_SLOTS} from '../src/equipment.js';
import {armorDurabilityDamage,armorReduction,effectiveArmorPoints,mitigateArmorDamage} from '../src/armor-rules.js';
import {executeCommand} from '../src/commands.js';

function close(actual,expected,label){assert.ok(Math.abs(actual-expected)<1e-12,`${label}: expected ${expected}, got ${actual}`);}

function testEquipmentSlots(){
  assert.deepEqual(EQUIPMENT_SLOTS,['head','chest','legs','feet']);
  const inventory=new Inventory('survival'),equipment=new Equipment();
  inventory.cursor={id:'iron_helmet',count:1,damage:7};
  assert.equal(equipment.click('chest',inventory,0),false);assert.equal(inventory.cursor.id,'iron_helmet');
  assert.equal(equipment.click('head',inventory,0),true);assert.equal(inventory.cursor,null);assert.deepEqual(equipment.get('head'),{id:'iron_helmet',count:1,damage:7});assert.equal(equipment.armorPoints(),2);
  assert.equal(equipment.click('head',inventory,0),true);assert.deepEqual(inventory.cursor,{id:'iron_helmet',count:1,damage:7});assert.equal(equipment.get('head'),null);
  inventory.cursor={id:'iron_chestplate',count:1,damage:9};assert.equal(equipment.click('chest',inventory,2),true);assert.equal(equipment.armorPoints(),6);assert.deepEqual(equipment.get('chest'),{id:'iron_chestplate',count:1,damage:9});
}

function testEquipmentSnapshotAndDrain(){
  const snapshot={slots:{head:{id:'leather_helmet',count:1,damage:5},chest:{id:'leather_chestplate',count:1,damage:6},legs:{id:'leather_leggings',count:1,damage:7},feet:{id:'leather_boots',count:1,damage:8}}};
  const equipment=new Equipment(snapshot);assert.equal(equipment.armorPoints(),7);assert.deepEqual(equipment.snapshot(),snapshot,'local equipment restore must preserve armor damage metadata');
  const restored=new Equipment({slots:{head:{id:'leather_chestplate',count:1},chest:{id:'leather_chestplate',count:99},legs:{id:'block:1',count:1},feet:{id:'leather_boots',count:1,damage:3}}});
  assert.equal(restored.get('head'),null);assert.equal(restored.get('chest'),null);assert.equal(restored.get('legs'),null);assert.deepEqual(restored.get('feet'),{id:'leather_boots',count:1,damage:3});
  const drained=equipment.drain();assert.deepEqual(drained,[{id:'leather_helmet',count:1,damage:5},{id:'leather_chestplate',count:1,damage:6},{id:'leather_leggings',count:1,damage:7},{id:'leather_boots',count:1,damage:8}]);assert.equal(equipment.armorPoints(),0);assert.ok(EQUIPMENT_SLOTS.every(slot=>equipment.get(slot)===null));
}

function testArmorRules(){
  assert.equal(effectiveArmorPoints(0,20),0);assert.equal(effectiveArmorPoints(10,0),0);close(effectiveArmorPoints(10,7),2,'7 armor vs 10 damage effective points');close(armorReduction(10,7),.08,'7 armor vs 10 damage reduction');close(mitigateArmorDamage(10,7),9.2,'7 armor vs 10 damage');close(effectiveArmorPoints(10,20),15,'20 armor vs 10 damage effective points');close(mitigateArmorDamage(10,20),4,'20 armor vs 10 damage');close(mitigateArmorDamage(100,20),84,'minimum 20% armor floor on heavy hit');
  assert.equal(armorDurabilityDamage(0),0);assert.equal(armorDurabilityDamage(1),1);assert.equal(armorDurabilityDamage(3.99),1);assert.equal(armorDurabilityDamage(4),1);assert.equal(armorDurabilityDamage(8),2);assert.equal(armorDurabilityDamage(20),5);
  assert.throws(()=>effectiveArmorPoints(-1,7),RangeError);assert.throws(()=>mitigateArmorDamage(-1,7),RangeError);assert.throws(()=>armorReduction(10,-1),RangeError);assert.throws(()=>armorDurabilityDamage(-1),RangeError);
}

function testArmorWear(){
  const equipment=new Equipment({slots:{head:{id:'iron_helmet',count:1,damage:10},chest:{id:'iron_chestplate',count:1},legs:{id:'iron_leggings',count:1,damage:20},feet:{id:'iron_boots',count:1}}});let events=0;equipment.subscribe(({source})=>{if(source==='armor-damage')events++;});
  const result=equipment.damageArmor(10);assert.equal(result.changed,true);assert.equal(result.wear,2);assert.equal(result.damaged.length,4);assert.deepEqual(result.broken,[]);assert.deepEqual(equipment.get('head'),{id:'iron_helmet',count:1,damage:12});assert.deepEqual(equipment.get('chest'),{id:'iron_chestplate',count:1,damage:2});assert.deepEqual(equipment.get('legs'),{id:'iron_leggings',count:1,damage:22});assert.deepEqual(equipment.get('feet'),{id:'iron_boots',count:1,damage:2});assert.equal(events,1);
  const breaking=new Equipment({slots:{head:{id:'iron_helmet',count:1,damage:164},chest:null,legs:null,feet:null}}),broken=breaking.damageArmor(1);assert.equal(broken.changed,true);assert.deepEqual(broken.broken,['head']);assert.equal(breaking.get('head'),null);assert.equal(breaking.armorPoints(),0);
}

function testArmorGiveCommand(){
  const inventory=new Inventory('survival'),player={position:{x:0,y:64,z:0}};let changed=0;
  const ctx={player,inventory,inventoryChanged(){changed++;},setMode(){},teleport(){},setTime(){},setWeather(){}};
  const result=executeCommand('/give minecraft:iron_chestplate 1',ctx);assert.equal(result.ok,true);assert.deepEqual(inventory.slots[0],{id:'iron_chestplate',count:1});assert.equal(changed,1);
}

testEquipmentSlots();testEquipmentSnapshotAndDrain();testArmorRules();testArmorWear();testArmorGiveCommand();console.log('equipment + Java armor mitigation + durability checks: PASS');
