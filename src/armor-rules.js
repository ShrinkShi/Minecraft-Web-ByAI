function nonNegative(value,label){if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new RangeError(`${label} must be a finite non-negative number`);return value;}

export function effectiveArmorPoints(amount,armorPoints,armorToughness=0){
  amount=nonNegative(amount,'damage amount');armorPoints=nonNegative(armorPoints,'armorPoints');armorToughness=nonNegative(armorToughness,'armorToughness');
  if(amount===0||armorPoints===0)return 0;
  const toughnessScale=2+armorToughness/4;
  return Math.min(20,Math.max(armorPoints-amount/toughnessScale,armorPoints*.2));
}

export function armorReduction(amount,armorPoints,armorToughness=0){
  return effectiveArmorPoints(amount,armorPoints,armorToughness)/25;
}

export function mitigateArmorDamage(amount,armorPoints,armorToughness=0){
  amount=nonNegative(amount,'damage amount');
  return amount*(1-armorReduction(amount,armorPoints,armorToughness));
}

export function armorDurabilityDamage(amount){
  amount=nonNegative(amount,'damage amount');
  if(amount<=0)return 0;
  return Math.max(1,Math.floor(amount/4));
}
