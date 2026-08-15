import {bedBlockMeta} from './bed-rules.js';

export const BED_TEXTURE_SIZE=Object.freeze([64,64]);
export const BED_MODEL_HEIGHT=9/16;

const cuboid=(name,size,offset,uv)=>Object.freeze({name,size:Object.freeze(size),offset:Object.freeze(offset),uv:Object.freeze(uv)});

// Canonical orientation points from foot -> head along local +Z. Each block
// renders one half so chunk rebuild/unload remains authoritative even when a bed
// crosses a chunk boundary. The sheet offsets follow the classic 64x64 bed
// entity layout carried by the user-supplied 1.20.1 resources.
export const BED_HALF_SPECS=Object.freeze({
  foot:Object.freeze({
    part:'foot',
    cuboids:Object.freeze([
      cuboid('foot-mattress',[16,6,16],[0,3,0],[0,22]),
      cuboid('foot-left-leg',[3,3,3],[0,0,0],[50,0]),
      cuboid('foot-right-leg',[3,3,3],[13,0,0],[50,6])
    ])
  }),
  head:Object.freeze({
    part:'head',
    cuboids:Object.freeze([
      cuboid('head-mattress',[16,6,16],[0,3,0],[0,0]),
      cuboid('head-left-leg',[3,3,3],[0,0,13],[50,12]),
      cuboid('head-right-leg',[3,3,3],[13,0,13],[50,18])
    ])
  })
});

export const BED_FACING_ROTATION=Object.freeze({south:0,north:Math.PI,east:Math.PI/2,west:-Math.PI/2});

export function minecraftCuboidUvRects(u,v,width,height,depth){
  const x0=u,x1=u+depth,x2=x1+width,x3=x2+width,x4=x3+depth;
  const y0=v,y1=v+depth,y2=y1+height;
  return Object.freeze({
    left:Object.freeze([x0,y1,x1,y2]),
    front:Object.freeze([x1,y1,x2,y2]),
    right:Object.freeze([x2,y1,x3,y2]),
    back:Object.freeze([x3,y1,x4,y2]),
    top:Object.freeze([x1,y0,x2,y1]),
    bottom:Object.freeze([x2,y0,x3,y1])
  });
}

export function bedHalfSpec(part){return BED_HALF_SPECS[part]||null;}

export function bedVisualDescriptor(x,y,z,id){
  const meta=bedBlockMeta(id);if(!meta)return null;
  if(![x,y,z].every(Number.isFinite))return null;
  return Object.freeze({kind:'bed',x:Math.floor(x),y:Math.floor(y),z:Math.floor(z),id:Number(id),part:meta.part,facing:meta.facing,rotationY:BED_FACING_ROTATION[meta.facing]});
}
