import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {VoxelWorld} from './world.js';
import {TERRAIN_GENERATOR_VERSION,normalizeTerrainGeneratorVersion} from './terrain-generator.js';
import {PlayerController} from './player.js';
import {Inventory} from './inventory.js';
import {Equipment} from './equipment.js';
import {DropSystem} from './drops.js';
import {ExperienceOrbSystem} from './experience-orbs.js';
import {ProjectileSystem} from './projectiles.js';
import {ExplosionSystem} from './explosions.js';
import {PassiveMobSystem} from './passive-mobs.js';
import {HostileMobSystem} from './hostile-mobs.js';
import {WeatherSystem} from './weather-system.js';
import {JadeRuntimeInspector} from './jade-runtime-inspector.js';
import {explosionDropForBlock} from './explosion-drop-rules.js';
import {MiningCrackOverlay} from './mining-crack-overlay.js';
import {playGameSound} from './audio-system.js';
import {forwardDamageWithArmorWear} from './armor-damage-bridge.js';
import {installVanillaBlockAudio} from './vanilla-block-audio.js';
import {playMobSoundEvent} from './vanilla-mob-sounds.js';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function positiveInteger(value,label){if(!Number.isInteger(value)||value<1||value>16)throw new RangeError(`${label} must be an integer from 1 to 16`);return value;}
function objectOrNull(value,label){if(value===null||value===undefined)return null;if(typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object or null`);return value;}
function safeDispose(value){try{value?.dispose?.();}catch{}}

export class ClientGameplayRuntime{
  constructor({world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem,miningCracks,jadeInspector=null,vanillaBlockAudio=null}){
    Object.assign(this,{world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem,miningCracks,jadeInspector,vanillaBlockAudio});this.disposed=false;
  }
  dispose(){if(this.disposed)return false;this.vanillaBlockAudio?.dispose();this.miningCracks?.dispose();this.jadeInspector?.dispose();this.weatherSystem?.dispose();this.explosions?.dispose();this.projectiles?.dispose();this.hostileMobs?.dispose();this.passiveMobs?.dispose();this.experienceOrbs?.dispose();this.drops?.dispose();this.player?.dispose();this.world?.dispose();this.disposed=true;return true;}
}

export async function createClientGameplayRuntime({
  scene,camera,canvas,seed='1',prompt='',terrainVersion=TERRAIN_GENERATOR_VERSION,renderDistance=3,savedEdits={},savedBlockStates={},centerX=0,centerZ=0,mode='survival',inventoryState=null,equipmentState=null,controlState=null,weather='clear',
  onWorldEdit=()=>{},onWorldBlockStateEdit=()=>{},onWorldProgress=()=>{},onInventoryPickup=()=>{},onExperience=()=>{},onPlayerHit=()=>{},onPlayerBlast=()=>{},onMobDeath=()=>{},onHostileProjectile=()=>{},onHostileExplosion=()=>{},onMobBurn=()=>{},onCreeperPrime=()=>{},onExplosionBlockDestroyed=()=>{}
}={}){
  centerX=finite(centerX,'centerX');centerZ=finite(centerZ,'centerZ');terrainVersion=normalizeTerrainGeneratorVersion(terrainVersion);renderDistance=positiveInteger(renderDistance,'renderDistance');savedEdits=objectOrNull(savedEdits,'savedEdits')||{};savedBlockStates=objectOrNull(savedBlockStates,'savedBlockStates')||{};inventoryState=objectOrNull(inventoryState,'inventoryState');equipmentState=objectOrNull(equipmentState,'equipmentState');
  for(const [label,value] of Object.entries({onWorldEdit,onWorldBlockStateEdit,onWorldProgress,onInventoryPickup,onExperience,onPlayerHit,onPlayerBlast,onMobDeath,onHostileProjectile,onHostileExplosion,onMobBurn,onCreeperPrime,onExplosionBlockDestroyed}))callback(value,label);

  let world=null,player=null,inventory=null,equipment=null,drops=null,experienceOrbs=null,projectiles=null,explosions=null,passiveMobs=null,hostileMobs=null,weatherSystem=null,miningCracks=null,jadeInspector=null,vanillaBlockAudio=null;
  try{
    world=new VoxelWorld(scene,{seed:String(seed??'1'),prompt:String(prompt??''),terrainVersion,renderDistance,savedEdits,savedBlockStates,onEdit:onWorldEdit,onBlockStateEdit:onWorldBlockStateEdit,onProgress:onWorldProgress});await world.generateArea(centerX,centerZ);
    inventory=new Inventory(mode,inventoryState);equipment=new Equipment(equipmentState);player=new PlayerController(camera,canvas,world,scene);if(controlState!==null&&controlState!==undefined)player.setControlState(controlState);player.setMode(mode);vanillaBlockAudio=installVanillaBlockAudio({world,player});
    const armorAware=(event,forward)=>forwardDamageWithArmorWear({player,equipment,damage:Number(event?.amount)||0,event,callback:forward});
    drops=new DropSystem(scene,world,inventory,onInventoryPickup);experienceOrbs=new ExperienceOrbSystem(scene,world,onExperience);weatherSystem=new WeatherSystem(scene);weatherSystem.setWeather(weather);miningCracks=new MiningCrackOverlay(scene);
    projectiles=new ProjectileSystem(scene,world,{onPlayerHit:event=>armorAware(event,onPlayerHit)});
    const emitDestroyedBlock=event=>{
      const itemId=explosionDropForBlock(event?.id);if(itemId&&event?.position)drops.spawn(itemId,1,new THREE.Vector3(event.position.x+.5,event.position.y+.55,event.position.z+.5));onExplosionBlockDestroyed(event);
    };
    const emitMobSound=event=>{if(!player||!event?.position)return;void playMobSoundEvent(event,{x:player.position.x,y:player.position.y+player.eye*.7,z:player.position.z});};
    explosions=new ExplosionSystem(scene,world,{onPlayerBlast:event=>armorAware(event,onPlayerBlast),onBlockDestroyed:emitDestroyedBlock});
    passiveMobs=new PassiveMobSystem(scene,world,{onDeath:onMobDeath,onSound:emitMobSound});
    hostileMobs=new HostileMobSystem(scene,world,{
      onPlayerHit:event=>armorAware(event,onPlayerHit),
      onProjectile:event=>{playGameSound('shoot',{minIntervalMs:70});onHostileProjectile(event);},
      onExplosion:event=>{playGameSound('explosion',{minIntervalMs:80});onHostileExplosion(event);},
      onDeath:onMobDeath,
      onSound:emitMobSound,
      onBurn:event=>{playGameSound('burn',{gain:.65,minIntervalMs:300});onMobBurn(event);},
      onFuseStart:event=>{playGameSound('creeper-prime',{minIntervalMs:250});onCreeperPrime(event);},
      getEnvironment:()=>({weather:weatherSystem?.type||weather})
    });
    jadeInspector=new JadeRuntimeInspector({world,player,inventory,passiveMobs,hostileMobs});return new ClientGameplayRuntime({world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem,miningCracks,jadeInspector,vanillaBlockAudio});
  }catch(error){safeDispose(vanillaBlockAudio);safeDispose(miningCracks);safeDispose(jadeInspector);safeDispose(weatherSystem);safeDispose(explosions);safeDispose(projectiles);safeDispose(hostileMobs);safeDispose(passiveMobs);safeDispose(experienceOrbs);safeDispose(drops);safeDispose(player);safeDispose(world);throw error;}
}
