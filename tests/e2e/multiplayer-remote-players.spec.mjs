import {test,expect} from '@playwright/test';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

async function connect(page,url,worldId){
  await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId});
}
async function remoteStates(page){return page.evaluate(()=>globalThis.__minecraftE2E?.remotePlayers?.()??null);}
async function setViewAndLock(page,yaw,pitch=0){const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});await page.waitForTimeout(100);}

test('two browsers render, interpolate and despawn each other by public playerId',async({browser})=>{
  let nextPlayer=0;const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-remote-world',seed:'golden-seed',prompt:'mountain forest',mode:'survival',spawnX:33,spawnZ:-17,prefetchRadius:1,terrainCacheChunks:32},playerIdFactory:()=>`p:e2e-${++nextPlayer}`});
  const contextA=await browser.newContext({baseURL:ORIGIN}),contextB=await browser.newContext({baseURL:ORIGIN});const pageA=await contextA.newPage(),pageB=await contextB.newPage();
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;await connect(pageA,url,'e2e-remote-world');await expect.poll(()=>remoteStates(pageA)).toEqual([]);
    await connect(pageB,url,'e2e-remote-world');
    await expect.poll(()=>remoteStates(pageA),{timeout:10_000}).toMatchObject([{playerId:'p:e2e-2'}]);await expect.poll(()=>remoteStates(pageB),{timeout:10_000}).toMatchObject([{playerId:'p:e2e-1'}]);
    const before=(await remoteStates(pageA))[0];expect(before.position.x).toBeCloseTo(33.5,1);

    await setViewAndLock(pageB,Math.PI/2,0);await pageB.keyboard.down('w');await pageB.waitForTimeout(800);await pageB.keyboard.up('w');
    await expect.poll(async()=>{const state=(await remoteStates(pageA))?.find(value=>value.playerId==='p:e2e-2');return state?.position.x??null;},{timeout:10_000}).toBeLessThan(before.position.x-1.3);
    const after=(await remoteStates(pageA)).find(value=>value.playerId==='p:e2e-2');expect(Math.abs(after.position.z-before.position.z)).toBeLessThan(.8);expect(after.tick).toBeGreaterThan(before.tick);

    await pageB.close();await expect.poll(()=>remoteStates(pageA),{timeout:10_000}).toEqual([]);expect(runtime.replication.sessionCount).toBe(1);
  }finally{await contextB.close().catch(()=>{});await contextA.close().catch(()=>{});await runtime.stop();}
});
