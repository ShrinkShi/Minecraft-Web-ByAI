import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';
import {FurnaceRuntimeController} from '../server/furnace-runtime-controller.mjs';

const session='s:furnace-a',second='s:furnace-b',target={x:0,y:64,z:-2},blocks=new Map([[`${target.x},${target.y},${target.z}`,BLOCK.FURNACE]]),world={getBlock:(x,y,z)=>blocks.get(`${x},${y},${z}`)??BLOCK.AIR};
const inventories=new ServerPlayerInventoryHub();inventories.join(session,{mode:'survival'});inventories.join(second,{mode:'survival'});inventories.add(session,'raw_iron',2);inventories.add(session,'block:5',1);
const snapshots=[],closes=[],results=[],experience=[];const server={sendFurnaceContainerSnapshot:(to,state)=>(snapshots.push({to,state}),'snapshot'),sendFurnaceContainerClose:(to,message)=>(closes.push({to,message}),'close'),sendFurnaceTransactionResult:(to,message)=>(results.push({to,message}),'result')};
const players=new Map([[session,{mode:'survival',position:{x:0,y:62.4,z:0}}],[second,{mode:'survival',position:{x:0,y:62.4,z:0}}]]);const controller=new FurnaceRuntimeController({world,inventories,getServer:()=>server,getPlayer:id=>players.get(id)||null,replicateInventory:id=>({snapshot:inventories.snapshot(id),replicated:true}),awardExperience:(id,amount)=>experience.push({id,amount})});
const tx=(requestId,expectedInventoryRevision,expectedContainerRevision,action)=>({session,requestId,target,expectedInventoryRevision,expectedContainerRevision,action});

let opened=controller.open(session,players.get(session),target);assert.equal(opened.reason,'furnace-opened');assert.equal(controller.hub.furnaceCount,1);assert.equal(snapshots.at(-1).state.revision,0);
inventories.click(session,0,0,false);let inventoryRevision=inventories.snapshot(session).revision;controller.handleTransaction({session,transaction:tx(1,inventoryRevision,0,{type:'slot-click',slot:0,button:0,shift:false})});assert.equal(results.at(-1).message.ok,true);assert.equal(results.at(-1).message.code,'placed');assert.deepEqual(controller.hub.snapshot(target).slots[0],{id:'raw_iron',count:2});assert.equal(inventories.snapshot(session).cursor,null);
inventories.click(session,1,0,false);inventoryRevision=inventories.snapshot(session).revision;controller.handleTransaction({session,transaction:tx(2,inventoryRevision,1,{type:'slot-click',slot:1,button:0,shift:false})});assert.equal(results.at(-1).message.code,'placed');assert.deepEqual(controller.hub.snapshot(target).slots[1],{id:'block:5',count:1});

const beforeClose=controller.hub.snapshot(target);controller.handleTransaction({session,transaction:tx(3,0,0,{type:'close'})});assert.equal(results.at(-1).message.code,'closed');assert.equal(controller.openBySession.has(session),false);assert.deepEqual(controller.hub.snapshot(target).slots,beforeClose.slots,'closing the GUI must not drain furnace contents');
const ticked=controller.tick(200);assert.equal(ticked.smelted,1);assert.equal(controller.hub.snapshot(target).revision,4,'fuel consumption and completed smelt are the only tick transaction mutations');assert.deepEqual(controller.hub.snapshot(target).slots,[{id:'raw_iron',count:1},null,{id:'iron_ingot',count:1}]);
opened=controller.open(session,players.get(session),target);assert.equal(opened.reason,'furnace-opened');assert.deepEqual(snapshots.at(-1).state.slots[2],{id:'iron_ingot',count:1});

inventoryRevision=inventories.snapshot(session).revision;controller.handleTransaction({session,transaction:tx(4,inventoryRevision,3,{type:'take-output',button:0,shift:false})});assert.equal(results.at(-1).message.ok,false);assert.equal(results.at(-1).message.code,'stale-revision');assert.deepEqual(controller.hub.snapshot(target).slots[2],{id:'iron_ingot',count:1});
controller.handleTransaction({session,transaction:tx(5,inventoryRevision,4,{type:'take-output',button:0,shift:false})});assert.equal(results.at(-1).message.code,'output-taken');assert.deepEqual(inventories.snapshot(session).cursor,{id:'iron_ingot',count:1});assert.equal(controller.hub.snapshot(target).slots[2],null);assert.equal(experience.length,1);assert.equal(experience[0].id,session);assert.equal(experience[0].amount,.7);

controller.open(second,players.get(second),target);const beforeBroadcast=snapshots.filter(entry=>entry.to===second).length;controller.tick(1);assert.ok(snapshots.filter(entry=>entry.to===second).length>beforeBroadcast,'open viewers receive timer progress snapshots');controller.closeCurrent(second,'client-closed');assert.equal(controller.hub.furnaceCount,1,'closing the last viewer keeps the world furnace alive');
const breakOutcome=controller.handleBlockRemoved(target);assert.equal(breakOutcome.changed,true);assert.equal(controller.hub.furnaceCount,0);assert.equal(closes.some(entry=>entry.message.reason==='client-closed'),true);
controller.close();inventories.close();
console.log('authoritative furnace close persistence + stable revision + server tick + output ownership + viewer replication: PASS');
