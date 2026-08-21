import {BLOCK,WORLD_HEIGHT} from '../src/blocks.js';
import {resolveToolSecondaryAction,toolActionFaceY} from '../src/tool-secondary-actions.js';

function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('tool secondary action requires an explicit setBlock mutation boundary');return value;}
function mutation(value){if(!value||typeof value!=='object'||typeof value.changed!=='boolean')throw new TypeError('block mutation must return a change result');return value;}
function targetLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isInteger(value.x)||!Number.isInteger(value.y)||!Number.isInteger(value.z)||!Number.isInteger(value.id))throw new TypeError('tool secondary target must expose integer x/y/z/id');return value;}

export function applyAuthoritativeToolSecondaryAction(world,target,{itemId,setBlock}={}){
  world=worldLike(world);target=targetLike(target);const mutate=mutationBoundary(setBlock);
  const currentId=world.getBlock(target.x,target.y,target.z);
  if(currentId!==target.id)return Object.freeze({handled:true,changed:false,reason:'stale-target',plan:null,change:null});
  const aboveId=target.y+1<WORLD_HEIGHT?world.getBlock(target.x,target.y+1,target.z):BLOCK.AIR;
  const plan=resolveToolSecondaryAction({itemId,targetBlockId:currentId,aboveBlockId:aboveId,faceY:toolActionFaceY(target)});
  if(!plan)return Object.freeze({handled:false,changed:false,reason:'not-tool-action',plan:null,change:null});
  const change=mutation(mutate(target.x,target.y,target.z,plan.resultBlockId));
  return Object.freeze({handled:true,changed:change.changed,reason:change.changed?plan.kind:'mutation-declined',plan,change:change.changed?Object.freeze({...change}):null});
}
