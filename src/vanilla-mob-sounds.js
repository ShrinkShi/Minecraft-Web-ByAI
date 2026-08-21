import {vanillaSoundObjectUrl} from './vanilla-sounds.js';

const variants=entries=>Object.freeze(entries.map(([sha1,logicalPath])=>Object.freeze({sha1,objectPath:`${sha1.slice(0,2)}/${sha1}`,logicalPath})));

const COW_AMBIENT=variants([
  ['e07a2da49011ef4cf9d6b1c80a91a06f808c1243','minecraft/sounds/mob/cow/say1.ogg'],['228bab6d9b09994dc407b9d022bebca791d81c16','minecraft/sounds/mob/cow/say2.ogg'],['05f429069e65d78f7e6609d070a3f294cc3128ab','minecraft/sounds/mob/cow/say3.ogg'],['80ce8d4b8d361b69e42d8d147e42a09d3c85a115','minecraft/sounds/mob/cow/say4.ogg']
]);
const COW_HURT=variants([
  ['989c3b614f736aa77bb2800821ea56936e98ca68','minecraft/sounds/mob/cow/hurt1.ogg'],['758d2a1c36abc84d2744d697b76d5414ea96d9f3','minecraft/sounds/mob/cow/hurt2.ogg'],['2a031f10c7dc24e75d5dc3a374ebe7f36fc3e143','minecraft/sounds/mob/cow/hurt3.ogg']
]);
const SHEEP_VOICE=variants([
  ['a3ffeaa0a75b8d2bdc949c181a6f8db78f8976ca','minecraft/sounds/mob/sheep/say1.ogg'],['1cfd864cbda555477ed9523e640de0d234c18858','minecraft/sounds/mob/sheep/say2.ogg'],['c9ac72409cbe6093e84d72a2a5c719d9e4a0e6b2','minecraft/sounds/mob/sheep/say3.ogg']
]);
const PIG_VOICE=variants([
  ['a99bf88163bcb576e31e6e2275145afba6d1b4c7','minecraft/sounds/mob/pig/say1.ogg'],['ab615a912fb8ea06648836e0ec1cbeeefe117da6','minecraft/sounds/mob/pig/say2.ogg'],['58efedf302e0203a6ff9e59a6535d300286c5594','minecraft/sounds/mob/pig/say3.ogg']
]);
const PIG_DEATH=variants([['4bc87ab869e17732a20c7518a327136baf5b2c26','minecraft/sounds/mob/pig/death.ogg']]);
const CHICKEN_AMBIENT=variants([
  ['74e5422bd83bb2041a6f0d09644bc095c0e9e21a','minecraft/sounds/mob/chicken/say1.ogg'],['3660e743db2bbbcff0866d3f1e606882f1aeb6ac','minecraft/sounds/mob/chicken/say2.ogg'],['49874e07369c3bb0bc8a2fba4f2096d2e9a36c9a','minecraft/sounds/mob/chicken/say3.ogg']
]);
const CHICKEN_HURT=variants([
  ['31b52151bf2a6fa35d2d2aa72f832285d9e7d70d','minecraft/sounds/mob/chicken/hurt1.ogg'],['18752157f5d8718e2752805a657c74a73d2b88db','minecraft/sounds/mob/chicken/hurt2.ogg']
]);
const ZOMBIE_AMBIENT=variants([
  ['b5bc9775243437d87317ab3a66ec8a4d5b96c83d','minecraft/sounds/mob/zombie/say1.ogg'],['bf5086623d5c6735271074b263116fb914ed79b5','minecraft/sounds/mob/zombie/say2.ogg'],['7eb3affa45f47f919e74523a55185e65c2081d12','minecraft/sounds/mob/zombie/say3.ogg']
]);
const ZOMBIE_HURT=variants([
  ['f35e14af35d1d12244dac9e655f4e31d4ef84e1b','minecraft/sounds/mob/zombie/hurt1.ogg'],['bc85d96a99e84a234cbe23841f87e84e71198be3','minecraft/sounds/mob/zombie/hurt2.ogg']
]);
const ZOMBIE_DEATH=variants([['6e0488ab07b9539fbaebc093f194bb6a95b2caec','minecraft/sounds/mob/zombie/death.ogg']]);
const SKELETON_AMBIENT=variants([
  ['199c9f150822950385b9bc1d840605a6a795bd27','minecraft/sounds/mob/skeleton/say1.ogg'],['529abcb09220f0ebeb595f32bb663d026a7e0ae5','minecraft/sounds/mob/skeleton/say2.ogg'],['a11ac56ec61c17e99f4ee33d8712404edf442720','minecraft/sounds/mob/skeleton/say3.ogg']
]);
const SKELETON_HURT=variants([
  ['4d03069c0e14794b463f563044da46433776da60','minecraft/sounds/mob/skeleton/hurt1.ogg'],['d1ad2cbe6584d9cd9483483f8655966d25a251a0','minecraft/sounds/mob/skeleton/hurt2.ogg'],['acffab0bafe2c82ffc8723880aab5ec1682d4329','minecraft/sounds/mob/skeleton/hurt3.ogg'],['a88e0436e38512171a3ef819249c3d1a2650540f','minecraft/sounds/mob/skeleton/hurt4.ogg']
]);
const SKELETON_DEATH=variants([['641e601132b4adb67951e0d49c1004cf1b86eff2','minecraft/sounds/mob/skeleton/death.ogg']]);
const CREEPER_HURT=variants([
  ['74771428c2aa2acbd30638c6706867053bad64d3','minecraft/sounds/mob/creeper/say1.ogg'],['c46c7d2a84749bfcbcf576aea0d66fd3deccba31','minecraft/sounds/mob/creeper/say2.ogg'],['0979bf115d081d70a985f1cfcab1b9274d6be74e','minecraft/sounds/mob/creeper/say3.ogg'],['85c860ea8c55984bf6cabb75354c78f3a603f98d','minecraft/sounds/mob/creeper/say4.ogg']
]);
const CREEPER_DEATH=variants([['fbc1b2c89c5c781e30d702b2885be3f485105869','minecraft/sounds/mob/creeper/death.ogg']]);
const SPIDER_VOICE=variants([
  ['65b49739d48ebc47879ca5528c8283329980b304','minecraft/sounds/mob/spider/say1.ogg'],['501b40b97ee55cb7a97943ee620aa05131089fc2','minecraft/sounds/mob/spider/say2.ogg'],['f9f79162efa6667b753c1fbb46ff9888e8ce5f32','minecraft/sounds/mob/spider/say3.ogg'],['3cf3e8d3aab0a3092f6c6bf681ff156bc9653859','minecraft/sounds/mob/spider/say4.ogg']
]);
const SPIDER_DEATH=variants([['4c69a6edc25d973999aa0db2bb46b583a31da278','minecraft/sounds/mob/spider/death.ogg']]);

export const MOB_SOUND_EVENTS=Object.freeze({
  'entity.cow.ambient':COW_AMBIENT,'entity.cow.hurt':COW_HURT,'entity.cow.death':COW_HURT,
  'entity.sheep.ambient':SHEEP_VOICE,'entity.sheep.hurt':SHEEP_VOICE,'entity.sheep.death':SHEEP_VOICE,
  'entity.pig.ambient':PIG_VOICE,'entity.pig.hurt':PIG_VOICE,'entity.pig.death':PIG_DEATH,
  'entity.chicken.ambient':CHICKEN_AMBIENT,'entity.chicken.hurt':CHICKEN_HURT,'entity.chicken.death':CHICKEN_HURT,
  'entity.zombie.ambient':ZOMBIE_AMBIENT,'entity.zombie.hurt':ZOMBIE_HURT,'entity.zombie.death':ZOMBIE_DEATH,
  'entity.skeleton.ambient':SKELETON_AMBIENT,'entity.skeleton.hurt':SKELETON_HURT,'entity.skeleton.death':SKELETON_DEATH,
  'entity.creeper.hurt':CREEPER_HURT,'entity.creeper.death':CREEPER_DEATH,
  'entity.spider.ambient':SPIDER_VOICE,'entity.spider.hurt':SPIDER_VOICE,'entity.spider.death':SPIDER_DEATH
});

const bufferCache=new Map();let audioContext=null;
const choose=(list,random=Math.random)=>{const value=Number(random?.()),normalized=Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):0;return list[Math.floor(normalized*list.length)];};
export function mobSoundEvent(type,kind){const eventName=`entity.${type}.${kind}`;return MOB_SOUND_EVENTS[eventName]?.length?eventName:null;}
export function mobSoundVolume(position,listener,{baseVolume=1,maxDistance=24}={}){
  if(!position||!listener||![position.x,position.y,position.z,listener.x,listener.y,listener.z].every(Number.isFinite))return 0;
  const distance=Math.hypot(position.x-listener.x,position.y-listener.y,position.z-listener.z);if(distance>=maxDistance)return 0;return Math.max(0,Math.min(1,baseVolume*(1-distance/maxDistance)));
}
function trace(eventName,variant){if(typeof globalThis.dispatchEvent==='function'&&typeof globalThis.CustomEvent==='function')globalThis.dispatchEvent(new CustomEvent('minecraft:sound',{detail:{eventName,sha1:variant.sha1,logicalPath:variant.logicalPath}}));}
async function decoded(context,variant){let pending=bufferCache.get(variant.sha1);if(!pending){pending=fetch(vanillaSoundObjectUrl(variant)).then(response=>{if(!response.ok)throw new Error(`Minecraft mob sound object ${variant.sha1} returned HTTP ${response.status}`);return response.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes));bufferCache.set(variant.sha1,pending);pending.catch(()=>bufferCache.delete(variant.sha1));}return pending;}
export async function playMobSound(type,kind,{position,listener,random=Math.random,baseVolume=(kind==='ambient' ? .72 : 1),maxDistance=24}={}){
  const eventName=mobSoundEvent(type,kind),list=eventName?MOB_SOUND_EVENTS[eventName]:null;if(!list)return{played:false,reason:'unknown-event',type,kind};const volume=mobSoundVolume(position,listener,{baseVolume,maxDistance});if(volume<=0)return{played:false,reason:'out-of-range',eventName};const variant=choose(list,random);trace(eventName,variant);const AudioContextCtor=globalThis.AudioContext||globalThis.webkitAudioContext;if(typeof AudioContextCtor!=='function')return{played:false,reason:'audio-context-unavailable',eventName,variant};
  try{audioContext ||= new AudioContextCtor();if(audioContext.state==='suspended')await audioContext.resume();const buffer=await decoded(audioContext,variant),source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(audioContext.destination);source.start();return{played:true,eventName,variant,volume};}catch(error){console.warn(`无法播放 Minecraft 生物音效 ${eventName}`,error);return{played:false,reason:'playback-failed',eventName,variant,error};}
}

export function playMobSoundEvent(event,listener){if(!event?.type||!event?.kind||!event?.position||!listener)return Promise.resolve({played:false,reason:'invalid-mob-sound-event'});return playMobSound(event.type,event.kind,{position:event.position,listener});}
