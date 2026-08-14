import {BLOCKS} from './blocks.js';
import {requireAssetUrl} from './asset-manifest.js';

const solidIcon=hex=>`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='2' fill='%23${hex}'/%3E%3Crect x='2' y='2' width='12' height='12' fill='none' stroke='%23000000' stroke-opacity='.28'/%3E%3C/svg%3E`;
const armorIcon=(hex,part)=>`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='2' fill='%23${hex}'/%3E%3Cpath d='${part}' fill='%23d7a064' stroke='%235e3d20' stroke-width='1'/%3E%3C/svg%3E`;
const bedIcon=()=>`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect x='2' y='7' width='12' height='6' rx='1' fill='%23d85b5b' stroke='%235b2b2b'/%3E%3Crect x='2' y='6' width='4' height='4' rx='1' fill='%23f2eee6' stroke='%237a6f64'/%3E%3Crect x='2' y='13' width='2' height='2' fill='%237a4d2a'/%3E%3Crect x='12' y='13' width='2' height='2' fill='%237a4d2a'/%3E%3C/svg%3E`;

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
  stick:{name:'木棍',stack:64,assetKey:'item.stick',texture:requireAssetUrl('item.stick')},
  wooden_pickaxe:{name:'木镐',stack:1,assetKey:'item.wooden_pickaxe',texture:requireAssetUrl('item.wooden_pickaxe'),attackDamage:2,tool:{kind:'pickaxe',tier:'wood',speed:2,durability:59}},
  bed:{name:'床',stack:1,placeKind:'bed',texture:bedIcon()},
  leather_helmet:{name:'皮革帽子',stack:1,armorSlot:'head',armorPoints:1,texture:armorIcon('8b5a2b','M4 4h8l1 3-2 4H5L3 7z')},
  leather_chestplate:{name:'皮革外套',stack:1,armorSlot:'chest',armorPoints:3,texture:armorIcon('8b5a2b','M3 4l3-2h4l3 2-2 3v6H5V7z')},
  leather_leggings:{name:'皮革裤子',stack:1,armorSlot:'legs',armorPoints:2,texture:armorIcon('8b5a2b','M4 2h8v5l-2 7H8V8l-2 6H4z')},
  leather_boots:{name:'皮革靴子',stack:1,armorSlot:'feet',armorPoints:1,texture:armorIcon('8b5a2b','M4 3h3v7h3V3h2v9H8v-2H6v2H3V3z')},
  raw_beef:{name:'生牛肉',stack:64,color:0xb7473f,texture:solidIcon('b7473f')},
  leather:{name:'皮革',stack:64,color:0x8b5a2b,texture:solidIcon('8b5a2b')},
  white_wool:{name:'白色羊毛',stack:64,color:0xf0eee7,texture:solidIcon('f0eee7')},
  raw_mutton:{name:'生羊肉',stack:64,color:0xc96868,texture:solidIcon('c96868')},
  raw_porkchop:{name:'生猪排',stack:64,color:0xe68f93,texture:solidIcon('e68f93')},
  raw_chicken:{name:'生鸡肉',stack:64,color:0xe5c39f,texture:solidIcon('e5c39f')},
  feather:{name:'羽毛',stack:64,color:0xf1f1ed,texture:solidIcon('f1f1ed')},
  rotten_flesh:{name:'腐肉',stack:64,color:0x8d613a,texture:solidIcon('8d613a')},
  bone:{name:'骨头',stack:64,color:0xe8e2d3,texture:solidIcon('e8e2d3')},
  arrow:{name:'箭',stack:64,color:0xb8a17d,texture:solidIcon('b8a17d')},
  gunpowder:{name:'火药',stack:64,color:0x646b60,texture:solidIcon('646b60')},
  string:{name:'线',stack:64,color:0xe3e1dc,texture:solidIcon('e3e1dc')}
};

export const CREATIVE_START=['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed'];
export const itemForBlock=blockId=>ITEMS[`block:${blockId}`]?`block:${blockId}`:BLOCKS[blockId]?.drops||null;
export const maxStack=itemId=>ITEMS[itemId]?.stack||64;
