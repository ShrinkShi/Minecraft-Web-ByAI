export const DEFAULT_ATTACK_COOLDOWN_MS=600;
export const DEFAULT_HURT_COOLDOWN_MS=500;

function finite(value,name){if(!Number.isFinite(value))throw new TypeError(`${name} must be finite`);return value;}

export function canAttack(lastAttackAt,now,cooldownMs=DEFAULT_ATTACK_COOLDOWN_MS){
  finite(now,'now');finite(cooldownMs,'cooldownMs');if(cooldownMs<0)throw new RangeError('cooldownMs must be >= 0');
  return !Number.isFinite(lastAttackAt)||now-lastAttackAt>=cooldownMs;
}

export function applyDamage(state,amount,now,{hurtCooldownMs=DEFAULT_HURT_COOLDOWN_MS,maxHp=20}={}){
  if(!state||typeof state!=='object')throw new TypeError('state is required');
  finite(amount,'amount');finite(now,'now');finite(hurtCooldownMs,'hurtCooldownMs');finite(maxHp,'maxHp');
  if(amount<=0||maxHp<=0||hurtCooldownMs<0)throw new RangeError('invalid damage parameters');
  const hp=Number.isFinite(state.hp)?state.hp:maxHp,hurtUntil=Number.isFinite(state.hurtUntil)?state.hurtUntil:-Infinity;
  if(hp<=0||now<hurtUntil)return{applied:false,damage:0,hp:Math.max(0,hp),dead:hp<=0};
  const nextHp=Math.max(0,Math.min(maxHp,hp-amount));state.hp=nextHp;state.hurtUntil=now+hurtCooldownMs;
  return{applied:true,damage:hp-nextHp,hp:nextHp,dead:nextHp<=0};
}

export function knockbackDirection(sourceX,sourceZ,targetX,targetZ){
  for(const[v,n]of[[sourceX,'sourceX'],[sourceZ,'sourceZ'],[targetX,'targetX'],[targetZ,'targetZ']])finite(v,n);
  let dx=targetX-sourceX,dz=targetZ-sourceZ,length=Math.hypot(dx,dz);
  if(length<1e-6){dx=0;dz=1;length=1;}
  return{x:dx/length,z:dz/length};
}
