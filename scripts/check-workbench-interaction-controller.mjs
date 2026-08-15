import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {WorkbenchInteractionController} from '../server/workbench-interaction-controller.mjs';

const table={x:0,y:1,z:-2},world={getBlock:(x,y,z)=>x===table.x&&y===table.y&&z===table.z?BLOCK.CRAFTING_TABLE:BLOCK.AIR},opens=[];const controller=new WorkbenchInteractionController({world,onOpen:event=>(opens.push(event),{reason:'workbench-opened',containerId:'w:interaction'})});const player={mode:'survival',position:{x:.5,y:0,z:.5}},use={kind:'use',selectedSlot:0,view:{yaw:0,pitch:0}};
const opened=controller.step('s:interaction',player,[use])[0];assert.equal(opened.handled,true);assert.equal(opened.reason,'workbench-opened');assert.equal(opens.length,1);assert.deepEqual(opens[0].target,{x:0,y:1,z:-2,id:BLOCK.CRAFTING_TABLE,previous:{x:0,y:1,z:-1},distance:1.5});assert.equal(opens[0].action.selectedSlot,0,'workbench targeting must not depend on held inventory contents');
const noTable=new WorkbenchInteractionController({world:{getBlock:()=>BLOCK.AIR},onOpen:()=>{throw new Error('must not open');}});const miss=noTable.step('s:interaction',player,[use])[0];assert.equal(miss.handled,false);assert.equal(miss.reason,'no-target');
const spectator=controller.step('s:interaction',{...player,mode:'spectator'},[use])[0];assert.equal(spectator.handled,false);assert.equal(spectator.reason,'mode-not-interactive');assert.equal(opens.length,1);
console.log('workbench interaction priority works without selected-item dependency: PASS');
