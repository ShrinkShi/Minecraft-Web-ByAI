import {ITEMS} from './items.js';

export const DEFAULT_MELEE_DAMAGE=1;
export const DEFAULT_MELEE_ATTACK_SPEED=4;

function positive(value,label){if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw new RangeError(`${label} must be a positive finite number`);return value;}
function nonNegativeInteger(value,label){if(!Number.isInteger(value)||value<0)throw new RangeError(`${label} must be a non-negative integer`);return value;}

export function meleeProfile(itemId=null){
  const item=typeof itemId==='string'?ITEMS[itemId]||null:null;
  const damage=positive(Number(item?.attackDamage)||DEFAULT_MELEE_DAMAGE,'melee damage');
  const attackSpeed=positive(Number(item?.combat?.attackSpeed)||DEFAULT_MELEE_ATTACK_SPEED,'melee attack speed');
  const durabilityCost=nonNegativeInteger(item?.combat?.durabilityCost??0,'melee durability cost');
  return Object.freeze({itemId:item?itemId:null,damage,attackSpeed,attackIntervalMs:1000/attackSpeed,durabilityCost});
}
