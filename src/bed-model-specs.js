import {bedBlockMeta} from './bed-rules.js';
import {minecraftEntityCuboidUvRects} from './minecraft-entity-cuboid-uv.js';

export const BED_TEXTURE_SIZE=Object.freeze([64,64]);
export const BED_MODEL_HEIGHT=9/16;

const vector=value=>Object.freeze([...(value||[0,0,0])]);
const cuboid=(name,size,offset,uv,{position=[0,0,0],rotation=[0,0,0]}={})=>Object.freeze({name,size:Object.freeze(size),offset:Object.freeze(offset),uv:Object.freeze(uv),position:vector(position),rotation:vector(rotation)});

// Java's bed entity sheet is authored around a 16x16x6 mattress cuboid which
// is rotated +90 degrees around X into a horizontal 16x6x16 mattress. Keeping
// that source-space box is important: its 64x64 sheet assigns the pillow/red
// top, wooden underside and four side strips to the pre-rotation cube faces.
// Replacing it with a 16x6x16 box changes the UV layout and cannot be repaired
// by overriding only the top face.
const mattress=(name,uv)=>cuboid(name,[16,16,6],[0,0,0],uv,{position:[0,9,0],rotation:[Math.PI/2,0,0]});

// Canonical orientation points from foot -> head along local +Z. Each block
// renders one half so chunk rebuild/unload remains authoritative even when a bed
// crosses a chunk boundary.
export const BED_HALF_SPECS=Object.freeze({
  foot:Object.freeze({
    part:'foot',
    cuboids:Object.freeze([
      mattress('foot-mattress',[0,22]),
      cuboid('foot-left-leg',[3,3,3],[0,0,0],[50,0]),
      cuboid('foot-right-leg',[3,3,3],[13,0,0],[50,6])
    ])
  }),
  head:Object.freeze({
    part:'head',
    cuboids:Object.freeze([
      mattress('head-mattress',[0,0]),
      cuboid('head-left-leg',[3,3,3],[0,0,13],[50,12]),
      cuboid('head-right-leg',[3,3,3],[13,0,13],[50,18])
    ])
  })
});

export const BED_FACING_ROTATION=Object.freeze({south:0,north:Math.PI,east:Math.PI/2,west:-Math.PI/2});

export const minecraftCuboidUvRects=minecraftEntityCuboidUvRects;

export function bedHalfSpec(part){return BED_HALF_SPECS[part]||null;}

export function bedVisualDescriptor(x,y,z,id){
  const meta=bedBlockMeta(id);if(!meta)return null;
  if(![x,y,z].every(Number.isFinite))return null;
  return Object.freeze({kind:'bed',x:Math.floor(x),y:Math.floor(y),z:Math.floor(z),id:Number(id),part:meta.part,facing:meta.facing,rotationY:BED_FACING_ROTATION[meta.facing]});
}
