import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {CombatRuntimeController} from '../server/combat-runtime-controller.mjs';

let primary=true,blocked=false;const players=new Map([
  ['s:attacker',{session:'s:attacker',mode:'survival',position:{x:.5,y:0,z:.5},yaw:0,pitch:0,tick:1,voided:false}],
  ['s:target',{session:'s:target',mode:'survival',position:{x:.5,y:0,z:-1.5},yaw:Math.PI,pitch:0,tick:1,voided:false}]
]);
const authoritative={sessions:new Set(players.keys()),snapshot:session=>players.get(session)||null,getInputState:()=>({control:{primary},view:{yaw:0,pitch:0}})},world={getBlock:(x,y,z)=>blocked&&x===0&&y===1&&z===-1?BLOCK.STONE:BLOCK.AIR},noop={};
const controller=new CombatRuntimeController({world,authoritative,inventories:noop,equipments:noop,craftings:noop,workbenches:noop,itemEntities:noop,replicateInventory:()=>({replicated:true}),replicateEquipment:()=>({replicated:true}),replicateCrafting:()=>({replicated:true}),sendCombatSnapshot:()=>({sent:true})});controller.join('s:attacker');controller.join('s:target');
assert.equal(controller.heldPrimarySuppressesMining('s:attacker',players.get('s:attacker')),true,'held primary must not mine a block behind a visible player');primary=false;assert.equal(controller.heldPrimarySuppressesMining('s:attacker',players.get('s:attacker')),false,'releasing primary removes combat suppression');primary=true;blocked=true;assert.equal(controller.heldPrimarySuppressesMining('s:attacker',players.get('s:attacker')),false,'a nearer solid block occludes the player and returns ownership to ordinary mining');controller.hub.kill('s:target','survival');blocked=false;assert.equal(controller.heldPrimarySuppressesMining('s:attacker',players.get('s:attacker')),false,'dead players do not suppress mining');
console.log('held multiplayer primary cannot mine through a live player target: PASS');
