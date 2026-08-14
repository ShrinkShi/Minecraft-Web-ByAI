export const MINING_CRACK_STAGE_COUNT=10;

export function miningCrackStage(progress){
  if(typeof progress!=='number'||!Number.isFinite(progress))throw new TypeError('mining crack progress must be a finite number');
  if(progress<=0||progress>=1)return null;
  return Math.min(MINING_CRACK_STAGE_COUNT-1,Math.floor(progress*MINING_CRACK_STAGE_COUNT));
}

export function miningCrackTarget(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('mining crack target must be an object');
  for(const key of ['x','y','z','id'])if(!Number.isInteger(value[key]))throw new TypeError(`mining crack target ${key} must be an integer`);
  if(value.id<=0)throw new RangeError('mining crack target id must be non-air');
  return Object.freeze({x:value.x,y:value.y,z:value.z,id:value.id});
}
