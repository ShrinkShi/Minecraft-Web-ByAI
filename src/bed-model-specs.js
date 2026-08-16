import {bedBlockMeta} from './bed-rules.js';
import {minecraftEntityCuboidUvRects} from './minecraft-entity-cuboid-uv.js';

export const BED_TEXTURE_SIZE=Object.freeze([64,64]);
export const BED_MODEL_HEIGHT=9/16;

const freezeFaceUv=faceUv=>Object.freeze(Object.fromEntries(Object.entries(faceUv||{}).map(([face,rect])=>[face,Object.freeze([...rect])])));
const cuboid=(name,size,offset,uv,{faceUv={}}={})=>Object.freeze({name,size:Object.freeze(size),offset:Object.freeze(offset),uv:Object.freeze(uv),faceUv:freezeFaceUv(faceUv)});

// Canonical orientation points from foot -> head along local +Z. Each block
// renders one half so chunk rebuild/unload remains authoritative even when a bed
// crosses a chunk boundary. The supplied 64x64 bed entity sheet is not a block
// atlas: the visually exposed mattress tops use dedicated sheet rectangles.
export const BED_HALF_SPECS=Object.freeze({
  foot:Object.freeze({
    part:'foot',
    cuboids:Object.freeze([
      cuboid('foot-mattress',[16,6,16],[0,3,0],[0,22],{faceUv:{top:[2,28,18,44]}}),
      cuboid('foot-left-leg',[3,3,3],[0,0,0],[50,0]),
      cuboid('foot-right-leg',[3,3,3],[13,0,0],[50,6])
    ])
  }),
  head:Object.freeze({
    part:'head',
    cuboids:Object.freeze([
      cuboid('head-mattress',[16,6,16],[0,3,0],[0,0],{faceUv:{top:[10,6,26,22]}}),
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
