const SKELETON_RETALIATORS=new Set(['zombie','spider']);

export function shouldRetaliateAgainstProjectile(victimType,attackerType){
  return SKELETON_RETALIATORS.has(String(victimType||''))&&attackerType==='skeleton';
}

export function retaliationTargetId({victimType,attackerType,attackerId}={}){
  if(!shouldRetaliateAgainstProjectile(victimType,attackerType))return null;
  return Number.isInteger(attackerId)&&attackerId>0?attackerId:null;
}
