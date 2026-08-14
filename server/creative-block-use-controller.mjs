import {assertClientSessionId} from '../src/client-input-envelope.js';
import {ITEMS} from '../src/items.js';
import {assertHotbarSlot} from '../src/inventory-layout.js';
import {applyAuthoritativeBlockPlacement} from './block-placement-rules.mjs';
import {DEFAULT_BLOCK_REACH,raycastAuthoritativeBlock} from './block-targeting.mjs';

export const DEFAULT_INTERACTION_ACTIONS_PER_TICK=4;

function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('setBlock must be a function');return value;}
function inventoryLike(value){if(!value||typeof value!=='object'||typeof value.selectedStack!=='function')throw new TypeError('inventories must expose selectedStack');return value;}
function reach(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>16)throw new RangeError('maxDistance must be greater than 0 and at most 16');return value;}
function playerLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.mode!=='string'||!value.position||typeof value.position!=='object')throw new TypeError('player state must expose mode and position');return value;}
function actionLike(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.kind!=='string')throw new TypeError('interaction action must be an object');
  if(value.kind!=='use')return{kind:value.kind};
  const view=value.view;if(!view||typeof view!=='object'||Array.isArray(view)||typeof view.yaw!=='number'||!Number.isFinite(view.yaw)||typeof view.pitch!=='number'||!Number.isFinite(view.pitch))throw new TypeError('use action must expose a finite referenced view');
  return{kind:'use',selectedSlot:assertHotbarSlot(value.selectedSlot,'use action selectedSlot'),view:{yaw:view.yaw,pitch:view.pitch}};
}
const frozen=value=>Object.freeze(value);

export class CreativeBlockUseController{
  constructor({world,setBlock,inventories,maxDistance=DEFAULT_BLOCK_REACH}={}){
    this.world=worldLike(world);this.setBlock=mutationBoundary(setBlock);this.inventories=inventoryLike(inventories);this.maxDistance=reach(maxDistance);
  }

  step(session,player,actions=[]){
    session=assertClientSessionId(session);player=playerLike(player);if(!Array.isArray(actions))throw new TypeError('interaction actions must be an array');
    const results=[];
    for(const raw of actions){
      const action=actionLike(raw);
      if(action.kind!=='use'){results.push(frozen({kind:action.kind,attempted:false,reason:'unsupported-action'}));continue;}
      if(player.mode!=='creative'){results.push(frozen({kind:'use',attempted:false,reason:'mode-not-creative',selectedSlot:action.selectedSlot}));continue;}
      const stack=this.inventories.selectedStack(session,action.selectedSlot);
      if(!stack){results.push(frozen({kind:'use',attempted:false,reason:'empty-hand',selectedSlot:action.selectedSlot}));continue;}
      const item=ITEMS[stack.id];
      if(!item?.blockId){results.push(frozen({kind:'use',attempted:false,reason:'item-not-placeable',selectedSlot:action.selectedSlot,itemId:stack.id}));continue;}
      const target=raycastAuthoritativeBlock(this.world,{position:player.position,yaw:action.view.yaw,pitch:action.view.pitch},{maxDistance:this.maxDistance});
      if(!target){results.push(frozen({kind:'use',attempted:true,reason:'no-target',selectedSlot:action.selectedSlot,itemId:stack.id,target:null,placement:null}));continue;}
      const placement=applyAuthoritativeBlockPlacement(this.world,target,{blockId:item.blockId,player,setBlock:this.setBlock});
      results.push(frozen({kind:'use',attempted:true,reason:placement.reason,selectedSlot:action.selectedSlot,itemId:stack.id,target,placement}));
    }
    return Object.freeze(results);
  }
}
