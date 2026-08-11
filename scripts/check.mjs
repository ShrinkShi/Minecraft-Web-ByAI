import assert from 'node:assert/strict';
import {Inventory} from '../src/inventory.js';
import {CraftingGrid} from '../src/recipes.js';
import {executeCommand} from '../src/commands.js';
import {SpatialHash} from '../src/spatial-hash.js';
import {EntityStore} from '../src/entity-store.js';
import {PASSIVE_MOBS,HOSTILE_MOBS,choosePassiveMob,isNightTime,rollMobLoot,rollMobXp} from '../src/mobs.js';
import {canAttack,applyDamage,knockbackDirection} from '../src/combat.js';
import {xpToNextLevel,totalXpForLevel,levelForTotalXp,experienceState} from '../src/experience.js';

function testInventoryAndCrafting(){
  const inv=new Inventory('survival');assert.equal(inv.add('block:6',5),0);assert.equal(inv.slots[0].count,5);
  inv.click(0,2,false);assert.equal(inv.cursor.count,3);assert.equal(inv.slots[0].count,2);inv.click(1,2,false);assert.equal(inv.slots[1].count,1);assert.equal(inv.cursor.count,2);inv.returnCursor();assert.equal(inv.cursor,null);
  const g2=new CraftingGrid(2);g2.slots[0]={id:'block:6',count:1};let result=g2.refresh();assert.deepEqual(result,{id:'block:5',count:4});g2.consume();assert.equal(g2.slots[0],null);
  g2.slots=[{id:'block:5',count:1},{id:'block:5',count:1},{id:'block:5',count:1},{id:'block:5',count:1}];result=g2.refresh();assert.equal(result.id,'block:9');
  const g3=new CraftingGrid(3);g3.slots=[{id:'block:5',count:1},{id:'block:5',count:1},{id:'block:5',count:1},null,{id:'stick',count:1},null,null,{id:'stick',count:1},null];result=g3.refresh();assert.equal(result.id,'wooden_pickaxe');
}

function testCommands(){
  let mode='survival',time=0,weather='clear';const p={position:{x:1,y:2,z:3}},inventory=new Inventory('survival');
  const ctx={player:p,inventory,inventoryChanged(){},setMode:v=>mode=v,teleport:(x,y,z)=>p.position={x,y,z},setTime:v=>time=v,setWeather:v=>weather=v};
  assert.equal(executeCommand('/gamemode creative',ctx).ok,true);assert.equal(mode,'creative');
  assert.equal(executeCommand('/give oak_log 3',ctx).ok,true);assert.equal(inventory.slots[0].count,3);
  assert.equal(executeCommand('/tp ~1 70 ~-2',ctx).ok,true);assert.deepEqual(p.position,{x:2,y:70,z:1});
  executeCommand('/time set night',ctx);assert.equal(time,13000);executeCommand('/weather rain',ctx);assert.equal(weather,'rain');
}

function testSpatialHash(){
  const hash=new SpatialHash(8),a={name:'a'},b={name:'b'},c={name:'c'};
  hash.insert('a',0,0,a);hash.insert('b',20,0,b);hash.insert('c',-7,-7,c);
  assert.deepEqual(hash.queryRadius(0,0,7),[a]);
  assert.deepEqual(new Set(hash.queryAabb(-8,-8,1,1)),new Set([a,c]));
  assert.equal(hash.update('b',5,0,b),true);assert.equal(hash.queryRadius(0,0,7).length,2);
  assert.equal(hash.remove('a'),true);assert.deepEqual(hash.queryRadius(0,0,7),[b]);
  assert.equal(hash.size,2);assert.throws(()=>new SpatialHash(0),RangeError);assert.throws(()=>hash.queryRadius(0,0,-1),RangeError);
}

function testEntityStore(){
  const store=new EntityStore({cellSize:8});
  const cow=store.spawn('cow',{x:1,y:64,z:1},{hp:10,kind:'passive'}),zombie=store.spawn('zombie',{x:20,y:64,z:0},{hp:20,kind:'hostile'});
  assert.equal(store.size,2);assert.equal(store.get(cow.id).components.hp,10);
  const copy=store.getPosition(cow.id);copy.x=999;assert.equal(store.getPosition(cow.id).x,1);
  assert.deepEqual(store.nearby(0,0,6).map(e=>e.id),[cow.id]);
  assert.equal(store.setPosition(zombie.id,{x:4,y:64,z:0}),true);
  assert.deepEqual(new Set(store.nearby(0,0,6).map(e=>e.id)),new Set([cow.id,zombie.id]));
  assert.deepEqual(store.nearby(0,0,6,e=>e.components.kind==='hostile').map(e=>e.id),[zombie.id]);
  assert.equal(store.patchComponents(cow.id,{hp:7}),true);assert.equal(store.get(cow.id).components.hp,7);
  assert.equal(store.despawn(cow.id),true);assert.equal(store.has(cow.id),false);assert.equal(store.spatial.size,1);
  assert.equal(store.setPosition(999,{x:0,y:0,z:0}),false);store.clear();assert.equal(store.size,0);assert.equal(store.spatial.size,0);
}

function testMobRules(){
  assert.deepEqual(Object.keys(PASSIVE_MOBS),['cow','sheep','pig','chicken']);for(const def of Object.values(PASSIVE_MOBS)){assert.ok(def.hp>0);assert.ok(def.speed>0);assert.ok(def.width>0&&def.height>0);assert.ok(Array.isArray(def.loot));}
  assert.equal(choosePassiveMob(()=>0),'cow');assert.equal(choosePassiveMob(()=>.26),'sheep');assert.equal(choosePassiveMob(()=>.51),'pig');assert.equal(choosePassiveMob(()=>.99),'chicken');
  assert.deepEqual(Object.keys(HOSTILE_MOBS),['zombie']);assert.equal(HOSTILE_MOBS.zombie.hp,20);assert.ok(HOSTILE_MOBS.zombie.attackDamage>0);assert.ok(HOSTILE_MOBS.zombie.attackRange>0);
  assert.equal(isNightTime(12000),false);assert.equal(isNightTime(13000),true);assert.equal(isNightTime(22999),true);assert.equal(isNightTime(23000),false);assert.equal(isNightTime(37000),true);
  assert.deepEqual(rollMobLoot('cow',()=>0),[{id:'raw_beef',count:1}]);assert.deepEqual(rollMobLoot('cow',()=>.999),[{id:'raw_beef',count:3},{id:'leather',count:2}]);
  assert.deepEqual(rollMobLoot('unknown',()=>.5),[]);assert.equal(rollMobXp('zombie',()=>0),5);assert.equal(rollMobXp('cow',()=>0),1);assert.equal(rollMobXp('cow',()=>.999),3);
}

function testCombatRules(){
  assert.equal(canAttack(-Infinity,1000),true);assert.equal(canAttack(1000,1599),false);assert.equal(canAttack(1000,1600),true);
  const state={hp:20,hurtUntil:-Infinity};let result=applyDamage(state,3,1000);assert.equal(result.applied,true);assert.equal(state.hp,17);assert.equal(state.hurtUntil,1500);
  result=applyDamage(state,8,1200);assert.equal(result.applied,false);assert.equal(state.hp,17);result=applyDamage(state,20,1500);assert.equal(result.dead,true);assert.equal(state.hp,0);
  const k=knockbackDirection(0,0,3,4);assert.ok(Math.abs(k.x-.6)<1e-9);assert.ok(Math.abs(k.z-.8)<1e-9);assert.deepEqual(knockbackDirection(1,1,1,1),{x:0,z:1});
  assert.throws(()=>applyDamage({},0,0),RangeError);assert.throws(()=>canAttack(0,0,-1),RangeError);
}

function testExperienceRules(){
  assert.equal(xpToNextLevel(0),7);assert.equal(xpToNextLevel(15),37);assert.equal(xpToNextLevel(16),42);assert.equal(xpToNextLevel(30),112);assert.equal(xpToNextLevel(31),121);
  assert.equal(totalXpForLevel(0),0);assert.equal(totalXpForLevel(1),7);assert.equal(totalXpForLevel(16),352);assert.equal(totalXpForLevel(17),394);assert.equal(totalXpForLevel(31),1507);assert.equal(totalXpForLevel(32),1628);
  assert.equal(levelForTotalXp(0),0);assert.equal(levelForTotalXp(6),0);assert.equal(levelForTotalXp(7),1);assert.equal(levelForTotalXp(351),15);assert.equal(levelForTotalXp(352),16);assert.equal(levelForTotalXp(394),17);assert.equal(levelForTotalXp(1628),32);
  assert.deepEqual(experienceState(352),{total:352,level:16,into:0,needed:42,progress:0});const mid=experienceState(373);assert.equal(mid.level,16);assert.equal(mid.into,21);assert.equal(mid.progress,.5);
  assert.throws(()=>xpToNextLevel(-1),RangeError);assert.throws(()=>levelForTotalXp(-1),RangeError);
}

async function testMeshWorker(){
  const messages=[];globalThis.self={postMessage:m=>messages.push(m)};await import(`../src/mesh-worker.js?test=${Date.now()}`);
  const S=16,H=64,index=(x,y,z)=>x+S*(z+S*y);let arr=new Uint8Array(S*S*H);arr[index(3,10,4)]=3;
  self.onmessage({data:{type:'mesh',key:'0,0',cx:0,cz:0,version:1,data:arr.buffer,px:null,nx:null,pz:null,nz:null}});let out=messages.pop();assert.equal(new Uint32Array(out.indices).length,36);
  arr=new Uint8Array(S*S*H);arr[index(15,10,4)]=3;const px=new Uint8Array(S*S*H);px[index(0,10,4)]=3;
  self.onmessage({data:{type:'mesh',key:'0,0',cx:0,cz:0,version:2,data:arr.buffer,px:px.buffer,nx:null,pz:null,nz:null}});out=messages.pop();assert.equal(new Uint32Array(out.indices).length,30);
}

async function testTerrainWorker(){
  const messages=[];globalThis.self={postMessage:m=>messages.push(m)};await import(`../src/world-worker.js?test=${Date.now()+1}`);
  self.onmessage({data:{type:'init',seed:'test-seed',prompt:'森林丘陵'}});assert.equal(messages.shift().type,'ready');self.onmessage({data:{type:'generate',cx:0,cz:0}});const out=messages.shift(),data=new Uint8Array(out.data);assert.equal(data.length,16*16*64);assert.ok(data.some(v=>v===3));assert.ok(data.some(v=>v===1||v===4));
}

testInventoryAndCrafting();testCommands();testSpatialHash();testEntityStore();testMobRules();testCombatRules();testExperienceRules();await testMeshWorker();await testTerrainWorker();console.log('logic + worker checks: PASS');
