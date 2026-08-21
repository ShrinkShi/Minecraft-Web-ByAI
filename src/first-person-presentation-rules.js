import {minecraftEntityCuboidUvRects} from './minecraft-entity-cuboid-uv.js';

export const STEVE_SKIN_SIZE=64;
export const STEVE_RIGHT_ARM_UVS=Object.freeze(minecraftEntityCuboidUvRects(40,16,4,12,4));
export const STEVE_RIGHT_ARM_SLEEVE_UVS=Object.freeze(minecraftEntityCuboidUvRects(40,32,4,12,4));
export const STEVE_RIGHT_ARM_BASE_FRONT=Object.freeze(STEVE_RIGHT_ARM_UVS.front);
export const STEVE_RIGHT_ARM_SLEEVE_FRONT=Object.freeze(STEVE_RIGHT_ARM_SLEEVE_UVS.front);
export const FIRST_PERSON_ATTACK_DURATION=.28;
export const FIRST_PERSON_USE_DURATION=.38;
export const FIRST_PERSON_RIGHT_ARM_LAYOUT=Object.freeze({
  baseCenterY:.39,
  sleeveCenterY:.403,
  itemAnchorY:.77,
  rotationZ:Math.PI
});

export function minecraftSkinCropCss(rect,{scale=17,skinSize=STEVE_SKIN_SIZE}={}){
  if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))throw new TypeError('skin crop rect must contain four finite numbers');
  if(!Number.isFinite(scale)||scale<=0)throw new RangeError('skin crop scale must be > 0');
  if(!Number.isFinite(skinSize)||skinSize<=0)throw new RangeError('skin size must be > 0');
  const [u0,v0,u1,v1]=rect;if(u1<=u0||v1<=v0)throw new RangeError('skin crop rect must have positive area');
  return Object.freeze({width:`${(u1-u0)*scale}px`,height:`${(v1-v0)*scale}px`,backgroundSize:`${skinSize*scale}px ${skinSize*scale}px`,backgroundPosition:`-${u0*scale}px -${v0*scale}px`});
}

export function firstPersonActionPose({attackRemaining=0,useRemaining=0}={}){
  const attack=Math.max(0,Math.min(1,1-(Number(attackRemaining)||0)/FIRST_PERSON_ATTACK_DURATION)),use=Math.max(0,Math.min(1,1-(Number(useRemaining)||0)/FIRST_PERSON_USE_DURATION));
  const swing=attackRemaining>0?Math.sin(attack*Math.PI):0,useLift=useRemaining>0?Math.sin(use*Math.PI):0;
  return Object.freeze({x:.58-.24*swing,y:-.38-.12*swing+.14*useLift,z:-1.12+.13*swing,rotX:-.18-1.05*swing+.52*useLift,rotY:-.08-.34*swing,rotZ:-.42+.62*swing-.16*useLift,itemRotX:-.25-.9*swing+.65*useLift,itemRotZ:-.58+.85*swing});
}
