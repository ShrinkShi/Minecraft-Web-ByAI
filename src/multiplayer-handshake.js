import {assertClientSessionId} from './client-input-envelope.js';

export const MULTIPLAYER_HANDSHAKE_VERSION=1;
export const MULTIPLAYER_SUBPROTOCOL='minecraft-web-v1';
export const SERVER_REJECT_CODES=Object.freeze(['protocol-mismatch','server-full','world-unavailable','policy']);
const REJECT_CODE_SET=new Set(SERVER_REJECT_CODES);
const HELLO_KEYS=Object.freeze(['kind','v']);
const WELCOME_KEYS=Object.freeze(['kind','session','v']);
const REJECT_KEYS=Object.freeze(['code','kind','v']);

function assertObject(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return value;
}

function assertExactKeys(value,expected,label){
  const keys=Object.keys(value).sort();
  if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);
}

function assertVersion(value){
  if(value!==MULTIPLAYER_HANDSHAKE_VERSION)throw new RangeError(`unsupported multiplayer handshake version: ${value}`);
  return value;
}

export function encodeClientHello(){
  return{v:MULTIPLAYER_HANDSHAKE_VERSION,kind:'hello'};
}

export function decodeClientHello(message){
  assertObject(message,'client hello');assertExactKeys(message,HELLO_KEYS,'client hello');assertVersion(message.v);
  if(message.kind!=='hello')throw new RangeError(`unsupported client handshake kind: ${message.kind}`);
  return{version:message.v,kind:'hello'};
}

export function encodeServerWelcome(session){
  return{v:MULTIPLAYER_HANDSHAKE_VERSION,kind:'welcome',session:assertClientSessionId(session)};
}

export function encodeServerReject(code){
  if(!REJECT_CODE_SET.has(code))throw new RangeError(`unsupported server reject code: ${code}`);
  return{v:MULTIPLAYER_HANDSHAKE_VERSION,kind:'reject',code};
}

export function decodeServerHandshake(message){
  assertObject(message,'server handshake');assertVersion(message.v);
  if(message.kind==='welcome'){
    assertExactKeys(message,WELCOME_KEYS,'server welcome');
    return{version:message.v,kind:'welcome',session:assertClientSessionId(message.session)};
  }
  if(message.kind==='reject'){
    assertExactKeys(message,REJECT_KEYS,'server reject');
    if(!REJECT_CODE_SET.has(message.code))throw new RangeError(`unsupported server reject code: ${message.code}`);
    return{version:message.v,kind:'reject',code:message.code};
  }
  throw new RangeError(`unsupported server handshake kind: ${message.kind}`);
}

export function isCompatibleServerHandshake(message){
  try{decodeServerHandshake(message);return true;}catch{return false;}
}
