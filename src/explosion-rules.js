function finite(value,name){if(!Number.isFinite(value))throw new TypeError(`${name} must be finite`);return value;}

export function explosionExposure(distance,radius){finite(distance,'distance');finite(radius,'radius');if(distance<0||radius<=0)throw new RangeError('invalid explosion distance/radius');return Math.max(0,1-distance/radius);}

export function explosionDamage(distance,radius,maxDamage=12){finite(maxDamage,'maxDamage');if(maxDamage<0)throw new RangeError('maxDamage must be >= 0');const exposure=explosionExposure(distance,radius);return exposure<=0?0:Math.max(1,Math.ceil(maxDamage*exposure*exposure));}

export function explosionKnockback(distance,radius,maxStrength=1.05){finite(maxStrength,'maxStrength');if(maxStrength<0)throw new RangeError('maxStrength must be >= 0');return maxStrength*explosionExposure(distance,radius);}

export function explosionDestroysBlock(distance,radius,hardness=1){finite(hardness,'hardness');if(hardness<0)throw new RangeError('hardness must be >= 0');if(distance>radius)return false;return distance+Math.min(2.5,hardness*.38)<=radius+.15;}
