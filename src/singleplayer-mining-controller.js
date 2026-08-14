import {BLOCKS} from './blocks.js';
import {itemDurability} from './item-stack.js';
import {canHarvestBlock,miningDurationMs} from './mining-rules.js';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function targetKey(target){return `${target.x},${target.y},${target.z}:${target.id}`;}
function cloneTarget(target){return target?{x:target.x,y:target.y,z:target.z,id:target.id,previous:target.previous?{...target.previous}:null}:null;}

export class SingleplayerMiningController{
  constructor({aim,getMode,getSelectedStack,breakTarget,spawnDrop,damageSelected,onProgress=()=>{},onBreak=()=>{}}={}){
    this.aim=callback(aim,'aim');this.getMode=callback(getMode,'getMode');this.getSelectedStack=callback(getSelectedStack,'getSelectedStack');this.breakTarget=callback(breakTarget,'breakTarget');this.spawnDrop=callback(spawnDrop,'spawnDrop');this.damageSelected=callback(damageSelected,'damageSelected');this.onProgress=callback(onProgress,'onProgress');this.onBreak=callback(onBreak,'onBreak');
    this.held=false;this.startedAt=0;this.target=null;this.key=null;this.progress=0;
  }

  start(now){now=finite(now,'mining start time');this.held=true;this.startedAt=now;this.target=null;this.key=null;this.progress=0;this.onProgress(0);return this.snapshot();}
  cancel(){this.held=false;this.startedAt=0;this.target=null;this.key=null;this.progress=0;this.onProgress(0);return this.snapshot();}

  step(now){
    now=finite(now,'mining time');const mode=this.getMode();
    if(!this.held||mode==='spectator'||mode==='adventure')return this.cancel();
    const aimed=this.aim();if(!aimed){this.target=null;this.key=null;this.startedAt=now;this.progress=0;this.onProgress(0);return this.snapshot();}
    const nextKey=targetKey(aimed);if(nextKey!==this.key){this.target=cloneTarget(aimed);this.key=nextKey;this.startedAt=now;this.progress=0;this.onProgress(0);return this.snapshot();}
    this.target=cloneTarget(aimed);const selected=this.getSelectedStack(),selectedId=selected?.id??null,duration=miningDurationMs(aimed.id,selectedId,mode);this.progress=Math.max(0,Math.min(1,(now-this.startedAt)/duration));this.onProgress(this.progress);
    if(this.progress<1)return this.snapshot();
    const block=BLOCKS[aimed.id],broken=cloneTarget(aimed),removed=!!this.breakTarget(broken);let harvested=false,wear=null;
    if(removed){
      if(mode!=='creative'&&canHarvestBlock(broken.id,selectedId)&&block?.drops){this.spawnDrop({id:block.drops,count:1},broken);harvested=true;}
      if(mode!=='creative'&&selectedId&&itemDurability(selectedId)!==null)wear=this.damageSelected(selectedId,1);
      this.onBreak({target:broken,block,selected:selected?{...selected}:null,harvested,wear});
    }
    this.target=null;this.key=null;this.startedAt=now;this.progress=0;this.onProgress(0);return Object.freeze({...this.snapshot(),completed:removed,harvested,wear});
  }

  snapshot(){return Object.freeze({held:this.held,startedAt:this.startedAt,target:this.target?Object.freeze(cloneTarget(this.target)):null,progress:this.progress});}
}
