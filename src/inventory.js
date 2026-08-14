import {CREATIVE_START,ITEMS,maxStack} from './items.js';
import {HOTBAR_START,HOTBAR_SIZE,INVENTORY_SLOT_COUNT,creativeSeedSlot} from './inventory-layout.js';
import {cloneItemStack,itemStacksCanMerge,normalizeItemStack} from './item-stack.js';

const MAIN_RANGE=Object.freeze([0,HOTBAR_START]);
const HOTBAR_RANGE=Object.freeze([HOTBAR_START,HOTBAR_START+HOTBAR_SIZE]);

function legacyStack(value,label='inventory stack'){
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.id!=='string'||!value.id||!Number.isFinite(value.count)||value.count<=0)return null;
  const count=Math.min(maxStack(value.id),Math.floor(value.count));if(count<1)return null;
  if(ITEMS[value.id]){try{return normalizeItemStack({id:value.id,count,...(value.damage===undefined?{}:{damage:value.damage})},{label});}catch{return null;}}
  return{id:value.id,count};
}
function cloneStack(stack){if(!stack)return null;if(ITEMS[stack.id])return cloneItemStack(stack);return legacyStack(stack);}
function canMerge(a,b){if(!a||!b||a.id!==b.id)return false;if(ITEMS[a.id]&&ITEMS[b.id])return itemStacksCanMerge(a,b);return (a.damage??0)===(b.damage??0);}
function snapshotSlots(snapshot,{strict=false}={}){
  if(!Array.isArray(snapshot?.slots))return null;
  const slots=Array(INVENTORY_SLOT_COUNT).fill(null);
  for(let i=0;i<INVENTORY_SLOT_COUNT;i++){
    const stack=snapshot.slots[i];if(!stack)continue;
    if(strict){try{slots[i]=normalizeItemStack(stack,{label:`inventory slot ${i}`});}catch{};continue;}
    slots[i]=legacyStack(stack,`inventory slot ${i}`);
  }
  return slots;
}
function requestedCount(value){if(!Number.isFinite(value))return 0;return Math.max(0,Math.floor(value));}

export class Inventory{
  constructor(mode='survival',snapshot=null){
    this.slots=Array(INVENTORY_SLOT_COUNT).fill(null);this.cursor=null;this.listeners=new Set();
    if(snapshot)this.restore(snapshot);else if(mode==='creative')this.seedCreative();
  }

  subscribe(listener){if(typeof listener!=='function')throw new TypeError('inventory listener must be a function');this.listeners.add(listener);let active=true;return()=>{if(!active)return false;active=false;return this.listeners.delete(listener);};}
  notify(source='inventory'){for(const listener of [...this.listeners]){try{listener({source,inventory:this});}catch{}}}

  seedCreative(){CREATIVE_START.forEach((id,i)=>{this.slots[creativeSeedSlot(i)]={id,count:maxStack(id)};});}
  snapshot(){return{slots:this.slots.map(cloneStack)};}

  restore(snapshot){
    const restored=snapshotSlots(snapshot);if(!restored)return false;this.slots=restored;
    const legacyOverflow=legacyStack(snapshot.slots[INVENTORY_SLOT_COUNT],'legacy overflow stack');if(legacyOverflow)this.insertExistingStack(legacyOverflow,[[0,INVENTORY_SLOT_COUNT]]);
    return true;
  }

  replaceSnapshot(snapshot){const restored=snapshotSlots(snapshot,{strict:true});if(!restored)return false;this.slots=restored;this.cursor=null;this.notify('authoritative-snapshot');return true;}

  drain(){
    const stacks=[];for(let i=0;i<this.slots.length;i++){const stack=this.slots[i];if(stack)stacks.push(cloneStack(stack));this.slots[i]=null;}
    if(this.cursor)stacks.push(cloneStack(this.cursor));this.cursor=null;return stacks;
  }

  hotbar(index){return this.slots[HOTBAR_START+index]||null;}

  capacityFor(itemId){const incoming={id:itemId,count:1},limit=maxStack(itemId);let capacity=0;for(const slot of this.slots){if(!slot)capacity+=limit;else if(canMerge(slot,incoming))capacity+=Math.max(0,limit-slot.count);}return capacity;}

  insertBulk(itemId,count,ranges){
    const requested=requestedCount(count);if(!requested)return 0;const prototype=normalizeItemStack({id:itemId,count:1}),limit=maxStack(prototype.id);let remaining=requested;
    for(const [start,end] of ranges){
      for(let i=start;i<end&&remaining;i++){const slot=this.slots[i];if(!canMerge(slot,prototype)||slot.count>=limit)continue;const moved=Math.min(remaining,limit-slot.count);slot.count+=moved;remaining-=moved;}
      for(let i=start;i<end&&remaining;i++){if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={id:prototype.id,count:moved};remaining-=moved;}
    }
    return remaining;
  }
  insertExistingStack(value,ranges){
    const incoming=cloneStack(value);if(!incoming)throw new TypeError('existing inventory stack is invalid');const limit=maxStack(incoming.id);let remaining=incoming.count;
    for(const [start,end] of ranges){
      for(let i=start;i<end&&remaining;i++){const slot=this.slots[i];if(!canMerge(slot,incoming)||slot.count>=limit)continue;const moved=Math.min(remaining,limit-slot.count);slot.count+=moved;remaining-=moved;}
      for(let i=start;i<end&&remaining;i++){if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={...incoming,count:moved};remaining-=moved;}
    }
    return remaining;
  }
  add(itemId,count=1){return this.insertBulk(itemId,count,[[0,INVENTORY_SLOT_COUNT]]);}
  addStack(value){const incoming=normalizeItemStack(value);return this.insertExistingStack(incoming,[[0,INVENTORY_SLOT_COUNT]]);}
  addPickup(itemId,count=1){return this.insertBulk(itemId,count,[HOTBAR_RANGE,MAIN_RANGE]);}
  addPickupStack(value){const incoming=normalizeItemStack(value);return this.insertExistingStack(incoming,[HOTBAR_RANGE,MAIN_RANGE]);}

  removeAt(index,count=1){const slot=this.slots[index];if(!slot)return null;const taken=Math.min(slot.count,Math.max(1,Math.floor(count))),result={...slot,count:taken};slot.count-=taken;if(slot.count<=0)this.slots[index]=null;return cloneStack(result);}

  moveBetween(index){
    const slot=this.slots[index];if(!slot)return false;const targets=index<HOTBAR_START?[HOTBAR_START,INVENTORY_SLOT_COUNT]:[0,HOTBAR_START];let remaining=slot.count,changed=false,limit=maxStack(slot.id);
    for(let i=targets[0];i<targets[1];i++){const target=this.slots[i];if(!canMerge(target,slot)||target.count>=limit)continue;const moved=Math.min(remaining,limit-target.count);target.count+=moved;remaining-=moved;changed=changed||moved>0;if(!remaining)break;}
    for(let i=targets[0];i<targets[1]&&remaining;i++){if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={...slot,count:moved};remaining-=moved;changed=true;}
    if(changed){if(remaining)this.slots[index].count=remaining;else this.slots[index]=null;}return changed;
  }

  click(index,button=0,shift=false){
    if(shift)return this.moveBetween(index);const slot=this.slots[index];
    if(button===0){
      if(!this.cursor&&slot){this.cursor=slot;this.slots[index]=null;return true;}
      if(this.cursor&&!slot){this.slots[index]=this.cursor;this.cursor=null;return true;}
      if(this.cursor&&slot&&canMerge(this.cursor,slot)){const moved=Math.min(this.cursor.count,maxStack(slot.id)-slot.count);if(!moved)return false;slot.count+=moved;this.cursor.count-=moved;if(this.cursor.count<=0)this.cursor=null;return true;}
      if(this.cursor&&slot){this.slots[index]=this.cursor;this.cursor=slot;return true;}return false;
    }
    if(button===2){
      if(!this.cursor&&slot){const take=Math.ceil(slot.count/2);this.cursor={...slot,count:take};slot.count-=take;if(slot.count<=0)this.slots[index]=null;return true;}
      if(this.cursor&&!slot){this.slots[index]={...this.cursor,count:1};this.cursor.count--;if(this.cursor.count<=0)this.cursor=null;return true;}
      if(this.cursor&&slot&&canMerge(this.cursor,slot)&&slot.count<maxStack(slot.id)){slot.count++;this.cursor.count--;if(this.cursor.count<=0)this.cursor=null;return true;}
    }
    return false;
  }

  returnCursor(){if(!this.cursor)return null;const original=cloneStack(this.cursor);if(!original){this.cursor=null;return null;}const remainder=this.insertExistingStack(original,[[0,INVENTORY_SLOT_COUNT]]),overflow=remainder?{...original,count:remainder}:null;this.cursor=null;return overflow;}
}
