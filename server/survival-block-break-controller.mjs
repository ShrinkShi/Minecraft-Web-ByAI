import {assertClientSessionId} from '../src/client-input-envelope.js';
import {BLOCKS} from '../src/blocks.js';
import {canHarvestBlock,miningProgressDelta} from '../src/mining-rules.js';
import {applyAuthoritativeBlockBreak} from './block-break-rules.mjs';
import {DEFAULT_BLOCK_REACH,raycastAuthoritativeBlock} from './block-targeting.mjs';

export const DEFAULT_SURVIVAL_MINING_DT=.05;
const COMPLETION_EPSILON=1e-9;

function worldLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('setBlock must be a function');return value;}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function reach(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>16)throw new RangeError('maxDistance must be greater than 0 and at most 16');return value;}
function dtValue(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>.25)throw new RangeError('mining dt must be greater than 0 and at most .25');return value;}
function playerLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.mode!=='string')throw new TypeError('player state must be an object with mode');return value;}
function selectedItemId(stack){return stack&&typeof stack.id==='string'?stack.id:null;}
function key(target){return`${target.x},${target.y},${target.z},${target.id}`;}
function outcome(value){return Object.freeze(value);}

export class SurvivalBlockBreakController{
  constructor({world,setBlock,onDrop=()=>{},maxDistance=DEFAULT_BLOCK_REACH}={}){
    this.world=worldLike(world);this.setBlock=mutationBoundary(setBlock);this.onDrop=callback(onDrop,'onDrop');this.maxDistance=reach(maxDistance);this.heldSessions=new Set();this.progressBySession=new Map();
  }

  observePrimary(session,pressed){session=assertClientSessionId(session);if(typeof pressed!=='boolean')throw new TypeError('primary pressed state must be a boolean');if(pressed){this.heldSessions.add(session);return outcome({held:true,reset:false});}const held=this.heldSessions.delete(session),reset=this.progressBySession.delete(session);return outcome({held:false,reset:held||reset});}
  progress(session){session=assertClientSessionId(session);const state=this.progressBySession.get(session);return state?outcome({target:{...state.target},progress:state.progress}):null;}

  step(session,player,selectedStack=null,{dt=DEFAULT_SURVIVAL_MINING_DT}={}){
    session=assertClientSessionId(session);player=playerLike(player);dt=dtValue(dt);
    if(!this.heldSessions.has(session)){this.progressBySession.delete(session);return outcome({attempted:false,reason:'primary-not-held',progress:0,target:null,breakResult:null,drop:null});}
    if(player.mode!=='survival'){this.progressBySession.delete(session);return outcome({attempted:false,reason:'mode-not-survival',progress:0,target:null,breakResult:null,drop:null});}
    const target=raycastAuthoritativeBlock(this.world,player,{maxDistance:this.maxDistance});if(!target){this.progressBySession.delete(session);return outcome({attempted:true,reason:'no-target',progress:0,target:null,breakResult:null,drop:null});}
    const targetKey=key(target),itemId=selectedItemId(selectedStack),previous=this.progressBySession.get(session),base=previous?.key===targetKey?previous.progress:0,progress=Math.min(1,base+miningProgressDelta(target.id,itemId,dt,'survival'));
    if(progress<1-COMPLETION_EPSILON){this.progressBySession.set(session,{key:targetKey,target:{...target},progress});return outcome({attempted:true,reason:previous?.key===targetKey?'mining':'target-acquired',progress,target,breakResult:null,drop:null});}
    this.progressBySession.delete(session);const block=BLOCKS[target.id],breakResult=applyAuthoritativeBlockBreak(this.world,target,{setBlock:this.setBlock});let drop=null;
    if(breakResult.changed&&block?.drops&&canHarvestBlock(target.id,itemId)){
      drop=Object.freeze({session,itemId:block.drops,count:1,blockId:target.id,position:Object.freeze({x:target.x+.5,y:target.y+.6,z:target.z+.5})});try{this.onDrop(drop);}catch{}
    }
    return outcome({attempted:true,reason:breakResult.reason,progress:breakResult.changed?1:0,target,breakResult,drop});
  }

  remove(session){session=assertClientSessionId(session);const held=this.heldSessions.delete(session),progress=this.progressBySession.delete(session);return held||progress;}
  clear(){this.heldSessions.clear();this.progressBySession.clear();}
}
