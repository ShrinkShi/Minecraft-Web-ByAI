import {BLOCKS} from './blocks.js';
import {ITEMS} from './items.js';
import {HOSTILE_MOBS,PASSIVE_MOBS} from './mobs.js';
import {minimumToolTier,toolMeetsBlockRequirement,toolTierLabel} from './tool-tier-rules.js';

const TOOL_NAMES=Object.freeze({pickaxe:'镐',axe:'斧',shovel:'锹',hoe:'锄',sword:'剑'});

function selectedTool(itemId){return itemId?ITEMS[itemId]?.tool||null:null;}
function dropName(dropId){return dropId?(ITEMS[dropId]?.name||dropId):null;}
function finiteHp(value){return Number.isFinite(value)?Math.max(0,value):0;}

export function inspectBlockTarget(blockId,{selectedItemId=null}={}){
  const block=BLOCKS[blockId];if(!block||blockId===0)return null;
  const requiredTool=block.requires||null,requiredToolTier=minimumToolTier(block),tool=selectedTool(selectedItemId),heldToolTier=tool?.tier||null,hasRequiredTool=toolMeetsBlockRequirement(tool,block);
  const canDrop=!!block.drops&&hasRequiredTool;
  return Object.freeze({
    kind:'block',id:blockId,name:block.name,source:'Minecraft Web By AI',tile:Number.isFinite(block.tiles?.[0])?block.tiles[0]:null,
    hardness:Number.isFinite(block.hardness)?block.hardness:null,
    requiredTool,requiredToolName:requiredTool?(TOOL_NAMES[requiredTool]||requiredTool):'任意',
    requiredToolTier,requiredToolTierName:toolTierLabel(requiredToolTier),
    heldTool:tool?.kind||null,heldToolTier,heldToolTierName:toolTierLabel(heldToolTier),toolCorrect:hasRequiredTool,
    hasDrop:!!block.drops,canDrop,dropId:block.drops||null,dropName:dropName(block.drops),
    liquid:!!block.liquid
  });
}

export function inspectMobTarget(entity){
  if(!entity||typeof entity!=='object')return null;const def=PASSIVE_MOBS[entity.type]||HOSTILE_MOBS[entity.type];if(!def)return null;
  const hp=finiteHp(entity.components?.hp),maxHp=finiteHp(def.hp);
  return Object.freeze({kind:'entity',id:entity.id??null,type:entity.type,name:def.name,source:'Minecraft Web By AI',hp,maxHp,healthRatio:maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):0,hostile:!!HOSTILE_MOBS[entity.type]});
}

export function chooseLookTargetInfo({blockHit=null,entityHit=null,selectedItemId=null}={}){
  const blockDistance=Number.isFinite(blockHit?.distance)?blockHit.distance:Infinity,entityDistance=Number.isFinite(entityHit?.distance)?entityHit.distance:Infinity;
  if(entityHit?.entity&&entityDistance<=blockDistance)return inspectMobTarget(entityHit.entity);
  if(blockHit)return inspectBlockTarget(blockHit.id,{selectedItemId});
  return null;
}
