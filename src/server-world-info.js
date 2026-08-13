import {assertClientSessionId} from './client-input-envelope.js';
import {TERRAIN_GENERATOR_VERSION} from './terrain-generator.js';

export const SERVER_WORLD_INFO_VERSION=1;
export const SERVER_WORLD_INFO_KIND='world-info';
export const DEFAULT_SERVER_TICK_RATE=20;
const WORLD_ID_PATTERN=/^[A-Za-z0-9._:-]{1,64}$/;
const INFO_KEYS=Object.freeze(['kind','prompt','seed','session','terrainVersion','tickRate','v','worldId']);
const CONTROL_CHARS=/[\u0000-\u001f\u007f]/;

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value){const keys=Object.keys(value).sort();if(keys.length!==INFO_KEYS.length||keys.some((key,index)=>key!==INFO_KEYS[index]))throw new RangeError('server world info contains unexpected fields');}
function worldId(value){if(typeof value!=='string'||!WORLD_ID_PATTERN.test(value))throw new RangeError('worldId must be 1..64 safe ASCII characters');return value;}
function text(value,label,{min=0,max}={}){if(typeof value!=='string'||value.length<min||value.length>max||CONTROL_CHARS.test(value))throw new RangeError(`${label} must be ${min}..${max} control-free characters`);return value;}
function terrainVersion(value){if(value!==TERRAIN_GENERATOR_VERSION)throw new RangeError(`unsupported terrain generator version: ${value}`);return value;}
function tickRate(value){if(!Number.isInteger(value)||value<1||value>120)throw new RangeError('server tickRate must be an integer from 1 to 120');return value;}

export function encodeServerWorldInfo(info){
  info=object(info,'server world info state');
  return{
    v:SERVER_WORLD_INFO_VERSION,
    kind:SERVER_WORLD_INFO_KIND,
    session:assertClientSessionId(info.session),
    worldId:worldId(info.worldId),
    terrainVersion:terrainVersion(info.terrainVersion??TERRAIN_GENERATOR_VERSION),
    seed:text(info.seed,'world seed',{min:1,max:128}),
    prompt:text(info.prompt??'','terrain prompt',{min:0,max:512}),
    tickRate:tickRate(info.tickRate??DEFAULT_SERVER_TICK_RATE)
  };
}

export function decodeServerWorldInfo(info,{expectedSession=null}={}){
  info=object(info,'server world info');exactKeys(info);
  if(info.v!==SERVER_WORLD_INFO_VERSION)throw new RangeError(`unsupported server world info version: ${info.v}`);
  if(info.kind!==SERVER_WORLD_INFO_KIND)throw new RangeError(`unsupported server realtime message kind: ${info.kind}`);
  const session=assertClientSessionId(info.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('server world info session mismatch');
  return{version:SERVER_WORLD_INFO_VERSION,kind:SERVER_WORLD_INFO_KIND,session,worldId:worldId(info.worldId),terrainVersion:terrainVersion(info.terrainVersion),seed:text(info.seed,'world seed',{min:1,max:128}),prompt:text(info.prompt,'terrain prompt',{min:0,max:512}),tickRate:tickRate(info.tickRate)};
}

export function isCompatibleServerWorldInfo(info,options){try{decodeServerWorldInfo(info,options);return true;}catch{return false;}}
