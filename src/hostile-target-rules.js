export const HOSTILE_TARGETABLE_PLAYER_MODES=Object.freeze(['survival','adventure']);
const TARGETABLE_MODES=new Set(HOSTILE_TARGETABLE_PLAYER_MODES);

export function canHostileMobTargetPlayer(player){
  return !!player&&TARGETABLE_MODES.has(player.mode);
}
