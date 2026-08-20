export const DAYLIGHT_BURN_TYPES=Object.freeze(new Set(['zombie','skeleton']));
export const DAYLIGHT_BURN_DAMAGE=1;
export const DAYLIGHT_BURN_INTERVAL_SECONDS=1;
export const DAYLIGHT_IGNITION_SECONDS=4;
export const MOB_HURT_FLASH_SECONDS=.18;

const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export function normalizedDayTime(gameTime){
  if(!Number.isFinite(gameTime))return 0;
  return ((gameTime%24000)+24000)%24000;
}

export function isDaylightBurnTime(gameTime){
  const time=normalizedDayTime(gameTime);
  // Keep the burn window slightly inside sunrise/sunset twilight so the rule
  // matches the existing simplified skylight curve without igniting mobs in
  // visually dark transition frames.
  return time>=1000&&time<12000;
}

export function undeadExposedToDaylight({type,gameTime,weather='clear',headSubmerged=false,headY=0,highestSolidY=-Infinity}={}){
  if(!DAYLIGHT_BURN_TYPES.has(type)||!isDaylightBurnTime(gameTime))return false;
  if(weather!=='clear'||headSubmerged)return false;
  if(!Number.isFinite(headY)||!Number.isFinite(highestSolidY))return false;
  return highestSolidY<headY-.05;
}

export function stepDaylightBurn(state,{dt,exposed,wet=false}={}){
  if(!state||typeof state!=='object')throw new TypeError('burn state is required');
  if(!Number.isFinite(dt)||dt<0)throw new RangeError('burn dt must be a non-negative finite number');
  let remaining=Math.max(0,Number(state.remaining)||0),untilDamage=Math.max(0,Number(state.untilDamage)||0);
  if(wet){remaining=0;untilDamage=0;}
  else if(exposed)remaining=Math.max(remaining,DAYLIGHT_IGNITION_SECONDS);
  else remaining=Math.max(0,remaining-dt);
  const burning=remaining>0;
  let damageEvents=0;
  if(burning){
    untilDamage-=dt;
    while(untilDamage<=0){damageEvents++;untilDamage+=DAYLIGHT_BURN_INTERVAL_SECONDS;}
  }else untilDamage=0;
  return Object.freeze({remaining,untilDamage,burning,damageEvents});
}

export function mobHitVisual(hurtRemaining){
  const remaining=Math.max(0,Number(hurtRemaining)||0),strength=clamp01(remaining/MOB_HURT_FLASH_SECONDS);
  return Object.freeze({strength,scale:1+strength*.09,red:strength});
}

export function creeperFuseVisual(progress,elapsedSeconds=0){
  const p=clamp01(progress),elapsed=Math.max(0,Number(elapsedSeconds)||0);
  const pulse=Math.sin(elapsed*(10+22*p));
  const scale=1+p*.2+Math.max(0,pulse)*p*.055;
  const whiteBase=p<=.34?0:Math.pow((p-.34)/.66,1.35);
  const whitePulse=.35+.65*(.5+.5*Math.sin(elapsed*(8+30*p)));
  return Object.freeze({progress:p,scale,white:clamp01(whiteBase*whitePulse)});
}
