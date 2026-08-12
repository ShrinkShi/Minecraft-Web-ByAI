export const WEATHER_MAX_SEGMENTS=720;
export const WEATHER_TYPES=Object.freeze(['clear','rain','thunder']);
export const WEATHER_PROFILES=Object.freeze({
  clear:Object.freeze({ratio:0,fallSpeed:0,length:0,windX:0,windZ:0,opacity:0}),
  rain:Object.freeze({ratio:.62,fallSpeed:18,length:.8,windX:.65,windZ:.2,opacity:.42}),
  thunder:Object.freeze({ratio:1,fallSpeed:22,length:1.1,windX:1.1,windZ:.35,opacity:.55})
});

export function precipitationProfile(type,maxSegments=WEATHER_MAX_SEGMENTS){
  if(!WEATHER_TYPES.includes(type))throw new RangeError(`unknown weather: ${type}`);
  if(!Number.isInteger(maxSegments)||maxSegments<=0)throw new RangeError('maxSegments must be a positive integer');
  const base=WEATHER_PROFILES[type];
  return{type,...base,count:Math.floor(maxSegments*base.ratio),maxSegments};
}
