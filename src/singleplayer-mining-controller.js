import {BLOCKS} from './blocks.js';
import {itemDurability} from './item-stack.js';
import {canHarvestBlock,miningProgressDelta} from './mining-rules.js';

export const MAX_SINGLEPLAYER_MINING_DT=.05;
export const MAX_SINGLEPLAYER_MINING_START_SKEW_MS=50;
export const SINGLEPLAYER_MINING_HIT_INTERVAL_MS=200;
const COMPLETION_EPSILON=1e-9;
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function targetKey(target){return `${target.x},${target.y},${target.z}:${target.id}`;}
function cloneTarget(target){return target?{x:target.x,y:target.y,z:target.z,id:target.id,previous:target.previous?{...target.previous}:null}:null;}
function isDamageableKnownItem(itemId){if(!itemId)return false;try{return itemDurability(itemId)!==null;}catch{return false;}}
function emitMiningHit(target){
  if(typeof globalThis.dispatchEvent!=='function'||typeof globalThis.CustomEvent!=='function')return false;
  globalThis.dispatchEvent(new CustomEvent('minecraft:mining-hit',{detail:{blockId:target.id,x:target.x,y:target.y,z:target.z}}));return true;
}

export class SingleplayerMiningController{
  constructor({aim,getMode,getSelectedStack,breakTarget,spawnDrop,damageSelected,onProgress=()=>{},onHit=()=>{},onBreak=()=>{}}={}){
    this.aim=callback(aim,'aim');this.getMode=callback(getMode,'getMode');this.getSelectedStack=callback(getSelectedStack,'getSelectedStack');this.breakTarget=callback(breakTarget,'breakTarget');this.spawnDrop=callback(spawnDrop,'spawnDrop');this.damageSelected=callback(damageSelected,'damageSelected');this.onProgress=callback(onProgress,'onProgress');this.onHit=callback(onHit,'onHit');this.onBreak=callback(onBreak,'onBreak');
    this.held=false;this.startedAt=0;this.lastAt=0;this.lastHitAt=-Infinity;this.hasStepped=false;this.target=null;this.key=null;this.progress=0;
  }

  start(now){now=finite(now,'mining start time');this.held=true;this.startedAt=now;this.lastAt=now;this.lastHitAt=-Infinity;this.hasStepped=false;this.target=null;this.key=null;this.progress=0;this.onProgress(0);return this.snapshot();}
  cancel(){this.held=false;this.startedAt=0;this.lastAt=0;this.lastHitAt=-Infinity;this.hasStepped=false;this.target=null;this.key=null;this.progress=0;this.onProgress(0);return this.snapshot();}

  step(now){
    now=finite(now,'mining time');const mode=this.getMode();
    if(!this.held||mode==='spectator'||mode==='adventure')return this.cancel();
    if(now<this.lastAt){
      const skew=this.lastAt-now;
      if(!this.hasStepped&&skew<=MAX_SINGLEPLAYER_MINING_START_SKEW_MS){this.startedAt=now;this.lastAt=now;}
      else throw new RangeError('mining time must be monotonic');
    }
    const dtSeconds=Math.min(MAX_SINGLEPLAYER_MINING_DT,(now-this.lastAt)/1000);this.lastAt=now;this.hasStepped=true;const aimed=this.aim();
    if(!aimed){this.target=null;this.key=null;this.startedAt=now;this.lastHitAt=-Infinity;this.progress=0;this.onProgress(0);return this.snapshot();}
    const selected=this.getSelectedStack(),selectedId=selected?.id??null,nextKey=targetKey(aimed),sameTarget=nextKey===this.key;this.target=cloneTarget(aimed);this.key=nextKey;if(!sameTarget){this.startedAt=now;this.lastHitAt=-Infinity;this.progress=0;}
    this.progress=Math.min(1,this.progress+miningProgressDelta(aimed.id,selectedId,dtSeconds,mode));this.onProgress(this.progress);
    if(mode!=='creative'&&now-this.lastHitAt>=SINGLEPLAYER_MINING_HIT_INTERVAL_MS){const hit=cloneTarget(aimed);this.lastHitAt=now;this.onHit({target:hit,block:BLOCKS[aimed.id],selected:selected?{...selected}:null,progress:this.progress});emitMiningHit(hit);}
    if(this.progress<1-COMPLETION_EPSILON)return this.snapshot();
    const block=BLOCKS[aimed.id],broken=cloneTarget(aimed),removed=!!this.breakTarget(broken);let harvested=false,wear=null;
    if(removed){
      if(mode!=='creative'&&canHarvestBlock(broken.id,selectedId)&&block?.drops){this.spawnDrop({id:block.drops,count:1},broken);harvested=true;}
      if(mode!=='creative'&&isDamageableKnownItem(selectedId))wear=this.damageSelected(selectedId,1);
      this.onBreak({target:broken,block,selected:selected?{...selected}:null,harvested,wear});
    }
    this.target=null;this.key=null;this.startedAt=now;this.lastHitAt=-Infinity;this.progress=0;this.onProgress(0);return Object.freeze({...this.snapshot(),completed:removed,harvested,wear});
  }

  snapshot(){return Object.freeze({held:this.held,startedAt:this.startedAt,lastAt:this.lastAt,target:this.target?Object.freeze(cloneTarget(this.target)):null,progress:this.progress});}
}
