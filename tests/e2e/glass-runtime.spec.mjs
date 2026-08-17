import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}
async function key(page,code){await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);}
async function lockPointer(page){
  const canvas=page.locator('#game-canvas');
  await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
}
async function expectRenderedBlockItem(preview){
  const canvas=preview.locator('canvas.block-item-canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-render-state','ready');
  const opaque=await canvas.evaluate(element=>{const data=element.getContext('2d').getImageData(0,0,element.width,element.height).data;let count=0;for(let index=3;index<data.length;index+=4)if(data[index])count++;return count;});
  expect(opaque).toBeGreaterThan(40);
}

test('source-backed glass uses translucent Worker mesh, culls shared faces, and renders as a real gameplay item',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');

  const renderState=await page.evaluate(async()=>{
    const [runtimeModule,atlasModule,blocksModule,rendererModule,itemsModule]=await Promise.all([
      import('/src/minecraft-model-runtime.js'),
      import('/src/minecraft-model-texture-binding.js'),
      import('/src/blocks.js'),
      import('/src/minecraft-model-world-renderer.js'),
      import('/src/items.js')
    ]);
    const {loadMinecraftModelRuntime}=runtimeModule;
    const {loadMinecraftModelAtlasResolver}=atlasModule;
    const {BLOCK,CHUNK_SIZE,WORLD_HEIGHT}=blocksModule;
    const {MinecraftModelWorldRenderer}=rendererModule;
    const nextMessage=(worker,expected,timeout=10_000)=>new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cleanup();reject(new Error(`worker timeout waiting for ${expected}`));},timeout);
      const onMessage=event=>{const message=event.data;if(message?.type==='minecraft-model-runtime-error'){cleanup();reject(new Error(message.message));return;}if(message?.type!==expected)return;cleanup();resolve(message);};
      const onError=event=>{cleanup();reject(new Error(event.message||'mesh worker error'));};
      const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError);};
      worker.addEventListener('message',onMessage);worker.addEventListener('error',onError);
    });

    const [runtime,atlasResolver]=await Promise.all([loadMinecraftModelRuntime(),loadMinecraftModelAtlasResolver()]);
    const worker=new Worker('/src/mesh-worker.js',{type:'module'});
    const readyPromise=nextMessage(worker,'minecraft-model-runtime-ready');
    worker.postMessage({type:'minecraft-model-runtime-init',runtime,atlasManifest:atlasResolver.manifest});
    const ready=await readyPromise;
    const index=(x,y,z)=>x+CHUNK_SIZE*(z+CHUNK_SIZE*y),data=new Uint8Array(CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);
    data[index(3,20,4)]=BLOCK.GLASS;
    data[index(4,20,4)]=BLOCK.GLASS;
    const meshPromise=nextMessage(worker,'mesh');
    worker.postMessage({type:'mesh',key:'0,0',cx:0,cz:0,version:1,data:data.buffer,px:null,nx:null,pz:null,nz:null},[data.buffer]);
    const message=await meshPromise;
    worker.terminate();

    const scene={children:[],add(object){this.children.push(object);},remove(object){this.children=this.children.filter(entry=>entry!==object);}};
    const renderer=new MinecraftModelWorldRenderer(scene);
    renderer.handleWorkerMessage(ready);
    const meshes=renderer.makeChunkMeshes(message.interpreted,0,0),glassMesh=meshes?.translucent||null;
    const state={
      readyBlockIds:[...ready.blockIds],
      legacyOpaqueEmpty:message.opaque.empty,
      interpretedOpaqueEmpty:message.interpreted.opaque.empty,
      cutoutEmpty:message.interpreted.cutout.empty,
      translucentFaces:message.interpreted.translucent.faceCount,
      translucentVertices:message.interpreted.translucent.vertexCount,
      translucentIndexBytes:message.interpreted.translucent.indices?.byteLength??0,
      meshName:glassMesh?.name||null,
      transparent:glassMesh?.material?.transparent??null,
      opacity:glassMesh?.material?.opacity??null,
      depthWrite:glassMesh?.material?.depthWrite??null,
      renderOrder:glassMesh?.renderOrder??null,
      sharedMaterial:glassMesh?.material===renderer.materials.translucent,
      assetKey:glassMesh?.material?.map?.userData?.assetKey||null,
      childCount:scene.children.length,
      itemTexture:itemsModule.ITEMS['block:20']?.texture||null,
      itemPreview:itemsModule.ITEMS['block:20']?.blockPreview||null
    };
    renderer.disposeChunkMeshes(meshes);state.childrenAfterChunkDispose=scene.children.length;renderer.dispose();
    return state;
  });

  expect(renderState.readyBlockIds).toEqual([9,19,20]);
  expect(renderState.legacyOpaqueEmpty).toBe(true);
  expect(renderState.interpretedOpaqueEmpty).toBe(true);
  expect(renderState.cutoutEmpty).toBe(true);
  expect(renderState.translucentFaces).toBe(10);
  expect(renderState.translucentVertices).toBe(40);
  expect(renderState.translucentIndexBytes).toBe(60*4);
  expect(renderState.meshName).toBe('chunk-model-translucent:0,0');
  expect(renderState.transparent).toBe(true);
  expect(renderState.opacity).toBe(1);
  expect(renderState.depthWrite).toBe(false);
  expect(renderState.renderOrder).toBe(2);
  expect(renderState.sharedMaterial).toBe(true);
  expect(renderState.assetKey).toBe('block.model_atlas');
  expect(renderState.childCount).toBe(1);
  expect(renderState.childrenAfterChunkDispose).toBe(0);
  expect(renderState.itemTexture).toBe('./assets/items/glass.png');
  expect(renderState.itemPreview).toBe('source-texture');

  await createSingleplayerWorld(page,{name:'CI Glass Runtime',seed:'ci-glass-runtime-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give glass 1');
  await key(page,'KeyE');
  await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  const glassItem=page.locator('#inventory-grid [data-inv-index]').filter({has:page.locator('.block-item-icon[data-item-id="block:20"]')}).first();
  await expect(glassItem).toBeVisible();
  const inventoryPreview=glassItem.locator('.block-item-icon[data-item-id="block:20"]');
  await expect(inventoryPreview).toBeVisible();
  await expectRenderedBlockItem(inventoryPreview);
  await glassItem.click({modifiers:['Shift']});
  await key(page,'Escape');
  await expect(page.locator('#inventory')).toHaveClass(/hidden/);
  const selected=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(selected).toHaveAttribute('title','玻璃');
  const hotbarPreview=selected.locator('.block-item-icon[data-item-id="block:20"]');
  await expect(hotbarPreview).toBeVisible();
  await expectRenderedBlockItem(hotbarPreview);

  await lockPointer(page);
  const target=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(20)||null);
  expect(target).not.toBeNull();expect(target.id).toBe(20);
  await expect(page.locator('#jade-hud')).not.toHaveClass(/hidden/,{timeout:5_000});
  await expect(page.locator('#jade-hud .jade-name')).toHaveText('玻璃');
  await page.mouse.down({button:'left'});
  await expect(page.locator('#jade-hud')).toHaveClass(/hidden/,{timeout:5_000});
  await page.mouse.up({button:'left'});
  await expect(selected).toHaveAttribute('title','玻璃');
  await expect(page.locator('#debug')).toContainText('Drops 0',{timeout:5_000});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
