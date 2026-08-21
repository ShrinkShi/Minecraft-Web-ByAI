import {BLOCK_SOUND_EVENTS,playVanillaSoundEvent,soundEventForBlock,vanillaSoundObjectUrl} from './vanilla-sounds.js';

const prefetched=new Map();

export function blockHitPlayback(){return Object.freeze({volume:.25,playbackRate:.5});}

export function preloadBlockSoundObjects(blockId,action='break'){
  const eventName=soundEventForBlock(blockId,action),variants=eventName?BLOCK_SOUND_EVENTS[eventName]:null;
  if(!variants?.length||typeof fetch!=='function')return Promise.resolve(false);
  const jobs=variants.map(variant=>{
    let pending=prefetched.get(variant.sha1);if(pending)return pending;
    pending=fetch(vanillaSoundObjectUrl(variant)).then(response=>{if(!response.ok)throw new Error(`Minecraft sound object ${variant.sha1} returned HTTP ${response.status}`);return response.arrayBuffer();}).then(()=>true);
    prefetched.set(variant.sha1,pending);pending.catch(()=>prefetched.delete(variant.sha1));return pending;
  });
  return Promise.allSettled(jobs).then(results=>results.some(result=>result.status==='fulfilled'));
}

export function playBlockHitSound(blockId,options={}){
  const eventName=soundEventForBlock(blockId,'step');if(!eventName)return Promise.resolve({played:false,reason:'unknown-block-hit-sound',blockId});
  return playVanillaSoundEvent(eventName,{...blockHitPlayback(),...options});
}

export function playMiningHitSound(blockId,options={}){
  void preloadBlockSoundObjects(blockId,'break');
  return playBlockHitSound(blockId,options);
}
