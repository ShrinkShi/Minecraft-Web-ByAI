import assert from 'node:assert/strict';
import {Inventory} from '../src/inventory.js';
import {CraftingGrid} from '../src/recipes.js';
import {executeCommand} from '../src/commands.js';
import {SpatialHash} from '../src/spatial-hash.js';
import {EntityStore} from '../src/entity-store.js';

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

testInventoryAndCrafting();testCommands();testSpatialHash();testEntityStore();await testMeshWorker();await testTerrainWorker();console.log('logic + worker checks: PASS');
