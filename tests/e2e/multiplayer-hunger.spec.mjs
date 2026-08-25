import {test,expect} from '@playwright/test';
import {HOTBAR_START} from '../../src/inventory-layout.js';
import {createHungerState} from '../../src/hunger-rules.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

async function connect(page,runtime,worldId){
  const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
  await page.goto('/?e2e=1');
  await page.getByRole('button',{name:'多人游戏'}).click();
  await page.locator('#multiplayer-url').fill(url);
  await page.locator('#multiplayer-insecure').check();
  await page.getByRole('button',{name:'连接服务器'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId});
}

async function rightDown(canvas){await canvas.dispatchEvent('mousedown',{button:2,bubbles:true});}
async function rightUp(canvas){await canvas.dispatchEvent('mouseup',{button:2,bubbles:true});}

test('multiplayer hunger bootstrap, cancelable food use, inventory commit and HUD stay server-authoritative',async({page})=>{
  const serverErrors=[],pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  const worldId='e2e-multiplayer-hunger',runtime=createAuthoritativeServerRuntime({
    config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId,seed:'multiplayer-hunger-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},
    onError:event=>serverErrors.push(event)
  });
  try{
    await connect(page,runtime,worldId);
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();

    // Deterministic server-side fixture setup. Replication still uses the real
    // authoritative wire paths; only the starting hunger/inventory values are seeded.
    const hungerState=runtime.hungers.state(session);hungerState.hunger=createHungerState({food:10,saturation:0,exhaustion:0,timer:0});hungerState.advanceRevision();runtime.hunger.replicate(session);
    const inventoryState=runtime.inventories.state(session);inventoryState.slots[HOTBAR_START]={id:'bread',count:2};inventoryState.advanceRevision();expect(runtime.server.sendInventorySnapshot(session,inventoryState.snapshot())).not.toBeNull();

    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.hunger?.()),{timeout:5_000}).toMatchObject({food:10,saturation:0,mode:'survival',foodUse:{active:false}});
    await expect(page.locator('#hunger')).toHaveAttribute('data-food','10');
    await expect.poll(()=>page.evaluate(i=>globalThis.__minecraftE2E?.inventorySlot?.(i),HOTBAR_START),{timeout:5_000}).toMatchObject({id:'bread',count:2});

    const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});
    await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');

    // First use is cancelled before the 1.6 second commit boundary.
    await rightDown(canvas);
    await expect.poll(()=>runtime.hungers.snapshot(session).foodUse,{timeout:5_000,intervals:[20,40,80]}).toMatchObject({active:true,itemId:'bread'});
    expect(runtime.hungers.snapshot(session).foodUse.elapsed).toBeLessThan(1.5);
    await rightUp(canvas);
    await expect.poll(()=>runtime.hungers.snapshot(session).foodUse,{timeout:5_000}).toMatchObject({active:false});
    expect(runtime.inventories.snapshot(session).slots[HOTBAR_START]).toEqual({id:'bread',count:2});
    expect(runtime.hungers.snapshot(session).food).toBe(10);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.hunger?.()),{timeout:5_000}).toMatchObject({food:10,foodUse:{active:false}});
    await expect(page.locator('#hunger')).toHaveAttribute('data-food','10');

    // A complete uninterrupted hold commits the food and inventory transaction together.
    await rightDown(canvas);
    await expect.poll(()=>runtime.inventories.snapshot(session).slots[HOTBAR_START],{timeout:5_000,intervals:[100,200,400]}).toEqual({id:'bread',count:1});
    await expect.poll(()=>runtime.hungers.snapshot(session),{timeout:5_000}).toMatchObject({food:15,saturation:6,foodUse:{active:false}});
    await rightUp(canvas);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.hunger?.()),{timeout:5_000}).toMatchObject({food:15,saturation:6,foodUse:{active:false}});
    await expect.poll(()=>page.evaluate(i=>globalThis.__minecraftE2E?.inventorySlot?.(i),HOTBAR_START),{timeout:5_000}).toEqual({id:'bread',count:1});
    await expect(page.locator('#hunger')).toHaveAttribute('data-food','15');

    expect(serverErrors).toEqual([]);expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
  }finally{await runtime.stop();}
});
