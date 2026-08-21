import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {ASSET_KEYS,ASSET_MANIFEST_VERSION,ASSET_SOURCE,assetAvailable,assetIsPrototype,assetManifestSnapshot,assetRecord,assetUrl,requireAssetUrl} from '../src/asset-manifest.js';
import {ITEMS} from '../src/items.js';

assert.equal(ASSET_MANIFEST_VERSION,2);
for(const key of [
  'terrain.block_atlas','block.model_atlas','block.iron_ore','block.white_wool','block.glass','block.stripped_oak_log','block.stripped_oak_log_top',
  'item.stick','item.wooden_pickaxe','item.stone_pickaxe','item.wooden_sword','item.stone_sword','item.bow','item.iron_hoe','item.iron_pickaxe','item.raw_iron',
  'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots',
  'item.leather_helmet','item.leather_chestplate','item.leather_leggings','item.leather_boots','item.raw_beef','item.leather','item.raw_mutton',
  'item.raw_porkchop','item.raw_chicken','item.feather','item.rotten_flesh','item.bone','item.arrow','item.gunpowder','item.string',
  'entity.bed.red','entity.cow','entity.sheep','entity.sheep_fur','entity.pig','entity.chicken','entity.zombie','entity.skeleton','entity.creeper','entity.spider','entity.player.steve',
  'gui.crafting_table_panel','metadata.minecraft_runtime','metadata.minecraft_model_atlas','metadata.minecraft_player'
])assert.ok(ASSET_KEYS.includes(key),`${key} must be declared`);

const DIRECT_CANONICAL_KEYS=new Set(['item.wooden_sword','item.stone_sword','item.bow','item.iron_hoe','item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','block.stripped_oak_log','block.stripped_oak_log_top','gui.crafting_table_panel']);
for(const key of ASSET_KEYS){
  const record=assetRecord(key);assert.ok(record,`${key} must resolve to a manifest record`);assert.equal(record.source,ASSET_SOURCE.USER_SUPPLIED,`${key} must resolve from the user-supplied original Minecraft source assets`);
  if(DIRECT_CANONICAL_KEYS.has(key)){
    assert.equal(record.directCanonical,true,`${key} must explicitly declare direct canonical usage`);
    if(key.startsWith('item.'))assert.match(record.url,/^\.\/MC原版素材assets\/minecraft\/textures\/item\/(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots)\.png$/,`${key} must stay on the audited canonical item path`);
    else if(key.startsWith('block.'))assert.match(record.url,/^\.\/MC原版素材assets\/minecraft\/textures\/block\/stripped_oak_log(?:_top)?\.png$/,`${key} must stay on the audited canonical block path`);
    else assert.match(record.url,/^\.\/MC原版素材assets\/minecraft\/textures\/gui\/container\/crafting_table\.png$/,`${key} must stay on the audited canonical GUI path`);
  }else{
    assert.equal(record.directCanonical,undefined,`${key} may not silently bypass the runtime asset boundary`);
    assert.match(record.url,/^\.\/assets\//,`${key} must remain inside ./assets/`);
  }
  assert.equal(existsSync(resolve(process.cwd(),record.url)),true,`${key} must point at a tracked runtime file`);
  assert.equal(assetAvailable(key),true,`${key} must be available`);
  assert.equal(assetIsPrototype(key),false,`${key} must not silently regress to prototype art`);
}

assert.equal(assetUrl('terrain.block_atlas'),'./assets/textures/atlas.png');
assert.equal(assetUrl('block.model_atlas'),'./assets/model-textures/model-texture-atlas.png');
assert.equal(assetUrl('metadata.minecraft_model_atlas'),'./assets/model-textures/model-texture-atlas.json');
assert.equal(assetUrl('metadata.minecraft_player'),'./assets/minecraft/player-assets-manifest.json');
assert.equal(assetUrl('block.glass'),'./assets/items/glass.png');
assert.equal(assetUrl('block.stripped_oak_log'),'./MC原版素材assets/minecraft/textures/block/stripped_oak_log.png');
assert.equal(assetUrl('block.stripped_oak_log_top'),'./MC原版素材assets/minecraft/textures/block/stripped_oak_log_top.png');
assert.equal(assetUrl('gui.crafting_table_panel'),'./MC原版素材assets/minecraft/textures/gui/container/crafting_table.png');
assert.equal(assetRecord('gui.crafting_table_panel').minecraftVersion,'1.20.1');
assert.equal(assetRecord('gui.crafting_table_panel').directCanonical,true);
assert.equal(assetUrl('item.stick'),'./assets/items/stick.png');
assert.equal(assetUrl('item.wooden_pickaxe'),'./assets/items/wooden_pickaxe.png');
assert.equal(assetUrl('item.stone_pickaxe'),'./assets/items/stone_pickaxe.png');
assert.equal(assetUrl('item.wooden_sword'),'./MC原版素材assets/minecraft/textures/item/wooden_sword.png');
assert.equal(assetUrl('item.stone_sword'),'./MC原版素材assets/minecraft/textures/item/stone_sword.png');
assert.equal(assetUrl('item.bow'),'./MC原版素材assets/minecraft/textures/item/bow.png');
assert.equal(assetUrl('item.iron_hoe'),'./MC原版素材assets/minecraft/textures/item/iron_hoe.png');
assert.equal(assetRecord('item.iron_hoe').minecraftVersion,'1.20.1');
assert.equal(assetRecord('item.iron_hoe').sha256,'4ed88a87c141168b4552041174e83105e5d5825ea9b96836dd4869c674848d69');
assert.equal(assetRecord('item.wooden_sword').minecraftVersion,'1.20.1');
assert.equal(assetRecord('item.stone_sword').minecraftVersion,'1.20.1');
assert.equal(assetRecord('item.bow').minecraftVersion,'1.20.1');
assert.equal(assetUrl('item.iron_helmet'),'./MC原版素材assets/minecraft/textures/item/iron_helmet.png');
assert.equal(assetUrl('item.iron_chestplate'),'./MC原版素材assets/minecraft/textures/item/iron_chestplate.png');
assert.equal(assetUrl('item.iron_leggings'),'./MC原版素材assets/minecraft/textures/item/iron_leggings.png');
assert.equal(assetUrl('item.iron_boots'),'./MC原版素材assets/minecraft/textures/item/iron_boots.png');
for(const key of ['item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots']){assert.equal(assetRecord(key).minecraftVersion,'1.20.1');assert.equal(assetRecord(key).directCanonical,true);}
assert.equal(assetUrl('item.iron_pickaxe'),'./assets/items/iron_pickaxe.png');
assert.equal(assetRecord('item.iron_pickaxe').minecraftVersion,'1.20.1');
assert.equal(assetRecord('item.iron_pickaxe').sha256,'67305d8bd14e1d60633258f52055fce5aeaea7837c10e62d436fc16f163be627');
assert.equal(assetUrl('item.raw_iron'),'./assets/items/raw_iron.png');
assert.equal(assetRecord('block.iron_ore').tile,14);
assert.equal(assetRecord('block.white_wool').tile,15);
assert.equal(assetUrl('entity.bed.red'),'./assets/minecraft/textures/entity/bed/red.png');
assert.equal(assetUrl('entity.cow'),'./assets/minecraft/textures/entity/cow/cow.png');
assert.equal(assetUrl('entity.sheep'),'./assets/minecraft/textures/entity/sheep/sheep.png');
assert.equal(assetUrl('entity.sheep_fur'),'./assets/minecraft/textures/entity/sheep/sheep_fur.png');
assert.equal(assetUrl('entity.pig'),'./assets/minecraft/textures/entity/pig/pig.png');
assert.equal(assetUrl('entity.chicken'),'./assets/minecraft/textures/entity/chicken.png');
assert.equal(assetUrl('entity.zombie'),'./assets/minecraft/textures/entity/zombie/zombie.png');
assert.equal(assetUrl('entity.skeleton'),'./assets/minecraft/textures/entity/skeleton/skeleton.png');
assert.equal(assetUrl('entity.creeper'),'./assets/minecraft/textures/entity/creeper/creeper.png');
assert.equal(assetUrl('entity.spider'),'./assets/minecraft/textures/entity/spider/spider.png');
assert.equal(assetUrl('entity.player.steve'),'./assets/minecraft/textures/entity/player/wide/steve.png');
assert.throws(()=>assetRecord(''),TypeError);

for(const itemId of ['stick','wooden_pickaxe','stone_pickaxe','wooden_sword','stone_sword','iron_hoe','iron_pickaxe','iron_helmet','iron_chestplate','iron_leggings','iron_boots','leather_helmet','leather_chestplate','leather_leggings','leather_boots','raw_beef','leather','raw_mutton','raw_porkchop','raw_chicken','feather','rotten_flesh','bone','arrow','gunpowder','string']){
  const item=ITEMS[itemId];assert.ok(item?.assetKey,`${itemId} must use a logical asset key`);assert.equal(item.texture,requireAssetUrl(item.assetKey),`${itemId} must resolve through asset manifest`);
}
assert.equal(ITEMS['block:20'].assetKey,'block.glass');
assert.equal(ITEMS['block:20'].texture,requireAssetUrl('block.glass'));
assert.equal(ITEMS['block:20'].blockPreview,'source-texture');
assert.equal(ITEMS['block:26'].blockPreview,'source-faces');
assert.deepEqual(ITEMS['block:26'].blockPreviewFaces,{top:requireAssetUrl('block.stripped_oak_log_top'),left:requireAssetUrl('block.stripped_oak_log'),right:requireAssetUrl('block.stripped_oak_log')});
assert.equal(ITEMS.white_wool.assetKey,'block.white_wool');
assert.equal(ITEMS.white_wool.tile,15);
assert.equal(ITEMS.bed.entityAssetKey,'entity.bed.red');
assert.equal(ITEMS.bed.itemPreview,'bed-model');
assert.equal(ITEMS.bed.texture,undefined,'bed item may not fall back to hand-drawn or third-party flat artwork');
assert.equal(Object.values(ITEMS).some(item=>typeof item?.texture==='string'&&item.texture.startsWith('data:image/')),false,'runtime items may not embed hand-drawn data-URI artwork when original Minecraft source presentation exists');

const snapshot=assetManifestSnapshot();
assert.equal(Object.isFrozen(snapshot),true);assert.equal(Object.isFrozen(snapshot['item.stick']),true);
assert.equal(snapshot['terrain.block_atlas'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['block.model_atlas'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['block.glass'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['metadata.minecraft_model_atlas'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['metadata.minecraft_player'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['item.stone_pickaxe'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['item.wooden_sword'].directCanonical,true);
assert.equal(snapshot['item.stone_sword'].directCanonical,true);
assert.equal(snapshot['item.bow'].directCanonical,true);
assert.equal(snapshot['item.iron_hoe'].directCanonical,true);
for(const key of ['item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots'])assert.equal(snapshot[key].directCanonical,true);
assert.equal(snapshot['block.stripped_oak_log'].directCanonical,true);
assert.equal(snapshot['block.stripped_oak_log_top'].directCanonical,true);
assert.equal(snapshot['gui.crafting_table_panel'].directCanonical,true);
assert.equal(snapshot['item.iron_pickaxe'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['entity.spider'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['entity.player.steve'].source,ASSET_SOURCE.USER_SUPPLIED);

console.log('logical asset manifest + original-Minecraft source-backed item/entity/player/gui/model presentation bindings: PASS');
