export const MAX_FOOD_LEVEL=20;
export const MAX_SATURATION=20;
export const MAX_EXHAUSTION=40;
export const EXHAUSTION_THRESHOLD=4;
export const SATURATED_REGEN_INTERVAL_SECONDS=.5;
export const NATURAL_REGEN_INTERVAL_SECONDS=4;
export const STARVATION_INTERVAL_SECONDS=4;
export const NORMAL_STARVATION_FLOOR_HP=1;
export const SPRINT_FOOD_THRESHOLD=6;

const finite=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const modeValue=value=>{if(!['survival','creative','adventure','spectator'].includes(value))throw new RangeError(`unsupported hunger mode: ${value}`);return value;};

export function createHungerState(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('hunger state must be an object');
  const food=clamp(finite(value.food??MAX_FOOD_LEVEL,'food'),0,MAX_FOOD_LEVEL);
  const saturation=clamp(finite(value.saturation??5,'saturation'),0,Math.min(MAX_SATURATION,food));
  const exhaustion=clamp(finite(value.exhaustion??0,'exhaustion'),0,MAX_EXHAUSTION);
  const timer=Math.max(0,finite(value.timer??0,'hunger timer'));
  return Object.freeze({food,saturation,exhaustion,timer});
}

export function addHungerExhaustion(value,amount){
  const state=createHungerState(value);amount=finite(amount,'exhaustion amount');if(amount<0)throw new RangeError('exhaustion amount must be >= 0');
  return createHungerState({...state,exhaustion:Math.min(MAX_EXHAUSTION,state.exhaustion+amount)});
}

export function movementExhaustion(distance,{sprinting=false,swimming=false}={}){
  distance=finite(distance,'movement distance');if(distance<0)throw new RangeError('movement distance must be >= 0');
  if(swimming)return distance*.01;if(sprinting)return distance*.1;return 0;
}

export function canSprintWithHunger(food,mode='survival'){mode=modeValue(mode);food=clamp(finite(food,'food'),0,MAX_FOOD_LEVEL);return mode!=='survival'||food>SPRINT_FOOD_THRESHOLD;}
export function jumpExhaustion({sprinting=false}={}){return sprinting===true ? .2 : .05;}
export function attackExhaustion(){return .1;}
export function damageExhaustion(){return .1;}

export function normalizeFoodProfile(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('food profile must be an object');
  const nutrition=finite(value.nutrition,'food nutrition');if(!Number.isInteger(nutrition)||nutrition<0||nutrition>MAX_FOOD_LEVEL)throw new RangeError('food nutrition must be an integer from 0 to 20');
  const saturationModifier=finite(value.saturationModifier,'food saturation modifier');if(saturationModifier<0||saturationModifier>2)throw new RangeError('food saturation modifier must be from 0 to 2');
  return Object.freeze({nutrition,saturationModifier,alwaysEdible:!!value.alwaysEdible});
}

export function consumeFood(value,profile){
  const state=createHungerState(value),food=normalizeFoodProfile(profile);
  if(state.food>=MAX_FOOD_LEVEL&&!food.alwaysEdible)return Object.freeze({consumed:false,state,nutrition:0,saturationAdded:0});
  const nextFood=Math.min(MAX_FOOD_LEVEL,state.food+food.nutrition);
  const saturationAdded=food.nutrition*food.saturationModifier*2;
  const next=createHungerState({...state,food:nextFood,saturation:Math.min(nextFood,state.saturation+saturationAdded),timer:0});
  return Object.freeze({consumed:true,state:next,nutrition:next.food-state.food,saturationAdded:next.saturation-state.saturation});
}

function drainExhaustion(state){
  let {food,saturation,exhaustion,timer}=state,changed=false;
  if(exhaustion>EXHAUSTION_THRESHOLD){
    exhaustion-=EXHAUSTION_THRESHOLD;changed=true;
    if(saturation>0)saturation=Math.max(0,saturation-1);
    else if(food>0)food=Math.max(0,food-1);
  }
  return{state:createHungerState({food,saturation,exhaustion,timer}),changed};
}

export function stepHunger(value,{dt,hp,maxHp=20,mode='survival',naturalRegeneration=true,starvationFloorHp=NORMAL_STARVATION_FLOOR_HP}={}){
  let state=createHungerState(value);dt=finite(dt,'hunger dt');if(dt<0||dt>60)throw new RangeError('hunger dt must be from 0 to 60 seconds');hp=finite(hp,'hp');maxHp=finite(maxHp,'maxHp');if(maxHp<=0)throw new RangeError('maxHp must be > 0');mode=modeValue(mode);starvationFloorHp=clamp(finite(starvationFloorHp,'starvation floor hp'),0,maxHp);
  if(mode!=='survival'||dt===0)return Object.freeze({state,heal:0,damage:0,changed:false});
  const drained=drainExhaustion(state);state=drained.state;let changed=drained.changed,heal=0,damage=0,timer=state.timer;
  if(naturalRegeneration&&hp<maxHp&&state.food===MAX_FOOD_LEVEL&&state.saturation>0){
    timer+=dt;
    while(timer>=SATURATED_REGEN_INTERVAL_SECONDS&&hp+heal<maxHp&&state.saturation>0){
      const available=Math.min(state.saturation,6),amount=Math.min(maxHp-(hp+heal),available/6);if(amount<=0)break;heal+=amount;state=addHungerExhaustion(state,available);timer-=SATURATED_REGEN_INTERVAL_SECONDS;changed=true;
    }
  }else if(naturalRegeneration&&hp<maxHp&&state.food>=18){
    timer+=dt;
    while(timer>=NATURAL_REGEN_INTERVAL_SECONDS&&hp+heal<maxHp){heal+=Math.min(1,maxHp-(hp+heal));state=addHungerExhaustion(state,6);timer-=NATURAL_REGEN_INTERVAL_SECONDS;changed=true;}
  }else if(state.food<=0){
    timer+=dt;
    while(timer>=STARVATION_INTERVAL_SECONDS&&hp-damage>starvationFloorHp){damage+=Math.min(1,hp-damage-starvationFloorHp);timer-=STARVATION_INTERVAL_SECONDS;changed=true;}
  }else timer=0;
  if(timer!==state.timer){state=createHungerState({...state,timer});changed=true;}
  return Object.freeze({state,heal,damage,changed});
}
