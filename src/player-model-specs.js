import {minecraftEntityCuboidUvRects} from './minecraft-entity-cuboid-uv.js';

export const PLAYER_SKIN_TEXTURE_SIZE=Object.freeze([64,64]);
export const PLAYER_MODEL_PIXELS=32;
export const PLAYER_MODEL_SCALE=.9;

const box=(name,size,offset,uv,{inflate=0,layer='base'}={})=>Object.freeze({name,size:Object.freeze(size),offset:Object.freeze(offset),uv:Object.freeze(uv),inflate,layer});
const part=(name,pivot,boxes)=>Object.freeze({name,pivot:Object.freeze(pivot),boxes:Object.freeze(boxes)});

// Modern 64x64 wide Steve layout. Left limbs use their own 1.8+ texture regions
// rather than mirroring the right side; second-layer hat/jacket/sleeves/pants
// are kept as slightly inflated cuboids like the Java player renderer.
export const PLAYER_MODEL_SPEC=Object.freeze({
  textureSize:PLAYER_SKIN_TEXTURE_SIZE,
  heightPixels:PLAYER_MODEL_PIXELS,
  parts:Object.freeze([
    part('head',[0,24,0],[
      box('head',[8,8,8],[-4,0,-4],[0,0]),
      box('hat',[8,8,8],[-4,0,-4],[32,0],{inflate:.5,layer:'overlay'})
    ]),
    part('body',[0,24,0],[
      box('body',[8,12,4],[-4,-12,-2],[16,16]),
      box('jacket',[8,12,4],[-4,-12,-2],[16,32],{inflate:.25,layer:'overlay'})
    ]),
    part('rightArm',[-6,22,0],[
      box('rightArm',[4,12,4],[-2,-10,-2],[40,16]),
      box('rightSleeve',[4,12,4],[-2,-10,-2],[40,32],{inflate:.25,layer:'overlay'})
    ]),
    part('leftArm',[6,22,0],[
      box('leftArm',[4,12,4],[-2,-10,-2],[32,48]),
      box('leftSleeve',[4,12,4],[-2,-10,-2],[48,48],{inflate:.25,layer:'overlay'})
    ]),
    part('rightLeg',[-2,12,0],[
      box('rightLeg',[4,12,4],[-2,-12,-2],[0,16]),
      box('rightPants',[4,12,4],[-2,-12,-2],[0,32],{inflate:.25,layer:'overlay'})
    ]),
    part('leftLeg',[2,12,0],[
      box('leftLeg',[4,12,4],[-2,-12,-2],[16,48]),
      box('leftPants',[4,12,4],[-2,-12,-2],[0,48],{inflate:.25,layer:'overlay'})
    ])
  ])
});

export function playerModelPart(name){return PLAYER_MODEL_SPEC.parts.find(part=>part.name===name)||null;}
export function playerModelUvRects(boxSpec){if(!boxSpec)return null;return minecraftEntityCuboidUvRects(boxSpec.uv[0],boxSpec.uv[1],...boxSpec.size);}

export function normalizePlayerVisualInput(value={}){
  const finite=(number,fallback=0)=>Number.isFinite(number)?number:fallback;
  return Object.freeze({
    speed:Math.max(0,finite(value.speed)),
    sprint:!!value.sprint,
    primary:!!value.primary,
    dead:!!value.dead,
    headYaw:Math.max(-1.25,Math.min(1.25,finite(value.headYaw))),
    headPitch:Math.max(-1.1,Math.min(1.1,finite(value.headPitch)))
  });
}
