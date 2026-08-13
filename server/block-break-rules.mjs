import {BLOCK,BLOCKS,WORLD_HEIGHT} from '../src/blocks.js';
import {bedPartner,isBedBlock} from '../src/bed-rules.js';

function integer(value,label){if(!Number.isSafeInteger(value))throw new TypeError(`${label} must be a safe integer`);return value;}
function editableY(value){value=integer(value,'target.y');if(value<0||value>=WORLD_HEIGHT)throw new RangeError(`target.y must be from 0 to ${WORLD_HEIGHT-1}`);return value;}
function blockId(value,label){if(!Number.isInteger(value)||value<0||!BLOCKS[value])throw new RangeError(`${label} must reference a known block`);return value;}
function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function targetLike(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('block target must be an object');return{x:integer(value.x,'target.x'),y:editableY(value.y),z:integer(value.z,'target.z'),id:blockId(value.id,'target.id')};}
function mutationBoundary(value){if(typeof value!=='function')throw new TypeError('block break requires an explicit setBlock mutation boundary');return value;}
function mutation(value){if(!value||typeof value!=='object'||typeof value.changed!=='boolean')throw new TypeError('block mutation must return a change result');return value;}

export function applyAuthoritativeBlockBreak(world,target,{setBlock}={}){
  world=worldLike(world);target=targetLike(target);const mutate=mutationBoundary(setBlock);
  const current=blockId(world.getBlock(target.x,target.y,target.z),'world block');
  if(current!==target.id)return Object.freeze({changed:false,reason:'stale-target',changes:Object.freeze([])});
  if(current===BLOCK.AIR||BLOCKS[current].liquid)return Object.freeze({changed:false,reason:'not-breakable',changes:Object.freeze([])});
  const changes=[],first=mutation(mutate(target.x,target.y,target.z,BLOCK.AIR));if(first.changed)changes.push(first);
  if(first.changed&&isBedBlock(current)){
    const partner=bedPartner(target,current);if(partner&&world.getBlock(partner.x,partner.y,partner.z)===partner.id){const second=mutation(mutate(partner.x,partner.y,partner.z,BLOCK.AIR));if(second.changed)changes.push(second);}
  }
  return Object.freeze({changed:first.changed,reason:first.changed?'broken':'mutation-declined',changes:Object.freeze([...changes])});
}
