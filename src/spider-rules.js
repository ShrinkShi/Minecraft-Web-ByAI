export function resolveSpiderClimb(currentY,targetY,dt,{climbRate=3.2,maxClimbHeight=3}={}){
  if(!Number.isFinite(currentY)||!Number.isFinite(targetY)||!Number.isFinite(dt)||dt<0)throw new RangeError('Spider climb inputs must be finite and dt >= 0');
  if(!Number.isFinite(climbRate)||climbRate<=0||!Number.isFinite(maxClimbHeight)||maxClimbHeight<=1.05)throw new RangeError('Spider climb limits must be positive');
  const rise=targetY-currentY;
  if(rise<=1.05)return{blocked:false,climbing:false,y:targetY,canAdvance:true};
  if(rise>maxClimbHeight)return{blocked:true,climbing:false,y:currentY,canAdvance:false};
  const nextY=Math.min(targetY,currentY+climbRate*dt);
  return{blocked:false,climbing:nextY<targetY,y:nextY,canAdvance:nextY>=targetY};
}
