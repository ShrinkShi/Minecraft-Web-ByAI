import {assertClientSessionId} from '../src/client-input-envelope.js';
import {applyAuthoritativeBlockBreak} from './block-break-rules.mjs';
import {DEFAULT_BLOCK_REACH,raycastAuthoritativeBlock} from './block-targeting.mjs';

function worldLike(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');
  return value;
}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('setBlock must be a function');return value;}
function reach(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>16)throw new RangeError('maxDistance must be greater than 0 and at most 16');return value;}
function playerLike(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('player state must be an object');
  if(typeof value.mode!=='string')throw new TypeError('player mode must be a string');
  return value;
}
function primaryPressed(inputState,session){
  if(inputState===null||inputState===undefined)return false;
  if(!inputState||typeof inputState!=='object'||Array.isArray(inputState))throw new TypeError('inputState must be an object');
  if(inputState.session!==undefined&&inputState.session!==session)throw new RangeError('inputState session does not match creative break session');
  if(inputState.control===null||inputState.control===undefined)return false;
  if(!inputState.control||typeof inputState.control!=='object'||Array.isArray(inputState.control))throw new TypeError('inputState.control must be an object');
  if(typeof inputState.control.primary!=='boolean')throw new TypeError('inputState.control.primary must be a boolean');
  return inputState.control.primary;
}
function outcome(value){return Object.freeze(value);}

export class CreativeBlockBreakController{
  constructor({world,setBlock,maxDistance=DEFAULT_BLOCK_REACH}={}){
    this.world=worldLike(world);this.setBlock=mutationBoundary(setBlock);this.maxDistance=reach(maxDistance);this.heldSessions=new Set();
  }

  step(session,player,inputState=null){
    session=assertClientSessionId(session);player=playerLike(player);const primary=primaryPressed(inputState,session),wasHeld=this.heldSessions.has(session);
    if(!primary){if(wasHeld)this.heldSessions.delete(session);return outcome({attempted:false,reason:wasHeld?'primary-released':'primary-idle'});}
    if(wasHeld)return outcome({attempted:false,reason:'primary-held'});
    this.heldSessions.add(session);
    if(player.mode!=='creative')return outcome({attempted:false,reason:'mode-not-creative'});
    const target=raycastAuthoritativeBlock(this.world,player,{maxDistance:this.maxDistance});
    if(!target)return outcome({attempted:true,reason:'no-target',target:null,breakResult:null});
    const breakResult=applyAuthoritativeBlockBreak(this.world,target,{setBlock:this.setBlock});
    return outcome({attempted:true,reason:breakResult.reason,target,breakResult});
  }

  remove(session){session=assertClientSessionId(session);return this.heldSessions.delete(session);}
  clear(){this.heldSessions.clear();}
}
