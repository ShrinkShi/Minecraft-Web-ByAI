import {BLOCKS} from './blocks.js';
import {ITEMS} from './items.js';
import {toolMeetsBlockRequirement} from './tool-tier-rules.js';

export const CREATIVE_BREAK_DURATION_MS=70;
export const MIN_BREAK_DURATION_MS=120;
export const BASE_HARDNESS_DURATION_MS=900;

function blockDef(blockId){const block=BLOCKS[blockId];if(!block)throw new RangeError('mining block id must reference a known block');return block;}
function toolFor(itemId){return typeof itemId==='string'?ITEMS[itemId]?.tool||null:null;}
function effectiveToolKind(block){return block.effectiveTool||block.requires||null;}

export function miningToolMultiplier(blockId,itemId=null){
  const block=blockDef(blockId),tool=toolFor(itemId);if(!tool)return 1;if(effectiveToolKind(block)===tool.kind)return 2.5*tool.speed;return 1.2;
}

export function canHarvestBlock(blockId,itemId=null){return toolMeetsBlockRequirement(toolFor(itemId),blockDef(blockId));}

export function miningDurationMs(blockId,itemId=null,mode='survival'){
  const block=blockDef(blockId);if(mode==='creative')return CREATIVE_BREAK_DURATION_MS;if(mode==='adventure'||mode==='spectator')return Infinity;const rawHardness=Number.isFinite(block.hardness)?block.hardness:1;if(rawHardness<0)return Infinity;return Math.max(MIN_BREAK_DURATION_MS,rawHardness*BASE_HARDNESS_DURATION_MS/miningToolMultiplier(blockId,itemId));
}

export function miningProgressDelta(blockId,itemId,dtSeconds,mode='survival'){
  if(typeof dtSeconds!=='number'||!Number.isFinite(dtSeconds)||dtSeconds<0)throw new RangeError('mining dtSeconds must be a non-negative finite number');const duration=miningDurationMs(blockId,itemId,mode);return Number.isFinite(duration)&&duration>0?dtSeconds*1000/duration:0;
}
