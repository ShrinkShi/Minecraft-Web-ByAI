import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {ASSET_KEYS,ASSET_MANIFEST_VERSION,ASSET_SOURCE,assetAvailable,assetIsPrototype,assetManifestSnapshot,assetRecord,assetUrl,requireAssetUrl} from '../src/asset-manifest.js';
import {ITEMS} from '../src/items.js';

assert.equal(ASSET_MANIFEST_VERSION,1);
assert.ok(ASSET_KEYS.includes('terrain.block_atlas'));
assert.ok(ASSET_KEYS.includes('item.stick'));
assert.ok(ASSET_KEYS.includes('item.wooden_pickaxe'));
assert.ok(ASSET_KEYS.includes('item.stone_pickaxe'));
assert.ok(ASSET_KEYS.includes('item.raw_iron'));
assert.ok(ASSET_KEYS.includes('block.iron_ore'));

for(const key of ASSET_KEYS){
  const record=assetRecord(key);assert.ok(record,`${key} must resolve to a manifest record`);assert.ok(Object.values(ASSET_SOURCE).includes(record.source));
  if(record.url!==null){
    assert.match(record.url,/^\.\/assets\//,`${key} must remain inside ./assets/`);
    assert.equal(existsSync(resolve(process.cwd(),record.url)),true,`${key} must point at a tracked runtime file`);
  }
}

assert.equal(assetUrl('terrain.block_atlas'),'./assets/textures/atlas.png');
assert.equal(assetUrl('item.stick'),'./assets/items/stick.png');
assert.equal(assetUrl('item.wooden_pickaxe'),'./assets/items/wooden_pickaxe.png');
assert.equal(assetIsPrototype('terrain.block_atlas'),true);
assert.equal(assetAvailable('item.stone_pickaxe'),false);
assert.equal(assetAvailable('item.raw_iron'),false);
assert.equal(assetAvailable('block.iron_ore'),false);
assert.equal(assetUrl('item.stone_pickaxe'),null);
assert.throws(()=>requireAssetUrl('item.stone_pickaxe'),/required asset is unavailable/);
assert.throws(()=>assetRecord(''),TypeError);

assert.equal(ITEMS.stick.assetKey,'item.stick');
assert.equal(ITEMS.stick.texture,requireAssetUrl(ITEMS.stick.assetKey));
assert.equal(ITEMS.wooden_pickaxe.assetKey,'item.wooden_pickaxe');
assert.equal(ITEMS.wooden_pickaxe.texture,requireAssetUrl(ITEMS.wooden_pickaxe.assetKey));

const snapshot=assetManifestSnapshot();
assert.equal(Object.isFrozen(snapshot),true);assert.equal(Object.isFrozen(snapshot['item.stick']),true);
assert.equal(snapshot['item.stone_pickaxe'].source,ASSET_SOURCE.MISSING);

console.log('logical asset manifest + explicit missing-resource contract: PASS');
