import assert from 'node:assert/strict';
import {ASSET_SOURCE,assetManifestSnapshot,assetUrl} from '../src/asset-manifest.js';

const expected={
  'gui.crosshair':'./assets/gui/crosshair.png',
  'gui.hud_icons':'./assets/gui/hud-icons.png',
  'gui.xp_background':'./assets/gui/xp-background.png',
  'gui.xp_progress':'./assets/gui/xp-progress.png',
  'gui.hotbar_left_cap':'./assets/gui/hotbar-left-cap.png',
  'gui.hotbar_right_cap':'./assets/gui/hotbar-right-cap.png',
  'gui.hotbar_selector':'./assets/gui/hotbar-selector.png',
  'gui.inventory_panel':'./assets/gui/inventory-panel.png',
  'gui.inventory_slot':'./assets/gui/inventory-slot.png',
  ...Object.fromEntries(Array.from({length:9},(_,index)=>[`gui.hotbar_slot_${index}`,`./assets/gui/hotbar-slot-${index}.png`])),
  'metadata.minecraft_gui':'./assets/gui/gui-manifest.json'
};
const snapshot=assetManifestSnapshot();
for(const [key,url] of Object.entries(expected)){
  assert.equal(assetUrl(key),url,key);
  assert.equal(snapshot[key].source,ASSET_SOURCE.USER_SUPPLIED,key);
  assert.equal(snapshot[key].minecraftVersion,'1.20.1',key);
}
assert.equal(assetUrl('gui.hotbar'),null,'obsolete combined hotbar binding must stay removed');
console.log('logical source-backed vanilla HUD/hotbar/inventory asset bindings: PASS');
