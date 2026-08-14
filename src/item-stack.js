import {ITEMS,maxStack} from './items.js';

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function knownItemId(value,label='item id'){if(typeof value!=='string'||!ITEMS[value])throw new RangeError(`${label} must reference a known item`);return value;}
function count(value,id,label='item count'){const limit=maxStack(id);if(!Number.isInteger(value)||value<1||value>limit)throw new RangeError(`${label} must be an integer from 1 to ${limit}`);return value;}

export function itemDurability(itemId){itemId=knownItemId(itemId);const value=ITEMS[itemId]?.tool?.durability??ITEMS[itemId]?.durability??null;return Number.isInteger(value)&&value>0?value:null;}
export function itemDamage(value,itemId,label='item damage'){
  const durability=itemDurability(itemId);if(value===undefined||value===null||value===0)return 0;if(durability===null)throw new RangeError(`${label} is not supported by ${itemId}`);if(!Number.isInteger(value)||value<0||value>=durability)throw new RangeError(`${label} must be an integer from 0 to ${durability-1}`);return value;
}

export function normalizeItemStack(value,{label='item stack'}={}){
  value=object(value,label);const id=knownItemId(value.id,`${label} id`),stackCount=count(value.count,id,`${label} count`),damage=itemDamage(value.damage,id,`${label} damage`),keys=Object.keys(value).sort();
  if(keys.some(key=>key!=='id'&&key!=='count'&&key!=='damage'))throw new RangeError(`${label} contains unexpected fields`);
  return damage>0?{id,count:stackCount,damage}:{id,count:stackCount};
}
export function cloneItemStack(value,options){if(value===null||value===undefined)return null;return{...normalizeItemStack(value,options)};}
export function freezeItemStack(value,options){const stack=cloneItemStack(value,options);return stack?Object.freeze(stack):null;}
export function itemStackDamage(value){if(!value)return 0;const stack=normalizeItemStack(value);return stack.damage??0;}
export function itemStacksCanMerge(a,b){if(!a||!b)return false;const left=normalizeItemStack(a),right=normalizeItemStack(b);return left.id===right.id&&(left.damage??0)===(right.damage??0);}
export function encodeItemStackTuple(value,{label='item stack'}={}){const stack=normalizeItemStack(value,{label});return stack.damage>0?[stack.id,stack.count,stack.damage]:[stack.id,stack.count];}
export function decodeItemStackTuple(value,{label='item stack'}={}){if(!Array.isArray(value)||(value.length!==2&&value.length!==3))throw new TypeError(`${label} must be [itemId,count] or [itemId,count,damage]`);return normalizeItemStack({id:value[0],count:value[1],...(value.length===3?{damage:value[2]}:{})},{label});}

export function damageItemStack(value,amount=1,{label='item stack'}={}){
  const stack=normalizeItemStack(value,{label}),durability=itemDurability(stack.id);if(!Number.isInteger(amount)||amount<1)throw new RangeError('item durability damage amount must be a positive integer');
  if(durability===null)return Object.freeze({changed:false,broken:false,reason:'not-damageable',durability:null,previousDamage:0,nextDamage:0,stack:Object.freeze({...stack})});
  const previousDamage=stack.damage??0,nextDamage=previousDamage+amount;if(nextDamage>=durability)return Object.freeze({changed:true,broken:true,reason:'broken',durability,previousDamage,nextDamage:durability,stack:null});
  return Object.freeze({changed:true,broken:false,reason:'damaged',durability,previousDamage,nextDamage,stack:Object.freeze({id:stack.id,count:stack.count,damage:nextDamage})});
}
