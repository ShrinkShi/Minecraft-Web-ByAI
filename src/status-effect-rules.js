export const STATUS_EFFECT_HUNGER='hunger';
export const SUPPORTED_STATUS_EFFECTS=Object.freeze([STATUS_EFFECT_HUNGER]);
export const HUNGER_EXHAUSTION_PER_SECOND_PER_LEVEL=.1;

const SUPPORTED=new Set(SUPPORTED_STATUS_EFFECTS);
const finite=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;};
const effectId=value=>{if(typeof value!=='string'||!SUPPORTED.has(value))throw new RangeError(`unsupported status effect: ${String(value)}`);return value;};
const freezeList=value=>Object.freeze(value.map(entry=>Object.freeze({...entry})));

export function normalizeStatusEffect(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('status effect must be an object');
  const id=effectId(value.id),amplifier=finite(value.amplifier??0,'status effect amplifier'),remainingSeconds=finite(value.remainingSeconds,'status effect remainingSeconds');
  if(!Number.isInteger(amplifier)||amplifier<0||amplifier>255)throw new RangeError('status effect amplifier must be an integer from 0 to 255');
  if(remainingSeconds<=0||remainingSeconds>86_400)throw new RangeError('status effect remainingSeconds must be > 0 and <= 86400');
  return Object.freeze({id,amplifier,remainingSeconds});
}

export function normalizeStatusEffects(value=[]){
  if(value===undefined||value===null)return Object.freeze([]);
  if(!Array.isArray(value))throw new TypeError('status effects must be an array');
  const seen=new Set(),effects=[];
  for(const entry of value){const effect=normalizeStatusEffect(entry);if(seen.has(effect.id))throw new RangeError(`duplicate status effect: ${effect.id}`);seen.add(effect.id);effects.push(effect);}
  return freezeList(effects);
}

export function normalizeFoodStatusEffects(value=[]){
  if(value===undefined||value===null)return Object.freeze([]);
  if(!Array.isArray(value))throw new TypeError('food status effects must be an array');
  const effects=value.map(entry=>{
    if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new TypeError('food status effect must be an object');
    const id=effectId(entry.id),amplifier=finite(entry.amplifier??0,'food status effect amplifier'),durationSeconds=finite(entry.durationSeconds,'food status effect durationSeconds'),chance=finite(entry.chance??1,'food status effect chance');
    if(!Number.isInteger(amplifier)||amplifier<0||amplifier>255)throw new RangeError('food status effect amplifier must be an integer from 0 to 255');
    if(durationSeconds<=0||durationSeconds>86_400)throw new RangeError('food status effect durationSeconds must be > 0 and <= 86400');
    if(chance<0||chance>1)throw new RangeError('food status effect chance must be from 0 to 1');
    return Object.freeze({id,amplifier,durationSeconds,chance});
  });
  return Object.freeze(effects);
}

export function rollFoodStatusEffects(value,{random=Math.random}={}){
  const profiles=normalizeFoodStatusEffects(value);if(typeof random!=='function')throw new TypeError('status effect random must be a function');
  const rolled=[];
  for(const profile of profiles){
    const sample=finite(random(),'status effect random sample');if(sample<0||sample>=1)throw new RangeError('status effect random sample must be from 0 inclusive to 1 exclusive');
    if(sample<profile.chance)rolled.push(Object.freeze({id:profile.id,amplifier:profile.amplifier,remainingSeconds:profile.durationSeconds}));
  }
  return freezeList(rolled);
}

export function applyStatusEffect(value,incoming){
  const effects=[...normalizeStatusEffects(value)],next=normalizeStatusEffect(incoming),index=effects.findIndex(effect=>effect.id===next.id);
  if(index<0){effects.push(next);return freezeList(effects);}
  const current=effects[index];
  if(next.amplifier>current.amplifier||(next.amplifier===current.amplifier&&next.remainingSeconds>current.remainingSeconds))effects[index]=next;
  return freezeList(effects);
}

export function stepStatusEffects(value,{dt}={}){
  const effects=normalizeStatusEffects(value);dt=finite(dt,'status effect dt');if(dt<0||dt>60)throw new RangeError('status effect dt must be from 0 to 60 seconds');
  if(dt===0||effects.length===0)return Object.freeze({effects,hungerExhaustion:0,changed:false});
  let hungerExhaustion=0;const next=[];
  for(const effect of effects){
    const activeSeconds=Math.min(dt,effect.remainingSeconds);
    if(effect.id===STATUS_EFFECT_HUNGER)hungerExhaustion+=activeSeconds*HUNGER_EXHAUSTION_PER_SECOND_PER_LEVEL*(effect.amplifier+1);
    const remainingSeconds=Math.max(0,effect.remainingSeconds-dt);if(remainingSeconds>1e-9)next.push({id:effect.id,amplifier:effect.amplifier,remainingSeconds});
  }
  return Object.freeze({effects:freezeList(next),hungerExhaustion,changed:true});
}
