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
  IRON_ORE:19,GLASS:20,FURNACE:21,
  // Player-created states are append-only and intentionally outside terrain generation.
  FARMLAND:24,DIRT_PATH:25,STRIPPED_OAK_LOG:26
});

export const BLOCKS = {
  0:{name:'空气',solid:false,transparent:true,hardness:0,tiles:[0,0,0],drops:null},
  1:{name:'草方块',solid:true,hardness:.6,tiles:[0,2,1],drops:'block:2',effectiveTool:'shovel'},
  2:{name:'泥土',solid:true,hardness:.5,tiles:[2,2,2],drops:'block:2',effectiveTool:'shovel'},
  3:{name:'石头',solid:true,hardness:1.5,tiles:[3,3,3],drops:'block:10',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood'},
  4:{name:'沙子',solid:true,hardness:.5,tiles:[4,4,4],drops:'block:4',effectiveTool:'shovel'},
  5:{name:'橡木木板',solid:true,hardness:2,tiles:[5,5,5],drops:'block:5',effectiveTool:'axe'},
  6:{name:'橡木原木',solid:true,hardness:2,tiles:[7,7,6],drops:'block:6',effectiveTool:'axe'},
  7:{name:'橡树树叶',solid:true,transparent:true,hardness:.2,tiles:[8,8,8],drops:null,effectiveTool:'hoe'},
  8:{name:'水',solid:false,liquid:true,transparent:true,hardness:100,tiles:[9,9,9],drops:null},
  9:{name:'工作台',solid:true,hardness:2.5,tiles:[10,5,11],faces:{top:10,bottom:5,east:11,north:12,south:11,west:12},drops:'block:9',effectiveTool:'axe'},
  10:{name:'圆石',solid:true,hardness:2,tiles:[13,13,13],drops:'block:10',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood'},
  // Normal rendering uses the source-backed Java 1.20.1 interpreted model.
  // Stone tiles are only a legacy fail-open fallback if model resources cannot initialize.
  19:{name:'铁矿石',solid:true,hardness:3,tiles:[3,3,3],drops:'raw_iron',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'stone'},
  // Glass is a solid full-cube for collision but renders through the interpreted
  // translucent model path. Stone is fail-open only; normal visuals never use it.
  20:{name:'玻璃',solid:true,transparent:true,hardness:.3,tiles:[3,3,3],drops:null},
  // Furnace interaction/state already lives in the authoritative furnace container
  // runtime. This registration makes the block a real placeable/minable world node;
  // normal visuals come from the source-backed interpreted Java model.
  21:{name:'熔炉',solid:true,hardness:3.5,tiles:[3,3,3],drops:'block:21',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood',interactive:true,interactionKind:'furnace'},
  // These states are created only by held-tool secondary actions. Their gameplay
  // identity/collision is real, but this PR deliberately keeps the legacy terrain
  // tiles as a visual fallback; canonical interpreted-model visuals are follow-up work.
  24:{name:'耕地',solid:true,hardness:.6,tiles:[2,2,2],drops:'block:2',effectiveTool:'shovel',fullCube:false},
  25:{name:'土径',solid:true,hardness:.65,tiles:[2,2,2],drops:'block:2',effectiveTool:'shovel',fullCube:false},
  26:{name:'去皮橡木原木',solid:true,hardness:2,tiles:[7,7,6],drops:'block:26',effectiveTool:'axe'}
};

for(const id of BED_BLOCK_IDS){
  const meta=bedBlockMeta(id);
  BLOCKS[id]={name:`床（${meta.part==='foot'?'脚端':'头端'}）`,solid:true,hardness:.2,tiles:[5,5,5],drops:'bed',bed:true,bedPart:meta.part,bedFacing:meta.facing,fullCube:false,renderKind:'bed'};
}

export function tileForFace(blockId,faceName){
  const block=BLOCKS[blockId]||BLOCKS[0];
  if(Number.isInteger(block.faces?.[faceName]))return block.faces[faceName];
  if(faceName==='top')return block.tiles[0];
  if(faceName==='bottom')return block.tiles[1];
  return block.tiles[2];
}
