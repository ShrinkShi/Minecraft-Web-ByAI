import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {Inventory} from '../src/inventory.js';
import {SingleplayerFurnaceRuntime} from '../src/singleplayer-furnace-runtime.js';
import {FURNACE_SLOT,materializeSmeltingExperience} from '../src/smelting.js';

assert.equal(materializeSmeltingExperience(.7,()=>.69),1);
assert.equal(materializeSmeltingExperience(.7,()=>.7),0);
assert.equal(materializeSmeltingExperience(2.1,()=>.05),3);
assert.equal(materializeSmeltingExperience(2.1,()=>.5),2);

const target={x:3,y:32,z:-2};
let blockId=BLOCK.FURNACE,xp=0,dirty=0;
const dropped=[];
const world={getBlock:(x,y,z)=>x===target.x&&y===target.y&&z===target.z?blockId:0};
const inventory=new Inventory('survival');
assert.equal(inventory.addStack({id:'raw_iron',count:2}),0);
assert.equal(inventory.addStack({id:'block:5',count:1}),0);
const createRuntime=()=>new SingleplayerFurnaceRuntime({world,inventory,getMode:()=> 'survival',onChanged:()=>dirty++,onExperience:value=>xp+=value,onDrop:(stack,cell)=>dropped.push({stack,cell}),random:()=>.5});
let runtime=createRuntime();
assert.equal(runtime.open(target).opened,true);

assert.equal(inventory.click(0,0,false),true);
assert.equal(runtime.handle({type:'slot-click',slot:FURNACE_SLOT.INPUT,button:0,shift:false}).ok,true);
assert.deepEqual(runtime.snapshot().slots[FURNACE_SLOT.INPUT],{id:'raw_iron',count:2});
assert.equal(inventory.click(1,0,false),true);
assert.equal(runtime.handle({type:'slot-click',slot:FURNACE_SLOT.FUEL,button:0,shift:false}).ok,true);
assert.deepEqual(runtime.snapshot().slots[FURNACE_SLOT.FUEL],{id:'block:5',count:1});

runtime.update(5);
const halfway=runtime.snapshot();
assert.equal(halfway.lit,true);
assert.equal(halfway.cookProgress,100);
const saved=runtime.serialize();
runtime.close();runtime.dispose();

// VoxelWorld#getBlock returns 0 for an unloaded chunk. Restore must validate
// serialized Furnace data itself instead of interpreting that unknown 0 as
// proof that the saved Furnace block was removed.
blockId=0;
runtime=createRuntime();
assert.deepEqual(runtime.restore(saved),{restored:1,discarded:0});
assert.equal(runtime.snapshot(target).cookProgress,100);
assert.deepEqual(runtime.restore([{target:{x:'bad',y:0,z:0}}]),{restored:0,discarded:1});
blockId=BLOCK.FURNACE;
assert.equal(runtime.open(target).opened,true);
assert.equal(runtime.snapshot().cookProgress,100);
runtime.update(5);
assert.deepEqual(runtime.snapshot().slots[FURNACE_SLOT.OUTPUT],{id:'iron_ingot',count:1});
assert.equal(runtime.snapshot().slots[FURNACE_SLOT.INPUT].count,1);

const output=runtime.handle({type:'take-output',button:0,shift:false});
assert.equal(output.ok,true);
assert.equal(output.code,'output-taken');
assert.deepEqual(inventory.cursor,{id:'iron_ingot',count:1});
assert.equal(xp,1,'0.7 furnace XP should materialize to one point for random=0.5');
assert.equal(runtime.snapshot().storedExperience,0);

runtime.close();
assert.equal(runtime.open(target).opened,true,'closing the GUI must not delete world-cell state');
assert.equal(runtime.snapshot().slots[FURNACE_SLOT.INPUT].count,1);
blockId=0;
const broken=runtime.break(target);
assert.equal(broken.changed,true);
assert.equal(runtime.snapshot(),null);
assert.equal(dropped.length,1);
assert.deepEqual(dropped[0].stack,{id:'raw_iron',count:1});
assert.deepEqual(dropped[0].cell,target);
assert.ok(dirty>0);
runtime.dispose();

console.log('singleplayer furnace runtime persistence, unloaded-chunk restore, smelting, XP, close/reopen and break drain: PASS');
