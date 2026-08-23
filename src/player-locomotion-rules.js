export const WALK_LEG_SWING_RADIANS=.62;
export const WALK_ARM_SWING_RADIANS=.52;
export const RUN_LEG_SWING_RADIANS=1.05;
export const RUN_ARM_SWING_RADIANS=.92;
export const RUN_BODY_LEAN_RADIANS=.20;

const clamp01=value=>Math.max(0,Math.min(1,value));
const finite=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;};

export function playerLocomotionPose({phase=0,speed=0,sprint=false}={}){
  phase=finite(phase,'phase');speed=Math.max(0,finite(speed,'speed'));const running=!!sprint&&speed>.1;
  const referenceSpeed=running?5.6:4.3,moving=clamp01(speed/referenceSpeed);
  if(moving<=.01)return Object.freeze({moving:0,running:false,phaseSpeed:0,leftArmPitch:0,rightArmPitch:0,leftLegPitch:0,rightLegPitch:0,bodyPitch:0,bodyYaw:0,bobY:0,swayX:0});

  const stride=Math.sin(phase),doubleStep=Math.cos(phase*2),phaseSpeed=running?13.5:Math.min(10.5,4+speed*1.55);
  const legAmplitude=(running?RUN_LEG_SWING_RADIANS:WALK_LEG_SWING_RADIANS)*moving;
  const armAmplitude=(running?RUN_ARM_SWING_RADIANS:WALK_ARM_SWING_RADIANS)*moving;
  const runKick=running?Math.sin(phase*2)*.08*moving:0;
  const bodyPitch=running?-RUN_BODY_LEAN_RADIANS*moving:0;
  const bodyYaw=(running?.075:.035)*stride*moving;
  const bobY=(running?.045:.018)*(1-doubleStep)*.5*moving;
  const swayX=(running?.018:.010)*Math.sin(phase)*moving;

  return Object.freeze({
    moving,
    running,
    phaseSpeed,
    leftArmPitch:-stride*armAmplitude,
    rightArmPitch:stride*armAmplitude,
    leftLegPitch:stride*legAmplitude-runKick,
    rightLegPitch:-stride*legAmplitude-runKick,
    bodyPitch,
    bodyYaw,
    bobY,
    swayX
  });
}
