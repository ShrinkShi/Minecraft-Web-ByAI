import {ITEMS} from './items.js';

export const EQUIPMENT_SLOTS=Object.freeze(['head','chest','legs','feet']);
const cloneStack=stack=>stack?{id:stack.id,count:stack.count}:null;

function validArmor(itemId,slot){const def=ITEMS[itemId];return !!def&&def.armorSlot===slot&&Number(def.stack||1)===1;}

export class Equipment{
  constructor(snapshot=null){
    this.slots={head:null,chest:null,legs:null,feet:null};
    if(snapshot)this.restore(snapshot);
  }

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
