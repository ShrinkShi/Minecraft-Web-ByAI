import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {FURNACE_SLOT} from '../src/smelting.js';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';
import {FurnaceRuntimeController} from '../server/furnace-runtime-controller.mjs';

const session='s:furnace-damaged-fuel';
const target={x:0,y:64,z:-2};
const world={getBlock:(x,y,z)=>x===target.x&&y===target.y&&z===target.z?BLOCK.FURNACE:BLOCK.AIR};
const inventories=new ServerPlayerInventoryHub();
inventories.join(session,{mode:'survival'});
assert.equal(inventories.addStack(session,{id:'wooden_pickaxe',count:1,damage:23}),0);

const results=[];
const server={
  sendFurnaceContainerSnapshot:()=> 'snapshot',
  sendFurnaceContainerClose:()=> 'close',
  sendFurnaceTransactionResult:(_to,message)=>(results.push(message),'result')
};
const player={mode:'survival',position:{x:0,y:62.4,z:0}};
const controller=new FurnaceRuntimeController({
  world,inventories,getServer:()=>server,getPlayer:()=>player,
  replicateInventory:id=>({snapshot:inventories.snapshot(id),replicated:true})
});
controller.open(session,player,target);

inventories.click(session,0,0,false);
assert.deepEqual(inventories.snapshot(session).cursor,{id:'wooden_pickaxe',count:1,damage:23});
let inventoryRevision=inventories.snapshot(session).revision;
controller.handleTransaction({session,transaction:{session,requestId:0,target,expectedInventoryRevision:inventoryRevision,expectedContainerRevision:0,action:{type:'slot-click',slot:FURNACE_SLOT.FUEL,button:0,shift:false}}});
assert.equal(results.at(-1).ok,true);
assert.equal(results.at(-1).code,'placed');
assert.equal(inventories.snapshot(session).cursor,null);
assert.deepEqual(controller.hub.snapshot(target).slots[FURNACE_SLOT.FUEL],{id:'wooden_pickaxe',count:1,damage:23},'cursor -> furnace must preserve durability metadata');

inventoryRevision=inventories.snapshot(session).revision;
controller.handleTransaction({session,transaction:{session,requestId:1,target,expectedInventoryRevision:inventoryRevision,expectedContainerRevision:1,action:{type:'slot-click',slot:FURNACE_SLOT.FUEL,button:0,shift:false}}});
assert.equal(results.at(-1).ok,true);
assert.equal(results.at(-1).code,'picked-up');
assert.deepEqual(inventories.snapshot(session).cursor,{id:'wooden_pickaxe',count:1,damage:23},'furnace -> cursor must preserve durability metadata');
assert.equal(controller.hub.snapshot(target).slots[FURNACE_SLOT.FUEL],null);

controller.close();
inventories.close();
console.log('furnace controller preserves damaged fuel item metadata across cursor transactions: PASS');
