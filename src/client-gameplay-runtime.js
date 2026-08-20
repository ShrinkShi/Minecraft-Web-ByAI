import {VoxelWorld} from './world.js';
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

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function positiveInteger(value,label){if(!Number.isInteger(value)||value<1||value>16)throw new RangeError(`${label} must be an integer from 1 to 16`);return value;}
function objectOrNull(value,label){if(value===null||value===undefined)return null;if(typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object or null`);return value;}

function safeDispose(value){try{value?.dispose?.();}catch{}}

export class ClientGameplayRuntime{
  constructor({world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem,jadeInspector=null}){
    Object.assign(this,{world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem,jadeInspector});this.disposed=false;
  }

  dispose(){
    if(this.disposed)return false;this.jadeInspector?.dispose();this.weatherSystem?.dispose();this.explosions?.dispose();this.projectiles?.dispose();this.hostileMobs?.dispose();this.passiveMobs?.dispose();this.experienceOrbs?.dispose();this.drops?.dispose();this.player?.dispose();this.world?.dispose();this.disposed=true;return true;
  }
}

export async function createClientGameplayRuntime({
  scene,camera,canvas,seed='1',prompt='',renderDistance=3,savedEdits={},centerX=0,centerZ=0,mode='survival',inventoryState=null,equipmentState=null,controlState=null,weather='clear',
  onWorldEdit=()=>{},onWorldProgress=()=>{},onInventoryPickup=()=>{},onExperience=()=>{},onPlayerHit=()=>{},onPlayerBlast=()=>{},onMobDeath=()=>{},onHostileProjectile=()=>{},onHostileExplosion=()=>{},onMobBurn=()=>{},onCreeperPrime=()=>{},onExplosionBlockDestroyed=()=>{}
}={}){
  centerX=finite(centerX,'centerX');centerZ=finite(centerZ,'centerZ');renderDistance=positiveInteger(renderDistance,'renderDistance');savedEdits=objectOrNull(savedEdits,'savedEdits')||{};inventoryState=objectOrNull(inventoryState,'inventoryState');equipmentState=objectOrNull(equipmentState,'equipmentState');
  for(const [label,value] of Object.entries({onWorldEdit,onWorldProgress,onInventoryPickup,onExperience,onPlayerHit,onPlayerBlast,onMobDeath,onHostileProjectile,onHostileExplosion,onMobBurn,onCreeperPrime,onExplosionBlockDestroyed}))callback(value,label);

  let world=null,player=null,inventory=null,equipment=null,drops=null,experienceOrbs=null,projectiles=null,explosions=null,passiveMobs=null,hostileMobs=null,weatherSystem=null,jadeInspector=null;
  try{
    world=new VoxelWorld(scene,{seed:String(seed??'1'),prompt:String(prompt??''),renderDistance,savedEdits,onEdit:onWorldEdit,onProgress:onWorldProgress});await world.generateArea(centerX,centerZ);
    inventory=new Inventory(mode,inventoryState);equipment=new Equipment(equipmentState);player=new PlayerController(camera,canvas,world,scene);if(controlState!==null&&controlState!==undefined)player.setControlState(controlState);player.setMode(mode);
    drops=new DropSystem(scene,world,inventory,onInventoryPickup);experienceOrbs=new ExperienceOrbSystem(scene,world,onExperience);projectiles=new ProjectileSystem(scene,world,{onPlayerHit});explosions=new ExplosionSystem(scene,world,{onPlayerBlast,onBlockDestroyed:onExplosionBlockDestroyed});passiveMobs=new PassiveMobSystem(scene,world,{onDeath:onMobDeath});hostileMobs=new HostileMobSystem(scene,world,{onPlayerHit,onProjectile:onHostileProjectile,onExplosion:onHostileExplosion,onDeath:onMobDeath,onBurn:onMobBurn,onFuseStart:onCreeperPrime});weatherSystem=new WeatherSystem(scene);weatherSystem.setWeather(weather);
    jadeInspector=new JadeRuntimeInspector({world,player,inventory,passiveMobs,hostileMobs});return new ClientGameplayRuntime({world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem,jadeInspector});
  }catch(error){safeDispose(jadeInspector);safeDispose(weatherSystem);safeDispose(explosions);safeDispose(projectiles);safeDispose(hostileMobs);safeDispose(passiveMobs);safeDispose(experienceOrbs);safeDispose(drops);safeDispose(player);safeDispose(world);throw error;}
}
