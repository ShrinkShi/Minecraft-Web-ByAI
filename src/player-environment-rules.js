import {waterCoverageFromSamples} from './swim-rules.js';

export const PLAYER_COLLISION_RADIUS=.3;
export const PLAYER_COLLISION_HEIGHT=1.8;
export const PLAYER_EYE_HEIGHT=1.62;
export const PLAYER_COLLISION_EPSILON=.001;
export const PLAYER_GROUND_PROBE_DISTANCE=.06;
export const PLAYER_WATER_SAMPLE_OFFSETS=Object.freeze([.2,.9,PLAYER_EYE_HEIGHT]);
export const PLAYER_MOVE_AXES=Object.freeze(['x','y','z']);
const AXIS_SET=new Set(PLAYER_MOVE_AXES);

function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function positive(value,label){value=finite(value,label);if(value<=0)throw new RangeError(`${label} must be > 0`);return value;}
function nonNegative(value,label){value=finite(value,label);if(value<0)throw new RangeError(`${label} must be >= 0`);return value;}
function bool(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function vector3(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};
}

export function playerBlockBounds(position,{radius=PLAYER_COLLISION_RADIUS,height=PLAYER_COLLISION_HEIGHT,epsilon=PLAYER_COLLISION_EPSILON}={}){
  const p=vector3(position,'position'),r=positive(radius,'radius'),h=positive(height,'height'),eps=nonNegative(epsilon,'epsilon');
  if(eps>=r||eps>=h)throw new RangeError('epsilon must be smaller than player radius and height');
  return{
    minX:Math.floor(p.x-r+eps),maxX:Math.floor(p.x+r-eps),
    minY:Math.floor(p.y+eps),maxY:Math.floor(p.y+h-eps),
    minZ:Math.floor(p.z-r+eps),maxZ:Math.floor(p.z+r-eps)
  };
}

export function playerCollidesBlocks(position,isSolidBlock,options={}){
  const solid=callback(isSolidBlock,'isSolidBlock'),bounds=playerBlockBounds(position,options);
  for(let x=bounds.minX;x<=bounds.maxX;x++)for(let y=bounds.minY;y<=bounds.maxY;y++)for(let z=bounds.minZ;z<=bounds.maxZ;z++)if(solid(x,y,z))return true;
  return false;
}

export function resolvePlayerAxisMove({position,velocity,grounded=false,axis,amount,collides}={}){
  const p=vector3(position,'position'),v=vector3(velocity,'velocity'),isGrounded=bool(grounded,'grounded'),moveAxis=AXIS_SET.has(axis)?axis:null,delta=finite(amount,'amount'),collision=callback(collides,'collides');
  if(!moveAxis)throw new RangeError('axis must be x, y or z');
  if(delta===0)return{position:p,velocity:v,grounded:isGrounded,moved:false,blocked:false};
  const next={...p,[moveAxis]:p[moveAxis]+delta};
  if(!collision(next))return{position:next,velocity:v,grounded:isGrounded,moved:true,blocked:false};
  v[moveAxis]=0;
  return{position:p,velocity:v,grounded:isGrounded||(moveAxis==='y'&&delta<0),moved:false,blocked:true};
}

export function probePlayerGrounded(position,collides,distance=PLAYER_GROUND_PROBE_DISTANCE){
  const p=vector3(position,'position'),collision=callback(collides,'collides'),probe=positive(distance,'distance');
  return !!collision({...p,y:p.y-probe});
}

export function samplePlayerWaterCoverage(position,isLiquidBlock,{eyeHeight=PLAYER_EYE_HEIGHT}={}){
  const p=vector3(position,'position'),liquid=callback(isLiquidBlock,'isLiquidBlock'),eye=positive(eyeHeight,'eyeHeight'),x=Math.floor(p.x),z=Math.floor(p.z);
  return waterCoverageFromSamples([p.y+.2,p.y+.9,p.y+eye].map(y=>!!liquid(x,Math.floor(y),z)));
}
