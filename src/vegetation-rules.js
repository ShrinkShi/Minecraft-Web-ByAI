import {wheatAgeFromBlock,wheatBlockForAge} from './farming-rules.js';

export const SHORT_GRASS_SEED_CHANCE=1/8;
export const BONE_MEAL_WHEAT_MIN_GROWTH=2;
export const BONE_MEAL_WHEAT_MAX_GROWTH=5;
export const BONE_MEAL_GRASS_ATTEMPTS=128;
export const BONE_MEAL_GRASS_MAX_RADIUS=4;

function unitRandom(random){
  if(typeof random!=='function')throw new TypeError('random must be a function');
  const value=Number(random());
  if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('random must return a finite value in [0, 1)');
  return value;
}

export function rollShortGrassDrops(random=Math.random){
  return unitRandom(random)<SHORT_GRASS_SEED_CHANCE?[{id:'wheat_seeds',count:1}]:[];
}

export function boneMealWheatResult(blockId,random=Math.random){
  const fromAge=wheatAgeFromBlock(blockId);
  if(fromAge===null||fromAge>=7)return null;
  const span=BONE_MEAL_WHEAT_MAX_GROWTH-BONE_MEAL_WHEAT_MIN_GROWTH+1;
  const growth=BONE_MEAL_WHEAT_MIN_GROWTH+Math.floor(unitRandom(random)*span);
  const toAge=Math.min(7,fromAge+growth);
  return{fromAge,toAge,blockId:wheatBlockForAge(toAge),growth:toAge-fromAge};
}

export function boneMealGrassCandidateOffsets(random=Math.random,{attempts=BONE_MEAL_GRASS_ATTEMPTS,maxRadius=BONE_MEAL_GRASS_MAX_RADIUS}={}){
  if(!Number.isInteger(attempts)||attempts<0||attempts>1024)throw new RangeError('attempts must be an integer between 0 and 1024');
  if(!Number.isInteger(maxRadius)||maxRadius<0||maxRadius>16)throw new RangeError('maxRadius must be an integer between 0 and 16');
  const offsets=[];
  for(let index=0;index<attempts;index++){
    const radius=Math.min(maxRadius,1+Math.floor(index/32));
    const width=radius*2+1;
    const dx=Math.floor(unitRandom(random)*width)-radius;
    const dz=Math.floor(unitRandom(random)*width)-radius;
    offsets.push({dx,dz});
  }
  return offsets;
}
