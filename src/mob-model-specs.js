import {minecraftEntityCuboidUvRects} from './minecraft-entity-cuboid-uv.js';

const box=(name,size,offset,uv,{material='base',inflate=0}={})=>Object.freeze({name,size:Object.freeze(size),offset:Object.freeze(offset),uv:Object.freeze(uv),material,inflate});
const part=(name,pivot,boxes,{rotation=[0,0,0],walk=null}={})=>Object.freeze({name,pivot:Object.freeze(pivot),rotation:Object.freeze(rotation),walk,boxes:Object.freeze(boxes)});
const model=(textureSize,heightPixels,materials,parts)=>Object.freeze({textureSize:Object.freeze(textureSize),heightPixels,materials:Object.freeze(materials),parts:Object.freeze(parts)});

// Geometry below is a compatibility description for the classic Java entity
// sheets shipped in the user-supplied 1.20.1 resources. It is intentionally
// kept as pure data so UV bounds and articulated part contracts are testable
// without importing Three.js in Node.
export const MOB_MODEL_SPECS=Object.freeze({
  zombie:model([64,64],32,{base:'entity.zombie'},[
    part('head',[0,24,0],[box('head',[8,8,8],[-4,0,-4],[0,0])]),
    part('body',[0,24,0],[box('body',[8,12,4],[-4,-12,-2],[16,16])]),
    part('leftArm',[5,22,0],[box('leftArm',[4,12,4],[-2,-10,-2],[40,16])],{walk:'arm-left'}),
    part('rightArm',[-5,22,0],[box('rightArm',[4,12,4],[-2,-10,-2],[40,16])],{walk:'arm-right'}),
    part('leftLeg',[2,12,0],[box('leftLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-left'}),
    part('rightLeg',[-2,12,0],[box('rightLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-right'})
  ]),
  skeleton:model([64,32],32,{base:'entity.skeleton'},[
    part('head',[0,24,0],[box('head',[8,8,8],[-4,0,-4],[0,0])]),
    part('body',[0,24,0],[box('body',[8,12,4],[-4,-12,-2],[16,16])]),
    part('leftArm',[5,22,0],[box('leftArm',[2,12,2],[-1,-10,-1],[40,16])],{walk:'arm-left'}),
    part('rightArm',[-5,22,0],[box('rightArm',[2,12,2],[-1,-10,-1],[40,16])],{walk:'arm-right'}),
    part('leftLeg',[2,12,0],[box('leftLeg',[2,12,2],[-1,-12,-1],[0,16])],{walk:'leg-left'}),
    part('rightLeg',[-2,12,0],[box('rightLeg',[2,12,2],[-1,-12,-1],[0,16])],{walk:'leg-right'})
  ]),
  creeper:model([64,32],26,{base:'entity.creeper'},[
    part('head',[0,18,0],[box('head',[8,8,8],[-4,0,-4],[0,0])]),
    part('body',[0,18,0],[box('body',[8,12,4],[-4,-12,-2],[16,16])]),
    part('frontLeftLeg',[2,6,-2],[box('frontLeftLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-left'}),
    part('frontRightLeg',[-2,6,-2],[box('frontRightLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-right'}),
    part('backLeftLeg',[2,6,2],[box('backLeftLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-right'}),
    part('backRightLeg',[-2,6,2],[box('backRightLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-left'})
  ]),
  pig:model([64,32],22,{base:'entity.pig'},[
    // Vanilla PigModel is authored in Mojang's Y-down model space. Convert
    // the pivot/local-Y and X rotation once, matching the already-correct cow
    // conversion below. The previous positive rotation stretched the torso
    // above detached legs and produced the malformed manual-play silhouette.
    part('body',[0,13,2],[box('body',[10,16,8],[-5,-6,-7],[28,8])],{rotation:[-Math.PI/2,0,0]}),
    part('head',[0,12,-6],[box('head',[8,8,8],[-4,-4,-8],[0,0]),box('snout',[4,3,1],[-2,-3,-9],[16,16])]),
    part('frontLeftLeg',[3,6,-5],[box('frontLeftLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-left'}),
    part('frontRightLeg',[-3,6,-5],[box('frontRightLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-right'}),
    part('backLeftLeg',[3,6,4],[box('backLeftLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-right'}),
    part('backRightLeg',[-3,6,4],[box('backRightLeg',[4,6,4],[-2,-6,-2],[0,16])],{walk:'leg-left'})
  ]),
  cow:model([64,32],28,{base:'entity.cow'},[
    // Minecraft's cow body is authored in Y-down model space at pivot y=5
    // and rotated +90deg around X. Three.js is Y-up, so the converted body
    // uses pivot y=19, negated local Y and a -90deg X rotation. Keeping the
    // original positive rotation is what put the pink belly texture on top.
    part('body',[0,19,2],[
      box('body',[12,18,10],[-6,-8,-7],[18,4]),
      // Vanilla/source model cuboid: texOffs(52,0), (-2,2,-8), 4x6x1.
      // Negating its local Y places the udder below the torso after rotation.
      box('udder',[4,6,1],[-2,-8,-8],[52,0])
    ],{rotation:[-Math.PI/2,0,0]}),
    part('head',[0,20,-8],[box('head',[8,8,6],[-4,-4,-6],[0,0]),box('muzzle',[8,3,1],[-4,-3,-7],[0,16]),box('leftHorn',[1,3,1],[4,2,-4],[22,0]),box('rightHorn',[1,3,1],[-5,2,-4],[22,0])]),
    part('frontLeftLeg',[4,12,-5],[box('frontLeftLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-left'}),
    part('frontRightLeg',[-4,12,-5],[box('frontRightLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-right'}),
    part('backLeftLeg',[4,12,6],[box('backLeftLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-right'}),
    part('backRightLeg',[-4,12,6],[box('backRightLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-left'})
  ]),
  sheep:model([64,32],25,{base:'entity.sheep',fur:'entity.sheep_fur'},[
    part('body',[0,14,1],[box('body',[8,16,6],[-4,-8,-8],[28,8]),box('fleece',[8,16,6],[-4,-8,-8],[28,8],{material:'fur',inflate:1.75})],{rotation:[Math.PI/2,0,0]}),
    part('head',[0,18,-6],[box('head',[6,6,8],[-3,-3,-8],[0,0]),box('headFleece',[6,6,6],[-3,-3,-7],[0,0],{material:'fur',inflate:.6})]),
    part('frontLeftLeg',[3,12,-4],[box('frontLeftLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-left'}),
    part('frontRightLeg',[-3,12,-4],[box('frontRightLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-right'}),
    part('backLeftLeg',[3,12,5],[box('backLeftLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-right'}),
    part('backRightLeg',[-3,12,5],[box('backRightLeg',[4,12,4],[-2,-12,-2],[0,16])],{walk:'leg-left'})
  ]),
  chicken:model([64,32],14,{base:'entity.chicken'},[
    part('body',[0,9,1],[box('body',[6,8,6],[-3,-4,-3],[0,9])],{rotation:[Math.PI/2,0,0]}),
    part('head',[0,11,-3],[box('head',[4,6,3],[-2,-2,-3],[0,0]),box('beak',[4,2,2],[-2,-1,-5],[14,0]),box('wattle',[2,2,1],[-1,-3,-4],[14,4])]),
    part('leftWing',[4,9,1],[box('leftWing',[1,4,6],[0,-2,-3],[24,13])],{walk:'wing-left'}),
    part('rightWing',[-4,9,1],[box('rightWing',[1,4,6],[-1,-2,-3],[24,13])],{walk:'wing-right'}),
    part('leftLeg',[2,5,1],[box('leftLeg',[3,5,3],[-1.5,-5,-1.5],[26,0])],{walk:'leg-left'}),
    part('rightLeg',[-2,5,1],[box('rightLeg',[3,5,3],[-1.5,-5,-1.5],[26,0])],{walk:'leg-right'})
  ]),
  spider:model([64,32],16,{base:'entity.spider'},[
    part('head',[0,7,-7],[box('head',[8,8,8],[-4,-4,-4],[32,4])]),
    part('thorax',[0,7,0],[box('thorax',[6,6,6],[-3,-3,-3],[0,0])]),
    part('abdomen',[0,7,7],[box('abdomen',[10,8,12],[-5,-4,-6],[0,12])]),
    ...Array.from({length:8},(_,index)=>{
      const left=index<4,slot=index%4,z=[-4,-1,2,5][slot],name=`${left?'left':'right'}Leg${slot+1}`;
      return part(name,[left?3:-3,7,z],[box(name,[16,2,2],[left?0:-16,-1,-1],[18,0])],{rotation:[0,left?[-.55,-.25,.25,.55][slot]:[.55,.25,-.25,-.55][slot],left?[-.45,-.65,-.65,-.45][slot]:[.45,.65,.65,.45][slot]],walk:left?'spider-left':'spider-right'});
    })
  ])
});

export const MOB_MODEL_TYPES=Object.freeze(Object.keys(MOB_MODEL_SPECS));
export const minecraftCubeUvRects=minecraftEntityCuboidUvRects;
export function mobModelSpec(type){return MOB_MODEL_SPECS[type]||null;}
