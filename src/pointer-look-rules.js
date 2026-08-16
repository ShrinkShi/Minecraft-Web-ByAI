export const POINTER_LOOK_SENSITIVITY=.0022;
export const POINTER_LOOK_MAX_EVENT_DELTA=180;

function finite(value,label){
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);
  return value;
}

export function pointerLookIntent(movementX,movementY,{sensitivity=POINTER_LOOK_SENSITIVITY,maxEventDelta=POINTER_LOOK_MAX_EVENT_DELTA}={}){
  const x=finite(movementX,'movementX'),y=finite(movementY,'movementY'),scale=finite(sensitivity,'sensitivity'),limit=finite(maxEventDelta,'maxEventDelta');
  if(scale<=0)throw new RangeError('sensitivity must be > 0');
  if(limit<=0)throw new RangeError('maxEventDelta must be > 0');
  const safeX=Math.max(-limit,Math.min(limit,x)),safeY=Math.max(-limit,Math.min(limit,y));
  return Object.freeze({
    yawDelta:-safeX*scale,
    pitchDelta:-safeY*scale,
    clamped:safeX!==x||safeY!==y
  });
}
