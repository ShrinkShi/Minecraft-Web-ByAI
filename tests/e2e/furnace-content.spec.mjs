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
async function leaveSingleplayerWorld(page){
  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await page.locator('#return-main-button').click();
  await expect(page.locator('#main-menu')).toHaveClass(/active/,{timeout:10_000});
  await expect(page.locator('#hud')).toHaveClass(/hidden/);
}

const FARMING_MODEL_BLOCK_IDS=[9,19,20,21,24,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43];

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

  expect(runtimeState.blockId).toBe(21);expect(runtimeState.readyBlockIds).toEqual(FARMING_MODEL_BLOCK_IDS);expect(runtimeState.legacyOpaqueEmpty).toBeTruthy();expect(runtimeState.opaqueFaces).toBe(6);expect(runtimeState.opaqueVertices).toBe(24);expect(runtimeState.opaqueIndexBytes).toBe(36*4);expect(runtimeState.cutoutEmpty).toBeTruthy();expect(runtimeState.translucentEmpty).toBeTruthy();
  expect(runtimeState.preview).toBe('source-faces');expect(runtimeState.faces).toEqual({top:'./assets/items/furnace_top.png',left:'./assets/items/furnace_side.png',right:'./assets/items/furnace_front.png'});expect(runtimeState.ingotTexture).toBe('./assets/items/iron_ingot.png');

  await createSingleplayerWorld(page,{name:'CI Furnace Content',seed:'ci-furnace-content-2026',mode:'creative',prompt:'平原'});await key(page,'KeyE');await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  const furnacePreview=page.locator('#inventory .block-item-icon[data-item-id="block:21"]').first();await expect(furnacePreview).toBeVisible();await expectRenderedBlockItem(furnacePreview);
  await key(page,'Escape');await expect(page.locator('#inventory')).toHaveClass(/hidden/);

  await runCommand(page,'/gamemode survival');
  await runCommand(page,'/give iron_ingot 1');await key(page,'KeyE');const ingotSlot=page.locator('#inventory [data-inv-index]').filter({has:page.locator('img.item-icon[src*="assets/items/iron_ingot.png"]')}).first();await expect(ingotSlot).toBeVisible();await expect(ingotSlot).toHaveAttribute('title','铁锭');
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});

test('authoritative furnace UI uses vanilla texture and accepts same-revision progress snapshots',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Furnace UI',seed:'ci-furnace-ui-2026',mode:'survival',prompt:'平原'});

  // #117 gives every live singleplayer world a real local Furnace authority.
  // This test intentionally replaces it with a recording sender, so leave the
  // world through the production lifecycle first instead of weakening the
  // one-authority invariant in furnace-channel.js.
  await leaveSingleplayerWorld(page);

  await page.evaluate(async()=>{
    const channel=await import('/src/multiplayer-furnace-channel.js');
    window.__furnaceUiActions=[];
    window.__releaseFurnaceUiTestSender=channel.attachMultiplayerFurnaceSender(action=>{window.__furnaceUiActions.push(structuredClone(action));return action;});
    channel.publishMultiplayerFurnaceSnapshot({version:1,kind:'furnace-container-snapshot',session:'s:ui-test',target:{x:1,y:64,z:2},revision:7,slots:[{id:'raw_iron',count:2},{id:'block:5',count:1},null],burnRemaining:150,burnTotal:300,cookProgress:50,cookTotal:200,storedExperience:0,lit:true});
  });

  const furnace=page.locator('#furnace');await expect(furnace).not.toHaveClass(/hidden/);await expect(furnace.locator('.furnace-input')).toBeVisible();await expect(furnace.locator('.furnace-fuel')).toBeVisible();await expect(furnace.locator('.furnace-output')).toBeVisible();
  const background=await furnace.locator('.furnace-panel').evaluate(element=>getComputedStyle(element).backgroundImage);expect(background).toContain('MC%E5%8E%9F%E7%89%88%E7%B4%A0%E6%9D%90assets/minecraft/textures/gui/container/furnace.png');
  await expect(furnace.locator('.furnace-input')).toHaveAttribute('data-furnace-slot','0');await expect(furnace.locator('.furnace-fuel')).toHaveAttribute('data-furnace-slot','1');await expect(furnace.locator('.furnace-output')).toHaveAttribute('data-furnace-output','');
  const before=await furnace.locator('.furnace-cook-clip').evaluate(element=>getComputedStyle(element).width);expect(parseFloat(before)).toBeGreaterThan(0);await furnace.locator('.furnace-input').evaluate(element=>element.dataset.timerIdentity='preserve-me');

  await page.evaluate(async()=>{const channel=await import('/src/multiplayer-furnace-channel.js');channel.publishMultiplayerFurnaceSnapshot({version:1,kind:'furnace-container-snapshot',session:'s:ui-test',target:{x:1,y:64,z:2},revision:7,slots:[{id:'raw_iron',count:2},{id:'block:5',count:1},null],burnRemaining:149,burnTotal:300,cookProgress:100,cookTotal:200,storedExperience:0,lit:true});});
  await expect.poll(async()=>parseFloat(await furnace.locator('.furnace-cook-clip').evaluate(element=>getComputedStyle(element).width))).toBeGreaterThan(parseFloat(before));
  await expect(furnace.locator('.furnace-status')).toContainText('50%');await expect(furnace.locator('.furnace-input')).toHaveAttribute('data-timer-identity','preserve-me');

  await furnace.locator('.furnace-input').dispatchEvent('pointerdown',{button:0,shiftKey:false});await furnace.locator('.furnace-output').dispatchEvent('pointerdown',{button:2,shiftKey:true});
  await key(page,'Escape');await expect(furnace).toHaveClass(/hidden/);
  let actions=await page.evaluate(()=>window.__furnaceUiActions);expect(actions).toEqual([{type:'slot-click',slot:0,button:0,shift:false},{type:'take-output',button:2,shift:true},{type:'close'}]);

  await page.evaluate(async()=>{const channel=await import('/src/multiplayer-furnace-channel.js');channel.publishMultiplayerFurnaceSnapshot({version:1,kind:'furnace-container-snapshot',session:'s:ui-test',target:{x:1,y:64,z:2},revision:7,slots:[{id:'raw_iron',count:2},{id:'block:5',count:1},null],burnRemaining:148,burnTotal:300,cookProgress:101,cookTotal:200,storedExperience:0,lit:true});});
  await expect(furnace).toHaveClass(/hidden/);

  await page.evaluate(async()=>{const channel=await import('/src/multiplayer-furnace-channel.js');channel.publishMultiplayerFurnaceClose({version:1,kind:'furnace-container-close',session:'s:ui-test',target:{x:1,y:64,z:2},reason:'client-closed'});window.__releaseFurnaceUiTestSender?.();delete window.__releaseFurnaceUiTestSender;});
  await expect(furnace).toHaveClass(/hidden/);expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
