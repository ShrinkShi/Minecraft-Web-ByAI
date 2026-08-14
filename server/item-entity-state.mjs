import {randomUUID} from 'node:crypto';
import {BLOCKS} from '../src/blocks.js';
import {normalizeItemStack} from '../src/item-stack.js';
import {nextNetworkSequence} from '../src/network-sequence.js';
import {assertItemEntityId} from '../src/item-entity-replication.js';

export const SERVER_ITEM_TICK_RATE=20;
export const SERVER_ITEM_TICK_DT=1/SERVER_ITEM_TICK_RATE;
export const SERVER_ITEM_MAX_AGE=300;
export const SERVER_ITEM_PICKUP_DELAY=.45;
export const SERVER_ITEM_PICKUP_DISTANCE_SQUARED=2.4;
const GRAVITY=14;
const HORIZONTAL_DAMPING=.15;

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function vector(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};}
function defaultEntityIdFactory(){return `i:${randomUUID()}`;}
function cloneState(entity){return Object.freeze({entityId:entity.entityId,revision:entity.revision,itemId:entity.itemId,count:entity.count,damage:entity.damage,position:Object.freeze({...entity.position}),velocity:Object.freeze({...entity.velocity}),age:entity.age,pickupDelay:entity.pickupDelay});}

export class ServerItemEntityHub{
  constructor({entityIdFactory=defaultEntityIdFactory,onSpawn=()=>{},onSnapshot=()=>{},onDespawn=()=>{},onError=()=>{}}={}){
    this.entityIdFactory=callback(entityIdFactory,'entityIdFactory');this.onSpawn=callback(onSpawn,'onSpawn');this.onSnapshot=callback(onSnapshot,'onSnapshot');this.onDespawn=callback(onDespawn,'onDespawn');this.onError=callback(onError,'onError');this.entities=new Map();
  }

  get size(){return this.entities.size;}
  has(entityId){return this.entities.has(assertItemEntityId(entityId));}
  states(){return [...this.entities.values()].map(cloneState);}
  state(entityId){const entity=this.entities.get(assertItemEntityId(entityId));return entity?cloneState(entity):null;}
  report(error,phase,entityId=null){try{this.onError({error,phase,entityId});}catch{}}
  emit(kind,entity,reason=null){const state=cloneState(entity);try{if(kind==='spawn')this.onSpawn(state);else if(kind==='snapshot')this.onSnapshot(state);else this.onDespawn({entityId:state.entityId,revision:state.revision,reason});}catch(error){this.report(error,kind,state.entityId);}return state;}

  spawn(id,count,position,{damage=0,...options}={}){return this.spawnStack({id,count,...(damage>0?{damage}:{})},position,options);}
  spawnStack(value,position,{velocity={x:0,y:0,z:0},pickupDelay=SERVER_ITEM_PICKUP_DELAY,entityId=null}={}){
    const stack=normalizeItemStack(value,{label:'server item entity stack'});position=vector(position,'server item entity position');velocity=vector(velocity,'server item entity velocity');pickupDelay=finite(pickupDelay,'server item entity pickupDelay');if(pickupDelay<0||pickupDelay>60)throw new RangeError('server item entity pickupDelay must be between 0 and 60 seconds');
    entityId=assertItemEntityId(entityId??this.entityIdFactory());if(this.entities.has(entityId))throw new Error(`duplicate item entity id: ${entityId}`);
    const entity={entityId,revision:0,itemId:stack.id,count:stack.count,damage:stack.damage??0,position,velocity,age:0,pickupDelay};this.entities.set(entityId,entity);this.emit('spawn',entity);return cloneState(entity);
  }

  remove(entityId,reason='removed'){
    entityId=assertItemEntityId(entityId);const entity=this.entities.get(entityId);if(!entity)return false;entity.revision=nextNetworkSequence(entity.revision);this.entities.delete(entityId);this.emit('despawn',entity,reason);return true;
  }

  step(world,players,{dt=SERVER_ITEM_TICK_DT,onPickup=()=>null}={}){
    if(!world||typeof world.getBlock!=='function')throw new TypeError('item entity world must provide getBlock');if(!players||typeof players[Symbol.iterator]!=='function')throw new TypeError('item entity players must be iterable');dt=finite(dt,'item entity dt');if(dt<=0||dt>.25)throw new RangeError('item entity dt must be greater than 0 and at most .25');onPickup=callback(onPickup,'onPickup');
    const playerList=[...players];let snapshots=0,despawns=0,pickups=0;
    for(const entity of [...this.entities.values()]){
      entity.age+=dt;if(entity.age>=SERVER_ITEM_MAX_AGE){this.remove(entity.entityId,'expired');despawns++;continue;}
      entity.pickupDelay=Math.max(0,entity.pickupDelay-dt);entity.velocity.y-=GRAVITY*dt;entity.velocity.x*=Math.pow(HORIZONTAL_DAMPING,dt);entity.velocity.z*=Math.pow(HORIZONTAL_DAMPING,dt);
      const next={x:entity.position.x+entity.velocity.x*dt,y:entity.position.y+entity.velocity.y*dt,z:entity.position.z+entity.velocity.z*dt};const bx=Math.floor(next.x),bz=Math.floor(next.z),belowY=Math.floor(next.y-.15),below=BLOCKS[world.getBlock(bx,belowY,bz)];
      if(below?.solid&&next.y-.14<belowY+1&&entity.velocity.y<0){next.y=belowY+1.15;entity.velocity.y*=-.22;if(Math.abs(entity.velocity.y)<.25)entity.velocity.y=0;}
      entity.position=next;let pickupSnapshotSent=false;
      if(entity.pickupDelay===0){
        for(const player of playerList){if(!player||player.mode==='spectator'||!player.position)continue;const dx=player.position.x-next.x,dy=player.position.y+.8-next.y,dz=player.position.z-next.z;if(dx*dx+dy*dy+dz*dz>=SERVER_ITEM_PICKUP_DISTANCE_SQUARED)continue;let remaining;try{remaining=onPickup(player.session,entity.itemId,entity.count,cloneState(entity));}catch(error){this.report(error,'pickup',entity.entityId);continue;}if(!Number.isInteger(remaining)||remaining<0||remaining>entity.count){this.report(new RangeError('item pickup callback returned an invalid remaining count'),'pickup',entity.entityId);continue;}const picked=entity.count-remaining;if(!picked)continue;pickups+=picked;entity.count=remaining;if(entity.count===0){this.remove(entity.entityId,'picked');despawns++;break;}entity.revision=nextNetworkSequence(entity.revision);this.emit('snapshot',entity);snapshots++;pickupSnapshotSent=true;break;}
        if(!this.entities.has(entity.entityId))continue;if(pickupSnapshotSent)continue;
      }
      entity.revision=nextNetworkSequence(entity.revision);this.emit('snapshot',entity);snapshots++;
    }
    return Object.freeze({entities:this.entities.size,snapshots,despawns,pickups});
  }

  clear(reason='removed'){for(const entityId of [...this.entities.keys()])this.remove(entityId,reason);}
  close(){this.entities.clear();}
}
