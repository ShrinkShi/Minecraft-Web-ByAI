import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {FURNACE_SLOT} from '../../src/smelting.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('multiplayer furnace opens through the real server and smelts through authoritative UI transactions',async({page})=>{
  const errors=[];
  const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-furnace-container',seed:'furnace-container-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},onError:event=>errors.push(event)});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');
    await page.getByRole('button',{name:'多人游戏'}).click();
    await page.locator('#multiplayer-url').fill(url);
    await page.locator('#multiplayer-insecure').check();
    await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-furnace-container'});

    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();
    const player=runtime.authoritative.snapshot(session);expect(player).toBeTruthy();
    const furnace={x:Math.floor(player.position.x),y:Math.floor(player.position.y+1.62),z:Math.floor(player.position.z)-2};
    runtime.setBlock(furnace.x,furnace.y,furnace.z+1,BLOCK.AIR);
    runtime.setBlock(furnace.x,furnace.y,furnace.z,BLOCK.FURNACE);
    await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock?.(x,y,z),furnace),{timeout:5_000}).toBe(BLOCK.FURNACE);

    await page.evaluate(()=>globalThis.__minecraftE2E?.sendUse?.({yaw:0,pitch:0}));
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()),{timeout:5_000}).toMatchObject({target:furnace,revision:0,slots:[null,null,null],lit:false});
    await expect(page.locator('#furnace')).not.toHaveClass(/hidden/);
    await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null),{timeout:5_000}).toBe(true);
    expect(runtime.furnaces.openBySession.size).toBe(1);

    expect(runtime.addInventoryItem(session,'raw_iron',1).changed).toBe(true);
    expect(runtime.addInventoryItem(session,'block:5',2).changed).toBe(true);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(0)),{timeout:5_000}).toEqual({id:'raw_iron',count:1});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(1)),{timeout:5_000}).toEqual({id:'block:5',count:2});

    await page.locator('#furnace [data-inv-index="0"]').click({force:true});
    await page.locator('#furnace [data-furnace-slot="0"]').click({force:true});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()?.slots?.[0]),{timeout:5_000}).toEqual({id:'raw_iron',count:1});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toBe(null);

    await page.locator('#furnace [data-inv-index="1"]').click({force:true});
    await page.locator('#furnace [data-furnace-slot="1"]').click({force:true});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()?.lit),{timeout:5_000}).toBe(true);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()?.cookProgress||0),{timeout:5_000}).toBeGreaterThan(0);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()?.slots?.[2]),{timeout:15_000}).toEqual({id:'iron_ingot',count:1});

    await page.locator('#furnace [data-furnace-output]').click({force:true});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toEqual({id:'iron_ingot',count:1});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()?.slots?.[2]),{timeout:5_000}).toBe(null);

    const serverState=runtime.furnaces.hub.snapshot(furnace);expect(serverState).toBeTruthy();expect(serverState.slots[FURNACE_SLOT.OUTPUT]).toBe(null);
    await page.keyboard.press('e');
    await expect(page.locator('#furnace')).toHaveClass(/hidden/);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()),{timeout:5_000}).toBe(null);
    await expect.poll(()=>runtime.furnaces.openBySession.size,{timeout:5_000}).toBe(0);
    expect(runtime.furnaces.hub.has(furnace)).toBe(true);

    await page.evaluate(()=>globalThis.__minecraftE2E?.sendUse?.({yaw:0,pitch:0}));
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.furnace?.()),{timeout:5_000}).toMatchObject({target:furnace});
    await expect(page.locator('#furnace')).not.toHaveClass(/hidden/);
    expect(runtime.furnaces.openBySession.size).toBe(1);
    expect(errors).toEqual([]);
  }finally{await runtime.stop();}
});
