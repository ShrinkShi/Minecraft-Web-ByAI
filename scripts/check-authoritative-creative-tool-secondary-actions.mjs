import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {CreativeBlockUseController} from '../server/creative-block-use-controller.mjs';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';

const key=(x,y,z)=>`${x},${y},${z}`,cells=new Map(),world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};
const setBlock=(x,y,z,id)=>{const previous=world.getBlock(x,y,z);if(previous===id)return{changed:false,x,y,z,previous,id};cells.set(key(x,y,z),id);return{changed:true,x,y,z,previous,id};};
const session='c:tool-use',inventories=new ServerPlayerInventoryHub();inventories.join(session,{mode:'creative'});const controller=new CreativeBlockUseController({world,setBlock,inventories}),player={mode:'creative',position:{x:.5,y:1,z:.5}},use={kind:'use',selectedSlot:0,view:{yaw:0,pitch:0}};

for(const [itemId,input,output,reason] of [
  ['iron_hoe',BLOCK.GRASS,BLOCK.FARMLAND,'till'],
  ['iron_axe',BLOCK.LOG,BLOCK.STRIPPED_OAK_LOG,'strip'],
  ['iron_shovel',BLOCK.DIRT,BLOCK.DIRT_PATH,'flatten']
]){
  inventories.remove(session,HOTBAR_START,64);assert.equal(inventories.addPickup(session,itemId,1),0);assert.equal(inventories.selectedStack(session,0)?.id,itemId);
  cells.set(key(0,2,-2),input);const before=inventories.snapshot(session).revision;
  const [result]=controller.step(session,player,[use]);
  assert.equal(result.reason,reason);assert.equal(world.getBlock(0,2,-2),output);
  const stack=inventories.selectedStack(session,0);assert.equal(stack.id,itemId);assert.equal(stack.damage,undefined,`${itemId} must not wear in creative`);
  assert.equal(inventories.snapshot(session).revision,before,'creative tool actions must not mutate Inventory revision');
}
console.log('creative authoritative till + strip + flatten reuse shared mutation rules without durability wear: PASS');
