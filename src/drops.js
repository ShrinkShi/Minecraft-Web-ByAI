import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {ATLAS_COLS,ATLAS_ROWS,BLOCKS} from './blocks.js';
import {ITEMS} from './items.js';
import {normalizeItemStack} from './item-stack.js';
import {BedModelRenderer} from './bed-model-renderer.js';

export class DropSystem{
  constructor(scene,world,inventory,onInventoryChanged=()=>{}){
    this.scene=scene;this.world=world;this.inventory=inventory;this.onInventoryChanged=onInventoryChanged;
    this.drops=[];this.authoritativeDrops=new Map();this.blockGeometries=new Map();this.itemMaterials=new Map();this.bedRenderer=null;
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

  createBedVisual(){
    this.bedRenderer??=new BedModelRenderer();const root=this.bedRenderer.createWhole();root.name='drop-bed';root.userData.sourceBackedItem='bed';root.scale.setScalar(.3);root.position.y=-.08;return root;
  }

  createVisual(itemId){
    const def=ITEMS[itemId];
    if(def?.itemPreview==='bed-model')return this.createBedVisual();
    if(def?.blockId){const mesh=new THREE.Mesh(this.geometryForTile(def.tile),this.world.material);mesh.castShadow=false;return mesh;}
    const material=this.materialForItem(itemId);if(!material)return null;
    const sprite=new THREE.Sprite(material);sprite.scale.set(.48,.48,.48);return sprite;
  }

  spawn(itemId,count,position,velocity=null){return this.spawnStack({id:itemId,count},position,velocity);}
  spawnStack(value,position,velocity=null){
    let stack;try{stack=normalizeItemStack(value,{label:'local drop stack'});}catch{return null;}
    const visual=this.createVisual(stack.id);if(!visual)return null;
    visual.position.copy(position);this.scene.add(visual);
    const drop={itemId:stack.id,count:stack.count,damage:stack.damage??0,visual,age:0,pickupDelay:.45,velocity:velocity?.clone()||new THREE.Vector3((Math.random()-.5)*1.8,2.8,(Math.random()-.5)*1.8),authoritative:false};
    this.drops.push(drop);return drop;
  }

  spawnAuthoritative(state){
    const entityId=state?.entityId;if(typeof entityId!=='string'||this.authoritativeDrops.has(entityId)||!ITEMS[state?.itemId]||!state?.position)return null;let stack;try{stack=normalizeItemStack({id:state.itemId,count:state.count,...((state.damage??0)>0?{damage:state.damage}:{})},{label:'authoritative drop stack'});}catch{return null;}const visual=this.createVisual(stack.id);if(!visual)return null;visual.position.set(state.position.x,state.position.y,state.position.z);this.scene.add(visual);const target=new THREE.Vector3(state.position.x,state.position.y,state.position.z),drop={entityId,itemId:stack.id,count:stack.count,damage:stack.damage??0,visual,target,age:state.age??0,pickupDelay:state.pickupDelay??0,velocity:new THREE.Vector3(state.velocity?.x||0,state.velocity?.y||0,state.velocity?.z||0),authoritative:true,revision:state.revision??0};this.drops.push(drop);this.authoritativeDrops.set(entityId,drop);return drop;
  }

  snapshotAuthoritative(state){
    const drop=this.authoritativeDrops.get(state?.entityId);if(!drop||drop.itemId!==state.itemId||drop.damage!==(state.damage??0)||!state.position)return false;drop.count=state.count;drop.age=state.age??drop.age;drop.pickupDelay=state.pickupDelay??drop.pickupDelay;drop.revision=state.revision??drop.revision;drop.target.set(state.position.x,state.position.y,state.position.z);drop.visual.position.copy(drop.target);drop.velocity.set(state.velocity?.x||0,state.velocity?.y||0,state.velocity?.z||0);return true;
  }

  despawnAuthoritative(entityId){const drop=this.authoritativeDrops.get(entityId);if(!drop)return false;this.authoritativeDrops.delete(entityId);this.remove(drop);return true;}
  authoritativeStates(){return [...this.authoritativeDrops.values()].map(drop=>({entityId:drop.entityId,itemId:drop.itemId,count:drop.count,damage:drop.damage,revision:drop.revision,position:{x:drop.target.x,y:drop.target.y,z:drop.target.z}}));}

  remove(drop){const i=this.drops.indexOf(drop);if(i>=0)this.drops.splice(i,1);if(drop.entityId)this.authoritativeDrops.delete(drop.entityId);this.scene.remove(drop.visual);}

  update(dt,player){
    for(let i=this.drops.length-1;i>=0;i--){
      const drop=this.drops[i];
      if(drop.authoritative){const alpha=Math.min(1,Math.max(0,dt)*14);drop.visual.position.lerp(drop.target,alpha);if(!drop.visual.isSprite)drop.visual.rotation.y+=dt*1.7;continue;}
      drop.age+=dt;if(drop.age>=300){this.remove(drop);continue;}
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
          const stack={id:drop.itemId,count:drop.count,...(drop.damage>0?{damage:drop.damage}:{})};const remaining=typeof this.inventory.addPickupStack==='function'?this.inventory.addPickupStack(stack):(typeof this.inventory.addPickup==='function'?this.inventory.addPickup(drop.itemId,drop.count):this.inventory.add(drop.itemId,drop.count)),picked=drop.count-remaining;
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
    this.bedRenderer?.dispose();this.bedRenderer=null;
    this.authoritativeDrops.clear();this.blockGeometries.clear();this.itemMaterials.clear();
  }
}
