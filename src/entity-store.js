import {SpatialHash} from './spatial-hash.js';

function requirePosition(position){
  if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.y)||!Number.isFinite(position.z))throw new TypeError('position must contain finite x/y/z');
}

export class EntityStore{
  constructor({cellSize=8}={}){
    this.nextId=1;
    this.records=new Map();
    this.positions=new Map();
    this.spatial=new SpatialHash(cellSize);
  }

  spawn(type,position,components={}){
    if(typeof type!=='string'||!type)throw new TypeError('entity type is required');
    requirePosition(position);
    const id=this.nextId++;
    const record={id,type,components:{...components}};
    this.records.set(id,record);
    this.positions.set(id,{x:position.x,y:position.y,z:position.z});
    this.spatial.insert(id,position.x,position.z,id);
    return record;
  }

  has(id){return this.records.has(id);}
  get(id){return this.records.get(id)??null;}

  getPosition(id){
    const position=this.positions.get(id);
    return position?{...position}:null;
  }

  setPosition(id,position){
    requirePosition(position);
    if(!this.records.has(id))return false;
    this.positions.set(id,{x:position.x,y:position.y,z:position.z});
    this.spatial.update(id,position.x,position.z,id);
    return true;
  }

  patchComponents(id,patch){
    const record=this.records.get(id);
    if(!record)return false;
    if(!patch||typeof patch!=='object')throw new TypeError('component patch must be an object');
    Object.assign(record.components,patch);
    return true;
  }

  nearby(x,z,radius,predicate=null){
    const ids=this.spatial.queryRadius(x,z,radius),result=[];
    for(const id of ids){
      const record=this.records.get(id);
      if(record&&(!predicate||predicate(record)))result.push(record);
    }
    return result;
  }

  despawn(id){
    if(!this.records.has(id))return false;
    this.records.delete(id);this.positions.delete(id);this.spatial.remove(id);
    return true;
  }

  clear(){this.records.clear();this.positions.clear();this.spatial.clear();}
  get size(){return this.records.size;}
  values(){return this.records.values();}
}
