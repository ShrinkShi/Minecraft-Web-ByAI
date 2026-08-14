import {ITEMS} from './items.js';
import {itemDurability,itemStackDamage} from './item-stack.js';

export function itemDurabilityDisplay(stack){
  if(!stack||typeof stack!=='object'||Array.isArray(stack)||typeof stack.id!=='string'||!ITEMS[stack.id])return null;
  const maximum=itemDurability(stack.id);if(maximum===null)return null;
  const damage=itemStackDamage(stack);if(damage<=0)return null;
  const remaining=Math.max(0,maximum-damage),ratio=remaining/maximum,hue=Math.round(Math.max(0,Math.min(1,ratio))*120);
  return Object.freeze({damage,remaining,maximum,ratio,hue,label:`耐久 ${remaining} / ${maximum}`});
}
