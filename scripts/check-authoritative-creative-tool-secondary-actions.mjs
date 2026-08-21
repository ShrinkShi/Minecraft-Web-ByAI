import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {CreativeBlockUseController} from '../server/creative-block-use-controller.mjs';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';

const key=(x,y,z)=>`${x},${y},${z}`,cells=new Map(),world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};
const setBlock=(x,y,z,id)=>{const previous=world.getBlock(x,y,z);if(previous===id)return{changed:false,x,y,z,previous,id};cells.set(key(x,y,z),id);return{changed:true,x,y,z,previous,id};};
const session='c:tool-use',inventories=new ServerPlayerInventoryHub();inventories.join(session,{mode:'creative'});for(const id of ['iron_hoe','iron_axe','iron_shovel'])assert.equal(inventories.addPickup(session,id,1),0);
const controller=new CreativeBlockUseController({world,setBlock,inventories}),player={mode:'creative',position:{x:.5,y:1,z:.5}},slotFor=id=>inventories.snapshot(session).slots.findIndex(stack=>stack?.id===id)-HOTBAR_START,use=slot=>({kind:'use',selectedSlot:slot,view:{yaw:0,pitch:0}});
const revision=inventories.snapshot(session).revision;

for(const [itemId,input,output,reason] of [
  ['iron_hoe',BLOCK.GRASS,BLOCK.FARMLAND,'till'],
  ['iron_axe',BLOCK.LOG,BLOCK.STRIPPED_OAK_LOG,'strip'],
  ['iron_shovel',BLOCK.DIRT,BLOCK.DIRT_PATH,'flatten']
]){
  cells.set(key(0,2,-2),input);
  const [result]=controller.step(session,player,[use(slotFor(itemId))]);
  assert.equal(result.reason,reason);assert.equal(world.getBlock(0,2,-2),output);
  const stack=inventories.snapshot(session).slots.find(candidate=>candidate?.id===itemId);assert.equal(stack.damage,undefined,`${itemId} must not wear in creative`);
  assert.equal(inventories.snapshot(session).revision,revision,'creative tool actions must not mutate Inventory revision');
}
console.log('creative authoritative till + strip + flatten reuse shared mutation rules without durability wear: PASS');
