import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {HOTBAR_START} from '../../src/inventory-layout.js';
import {PLAYER_EYE_HEIGHT} from '../../src/player-environment-rules.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

async function setViewAndLock(page,yaw,pitch=0){
  const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});
}

test('holding primary renders server mining progress/cracks, breaks the block, and returns the drop through authoritative inventory',async({page})=>{
  const runtime=createAuthoritativeServerRuntime({itemEntityIdFactory:()=> 'i:browser_mining',config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-survival-mining',seed:'e2e-survival-mining-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32}});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-survival-mining'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();const beforeLockSequence=runtime.server.getSessionInputState(session)?.control?.sequence??-1;await setViewAndLock(page,0,0);await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.sequence??-1,{timeout:5_000}).toBeGreaterThan(beforeLockSequence);await expect.poll(()=>runtime.server.getSessionInputState(session)?.view?.yaw,{timeout:5_000}).toBe(0);await expect.poll(()=>runtime.server.getSessionInputState(session)?.view?.pitch,{timeout:5_000}).toBe(0);
    const player=runtime.authoritative.snapshot(session),x=Math.floor(player.position.x),y=Math.floor(player.position.y+PLAYER_EYE_HEIGHT),z=Math.floor(player.position.z)-1;runtime.setBlock(x,y,z,BLOCK.AIR);const change=runtime.setBlock(x,y,z,BLOCK.LOG);expect(change.changed).toBe(true);await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x,y,z}),{timeout:5_000}).toBe(BLOCK.LOG);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.miningCrack?.()?.visible??false)).toBe(false);
    const breakMeter=page.locator('#break-meter');await expect(breakMeter).toHaveClass(/hidden/);
    await page.mouse.down({button:'left'});await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.primary,{timeout:5_000}).toBe(true);await page.waitForTimeout(120);await expect(page.locator('#toast')).not.toContainText('联机方块/战斗权威尚未接入');await expect.poll(()=>runtime.survivalBreak.progress(session)?.progress||0,{timeout:2_000}).toBeGreaterThan(0);
    await expect(breakMeter).not.toHaveClass(/hidden/,{timeout:2_000});await expect.poll(()=>page.evaluate(()=>parseFloat(document.querySelector('#break-meter span')?.style.width||'0')),{timeout:2_000}).toBeGreaterThan(0);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.miningCrack?.()),{timeout:2_000}).toMatchObject({visible:true,target:{x,y,z,id:BLOCK.LOG}});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.miningCrack?.()?.stage??-1),{timeout:2_000}).toBeGreaterThanOrEqual(1);
    await expect.poll(()=>runtime.world.getBlock(x,y,z),{timeout:4_000}).toBe(BLOCK.AIR);await page.mouse.up({button:'left'});await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.primary,{timeout:5_000}).toBe(false);await expect(breakMeter).toHaveClass(/hidden/,{timeout:2_000});await expect.poll(()=>page.evaluate(()=>parseFloat(document.querySelector('#break-meter span')?.style.width||'0')),{timeout:2_000}).toBe(0);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.miningCrack?.()?.visible??false),{timeout:2_000}).toBe(false);
    await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x,y,z}),{timeout:5_000}).toBe(BLOCK.AIR);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.inventoryRevision?.()),{timeout:5_000}).toBe(1);await expect.poll(()=>page.evaluate(index=>globalThis.__minecraftE2E?.inventorySlot?.(index),HOTBAR_START),{timeout:5_000}).toMatchObject({id:'block:6',count:1});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.itemEntities?.().length),{timeout:5_000}).toBe(0);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.itemVisuals?.().length),{timeout:5_000}).toBe(0);
  }finally{await runtime.stop();}
});
