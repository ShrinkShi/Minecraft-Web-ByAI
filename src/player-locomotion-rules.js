const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export const PLAYER_WALK_CYCLE_RATE=9.5;
export const PLAYER_SPRINT_CYCLE_RATE=13.5;
export const PLAYER_WALK_LEG_SWING=.62;
export const PLAYER_SPRINT_LEG_SWING=1.04;
export const PLAYER_WALK_ARM_SWING=.52;
export const PLAYER_SPRINT_ARM_SWING=.86;

export function playerLocomotionPose({phase=0,moving=0,sprint=false}={}){
  const amount=clamp01(moving),p=Number.isFinite(phase)?phase:0,run=!!sprint;
  const step=Math.sin(p),counter=Math.sin(p+Math.PI),doubleStep=Math.sin(p*2),impact=Math.abs(Math.sin(p));
  const legAmplitude=(run?PLAYER_SPRINT_LEG_SWING:PLAYER_WALK_LEG_SWING)*amount;
  const armAmplitude=(run?PLAYER_SPRINT_ARM_SWING:PLAYER_WALK_ARM_SWING)*amount;
  const bodyLean=(run?-.21:-.035)*amount;
  const bodyBob=(run?.055:.025)*impact*amount;
  const bodyRoll=(run?.045:.018)*doubleStep*amount;
  const shoulderYaw=(run?.055:.025)*counter*amount;
  return Object.freeze({
    leftLegX:step*legAmplitude,
    rightLegX:counter*legAmplitude,
    leftArmX:counter*armAmplitude,
    rightArmX:step*armAmplitude,
    leftLegZ:(run?.045:.018)*counter*amount,
    rightLegZ:(run?.045:.018)*step*amount,
    torsoX:bodyLean,
    torsoZ:bodyRoll,
    rootY:bodyBob,
    rootZ:run?-.025*amount:0,
    shoulderYaw,
    cycleRate:run?PLAYER_SPRINT_CYCLE_RATE:PLAYER_WALK_CYCLE_RATE
  });
}
