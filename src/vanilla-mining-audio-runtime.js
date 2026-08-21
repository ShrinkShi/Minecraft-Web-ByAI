import {playMiningHitSound} from './vanilla-mining-audio.js';

let installedRuntime=null;

export function miningHitBlockId(event){
  const blockId=Number(event?.detail?.blockId);
  return Number.isInteger(blockId)&&blockId>=0?blockId:null;
}

export function installVanillaMiningAudioRuntime(target=globalThis){
  if(installedRuntime)return installedRuntime;
  if(!target||typeof target.addEventListener!=='function'||typeof target.removeEventListener!=='function')return null;
  let disposed=false;
  const onMiningHit=event=>{
    const blockId=miningHitBlockId(event);if(blockId===null)return;
    void playMiningHitSound(blockId);
  };
  target.addEventListener('minecraft:mining-hit',onMiningHit);
  installedRuntime=Object.freeze({
    dispose(){
      if(disposed)return false;disposed=true;target.removeEventListener('minecraft:mining-hit',onMiningHit);installedRuntime=null;return true;
    }
  });
  return installedRuntime;
}
