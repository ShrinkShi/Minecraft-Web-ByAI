import {nextNetworkSequence} from '../src/network-sequence.js';
import {FURNACE_SLOT,FURNACE_STACK_LIMIT,createFurnaceState,furnaceCanInsert,normalizeFurnaceStack,tickFurnace} from '../src/smelting.js';

function cell(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('furnace cell must be an object');
  const normalized={};for(const axis of ['x','y','z']){if(!Number.isInteger(value[axis]))throw new RangeError(`furnace cell.${axis} must be an integer`);normalized[axis]=value[axis];}
  return Object.freeze(normalized);
}
function key(value){const target=cell(value);return `${target.x},${target.y},${target.z}`;}
function revision(value){if(!Number.isInteger(value)||value<0)throw new RangeError('furnace expectedRevision must be a non-negative integer');return value;}
function count(value,label,{min=1,max=FURNACE_STACK_LIMIT}={}){if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(`${label} must be an integer from ${min} to ${max}`);return value;}
function cloneStack(value){return value?Object.freeze({...normalizeFurnaceStack(value)}):null;}
function cloneState(value){return createFurnaceState(value);}
function conflict(state){return Object.freeze({changed:false,reason:'revision-conflict',container:state.snapshot()});}

export class ServerFurnaceContainerState{
  constructor(target,{state=null,revision:initialRevision=0}={}){
    this.target=cell(target);this.revision=revision(initialRevision);this.state=state?cloneState(state):createFurnaceState();
  }
  advanceRevision(){this.revision=nextNetworkSequence(this.revision);return this.revision;}
  snapshot(){const state=cloneState(this.state);return Object.freeze({target:this.target,revision:this.revision,slots:state.slots,burnRemaining:state.burnRemaining,burnTotal:state.burnTotal,cookProgress:state.cookProgress,cookTotal:state.cookTotal,storedExperience:state.storedExperience,lit:state.burnRemaining>0});}
  insert(slot,value,{expectedRevision=this.revision}={}){
    expectedRevision=revision(expectedRevision);if(expectedRevision!==this.revision)return conflict(this);
    if(slot!==FURNACE_SLOT.INPUT&&slot!==FURNACE_SLOT.FUEL)throw new RangeError('furnace insert slot must be INPUT or FUEL');
    const incoming=normalizeFurnaceStack(value,{label:'furnace insert stack'});if(!furnaceCanInsert(slot,incoming.id))return Object.freeze({changed:false,reason:slot===FURNACE_SLOT.INPUT?'not-smeltable':'not-fuel',remaining:incoming.count,container:this.snapshot()});
    const slots=this.state.slots.map(stack=>stack?{...stack}:null),current=slots[slot];if(current&&current.id!==incoming.id)return Object.freeze({changed:false,reason:'slot-occupied',remaining:incoming.count,container:this.snapshot()});
    const capacity=FURNACE_STACK_LIMIT-(current?.count||0),moved=Math.min(capacity,incoming.count);if(moved<=0)return Object.freeze({changed:false,reason:'slot-full',remaining:incoming.count,container:this.snapshot()});
    slots[slot]=current?{id:current.id,count:current.count+moved}:{id:incoming.id,count:moved};this.state=createFurnaceState({...this.state,slots});this.advanceRevision();
    return Object.freeze({changed:true,reason:moved===incoming.count?'inserted':'inserted-partial',moved,remaining:incoming.count-moved,container:this.snapshot()});
  }
  takeOutput(amount=FURNACE_STACK_LIMIT,{expectedRevision=this.revision}={}){
    expectedRevision=revision(expectedRevision);if(expectedRevision!==this.revision)return Object.freeze({changed:false,reason:'revision-conflict',taken:null,container:this.snapshot()});
    amount=count(amount,'furnace output amount');const slots=this.state.slots.map(stack=>stack?{...stack}:null),output=slots[FURNACE_SLOT.OUTPUT];if(!output)return Object.freeze({changed:false,reason:'output-empty',taken:null,container:this.snapshot()});
    const taken=Math.min(amount,output.count),stack=Object.freeze({id:output.id,count:taken});if(taken===output.count)slots[FURNACE_SLOT.OUTPUT]=null;else output.count-=taken;
    const experience=slots[FURNACE_SLOT.OUTPUT]?0:this.state.storedExperience;this.state=createFurnaceState({...this.state,slots,storedExperience:experience?0:this.state.storedExperience});this.advanceRevision();
    return Object.freeze({changed:true,reason:'output-taken',taken:stack,experience,container:this.snapshot()});
  }
  tick(ticks=1){const result=tickFurnace(this.state,ticks);if(result.changed){this.state=result.state;this.advanceRevision();}return Object.freeze({...result,container:this.snapshot()});}
  drain(){const snapshot=this.snapshot(),contents=Object.freeze(snapshot.slots.filter(Boolean).map(cloneStack)),experience=snapshot.storedExperience;if(!contents.length&&!experience)return Object.freeze({changed:false,contents,experience,container:snapshot});this.state=createFurnaceState();this.advanceRevision();return Object.freeze({changed:true,contents,experience,container:this.snapshot()});}
  serialize(){const snapshot=this.snapshot();return Object.freeze({target:snapshot.target,revision:snapshot.revision,state:Object.freeze({slots:snapshot.slots,burnRemaining:snapshot.burnRemaining,burnTotal:snapshot.burnTotal,cookProgress:snapshot.cookProgress,cookTotal:snapshot.cookTotal,storedExperience:snapshot.storedExperience})});}
}

export class ServerFurnaceContainerHub{
  constructor(){this.states=new Map();}
  get furnaceCount(){return this.states.size;}
  has(target){return this.states.has(key(target));}
  open(target){const id=key(target);let state=this.states.get(id);if(!state){state=new ServerFurnaceContainerState(target);this.states.set(id,state);}return state.snapshot();}
  state(target){const id=key(target),state=this.states.get(id);if(!state)throw new Error(`no furnace state for cell: ${id}`);return state;}
  snapshot(target){return this.state(target).snapshot();}
  tickAll(ticks=1){let changed=0,smelted=0;for(const state of this.states.values()){const result=state.tick(ticks);if(result.changed)changed++;smelted+=result.smelted;}return Object.freeze({changed,smelted,furnaces:this.furnaceCount});}
  break(target){const id=key(target),state=this.states.get(id);if(!state)return Object.freeze({changed:false,contents:Object.freeze([]),experience:0});const drained=state.drain();this.states.delete(id);return Object.freeze({changed:true,contents:drained.contents,experience:drained.experience});}
  restore(record){if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('furnace restore record must be an object');const id=key(record.target);if(this.states.has(id))throw new Error(`furnace state already exists for cell: ${id}`);const state=new ServerFurnaceContainerState(record.target,{state:record.state,revision:record.revision});this.states.set(id,state);return state.snapshot();}
  serialize(){return Object.freeze([...this.states.values()].map(state=>state.serialize()));}
  clear(){this.states.clear();}
}
