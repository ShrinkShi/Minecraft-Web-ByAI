import {assertClientSessionId} from '../src/client-input-envelope.js';
import {CREATIVE_START,ITEMS,maxStack} from '../src/items.js';
import {HOTBAR_START,HOTBAR_SIZE,INVENTORY_SLOT_COUNT,assertHotbarSlot,creativeSeedSlot} from '../src/inventory-layout.js';
import {nextNetworkSequence} from '../src/network-sequence.js';

const PLAYER_MODES=new Set(['survival','creative','adventure','spectator']);
const cloneStack=value=>value?Object.freeze({id:value.id,count:value.count}):null;

function playerMode(value){if(typeof value!=='string'||!PLAYER_MODES.has(value))throw new RangeError('inventory mode must be survival, creative, adventure, or spectator');return value;}
function itemId(value){if(typeof value!=='string'||!ITEMS[value])throw new RangeError('inventory item id must reference a known item');return value;}
function itemCount(value,label='inventory item count'){if(!Number.isInteger(value)||value<1)throw new RangeError(`${label} must be a positive integer`);return value;}
function inventorySlot(value){if(!Number.isInteger(value)||value<0||value>=INVENTORY_SLOT_COUNT)throw new RangeError(`inventory slot must be an integer from 0 to ${INVENTORY_SLOT_COUNT-1}`);return value;}

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

  add(id,count=1){
    id=itemId(id);const requested=itemCount(count);let remaining=requested,limit=maxStack(id);
    for(const slot of this.slots){if(!remaining)break;if(!slot||slot.id!==id||slot.count>=limit)continue;const moved=Math.min(remaining,limit-slot.count);slot.count+=moved;remaining-=moved;}
    for(let i=0;i<this.slots.length&&remaining;i++){if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={id,count:moved};remaining-=moved;}
    if(remaining!==requested)this.advanceRevision();return remaining;
  }

  remove(slot,count=1){
    slot=inventorySlot(slot);count=itemCount(count);const current=this.slots[slot];if(!current)return null;const taken=Math.min(count,current.count),result={id:current.id,count:taken};current.count-=taken;if(current.count===0)this.slots[slot]=null;this.advanceRevision();return cloneStack(result);
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
  remove(session,slot,count=1){return this.state(session).remove(slot,count);}
  close(){this.states.clear();}
}

export const SERVER_INVENTORY_LAYOUT=Object.freeze({slotCount:INVENTORY_SLOT_COUNT,hotbarStart:HOTBAR_START,hotbarSize:HOTBAR_SIZE});
