export function armorReduction(armorPoints,{perPoint=.04,maxReduction=.8}={}){
  if(!Number.isFinite(armorPoints)||armorPoints<0)throw new RangeError('armorPoints must be a finite non-negative number');
  if(!Number.isFinite(perPoint)||perPoint<0||!Number.isFinite(maxReduction)||maxReduction<0||maxReduction>1)throw new RangeError('armor reduction settings are invalid');
  return Math.min(maxReduction,armorPoints*perPoint);
}

export function mitigateArmorDamage(amount,armorPoints,options){
  if(!Number.isFinite(amount)||amount<0)throw new RangeError('damage amount must be a finite non-negative number');
  return amount*(1-armorReduction(armorPoints,options));
}
