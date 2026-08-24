import assert from 'node:assert/strict';
import {SURVIVAL_STATUS_HUD_MODES,showsSurvivalStatusHud} from '../src/hud-presentation-rules.js';
import {applyHudModePresentation} from '../src/hud-presentation-runtime.js';

assert.deepEqual(SURVIVAL_STATUS_HUD_MODES,['survival','adventure']);
assert.equal(showsSurvivalStatusHud('survival'),true);
assert.equal(showsSurvivalStatusHud('adventure'),true);
for(const mode of ['creative','spectator','unknown','',null,undefined])assert.equal(showsSurvivalStatusHud(mode),false,`${String(mode)} should not show survival status HUD`);

function classList(){
  const values=new Set();
  return{add:value=>values.add(value),remove:value=>values.delete(value),toggle:(value,force)=>{const next=force===undefined?!values.has(value):!!force;if(next)values.add(value);else values.delete(value);return next;},contains:value=>values.has(value)};
}

const statusRow={classList:classList()},armorRow={classList:classList()},xpWrap={classList:classList()},oxygen={classList:classList()};
const ui={
  hearts:{parentElement:statusRow},armorRow,xp:{parentElement:xpWrap},oxygen,
  equipmentModel:{armorPoints:()=>3},
  renderArmor(points=0){armorRow.classList.toggle('hidden',points<=0);}
};

assert.equal(applyHudModePresentation(ui,'survival'),true);
assert.equal(statusRow.classList.contains('hidden'),false);
assert.equal(armorRow.classList.contains('hidden'),false);
assert.equal(xpWrap.classList.contains('hidden'),false);
ui.renderArmor(0);assert.equal(armorRow.classList.contains('hidden'),true,'zero armor should keep vanilla hidden behavior');
ui.renderArmor(3);assert.equal(armorRow.classList.contains('hidden'),false,'survival armor render should remain visible');

assert.equal(applyHudModePresentation(ui,'creative'),false);
assert.equal(statusRow.classList.contains('hidden'),true);
assert.equal(armorRow.classList.contains('hidden'),true);
assert.equal(xpWrap.classList.contains('hidden'),true);
assert.equal(oxygen.classList.contains('hidden'),true);
ui.renderArmor(3);assert.equal(armorRow.classList.contains('hidden'),true,'creative armor rerender must not leak survival HUD');

assert.equal(applyHudModePresentation(ui,'survival'),true);
assert.equal(armorRow.classList.contains('hidden'),false,'survival should restore equipped armor HUD');

console.log('HUD presentation rules/runtime OK');
