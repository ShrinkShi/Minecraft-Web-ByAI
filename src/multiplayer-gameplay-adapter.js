import {createClientGameplayRuntime} from './client-gameplay-runtime.js';
import {installMultiplayerSecondaryRouting} from './multiplayer-secondary-routing.js';
import {RemotePlayerSystem} from './remote-player-system.js';
import {authoritativeEditsToVoxelEdits} from './world-edit-replication.js';
import {applyVoxelOverlay} from './voxel-overlay.js';

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}

export function applyAuthoritativePlayerState(player,state,{applyLook=false}={}){
  object(player,'player');state=object(state,'authoritative player state');const position=object(state.position,'authoritative player position'),velocity=object(state.velocity,'authoritative player velocity');
  player.setMode(state.mode);player.position.set(finite(position.x,'position.x'),finite(position.y,'position.y'),finite(position.z,'position.z'));player.velocity.set(finite(velocity.x,'velocity.x'),finite(velocity.y,'velocity.y'),finite(velocity.z,'velocity.z'));player.grounded=!!state.grounded;player.swimCoverage=Number.isFinite(state.swimCoverage)?Math.max(0,Math.min(1,state.swimCoverage)):0;
  if(applyLook)player.setLook(state.yaw,state.pitch);else player.syncCamera();return player;
}

export async function createAuthoritativeMultiplayerGameplay({readyData,movement,scene,camera,canvas,controlState,onProgress=()=>{}}={}){
  readyData=object(readyData,'multiplayer ready data');movement=object(movement,'multiplayer movement session');const info=object(readyData.worldInfo,'server world info'),worldEdits=object(readyData.worldEdits,'server world edits'),inventorySnapshot=object(readyData.inventorySnapshot,'server inventory snapshot'),initial=object(readyData.initialSnapshot,'initial authoritative snapshot'),position=object(initial.position,'initial authoritative position');
  if(worldEdits.session!==info.session||worldEdits.worldId!==info.worldId)throw new RangeError('multiplayer world edit snapshot identity mismatch');if(inventorySnapshot.session!==info.session)throw new RangeError('multiplayer inventory snapshot identity mismatch');if(inventorySnapshot.mode!==initial.mode)throw new RangeError('multiplayer inventory/player mode mismatch');if(typeof onProgress!=='function')throw new TypeError('onProgress must be a function');
  const savedEdits=authoritativeEditsToVoxelEdits(worldEdits.edits);
  const runtime=await createClientGameplayRuntime({scene,camera,canvas,seed:info.seed,prompt:info.prompt,renderDistance:3,savedEdits,centerX:finite(position.x,'initial position.x'),centerZ:finite(position.z,'initial position.z'),mode:initial.mode,inventoryState:inventorySnapshot,equipmentState:null,controlState,weather:'clear',onWorldEdit:()=>{},onWorldProgress:onProgress,onInventoryPickup:()=>{},onExperience:()=>{},onPlayerHit:()=>{},onPlayerBlast:()=>{},onMobDeath:()=>{},onHostileProjectile:()=>{},onHostileExplosion:()=>{}});
  let remotePlayers=null,releaseSecondary=null;
  try{if(typeof movement.attachWorldBlockApplier==='function')movement.attachWorldBlockApplier(change=>applyVoxelOverlay(runtime.world,change));remotePlayers=new RemotePlayerSystem(scene,{tickRate:info.tickRate});movement.attachRemotePlayerSystem(remotePlayers);releaseSecondary=installMultiplayerSecondaryRouting({runtime,movement});}catch(error){releaseSecondary?.();runtime.dispose();throw error;}
  const disposeRuntime=runtime.dispose.bind(runtime);let disposed=false;runtime.dispose=()=>{if(disposed)return;disposed=true;releaseSecondary?.();return disposeRuntime();};
  const authoritative=movement.step(1)||movement.current?.()||initial;applyAuthoritativePlayerState(runtime.player,authoritative,{applyLook:true});
  if(globalThis.__minecraftE2E&&typeof globalThis.__minecraftE2E==='object'){globalThis.__minecraftE2E.remotePlayers=()=>movement.remoteVisualStates();globalThis.__minecraftE2E.worldBlock=(x,y,z)=>runtime.world.getBlock(x,y,z);}
  return{runtime,remotePlayers,authoritative,worldInfo:{id:info.worldId,name:`服务器世界 ${info.worldId}`,seed:info.seed,prompt:info.prompt,mode:authoritative.mode,remote:true,session:info.session,tickRate:info.tickRate,terrainVersion:info.terrainVersion,worldRevision:movement.worldRevision??worldEdits.revision,inventoryRevision:inventorySnapshot.revision}};
}
