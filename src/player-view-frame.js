export const PLAYER_VIEW_FRAME_VERSION=1;
export const PLAYER_VIEW_MAX_PITCH=1.553;
const FRAME_KEYS=Object.freeze(['pitch','seq','v','yaw']);
const MAX_UINT32=0xffffffff;
const TWO_PI=Math.PI*2;

function assertSequence(value){
  if(!Number.isInteger(value)||value<0||value>MAX_UINT32)throw new RangeError('player view frame sequence must be uint32');
  return value;
}

function assertFiniteNumber(value,label){
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`player view frame ${label} must be a finite number`);
  return value;
}

function assertFrameShape(frame){
  if(!frame||typeof frame!=='object'||Array.isArray(frame))throw new TypeError('player view frame must be an object');
  const keys=Object.keys(frame).sort();
  if(keys.length!==FRAME_KEYS.length||keys.some((key,index)=>key!==FRAME_KEYS[index]))throw new RangeError('player view frame contains unexpected fields');
}

export function normalizePlayerYaw(value){
  const yaw=assertFiniteNumber(value,'yaw');
  const normalized=((yaw+Math.PI)%TWO_PI+TWO_PI)%TWO_PI-Math.PI;
  return Object.is(normalized,-0)?0:normalized;
}

function assertCanonicalYaw(value){
  const yaw=assertFiniteNumber(value,'yaw');
  if(yaw<-Math.PI||yaw>=Math.PI)throw new RangeError('player view frame yaw must be canonical');
  return yaw;
}

function assertPitch(value){
  const pitch=assertFiniteNumber(value,'pitch');
  if(pitch<-PLAYER_VIEW_MAX_PITCH||pitch>PLAYER_VIEW_MAX_PITCH)throw new RangeError('player view frame pitch is out of range');
  return pitch;
}

export function encodePlayerViewFrame(view,sequence=0){
  if(!view||typeof view!=='object'||Array.isArray(view))throw new TypeError('player view state must be an object');
  return{v:PLAYER_VIEW_FRAME_VERSION,seq:assertSequence(sequence),yaw:normalizePlayerYaw(view.yaw),pitch:assertPitch(view.pitch)};
}

export function decodePlayerViewFrame(frame){
  assertFrameShape(frame);
  if(frame.v!==PLAYER_VIEW_FRAME_VERSION)throw new RangeError(`unsupported player view frame version: ${frame.v}`);
  return{yaw:assertCanonicalYaw(frame.yaw),pitch:assertPitch(frame.pitch),sequence:assertSequence(frame.seq)};
}

export function isCompatibleViewFrame(frame){
  try{decodePlayerViewFrame(frame);return true;}catch{return false;}
}
