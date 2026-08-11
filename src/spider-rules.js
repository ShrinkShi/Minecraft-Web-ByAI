export function resolveSpiderClimb(currentY,targetY,dt,{climbRate=3.2,maxClimbHeight=3,maxDrop=2}={}){
  if(!Number.isFinite(currentY)||!Number.isFinite(targetY)||!Number.isFinite(dt)||dt<0)throw new RangeError('Spider climb inputs must be finite and dt >= 0');
  if(!Number.isFinite(climbRate)||climbRate<=0||!Number.isFinite(maxClimbHeight)||maxClimbHeight<=1.05||!Number.isFinite(maxDrop)||maxDrop<0)throw new RangeError('Spider climb limits are invalid');
  const rise=targetY-currentY,drop=currentY-targetY;
  if(drop>maxDrop)return{blocked:true,climbing:false,y:currentY,canAdvance:false};
  if(rise<=1.05)return{blocked:false,climbing:false,y:targetY,canAdvance:true};
  if(rise>maxClimbHeight)return{blocked:true,climbing:false,y:currentY,canAdvance:false};
  const nextY=Math.min(targetY,currentY+climbRate*dt);
  return{blocked:false,climbing:nextY<targetY,y:nextY,canAdvance:nextY>=targetY};
}
