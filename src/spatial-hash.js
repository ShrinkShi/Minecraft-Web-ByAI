const cellKey=(x,z)=>`${x},${z}`;

function requireFinite(value,name){
  if(!Number.isFinite(value))throw new TypeError(`${name} must be finite`);
}

export class SpatialHash{
  constructor(cellSize=8){
    if(!Number.isFinite(cellSize)||cellSize<=0)throw new RangeError('cellSize must be > 0');
    this.cellSize=cellSize;
    this.cells=new Map();
    this.entries=new Map();
  }

  cellFor(x,z){
    requireFinite(x,'x');requireFinite(z,'z');
    return[Math.floor(x/this.cellSize),Math.floor(z/this.cellSize)];
  }

  insert(id,x,z,value=null){
    if(id===undefined||id===null)throw new TypeError('id is required');
    requireFinite(x,'x');requireFinite(z,'z');
    this.remove(id);
    const[cx,cz]=this.cellFor(x,z),key=cellKey(cx,cz);
    let bucket=this.cells.get(key);
    if(!bucket){bucket=new Set();this.cells.set(key,bucket);}
    bucket.add(id);
    this.entries.set(id,{cx,cz,x,z,value});
    return id;
  }

  update(id,x,z,value=undefined){
    requireFinite(x,'x');requireFinite(z,'z');
    const entry=this.entries.get(id);
    if(!entry){this.insert(id,x,z,value===undefined?null:value);return false;}
    const[cx,cz]=this.cellFor(x,z);
    if(cx!==entry.cx||cz!==entry.cz){
      const oldKey=cellKey(entry.cx,entry.cz),oldBucket=this.cells.get(oldKey);
      oldBucket?.delete(id);
      if(oldBucket?.size===0)this.cells.delete(oldKey);
      const newKey=cellKey(cx,cz);
      let newBucket=this.cells.get(newKey);
      if(!newBucket){newBucket=new Set();this.cells.set(newKey,newBucket);}
      newBucket.add(id);entry.cx=cx;entry.cz=cz;
    }
    entry.x=x;entry.z=z;
    if(value!==undefined)entry.value=value;
    return true;
  }

  remove(id){
    const entry=this.entries.get(id);
    if(!entry)return false;
    const key=cellKey(entry.cx,entry.cz),bucket=this.cells.get(key);
    bucket?.delete(id);
    if(bucket?.size===0)this.cells.delete(key);
    this.entries.delete(id);
    return true;
  }

  queryRadius(x,z,radius){
    requireFinite(x,'x');requireFinite(z,'z');
    if(!Number.isFinite(radius)||radius<0)throw new RangeError('radius must be >= 0');
    const minX=Math.floor((x-radius)/this.cellSize),maxX=Math.floor((x+radius)/this.cellSize);
    const minZ=Math.floor((z-radius)/this.cellSize),maxZ=Math.floor((z+radius)/this.cellSize);
    const radiusSq=radius*radius,result=[];
    for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
      const bucket=this.cells.get(cellKey(cx,cz));if(!bucket)continue;
      for(const id of bucket){
        const entry=this.entries.get(id);if(!entry)continue;
        const dx=entry.x-x,dz=entry.z-z;
        if(dx*dx+dz*dz<=radiusSq)result.push(entry.value??id);
      }
    }
    return result;
  }

  queryAabb(minX,minZ,maxX,maxZ){
    for(const[value,name]of[[minX,'minX'],[minZ,'minZ'],[maxX,'maxX'],[maxZ,'maxZ']])requireFinite(value,name);
    if(maxX<minX||maxZ<minZ)throw new RangeError('invalid AABB bounds');
    const startX=Math.floor(minX/this.cellSize),endX=Math.floor(maxX/this.cellSize);
    const startZ=Math.floor(minZ/this.cellSize),endZ=Math.floor(maxZ/this.cellSize),result=[];
    for(let cx=startX;cx<=endX;cx++)for(let cz=startZ;cz<=endZ;cz++){
      const bucket=this.cells.get(cellKey(cx,cz));if(!bucket)continue;
      for(const id of bucket){
        const entry=this.entries.get(id);if(!entry)continue;
        if(entry.x>=minX&&entry.x<=maxX&&entry.z>=minZ&&entry.z<=maxZ)result.push(entry.value??id);
      }
    }
    return result;
  }

  clear(){this.cells.clear();this.entries.clear();}
  get size(){return this.entries.size;}
}
