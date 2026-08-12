import {CONTROL_INTENT_VERSION,normalizeControlState} from './control-intents.js';

export const PLAYER_CONTROL_FRAME_VERSION=1;
export const PLAYER_CONTROL_BUTTONS=Object.freeze({jump:1,sneak:2,sprint:4,primary:8});
const BUTTON_MASK=Object.values(PLAYER_CONTROL_BUTTONS).reduce((mask,bit)=>mask|bit,0);
const FRAME_KEYS=Object.freeze(['buttons','move','seq','v']);
const MAX_UINT32=0xffffffff;
const MOVE_EPSILON=1e-9;

function assertSequence(value){
  if(!Number.isInteger(value)||value<0||value>MAX_UINT32)throw new RangeError('player control frame sequence must be uint32');
  return value;
}

function assertMove(move){
  if(!Array.isArray(move)||move.length!==2||!move.every(value=>typeof value==='number'&&Number.isFinite(value)))throw new TypeError('player control frame move must contain two finite numbers');
  if(move.some(value=>value<-1||value>1)||Math.hypot(move[0],move[1])>1+MOVE_EPSILON)throw new RangeError('player control frame move must be normalized');
  return move;
}

function assertFrameShape(frame){
  if(!frame||typeof frame!=='object'||Array.isArray(frame))throw new TypeError('player control frame must be an object');
  const keys=Object.keys(frame).sort();
  if(keys.length!==FRAME_KEYS.length||keys.some((key,index)=>key!==FRAME_KEYS[index]))throw new RangeError('player control frame contains unexpected fields');
}

export function encodePlayerControlFrame(state,sequence=0){
  const normalized=normalizeControlState(state);let buttons=0;
  for(const [name,bit] of Object.entries(PLAYER_CONTROL_BUTTONS))if(normalized[name])buttons|=bit;
  return{v:PLAYER_CONTROL_FRAME_VERSION,seq:assertSequence(sequence),move:[normalized.side,normalized.forward],buttons};
}

export function decodePlayerControlFrame(frame){
  assertFrameShape(frame);
  if(frame.v!==PLAYER_CONTROL_FRAME_VERSION)throw new RangeError(`unsupported player control frame version: ${frame.v}`);
  const move=assertMove(frame.move);
  if(!Number.isInteger(frame.buttons)||frame.buttons<0||(frame.buttons&~BUTTON_MASK)!==0)throw new RangeError('player control frame contains unknown button bits');
  const sequence=assertSequence(frame.seq);
  return{version:CONTROL_INTENT_VERSION,side:move[0],forward:move[1],...Object.fromEntries(Object.entries(PLAYER_CONTROL_BUTTONS).map(([name,bit])=>[name,(frame.buttons&bit)!==0])),sequence};
}

export function isCompatibleControlFrame(frame){
  try{return decodePlayerControlFrame(frame).version===CONTROL_INTENT_VERSION;}catch{return false;}
}
