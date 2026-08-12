export const SLEEP_MONSTER_HORIZONTAL=8;
export const SLEEP_MONSTER_VERTICAL=5;

function finitePoint(point,label){
  if(!point||![point.x,point.y,point.z].every(Number.isFinite))throw new TypeError(`${label} must contain finite x/y/z`);
  return point;
}

export function isSleepBlockingPosition(bedPosition,monsterPosition,{horizontal=SLEEP_MONSTER_HORIZONTAL,vertical=SLEEP_MONSTER_VERTICAL}={}){
  const bed=finitePoint(bedPosition,'bed position'),monster=finitePoint(monsterPosition,'monster position');
  if(!Number.isFinite(horizontal)||horizontal<0)throw new RangeError('horizontal sleep-block radius must be >= 0');
  if(!Number.isFinite(vertical)||vertical<0)throw new RangeError('vertical sleep-block radius must be >= 0');
  return Math.abs(monster.x-bed.x)<=horizontal&&Math.abs(monster.z-bed.z)<=horizontal&&Math.abs(monster.y-bed.y)<=vertical;
}

export function firstSleepBlocker(bedPosition,monsters,options){
  finitePoint(bedPosition,'bed position');
  if(!monsters||typeof monsters[Symbol.iterator]!=='function')throw new TypeError('monsters must be iterable');
  for(const monster of monsters){
    if(!monster||!monster.position)continue;
    if(isSleepBlockingPosition(bedPosition,monster.position,options))return monster;
  }
  return null;
}
