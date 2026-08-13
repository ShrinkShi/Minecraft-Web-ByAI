import {BLOCKS,CHUNK_SIZE,WORLD_HEIGHT} from './blocks.js';

const floorDiv=(value,divisor)=>Math.floor(value/divisor);
const mod=(value,divisor)=>((value%divisor)+divisor)%divisor;

function knownBlock(value,label){
  if(!Number.isInteger(value)||value<0||!BLOCKS[value])throw new RangeError(`${label} must reference a known block`);
  return value;
}

export function applyVoxelOverlay(world,{x,y,z,previous,id}={}){
  if(!world||!(world.chunks instanceof Map)||!(world.edits instanceof Map))throw new TypeError('world must expose chunk and edit maps');
  if(typeof world.index!=='function'||typeof world.requestMesh!=='function')throw new TypeError('world must expose index and mesh refresh functions');
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z))throw new TypeError('x and z must be safe integers');
  if(!Number.isInteger(y)||y<0||y>=WORLD_HEIGHT)throw new RangeError(`y must be from 0 to ${WORLD_HEIGHT-1}`);
  previous=knownBlock(previous,'previous block');id=knownBlock(id,'block');

  const cx=floorDiv(x,CHUNK_SIZE),cz=floorDiv(z,CHUNK_SIZE);
  const lx=mod(x,CHUNK_SIZE),lz=mod(z,CHUNK_SIZE),chunkKey=`${cx},${cz}`;
  const index=world.index(lx,y,lz),chunk=world.chunks.get(chunkKey),existing=world.edits.get(chunkKey);
  const knownPrevious=chunk?chunk[index]:existing?.has(index)?existing.get(index):null;
  if(knownPrevious!==null&&knownPrevious!==previous)throw new RangeError(`voxel overlay previous mismatch at ${x},${y},${z}`);

  const edits=existing||new Map();if(!existing)world.edits.set(chunkKey,edits);
  const overlayChanged=!edits.has(index)||edits.get(index)!==id;edits.set(index,id);
  let chunkChanged=false;
  if(chunk&&chunk[index]!==id){
    chunk[index]=id;chunkChanged=true;world.requestMesh(cx,cz);
    if(lx===0)world.requestMesh(cx-1,cz);if(lx===CHUNK_SIZE-1)world.requestMesh(cx+1,cz);
    if(lz===0)world.requestMesh(cx,cz-1);if(lz===CHUNK_SIZE-1)world.requestMesh(cx,cz+1);
  }
  return Object.freeze({applied:overlayChanged||chunkChanged,chunkLoaded:!!chunk,chunkKey,index});
}
