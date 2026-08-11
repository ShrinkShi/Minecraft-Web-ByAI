import {BLOCKS} from './blocks.js';

export const ITEMS={
  'block:1':{name:'草方块',stack:64,blockId:1,tile:0},
  'block:2':{name:'泥土',stack:64,blockId:2,tile:2},
  'block:3':{name:'石头',stack:64,blockId:3,tile:3},
  'block:4':{name:'沙子',stack:64,blockId:4,tile:4},
  'block:5':{name:'橡木木板',stack:64,blockId:5,tile:5},
  'block:6':{name:'橡木原木',stack:64,blockId:6,tile:7},
  'block:7':{name:'橡树树叶',stack:64,blockId:7,tile:8},
  'block:9':{name:'工作台',stack:64,blockId:9,tile:10},
  'block:10':{name:'圆石',stack:64,blockId:10,tile:13},
  stick:{name:'木棍',stack:64,texture:'./assets/items/stick.png'},
  wooden_pickaxe:{name:'木镐',stack:1,texture:'./assets/items/wooden_pickaxe.png',tool:{kind:'pickaxe',tier:'wood',speed:2,durability:59}}
};

export const CREATIVE_START=['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe'];
export const itemForBlock=blockId=>ITEMS[`block:${blockId}`]?`block:${blockId}`:BLOCKS[blockId]?.drops||null;
export const maxStack=itemId=>ITEMS[itemId]?.stack||64;
