import {decodePlayerControlFrame} from './player-control-frame.js';
import {decodePlayerViewFrame} from './player-view-frame.js';
import {decodePlayerActionFrame} from './player-action-frame.js';
import {NetworkSequenceGate,assertNetworkSequence} from './network-sequence.js';

export const CLIENT_INPUT_ENVELOPE_VERSION=1;
export const CLIENT_INPUT_KINDS=Object.freeze(['control','view','action']);
const KIND_SET=new Set(CLIENT_INPUT_KINDS);
const ENVELOPE_KEYS=Object.freeze(['kind','packetSeq','payload','session','v']);
const ENCODE_KEYS=Object.freeze(['kind','packetSeq','payload','session']);
const SESSION_PATTERN=/^[A-Za-z0-9._:-]{1,64}$/;

function assertObject(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function assertExactKeys(value,expected,label){const keys=Object.keys(value).sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
export function assertClientSessionId(value){if(typeof value!=='string'||!SESSION_PATTERN.test(value))throw new RangeError('client input session must be 1..64 safe ASCII characters');return value;}
function assertKind(value){if(!KIND_SET.has(value))throw new RangeError(`unsupported client input kind: ${value}`);return value;}
function decodePayload(kind,payload){if(kind==='control')return decodePlayerControlFrame(payload);if(kind==='view')return decodePlayerViewFrame(payload);return decodePlayerActionFrame(payload);}
function cloneWirePayload(kind,payload){if(kind==='control')return{v:payload.v,seq:payload.seq,move:[payload.move[0],payload.move[1]],buttons:payload.buttons};if(kind==='view')return{v:payload.v,seq:payload.seq,yaw:payload.yaw,pitch:payload.pitch};if(payload.kind==='hotbar-select')return{v:payload.v,seq:payload.seq,kind:payload.kind,slot:payload.slot};if(payload.kind==='respawn')return{v:payload.v,seq:payload.seq,kind:payload.kind};return{v:payload.v,seq:payload.seq,kind:payload.kind,viewSeq:payload.viewSeq};}

export function encodeClientInputEnvelope(input){assertObject(input,'client input envelope input');assertExactKeys(input,ENCODE_KEYS,'client input envelope input');const kind=assertKind(input.kind),session=assertClientSessionId(input.session),packetSeq=assertNetworkSequence(input.packetSeq,'client input packet sequence');decodePayload(kind,input.payload);return{v:CLIENT_INPUT_ENVELOPE_VERSION,session,packetSeq,kind,payload:cloneWirePayload(kind,input.payload)};}
export function decodeClientInputEnvelope(envelope,{expectedSession}={}){assertObject(envelope,'client input envelope');if(envelope.v!==CLIENT_INPUT_ENVELOPE_VERSION)throw new RangeError(`unsupported client input envelope version: ${envelope.v}`);assertExactKeys(envelope,ENVELOPE_KEYS,'client input envelope');const session=assertClientSessionId(envelope.session);if(expectedSession!==undefined&&session!==assertClientSessionId(expectedSession))throw new RangeError('client input session mismatch');const kind=assertKind(envelope.kind),packetSequence=assertNetworkSequence(envelope.packetSeq,'client input packet sequence');return{session,packetSequence,kind,payload:decodePayload(kind,envelope.payload)};}
export function isCompatibleClientInputEnvelope(envelope,options){try{decodeClientInputEnvelope(envelope,options);return true;}catch{return false;}}

export class ClientInputSessionGate{
  constructor(session){this.sequenceGate=new NetworkSequenceGate();this.reset(session);}
  reset(session){this.session=assertClientSessionId(session);this.sequenceGate.reset();}
  accept(envelope){const message=decodeClientInputEnvelope(envelope,{expectedSession:this.session});if(!this.sequenceGate.accept(message.packetSequence))return{accepted:false,reason:'stale-or-duplicate',message};return{accepted:true,reason:'accepted',message};}
}
