export const VANILLA_SOUND_EVENTS=Object.freeze({
  'item.hoe.till':Object.freeze([
    Object.freeze({sha1:'0e6696ec35c5f4982cad6a6731edcffb11728aa9',objectPath:'0e/0e6696ec35c5f4982cad6a6731edcffb11728aa9',logicalPath:'minecraft/sounds/item/hoe/till1.ogg'}),
    Object.freeze({sha1:'46dd1e5e0f90bb72261e2986d530e80e8fc50560',objectPath:'46/46dd1e5e0f90bb72261e2986d530e80e8fc50560',logicalPath:'minecraft/sounds/item/hoe/till2.ogg'}),
    Object.freeze({sha1:'cb95637a9d5e9b0cb36a2516f0dfac30fed9d720',objectPath:'cb/cb95637a9d5e9b0cb36a2516f0dfac30fed9d720',logicalPath:'minecraft/sounds/item/hoe/till4.ogg'})
  ]),
  'item.axe.strip':Object.freeze([
    Object.freeze({sha1:'42b2964c08f50be3fda62257202efe42f262c005',objectPath:'42/42b2964c08f50be3fda62257202efe42f262c005',logicalPath:'minecraft/sounds/item/axe/strip1.ogg'}),
    Object.freeze({sha1:'38044a5747fd72dc26f3c0a37bef44ffa3744078',objectPath:'38/38044a5747fd72dc26f3c0a37bef44ffa3744078',logicalPath:'minecraft/sounds/item/axe/strip2.ogg'}),
    Object.freeze({sha1:'a84dafa90faa56556346437e5f27ad047dc584ea',objectPath:'a8/a84dafa90faa56556346437e5f27ad047dc584ea',logicalPath:'minecraft/sounds/item/axe/strip3.ogg'}),
    Object.freeze({sha1:'7621881ced7901c92236f386c26cd678aaf9ba49',objectPath:'76/7621881ced7901c92236f386c26cd678aaf9ba49',logicalPath:'minecraft/sounds/item/axe/strip4.ogg'})
  ]),
  'item.shovel.flatten':Object.freeze([
    Object.freeze({sha1:'659b0fb0ef28429e3b779d833d6eedd8305cbbbc',objectPath:'65/659b0fb0ef28429e3b779d833d6eedd8305cbbbc',logicalPath:'minecraft/sounds/item/shovel/flatten1.ogg'}),
    Object.freeze({sha1:'ab51a39c66800bd6fd98c450131aac20790c535a',objectPath:'ab/ab51a39c66800bd6fd98c450131aac20790c535a',logicalPath:'minecraft/sounds/item/shovel/flatten2.ogg'}),
    Object.freeze({sha1:'188e05f8f12787ea22dd1836fe2c9c7e4efd03af',objectPath:'18/188e05f8f12787ea22dd1836fe2c9c7e4efd03af',logicalPath:'minecraft/sounds/item/shovel/flatten3.ogg'}),
    Object.freeze({sha1:'2bf88ed6015273fa5b757531597cf156176b35f8',objectPath:'2b/2bf88ed6015273fa5b757531597cf156176b35f8',logicalPath:'minecraft/sounds/item/shovel/flatten4.ogg'})
  ])
});

export const TOOL_ACTION_SOUND_EVENTS=Object.freeze({
  till:'item.hoe.till',
  strip:'item.axe.strip',
  flatten:'item.shovel.flatten'
});

const bufferCache=new Map();
let audioContext=null;

function chooseVariant(variants,random=Math.random){
  const value=Number(random?.());
  const normalized=Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):0;
  return variants[Math.floor(normalized*variants.length)];
}

export function soundEventForToolAction(kind){return TOOL_ACTION_SOUND_EVENTS[kind]||null;}
export function vanillaSoundObjectUrl(variant){return new URL(`../原版Minecraft音频文件/${variant.objectPath}`,import.meta.url).href;}

function emitSoundTrace(eventName,variant){
  if(typeof globalThis.dispatchEvent!=='function'||typeof globalThis.CustomEvent!=='function')return;
  globalThis.dispatchEvent(new CustomEvent('minecraft:sound',{detail:{eventName,sha1:variant.sha1,logicalPath:variant.logicalPath}}));
}

async function decodedBuffer(context,variant){
  let pending=bufferCache.get(variant.sha1);
  if(!pending){
    pending=fetch(vanillaSoundObjectUrl(variant)).then(response=>{
      if(!response.ok)throw new Error(`Minecraft sound object ${variant.sha1} returned HTTP ${response.status}`);
      return response.arrayBuffer();
    }).then(bytes=>context.decodeAudioData(bytes));
    bufferCache.set(variant.sha1,pending);
    pending.catch(()=>bufferCache.delete(variant.sha1));
  }
  return pending;
}

export async function playVanillaSoundEvent(eventName,{volume=1,playbackRate=1,random=Math.random}={}){
  const variants=VANILLA_SOUND_EVENTS[eventName];
  if(!variants?.length)return{played:false,reason:'unknown-event',eventName};
  const variant=chooseVariant(variants,random);
  emitSoundTrace(eventName,variant);
  const AudioContextCtor=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(typeof AudioContextCtor!=='function')return{played:false,reason:'audio-context-unavailable',eventName,variant};
  try{
    audioContext ||= new AudioContextCtor();
    if(audioContext.state==='suspended')await audioContext.resume();
    const buffer=await decodedBuffer(audioContext,variant),source=audioContext.createBufferSource(),gain=audioContext.createGain();
    source.buffer=buffer;source.playbackRate.value=Number.isFinite(playbackRate)&&playbackRate>0?playbackRate:1;
    gain.gain.value=Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):1;
    source.connect(gain);gain.connect(audioContext.destination);source.start();
    return{played:true,eventName,variant};
  }catch(error){
    console.warn(`无法播放 Minecraft 原版音效 ${eventName}`,error);
    return{played:false,reason:'playback-failed',eventName,variant,error};
  }
}

export function playToolSecondaryActionSound(kind,options){
  const eventName=soundEventForToolAction(kind);
  return eventName?playVanillaSoundEvent(eventName,options):Promise.resolve({played:false,reason:'unknown-tool-action',kind});
}
