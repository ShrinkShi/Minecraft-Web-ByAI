import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BedModelRenderer} from './bed-model-renderer.js';

let imagePromise=null;

async function renderBedBitmap(){
  if(typeof document==='undefined')throw new Error('bed item preview requires a browser document');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(64,64,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.35,1.35,1.35,-1.35,.1,20),beds=new BedModelRenderer();
  const hemi=new THREE.HemisphereLight(0xffffff,0x4a4037,2.2),key=new THREE.DirectionalLight(0xfff3df,2.3);key.position.set(-3,5,4);scene.add(hemi,key);
  const bed=beds.createWhole();bed.rotation.y=-Math.PI/5;scene.add(bed);camera.position.set(3.3,3.1,4.3);camera.lookAt(0,.2,0);
  try{
    await beds.ready;renderer.render(scene,camera);
    if(typeof createImageBitmap==='function')return await createImageBitmap(renderer.domElement);
    const fallback=document.createElement('canvas');fallback.width=64;fallback.height=64;fallback.getContext('2d').drawImage(renderer.domElement,0,0);return fallback;
  }finally{
    scene.remove(bed);beds.dispose();renderer.dispose();
  }
}

function bedBitmap(){if(!imagePromise)imagePromise=renderBedBitmap();return imagePromise;}

export function createBedItemIconCanvas({size=32}={}){
  if(typeof document==='undefined')return null;const pixels=Math.max(1,Math.floor(Number(size)||32)),canvas=document.createElement('canvas');canvas.className='bed-item-icon';canvas.width=pixels;canvas.height=pixels;canvas.dataset.renderState='loading';canvas.setAttribute('aria-hidden','true');
  bedBitmap().then(image=>{const ctx=canvas.getContext('2d');if(!ctx)throw new Error('2D canvas context unavailable for bed item icon');ctx.clearRect(0,0,pixels,pixels);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,pixels,pixels);canvas.dataset.renderState='ready';canvas.dispatchEvent(new CustomEvent('bed-item-rendered',{bubbles:true}));}).catch(error=>{canvas.dataset.renderState='error';canvas.dataset.renderError=error?.message||String(error);});
  return canvas;
}

export function resetBedItemPreviewForTests(){imagePromise=null;}
