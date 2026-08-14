import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {HOTBAR_START} from '../../src/inventory-layout.js';
import {PLAYER_EYE_HEIGHT} from '../../src/player-environment-rules.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

async function lockPointerAndSetView(page,yaw=0,pitch=0){
  const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});
}

function setStoneTarget(runtime,session){const player=runtime.authoritative.snapshot(session),x=Math.floor(player.position.x),y=Math.floor(player.position.y+PLAYER_EYE_HEIGHT),z=Math.floor(player.position.z)-1;runtime.setBlock(x,y,z,BLOCK.AIR);runtime.setBlock(x,y,z,BLOCK.STONE);return{x,y,z};}

test('server wooden-pickaxe wear updates the hotbar durability bar and final use removes the tool',async({page})=>{
  let tick=null;const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-tool-durability',seed:'tool-durability-e2e',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:callback=>(tick=callback,{timer:'manual-tool-durability'}),clearIntervalFn:()=>{}});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-tool-durability'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();const seeded=runtime.addInventoryStack(session,{id:'wooden_pickaxe',count:1,damage:57},{pickup:true});expect(seeded.remaining).toBe(0);expect(seeded.snapshot.slots[HOTBAR_START]).toEqual({id:'wooden_pickaxe',count:1,damage:57});
    const slot0=page.locator('#hotbar [data-hotbar-index="0"]');await expect(slot0).toHaveAttribute('data-durability-damage','57',{timeout:5_000});await expect(slot0).toHaveAttribute('data-durability-remaining','2');await expect(slot0).toHaveAttribute('data-durability-maximum','59');await expect(slot0.locator('.slot-durability')).toHaveCount(1);await expect.poll(()=>page.evaluate(()=>parseFloat(document.querySelector('#hotbar [data-hotbar-index="0"] .slot-durability > span')?.style.width||'0'))).toBeGreaterThan(3);
    const beforeLock=runtime.server.getSessionInputState(session)?.control?.sequence??-1;await lockPointerAndSetView(page);await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.sequence??-1,{timeout:5_000}).toBeGreaterThan(beforeLock);await expect.poll(()=>runtime.server.getSessionInputState(session)?.view?.yaw,{timeout:5_000}).toBe(0);
    let target=setStoneTarget(runtime,session);await page.mouse.down({button:'left'});await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.primary,{timeout:5_000}).toBe(true);for(let i=0;i<6;i++)tick();expect(runtime.world.getBlock(target.x,target.y,target.z)).toBe(BLOCK.AIR);expect(runtime.inventories.snapshot(session).slots[HOTBAR_START]).toEqual({id:'wooden_pickaxe',count:1,damage:58});await expect(slot0).toHaveAttribute('data-durability-damage','58',{timeout:5_000});await expect(slot0).toHaveAttribute('data-durability-remaining','1');await expect.poll(()=>page.evaluate(()=>parseFloat(document.querySelector('#hotbar [data-hotbar-index="0"] .slot-durability > span')?.style.width||'0'))).toBeLessThan(2);
    await page.mouse.up({button:'left'});await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.primary,{timeout:5_000}).toBe(false);tick();
    target=setStoneTarget(runtime,session);await page.mouse.down({button:'left'});await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.primary,{timeout:5_000}).toBe(true);for(let i=0;i<6;i++)tick();expect(runtime.world.getBlock(target.x,target.y,target.z)).toBe(BLOCK.AIR);expect(runtime.inventories.snapshot(session).slots.some(stack=>stack?.id==='wooden_pickaxe')).toBe(false,'59th successful use must remove the wooden pickaxe instance');await page.mouse.up({button:'left'});await expect.poll(()=>page.evaluate(index=>globalThis.__minecraftE2E?.inventorySlot?.(index),HOTBAR_START),{timeout:5_000}).toBeNull();await expect(slot0.locator('.slot-durability')).toHaveCount(0);await expect(slot0).not.toHaveAttribute('data-durability-remaining',/./);
  }finally{await runtime.stop();}
});
