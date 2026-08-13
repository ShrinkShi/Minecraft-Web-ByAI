import {normalizeControlState} from './control-intents.js';
import {horizontalMoveFromYaw} from './player-orientation-rules.js';
import {stepSwimming} from './swim-rules.js';

export const PLAYER_MAX_STEP_DT=.05;
export const PLAYER_WALK_SPEED=4.3;
export const PLAYER_SPRINT_SPEED=5.6;
export const PLAYER_SNEAK_SPEED_FACTOR=.35;
export const PLAYER_FLIGHT_VERTICAL_SPEED=7;
export const PLAYER_GRAVITY=24;
export const PLAYER_JUMP_SPEED=8.2;
export const PLAYER_GROUND_HORIZONTAL_DRAG=8;
export const PLAYER_SWIM_HORIZONTAL_DRAG=5;

function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function nonNegative(value,label){value=finite(value,label);if(value<0)throw new RangeError(`${label} must be >= 0`);return value;}
function bool(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function velocity3(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('velocity must be an object');
  return{x:finite(value.x,'velocity.x'),y:finite(value.y,'velocity.y'),z:finite(value.z,'velocity.z')};
}
function coverage(value){value=finite(value,'swimCoverage');if(value<0||value>1)throw new RangeError('swimCoverage must be between 0 and 1');return value;}
function positiveSpeed(value,label){value=finite(value,label);if(value<=0)throw new RangeError(`${label} must be > 0`);return value;}

export function planPlayerMotionStep({
  dt,
  yaw,
  control,
  velocity,
  flying=false,
  swimCoverage=0,
  grounded=false,
  walkSpeed=PLAYER_WALK_SPEED,
  sprintSpeed=PLAYER_SPRINT_SPEED
}={}){
  const stepDt=Math.min(nonNegative(dt,'dt'),PLAYER_MAX_STEP_DT),angle=finite(yaw,'yaw'),input=normalizeControlState(control),current=velocity3(velocity),isFlying=bool(flying,'flying'),isGrounded=bool(grounded,'grounded');
  walkSpeed=positiveSpeed(walkSpeed,'walkSpeed');sprintSpeed=positiveSpeed(sprintSpeed,'sprintSpeed');const water=isFlying?0:coverage(swimCoverage);
  const swim=stepSwimming({velocityY:current.y,coverage:water,dt:stepDt,up:input.jump,down:input.sneak});
  const baseSpeed=swim.active?walkSpeed:(input.sprint?sprintSpeed:walkSpeed),sneakFactor=swim.active?1:(input.sneak?PLAYER_SNEAK_SPEED_FACTOR:1),speed=baseSpeed*sneakFactor*swim.speedMultiplier;
  const moveAmount=Math.min(1,Math.hypot(input.forward,input.side));let inputX=0,inputZ=0;
  if(moveAmount>0){
    const horizontal=horizontalMoveFromYaw(angle,{side:input.side,forward:input.forward}),length=Math.hypot(horizontal.x,horizontal.z);
    if(length>0){const scale=speed*stepDt*moveAmount/length;inputX=horizontal.x*scale;inputZ=horizontal.z*scale;}
  }

  if(isFlying){
    const vertical=((input.jump?1:0)-(input.sneak?1:0))*PLAYER_FLIGHT_VERTICAL_SPEED*stepDt;
    return{dt:stepDt,swimActive:false,speed,displacement:{x:inputX,y:vertical,z:inputZ},velocity:{x:0,y:0,z:0},horizontalDrag:1};
  }

  let velocityY=swim.active?swim.velocityY:current.y-PLAYER_GRAVITY*stepDt;
  if(!swim.active&&input.jump&&isGrounded)velocityY=PLAYER_JUMP_SPEED;
  const horizontalDrag=Math.exp(-(swim.active?PLAYER_SWIM_HORIZONTAL_DRAG:PLAYER_GROUND_HORIZONTAL_DRAG)*stepDt);
  return{
    dt:stepDt,
    swimActive:swim.active,
    speed,
    displacement:{x:inputX+current.x*stepDt,y:velocityY*stepDt,z:inputZ+current.z*stepDt},
    velocity:{x:current.x,y:velocityY,z:current.z},
    horizontalDrag
  };
}
