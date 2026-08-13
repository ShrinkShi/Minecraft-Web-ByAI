import {BLOCK,BLOCKS,WORLD_HEIGHT} from '../src/blocks.js';
import {lookDirectionFromYawPitch} from '../src/player-orientation-rules.js';
import {PLAYER_EYE_HEIGHT} from '../src/player-environment-rules.js';

export const DEFAULT_BLOCK_REACH=6;
const EPSILON=1e-10;

function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function positive(value,label){value=finite(value,label);if(value<=0||value>16)throw new RangeError(`${label} must be greater than 0 and at most 16`);return value;}
function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function playerLike(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('player state must be an object');const position=value.position;if(!position||typeof position!=='object'||Array.isArray(position))throw new TypeError('player position must be an object');return{position:{x:finite(position.x,'player.position.x'),y:finite(position.y,'player.position.y'),z:finite(position.z,'player.position.z')},yaw:finite(value.yaw,'player.yaw'),pitch:finite(value.pitch,'player.pitch')};}
function targetable(id){if(id===BLOCK.AIR)return false;const block=BLOCKS[id];if(!block)throw new RangeError(`world returned unknown block id: ${id}`);return !block.liquid;}
function axis(origin,cell,direction){if(Math.abs(direction)<EPSILON)return{step:0,next:Infinity,delta:Infinity};const step=direction>0?1:-1,boundary=step>0?cell+1:cell;return{step,next:(boundary-origin)/direction,delta:Math.abs(1/direction)};}

export function raycastAuthoritativeBlock(world,player,{maxDistance=DEFAULT_BLOCK_REACH,eyeHeight=PLAYER_EYE_HEIGHT}={}){
  world=worldLike(world);player=playerLike(player);maxDistance=positive(maxDistance,'maxDistance');eyeHeight=positive(eyeHeight,'eyeHeight');
  const origin={x:player.position.x,y:player.position.y+eyeHeight,z:player.position.z},direction=lookDirectionFromYawPitch(player.yaw,player.pitch);
  let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z),distance=0,previous=null;
  const ax=axis(origin.x,x,direction.x),ay=axis(origin.y,y,direction.y),az=axis(origin.z,z,direction.z);
  while(distance<=maxDistance+EPSILON){
    if(y<0||y>=WORLD_HEIGHT)return null;
    const id=world.getBlock(x,y,z);if(targetable(id))return Object.freeze({x,y,z,id,previous:previous?Object.freeze({...previous}):null,distance});
    const next=Math.min(ax.next,ay.next,az.next);if(!Number.isFinite(next)||next>maxDistance+EPSILON)return null;
    const crossX=ax.next<=next+EPSILON,crossY=ay.next<=next+EPSILON,crossZ=az.next<=next+EPSILON;
    distance=Math.max(0,next);
    if(crossX){x+=ax.step;ax.next+=ax.delta;}
    if(crossY){y+=ay.step;ay.next+=ay.delta;}
    if(crossZ){z+=az.step;az.next+=az.delta;}
    if(crossX)previous={x:x-ax.step,y,z};else if(crossY)previous={x,y:y-ay.step,z};else previous={x,y,z:z-az.step};
  }
  return null;
}
