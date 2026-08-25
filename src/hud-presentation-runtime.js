import {showsSurvivalStatusHud} from './hud-presentation-rules.js';
import {applyCreativeInventoryModePresentation} from './creative-inventory-runtime.js';

const HUD_MODE_KEY=Symbol('minecraftHudMode');
const ARMOR_WRAPPED_KEY=Symbol('minecraftHudArmorWrapped');

function installArmorModeGuard(ui){
  if(!ui||ui[ARMOR_WRAPPED_KEY]||typeof ui.renderArmor!=='function')return;
  const renderArmor=ui.renderArmor.bind(ui);
  ui.renderArmor=(armorPoints=0)=>{
    const result=renderArmor(armorPoints);
    if(!showsSurvivalStatusHud(ui[HUD_MODE_KEY]))ui.armorRow?.classList?.add('hidden');
    return result;
  };
  ui[ARMOR_WRAPPED_KEY]=true;
}

export function applyHudModePresentation(ui,mode){
  if(!ui)return false;
  installArmorModeGuard(ui);
  ui[HUD_MODE_KEY]=mode;
  applyCreativeInventoryModePresentation(ui,mode);
  const visible=showsSurvivalStatusHud(mode);
  ui.hearts?.parentElement?.classList?.toggle('hidden',!visible);
  if(!visible)ui.armorRow?.classList?.add('hidden');
  else ui.renderArmor?.(ui.equipmentModel?.armorPoints?.()||0);
  ui.xp?.parentElement?.classList?.toggle('hidden',!visible);
  if(!visible)ui.oxygen?.classList?.add('hidden');
  return visible;
}
