export const HOSTILE_TARGETABLE_PLAYER_MODES=Object.freeze(['survival','adventure']);
const TARGETABLE_MODES=new Set(HOSTILE_TARGETABLE_PLAYER_MODES);

export function canHostileMobTargetPlayer(player){
  return !!player&&TARGETABLE_MODES.has(player.mode);
}

export function clearHostileMobTargetState(state){
  if(!state||typeof state!=='object')return false;
  const changed=(Number(state.fuse)||0)>0||!!state.fuseWasActive;
  state.fuse=0;state.fuseWasActive=false;
  return changed;
}
