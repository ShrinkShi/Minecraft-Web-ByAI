import {normalizePlayerYaw,PLAYER_VIEW_MAX_PITCH} from './player-view-frame.js';
import {assertNetworkSequence} from './network-sequence.js';

export const REMOTE_PLAYER_REPLICATION_VERSION=1;
export const REMOTE_PLAYER_SPAWN_KIND='remote-player-spawn';
export const REMOTE_PLAYER_SNAPSHOT_KIND='remote-player-snapshot';
export const REMOTE_PLAYER_DESPAWN_KIND='remote-player-despawn';
export const REMOTE_PLAYER_ID_MAX_LENGTH=96;
export const REMOTE_PLAYER_MODES=Object.freeze(['survival','adventure','creative','spectator']);
const MODE_SET=new Set(REMOTE_PLAYER_MODES);
const ID_PATTERN=/^p:[A-Za-z0-9][A-Za-z0-9_-]*$/;
const STATE_KEYS=Object.freeze(['grounded','kind','mode','pitch','playerId','position','swimCoverage','tick','v','velocity','voided','yaw']);
const DESPAWN_KEYS=Object.freeze(['kind','playerId','v']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function boolean(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function exactKeys(value,expected,label){const keys=Object.keys(value).sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
function mode(value){if(!MODE_SET.has(value))throw new RangeError(`unsupported remote player mode: ${value}`);return value;}
function pitch(value){value=finite(value,'remote player pitch');if(value<-PLAYER_VIEW_MAX_PITCH||value>PLAYER_VIEW_MAX_PITCH)throw new RangeError('remote player pitch is out of range');return value;}
function canonicalYaw(value){value=finite(value,'remote player yaw');if(value<-Math.PI||value>=Math.PI)throw new RangeError('remote player yaw must be canonical');return value;}
function coverage(value){value=finite(value,'remote player swimCoverage');if(value<0||value>1)throw new RangeError('remote player swimCoverage must be between 0 and 1');return value;}
function vectorObject(value,label){value=object(value,label);return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};}
function vectorWire(value,label){if(!Array.isArray(value)||value.length!==3)throw new TypeError(`${label} must contain three numbers`);return{x:finite(value[0],`${label}[0]`),y:finite(value[1],`${label}[1]`),z:finite(value[2],`${label}[2]`)};}

export function assertRemotePlayerId(value){if(typeof value!=='string'||value.length<3||value.length>REMOTE_PLAYER_ID_MAX_LENGTH||!ID_PATTERN.test(value))throw new RangeError('remote playerId must be a safe p: identifier');return value;}

function encodeState(kind,state){
  state=object(state,'remote player state');const position=vectorObject(state.position,'remote player position'),velocity=vectorObject(state.velocity,'remote player velocity');
  return{v:REMOTE_PLAYER_REPLICATION_VERSION,kind,playerId:assertRemotePlayerId(state.playerId),tick:assertNetworkSequence(state.tick,'remote player tick'),position:[position.x,position.y,position.z],velocity:[velocity.x,velocity.y,velocity.z],yaw:normalizePlayerYaw(state.yaw),pitch:pitch(state.pitch),mode:mode(state.mode),grounded:boolean(state.grounded,'remote player grounded'),swimCoverage:coverage(state.swimCoverage),voided:boolean(state.voided,'remote player voided')};
}
function decodeState(value){
  exactKeys(value,STATE_KEYS,'remote player state');if(value.v!==REMOTE_PLAYER_REPLICATION_VERSION)throw new RangeError(`unsupported remote player replication version: ${value.v}`);if(value.kind!==REMOTE_PLAYER_SPAWN_KIND&&value.kind!==REMOTE_PLAYER_SNAPSHOT_KIND)throw new RangeError(`unsupported remote player replication kind: ${value.kind}`);
  return{version:REMOTE_PLAYER_REPLICATION_VERSION,kind:value.kind,playerId:assertRemotePlayerId(value.playerId),tick:assertNetworkSequence(value.tick,'remote player tick'),position:vectorWire(value.position,'remote player position'),velocity:vectorWire(value.velocity,'remote player velocity'),yaw:canonicalYaw(value.yaw),pitch:pitch(value.pitch),mode:mode(value.mode),grounded:boolean(value.grounded,'remote player grounded'),swimCoverage:coverage(value.swimCoverage),voided:boolean(value.voided,'remote player voided')};
}

export function encodeRemotePlayerSpawn(state){return encodeState(REMOTE_PLAYER_SPAWN_KIND,state);}
export function encodeRemotePlayerSnapshot(state){return encodeState(REMOTE_PLAYER_SNAPSHOT_KIND,state);}
export function encodeRemotePlayerDespawn(playerId){return{v:REMOTE_PLAYER_REPLICATION_VERSION,kind:REMOTE_PLAYER_DESPAWN_KIND,playerId:assertRemotePlayerId(playerId)};}
export function decodeRemotePlayerReplication(value){
  value=object(value,'remote player replication');if(value.kind===REMOTE_PLAYER_DESPAWN_KIND){exactKeys(value,DESPAWN_KEYS,'remote player despawn');if(value.v!==REMOTE_PLAYER_REPLICATION_VERSION)throw new RangeError(`unsupported remote player replication version: ${value.v}`);return{version:REMOTE_PLAYER_REPLICATION_VERSION,kind:value.kind,playerId:assertRemotePlayerId(value.playerId)};}return decodeState(value);
}
export function isCompatibleRemotePlayerReplication(value){try{decodeRemotePlayerReplication(value);return true;}catch{return false;}}
