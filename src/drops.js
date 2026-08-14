import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {ATLAS_COLS,ATLAS_ROWS,BLOCKS} from './blocks.js';
import {ITEMS} from './items.js';

export class DropSystem{
  constructor(scene,world,inventory,onInventoryChanged=()=>{}){
    this.scene=scene;this.world=world;this.inventory=inventory;this.onInventoryChanged=onInventoryChanged;
    this.drops=[];this.blockGeometries=new Map();this.itemMaterials=new Map();
  }

  geometryForTile(tile){
    if(this.blockGeometries.has(tile))return this.blockGeometries.get(tile);
    const geometry=new THREE.BoxGeometry(.28,.28,.28);
    const uv=geometry.getAttribute('uv');
    const tx=tile%ATLAS_COLS,ty=Math.floor(tile/ATLAS_COLS),u0=tx/ATLAS_COLS,u1=(tx+1)/ATLAS_COLS,v0=1-(ty+1)/ATLAS_ROWS,v1=1-ty/ATLAS_ROWS;
    for(let i=0;i<uv.count;i++){
      const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,u0+u*(u1-u0),v0+v*(v1-v0));
    }
    uv.needsUpdate=true;this.blockGeometries.set(tile,geometry);return geometry;
  }

  materialForItem(itemId){
    if(this.itemMaterials.has(itemId))return this.itemMaterials.get(itemId);
    const def=ITEMS[itemId];if(!def)return null;let material=null;
    if(def.texture){const texture=new THREE.TextureLoader().load(def.texture);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestMipmapNearestFilter;texture.colorSpace=THREE.SRGBColorSpace;material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.05});}
    else if(Number.isFinite(def.color))material=new THREE.SpriteMaterial({color:def.color,transparent:false});
    if(material)this.itemMaterials.set(itemId,material);return material;
  }

  createVisual(itemId){
    const def=ITEMS[itemId];
    if(def?.blockId){const mesh=new THREE.Mesh(this.geometryForTile(def.tile),this.world.material);mesh.castShadow=false;return mesh;}
    const material=this.materialForItem(itemId);if(!material)return null;
    const sprite=new THREE.Sprite(material);sprite.scale.set(.48,.48,.48);return sprite;
  }

  spawn(itemId,count,position,velocity=null){
    if(!ITEMS[itemId]||count<=0)return null;
    const visual=this.createVisual(itemId);if(!visual)return null;
    visual.position.copy(position);this.scene.add(visual);
    const drop={itemId,count,visual,age:0,pickupDelay:.45,velocity:velocity?.clone()||new THREE.Vector3((Math.random()-.5)*1.8,2.8,(Math.random()-.5)*1.8)};
    this.drops.push(drop);return drop;
  }

  remove(drop){const i=this.drops.indexOf(drop);if(i>=0)this.drops.splice(i,1);this.scene.remove(drop.visual);}

  update(dt,player){
    for(let i=this.drops.length-1;i>=0;i--){
      const drop=this.drops[i];drop.age+=dt;if(drop.age>=300){this.remove(drop);continue;}
      drop.pickupDelay=Math.max(0,drop.pickupDelay-dt);
      drop.velocity.y-=14*dt;drop.velocity.x*=Math.pow(.15,dt);drop.velocity.z*=Math.pow(.15,dt);
      const next=drop.visual.position.clone().addScaledVector(drop.velocity,dt);
      const bx=Math.floor(next.x),bz=Math.floor(next.z),belowY=Math.floor(next.y-.15);
      const below=BLOCKS[this.world.getBlock(bx,belowY,bz)];
      if(below?.solid&&next.y-.14<belowY+1&&drop.velocity.y<0){next.y=belowY+1.15;drop.velocity.y*=-.22;if(Math.abs(drop.velocity.y)<.25)drop.velocity.y=0;}
      drop.visual.position.copy(next);if(!drop.visual.isSprite)drop.visual.rotation.y+=dt*1.7;
      if(drop.pickupDelay===0&&player){
        const dx=player.position.x-next.x,dy=player.position.y+.8-next.y,dz=player.position.z-next.z,dist2=dx*dx+dy*dy+dz*dz;
        if(dist2<2.4){
          const add=typeof this.inventory.addPickup==='function'?this.inventory.addPickup.bind(this.inventory):this.inventory.add.bind(this.inventory);
          const remaining=add(drop.itemId,drop.count),picked=drop.count-remaining;
          if(picked>0){drop.count=remaining;this.onInventoryChanged();}
          if(drop.count<=0)this.remove(drop);
        }
      }
    }
  }

  dispose(){
    for(const drop of [...this.drops])this.remove(drop);
    for(const geometry of this.blockGeometries.values())geometry.dispose();
    for(const material of this.itemMaterials.values()){material.map?.dispose();material.dispose();}
    this.blockGeometries.clear();this.itemMaterials.clear();
  }
}
