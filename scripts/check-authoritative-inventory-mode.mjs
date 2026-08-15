import assert from 'node:assert/strict';
import {ServerPlayerInventoryState,ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';

const state=new ServerPlayerInventoryState('s:inventory-mode',{mode:'survival'});state.add('stick',3);const before=state.snapshot();assert.equal(before.mode,'survival');assert.equal(before.revision,1);const slotsBefore=before.slots.map(slot=>slot?{...slot}:null);
let after=state.setMode('creative');assert.equal(after.mode,'creative');assert.equal(after.revision,2,'mode mutation must advance the inventory revision exactly once');assert.deepEqual(after.slots,slotsBefore,'mode changes must not clear or reseed carried inventory');
after=state.setMode('creative');assert.equal(after.revision,2,'no-op mode changes must not create duplicate revisions');assert.throws(()=>state.setMode('builder'),/inventory mode/);

const hub=new ServerPlayerInventoryHub();hub.join('s:hub-mode',{mode:'survival'});const hubAfter=hub.setMode('s:hub-mode','spectator');assert.equal(hubAfter.mode,'spectator');assert.equal(hubAfter.revision,1);assert.equal(hub.snapshot('s:hub-mode').revision,1);
console.log('authoritative inventory mode transition + revision semantics: PASS');
