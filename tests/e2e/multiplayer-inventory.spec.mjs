import {test,expect} from '@playwright/test';
import {HOTBAR_START} from '../../src/inventory-layout.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('browser inventory follows live server revisions instead of local truth',async({page})=>{
  const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-live-inventory',seed:'live-inventory-seed',prompt:'plains',mode:'creative',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32}});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-live-inventory'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();
    await expect.poll(()=>page.evaluate(index=>globalThis.__minecraftE2E?.inventoryRevision?.(),HOTBAR_START),{timeout:5_000}).toBe(0);
    await expect.poll(()=>page.evaluate(index=>globalThis.__minecraftE2E?.inventorySlot?.(index),HOTBAR_START),{timeout:5_000}).toMatchObject({id:'block:1',count:64});

    const mutation=runtime.removeInventoryItem(session,HOTBAR_START,64);expect(mutation.changed).toBe(true);expect(mutation.replicated).toBe(true);expect(mutation.snapshot.revision).toBe(1);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(index=>globalThis.__minecraftE2E?.inventorySlot?.(index),HOTBAR_START),{timeout:5_000}).toBe(null);
  }finally{await runtime.stop();}
});
