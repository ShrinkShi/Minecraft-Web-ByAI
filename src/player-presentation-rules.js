const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export function inventoryPreviewPointerPose(horizontal,vertical){
  horizontal=clamp(horizontal,-1,1);vertical=clamp(vertical,-1,1);
  return Object.freeze({
    bodyYaw:horizontal*.42,
    headYaw:horizontal*.8,
    // DOM pointer Y grows downward while the player model's positive X pitch
    // raises the face. Convert once at the presentation boundary so moving the
    // pointer upward makes Steve look upward instead of mirroring vertically.
    headPitch:-vertical*.48
  });
}

export function playerAttackArmPitch(actionPhase){
  const phase=Number.isFinite(actionPhase)?actionPhase:0;
  // The player's front is -Z. A positive local X rotation moves the hanging
  // right arm (-Y) toward -Z, so forward attacks must use positive pitch.
  return .65+Math.abs(Math.sin(phase))*1.25;
}

export function playerUseArmPitch(useRemaining,{duration=.34}={}){
  const remaining=Math.max(0,Number(useRemaining)||0),safeDuration=Math.max(.001,Number(duration)||.34),t=Math.min(1,remaining/safeDuration);
  return 1.05+Math.sin((1-t)*Math.PI)*.22;
}
