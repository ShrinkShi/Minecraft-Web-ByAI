import {CONTROL_INTENT_VERSION,normalizeControlState} from './control-intents.js';

export const PLAYER_CONTROL_FRAME_VERSION=1;
export const PLAYER_CONTROL_BUTTONS=Object.freeze({jump:1,sneak:2,sprint:4,primary:8});
const BUTTON_MASK=Object.values(PLAYER_CONTROL_BUTTONS).reduce((mask,bit)=>mask|bit,0);

const finite=value=>Number.isFinite(Number(value));
const normalizeSequence=value=>Number.isInteger(value)&&value>=0&&value<=0xffffffff?value:0;

export function encodePlayerControlFrame(state,sequence=0){
  const normalized=normalizeControlState(state);let buttons=0;
  for(const [name,bit] of Object.entries(PLAYER_CONTROL_BUTTONS))if(normalized[name])buttons|=bit;
  return{v:PLAYER_CONTROL_FRAME_VERSION,seq:normalizeSequence(sequence),move:[normalized.side,normalized.forward],buttons};
}

export function decodePlayerControlFrame(frame){
  if(!frame||typeof frame!=='object')throw new TypeError('player control frame must be an object');
  if(frame.v!==PLAYER_CONTROL_FRAME_VERSION)throw new RangeError(`unsupported player control frame version: ${frame.v}`);
  if(!Array.isArray(frame.move)||frame.move.length!==2||!frame.move.every(finite))throw new TypeError('player control frame move must contain two finite numbers');
  if(!Number.isInteger(frame.buttons)||frame.buttons<0||(frame.buttons&~BUTTON_MASK)!==0)throw new RangeError('player control frame contains unknown button bits');
  if(!Number.isInteger(frame.seq)||frame.seq<0||frame.seq>0xffffffff)throw new RangeError('player control frame sequence must be uint32');
  return{...normalizeControlState({side:Number(frame.move[0]),forward:Number(frame.move[1]),...Object.fromEntries(Object.entries(PLAYER_CONTROL_BUTTONS).map(([name,bit])=>[name,(frame.buttons&bit)!==0]))}),sequence:frame.seq};
}

export function isCompatibleControlFrame(frame){
  try{return decodePlayerControlFrame(frame).version===CONTROL_INTENT_VERSION;}catch{return false;}
}
