import {BLOCK,CHUNK_SIZE} from './blocks.js';
import {FARMLAND_TICK_INTERVAL_SECONDS,canPlantWheat,farmlandHasNearbyWater,isFarmlandBlock,isWheatCropBlock,nextFarmlandBlock,nextWheatBlock,wheatBlockForAge,wheatHarvestDrops} from './farming-rules.js';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function key(x,y,z){return `${x},${y},${z}`;}
function parseKey(value){const parts=String(value).split(',').map(Number);if(parts.length!==3||!parts.every(Number.isInteger))throw new TypeError(`invalid farming position key: ${value}`);return{x:parts[0],y:parts[1],z:parts[2]};}
function decodeEdit(cx,cz,index){
  if(!Number.isInteger(cx)||!Number.isInteger(cz)||!Number.isInteger(index)||index<0)throw new TypeError('farming edit event must contain integer cx/cz/index');
  const layer=CHUNK_SIZE*CHUNK_SIZE,y=Math.floor(index/layer),within=index-y*layer,lz=Math.floor(within/CHUNK_SIZE),lx=within-lz*CHUNK_SIZE;
  return{x:cx*CHUNK_SIZE+lx,y,z:cz*CHUNK_SIZE+lz};
}

export class SingleplayerFarmingRuntime{
  constructor({world,getMode=()=> 'survival',getWeather=()=> 'clear',onChanged=()=>{},onDrop=()=>{},random=Math.random}={}){
    if(!world||typeof world.getBlock!=='function'||typeof world.setBlock!=='function'||typeof world.exportEdits!=='function')throw new TypeError('farming runtime requires a voxel world');
    this.world=world;this.getMode=callback(getMode,'getMode');this.getWeather=callback(getWeather,'getWeather');this.onChanged=callback(onChanged,'onChanged');this.onDrop=callback(onDrop,'onDrop');this.random=callback(random,'random');this.accumulator=0;this.tracked=new Set();this.disposed=false;this.restoreTrackedEdits();
  }

  restoreTrackedEdits(){
    const edits=this.world.exportEdits();
    for(const [chunkKey,entries] of Object.entries(edits)){
      const [cx,cz]=chunkKey.split(',').map(Number);if(!Number.isInteger(cx)||!Number.isInteger(cz)||!Array.isArray(entries))continue;
      for(const [index,id] of entries){const position=decodeEdit(cx,cz,Number(index));if(isFarmlandBlock(id)||isWheatCropBlock(id))this.tracked.add(key(position.x,position.y,position.z));}
    }
  }

  emitCropDrops(blockId,target){
    if(this.getMode()==='creative')return 0;
    const stacks=this.dropsForBlock(blockId);for(const stack of stacks)this.onDrop(stack,{...target,sourceBlockId:blockId});return stacks.length;
  }

  observeEdit(event){
    if(this.disposed||!event)return false;const position=decodeEdit(event.cx,event.cz,event.index),positionKey=key(position.x,position.y,position.z),id=Number(event.id);
    if(isFarmlandBlock(id)||isWheatCropBlock(id))this.tracked.add(positionKey);else this.tracked.delete(positionKey);
    if(!isFarmlandBlock(id)&&isWheatCropBlock(this.world.getBlock(position.x,position.y+1,position.z))){
      const cropId=this.world.getBlock(position.x,position.y+1,position.z);if(this.world.setBlock(position.x,position.y+1,position.z,BLOCK.AIR)){this.emitCropDrops(cropId,{x:position.x,y:position.y+1,z:position.z});this.onChanged();}
    }
    return true;
  }

  plantWheat(target){
    if(this.disposed||!target||![target.x,target.y,target.z,target.id].every(Number.isInteger))return false;
    const above=this.world.getBlock(target.x,target.y+1,target.z);if(!canPlantWheat(target.id,above))return false;
    const changed=this.world.setBlock(target.x,target.y+1,target.z,wheatBlockForAge(0));if(changed)this.onChanged();return changed;
  }

  dropsForBlock(blockId,defaultDrop=null){
    if(isWheatCropBlock(blockId))return wheatHarvestDrops(blockId,this.random).map(stack=>({...stack}));
    return defaultDrop?[{id:defaultDrop,count:1}]:[];
  }

  update(dt){
    if(this.disposed)return false;if(!Number.isFinite(dt)||dt<0)throw new RangeError('farming dt must be a non-negative finite number');this.accumulator+=dt;let changed=false;
    while(this.accumulator>=FARMLAND_TICK_INTERVAL_SECONDS){this.accumulator-=FARMLAND_TICK_INTERVAL_SECONDS;changed=this.tickNow(this.random)||changed;}
    return changed;
  }

  tickNow(random=this.random){
    if(this.disposed)return false;callback(random,'farming tick random');let changed=false;const weather=String(this.getWeather()||'clear');
    for(const positionKey of [...this.tracked]){
      const {x,y,z}=parseKey(positionKey),id=this.world.getBlock(x,y,z);
      if(isFarmlandBlock(id)){
        const hasCrop=isWheatCropBlock(this.world.getBlock(x,y+1,z)),hydrated=weather!=='clear'||farmlandHasNearbyWater((px,py,pz)=>this.world.getBlock(px,py,pz),x,y,z),next=nextFarmlandBlock(id,{hydrated,hasCrop});
        if(next!==id&&this.world.setBlock(x,y,z,next)){changed=true;this.onChanged();}
        continue;
      }
      if(isWheatCropBlock(id)){
        const below=this.world.getBlock(x,y-1,z);if(!isFarmlandBlock(below)){if(this.world.setBlock(x,y,z,BLOCK.AIR)){this.emitCropDrops(id,{x,y,z});changed=true;this.onChanged();}continue;}
        const next=nextWheatBlock(id,below,random);if(next!==id&&this.world.setBlock(x,y,z,next)){changed=true;this.onChanged();}
        continue;
      }
      this.tracked.delete(positionKey);
    }
    return changed;
  }

  snapshot(){let farmland=0,wheat=0;for(const positionKey of this.tracked){const {x,y,z}=parseKey(positionKey),id=this.world.getBlock(x,y,z);if(isFarmlandBlock(id))farmland++;else if(isWheatCropBlock(id))wheat++;}return Object.freeze({tracked:this.tracked.size,farmland,wheat,accumulator:this.accumulator});}
  dispose(){this.disposed=true;this.tracked.clear();this.world=null;}
}
