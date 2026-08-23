import {BLOCKS} from './blocks.js';

export function explosionDropForBlock(blockId){
  if(!Number.isInteger(blockId))throw new TypeError('explosion block id must be an integer');
  const block=BLOCKS[blockId];
  if(!block)return null;
  return typeof block.drops==='string'&&block.drops?block.drops:null;
}
