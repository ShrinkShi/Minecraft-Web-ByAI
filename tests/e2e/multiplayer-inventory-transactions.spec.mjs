import {test,expect} from '@playwright/test';
import {HOTBAR_START} from '../../src/inventory-layout.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('multiplayer inventory slot clicks round-trip through server authority while crafting stays fail-closed',async({page})=>{
  const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-inventory-transactions',seed:'inventory-transaction-seed',prompt:'plains',mode:'creative',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},onError:event=>errors.push(event)});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-inventory-transactions'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:5_000}).toBe(0);await expect.poll(()=>page.evaluate(i=>globalThis.__minecraftE2E?.inventorySlot?.(i),HOTBAR_START),{timeout:5_000}).toMatchObject({id:'block:1',count:64});

    const inventoryPanel=page.locator('#inventory');await page.keyboard.press('e');await expect(inventoryPanel).not.toHaveClass(/hidden/);const hotbarSlot=page.locator(`#inventory [data-inv-index="${HOTBAR_START}"]`);await hotbarSlot.click({force:true});
    await expect.poll(()=>runtime.inventories.snapshot(session).revision,{timeout:5_000}).toBe(1);expect(runtime.inventories.snapshot(session).slots[HOTBAR_START]).toBe(null);expect(runtime.inventories.snapshot(session).cursor).toEqual({id:'block:1',count:64});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toEqual({id:'block:1',count:64});await expect.poll(()=>page.evaluate(i=>globalThis.__minecraftE2E?.inventorySlot?.(i),HOTBAR_START),{timeout:5_000}).toBe(null);

    const revisionBeforeBlockedClick=runtime.inventories.snapshot(session).revision;await page.locator('#inventory [data-craft-index="0"]').click({force:true});await expect(page.locator('#toast')).toContainText('联机合成事务尚未服务端化');await page.waitForTimeout(150);expect(runtime.inventories.snapshot(session).revision).toBe(revisionBeforeBlockedClick);expect(runtime.inventories.snapshot(session).cursor).toEqual({id:'block:1',count:64});

    await hotbarSlot.click({force:true});await expect.poll(()=>runtime.inventories.snapshot(session).revision,{timeout:5_000}).toBe(2);expect(runtime.inventories.snapshot(session).slots[HOTBAR_START]).toEqual({id:'block:1',count:64});expect(runtime.inventories.snapshot(session).cursor).toBe(null);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toBe(null);expect(errors).toEqual([]);
  }finally{await runtime.stop();}
});
