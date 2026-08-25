import {assertClientSessionId} from './client-input-envelope.js';
import {normalizePlayerYaw,PLAYER_VIEW_MAX_PITCH} from './player-view-frame.js';

export const SERVER_PLAYER_SNAPSHOT_VERSION=2;
export const SERVER_PLAYER_SNAPSHOT_KIND='player-snapshot';
export const SERVER_PLAYER_SNAPSHOT_MODES=Object.freeze(['survival','adventure','creative','spectator']);
const MODE_SET=new Set(SERVER_PLAYER_SNAPSHOT_MODES);
const MAX_UINT32=0xffffffff;
const SNAPSHOT_KEYS=Object.freeze(['flying','grounded','kind','mode','pitch','position','session','swimCoverage','tick','v','velocity','voided','yaw']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function uint32(value,label){if(!Number.isInteger(value)||value<0||value>MAX_UINT32)throw new RangeError(`${label} must be uint32`);return value;}
function boolean(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function mode(value){if(!MODE_SET.has(value))throw new RangeError(`unsupported player snapshot mode: ${value}`);return value;}
function pitch(value){value=finite(value,'player snapshot pitch');if(value<-PLAYER_VIEW_MAX_PITCH||value>PLAYER_VIEW_MAX_PITCH)throw new RangeError('player snapshot pitch is out of range');return value;}
function canonicalYaw(value){value=finite(value,'player snapshot yaw');if(value<-Math.PI||value>=Math.PI)throw new RangeError('player snapshot yaw must be canonical');return value;}
function coverage(value){value=finite(value,'player snapshot swimCoverage');if(value<0||value>1)throw new RangeError('player snapshot swimCoverage must be between 0 and 1');return value;}
function vectorObject(value,label){value=object(value,label);return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};}
function vectorWire(value,label){if(!Array.isArray(value)||value.length!==3)throw new TypeError(`${label} must contain three numbers`);return{x:finite(value[0],`${label}[0]`),y:finite(value[1],`${label}[1]`),z:finite(value[2],`${label}[2]`)};}
function assertExactKeys(value){const keys=Object.keys(value).sort();if(keys.length!==SNAPSHOT_KEYS.length||keys.some((key,index)=>key!==SNAPSHOT_KEYS[index]))throw new RangeError('server player snapshot contains unexpected fields');}

export function encodeServerPlayerSnapshot(snapshot){
  snapshot=object(snapshot,'server player snapshot state');const position=vectorObject(snapshot.position,'player snapshot position'),velocity=vectorObject(snapshot.velocity,'player snapshot velocity');
  return{
    v:SERVER_PLAYER_SNAPSHOT_VERSION,
    kind:SERVER_PLAYER_SNAPSHOT_KIND,
    session:assertClientSessionId(snapshot.session),
    tick:uint32(snapshot.tick,'player snapshot tick'),
    position:[position.x,position.y,position.z],
    velocity:[velocity.x,velocity.y,velocity.z],
    yaw:normalizePlayerYaw(snapshot.yaw),
    pitch:pitch(snapshot.pitch),
    mode:mode(snapshot.mode),
    flying:boolean(snapshot.flying,'player snapshot flying'),
    grounded:boolean(snapshot.grounded,'player snapshot grounded'),
    swimCoverage:coverage(snapshot.swimCoverage),
    voided:boolean(snapshot.voided,'player snapshot voided')
  };
}

export function decodeServerPlayerSnapshot(snapshot,{expectedSession=null}={}){
  snapshot=object(snapshot,'server player snapshot');assertExactKeys(snapshot);
  if(snapshot.v!==SERVER_PLAYER_SNAPSHOT_VERSION)throw new RangeError(`unsupported server player snapshot version: ${snapshot.v}`);
  if(snapshot.kind!==SERVER_PLAYER_SNAPSHOT_KIND)throw new RangeError(`unsupported server realtime message kind: ${snapshot.kind}`);
  const session=assertClientSessionId(snapshot.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('server player snapshot session mismatch');
  return{
    version:SERVER_PLAYER_SNAPSHOT_VERSION,
    kind:SERVER_PLAYER_SNAPSHOT_KIND,
    session,
    tick:uint32(snapshot.tick,'player snapshot tick'),
    position:vectorWire(snapshot.position,'player snapshot position'),
    velocity:vectorWire(snapshot.velocity,'player snapshot velocity'),
    yaw:canonicalYaw(snapshot.yaw),
    pitch:pitch(snapshot.pitch),
    mode:mode(snapshot.mode),
    flying:boolean(snapshot.flying,'player snapshot flying'),
    grounded:boolean(snapshot.grounded,'player snapshot grounded'),
    swimCoverage:coverage(snapshot.swimCoverage),
    voided:boolean(snapshot.voided,'player snapshot voided')
  };
}

export function isCompatibleServerPlayerSnapshot(snapshot,options){try{decodeServerPlayerSnapshot(snapshot,options);return true;}catch{return false;}}
