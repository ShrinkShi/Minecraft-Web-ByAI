import {segmentAabbIntersectionT} from './projectile-rules.js';

export function nearestMobSegmentHit({records,positionOf,definitionFor,start,end,excludeId=null}={}){
  if(!records||typeof records[Symbol.iterator]!=='function')throw new TypeError('mob records must be iterable');
  if(typeof positionOf!=='function'||typeof definitionFor!=='function')throw new TypeError('mob hit resolvers are required');
  let best=null,bestT=Infinity;
  for(const record of records){
    if(!record||record.id===excludeId)continue;const position=positionOf(record),def=definitionFor(record);if(!position||!def)continue;
    const halfWidth=Math.max(.05,Number(def.width)||.6)*.5,height=Math.max(.1,Number(def.height)||1.8),bounds={minX:position.x-halfWidth,maxX:position.x+halfWidth,minY:position.y,maxY:position.y+height,minZ:position.z-halfWidth,maxZ:position.z+halfWidth};
    const t=segmentAabbIntersectionT(start,end,bounds);if(t!==null&&t<bestT){bestT=t;best={entity:record,position:{...position},t};}
  }
  return best?Object.freeze(best):null;
}
