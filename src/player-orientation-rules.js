function finite(value,label){
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);
  return value;
}

export function horizontalMoveFromYaw(yaw,{side=0,forward=0}={}){
  const angle=finite(yaw,'yaw'),s=finite(side,'side'),f=finite(forward,'forward');
  return{
    x:Math.cos(angle)*s-Math.sin(angle)*f,
    z:-Math.sin(angle)*s-Math.cos(angle)*f
  };
}

export function lookDirectionFromYawPitch(yaw,pitch){
  const angle=finite(yaw,'yaw'),vertical=finite(pitch,'pitch'),cp=Math.cos(vertical);
  const x=-Math.sin(angle)*cp,y=Math.sin(vertical),z=-Math.cos(angle)*cp,length=Math.hypot(x,y,z)||1;
  return{x:x/length,y:y/length,z:z/length};
}
