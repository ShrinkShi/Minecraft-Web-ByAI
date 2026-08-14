import {BED_IDS,BED_BLOCK_IDS,bedBlockMeta} from './bed-rules.js';

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 4;

export const BLOCK = Object.freeze({
  AIR:0,GRASS:1,DIRT:2,STONE:3,SAND:4,PLANKS:5,LOG:6,LEAVES:7,WATER:8,CRAFTING_TABLE:9,COBBLESTONE:10,
  BED_NORTH_FOOT:BED_IDS.north.foot,BED_NORTH_HEAD:BED_IDS.north.head,
  BED_SOUTH_FOOT:BED_IDS.south.foot,BED_SOUTH_HEAD:BED_IDS.south.head,
  BED_WEST_FOOT:BED_IDS.west.foot,BED_WEST_HEAD:BED_IDS.west.head,
  BED_EAST_FOOT:BED_IDS.east.foot,BED_EAST_HEAD:BED_IDS.east.head,
  IRON_ORE:19
});

export const BLOCKS = {
  0:{name:'空气',solid:false,transparent:true,hardness:0,tiles:[0,0,0],drops:null},
  1:{name:'草方块',solid:true,hardness:.6,tiles:[0,2,1],drops:'block:2'},
  2:{name:'泥土',solid:true,hardness:.5,tiles:[2,2,2],drops:'block:2'},
  3:{name:'石头',solid:true,hardness:1.5,tiles:[3,3,3],drops:'block:10',requires:'pickaxe',minToolTier:'wood'},
  4:{name:'沙子',solid:true,hardness:.5,tiles:[4,4,4],drops:'block:4'},
  5:{name:'橡木木板',solid:true,hardness:2,tiles:[5,5,5],drops:'block:5'},
  6:{name:'橡木原木',solid:true,hardness:2,tiles:[7,7,6],drops:'block:6'},
  7:{name:'橡树树叶',solid:true,transparent:true,hardness:.2,tiles:[8,8,8],drops:null},
  8:{name:'水',solid:false,liquid:true,transparent:true,hardness:100,tiles:[9,9,9],drops:null},
  9:{name:'工作台',solid:true,hardness:2.5,tiles:[10,5,11],drops:'block:9'},
  10:{name:'圆石',solid:true,hardness:2,tiles:[13,13,13],drops:'block:10',requires:'pickaxe',minToolTier:'wood'},
  19:{name:'铁矿石',solid:true,hardness:3,tiles:[3,3,3],drops:'raw_iron',requires:'pickaxe',minToolTier:'stone',tint:[210,158,126]}
};

for(const id of BED_BLOCK_IDS){
  const meta=bedBlockMeta(id);
  BLOCKS[id]={name:`床（${meta.part==='foot'?'脚端':'头端'}）`,solid:true,hardness:.2,tiles:[5,5,5],drops:'bed',bed:true,bedPart:meta.part,bedFacing:meta.facing,tint:[255,118,118]};
}

export function tileForFace(blockId,faceName){
  const block=BLOCKS[blockId]||BLOCKS[0];
  if(faceName==='top')return block.tiles[0];
  if(faceName==='bottom')return block.tiles[1];
  return block.tiles[2];
}
