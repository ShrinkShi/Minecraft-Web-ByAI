import {lookDirectionFromYawPitch} from '../src/player-orientation-rules.js';
import {PLAYER_COLLISION_HEIGHT,PLAYER_COLLISION_RADIUS,PLAYER_EYE_HEIGHT} from '../src/player-environment-rules.js';
import {raycastAuthoritativeBlock} from './block-targeting.mjs';

export const DEFAULT_MELEE_REACH=3;
const EPSILON=1e-9;
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function positive(value,label){value=finite(value,label);if(value<=0||value>16)throw new RangeError(`${label} must be greater than 0 and at most 16`);return value;}
function position(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};}
function rayAabb(origin,direction,min,max,maxDistance){let near=0,far=maxDistance;for(const axis of ['x','y','z']){const d=direction[axis],o=origin[axis];if(Math.abs(d)<EPSILON){if(o<min[axis]||o>max[axis])return null;continue;}let a=(min[axis]-o)/d,b=(max[axis]-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near-far>EPSILON)return null;}if(far<0||near>maxDistance)return null;return Math.max(0,near);}

export function resolveAuthoritativeMeleeTarget(world,{attacker,candidates,view,maxDistance=DEFAULT_MELEE_REACH}={}){
  if(!world||typeof world.getBlock!=='function')throw new TypeError('melee targeting world must expose getBlock');if(!attacker||typeof attacker!=='object')throw new TypeError('melee attacker is required');if(!Array.isArray(candidates))throw new TypeError('melee candidates must be an array');if(!view||typeof view!=='object')throw new TypeError('melee referenced view is required');maxDistance=positive(maxDistance,'melee maxDistance');const source=position(attacker.position,'attacker.position'),origin={x:source.x,y:source.y+PLAYER_EYE_HEIGHT,z:source.z},direction=lookDirectionFromYawPitch(finite(view.yaw,'view.yaw'),finite(view.pitch,'view.pitch')),block=raycastAuthoritativeBlock(world,{position:source,yaw:view.yaw,pitch:view.pitch},{maxDistance}),blockDistance=block?.distance??Infinity;let best=null;
  for(const candidate of candidates){if(!candidate||typeof candidate!=='object'||candidate.session===attacker.session||candidate.dead||candidate.mode==='spectator')continue;const p=position(candidate.position,'candidate.position'),distance=rayAabb(origin,direction,{x:p.x-PLAYER_COLLISION_RADIUS,y:p.y,z:p.z-PLAYER_COLLISION_RADIUS},{x:p.x+PLAYER_COLLISION_RADIUS,y:p.y+PLAYER_COLLISION_HEIGHT,z:p.z+PLAYER_COLLISION_RADIUS},maxDistance);if(distance===null||distance+EPSILON>=blockDistance)continue;if(!best||distance<best.distance)best={session:candidate.session,distance,position:p,mode:candidate.mode};
  }
  return best?Object.freeze({...best,position:Object.freeze({...best.position})}):null;
}
