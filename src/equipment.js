import {armorDurabilityDamage} from './armor-rules.js';
import {cloneItemStack,damageItemStack,normalizeItemStack} from './item-stack.js';
import {ITEMS} from './items.js';

export const EQUIPMENT_SLOTS=Object.freeze(['head','chest','legs','feet']);
const cloneStack=stack=>stack?cloneItemStack(stack):null;

function validArmorDefinition(itemId,slot){const def=ITEMS[itemId];return !!def&&def.armorSlot===slot&&Number(def.stack||1)===1;}
function armorStack(value,slot,label=`equipment ${slot}`){if(!value)return null;const stack=normalizeItemStack(value,{label});if(stack.count!==1||!validArmorDefinition(stack.id,slot))throw new RangeError(`${label} requires one matching armor item`);return stack;}
function strictSlots(snapshot){const source=snapshot?.slots;if(!source||typeof source!=='object'||Array.isArray(source))return null;const keys=Object.keys(source).sort(),expected=[...EQUIPMENT_SLOTS].sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))return null;const slots={};try{for(const slot of EQUIPMENT_SLOTS)slots[slot]=source[slot]?cloneStack(armorStack(source[slot],slot)):null;}catch{return null;}return slots;}

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

  armorToughness(){
    let total=0;for(const slot of EQUIPMENT_SLOTS){const stack=this.slots[slot],def=ITEMS[stack?.id];if(def&&def.armorSlot===slot)total+=Number(def.armorToughness)||0;}return total;
  }

  snapshot(){return{slots:Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,cloneStack(this.slots[slot])]))};}

  restore(snapshot){
    const source=snapshot?.slots;if(!source||typeof source!=='object')return false;
    for(const slot of EQUIPMENT_SLOTS){try{this.slots[slot]=source[slot]?cloneStack(armorStack(source[slot],slot)):null;}catch{this.slots[slot]=null;}}
    return true;
  }

  replaceSnapshot(snapshot){const slots=strictSlots(snapshot);if(!slots)return false;this.slots=slots;this.notify('authoritative-snapshot');return true;}

  click(slot,inventory,button=0){
    if(!EQUIPMENT_SLOTS.includes(slot)||!inventory||(button!==0&&button!==2))return false;
    const equipped=this.slots[slot],cursor=inventory.cursor;
    if(!cursor&&equipped){inventory.cursor=cloneStack(equipped);this.slots[slot]=null;return true;}
    if(!cursor)return false;
    let incoming;try{incoming=armorStack(cursor,slot,'equipment cursor');}catch{return false;}
    if(equipped){this.slots[slot]=cloneStack({...incoming,count:1});inventory.cursor=cloneStack(equipped);return true;}
    this.slots[slot]=cloneStack({...incoming,count:1});cursor.count-=1;if(cursor.count<=0)inventory.cursor=null;return true;
  }

  damageArmor(amount){
    const wear=armorDurabilityDamage(amount);if(wear===0)return Object.freeze({changed:false,wear,damaged:Object.freeze([]),broken:Object.freeze([])});
    const damaged=[],broken=[];let changed=false;
    for(const slot of EQUIPMENT_SLOTS){const stack=this.slots[slot];if(!stack)continue;const result=damageItemStack(stack,wear,{label:`equipped ${slot}`});if(!result.changed)continue;changed=true;damaged.push(Object.freeze({slot,id:stack.id,previousDamage:result.previousDamage,nextDamage:result.nextDamage,durability:result.durability,broken:result.broken}));if(result.broken){this.slots[slot]=null;broken.push(slot);}else this.slots[slot]=cloneStack(result.stack);}
    if(changed)this.notify('armor-damage');
    return Object.freeze({changed,wear,damaged:Object.freeze(damaged),broken:Object.freeze(broken)});
  }

  drain(){
    const stacks=[];for(const slot of EQUIPMENT_SLOTS){const stack=this.slots[slot];if(stack)stacks.push(cloneStack(stack));this.slots[slot]=null;}return stacks;
  }
}
