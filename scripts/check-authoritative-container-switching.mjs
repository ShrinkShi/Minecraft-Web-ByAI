import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';
import {WorkbenchRuntimeController} from '../server/workbench-runtime-controller.mjs';
import {FurnaceRuntimeController} from '../server/furnace-runtime-controller.mjs';

const session='s:container-switch',workbenchTarget={x:0,y:64,z:-2},furnaceTarget={x:1,y:64,z:-2};
const blocks=new Map([[`${workbenchTarget.x},${workbenchTarget.y},${workbenchTarget.z}`,BLOCK.CRAFTING_TABLE],[`${furnaceTarget.x},${furnaceTarget.y},${furnaceTarget.z}`,BLOCK.FURNACE]]),world={getBlock:(x,y,z)=>blocks.get(`${x},${y},${z}`)??BLOCK.AIR};
const inventories=new ServerPlayerInventoryHub();inventories.join(session,{mode:'survival'});inventories.add(session,'block:6',1);
const player={mode:'survival',position:{x:.5,y:62.4,z:0}},workbenchCloses=[],furnaceCloses=[];
const server={
  sendWorkbenchContainerSnapshot:()=> 'workbench-snapshot',sendWorkbenchContainerClose:(_session,message)=>(workbenchCloses.push(message),'workbench-close'),sendWorkbenchTransactionResult:()=> 'workbench-result',
  sendFurnaceContainerSnapshot:()=> 'furnace-snapshot',sendFurnaceContainerClose:(_session,message)=>(furnaceCloses.push(message),'furnace-close'),sendFurnaceTransactionResult:()=> 'furnace-result'
};
const replicateInventory=id=>({snapshot:inventories.snapshot(id),replicated:true});
const workbenches=new WorkbenchRuntimeController({world,inventories,getServer:()=>server,getPlayer:()=>player,replicateInventory,spawnOverflow:()=>{throw new Error('container switching should not overflow in this fixture');},containerIdFactory:()=> 'w:switch'});
const furnaces=new FurnaceRuntimeController({world,inventories,getServer:()=>server,getPlayer:()=>player,replicateInventory});

workbenches.open(session,player,workbenchTarget);assert.equal(workbenches.containerCoordinator.owner(session),'workbench');
inventories.click(session,0,0,false);assert.deepEqual(inventories.snapshot(session).cursor,{id:'block:6',count:1});const placed=workbenches.hub.state(session).clickInput(inventories.state(session),0,0,false);assert.equal(placed.changed,true);assert.equal(inventories.snapshot(session).cursor,null);assert.deepEqual(workbenches.hub.snapshot(session).slots[0],{id:'block:6',count:1});

furnaces.open(session,player,furnaceTarget);assert.equal(furnaces.containerCoordinator.owner(session),'furnace');assert.equal(workbenches.hub.has(session),false,'opening a furnace must close the authoritative workbench session');assert.equal(furnaces.openBySession.has(session),true);assert.equal(workbenchCloses.at(-1).reason,'switched-container');assert.equal(inventories.snapshot(session).slots.some(stack=>stack?.id==='block:6'&&stack.count===1),true,'workbench inputs must be returned before switching to furnace');assert.equal(inventories.snapshot(session).cursor,null);

workbenches.open(session,player,workbenchTarget);assert.equal(workbenches.containerCoordinator.owner(session),'workbench');assert.equal(furnaces.openBySession.has(session),false,'opening a workbench must remove the furnace viewer');assert.equal(furnaces.hub.has(furnaceTarget),true,'switching away from furnace must retain its world-cell state');assert.equal(furnaceCloses.at(-1).reason,'switched-container');assert.equal(workbenches.hub.has(session),true);

workbenches.closeCurrent(session,player,'client-closed');assert.equal(workbenches.containerCoordinator.owner(session),null);workbenches.close();furnaces.close();inventories.close();
console.log('server container coordinator prevents simultaneous workbench/furnace ownership and preserves close semantics: PASS');
