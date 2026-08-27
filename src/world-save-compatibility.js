import {SUPPORTED_TERRAIN_GENERATOR_VERSIONS,TERRAIN_GENERATOR_VERSION,normalizeTerrainGeneratorVersion} from './terrain-generator.js';
import {BlockStateSidecar} from './block-state-sidecar.js';

export const LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION=2;
export const TERRAIN_VERSIONED_SAVE_MIN_VERSION=8;
export const BLOCK_STATE_SAVE_MIN_VERSION=11;
export const SINGLEPLAYER_SAVE_VERSION=11;

function worldRecord(record){
  if(record===null||record===undefined)return null;
  if(typeof record!=='object'||Array.isArray(record))throw new TypeError('singleplayer world record must be an object or null');
  return record;
}

export function resolveSingleplayerTerrainVersion(record=null){
  record=worldRecord(record);
  if(record===null)return TERRAIN_GENERATOR_VERSION;
  if(!Object.prototype.hasOwnProperty.call(record,'terrainVersion')||record.terrainVersion===null||record.terrainVersion===undefined){
    if(Number.isInteger(record.version)&&record.version>=TERRAIN_VERSIONED_SAVE_MIN_VERSION)throw new RangeError(`save version ${record.version} is missing terrainVersion`);
    return LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION;
  }
  return normalizeTerrainGeneratorVersion(record.terrainVersion);
}

export function resolveSingleplayerBlockStates(record=null){
  record=worldRecord(record);
  if(record===null)return{};
  if(!Object.prototype.hasOwnProperty.call(record,'blockStates')){
    if(Number.isInteger(record.version)&&record.version>=BLOCK_STATE_SAVE_MIN_VERSION)throw new RangeError(`save version ${record.version} is missing blockStates`);
    return{};
  }
  const states=record.blockStates;
  if(states===null||typeof states!=='object'||Array.isArray(states))throw new TypeError('singleplayer blockStates must be an object');
  return new BlockStateSidecar(states).export();
}

export function supportedSingleplayerTerrainVersions(){return [...SUPPORTED_TERRAIN_GENERATOR_VERSIONS];}
