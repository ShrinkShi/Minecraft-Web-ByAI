function finite(value,name){if(!Number.isFinite(value))throw new TypeError(`${name} must be finite`);return value;}

export function segmentIntersectsAabb(start,end,bounds){
  if(!start||!end||!bounds)throw new TypeError('start/end/bounds are required');
  for(const[key,value]of Object.entries({sx:start.x,sy:start.y,sz:start.z,ex:end.x,ey:end.y,ez:end.z,minX:bounds.minX,minY:bounds.minY,minZ:bounds.minZ,maxX:bounds.maxX,maxY:bounds.maxY,maxZ:bounds.maxZ}))finite(value,key);
  if(bounds.maxX<bounds.minX||bounds.maxY<bounds.minY||bounds.maxZ<bounds.minZ)throw new RangeError('invalid AABB bounds');
  let tMin=0,tMax=1;
  for(const axis of ['x','y','z']){
    const min=bounds[`min${axis.toUpperCase()}`],max=bounds[`max${axis.toUpperCase()}`],s=start[axis],d=end[axis]-s;
    if(Math.abs(d)<1e-12){if(s<min||s>max)return false;continue;}
    let t1=(min-s)/d,t2=(max-s)/d;if(t1>t2)[t1,t2]=[t2,t1];tMin=Math.max(tMin,t1);tMax=Math.min(tMax,t2);if(tMin>tMax)return false;
  }
  return true;
}

export function aimVelocity(origin,target,speed=15,gravity=4){
  if(!origin||!target)throw new TypeError('origin and target are required');finite(speed,'speed');finite(gravity,'gravity');if(speed<=0||gravity<0)throw new RangeError('invalid projectile parameters');
  const dx=finite(target.x,'target.x')-finite(origin.x,'origin.x'),dy=finite(target.y,'target.y')-finite(origin.y,'origin.y'),dz=finite(target.z,'target.z')-finite(origin.z,'origin.z');
  const horizontal=Math.hypot(dx,dz),travel=Math.max(.001,horizontal/speed),compensatedY=dy+.5*gravity*travel*travel,length=Math.hypot(dx,compensatedY,dz)||1;
  return{x:dx/length*speed,y:compensatedY/length*speed,z:dz/length*speed};
}
