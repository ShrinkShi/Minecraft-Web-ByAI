const OFFSETS=Object.freeze([
  [0,0,0],
  [1,0,0],[-1,0,0],[0,0,1],[0,0,-1],
  [1,0,1],[1,0,-1],[-1,0,1],[-1,0,-1],
  [0,1,0],[1,1,0],[-1,1,0],[0,1,1],[0,1,-1]
]);

export function normalizeRespawnPoint(value){
  if(!value||typeof value!=='object')return null;
  const x=Number(value.x),y=Number(value.y),z=Number(value.z);
  if(![x,y,z].every(Number.isFinite))return null;
  return{x,y,z};
}

export function respawnCandidates(value){
  const point=normalizeRespawnPoint(value);if(!point)return[];
  return OFFSETS.map(([dx,dy,dz])=>({x:point.x+dx,y:point.y+dy,z:point.z+dz}));
}

export function resolveRespawnPosition(value,isSafe){
  if(typeof isSafe!=='function')throw new TypeError('isSafe must be a function');
  for(const candidate of respawnCandidates(value))if(isSafe(candidate))return candidate;
  return null;
}

export const RESPAWN_CANDIDATE_COUNT=OFFSETS.length;
