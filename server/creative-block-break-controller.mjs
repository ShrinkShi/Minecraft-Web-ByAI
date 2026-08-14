import {assertClientSessionId} from '../src/client-input-envelope.js';
import {applyAuthoritativeBlockBreak} from './block-break-rules.mjs';
import {DEFAULT_BLOCK_REACH,raycastAuthoritativeBlock} from './block-targeting.mjs';

export const DEFAULT_PENDING_PRIMARY_PRESS_LIMIT=4;

function worldLike(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');
  return value;
}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('setBlock must be a function');return value;}
function reach(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>16)throw new RangeError('maxDistance must be greater than 0 and at most 16');return value;}
function pendingLimit(value){if(!Number.isInteger(value)||value<1||value>32)throw new RangeError('pendingPrimaryPressLimit must be an integer from 1 to 32');return value;}
function playerLike(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('player state must be an object');
  if(typeof value.mode!=='string')throw new TypeError('player mode must be a string');
  return value;
}
function outcome(value){return Object.freeze(value);}

export class CreativeBlockBreakController{
  constructor({world,setBlock,maxDistance=DEFAULT_BLOCK_REACH,pendingPrimaryPressLimit=DEFAULT_PENDING_PRIMARY_PRESS_LIMIT}={}){
    this.world=worldLike(world);this.setBlock=mutationBoundary(setBlock);this.maxDistance=reach(maxDistance);this.pendingPrimaryPressLimit=pendingLimit(pendingPrimaryPressLimit);this.heldSessions=new Set();this.pendingPresses=new Map();
  }

  pendingCount(session){session=assertClientSessionId(session);return this.pendingPresses.get(session)||0;}

  observePrimary(session,pressed){
    session=assertClientSessionId(session);if(typeof pressed!=='boolean')throw new TypeError('primary pressed state must be a boolean');
    const held=this.heldSessions.has(session),pending=this.pendingCount(session);
    if(!pressed){if(held)this.heldSessions.delete(session);return outcome({queued:false,reason:held?'primary-released':'primary-idle',pending});}
    if(held)return outcome({queued:false,reason:'primary-held',pending});
    this.heldSessions.add(session);
    if(pending>=this.pendingPrimaryPressLimit)return outcome({queued:false,reason:'primary-queue-full',pending});
    const next=pending+1;this.pendingPresses.set(session,next);return outcome({queued:true,reason:'primary-queued',pending:next});
  }

  step(session,player){
    session=assertClientSessionId(session);player=playerLike(player);const pending=this.pendingCount(session);
    if(pending===0)return outcome({attempted:false,reason:'no-pending-primary'});
    if(pending===1)this.pendingPresses.delete(session);else this.pendingPresses.set(session,pending-1);
    if(player.mode!=='creative')return outcome({attempted:false,reason:'mode-not-creative'});
    const target=raycastAuthoritativeBlock(this.world,player,{maxDistance:this.maxDistance});
    if(!target)return outcome({attempted:true,reason:'no-target',target:null,breakResult:null});
    const breakResult=applyAuthoritativeBlockBreak(this.world,target,{setBlock:this.setBlock});
    return outcome({attempted:true,reason:breakResult.reason,target,breakResult});
  }

  remove(session){
    session=assertClientSessionId(session);const held=this.heldSessions.delete(session),pending=this.pendingPresses.delete(session);return held||pending;
  }
  clear(){this.heldSessions.clear();this.pendingPresses.clear();}
}
