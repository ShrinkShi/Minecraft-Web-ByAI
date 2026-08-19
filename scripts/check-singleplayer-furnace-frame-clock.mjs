import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {Inventory} from '../src/inventory.js';
import {SingleplayerFurnaceRuntime} from '../src/singleplayer-furnace-runtime.js';
import {FURNACE_SLOT} from '../src/smelting.js';

const target={x:0,y:32,z:-1};
const world={getBlock:(x,y,z)=>x===target.x&&y===target.y&&z===target.z?BLOCK.FURNACE:BLOCK.AIR};
const inventory=new Inventory('survival');
let now=0;
const runtime=new SingleplayerFurnaceRuntime({world,inventory,getMode:()=> 'survival',clock:()=>now});
assert.equal(runtime.open(target).opened,true);
const state=runtime.hub.state(target);
assert.equal(state.insert(FURNACE_SLOT.INPUT,{id:'raw_iron',count:2}).changed,true);
assert.equal(state.insert(FURNACE_SLOT.FUEL,{id:'block:5',count:2}).changed,true);

// The browser main loop protects player physics with a 50ms dt cap. At 10 FPS
// that capped value would otherwise advance Furnace time at only half real-time.
runtime.update(.05);
for(let frame=0;frame<100;frame++){
  now+=100;
  runtime.update(.05);
}
let snapshot=runtime.snapshot();
assert.equal(snapshot.slots[FURNACE_SLOT.OUTPUT]?.count,1,'10 seconds of active 10 FPS wall time must complete one 200-tick smelt despite the 50ms render dt cap');
assert.equal(snapshot.slots[FURNACE_SLOT.INPUT]?.count,1);

// A long suspension/pause must not be interpreted as offline Furnace progress.
const progressBeforeSuspend=snapshot.cookProgress;
now+=5_000;
runtime.update(.05);
snapshot=runtime.snapshot();
assert.equal(snapshot.slots[FURNACE_SLOT.OUTPUT]?.count,1,'a multi-second inactive gap must not instantly finish the next smelt');
assert.ok(snapshot.cookProgress-progressBeforeSuspend<=2,'resume catch-up must stay bounded after a long inactive gap');

runtime.dispose();
console.log('singleplayer furnace uses active wall-frame time below suspension threshold without render-FPS slowdown or offline catch-up: PASS');
