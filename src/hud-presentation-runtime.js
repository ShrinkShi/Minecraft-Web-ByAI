import {showsSurvivalStatusHud} from './hud-presentation-rules.js';

export function applyHudModePresentation(ui,mode){
  const visible=showsSurvivalStatusHud(mode);
  ui?.hearts?.parentElement?.classList?.toggle('hidden',!visible);
  ui?.armorRow?.classList?.toggle('hidden',!visible);
  ui?.xp?.parentElement?.classList?.toggle('hidden',!visible);
  if(!visible)ui?.oxygen?.classList?.add('hidden');
  return visible;
}
