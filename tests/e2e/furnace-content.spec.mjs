import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

async function key(page,code){await page.evaluate(value=>window.dispatchEvent(new KeyboardEvent('keydown',{code:value,bubbles:true})),code);}
async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}
async function expectRenderedBlockItem(preview){
  const canvas=preview.locator('canvas.block-item-canvas');await expect(canvas).toHaveCount(1);await expect(canvas).toHaveAttribute('data-render-state','ready');
  const opaque=await canvas.evaluate(element=>{const data=element.getContext('2d').getImageData(0,0,element.width,element.height).data;let count=0;for(let index=3;index<data.length;index+=4)if(data[index])count++;return count;});
  expect(opaque).toBeGreaterThan(100);
}

test('furnace uses interpreted original model art and source-backed inventory presentation',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');

  const runtimeState=await page.evaluate(async()=>{
    const [{loadMinecraftModelRuntime},{loadMinecraftModelAtlasResolver},{BLOCK,CHUNK_SIZE,WORLD_HEIGHT},{ITEMS}]=await Promise.all([
      import('/src/minecraft-model-runtime.js'),import('/src/minecraft-model-texture-binding.js'),import('/src/blocks.js'),import('/src/items.js')
    ]);
    const [runtime,atlasResolver]=await Promise.all([loadMinecraftModelRuntime(),loadMinecraftModelAtlasResolver()]);
    const worker=new Worker('/src/mesh-worker.js',{type:'module'});
    const next=(expected,timeout=10_000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(new Error(`worker timeout waiting for ${expected}`));},timeout);const onMessage=event=>{const message=event.data;if(message?.type==='minecraft-model-runtime-error'){cleanup();reject(new Error(message.message));return;}if(message?.type!==expected)return;cleanup();resolve(message);};const onError=event=>{cleanup();reject(new Error(event.message||'mesh worker error'));};const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError);};worker.addEventListener('message',onMessage);worker.addEventListener('error',onError);});
    const readyPromise=next('minecraft-model-runtime-ready');worker.postMessage({type:'minecraft-model-runtime-init',runtime,atlasManifest:atlasResolver.manifest});const ready=await readyPromise;
    const index=(x,y,z)=>x+CHUNK_SIZE*(z+CHUNK_SIZE*y),data=new Uint8Array(CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);data[index(4,20,4)]=BLOCK.FURNACE;
    const meshPromise=next('mesh');worker.postMessage({type:'mesh',key:'0,0',cx:0,cz:0,version:1,data:data.buffer,px:null,nx:null,pz:null,nz:null},[data.buffer]);const message=await meshPromise;worker.terminate();
    return{
      blockId:BLOCK.FURNACE,readyBlockIds:[...ready.blockIds],legacyOpaqueEmpty:message.opaque.empty,opaqueFaces:message.interpreted.opaque.faceCount,opaqueVertices:message.interpreted.opaque.vertexCount,opaqueIndexBytes:message.interpreted.opaque.indices?.byteLength??0,cutoutEmpty:message.interpreted.cutout.empty,translucentEmpty:message.interpreted.translucent.empty,
      preview:ITEMS['block:21']?.blockPreview??null,faces:ITEMS['block:21']?.blockPreviewFaces??null,ingotTexture:ITEMS.iron_ingot?.texture??null
    };
  });

  expect(runtimeState.blockId).toBe(21);expect(runtimeState.readyBlockIds).toEqual([9,19,20,21]);expect(runtimeState.legacyOpaqueEmpty).toBeTruthy();expect(runtimeState.opaqueFaces).toBe(6);expect(runtimeState.opaqueVertices).toBe(24);expect(runtimeState.opaqueIndexBytes).toBe(36*4);expect(runtimeState.cutoutEmpty).toBeTruthy();expect(runtimeState.translucentEmpty).toBeTruthy();
  expect(runtimeState.preview).toBe('source-faces');expect(runtimeState.faces).toEqual({top:'./assets/items/furnace_top.png',left:'./assets/items/furnace_side.png',right:'./assets/items/furnace_front.png'});expect(runtimeState.ingotTexture).toBe('./assets/items/iron_ingot.png');

  await createSingleplayerWorld(page,{name:'CI Furnace Content',seed:'ci-furnace-content-2026',mode:'creative',prompt:'平原'});await key(page,'KeyE');await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  const furnacePreview=page.locator('#inventory .block-item-icon[data-item-id="block:21"]').first();await expect(furnacePreview).toBeVisible();await expectRenderedBlockItem(furnacePreview);
  await key(page,'Escape');await expect(page.locator('#inventory')).toHaveClass(/hidden/);

  await runCommand(page,'/give iron_ingot 1');await key(page,'KeyE');const ingotSlot=page.locator('#inventory [data-inv-index]').filter({has:page.locator('img.item-icon[src*="assets/items/iron_ingot.png"]')}).first();await expect(ingotSlot).toBeVisible();await expect(ingotSlot).toHaveAttribute('title','铁锭');
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
