export const MAX_AIR_SECONDS=15;
export const AIR_RECOVERY_PER_SECOND=4;
export const DROWN_INTERVAL_SECONDS=1;
export const DROWN_DAMAGE=2;

const isFiniteNonNegative=value=>Number.isFinite(value)&&value>=0;
export const usesOxygen=mode=>mode==='survival'||mode==='adventure';

export function createOxygenState(){return{air:MAX_AIR_SECONDS,drownTimer:0};}

export function stepOxygen(state,{dt,submerged,mode}){
  if(!state||!isFiniteNonNegative(state.air)||!isFiniteNonNegative(state.drownTimer))throw new TypeError('invalid oxygen state');
  if(!isFiniteNonNegative(dt))throw new RangeError('dt must be finite and >= 0');
  if(typeof submerged!=='boolean')throw new TypeError('submerged must be boolean');
  if(!usesOxygen(mode))return{state:createOxygenState(),damageEvents:0};

  let air=Math.min(MAX_AIR_SECONDS,state.air),drownTimer=state.drownTimer,damageEvents=0;
  if(!submerged){
    air=Math.min(MAX_AIR_SECONDS,air+dt*AIR_RECOVERY_PER_SECOND);
    drownTimer=0;
    return{state:{air,drownTimer},damageEvents};
  }

  if(air>0){
    const consumed=Math.min(air,dt);
    air-=consumed;
    dt-=consumed;
  }
  if(air<=0&&dt>0)drownTimer+=dt;
  while(drownTimer>=DROWN_INTERVAL_SECONDS){drownTimer-=DROWN_INTERVAL_SECONDS;damageEvents++;}
  return{state:{air:Math.max(0,air),drownTimer},damageEvents};
}
