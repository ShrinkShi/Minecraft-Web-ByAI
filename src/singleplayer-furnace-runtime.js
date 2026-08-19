import {BLOCK} from './blocks.js';
import {FurnaceContainerHub} from './furnace-container-state.js';
import {attachFurnaceSender,publishFurnaceClose,publishFurnaceResult,publishFurnaceSnapshot} from './furnace-channel.js';
import {itemStacksCanMerge} from './item-stack.js';
import {maxStack} from './items.js';
import {FURNACE_SLOT,furnaceCanInsert,furnaceStackLimitFor,materializeSmeltingExperience,normalizeFurnaceStack} from './smelting.js';

const MAX_ACTIVE_FRAME_GAP_SECONDS=.5;
const defaultClock=()=>globalThis.performance?.now?.()??Date.now();
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function cell(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('singleplayer furnace target must be an object');const result={};for(const axis of ['x','y','z']){if(!Number.isInteger(value[axis]))throw new RangeError(`singleplayer furnace target.${axis} must be an integer`);result[axis]=value[axis];}return Object.freeze(result);}
function sameCell(a,b){return !!a&&!!b&&a.x===b.x&&a.y===b.y&&a.z===b.z;}
function interactiveMode(mode){return mode==='survival'||mode==='creative';}
function inputSlot(value){if(value!==FURNACE_SLOT.INPUT&&value!==FURNACE_SLOT.FUEL)throw new RangeError('singleplayer furnace slot must be input or fuel');return value;}
function mouseButton(value){if(value!==0&&value!==2)throw new RangeError('singleplayer furnace mouse button must be 0 or 2');return value;}
function wireSnapshot(snapshot){return Object.freeze({version:1,kind:'furnace-container-snapshot',session:'singleplayer',...snapshot});}
function validCursorStack(value){try{return normalizeFurnaceStack(value,{label:'singleplayer furnace cursor'});}catch{return null;}}
function inventoryLike(value){if(!value||typeof value!=='object'||!Array.isArray(value.slots)||typeof value.returnExistingStack!=='function'||typeof value.addStack!=='function'||typeof value.returnCursor!=='function')throw new TypeError('singleplayer furnace inventory is invalid');return value;}
function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('singleplayer furnace world must expose getBlock');return value;}

export class SingleplayerFurnaceRuntime{
  constructor({world,inventory,getMode=()=> 'survival',onChanged=()=>{},onExperience=()=>{},onDrop=()=>{},random=Math.random,clock=defaultClock}={}){
    this.world=worldLike(world);this.inventory=inventoryLike(inventory);this.getMode=callback(getMode,'singleplayer furnace getMode');this.onChanged=callback(onChanged,'singleplayer furnace onChanged');this.onExperience=callback(onExperience,'singleplayer furnace onExperience');this.onDrop=callback(onDrop,'singleplayer furnace onDrop');this.random=callback(random,'singleplayer furnace random');this.clock=callback(clock,'singleplayer furnace clock');this.lastClockMs=null;this.hub=new FurnaceContainerHub();this.openTarget=null;this.tickCarry=0;this.disposed=false;this.releaseSender=attachFurnaceSender(action=>this.handle(action));
  }
  snapshot(target=this.openTarget){return target&&this.hub.has(target)?this.hub.snapshot(target):null;}
  serialize(){return this.hub.serialize();}
  restore(records){
    if(records===undefined||records===null)return Object.freeze({restored:0,discarded:0});if(!Array.isArray(records))return Object.freeze({restored:0,discarded:1});let restored=0,discarded=0;
    for(const record of records){try{cell(record?.target);this.hub.restore(record);restored++;}catch{discarded++;}}
    return Object.freeze({restored,discarded});
  }
  publish(target=this.openTarget){if(!target||!this.hub.has(target))return null;return publishFurnaceSnapshot(wireSnapshot(this.hub.snapshot(target)));}
  result(ok,code,extra={}){return publishFurnaceResult(Object.freeze({version:1,kind:'furnace-transaction-result',session:'singleplayer',ok,code,...extra}));}
  open(target){
    if(this.disposed)return Object.freeze({opened:false,reason:'disposed'});target=cell(target);if(!interactiveMode(this.getMode()))return Object.freeze({opened:false,reason:'mode-invalid'});if(this.world.getBlock(target.x,target.y,target.z)!==BLOCK.FURNACE)return Object.freeze({opened:false,reason:'not-furnace'});
    if(this.openTarget&&!sameCell(this.openTarget,target))this.close('switched-container');const snapshot=this.hub.open(target);this.openTarget=target;publishFurnaceSnapshot(wireSnapshot(snapshot));return Object.freeze({opened:true,reason:'furnace-opened',target:snapshot.target,revision:snapshot.revision});
  }
  settleCursor(target){
    if(!this.inventory.cursor)return Object.freeze({changed:false,overflow:null});const overflow=this.inventory.returnCursor();this.touchInventory();if(overflow)this.onDrop({...overflow},target);this.onChanged({source:'furnace-close-cursor',target,overflow});return Object.freeze({changed:true,overflow:overflow?Object.freeze({...overflow}):null});
  }
  close(reason='client-closed'){
    if(!this.openTarget)return null;const target=this.openTarget;const cursor=this.settleCursor(target);this.openTarget=null;publishFurnaceClose(Object.freeze({version:1,kind:'furnace-container-close',session:'singleplayer',target,reason}));return Object.freeze({target,reason,cursor});
  }
  validateOpen(){if(!this.openTarget)return true;if(!interactiveMode(this.getMode())){this.close('mode-invalid');return false;}if(this.world.getBlock(this.openTarget.x,this.openTarget.y,this.openTarget.z)!==BLOCK.FURNACE){this.close('block-removed');return false;}return true;}
  touchInventory(){this.inventory.notify?.('singleplayer-furnace');}
  activeElapsed(dt){
    const now=this.clock();if(!Number.isFinite(now))throw new RangeError('singleplayer furnace clock must return a finite millisecond timestamp');let elapsed=dt;if(this.lastClockMs!==null){const wall=(now-this.lastClockMs)/1000;if(Number.isFinite(wall)&&wall>0&&wall<=MAX_ACTIVE_FRAME_GAP_SECONDS)elapsed=Math.max(elapsed,wall);}this.lastClockMs=now;return elapsed;
  }
  clickSlot(state,slot,button,shift){
    slot=inputSlot(slot);button=mouseButton(button);if(typeof shift!=='boolean')throw new TypeError('singleplayer furnace shift must be boolean');const current=state.snapshot().slots[slot],expectedRevision=state.revision;
    if(shift){if(!current)return Object.freeze({changed:false,reason:'no-change'});const incoming={...current},remaining=this.inventory.returnExistingStack(incoming),moved=incoming.count-remaining;if(moved<=0)return Object.freeze({changed:false,reason:'inventory-full'});const replacement=remaining?{...incoming,count:remaining}:null,outcome=state.replaceSlot(slot,replacement,{expectedRevision});if(!outcome.changed)throw new Error('singleplayer furnace inventory/state shift transaction diverged');this.touchInventory();return Object.freeze({changed:true,reason:remaining?'shift-moved-partial':'shift-moved'});}
    const cursor=this.inventory.cursor,currentStack=current?{...current}:null;let replacement=currentStack,nextCursor=cursor?{...cursor}:null,changed=false,reason='no-change';
    if(button===0){
      if(!cursor&&current){replacement=null;nextCursor={...current};changed=true;reason='picked-up';}
      else if(cursor&&!current){const normalized=validCursorStack(cursor);if(!normalized||!furnaceCanInsert(slot,normalized.id))return Object.freeze({changed:false,reason:'slot-rejects-item'});const moved=Math.min(normalized.count,furnaceStackLimitFor(normalized.id));replacement={...normalized,count:moved};nextCursor=normalized.count===moved?null:{...cursor,count:normalized.count-moved};changed=true;reason=nextCursor?'placed-partial':'placed';}
      else if(cursor&&current){const normalized=validCursorStack(cursor);if(!normalized||!furnaceCanInsert(slot,normalized.id))return Object.freeze({changed:false,reason:'slot-rejects-item'});if(itemStacksCanMerge(normalized,current)){const moved=Math.min(normalized.count,furnaceStackLimitFor(current.id)-current.count);if(moved<=0)return Object.freeze({changed:false,reason:'slot-full'});replacement={...current,count:current.count+moved};nextCursor=normalized.count===moved?null:{...cursor,count:normalized.count-moved};changed=true;reason='merged';}else{if(normalized.count>furnaceStackLimitFor(normalized.id))return Object.freeze({changed:false,reason:'slot-full'});replacement={...normalized};nextCursor={...current};changed=true;reason='swapped';}}
    }else{
      if(!cursor&&current){const take=Math.ceil(current.count/2);replacement=current.count===take?null:{...current,count:current.count-take};nextCursor={...current,count:take};changed=true;reason='split-picked-up';}
      else if(cursor&&!current){const normalized=validCursorStack(cursor);if(!normalized||!furnaceCanInsert(slot,normalized.id))return Object.freeze({changed:false,reason:'slot-rejects-item'});replacement={...normalized,count:1};nextCursor=normalized.count===1?null:{...cursor,count:normalized.count-1};changed=true;reason='placed-one';}
      else if(cursor&&current){const normalized=validCursorStack(cursor);if(!normalized||!itemStacksCanMerge(normalized,current)||!furnaceCanInsert(slot,normalized.id))return Object.freeze({changed:false,reason:'no-change'});if(current.count>=furnaceStackLimitFor(current.id))return Object.freeze({changed:false,reason:'slot-full'});replacement={...current,count:current.count+1};nextCursor=normalized.count===1?null:{...cursor,count:normalized.count-1};changed=true;reason='merged-one';}
    }
    if(!changed)return Object.freeze({changed:false,reason});const outcome=state.replaceSlot(slot,replacement,{expectedRevision});if(!outcome.changed)throw new Error('singleplayer furnace cursor/state transaction diverged');this.inventory.cursor=nextCursor;this.touchInventory();return Object.freeze({changed:true,reason});
  }
  takeOutput(state,{button=0,shift=false}={}){
    button=mouseButton(button);if(typeof shift!=='boolean')throw new TypeError('singleplayer furnace output shift must be boolean');const output=state.snapshot().slots[FURNACE_SLOT.OUTPUT];if(!output)return Object.freeze({changed:false,reason:'output-empty',experience:0,awardedExperience:0});let amount=0;
    if(shift)amount=Math.min(output.count,this.inventory.capacityFor(output.id));else{const cursor=this.inventory.cursor;if(cursor&&!itemStacksCanMerge(cursor,output))return Object.freeze({changed:false,reason:'result-blocked',experience:0,awardedExperience:0});const capacity=maxStack(output.id)-(cursor?.count||0);amount=Math.min(output.count,button===2?1:capacity,capacity);}
    if(amount<=0)return Object.freeze({changed:false,reason:shift?'inventory-full':'result-blocked',experience:0,awardedExperience:0});const outcome=state.takeOutput(amount,{expectedRevision:state.revision});if(!outcome.changed)return outcome;
    if(shift){const remaining=this.inventory.addStack(outcome.taken);if(remaining!==0)throw new Error('singleplayer furnace output capacity diverged from inventory insertion');}else if(this.inventory.cursor)this.inventory.cursor.count+=outcome.taken.count;else this.inventory.cursor={...outcome.taken};this.touchInventory();
    const awardedExperience=materializeSmeltingExperience(outcome.experience,this.random);if(awardedExperience>0)this.onExperience(awardedExperience,state.target);return Object.freeze({changed:true,reason:shift?'shift-output-taken':'output-taken',experience:outcome.experience,awardedExperience,taken:outcome.taken});
  }
  handle(action){
    if(this.disposed)return this.result(false,'disposed');if(!action||typeof action!=='object')return this.result(false,'invalid-action');if(!this.openTarget)return this.result(false,'container-closed');if(!this.validateOpen())return this.result(false,'container-closed');const state=this.hub.state(this.openTarget);
    if(action.type==='close'){this.close('client-closed');return this.result(true,'closed');}
    let outcome;if(action.type==='slot-click')outcome=this.clickSlot(state,action.slot,action.button,!!action.shift);else if(action.type==='take-output')outcome=this.takeOutput(state,{button:action.button,shift:!!action.shift});else return this.result(false,'unsupported-action');
    if(outcome.changed){this.onChanged({source:'furnace-transaction',target:state.target,outcome});this.publish(state.target);}return this.result(true,outcome.reason||'no-change',{experience:outcome.experience??0,awardedExperience:outcome.awardedExperience??0});
  }
  update(dt){
    if(this.disposed||!Number.isFinite(dt)||dt<=0)return Object.freeze({ticks:0,changed:0,smelted:0});this.validateOpen();this.tickCarry+=this.activeElapsed(dt)*20;const ticks=Math.floor(this.tickCarry);if(ticks<1)return Object.freeze({ticks:0,changed:0,smelted:0});this.tickCarry-=ticks;const result=this.hub.tickAll(ticks);if(result.changed){this.onChanged({source:'furnace-tick',ticks,result});if(this.openTarget&&this.hub.has(this.openTarget))this.publish(this.openTarget);}return Object.freeze({ticks,changed:result.changed,smelted:result.smelted});
  }
  break(target){
    target=cell(target);const wasOpen=sameCell(this.openTarget,target);const result=this.hub.break(target);if(wasOpen)this.close('block-removed');if(!result.changed)return result;for(const stack of result.contents)this.onDrop({...stack},target);this.onChanged({source:'furnace-break',target,result});return result;
  }
  dispose(){if(this.disposed)return false;if(this.openTarget)this.close('disposed');this.disposed=true;this.releaseSender?.();this.releaseSender=null;this.hub.clear();return true;}
}
