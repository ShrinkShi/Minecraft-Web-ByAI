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
  'block:26':{name:'去皮橡木原木',stack:64,blockId:26,blockPreview:'source-faces',blockPreviewFaces:sourceFaces('block.stripped_oak_log_top','block.stripped_oak_log','block.stripped_oak_log')},
  'block:27':{name:'煤矿石',stack:64,blockId:27,tile:15,assetKey:'block.coal_ore'},
  stick:textured('木棍',64,'item.stick'),
  wooden_pickaxe:textured('木镐',1,'item.wooden_pickaxe',{attackDamage:2,combat:{attackSpeed:1.2,durabilityCost:2},tool:{kind:'pickaxe',tier:'wood',speed:2,durability:59}}),
  stone_pickaxe:textured('石镐',1,'item.stone_pickaxe',{attackDamage:3,combat:{attackSpeed:1.2,durabilityCost:2},tool:{kind:'pickaxe',tier:'stone',speed:4,durability:131}}),
  iron_pickaxe:textured('铁镐',1,'item.iron_pickaxe',{attackDamage:4,combat:{attackSpeed:1.2,durabilityCost:2},tool:{kind:'pickaxe',tier:'iron',speed:6,durability:250}}),
  wooden_sword:textured('木剑',1,'item.wooden_sword',{attackDamage:4,durability:59,combat:{attackSpeed:1.6,durabilityCost:1}}),
  stone_sword:textured('石剑',1,'item.stone_sword',{attackDamage:5,durability:131,combat:{attackSpeed:1.6,durabilityCost:1}}),
  iron_axe:textured('铁斧',1,'item.iron_axe',{attackDamage:9,combat:{attackSpeed:.9,durabilityCost:2},tool:{kind:'axe',tier:'iron',speed:6,durability:250}}),
  iron_shovel:textured('铁锹',1,'item.iron_shovel',{attackDamage:4.5,combat:{attackSpeed:1,durabilityCost:2},tool:{kind:'shovel',tier:'iron',speed:6,durability:250}}),
  iron_hoe:textured('铁锄',1,'item.iron_hoe',{attackDamage:1,combat:{attackSpeed:3,durabilityCost:2},tool:{kind:'hoe',tier:'iron',speed:6,durability:250}}),
  iron_sword:textured('铁剑',1,'item.iron_sword',{attackDamage:6,durability:250,combat:{attackSpeed:1.6,durabilityCost:1}}),
  raw_iron:textured('粗铁',64,'item.raw_iron'),
  iron_ingot:textured('铁锭',64,'item.iron_ingot'),
  coal:textured('煤炭',64,'item.coal'),
  apple:textured('苹果',64,'item.apple',{food:{nutrition:4,saturationModifier:.3}}),
  bread:textured('面包',64,'item.bread',{food:{nutrition:5,saturationModifier:.6}}),
  wheat_seeds:textured('小麦种子',64,'item.wheat_seeds',{plantKind:'wheat'}),
  wheat:textured('小麦',64,'item.wheat'),
  bed:{name:'床',stack:1,placeKind:'bed',itemPreview:'bed-model',entityAssetKey:'entity.bed.red'},
  leather_helmet:textured('皮革帽子',1,'item.leather_helmet',{armorSlot:'head',armorPoints:1,durability:55}),
  leather_chestplate:textured('皮革外套',1,'item.leather_chestplate',{armorSlot:'chest',armorPoints:3,durability:80}),
  leather_leggings:textured('皮革裤子',1,'item.leather_leggings',{armorSlot:'legs',armorPoints:2,durability:75}),
  leather_boots:textured('皮革靴子',1,'item.leather_boots',{armorSlot:'feet',armorPoints:1,durability:65}),
  iron_helmet:textured('铁头盔',1,'item.iron_helmet',{armorSlot:'head',armorPoints:2,durability:165}),
  iron_chestplate:textured('铁胸甲',1,'item.iron_chestplate',{armorSlot:'chest',armorPoints:6,durability:240}),
  iron_leggings:textured('铁护腿',1,'item.iron_leggings',{armorSlot:'legs',armorPoints:5,durability:225}),
  iron_boots:textured('铁靴子',1,'item.iron_boots',{armorSlot:'feet',armorPoints:2,durability:195}),
  raw_beef:textured('生牛肉',64,'item.raw_beef',{color:0xb7473f,food:{nutrition:3,saturationModifier:.3}}),
  cooked_beef:textured('牛排',64,'item.cooked_beef',{food:{nutrition:8,saturationModifier:.8}}),
  leather:textured('皮革',64,'item.leather',{color:0x8b5a2b}),
  white_wool:textured('白色羊毛',64,'block.white_wool',{color:0xf0eee7}),
  raw_mutton:textured('生羊肉',64,'item.raw_mutton',{color:0xc96868,food:{nutrition:2,saturationModifier:.3}}),
  cooked_mutton:textured('熟羊肉',64,'item.cooked_mutton',{food:{nutrition:6,saturationModifier:.8}}),
  raw_porkchop:textured('生猪排',64,'item.raw_porkchop',{color:0xe68f93,food:{nutrition:3,saturationModifier:.3}}),
  cooked_porkchop:textured('熟猪排',64,'item.cooked_porkchop',{food:{nutrition:8,saturationModifier:.8}}),
  raw_chicken:textured('生鸡肉',64,'item.raw_chicken',{color:0xe5c39f,food:{nutrition:2,saturationModifier:.3}}),
  cooked_chicken:textured('熟鸡肉',64,'item.cooked_chicken',{food:{nutrition:6,saturationModifier:.6}}),
  feather:textured('羽毛',64,'item.feather',{color:0xf1f1ed}),
  rotten_flesh:textured('腐肉',64,'item.rotten_flesh',{color:0x8d613a,food:{nutrition:4,saturationModifier:.1}}),
  bone:textured('骨头',64,'item.bone',{color:0xe8e2d3}),
  arrow:textured('箭',64,'item.arrow',{color:0xb8a17d}),
  gunpowder:textured('火药',64,'item.gunpowder',{color:0x646b60}),
  string:textured('线',64,'item.string',{color:0xe3e1dc})
};

// Keep the historical starter inventory stable. Progression content such as
// iron armor is registered and craftable/giveable without silently shifting
// existing authoritative/bootstrap starter-slot contracts.
export const CREATIVE_START=['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21'];
export const itemForBlock=blockId=>ITEMS[`block:${blockId}`]?`block:${blockId}`:BLOCKS[blockId]?.drops||null;
export const maxStack=itemId=>ITEMS[itemId]?.stack||64;
