import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {ASSET_KEYS,ASSET_MANIFEST_VERSION,ASSET_SOURCE,assetAvailable,assetIsPrototype,assetManifestSnapshot,assetRecord,assetUrl,requireAssetUrl} from '../src/asset-manifest.js';
import {ITEMS} from '../src/items.js';

assert.equal(ASSET_MANIFEST_VERSION,2);
for(const key of [
  'terrain.block_atlas','block.model_atlas','block.iron_ore','block.white_wool','block.glass','item.stick','item.wooden_pickaxe','item.stone_pickaxe','item.raw_iron',
  'item.leather_helmet','item.leather_chestplate','item.leather_leggings','item.leather_boots','item.raw_beef','item.leather','item.raw_mutton',
  'item.raw_porkchop','item.raw_chicken','item.feather','item.rotten_flesh','item.bone','item.arrow','item.gunpowder','item.string',
  'entity.bed.red','entity.cow','entity.sheep','entity.sheep_fur','entity.pig','entity.chicken','entity.zombie','entity.skeleton','entity.creeper','entity.spider','entity.player.steve',
  'metadata.minecraft_runtime','metadata.minecraft_model_atlas','metadata.minecraft_player'
])assert.ok(ASSET_KEYS.includes(key),`${key} must be declared`);

for(const key of ASSET_KEYS){
  const record=assetRecord(key);assert.ok(record,`${key} must resolve to a manifest record`);assert.equal(record.source,ASSET_SOURCE.USER_SUPPLIED,`${key} must resolve from the user-supplied original Minecraft source assets`);
  assert.match(record.url,/^\.\/assets\//,`${key} must remain inside ./assets/`);
  assert.equal(existsSync(resolve(process.cwd(),record.url)),true,`${key} must point at a tracked runtime file`);
  assert.equal(assetAvailable(key),true,`${key} must be available`);
  assert.equal(assetIsPrototype(key),false,`${key} must not silently regress to prototype art`);
}

assert.equal(assetUrl('terrain.block_atlas'),'./assets/textures/atlas.png');
assert.equal(assetUrl('block.model_atlas'),'./assets/model-textures/model-texture-atlas.png');
assert.equal(assetUrl('metadata.minecraft_model_atlas'),'./assets/model-textures/model-texture-atlas.json');
assert.equal(assetUrl('metadata.minecraft_player'),'./assets/minecraft/player-assets-manifest.json');
assert.equal(assetUrl('block.glass'),'./assets/items/glass.png');
assert.equal(assetUrl('item.stick'),'./assets/items/stick.png');
assert.equal(assetUrl('item.wooden_pickaxe'),'./assets/items/wooden_pickaxe.png');
assert.equal(assetUrl('item.stone_pickaxe'),'./assets/items/stone_pickaxe.png');
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

for(const itemId of ['stick','wooden_pickaxe','leather_helmet','leather_chestplate','leather_leggings','leather_boots','raw_beef','leather','raw_mutton','raw_porkchop','raw_chicken','feather','rotten_flesh','bone','arrow','gunpowder','string']){
  const item=ITEMS[itemId];assert.ok(item?.assetKey,`${itemId} must use a logical asset key`);assert.equal(item.texture,requireAssetUrl(item.assetKey),`${itemId} must resolve through asset manifest`);
}
assert.equal(ITEMS['block:20'].assetKey,'block.glass');
assert.equal(ITEMS['block:20'].texture,requireAssetUrl('block.glass'));
assert.equal(ITEMS['block:20'].blockPreview,'source-texture');
assert.equal(ITEMS.white_wool.assetKey,'block.white_wool');
assert.equal(ITEMS.white_wool.tile,15);
assert.equal(ITEMS.bed.entityAssetKey,'entity.bed.red');

const snapshot=assetManifestSnapshot();
assert.equal(Object.isFrozen(snapshot),true);assert.equal(Object.isFrozen(snapshot['item.stick']),true);
assert.equal(snapshot['terrain.block_atlas'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['block.model_atlas'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['block.glass'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['metadata.minecraft_model_atlas'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['metadata.minecraft_player'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['item.stone_pickaxe'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['entity.spider'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['entity.player.steve'].source,ASSET_SOURCE.USER_SUPPLIED);

console.log('logical asset manifest + original-Minecraft source-backed glass/runtime/entity/player/model-atlas bindings: PASS');