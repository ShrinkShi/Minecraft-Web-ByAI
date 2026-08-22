import {BLOCK,CHUNK_SIZE,WORLD_HEIGHT} from './blocks.js';
import {boneMealGrassCandidateOffsets,boneMealWheatResult,rollShortGrassDrops} from './vegetation-rules.js';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function decodeEdit(cx,cz,index){
  if(!Number.isInteger(cx)||!Number.isInteger(cz)||!Number.isInteger(index)||index<0)throw new TypeError('vegetation edit event must contain integer cx/cz/index');
  const layer=CHUNK_SIZE*CHUNK_SIZE,y=Math.floor(index/layer),within=index-y*layer,lz=Math.floor(within/CHUNK_SIZE),lx=within-lz*CHUNK_SIZE;
  return{x:cx*CHUNK_SIZE+lx,y,z:cz*CHUNK_SIZE+lz};
}

export class SingleplayerVegetationRuntime{
  constructor({world,getMode=()=> 'survival',onChanged=()=>{},onDrop=()=>{},random=Math.random}={}){
    if(!world||typeof world.getBlock!=='function'||typeof world.setBlock!=='function')throw new TypeError('vegetation runtime requires a voxel world');
    this.world=world;this.getMode=callback(getMode,'getMode');this.onChanged=callback(onChanged,'onChanged');this.onDrop=callback(onDrop,'onDrop');this.random=callback(random,'random');this.disposed=false;
  }

  dropsForBlock(blockId,random=this.random){
    if(Number(blockId)!==BLOCK.SHORT_GRASS)return null;
    return rollShortGrassDrops(callback(random,'vegetation drop random')).map(stack=>({...stack}));
  }

  emitShortGrassDrops(target,random=this.random){
    if(this.getMode()==='creative')return 0;
    const stacks=this.dropsForBlock(BLOCK.SHORT_GRASS,random)||[];
    for(const stack of stacks)this.onDrop(stack,{...target,sourceBlockId:BLOCK.SHORT_GRASS});
    return stacks.length;
  }

  observeEdit(event){
    if(this.disposed||!event)return false;
    const position=decodeEdit(event.cx,event.cz,event.index),id=Number(event.id);
    if(id===BLOCK.GRASS||position.y+1>=WORLD_HEIGHT)return true;
    if(this.world.getBlock(position.x,position.y+1,position.z)!==BLOCK.SHORT_GRASS)return true;
    if(this.world.setBlock(position.x,position.y+1,position.z,BLOCK.AIR)){
      this.emitShortGrassDrops({x:position.x,y:position.y+1,z:position.z});
      this.onChanged();
    }
    return true;
  }

  findGrassSurface(x,baseY,z){
    for(const offset of [0,1,-1,2,-2]){
      const y=baseY+offset;
      if(y<0||y+1>=WORLD_HEIGHT)continue;
      if(this.world.getBlock(x,y,z)===BLOCK.GRASS&&this.world.getBlock(x,y+1,z)===BLOCK.AIR)return y;
    }
    return null;
  }

  applyBoneMeal(target,random=this.random){
    if(this.disposed||!target||![target.x,target.y,target.z].every(Number.isInteger))return Object.freeze({changed:false,reason:'invalid-target'});
    const mode=String(this.getMode()||'survival');
    if(mode==='spectator'||mode==='adventure')return Object.freeze({changed:false,reason:'mode-invalid'});
    callback(random,'bone meal random');
    const current=this.world.getBlock(target.x,target.y,target.z);
    const wheat=boneMealWheatResult(current,random);
    if(wheat){
      if(!this.world.setBlock(target.x,target.y,target.z,wheat.blockId))return Object.freeze({changed:false,reason:'write-failed'});
      this.onChanged();
      return Object.freeze({changed:true,kind:'wheat',fromAge:wheat.fromAge,toAge:wheat.toAge,growth:wheat.growth,placements:0});
    }
    if(current!==BLOCK.GRASS)return Object.freeze({changed:false,reason:'invalid-target'});

    let placements=0;
    for(const {dx,dz} of boneMealGrassCandidateOffsets(random)){
      const x=target.x+dx,z=target.z+dz,surfaceY=this.findGrassSurface(x,target.y,z);
      if(surfaceY===null)continue;
      if(this.world.setBlock(x,surfaceY+1,z,BLOCK.SHORT_GRASS))placements++;
    }
    if(placements===0)return Object.freeze({changed:false,reason:'no-space'});
    this.onChanged();
    return Object.freeze({changed:true,kind:'grass',placements});
  }

  dispose(){this.disposed=true;this.world=null;}
}
