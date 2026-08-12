export const PLAYER_ACTION_FRAME_VERSION=1;
export const PLAYER_GAMEPLAY_ACTIONS=Object.freeze(['use','drop','hotbar-select']);
const ACTION_SET=new Set(PLAYER_GAMEPLAY_ACTIONS);
const MAX_UINT32=0xffffffff;
const ACTION_KEYS=Object.freeze({
  use:Object.freeze(['kind','viewSeq']),
  drop:Object.freeze(['kind','viewSeq']),
  'hotbar-select':Object.freeze(['kind','slot'])
});
const FRAME_KEYS=Object.freeze({
  use:Object.freeze(['kind','seq','v','viewSeq']),
  drop:Object.freeze(['kind','seq','v','viewSeq']),
  'hotbar-select':Object.freeze(['kind','seq','slot','v'])
});

function assertObject(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return value;
}

function assertSequence(value,label='player action frame sequence'){
  if(!Number.isInteger(value)||value<0||value>MAX_UINT32)throw new RangeError(`${label} must be uint32`);
  return value;
}

function assertKind(value){
  if(!ACTION_SET.has(value))throw new RangeError(`unsupported player gameplay action: ${value}`);
  return value;
}

function assertExactKeys(value,expected,label){
  const keys=Object.keys(value).sort();
  if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);
}

function assertSlot(value){
  if(!Number.isInteger(value)||value<0||value>8)throw new RangeError('player action hotbar slot must be an integer from 0 to 8');
  return value;
}

export function actionRequiresView(kind){
  return kind==='use'||kind==='drop';
}

export function encodePlayerActionFrame(action,sequence=0){
  assertObject(action,'player gameplay action');
  const kind=assertKind(action.kind),seq=assertSequence(sequence);
  assertExactKeys(action,ACTION_KEYS[kind],'player gameplay action');
  if(actionRequiresView(kind))return{v:PLAYER_ACTION_FRAME_VERSION,seq,kind,viewSeq:assertSequence(action.viewSeq,'player action view sequence')};
  return{v:PLAYER_ACTION_FRAME_VERSION,seq,kind,slot:assertSlot(action.slot)};
}

export function decodePlayerActionFrame(frame){
  assertObject(frame,'player action frame');
  if(frame.v!==PLAYER_ACTION_FRAME_VERSION)throw new RangeError(`unsupported player action frame version: ${frame.v}`);
  const kind=assertKind(frame.kind);
  assertExactKeys(frame,FRAME_KEYS[kind],'player action frame');
  const sequence=assertSequence(frame.seq);
  if(actionRequiresView(kind))return{kind,sequence,viewSequence:assertSequence(frame.viewSeq,'player action view sequence')};
  return{kind,sequence,slot:assertSlot(frame.slot)};
}

export function isCompatibleActionFrame(frame){
  try{decodePlayerActionFrame(frame);return true;}catch{return false;}
}
