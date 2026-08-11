import {experienceState} from './experience.js';

export function losesInventoryOnDeath(mode){
  return mode==='survival'||mode==='adventure';
}

export function xpDropForDeath(totalXp){
  if(!Number.isFinite(totalXp)||totalXp<0)throw new RangeError('totalXp must be a finite non-negative number');
  const level=experienceState(Math.floor(totalXp)).level;
  return Math.min(100,level*7);
}

export function isRecoverableDeathPosition(position,{voidY=-10}={}){
  if(!position||![position.x,position.y,position.z].every(Number.isFinite)||!Number.isFinite(voidY))return false;
  return position.y>=voidY;
}

export function deathLossPlan({mode,totalXp=0,position,voidY=-10}={}){
  const loses=losesInventoryOnDeath(mode);
  return{
    losesInventory:loses,
    clearsExperience:loses,
    droppedXp:loses?xpDropForDeath(totalXp):0,
    recoverable:loses&&isRecoverableDeathPosition(position,{voidY})
  };
}
