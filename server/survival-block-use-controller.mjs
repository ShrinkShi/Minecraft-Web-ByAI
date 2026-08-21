import {BLOCK} from '../src/blocks.js';
import {isBedBlock} from '../src/bed-rules.js';
import {assertClientSessionId} from '../src/client-input-envelope.js';
import {ITEMS} from '../src/items.js';
import {assertHotbarSlot} from '../src/inventory-layout.js';
import {resolveToolSecondaryAction,toolActionFaceY} from '../src/tool-secondary-actions.js';
import {applyAuthoritativeBlockPlacement} from './block-placement-rules.mjs';
import {DEFAULT_BLOCK_REACH,raycastAuthoritativeBlock} from './block-targeting.mjs';

function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('setBlock must be a function');return value;}
function mutation(value){if(!value||typeof value!=='object'||typeof value.changed!=='boolean')throw new TypeError('block mutation must return a change result');return value;}
function inventoryLike(value){if(!value||typeof value!=='object'||typeof value.selectedStack!=='function'||typeof value.commitSelected!=='function'||typeof value.damageSelected!=='function')throw new TypeError('inventories must expose selectedStack, commitSelected and damageSelected');return value;}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function reach(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>16)throw new RangeError('maxDistance must be greater than 0 and at most 16');return value;}
function playerLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.mode!=='string'||!value.position||typeof value.position!=='object')throw new TypeError('player state must expose mode and position');return value;}
function actionLike(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.kind!=='string')throw new TypeError('interaction action must be an object');
  if(value.kind!=='use')return{kind:value.kind};
  const view=value.view;if(!view||typeof view!=='object'||Array.isArray(view)||typeof view.yaw!=='number'||!Number.isFinite(view.yaw)||typeof view.pitch!=='number'||!Number.isFinite(view.pitch))throw new TypeError('use action must expose a finite referenced view');
  return{kind:'use',selectedSlot:assertHotbarSlot(value.selectedSlot,'use action selectedSlot'),view:{yaw:view.yaw,pitch:view.pitch}};
}
const frozen=value=>Object.freeze(value);
const unsupportedInteractiveTarget=id=>id===BLOCK.CRAFTING_TABLE||isBedBlock(id);

export class SurvivalBlockUseController{
  constructor({world,setBlock,inventories,onInventoryChanged=()=>{},maxDistance=DEFAULT_BLOCK_REACH}={}){
    this.world=worldLike(world);this.setBlock=mutationBoundary(setBlock);this.inventories=inventoryLike(inventories);this.onInventoryChanged=callback(onInventoryChanged,'onInventoryChanged');this.maxDistance=reach(maxDistance);
  }

  toolAction(session,action,stack,target){
    const currentId=this.world.getBlock(target.x,target.y,target.z);if(currentId!==target.id)return frozen({kind:'use',attempted:true,reason:'stale-target',selectedSlot:action.selectedSlot,itemId:stack.id,target,toolAction:null,consumed:null});
    const aboveId=target.y+1<64?this.world.getBlock(target.x,target.y+1,target.z):BLOCK.AIR,plan=resolveToolSecondaryAction({itemId:stack.id,targetBlockId:currentId,aboveBlockId:aboveId,faceY:toolActionFaceY(target)});if(!plan)return null;
    const change=mutation(this.setBlock(target.x,target.y,target.z,plan.resultBlockId));if(!change.changed)return frozen({kind:'use',attempted:true,reason:'mutation-declined',selectedSlot:action.selectedSlot,itemId:stack.id,target,toolAction:plan,consumed:null});
    const wear=this.inventories.damageSelected(session,action.selectedSlot,stack.id,plan.durabilityCost);if(wear.changed){try{this.onInventoryChanged(session,wear.snapshot);}catch{}}
    return frozen({kind:'use',attempted:true,reason:plan.kind,selectedSlot:action.selectedSlot,itemId:stack.id,target,toolAction:plan,consumed:null,wear:Object.freeze({changed:wear.changed,broken:wear.broken,reason:wear.reason}),inventoryRevision:wear.snapshot.revision});
  }

  step(session,player,actions=[]){
    session=assertClientSessionId(session);player=playerLike(player);if(!Array.isArray(actions))throw new TypeError('interaction actions must be an array');const results=[];
    for(const raw of actions){
      const action=actionLike(raw);
      if(action.kind!=='use'){results.push(frozen({kind:action.kind,attempted:false,reason:'unsupported-action'}));continue;}
      if(player.mode!=='survival'){results.push(frozen({kind:'use',attempted:false,reason:'mode-not-survival',selectedSlot:action.selectedSlot}));continue;}
      const stack=this.inventories.selectedStack(session,action.selectedSlot);
      if(!stack){results.push(frozen({kind:'use',attempted:false,reason:'empty-hand',selectedSlot:action.selectedSlot}));continue;}
      const item=ITEMS[stack.id];
      const target=raycastAuthoritativeBlock(this.world,{position:player.position,yaw:action.view.yaw,pitch:action.view.pitch},{maxDistance:this.maxDistance});
      if(!target){results.push(frozen({kind:'use',attempted:true,reason:'no-target',selectedSlot:action.selectedSlot,itemId:stack.id,target:null,placement:null,consumed:null}));continue;}
      if(unsupportedInteractiveTarget(target.id)){results.push(frozen({kind:'use',attempted:false,reason:'interactive-target-unsupported',selectedSlot:action.selectedSlot,itemId:stack.id,target,placement:null,consumed:null}));continue;}
      const toolResult=this.toolAction(session,action,stack,target);if(toolResult){results.push(toolResult);continue;}
      if(!item?.blockId){results.push(frozen({kind:'use',attempted:false,reason:'item-not-placeable',selectedSlot:action.selectedSlot,itemId:stack.id,target,placement:null,consumed:null}));continue;}
      const transaction=this.inventories.commitSelected(session,action.selectedSlot,stack.id,1,()=>applyAuthoritativeBlockPlacement(this.world,target,{blockId:item.blockId,player,setBlock:this.setBlock})),placement=transaction.result;
      if(transaction.committed){try{this.onInventoryChanged(session,transaction.snapshot);}catch{}results.push(frozen({kind:'use',attempted:true,reason:placement.reason,selectedSlot:action.selectedSlot,itemId:stack.id,target,placement,consumed:transaction.consumed,inventoryRevision:transaction.snapshot.revision}));continue;}
      results.push(frozen({kind:'use',attempted:true,reason:placement?.reason||transaction.reason,selectedSlot:action.selectedSlot,itemId:stack.id,target,placement:placement||null,consumed:null,inventoryRevision:transaction.snapshot.revision}));
    }
    return Object.freeze(results);
  }
}
