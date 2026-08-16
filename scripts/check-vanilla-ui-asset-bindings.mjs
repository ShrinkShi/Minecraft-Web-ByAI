import assert from 'node:assert/strict';
import {ASSET_SOURCE,assetManifestSnapshot,assetUrl} from '../src/asset-manifest.js';

const expected={
  'gui.hotbar':'./assets/gui/hotbar.png',
  'gui.hud_icons':'./assets/gui/hud-icons.png',
  'gui.inventory_slot':'./assets/gui/inventory-slot.png',
  'metadata.minecraft_gui':'./assets/gui/gui-manifest.json'
};
const snapshot=assetManifestSnapshot();
for(const [key,url] of Object.entries(expected)){
  assert.equal(assetUrl(key),url);
  assert.equal(snapshot[key].source,ASSET_SOURCE.USER_SUPPLIED);
  assert.equal(snapshot[key].minecraftVersion,'1.20.1');
}
console.log('logical source-backed vanilla GUI asset bindings: PASS');
