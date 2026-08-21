import {SUPPORTED_TERRAIN_GENERATOR_VERSIONS,TERRAIN_GENERATOR_VERSION,normalizeTerrainGeneratorVersion} from './terrain-generator.js';

export const LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION=2;
export const TERRAIN_VERSIONED_SAVE_MIN_VERSION=8;
export const SINGLEPLAYER_SAVE_VERSION=9;

export function resolveSingleplayerTerrainVersion(record=null){
  if(record===null||record===undefined)return TERRAIN_GENERATOR_VERSION;
  if(typeof record!=='object'||Array.isArray(record))throw new TypeError('singleplayer world record must be an object or null');
  if(!Object.prototype.hasOwnProperty.call(record,'terrainVersion')||record.terrainVersion===null||record.terrainVersion===undefined){
    if(Number.isInteger(record.version)&&record.version>=TERRAIN_VERSIONED_SAVE_MIN_VERSION)throw new RangeError(`save version ${record.version} is missing terrainVersion`);
    return LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION;
  }
  return normalizeTerrainGeneratorVersion(record.terrainVersion);
}

export function supportedSingleplayerTerrainVersions(){return [...SUPPORTED_TERRAIN_GENERATOR_VERSIONS];}
