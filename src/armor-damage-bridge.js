function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function rawDamage(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new RangeError('raw armor damage must be a finite non-negative number');return value;}

export function forwardDamageWithArmorWear({player,equipment,damage,event,callback:forward}){
  player=object(player,'armor damage player');equipment=object(equipment,'armor damage equipment');forward=callback(forward,'armor damage callback');damage=rawDamage(damage);
  if(typeof player.takeDamage!=='function')throw new TypeError('armor damage player must expose takeDamage');if(typeof equipment.damageArmor!=='function')throw new TypeError('armor damage equipment must expose damageArmor');
  const original=player.takeDamage;let worn=false;
  player.takeDamage=function(...args){const result=original.apply(this,args);if(result?.applied&&!worn&&damage>0){worn=true;equipment.damageArmor(damage);}return result;};
  try{return forward(event);}finally{player.takeDamage=original;}
}
