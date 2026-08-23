export const FOOD_USE_DURATION_SECONDS=1.6;

const finite=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;};
const itemIdValue=value=>{if(typeof value!=='string'||!value.trim())throw new TypeError('food use item id must be a non-empty string');return value;};

export function createFoodUseState(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('food use state must be an object');
  const active=!!value.active,duration=finite(value.duration??FOOD_USE_DURATION_SECONDS,'food use duration');
  if(duration<=0)throw new RangeError('food use duration must be > 0');
  if(!active)return Object.freeze({active:false,itemId:null,elapsed:0,duration,progress:0});
  const itemId=itemIdValue(value.itemId),elapsed=Math.max(0,Math.min(duration,finite(value.elapsed??0,'food use elapsed'))),progress=Math.max(0,Math.min(1,elapsed/duration));
  return Object.freeze({active:true,itemId,elapsed,duration,progress});
}

export function beginFoodUse(itemId,{duration=FOOD_USE_DURATION_SECONDS}={}){
  return createFoodUseState({active:true,itemId:itemIdValue(itemId),elapsed:0,duration});
}

export function stepFoodUse(value,dt){
  const state=createFoodUseState(value);dt=finite(dt,'food use dt');if(dt<0||dt>60)throw new RangeError('food use dt must be from 0 to 60 seconds');
  if(!state.active||dt===0)return Object.freeze({state,completed:false,changed:false});
  const elapsed=Math.min(state.duration,state.elapsed+dt),completed=elapsed>=state.duration,stateNext=completed?createFoodUseState({duration:state.duration}):createFoodUseState({...state,elapsed});
  return Object.freeze({state:stateNext,completed,changed:elapsed!==state.elapsed});
}
