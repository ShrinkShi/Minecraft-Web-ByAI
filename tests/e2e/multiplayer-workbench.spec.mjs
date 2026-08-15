import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('multiplayer workbench opens from server use and keeps 3x3 crafting authoritative',async({page})=>{
  const errors=[];
  const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-workbench-container',seed:'workbench-container-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},onError:event=>errors.push(event)});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');
    await page.getByRole('button',{name:'多人游戏'}).click();
    await page.locator('#multiplayer-url').fill(url);
    await page.locator('#multiplayer-insecure').check();
    await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-workbench-container'});

    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();
    const player=runtime.authoritative.snapshot(session);expect(player).toBeTruthy();
    const table={x:Math.floor(player.position.x),y:Math.floor(player.position.y+1.62),z:Math.floor(player.position.z)-2};
    runtime.setBlock(table.x,table.y,table.z+1,BLOCK.AIR);
    runtime.setBlock(table.x,table.y,table.z,BLOCK.CRAFTING_TABLE);
    await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock?.(x,y,z),table),{timeout:5_000}).toBe(BLOCK.CRAFTING_TABLE);

    await page.evaluate(()=>globalThis.__minecraftE2E?.sendUse?.({yaw:0,pitch:0}));
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.workbench?.()),{timeout:5_000}).toMatchObject({target:table,revision:0});
    await expect(page.locator('#workbench')).not.toHaveClass(/hidden/);
    expect(runtime.workbenches.hub.sessionCount).toBe(1);

    const added=runtime.addInventoryItem(session,'block:6',1);expect(added.changed).toBe(true);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventorySlot?.(0)),{timeout:5_000}).toEqual({id:'block:6',count:1});
    const inventorySlot=page.locator('#workbench [data-inv-index="0"]'),inputSlot=page.locator('#workbench [data-craft-size="3"][data-craft-index="0"]'),resultSlot=page.locator('#craft-result-3 [data-craft-result="3"]');
    await inventorySlot.click({force:true});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toEqual({id:'block:6',count:1});
    await inputSlot.click({force:true});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.workbench?.()),{timeout:5_000}).toMatchObject({revision:1,slots:[{id:'block:6',count:1},null,null,null,null,null,null,null,null],result:{id:'block:5',count:4}});
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryCursor?.()),{timeout:5_000}).toBe(null);

    await resultSlot.click({force:true});
    await page.keyboard.press('e');
    await expect(page.locator('#workbench')).toHaveClass(/hidden/);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.workbench?.()),{timeout:5_000}).toBe(null);
    await expect.poll(()=>runtime.workbenches.hub.sessionCount,{timeout:5_000}).toBe(0);
    await expect.poll(()=>runtime.inventories.snapshot(session).cursor,{timeout:5_000}).toBe(null);
    await expect.poll(()=>runtime.inventories.snapshot(session).slots.some(stack=>stack?.id==='block:5'&&stack.count===4),{timeout:5_000}).toBe(true);

    await page.evaluate(()=>globalThis.__minecraftE2E?.sendUse?.({yaw:0,pitch:0}));
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.workbench?.()),{timeout:5_000}).not.toBe(null);
    await expect(page.locator('#workbench')).not.toHaveClass(/hidden/);
    runtime.setBlock(table.x,table.y,table.z,BLOCK.AIR);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.workbench?.()),{timeout:5_000}).toBe(null);
    await expect(page.locator('#workbench')).toHaveClass(/hidden/);
    expect(runtime.workbenches.hub.sessionCount).toBe(0);
    expect(errors).toEqual([]);
  }finally{await runtime.stop();}
});
