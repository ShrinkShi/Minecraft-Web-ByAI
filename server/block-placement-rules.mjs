import {BLOCK,BLOCKS,WORLD_HEIGHT} from '../src/blocks.js';
import {PLAYER_COLLISION_HEIGHT,PLAYER_COLLISION_RADIUS} from '../src/player-environment-rules.js';

function integer(value,label){if(!Number.isSafeInteger(value))throw new TypeError(`${label} must be a safe integer`);return value;}
function editableY(value,label='placement.y'){value=integer(value,label);if(value<0||value>=WORLD_HEIGHT)throw new RangeError(`${label} must be from 0 to ${WORLD_HEIGHT-1}`);return value;}
function blockId(value,label){if(!Number.isInteger(value)||value<0||!BLOCKS[value])throw new RangeError(`${label} must reference a known block`);return value;}
function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('block placement requires an explicit setBlock mutation boundary');return value;}
function mutation(value){if(!value||typeof value!=='object'||typeof value.changed!=='boolean')throw new TypeError('block mutation must return a change result');return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function playerLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||!value.position||typeof value.position!=='object')throw new TypeError('player state must expose position');return{x:finite(value.position.x,'player.position.x'),y:finite(value.position.y,'player.position.y'),z:finite(value.position.z,'player.position.z')};}
function targetLike(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('block target must be an object');
  const previous=value.previous;if(!previous||typeof previous!=='object'||Array.isArray(previous))return{x:integer(value.x,'target.x'),y:editableY(value.y,'target.y'),z:integer(value.z,'target.z'),id:blockId(value.id,'target.id'),previous:null};
  return{x:integer(value.x,'target.x'),y:editableY(value.y,'target.y'),z:integer(value.z,'target.z'),id:blockId(value.id,'target.id'),previous:{x:integer(previous.x,'target.previous.x'),y:editableY(previous.y,'target.previous.y'),z:integer(previous.z,'target.previous.z')}};
}
function adjacent(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z)===1;}
function occupies(player,cell){
  const minX=player.x-PLAYER_COLLISION_RADIUS,maxX=player.x+PLAYER_COLLISION_RADIUS,minY=player.y,maxY=player.y+PLAYER_COLLISION_HEIGHT,minZ=player.z-PLAYER_COLLISION_RADIUS,maxZ=player.z+PLAYER_COLLISION_RADIUS;
  return cell.x+1>minX&&cell.x<maxX&&cell.y+1>minY&&cell.y<maxY&&cell.z+1>minZ&&cell.z<maxZ;
}

export function applyAuthoritativeBlockPlacement(world,target,{blockId:id,player,setBlock}={}){
  world=worldLike(world);target=targetLike(target);const placementId=blockId(id,'placement block id'),position=playerLike(player),mutate=mutationBoundary(setBlock);
  if(placementId===BLOCK.AIR||BLOCKS[placementId].liquid)return Object.freeze({changed:false,reason:'not-placeable',change:null});
  if(!target.previous)return Object.freeze({changed:false,reason:'no-placement-cell',change:null});
  if(!adjacent(target,target.previous))return Object.freeze({changed:false,reason:'invalid-placement-face',change:null});
  const currentTarget=blockId(world.getBlock(target.x,target.y,target.z),'world target block');
  if(currentTarget!==target.id)return Object.freeze({changed:false,reason:'stale-target',change:null});
  if(currentTarget===BLOCK.AIR||BLOCKS[currentTarget].liquid)return Object.freeze({changed:false,reason:'invalid-anchor',change:null});
  const cell=target.previous,currentCell=blockId(world.getBlock(cell.x,cell.y,cell.z),'world placement block');
  if(currentCell!==BLOCK.AIR)return Object.freeze({changed:false,reason:'placement-cell-occupied',change:null});
  if(occupies(position,cell))return Object.freeze({changed:false,reason:'player-collision',change:null});
  const change=mutation(mutate(cell.x,cell.y,cell.z,placementId));
  return Object.freeze({changed:change.changed,reason:change.changed?'placed':'mutation-declined',change:change.changed?change:null});
}
