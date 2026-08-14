import {assertClientSessionId} from '../src/client-input-envelope.js';
import {CREATIVE_START,ITEMS,maxStack} from '../src/items.js';
import {cloneItemStack,damageItemStack,freezeItemStack,itemStacksCanMerge,normalizeItemStack} from '../src/item-stack.js';
import {HOTBAR_START,HOTBAR_SIZE,INVENTORY_SLOT_COUNT,assertHotbarSlot,creativeSeedSlot} from '../src/inventory-layout.js';
import {nextNetworkSequence} from '../src/network-sequence.js';

const PLAYER_MODES=new Set(['survival','creative','adventure','spectator']);
const cloneStack=value=>freezeItemStack(value);
const MAIN_RANGE=Object.freeze([0,HOTBAR_START]);
const HOTBAR_RANGE=Object.freeze([HOTBAR_START,HOTBAR_START+HOTBAR_SIZE]);

function playerMode(value){if(typeof value!=='string'||!PLAYER_MODES.has(value))throw new RangeError('inventory mode must be survival, creative, adventure, or spectator');return value;}
function itemId(value){if(typeof value!=='string'||!ITEMS[value])throw new RangeError('inventory item id must reference a known item');return value;}
function itemCount(value,label='inventory item count'){if(!Number.isInteger(value)||value<1)throw new RangeError(`${label} must be a positive integer`);return value;}
function inventorySlot(value){if(!Number.isInteger(value)||value<0||value>=INVENTORY_SLOT_COUNT)throw new RangeError(`inventory slot must be an integer from 0 to ${INVENTORY_SLOT_COUNT-1}`);return value;}
function transactionCallback(value){if(typeof value!=='function')throw new TypeError('inventory transaction callback must be a function');return value;}
function transactionResult(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.changed!=='boolean')throw new TypeError('inventory transaction callback must return an object with changed boolean');return value;}

export class ServerPlayerInventoryState{
  constructor(session,{mode='survival'}={}){
    this.session=assertClientSessionId(session);this.mode=playerMode(mode);this.revision=0;this.slots=Array(INVENTORY_SLOT_COUNT).fill(null);if(this.mode==='creative')this.seedCreative();
  }

  seedCreative(){
    if(CREATIVE_START.length>INVENTORY_SLOT_COUNT)throw new RangeError('creative start inventory exceeds authoritative slot capacity');
    for(let i=0;i<CREATIVE_START.length;i++){const id=itemId(CREATIVE_START[i]);this.slots[creativeSeedSlot(i)]={id,count:maxStack(id)};}return this;
  }

  advanceRevision(){this.revision=nextNetworkSequence(this.revision);return this.revision;}
  stack(slot){return cloneStack(this.slots[inventorySlot(slot)]);}
  hotbar(slot){return cloneStack(this.slots[HOTBAR_START+assertHotbarSlot(slot)]);}
  selectedStack(selectedSlot){return this.hotbar(selectedSlot);}

  insertStack(stack,{pickup=false}={}){
    const incoming=normalizeItemStack(stack),requested=incoming.count,limit=maxStack(incoming.id),ranges=pickup?[HOTBAR_RANGE,MAIN_RANGE]:[[0,INVENTORY_SLOT_COUNT]];let remaining=requested;
    for(const [start,end] of ranges){
      for(let i=start;i<end&&remaining;i++){const slot=this.slots[i];if(!itemStacksCanMerge(slot,incoming)||slot.count>=limit)continue;const moved=Math.min(remaining,limit-slot.count);slot.count+=moved;remaining-=moved;}
      for(let i=start;i<end&&remaining;i++){if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={...incoming,count:moved};remaining-=moved;}
    }
    if(remaining!==requested)this.advanceRevision();return remaining;
  }

  add(id,count=1){
    id=itemId(id);const requested=itemCount(count),limit=maxStack(id),prototype={id,count:1};let remaining=requested;
    for(const slot of this.slots){if(!remaining)break;if(!itemStacksCanMerge(slot,prototype)||slot.count>=limit)continue;const moved=Math.min(remaining,limit-slot.count);slot.count+=moved;remaining-=moved;}
    for(let i=0;i<this.slots.length&&remaining;i++){if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={id,count:moved};remaining-=moved;}
    if(remaining!==requested)this.advanceRevision();return remaining;
  }
  addStack(stack){return this.insertStack(stack,{pickup:false});}

  addPickup(id,count=1){
    id=itemId(id);const requested=itemCount(count),limit=maxStack(id),prototype={id,count:1};let remaining=requested;
    for(const [start,end] of [HOTBAR_RANGE,MAIN_RANGE]){
      for(let i=start;i<end&&remaining;i++){const slot=this.slots[i];if(!itemStacksCanMerge(slot,prototype)||slot.count>=limit)continue;const moved=Math.min(remaining,limit-slot.count);slot.count+=moved;remaining-=moved;}
      for(let i=start;i<end&&remaining;i++){if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={id,count:moved};remaining-=moved;}
    }
    if(remaining!==requested)this.advanceRevision();return remaining;
  }
  addPickupStack(stack){return this.insertStack(stack,{pickup:true});}

  remove(slot,count=1){
    slot=inventorySlot(slot);count=itemCount(count);const current=this.slots[slot];if(!current)return null;const taken=Math.min(count,current.count),result={...current,count:taken};current.count-=taken;if(current.count===0)this.slots[slot]=null;this.advanceRevision();return cloneStack(result);
  }

  damageSelected(selectedSlot,expectedId,amount=1){
    selectedSlot=assertHotbarSlot(selectedSlot);expectedId=itemId(expectedId);const index=HOTBAR_START+selectedSlot,current=this.slots[index];
    if(!current)return Object.freeze({changed:false,broken:false,reason:'empty-selected-slot',result:null,snapshot:this.snapshot()});
    if(current.id!==expectedId)return Object.freeze({changed:false,broken:false,reason:'selected-item-changed',result:null,snapshot:this.snapshot()});
    const result=damageItemStack(current,amount,{label:'selected item stack'});if(!result.changed)return Object.freeze({changed:false,broken:false,reason:result.reason,result,snapshot:this.snapshot()});
    this.slots[index]=result.stack?cloneItemStack(result.stack):null;this.advanceRevision();return Object.freeze({changed:true,broken:result.broken,reason:result.reason,result,snapshot:this.snapshot()});
  }

  commitSelected(selectedSlot,expectedId,count,commit){
    selectedSlot=assertHotbarSlot(selectedSlot);expectedId=itemId(expectedId);count=itemCount(count,'inventory transaction count');commit=transactionCallback(commit);const index=HOTBAR_START+selectedSlot,current=this.slots[index];
    if(!current)return Object.freeze({committed:false,reason:'empty-selected-slot',consumed:null,result:null,snapshot:this.snapshot()});
    if(current.id!==expectedId)return Object.freeze({committed:false,reason:'selected-item-changed',consumed:null,result:null,snapshot:this.snapshot()});
    if(current.count<count)return Object.freeze({committed:false,reason:'insufficient-selected-count',consumed:null,result:null,snapshot:this.snapshot()});
    const result=transactionResult(commit(cloneStack(current)));if(!result.changed)return Object.freeze({committed:false,reason:result.reason||'transaction-declined',consumed:null,result,snapshot:this.snapshot()});
    const consumed=cloneStack({...current,count});current.count-=count;if(current.count===0)this.slots[index]=null;this.advanceRevision();return Object.freeze({committed:true,reason:'committed',consumed,result,snapshot:this.snapshot()});
  }

  snapshot(){return Object.freeze({session:this.session,mode:this.mode,revision:this.revision,slots:Object.freeze(this.slots.map(cloneStack))});}
}

export class ServerPlayerInventoryHub{
  constructor(){this.states=new Map();}
  get sessionCount(){return this.states.size;}
  has(session){return this.states.has(assertClientSessionId(session));}
  join(session,options={}){session=assertClientSessionId(session);if(this.states.has(session))throw new Error(`inventory session already exists: ${session}`);const state=new ServerPlayerInventoryState(session,options);this.states.set(session,state);return state.snapshot();}
  leave(session){session=assertClientSessionId(session);return this.states.delete(session);}
  state(session){session=assertClientSessionId(session);const state=this.states.get(session);if(!state)throw new Error(`unknown inventory session: ${session}`);return state;}
  snapshot(session){return this.state(session).snapshot();}
  selectedStack(session,selectedSlot){return this.state(session).selectedStack(selectedSlot);}
  add(session,id,count=1){return this.state(session).add(id,count);}
  addStack(session,stack){return this.state(session).addStack(stack);}
  addPickup(session,id,count=1){return this.state(session).addPickup(id,count);}
  addPickupStack(session,stack){return this.state(session).addPickupStack(stack);}
  remove(session,slot,count=1){return this.state(session).remove(slot,count);}
  damageSelected(session,selectedSlot,expectedId,amount=1){return this.state(session).damageSelected(selectedSlot,expectedId,amount);}
  commitSelected(session,selectedSlot,expectedId,count,commit){return this.state(session).commitSelected(selectedSlot,expectedId,count,commit);}
  close(){this.states.clear();}
}

export const SERVER_INVENTORY_LAYOUT=Object.freeze({slotCount:INVENTORY_SLOT_COUNT,hotbarStart:HOTBAR_START,hotbarSize:HOTBAR_SIZE});
