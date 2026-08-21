import {playVanillaSoundEvent,preloadVanillaSoundEvent,soundEventForBlock} from './vanilla-sounds.js';

export function blockHitPlayback(){return Object.freeze({volume:.25,playbackRate:.5});}

export function preloadBlockSoundObjects(blockId,action='break'){
  const eventName=soundEventForBlock(blockId,action);
  if(!eventName)return Promise.resolve(false);
  return preloadVanillaSoundEvent(eventName).then(result=>result.preloaded===true);
}

export function playBlockHitSound(blockId,options={}){
  const eventName=soundEventForBlock(blockId,'step');if(!eventName)return Promise.resolve({played:false,reason:'unknown-block-hit-sound',blockId});
  return playVanillaSoundEvent(eventName,{...blockHitPlayback(),...options});
}

export function playMiningHitSound(blockId,options={}){
  void preloadBlockSoundObjects(blockId,'break');
  return playBlockHitSound(blockId,options);
}
