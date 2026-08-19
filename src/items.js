import {BLOCKS} from './blocks.js';
import {requireAssetUrl} from './asset-manifest.js';

const textured=(name,stack,assetKey,extra={})=>({name,stack,assetKey,texture:requireAssetUrl(assetKey),...extra});
const sourceFaces=(top,left,right)=>Object.freeze({top:requireAssetUrl(top),left:requireAssetUrl(left),right:requireAssetUrl(right)});

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
  'block:20':textured('玻璃',64,'block.glass',{blockId:20,blockPreview:'source-texture'}),
  'block:21':{name:'熔炉',stack:64,blockId:21,blockPreview:'source-faces',blockPreviewFaces:sourceFaces('block.furnace_top','block.furnace_side','block.furnace_front')},
  stick:textured('木棍',64,'item.stick'),
  wooden_pickaxe:textured('木镐',1,'item.wooden_pickaxe',{attackDamage:2,tool:{kind:'pickaxe',tier:'wood',speed:2,durability:59}}),
  stone_pickaxe:textured('石镐',1,'item.stone_pickaxe',{attackDamage:3,tool:{kind:'pickaxe',tier:'stone',speed:4,durability:131}}),
  iron_pickaxe:textured('铁镐',1,'item.iron_pickaxe',{attackDamage:4,tool:{kind:'pickaxe',tier:'iron',speed:6,durability:250}}),
  iron_axe:textured('铁斧',1,'item.iron_axe',{attackDamage:9,tool:{kind:'axe',tier:'iron',speed:6,durability:250}}),
  iron_shovel:textured('铁锹',1,'item.iron_shovel',{attackDamage:4.5,tool:{kind:'shovel',tier:'iron',speed:6,durability:250}}),
  raw_iron:textured('粗铁',64,'item.raw_iron'),
  iron_ingot:textured('铁锭',64,'item.iron_ingot'),
  bed:{name:'床',stack:1,placeKind:'bed',itemPreview:'bed-model',entityAssetKey:'entity.bed.red'},
  leather_helmet:textured('皮革帽子',1,'item.leather_helmet',{armorSlot:'head',armorPoints:1}),
  leather_chestplate:textured('皮革外套',1,'item.leather_chestplate',{armorSlot:'chest',armorPoints:3}),
  leather_leggings:textured('皮革裤子',1,'item.leather_leggings',{armorSlot:'legs',armorPoints:2}),
  leather_boots:textured('皮革靴子',1,'item.leather_boots',{armorSlot:'feet',armorPoints:1}),
  raw_beef:textured('生牛肉',64,'item.raw_beef',{color:0xb7473f}),
  leather:textured('皮革',64,'item.leather',{color:0x8b5a2b}),
  white_wool:{name:'白色羊毛',stack:64,color:0xf0eee7,tile:15,assetKey:'block.white_wool'},
  raw_mutton:textured('生羊肉',64,'item.raw_mutton',{color:0xc96868}),
  raw_porkchop:textured('生猪排',64,'item.raw_porkchop',{color:0xe68f93}),
  raw_chicken:textured('生鸡肉',64,'item.raw_chicken',{color:0xe5c39f}),
  feather:textured('羽毛',64,'item.feather',{color:0xf1f1ed}),
  rotten_flesh:textured('腐肉',64,'item.rotten_flesh',{color:0x8d613a}),
  bone:textured('骨头',64,'item.bone',{color:0xe8e2d3}),
  arrow:textured('箭',64,'item.arrow',{color:0xb8a17d}),
  gunpowder:textured('火药',64,'item.gunpowder',{color:0x646b60}),
  string:textured('线',64,'item.string',{color:0xe3e1dc})
};

// Preserve the historical starter slot order; new content is appended so
// existing authoritative/bootstrap slot contracts do not silently shift.
export const CREATIVE_START=['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21'];
export const itemForBlock=blockId=>ITEMS[`block:${blockId}`]?`block:${blockId}`:BLOCKS[blockId]?.drops||null;
export const maxStack=itemId=>ITEMS[itemId]?.stack||64;
