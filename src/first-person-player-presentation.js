import {minecraftEntityCuboidUvRects} from './minecraft-entity-cuboid-uv.js';

export const STEVE_SKIN_SIZE=64;
export const STEVE_RIGHT_ARM_BASE_FRONT=Object.freeze(minecraftEntityCuboidUvRects(40,16,4,12,4).front);
export const STEVE_RIGHT_ARM_SLEEVE_FRONT=Object.freeze(minecraftEntityCuboidUvRects(40,32,4,12,4).front);

export function minecraftSkinCropCss(rect,{scale=17,skinSize=STEVE_SKIN_SIZE}={}){
  if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))throw new TypeError('skin crop rect must contain four finite numbers');
  if(!Number.isFinite(scale)||scale<=0)throw new RangeError('skin crop scale must be > 0');
  if(!Number.isFinite(skinSize)||skinSize<=0)throw new RangeError('skin size must be > 0');
  const [u0,v0,u1,v1]=rect;
  if(u1<=u0||v1<=v0)throw new RangeError('skin crop rect must have positive area');
  return Object.freeze({
    width:`${(u1-u0)*scale}px`,
    height:`${(v1-v0)*scale}px`,
    backgroundSize:`${skinSize*scale}px ${skinSize*scale}px`,
    backgroundPosition:`-${u0*scale}px -${v0*scale}px`
  });
}
