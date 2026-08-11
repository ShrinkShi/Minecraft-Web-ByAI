import assert from 'node:assert/strict';
import {Inventory} from '../src/inventory.js';
import {CraftingGrid} from '../src/recipes.js';
import {executeCommand} from '../src/commands.js';

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

testInventoryAndCrafting();testCommands();await testMeshWorker();await testTerrainWorker();console.log('logic + worker checks: PASS');
