import {BLOCK} from './blocks.js';

export const TOOL_SECONDARY_ACTIONS=Object.freeze({
  TILL:'till',
  STRIP:'strip',
  FLATTEN:'flatten'
});

const ACTION_RULES=Object.freeze({
  iron_hoe:Object.freeze({kind:TOOL_SECONDARY_ACTIONS.TILL,targets:new Set([BLOCK.GRASS,BLOCK.DIRT]),result:BLOCK.FARMLAND,requiresOpenAbove:true,rejectBottomFace:true,durabilityCost:1}),
  iron_axe:Object.freeze({kind:TOOL_SECONDARY_ACTIONS.STRIP,targets:new Set([BLOCK.LOG]),result:BLOCK.STRIPPED_OAK_LOG,requiresOpenAbove:false,rejectBottomFace:false,durabilityCost:1}),
  iron_shovel:Object.freeze({kind:TOOL_SECONDARY_ACTIONS.FLATTEN,targets:new Set([BLOCK.GRASS,BLOCK.DIRT]),result:BLOCK.DIRT_PATH,requiresOpenAbove:true,rejectBottomFace:true,durabilityCost:1})
});

function blockId(value,label){if(!Number.isInteger(value)||value<0)throw new TypeError(`${label} must be a non-negative integer`);return value;}
function faceY(value){if(value===undefined||value===null)return 0;if(!Number.isInteger(value)||value<-1||value>1)throw new RangeError('tool action faceY must be -1, 0, or 1');return value;}

export function toolSecondaryActionRule(itemId){return ACTION_RULES[itemId]||null;}

export function resolveToolSecondaryAction({itemId,targetBlockId,aboveBlockId=BLOCK.AIR,faceY:rawFaceY=0}={}){
  const rule=toolSecondaryActionRule(itemId);if(!rule)return null;
  const target=blockId(targetBlockId,'tool action target block'),above=blockId(aboveBlockId,'tool action above block'),clickedFaceY=faceY(rawFaceY);
  if(!rule.targets.has(target))return null;
  if(rule.rejectBottomFace&&clickedFaceY<0)return null;
  if(rule.requiresOpenAbove&&above!==BLOCK.AIR)return null;
  return Object.freeze({kind:rule.kind,itemId,targetBlockId:target,resultBlockId:rule.result,durabilityCost:rule.durabilityCost});
}

export function toolActionFaceY(target){
  if(!target||typeof target!=='object')return 0;
  if(target.normal&&Number.isFinite(target.normal.y))return Math.max(-1,Math.min(1,Math.sign(target.normal.y)));
  if(target.previous&&Number.isFinite(target.previous.y)&&Number.isFinite(target.y))return Math.max(-1,Math.min(1,Math.sign(target.previous.y-target.y)));
  return 0;
}
