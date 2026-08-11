export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 3;

export const BLOCK = Object.freeze({ AIR:0, GRASS:1, DIRT:2, STONE:3, SAND:4, PLANKS:5, LOG:6, LEAVES:7, WATER:8 });

export const BLOCKS = {
  0:{name:'空气',solid:false,transparent:true,hardness:0,tiles:[0,0,0]},
  1:{name:'草方块',solid:true,hardness:.6,tiles:[0,2,1]},
  2:{name:'泥土',solid:true,hardness:.5,tiles:[2,2,2]},
  3:{name:'石头',solid:true,hardness:1.5,tiles:[3,3,3]},
  4:{name:'沙子',solid:true,hardness:.5,tiles:[4,4,4]},
  5:{name:'橡木木板',solid:true,hardness:2,tiles:[5,5,5]},
  6:{name:'橡木原木',solid:true,hardness:2,tiles:[7,7,6]},
  7:{name:'橡树树叶',solid:true,transparent:true,hardness:.2,tiles:[8,8,8]},
  8:{name:'水',solid:false,liquid:true,transparent:true,hardness:100,tiles:[9,9,9]}
};

export const HOTBAR_DEFAULT = [
  {block:1,count:64},{block:2,count:64},{block:3,count:64},{block:4,count:64},{block:5,count:64},{block:6,count:64},{block:7,count:64},{block:8,count:64},null
];

export function tileForFace(blockId, faceName){
  const b=BLOCKS[blockId]||BLOCKS[0];
  if(faceName==='top') return b.tiles[0];
  if(faceName==='bottom') return b.tiles[1];
  return b.tiles[2];
}
