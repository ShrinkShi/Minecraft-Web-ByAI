import assert from 'node:assert/strict';
import {BLOCK,BLOCKS} from '../src/blocks.js';
import {ITEMS,CREATIVE_START,itemForBlock} from '../src/items.js';
import {ITEM_ALIASES} from '../src/commands.js';
import {assetUrl} from '../src/asset-manifest.js';
import {blockItemFaceTiles} from '../src/block-item-preview.js';
import {minecraftModelBlockDescriptor} from '../src/minecraft-model-registry.js';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';
import {SurvivalBlockUseController} from '../server/survival-block-use-controller.mjs';
import {SurvivalBlockBreakController} from '../server/survival-block-break-controller.mjs';

assert.equal(BLOCK.GLASS,20,'glass must append after the existing iron ore id');
assert.deepEqual({...BLOCKS[BLOCK.GLASS],tiles:undefined},{name:'玻璃',solid:true,transparent:true,hardness:.3,tiles:undefined,drops:null});
assert.equal(ITEMS['block:20'].name,'玻璃');
assert.equal(ITEMS['block:20'].stack,64);
assert.equal(ITEMS['block:20'].blockId,BLOCK.GLASS);
assert.equal(ITEMS['block:20'].assetKey,'block.glass');
assert.equal(ITEMS['block:20'].texture,assetUrl('block.glass'));
assert.equal(ITEMS['block:20'].blockPreview,false);
assert.equal(blockItemFaceTiles(ITEMS['block:20']),null,'glass item must not display the legacy stone fallback tile');
assert.equal(itemForBlock(BLOCK.GLASS),'block:20');
assert.equal(CREATIVE_START.at(-1),'block:20','new creative content must append without shifting historical starter slots');
assert.equal(ITEM_ALIASES.glass,'block:20');
assert.equal(ITEM_ALIASES['minecraft:glass'],'block:20');
const descriptor=minecraftModelBlockDescriptor(BLOCK.GLASS);
assert.equal(descriptor.blockstate,'minecraft:glass');
assert.equal(descriptor.renderLayer,'translucent');

{
  const cells=new Map(),key=(x,y,z)=>`${x},${y},${z}`;cells.set(key(0,2,-2),BLOCK.STONE);
  const world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};
  const setBlock=(x,y,z,id)=>{const k=key(x,y,z),previous=world.getBlock(x,y,z),changed=previous!==id;if(changed)cells.set(k,id);return{changed,x,y,z,previous,id};};
  const inventories=new ServerPlayerInventoryHub();inventories.join('s:glass-use',{mode:'survival'});assert.equal(inventories.addPickup('s:glass-use','block:20',2),0);
  const controller=new SurvivalBlockUseController({world,setBlock,inventories}),player={mode:'survival',position:{x:.5,y:1,z:.5}},use={kind:'use',selectedSlot:0,view:{yaw:0,pitch:0}};
  const [placed]=controller.step('s:glass-use',player,[use]);
  assert.equal(placed.reason,'placed');assert.equal(placed.placement.changed,true);assert.equal(placed.placement.id,BLOCK.GLASS);assert.deepEqual(placed.consumed,{id:'block:20',count:1});
  assert.equal(world.getBlock(0,2,-1),BLOCK.GLASS);assert.deepEqual(inventories.snapshot('s:glass-use').slots[HOTBAR_START],{id:'block:20',count:1});
}

{
  let block=BLOCK.GLASS;const drops=[];
  const world={getBlock(x,y,z){return x===0&&y===11&&z===-1?block:BLOCK.AIR;}};
  const setBlock=(x,y,z,id)=>{const previous=block,changed=x===0&&y===11&&z===-1&&previous!==id;if(changed)block=id;return{changed,x,y,z,previous,id};};
  const controller=new SurvivalBlockBreakController({world,setBlock,onDrop:drop=>drops.push(drop)}),session='s:glass-break',player={mode:'survival',position:{x:.5,y:10,z:.5},yaw:0,pitch:0};
  controller.observePrimary(session,true);let result=null;
  for(let tick=0;tick<20&&!result?.breakResult?.changed;tick++)result=controller.step(session,player,null,{dt:.05});
  assert.equal(result?.breakResult?.changed,true,'glass must be breakable by hand');assert.equal(block,BLOCK.AIR);assert.equal(result.drop,null,'ordinary glass break must not drop itself without Silk Touch');assert.deepEqual(drops,[]);
}

console.log('source-backed glass gameplay + authoritative placement/break contract: PASS');
