import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {ASSET_KEYS,ASSET_MANIFEST_VERSION,ASSET_SOURCE,assetAvailable,assetIsPrototype,assetManifestSnapshot,assetRecord,assetUrl,requireAssetUrl} from '../src/asset-manifest.js';
import {ITEMS} from '../src/items.js';

assert.equal(ASSET_MANIFEST_VERSION,2);
for(const key of [
  'terrain.block_atlas','block.iron_ore','block.white_wool','item.stick','item.wooden_pickaxe','item.stone_pickaxe','item.raw_iron',
  'item.leather_helmet','item.leather_chestplate','item.leather_leggings','item.leather_boots','item.raw_beef','item.leather','item.raw_mutton',
  'item.raw_porkchop','item.raw_chicken','item.feather','item.rotten_flesh','item.bone','item.arrow','item.gunpowder','item.string',
  'entity.bed.red','metadata.minecraft_runtime'
])assert.ok(ASSET_KEYS.includes(key),`${key} must be declared`);

for(const key of ASSET_KEYS){
  const record=assetRecord(key);assert.ok(record,`${key} must resolve to a manifest record`);assert.equal(record.source,ASSET_SOURCE.USER_SUPPLIED,`${key} must resolve from the user-supplied Minecraft archive`);
  assert.match(record.url,/^\.\/assets\//,`${key} must remain inside ./assets/`);
  assert.equal(existsSync(resolve(process.cwd(),record.url)),true,`${key} must point at a tracked runtime file`);
  assert.equal(assetAvailable(key),true,`${key} must be available`);
  assert.equal(assetIsPrototype(key),false,`${key} must not silently regress to prototype art`);
}

assert.equal(assetUrl('terrain.block_atlas'),'./assets/textures/atlas.png');
assert.equal(assetUrl('item.stick'),'./assets/items/stick.png');
assert.equal(assetUrl('item.wooden_pickaxe'),'./assets/items/wooden_pickaxe.png');
assert.equal(assetUrl('item.stone_pickaxe'),'./assets/items/stone_pickaxe.png');
assert.equal(assetUrl('item.raw_iron'),'./assets/items/raw_iron.png');
assert.equal(assetRecord('block.iron_ore').tile,14);
assert.equal(assetRecord('block.white_wool').tile,15);
assert.equal(assetUrl('entity.bed.red'),'./assets/minecraft/textures/entity/bed/red.png');
assert.throws(()=>assetRecord(''),TypeError);

for(const itemId of ['stick','wooden_pickaxe','leather_helmet','leather_chestplate','leather_leggings','leather_boots','raw_beef','leather','raw_mutton','raw_porkchop','raw_chicken','feather','rotten_flesh','bone','arrow','gunpowder','string']){
  const item=ITEMS[itemId];assert.ok(item?.assetKey,`${itemId} must use a logical asset key`);assert.equal(item.texture,requireAssetUrl(item.assetKey),`${itemId} must resolve through asset manifest`);
}
assert.equal(ITEMS.white_wool.assetKey,'block.white_wool');
assert.equal(ITEMS.white_wool.tile,15);
assert.equal(ITEMS.bed.entityAssetKey,'entity.bed.red');

const snapshot=assetManifestSnapshot();
assert.equal(Object.isFrozen(snapshot),true);assert.equal(Object.isFrozen(snapshot['item.stick']),true);
assert.equal(snapshot['terrain.block_atlas'].source,ASSET_SOURCE.USER_SUPPLIED);
assert.equal(snapshot['item.stone_pickaxe'].source,ASSET_SOURCE.USER_SUPPLIED);

console.log('logical asset manifest + user-supplied Minecraft runtime bindings: PASS');
