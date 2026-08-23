import {minecraftEntityCuboidUvRects} from './minecraft-entity-cuboid-uv.js';

export const STEVE_SKIN_SIZE=64;
export const STEVE_RIGHT_ARM_UVS=Object.freeze(minecraftEntityCuboidUvRects(40,16,4,12,4));
export const STEVE_RIGHT_ARM_SLEEVE_UVS=Object.freeze(minecraftEntityCuboidUvRects(40,32,4,12,4));
export const STEVE_RIGHT_ARM_BASE_FRONT=Object.freeze(STEVE_RIGHT_ARM_UVS.front);
export const STEVE_RIGHT_ARM_SLEEVE_FRONT=Object.freeze(STEVE_RIGHT_ARM_SLEEVE_UVS.front);
export const FIRST_PERSON_VIEWMODEL_FOV=70;
export const FIRST_PERSON_ATTACK_DURATION=.28;
export const FIRST_PERSON_USE_DURATION=.38;
export const FIRST_PERSON_RIGHT_ARM_LAYOUT=Object.freeze({
  width:.20,
  height:.60,
  depth:.20,
  sleeveWidth:.215,
  sleeveHeight:.615,
  sleeveDepth:.215,
  baseCenterY:.30,
  sleeveCenterY:.3075,
  wristY:.60,
  itemAnchorY:.03,
  rotationZ:Math.PI,
  skinRotationZ:Math.PI
});

const transform=(position,rotation,scale=1)=>Object.freeze({position:Object.freeze(position),rotation:Object.freeze(rotation),scale});
export const FIRST_PERSON_ITEM_TRANSFORMS=Object.freeze({
  block:transform([-.02,.035,-.09],[.22,-.52,.10],.92),
  tool:transform([.005,.02,-.055],[.04,-.18,-.12],1.05),
  food:transform([.01,.025,-.06],[.02,-.10,.06],1),
  flat:transform([.005,.02,-.055],[.02,-.12,0],1),
  empty:transform([0,0,0],[0,0,0],1)
});

export function firstPersonItemKind(itemId,def){
  if(!def)return'empty';
  if(def.blockId)return'block';
  if(!def.texture)return'empty';
  if(def.food)return'food';
  if(def.tool||/(?:^|_)(?:pickaxe|sword|axe|shovel|hoe)$/.test(String(itemId||'')))return'tool';
  return'flat';
}

export function minecraftSkinCropCss(rect,{scale=17,skinSize=STEVE_SKIN_SIZE}={}){
  if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))throw new TypeError('skin crop rect must contain four finite numbers');
  if(!Number.isFinite(scale)||scale<=0)throw new RangeError('skin crop scale must be > 0');
  if(!Number.isFinite(skinSize)||skinSize<=0)throw new RangeError('skin size must be > 0');
  const [u0,v0,u1,v1]=rect;if(u1<=u0||v1<=v0)throw new RangeError('skin crop rect must have positive area');
  return Object.freeze({width:`${(u1-u0)*scale}px`,height:`${(v1-v0)*scale}px`,backgroundSize:`${skinSize*scale}px ${skinSize*scale}px`,backgroundPosition:`-${u0*scale}px -${v0*scale}px`});
}

export function firstPersonActionPose({attackRemaining=0,useRemaining=0,foodUseActive=false,foodUseProgress=0}={}){
  const attack=Math.max(0,Math.min(1,1-(Number(attackRemaining)||0)/FIRST_PERSON_ATTACK_DURATION)),use=Math.max(0,Math.min(1,1-(Number(useRemaining)||0)/FIRST_PERSON_USE_DURATION)),foodProgress=Math.max(0,Math.min(1,Number(foodUseProgress)||0));
  const swing=attackRemaining>0?Math.sin(attack*Math.PI):0,pulseUse=useRemaining>0?Math.sin(use*Math.PI):0,foodRaise=foodUseActive?Math.min(1,foodProgress/.12):0,foodBob=foodUseActive?Math.sin(foodProgress*Math.PI*8)*foodRaise:0,useLift=Math.max(pulseUse,foodRaise);
  return Object.freeze({
    x:.56-.13*swing-.08*foodRaise,y:-.47-.06*swing+.07*pulseUse+.16*foodRaise+.025*foodBob,z:-1.10+.05*swing+.11*foodRaise,
    rotX:-.04,rotY:-.02,rotZ:-.04,
    shoulderRotX:-.16-.92*swing+.38*pulseUse+.48*foodRaise,
    shoulderRotY:-.06-.22*swing-.10*foodRaise,
    shoulderRotZ:.55+.34*swing-.08*useLift,
    wristRotX:.04+.32*pulseUse+.72*foodRaise+.08*foodBob,
    wristRotY:-.10*foodRaise,
    wristRotZ:-.08+.10*swing-.10*foodRaise,
    itemRotX:-.08-.20*swing+.42*pulseUse+.72*foodRaise+.10*foodBob,
    itemRotZ:-.05+.16*swing-.14*foodRaise
  });
}
