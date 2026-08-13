import {DEFAULT_MULTIPLAYER_HOST,DEFAULT_ALLOWED_ORIGINS} from './multiplayer-server.mjs';
import {DEFAULT_SERVER_TERRAIN_CACHE_CHUNKS,MAX_SERVER_TERRAIN_CACHE_CHUNKS} from './terrain-world.mjs';
import {DEFAULT_AUTHORITATIVE_PREFETCH_RADIUS,DEFAULT_AUTHORITATIVE_SPAWN_X,DEFAULT_AUTHORITATIVE_SPAWN_Z} from './authoritative-world-session.mjs';
import {TERRAIN_GENERATOR_VERSION} from '../src/terrain-generator.js';
import {DEFAULT_SERVER_TICK_RATE,encodeServerWorldInfo} from '../src/server-world-info.js';
import {SERVER_PLAYER_MODES} from './player-simulation.mjs';

export const DEFAULT_RUNTIME_PORT=8080;
export const DEFAULT_RUNTIME_WORLD_ID='main';
export const DEFAULT_RUNTIME_WORLD_SEED='1';
export const DEFAULT_RUNTIME_TERRAIN_PROMPT='';
export const DEFAULT_RUNTIME_MODE='survival';
const MODE_SET=new Set(SERVER_PLAYER_MODES);

function integer(value,label,{min,max}={}){const parsed=typeof value==='number'?value:Number(value);if(!Number.isInteger(parsed)||parsed<min||parsed>max)throw new RangeError(`${label} must be an integer from ${min} to ${max}`);return parsed;}
function finite(value,label){const parsed=typeof value==='number'?value:Number(value);if(!Number.isFinite(parsed))throw new RangeError(`${label} must be a finite number`);return parsed;}
function boolean(value,label){if(typeof value==='boolean')return value;if(value===undefined||value===null||value==='')return false;if(value==='1'||value==='true')return true;if(value==='0'||value==='false')return false;throw new RangeError(`${label} must be one of 1/0/true/false`);}
function origins(value){
  if(value===undefined||value===null||value==='')return [...DEFAULT_ALLOWED_ORIGINS];
  if(value==='*')return '*';
  const list=Array.isArray(value)?value.map(item=>String(item).trim()).filter(Boolean):String(value).split(',').map(item=>item.trim()).filter(Boolean);
  if(!list.length)throw new RangeError('allowed origins must contain at least one origin');return list;
}
function mode(value){const normalized=String(value??DEFAULT_RUNTIME_MODE);if(!MODE_SET.has(normalized))throw new RangeError(`unsupported authoritative world player mode: ${normalized}`);return normalized;}
function string(value,fallback){return String(value===undefined||value===null?fallback:value);}

export function normalizeRuntimeConfig(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('runtime config must be an object');
  const config={
    host:string(input.host,DEFAULT_MULTIPLAYER_HOST),
    port:integer(input.port??DEFAULT_RUNTIME_PORT,'port',{min:0,max:65535}),
    allowedOrigins:origins(input.allowedOrigins),
    allowMissingOrigin:boolean(input.allowMissingOrigin,'allowMissingOrigin'),
    worldId:string(input.worldId,DEFAULT_RUNTIME_WORLD_ID),
    seed:string(input.seed,DEFAULT_RUNTIME_WORLD_SEED),
    prompt:string(input.prompt,DEFAULT_RUNTIME_TERRAIN_PROMPT),
    mode:mode(input.mode),
    spawnX:finite(input.spawnX??DEFAULT_AUTHORITATIVE_SPAWN_X,'spawnX'),
    spawnZ:finite(input.spawnZ??DEFAULT_AUTHORITATIVE_SPAWN_Z,'spawnZ'),
    prefetchRadius:integer(input.prefetchRadius??DEFAULT_AUTHORITATIVE_PREFETCH_RADIUS,'prefetchRadius',{min:0,max:16}),
    terrainCacheChunks:integer(input.terrainCacheChunks??DEFAULT_SERVER_TERRAIN_CACHE_CHUNKS,'terrainCacheChunks',{min:1,max:MAX_SERVER_TERRAIN_CACHE_CHUNKS})
  };
  if(!config.host)throw new RangeError('host must be a non-empty string');
  encodeServerWorldInfo({session:'runtime-config-check',worldId:config.worldId,terrainVersion:TERRAIN_GENERATOR_VERSION,seed:config.seed,prompt:config.prompt,tickRate:DEFAULT_SERVER_TICK_RATE});
  return Object.freeze({...config,allowedOrigins:Array.isArray(config.allowedOrigins)?Object.freeze([...config.allowedOrigins]):config.allowedOrigins});
}

export function runtimeConfigFromEnv(env=process.env){
  if(!env||typeof env!=='object')throw new TypeError('env must be an object');
  return normalizeRuntimeConfig({
    host:env.HOST,
    port:env.PORT,
    allowedOrigins:env.MCWEB_ALLOWED_ORIGINS,
    allowMissingOrigin:env.MCWEB_ALLOW_MISSING_ORIGIN,
    worldId:env.MCWEB_WORLD_ID,
    seed:env.MCWEB_WORLD_SEED,
    prompt:env.MCWEB_TERRAIN_PROMPT,
    mode:env.MCWEB_WORLD_MODE,
    spawnX:env.MCWEB_SPAWN_X,
    spawnZ:env.MCWEB_SPAWN_Z,
    prefetchRadius:env.MCWEB_PREFETCH_RADIUS,
    terrainCacheChunks:env.MCWEB_TERRAIN_CACHE_CHUNKS
  });
}
