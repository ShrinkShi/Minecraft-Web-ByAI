import {ITEMS,maxStack} from './items.js';
import {normalizeItemStack} from './item-stack.js';

const recipe=(input,output,{cookTicks=200,experience=0}={})=>Object.freeze({input,output,count:1,cookTicks,experience});

export const SMELTING_RECIPES=Object.freeze({
  raw_iron:recipe('raw_iron','iron_ingot',{cookTicks:200,experience:.7})
});

export const FURNACE_FUELS=Object.freeze({
  'block:5':300,
  'block:6':300,
  coal:1600,
  stick:100,
  wooden_pickaxe:200
});

export const FURNACE_SLOT=Object.freeze({INPUT:0,FUEL:1,OUTPUT:2});
export const FURNACE_SLOT_COUNT=3;
export const FURNACE_STACK_LIMIT=64;

const RECIPE_OUTPUT_IDS=Object.freeze([...new Set(Object.values(SMELTING_RECIPES).map(entry=>entry.output))]);
const RECIPE_OUTPUT_SET=new Set(RECIPE_OUTPUT_IDS);

const integer=(value,label,{min=0,max=Number.MAX_SAFE_INTEGER}={})=>{
  if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(`${label} must be an integer from ${min} to ${max}`);
  return value;
};
const finite=(value,label,{min=0}={})=>{
  if(!Number.isFinite(value)||value<min)throw new RangeError(`${label} must be a finite number >= ${min}`);
  return value;
};
const knownFurnaceItemId=(value,label='furnace item id')=>{
  if(typeof value!=='string'||(!ITEMS[value]&&!RECIPE_OUTPUT_SET.has(value)))throw new RangeError(`${label} must reference a known item or declared smelting output`);
  return value;
};

export function smeltingRecipeFor(itemId){return typeof itemId==='string'?SMELTING_RECIPES[itemId]||null:null;}
export function furnaceFuelTicks(itemId){return typeof itemId==='string'?FURNACE_FUELS[itemId]||0:0;}
export function isSmeltable(itemId){return smeltingRecipeFor(itemId)!==null;}
export function isFurnaceFuel(itemId){return furnaceFuelTicks(itemId)>0;}
export function furnaceStackLimitFor(itemId){itemId=knownFurnaceItemId(itemId);return ITEMS[itemId]?maxStack(itemId):FURNACE_STACK_LIMIT;}
export function materializeSmeltingExperience(value,random=Math.random){
  value=finite(value,'smelting experience');if(typeof random!=='function')throw new TypeError('smelting experience random source must be a function');const whole=Math.floor(value),fraction=value-whole;if(fraction<=0)return whole;const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('smelting experience random source must return a finite number in [0,1)');return whole+(roll<fraction?1:0);
}

export function normalizeFurnaceStack(value,{label='furnace stack'}={}){
  if(value===null||value===undefined)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object or null`);
  const id=knownFurnaceItemId(value.id,`${label} id`);
  if(ITEMS[id])return Object.freeze(normalizeItemStack(value,{label}));
  const keys=Object.keys(value).sort();
  if(keys.length!==2||keys[0]!=='count'||keys[1]!=='id')throw new RangeError(`${label} declared output must contain exactly id and count`);
  return Object.freeze({id,count:integer(value.count,`${label} count`,{min:1,max:FURNACE_STACK_LIMIT})});
}

export function createFurnaceState(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('furnace state must be an object');
  const sourceSlots=Array.isArray(value.slots)?value.slots:[null,null,null];
  if(sourceSlots.length!==FURNACE_SLOT_COUNT)throw new RangeError(`furnace slots must contain ${FURNACE_SLOT_COUNT} entries`);
  const slots=sourceSlots.map((stack,index)=>normalizeFurnaceStack(stack,{label:`furnace slot ${index}`}));
  if(slots[FURNACE_SLOT.FUEL]&&!isFurnaceFuel(slots[FURNACE_SLOT.FUEL].id))throw new RangeError('furnace fuel slot must contain a declared fuel');
  if(slots[FURNACE_SLOT.OUTPUT]&&!RECIPE_OUTPUT_SET.has(slots[FURNACE_SLOT.OUTPUT].id))throw new RangeError('furnace output slot must contain a declared smelting output');
  const burnRemaining=integer(value.burnRemaining??0,'burnRemaining'),burnTotal=integer(value.burnTotal??0,'burnTotal'),cookProgress=integer(value.cookProgress??0,'cookProgress'),cookTotal=integer(value.cookTotal??0,'cookTotal');
  if(burnRemaining>burnTotal)throw new RangeError('burnRemaining cannot exceed burnTotal');
  if(cookProgress>cookTotal)throw new RangeError('cookProgress cannot exceed cookTotal');
  return Object.freeze({
    slots:Object.freeze(slots),burnRemaining,burnTotal,cookProgress,cookTotal,
    storedExperience:finite(value.storedExperience??0,'storedExperience')
  });
}

function cloneSlots(slots){return slots.map(stack=>stack?{...stack}:null);}
function outputAccepts(output,recipe){return !output||(output.id===recipe.output&&output.count+recipe.count<=furnaceStackLimitFor(recipe.output));}
function canSmelt(slots){const input=slots[FURNACE_SLOT.INPUT],recipe=smeltingRecipeFor(input?.id);return recipe&&outputAccepts(slots[FURNACE_SLOT.OUTPUT],recipe)?recipe:null;}
function consumeOne(slots,index){const stack=slots[index];if(!stack)return false;if(stack.count===1)slots[index]=null;else stack.count--;return true;}
function produce(slots,recipe){const output=slots[FURNACE_SLOT.OUTPUT];if(output)output.count+=recipe.count;else slots[FURNACE_SLOT.OUTPUT]={id:recipe.output,count:recipe.count};}

export function tickFurnace(value,ticks=1){
  const initial=createFurnaceState(value);ticks=integer(ticks,'ticks',{min:0,max:1_000_000});
  if(ticks===0)return Object.freeze({state:initial,changed:false,transactionMutations:0,smelted:0,consumedFuel:0,experienceGained:0});
  const slots=cloneSlots(initial.slots);let burnRemaining=initial.burnRemaining,burnTotal=initial.burnTotal,cookProgress=initial.cookProgress,cookTotal=initial.cookTotal,storedExperience=initial.storedExperience;
  let changed=false,transactionMutations=0,smelted=0,consumedFuel=0,experienceGained=0;
  for(let tick=0;tick<ticks;tick++){
    let recipe=canSmelt(slots);
    if(burnRemaining<=0&&recipe){
      const fuel=slots[FURNACE_SLOT.FUEL],duration=furnaceFuelTicks(fuel?.id);
      if(duration>0){consumeOne(slots,FURNACE_SLOT.FUEL);burnRemaining=duration;burnTotal=duration;consumedFuel++;transactionMutations++;changed=true;}
    }
    recipe=canSmelt(slots);
    const burningThisTick=burnRemaining>0;
    if(burningThisTick){burnRemaining--;changed=true;}
    if(recipe&&burningThisTick){
      if(cookTotal!==recipe.cookTicks){cookTotal=recipe.cookTicks;changed=true;}
      cookProgress++;changed=true;
      if(cookProgress>=recipe.cookTicks){
        consumeOne(slots,FURNACE_SLOT.INPUT);produce(slots,recipe);cookProgress=0;storedExperience+=recipe.experience;experienceGained+=recipe.experience;smelted++;transactionMutations++;changed=true;
      }
    }else if(cookProgress>0){
      const next=Math.max(0,cookProgress-2);if(next!==cookProgress){cookProgress=next;changed=true;}
      if(cookProgress===0&&cookTotal!==0){cookTotal=0;changed=true;}
    }else if(!recipe&&cookTotal!==0){cookTotal=0;changed=true;}
    if(burnRemaining===0&&burnTotal!==0){burnTotal=0;changed=true;}
  }
  const state=createFurnaceState({slots,burnRemaining,burnTotal,cookProgress,cookTotal,storedExperience});
  return Object.freeze({state,changed,transactionMutations,smelted,consumedFuel,experienceGained});
}

export function furnaceCanInsert(slot,itemId){
  integer(slot,'furnace slot',{min:0,max:FURNACE_SLOT_COUNT-1});
  if(typeof itemId!=='string'||(!ITEMS[itemId]&&!RECIPE_OUTPUT_SET.has(itemId)))return false;
  if(slot===FURNACE_SLOT.INPUT)return !RECIPE_OUTPUT_SET.has(itemId)||isSmeltable(itemId);
  if(slot===FURNACE_SLOT.FUEL)return isFurnaceFuel(itemId);
  return false;
}
