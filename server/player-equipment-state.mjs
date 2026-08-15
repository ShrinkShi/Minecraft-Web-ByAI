import {assertClientSessionId} from '../src/client-input-envelope.js';
import {EQUIPMENT_SLOTS} from '../src/equipment.js';
import {freezeItemStack,normalizeItemStack} from '../src/item-stack.js';
import {ITEMS} from '../src/items.js';
import {nextNetworkSequence} from '../src/network-sequence.js';

const SLOT_SET=new Set(EQUIPMENT_SLOTS);
const cloneStack=value=>freezeItemStack(value);

function equipmentSlot(value){if(!SLOT_SET.has(value))throw new RangeError(`unsupported equipment slot: ${value}`);return value;}
function mouseButton(value){if(value!==0&&value!==2)throw new RangeError('equipment click button must be 0 or 2');return value;}
function inventoryState(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.advanceRevision!=='function')throw new TypeError('equipment transaction requires authoritative inventory state');return value;}
function armorStack(value,slot){if(!value)return null;const stack=normalizeItemStack(value,{label:`equipment ${slot}`}),def=ITEMS[stack.id];if(!def||def.armorSlot!==slot||Number(def.stack||1)!==1||stack.count!==1)throw new RangeError(`equipment ${slot} requires one matching armor item`);return stack;}

export class ServerPlayerEquipmentState{
  constructor(session){this.session=assertClientSessionId(session);this.revision=0;this.slots=Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,null]));}
  advanceRevision(){this.revision=nextNetworkSequence(this.revision);return this.revision;}
  get(slot){return cloneStack(this.slots[equipmentSlot(slot)]);}
  armorPoints(){let total=0;for(const slot of EQUIPMENT_SLOTS){const stack=this.slots[slot],def=ITEMS[stack?.id];if(def?.armorSlot===slot)total+=Number(def.armorPoints)||0;}return total;}

  click(inventory,slot,button=0){
    inventory=inventoryState(inventory);slot=equipmentSlot(slot);mouseButton(button);
    if(inventory.mode==='spectator')return Object.freeze({changed:false,reason:'spectator-read-only',inventory:inventory.snapshot(),equipment:this.snapshot()});
    const equipped=this.slots[slot],cursor=inventory.cursor;
    if(!cursor&&!equipped)return Object.freeze({changed:false,reason:'no-change',inventory:inventory.snapshot(),equipment:this.snapshot()});
    if(!cursor&&equipped){inventory.cursor=equipped;this.slots[slot]=null;inventory.advanceRevision();this.advanceRevision();return Object.freeze({changed:true,reason:'unequipped',inventory:inventory.snapshot(),equipment:this.snapshot()});}
    let validCursor;try{validCursor=armorStack(cursor,slot);}catch{return Object.freeze({changed:false,reason:'invalid-item',inventory:inventory.snapshot(),equipment:this.snapshot()});}
    if(equipped){this.slots[slot]=validCursor;inventory.cursor=equipped;inventory.advanceRevision();this.advanceRevision();return Object.freeze({changed:true,reason:'swapped',inventory:inventory.snapshot(),equipment:this.snapshot()});}
    this.slots[slot]=cloneStack({...validCursor,count:1});inventory.cursor=validCursor.count>1?cloneStack({...validCursor,count:validCursor.count-1}):null;inventory.advanceRevision();this.advanceRevision();return Object.freeze({changed:true,reason:'equipped',inventory:inventory.snapshot(),equipment:this.snapshot()});
  }

  snapshot(){return Object.freeze({session:this.session,revision:this.revision,slots:Object.freeze(Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,cloneStack(this.slots[slot])])))});}
}

export class ServerPlayerEquipmentHub{
  constructor(){this.states=new Map();}
  get sessionCount(){return this.states.size;}
  has(session){return this.states.has(assertClientSessionId(session));}
  join(session){session=assertClientSessionId(session);if(this.states.has(session))throw new Error(`equipment session already exists: ${session}`);const state=new ServerPlayerEquipmentState(session);this.states.set(session,state);return state.snapshot();}
  leave(session){session=assertClientSessionId(session);return this.states.delete(session);}
  state(session){session=assertClientSessionId(session);const state=this.states.get(session);if(!state)throw new Error(`unknown equipment session: ${session}`);return state;}
  snapshot(session){return this.state(session).snapshot();}
  click(session,inventory,slot,button=0){return this.state(session).click(inventory,slot,button);}
  armorPoints(session){return this.state(session).armorPoints();}
  close(){this.states.clear();}
}
