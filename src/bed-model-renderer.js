import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {requireAssetUrl} from './asset-manifest.js';
import {BED_TEXTURE_SIZE,bedHalfSpec,minecraftCuboidUvRects} from './bed-model-specs.js';

const PIXEL=1/16;
const FACE_ORDER=['right','left','top','bottom','front','back'];
const BED_TEXTURE_ASSET_KEY='entity.bed.red';

function addFace(positions,uvs,indices,vertices,rect){
  const base=positions.length/3,[tw,th]=BED_TEXTURE_SIZE,[u0,v0,u1,v1]=rect;
  for(const [x,y,z] of vertices)positions.push(x*PIXEL,y*PIXEL,z*PIXEL);
  const left=u0/tw,right=u1/tw,top=1-v0/th,bottom=1-v1/th;
  uvs.push(left,bottom,left,top,right,top,right,bottom);
  indices.push(base,base+1,base+2,base,base+2,base+3);
}

function cuboidGeometry(spec){
  const [w,h,d]=spec.size,[x,y,z]=spec.offset,x1=x+w,y1=y+h,z1=z+d;
  const rects={...minecraftCuboidUvRects(spec.uv[0],spec.uv[1],w,h,d),...(spec.faceUv||{})};
  const faces={
    right:[[x1,y,z],[x1,y1,z],[x1,y1,z1],[x1,y,z1]],
    left:[[x,y,z1],[x,y1,z1],[x,y1,z],[x,y,z]],
    top:[[x,y1,z1],[x1,y1,z1],[x1,y1,z],[x,y1,z]],
    bottom:[[x,y,z],[x1,y,z],[x1,y,z1],[x,y,z1]],
    front:[[x,y,z],[x,y1,z],[x1,y1,z],[x1,y,z]],
    back:[[x1,y,z1],[x1,y1,z1],[x,y1,z1],[x,y,z1]]
  };
  const positions=[],uvs=[],indices=[];
  for(const face of FACE_ORDER)addFace(positions,uvs,indices,faces[face],rects[face]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export class BedModelRenderer{
  constructor(){
    this.texture=new THREE.TextureLoader().load(requireAssetUrl(BED_TEXTURE_ASSET_KEY));
    this.texture.name=BED_TEXTURE_ASSET_KEY;this.texture.userData.assetKey=BED_TEXTURE_ASSET_KEY;
    this.texture.magFilter=THREE.NearestFilter;this.texture.minFilter=THREE.NearestFilter;this.texture.generateMipmaps=false;this.texture.colorSpace=THREE.SRGBColorSpace;
    this.material=new THREE.MeshLambertMaterial({map:this.texture,transparent:true,alphaTest:.01});
    this.geometries=new Set();this.templates=new Map();
    for(const part of['foot','head'])this.templates.set(part,this.makeTemplate(part));
  }

  makeTemplate(part){
    const spec=bedHalfSpec(part);if(!spec)throw new Error(`missing bed half spec: ${part}`);
    const group=new THREE.Group();group.name=`bed-half:${part}`;
    for(const cuboid of spec.cuboids){const geometry=cuboidGeometry(cuboid);this.geometries.add(geometry);const mesh=new THREE.Mesh(geometry,this.material);mesh.name=`bed-box:${cuboid.name}`;group.add(mesh);}
    return group;
  }

  create(descriptor){
    const template=this.templates.get(descriptor?.part);if(!template)return null;
    const group=template.clone(true);group.position.set(descriptor.x,descriptor.y,descriptor.z);group.rotation.y=descriptor.rotationY||0;group.userData.bedDescriptor={...descriptor};
    if(group.rotation.y){
      const center=new THREE.Vector3(.5,0,.5),rotated=center.clone().applyAxisAngle(new THREE.Vector3(0,1,0),group.rotation.y);group.position.x+=center.x-rotated.x;group.position.z+=center.z-rotated.z;
    }
    return group;
  }

  dispose(){for(const geometry of this.geometries)geometry.dispose();this.geometries.clear();this.material.dispose();this.texture.dispose();this.templates.clear();}
}
