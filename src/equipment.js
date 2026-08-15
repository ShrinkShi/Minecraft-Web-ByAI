import {ITEMS} from './items.js';

export const EQUIPMENT_SLOTS=Object.freeze(['head','chest','legs','feet']);
const cloneStack=stack=>stack?{...stack}:null;

function validArmor(itemId,slot){const def=ITEMS[itemId];return !!def&&def.armorSlot===slot&&Number(def.stack||1)===1;}
function strictSlots(snapshot){const source=snapshot?.slots;if(!source||typeof source!=='object'||Array.isArray(source))return null;const keys=Object.keys(source).sort(),expected=[...EQUIPMENT_SLOTS].sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))return null;const slots={};for(const slot of EQUIPMENT_SLOTS){const stack=source[slot];if(stack===null||stack===undefined){slots[slot]=null;continue;}if(!stack||typeof stack!=='object'||Array.isArray(stack)||stack.count!==1||!validArmor(stack.id,slot))return null;slots[slot]=cloneStack(stack);}return slots;}

export class Equipment{
  constructor(snapshot=null){
    this.slots={head:null,chest:null,legs:null,feet:null};this.listeners=new Set();
    if(snapshot)this.restore(snapshot);
  }

  subscribe(listener){if(typeof listener!=='function')throw new TypeError('equipment listener must be a function');this.listeners.add(listener);let active=true;return()=>{if(!active)return false;active=false;return this.listeners.delete(listener);};}
  notify(source='equipment'){for(const listener of [...this.listeners]){try{listener({source,equipment:this});}catch{}}}
  get(slot){return EQUIPMENT_SLOTS.includes(slot)?this.slots[slot]:null;}

  armorPoints(){
    let total=0;for(const slot of EQUIPMENT_SLOTS){const stack=this.slots[slot],def=ITEMS[stack?.id];if(def&&def.armorSlot===slot)total+=Number(def.armorPoints)||0;}return total;
  }

  snapshot(){return{slots:Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,cloneStack(this.slots[slot])]))};}

  restore(snapshot){
    const source=snapshot?.slots;if(!source||typeof source!=='object')return false;
    for(const slot of EQUIPMENT_SLOTS){const stack=source[slot];this.slots[slot]=stack?.id&&validArmor(stack.id,slot)?{id:stack.id,count:1}:null;}
    return true;
  }

  replaceSnapshot(snapshot){const slots=strictSlots(snapshot);if(!slots)return false;this.slots=slots;this.notify('authoritative-snapshot');return true;}

  click(slot,inventory,button=0){
    if(!EQUIPMENT_SLOTS.includes(slot)||!inventory||(button!==0&&button!==2))return false;
    const equipped=this.slots[slot],cursor=inventory.cursor;
    if(!cursor&&equipped){inventory.cursor=equipped;this.slots[slot]=null;return true;}
    if(!cursor)return false;
    if(!validArmor(cursor.id,slot))return false;
    if(equipped){this.slots[slot]=cursor;inventory.cursor=equipped;return true;}
    this.slots[slot]={id:cursor.id,count:1};cursor.count-=1;if(cursor.count<=0)inventory.cursor=null;return true;
  }

  drain(){
    const stacks=[];for(const slot of EQUIPMENT_SLOTS){const stack=this.slots[slot];if(stack)stacks.push(cloneStack(stack));this.slots[slot]=null;}return stacks;
  }
}
