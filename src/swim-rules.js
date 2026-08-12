export const SWIM_SPEED_MULTIPLIER=.5;
export const SWIM_GRAVITY=4.5;
export const SWIM_BUOYANCY_ACCEL=5.5;
export const SWIM_UP_ACCEL=12;
export const SWIM_DOWN_ACCEL=10;
export const SWIM_VERTICAL_DRAG=3.5;
export const SWIM_MAX_UP_SPEED=3.4;
export const SWIM_MAX_DOWN_SPEED=3;

const finite=value=>Number.isFinite(value);

export function waterCoverageFromSamples(samples){
  if(!Array.isArray(samples)||samples.length===0)throw new TypeError('samples must be a non-empty array');
  if(samples.some(value=>typeof value!=='boolean'))throw new TypeError('water samples must be boolean');
  return samples.filter(Boolean).length/samples.length;
}

export function stepSwimming({velocityY,coverage,dt,up=false,down=false}){
  if(!finite(velocityY))throw new TypeError('velocityY must be finite');
  if(!finite(coverage)||coverage<0||coverage>1)throw new RangeError('coverage must be between 0 and 1');
  if(!finite(dt)||dt<0)throw new RangeError('dt must be finite and >= 0');
  if(typeof up!=='boolean'||typeof down!=='boolean')throw new TypeError('up/down must be boolean');
  if(coverage===0)return{active:false,speedMultiplier:1,velocityY};

  const speedMultiplier=1-(1-SWIM_SPEED_MULTIPLIER)*coverage;
  let acceleration=-SWIM_GRAVITY+SWIM_BUOYANCY_ACCEL*coverage;
  if(up&&!down)acceleration+=SWIM_UP_ACCEL;
  if(down&&!up)acceleration-=SWIM_DOWN_ACCEL;
  let next=(velocityY+acceleration*dt)*Math.exp(-SWIM_VERTICAL_DRAG*dt);
  next=Math.max(-SWIM_MAX_DOWN_SPEED,Math.min(SWIM_MAX_UP_SPEED,next));
  return{active:true,speedMultiplier,velocityY:next};
}
