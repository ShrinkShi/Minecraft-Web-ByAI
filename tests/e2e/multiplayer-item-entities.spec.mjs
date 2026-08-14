import {test,expect} from '@playwright/test';
import {HOTBAR_START} from '../../src/inventory-layout.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('server item entity renders, despawns and picks up into hotbar before main inventory',async({page})=>{
  const runtime=createAuthoritativeServerRuntime({itemEntityIdFactory:()=> 'i:e2e_pickup',config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-item-entities',seed:'item-entity-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32}});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-item-entities'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();const seeded=runtime.addInventoryItem(session,'stick',1);expect(seeded.changed).toBe(true);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(0)),{timeout:5_000}).toMatchObject({id:'stick',count:1});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(27)),{timeout:5_000}).toBe(null);
    const player=runtime.authoritative.snapshot(session);runtime.spawnItemEntity('stick',1,{x:player.position.x,y:player.position.y+.6,z:player.position.z},{pickupDelay:1.2,velocity:{x:0,y:0,z:0}});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.itemEntities?.().length),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.itemVisuals?.().length),{timeout:5_000}).toBe(1);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:8_000}).toBe(2);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(0)),{timeout:5_000}).toMatchObject({id:'stick',count:1});await expect.poll(()=>page.evaluate(index=>globalThis.__minecraftE2E?.inventorySlot?.(index),HOTBAR_START),{timeout:5_000}).toMatchObject({id:'stick',count:1});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.itemEntities?.().length),{timeout:5_000}).toBe(0);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.itemVisuals?.().length),{timeout:5_000}).toBe(0);
  }finally{await runtime.stop();}
});
