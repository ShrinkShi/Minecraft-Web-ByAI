export const SURVIVAL_STATUS_HUD_MODES=Object.freeze(['survival','adventure']);
const SURVIVAL_STATUS_MODES=new Set(SURVIVAL_STATUS_HUD_MODES);

export function showsSurvivalStatusHud(mode){
  return SURVIVAL_STATUS_MODES.has(mode);
}
