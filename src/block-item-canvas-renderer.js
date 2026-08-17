import {ATLAS_COLS,ATLAS_ROWS} from './blocks.js';
import {blockItemFaceTextures,blockItemFaceTiles} from './block-item-preview.js';

const imageCache=new Map();
const FACE_POINTS=Object.freeze({
  top:Object.freeze([[3,10],[16,3],[16,17],[29,10]]),
  left:Object.freeze([[3,10],[16,17],[16,31],[3,24]]),
  right:Object.freeze([[16,17],[29,10],[29,24],[16,31]])
});

function imageFor(url){
  if(imageCache.has(url))return imageCache.get(url);
  const promise=new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`unable to load block item texture: ${url}`));image.src=url;});imageCache.set(url,promise);return promise;
}

function faceSource(definition,face,atlasUrl){
  const textures=blockItemFaceTextures(definition);if(textures)return{url:textures[face],sx:0,sy:0,sw:null,sh:null};
  const tiles=blockItemFaceTiles(definition);if(!tiles)return null;const tile=tiles[face],col=tile%ATLAS_COLS,row=Math.floor(tile/ATLAS_COLS);return{url:atlasUrl,sx:col,sy:row,sw:'tile',sh:'tile'};
}

function polygon(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let index=1;index<points.length;index++)ctx.lineTo(points[index][0],points[index][1]);ctx.closePath();}

function drawMappedFace(ctx,image,source,points){
  const tileW=image.width/ATLAS_COLS,tileH=image.height/ATLAS_ROWS,whole=source.sw===null;
  const sx=whole?0:source.sx*tileW,sy=whole?0:source.sy*tileH,sw=whole?image.width:tileW,sh=whole?image.height:tileH;
  const [p0,p1,,p3]=points,a=(p1[0]-p0[0])/sw,b=(p1[1]-p0[1])/sw,c=(p3[0]-p0[0])/sh,d=(p3[1]-p0[1])/sh;
  ctx.save();polygon(ctx,points);ctx.clip();ctx.setTransform(a,b,c,d,p0[0],p0[1]);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);ctx.restore();
}

function shade(ctx,face){if(face==='top')return;const points=FACE_POINTS[face];ctx.save();polygon(ctx,points);ctx.fillStyle=face==='left'?'rgba(0,0,0,.18)':'rgba(0,0,0,.32)';ctx.fill();ctx.restore();}

export function createBlockItemCanvas(definition,{atlasUrl,size=32}={}){
  if(typeof document==='undefined'||typeof Image==='undefined'||!definition)return null;if(typeof atlasUrl!=='string'||!atlasUrl)throw new TypeError('atlasUrl is required');
  const sources=Object.fromEntries(['top','left','right'].map(face=>[face,faceSource(definition,face,atlasUrl)]));if(Object.values(sources).some(source=>!source))return null;
  const canvas=document.createElement('canvas');canvas.className='block-item-canvas';canvas.width=size;canvas.height=size;canvas.setAttribute('aria-hidden','true');canvas.dataset.renderState='loading';
  Promise.all(Object.entries(sources).map(async([face,source])=>[face,source,await imageFor(source.url)])).then(entries=>{
    if(!canvas.isConnected&&canvas.dataset.allowDetached!=='1')return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size,size);ctx.imageSmoothingEnabled=false;
    for(const face of['left','right','top']){const [,source,image]=entries.find(entry=>entry[0]===face);drawMappedFace(ctx,image,source,FACE_POINTS[face]);shade(ctx,face);}
    canvas.dataset.renderState='ready';canvas.dispatchEvent(new CustomEvent('block-item-rendered',{bubbles:true}));
  }).catch(error=>{canvas.dataset.renderState='error';canvas.dataset.renderError=error?.message||String(error);});
  return canvas;
}

export function blockItemCanvasFacePoints(){return FACE_POINTS;}
