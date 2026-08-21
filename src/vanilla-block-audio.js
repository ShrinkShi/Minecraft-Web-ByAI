import {BLOCK,BLOCKS} from './blocks.js';
import {playBlockSound} from './vanilla-sounds.js';

const STEP_DISTANCE=.55;
const MAX_TRACKED_FRAME_DISTANCE=1;

function audibleBedPart(block){return !block?.bed||block.bedPart==='foot';}

export function blockSoundTransition(previous,next){
  if(previous!==BLOCK.AIR&&next===BLOCK.AIR)return Object.freeze({blockId:previous,action:'break'});
  if(previous===BLOCK.AIR&&next!==BLOCK.AIR)return Object.freeze({blockId:next,action:'place'});
  return null;
}

export function installVanillaBlockAudio({world,player}={}){
  if(!world||typeof world.getBlock!=='function'||typeof world.setBlock!=='function')throw new TypeError('world must expose getBlock/setBlock');
  if(!player||typeof player.update!=='function'||!player.position)throw new TypeError('player must expose update/position');

  const originalSetBlock=world.setBlock,originalUpdate=player.update;
  let lastX=player.position.x,lastZ=player.position.z,stepDistance=0,disposed=false;

  function wrappedSetBlock(wx,wy,wz,id,options){
    const previous=world.getBlock(wx,wy,wz),changed=originalSetBlock.call(world,wx,wy,wz,id);
    if(!changed||options?.sound===false)return changed;
    const transition=blockSoundTransition(previous,id);if(!transition)return changed;
    const block=BLOCKS[transition.blockId];
    if(block&&audibleBedPart(block))void playBlockSound(transition.blockId,transition.action);
    return changed;
  }

  function wrappedUpdate(dt){
    const result=originalUpdate.call(player,dt),x=player.position.x,z=player.position.z,frameDistance=Math.hypot(x-lastX,z-lastZ);lastX=x;lastZ=z;
    if(!Number.isFinite(frameDistance)||frameDistance>MAX_TRACKED_FRAME_DISTANCE||player.flying||player.mode==='spectator'||!player.grounded||player.swimCoverage>0){stepDistance=0;return result;}
    if(frameDistance<=1e-4)return result;
    stepDistance+=frameDistance;if(stepDistance<STEP_DISTANCE)return result;stepDistance%=STEP_DISTANCE;
    const blockId=world.getBlock(Math.floor(player.position.x),Math.floor(player.position.y-.05),Math.floor(player.position.z));
    if(BLOCKS[blockId]?.solid)void playBlockSound(blockId,'step');
    return result;
  }

  world.setBlock=wrappedSetBlock;player.update=wrappedUpdate;
  return Object.freeze({
    dispose(){
      if(disposed)return false;disposed=true;
      if(world.setBlock===wrappedSetBlock)world.setBlock=originalSetBlock;
      if(player.update===wrappedUpdate)player.update=originalUpdate;
      return true;
    }
  });
}
