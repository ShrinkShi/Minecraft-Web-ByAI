export const ASSET_MANIFEST_VERSION=2;

export const ASSET_SOURCE=Object.freeze({
  PROTOTYPE:'prototype',
  USER_SUPPLIED:'user-supplied',
  MISSING:'missing'
});

const supplied=(kind,url,extra={})=>Object.freeze({kind,source:ASSET_SOURCE.USER_SUPPLIED,url,...extra});

const GUI_FILES=Object.freeze({
  'gui.crosshair':'crosshair.png',
  'gui.hud_icons':'hud-icons.png',
  'gui.xp_background':'xp-background.png',
  'gui.xp_progress':'xp-progress.png',
  'gui.hotbar_left_cap':'hotbar-left-cap.png',
  'gui.hotbar_right_cap':'hotbar-right-cap.png',
  'gui.hotbar_selector':'hotbar-selector.png',
  'gui.inventory_panel':'inventory-panel.png',
  'gui.inventory_slot':'inventory-slot.png',
  ...Object.fromEntries(Array.from({length:9},(_,index)=>[`gui.hotbar_slot_${index}`,`hotbar-slot-${index}.png`]))
});
const GUI_RECORDS=Object.fromEntries(Object.entries(GUI_FILES).map(([key,file])=>[
  key,
  supplied('gui-sprite',`./assets/gui/${file}`,{minecraftVersion:'1.20.1'})
]));

const CANONICAL_ITEM_ROOT='./MC原版素材assets/minecraft/textures/item';
const CANONICAL_BLOCK_ROOT='./MC原版素材assets/minecraft/textures/block';
const CANONICAL_GUI_ROOT='./MC原版素材assets/minecraft/textures/gui/container';
const RECORDS=Object.freeze({
  'terrain.block_atlas':supplied('texture-atlas','./assets/textures/atlas.png',{minecraftVersion:'1.20.1'}),
  'block.model_atlas':supplied('texture-atlas','./assets/model-textures/model-texture-atlas.png',{minecraftVersion:'1.20.1'}),
  'block.iron_ore':supplied('atlas-tile','./assets/textures/atlas.png',{tile:14}),
  'block.coal_ore':supplied('atlas-tile','./assets/textures/atlas.png',{tile:15}),
  'block.white_wool':supplied('block-texture',`${CANONICAL_BLOCK_ROOT}/white_wool.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'block.glass':supplied('block-texture','./assets/items/glass.png',{minecraftVersion:'1.20.1'}),
  'block.furnace_top':supplied('block-texture','./assets/items/furnace_top.png',{minecraftVersion:'1.20.1'}),
  'block.furnace_side':supplied('block-texture','./assets/items/furnace_side.png',{minecraftVersion:'1.20.1'}),
  'block.furnace_front':supplied('block-texture','./assets/items/furnace_front.png',{minecraftVersion:'1.20.1'}),
  'block.stripped_oak_log':supplied('block-texture',`${CANONICAL_BLOCK_ROOT}/stripped_oak_log.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'block.stripped_oak_log_top':supplied('block-texture',`${CANONICAL_BLOCK_ROOT}/stripped_oak_log_top.png`,{minecraftVersion:'1.20.1',directCanonical:true}),

  'item.stick':supplied('item-texture','./assets/items/stick.png'),
  'item.wooden_pickaxe':supplied('item-texture','./assets/items/wooden_pickaxe.png'),
  'item.stone_pickaxe':supplied('item-texture','./assets/items/stone_pickaxe.png'),
  'item.wooden_sword':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/wooden_sword.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.stone_sword':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/stone_sword.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.bow':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/bow.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.iron_hoe':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/iron_hoe.png`,{minecraftVersion:'1.20.1',directCanonical:true,sha256:'4ed88a87c141168b4552041174e83105e5d5825ea9b96836dd4869c674848d69'}),
  'item.iron_pickaxe':supplied('item-texture','./assets/items/iron_pickaxe.png',{minecraftVersion:'1.20.1',sha256:'67305d8bd14e1d60633258f52055fce5aeaea7837c10e62d436fc16f163be627'}),
  'item.iron_axe':supplied('item-texture','./assets/items/iron_axe.png',{minecraftVersion:'1.20.1',sha256:'8dea40bac06c6f14bb0ad9e8b47de63250f6d6a46ae9439b85ddd1377f1edb49'}),
  'item.iron_shovel':supplied('item-texture','./assets/items/iron_shovel.png',{minecraftVersion:'1.20.1',sha256:'c9d36d59ec53ebc631bd24930f62087c316eef39bd237d8bb69cb2bb629dfae5'}),
  'item.iron_sword':supplied('item-texture','./assets/items/iron_sword.png',{minecraftVersion:'1.20.1',sha256:'ed1fa2f83955583e70a19791455d13989e8bd93b1d7240e775a57141022bed6b'}),
  'item.iron_helmet':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/iron_helmet.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.iron_chestplate':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/iron_chestplate.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.iron_leggings':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/iron_leggings.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.iron_boots':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/iron_boots.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.raw_iron':supplied('item-texture','./assets/items/raw_iron.png'),
  'item.iron_ingot':supplied('item-texture','./assets/items/iron_ingot.png'),
  'item.coal':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/coal.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.apple':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/apple.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.bread':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/bread.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.wheat_seeds':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/wheat_seeds.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.wheat':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/wheat.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.bone_meal':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/bone_meal.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.cooked_beef':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/cooked_beef.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.cooked_mutton':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/cooked_mutton.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.cooked_porkchop':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/cooked_porkchop.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.cooked_chicken':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/cooked_chicken.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'item.leather_helmet':supplied('item-texture','./assets/items/leather_helmet.png'),
  'item.leather_chestplate':supplied('item-texture','./assets/items/leather_chestplate.png'),
  'item.leather_leggings':supplied('item-texture','./assets/items/leather_leggings.png'),
  'item.leather_boots':supplied('item-texture','./assets/items/leather_boots.png'),
  'item.raw_beef':supplied('item-texture','./assets/items/raw_beef.png'),
  'item.leather':supplied('item-texture','./assets/items/leather.png'),
  'item.raw_mutton':supplied('item-texture','./assets/items/raw_mutton.png'),
  'item.raw_porkchop':supplied('item-texture','./assets/items/raw_porkchop.png'),
  'item.raw_chicken':supplied('item-texture','./assets/items/raw_chicken.png'),
  'item.feather':supplied('item-texture','./assets/items/feather.png'),
  'item.rotten_flesh':supplied('item-texture','./assets/items/rotten_flesh.png'),
  'item.bone':supplied('item-texture','./assets/items/bone.png'),
  'item.arrow':supplied('item-texture','./assets/items/arrow.png'),
  'item.gunpowder':supplied('item-texture','./assets/items/gunpowder.png'),
  'item.string':supplied('item-texture','./assets/items/string.png'),

  'entity.bed.red':supplied('entity-texture','./assets/minecraft/textures/entity/bed/red.png'),
  'entity.cow':supplied('entity-texture','./assets/minecraft/textures/entity/cow/cow.png'),
  'entity.sheep':supplied('entity-texture','./assets/minecraft/textures/entity/sheep/sheep.png'),
  'entity.sheep_fur':supplied('entity-texture','./assets/minecraft/textures/entity/sheep/sheep_fur.png'),
  'entity.pig':supplied('entity-texture','./assets/minecraft/textures/entity/pig/pig.png'),
  'entity.chicken':supplied('entity-texture','./assets/minecraft/textures/entity/chicken.png'),
  'entity.zombie':supplied('entity-texture','./assets/minecraft/textures/entity/zombie/zombie.png'),
  'entity.skeleton':supplied('entity-texture','./assets/minecraft/textures/entity/skeleton/skeleton.png'),
  'entity.creeper':supplied('entity-texture','./assets/minecraft/textures/entity/creeper/creeper.png'),
  'entity.spider':supplied('entity-texture','./assets/minecraft/textures/entity/spider/spider.png'),
  'entity.player.steve':supplied('entity-texture','./assets/minecraft/textures/entity/player/wide/steve.png',{minecraftVersion:'1.20.1'}),
  ...GUI_RECORDS,
  'gui.crafting_table_panel':supplied('gui-texture',`${CANONICAL_GUI_ROOT}/crafting_table.png`,{minecraftVersion:'1.20.1',directCanonical:true}),
  'metadata.minecraft_runtime':supplied('asset-metadata','./assets/minecraft/runtime-manifest.json'),
  'metadata.minecraft_model_atlas':supplied('asset-metadata','./assets/model-textures/model-texture-atlas.json',{minecraftVersion:'1.20.1'}),
  'metadata.minecraft_gui':supplied('asset-metadata','./assets/gui/gui-manifest.json',{minecraftVersion:'1.20.1'}),
  'metadata.minecraft_player':supplied('asset-metadata','./assets/minecraft/player-assets-manifest.json',{minecraftVersion:'1.20.1'})
});

export const ASSET_KEYS=Object.freeze(Object.keys(RECORDS));

function key(value){
  if(typeof value!=='string'||!value.trim())throw new TypeError('asset key must be a non-empty string');
  return value;
}

export function assetRecord(value){
  return RECORDS[key(value)]||null;
}

export function assetUrl(value){
  return assetRecord(value)?.url||null;
}

export function assetAvailable(value){
  return assetUrl(value)!==null;
}

export function assetIsPrototype(value){
  return assetRecord(value)?.source===ASSET_SOURCE.PROTOTYPE;
}

export function requireAssetUrl(value){
  const normalized=key(value),url=assetUrl(normalized);
  if(!url)throw new Error(`required asset is unavailable: ${normalized}`);
  return url;
}

export function assetManifestSnapshot(){
  return Object.freeze(Object.fromEntries(ASSET_KEYS.map(assetKey=>[assetKey,Object.freeze({...RECORDS[assetKey]})])));
}
