import {test,expect} from '@playwright/test';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('multiplayer slash command mutates inventory only through authoritative server result',async({page})=>{
  const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],allowCommands:true,worldId:'e2e-authoritative-command',seed:'command-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},onError:event=>errors.push(event)});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-authoritative-command'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();expect(runtime.inventories.snapshot(session).revision).toBe(0);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.())).toBe(0);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(0))).toBe(null);

    const wrap=page.locator('#chat-input-wrap'),input=page.locator('#chat-input');await page.keyboard.press('/');await expect(wrap).not.toHaveClass(/hidden/);await expect(input).toBeFocused();await expect(input).toHaveValue('/');await input.fill('/give stick 3');await page.keyboard.press('Enter');
    await expect(wrap).toHaveClass(/hidden/);await expect.poll(()=>runtime.inventories.snapshot(session).revision,{timeout:5_000}).toBe(1);expect(runtime.inventories.snapshot(session).slots[0]).toMatchObject({id:'stick',count:3});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(0)),{timeout:5_000}).toMatchObject({id:'stick',count:3});await expect(page.locator('#chat-log')).toContainText('给予 木棍 × 3');expect(errors).toEqual([]);
  }finally{await runtime.stop();}
});
