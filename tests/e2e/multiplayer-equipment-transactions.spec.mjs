import {test,expect} from '@playwright/test';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('multiplayer equipment exchanges atomically with the authoritative inventory cursor',async({page})=>{
  const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-equipment-transactions',seed:'equipment-transaction-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},onError:event=>errors.push(event)});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-equipment-transactions'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.equipmentRevision?.()),{timeout:5_000}).toBe(0);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.equipmentSlot?.('head')),{timeout:5_000}).toBe(null);

    const given=runtime.addInventoryItem(session,'leather_helmet',1);expect(given.changed).toBe(true);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(0)),{timeout:5_000}).toEqual({id:'leather_helmet',count:1});
    await page.keyboard.press('e');await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);const inventorySlot=page.locator('#inventory [data-inv-index="0"]'),headSlot=page.locator('#inventory [data-equipment-slot="head"]');await inventorySlot.click({force:true});
    await expect.poll(()=>runtime.inventories.snapshot(session).revision,{timeout:5_000}).toBe(2);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toEqual({id:'leather_helmet',count:1});

    await headSlot.click({force:true});await expect.poll(()=>runtime.equipments.snapshot(session).revision,{timeout:5_000}).toBe(1);expect(runtime.inventories.snapshot(session).revision).toBe(3);expect(runtime.inventories.snapshot(session).cursor).toBe(null);expect(runtime.equipments.snapshot(session).slots.head).toEqual({id:'leather_helmet',count:1});expect(runtime.equipments.armorPoints(session)).toBe(1);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.equipmentRevision?.()),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.equipmentSlot?.('head')),{timeout:5_000}).toEqual({id:'leather_helmet',count:1});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toBe(null);await expect(headSlot).toHaveAttribute('aria-label',/皮革帽子/);

    await headSlot.click({force:true});await expect.poll(()=>runtime.equipments.snapshot(session).revision,{timeout:5_000}).toBe(2);expect(runtime.inventories.snapshot(session).revision).toBe(4);expect(runtime.equipments.snapshot(session).slots.head).toBe(null);expect(runtime.inventories.snapshot(session).cursor).toEqual({id:'leather_helmet',count:1});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.equipmentSlot?.('head')),{timeout:5_000}).toBe(null);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toEqual({id:'leather_helmet',count:1});expect(errors).toEqual([]);
  }finally{await runtime.stop();}
});
