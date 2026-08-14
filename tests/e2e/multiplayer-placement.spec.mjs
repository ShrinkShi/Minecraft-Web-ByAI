import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {PLAYER_EYE_HEIGHT} from '../../src/player-environment-rules.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

async function setViewAndLock(page,yaw,pitch=0){
  const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
  await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});await page.waitForTimeout(100);
}

test('creative browser secondary waits for authoritative tick before placing a block',async({page})=>{
  let tick=null;
  const runtime=createAuthoritativeServerRuntime({
    config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-authoritative-placement',seed:'placement-e2e-seed',prompt:'plains',mode:'creative',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},
    setIntervalFn:callback=>(tick=callback,{timer:'manual-e2e-placement'}),clearIntervalFn:()=>{}
  });
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-authoritative-placement'});

    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();const snapshot=runtime.authoritative.snapshot(session),position=snapshot.position,x=Math.floor(position.x),y=Math.floor(position.y+PLAYER_EYE_HEIGHT),anchorZ=Math.floor(position.z)-2,placeZ=anchorZ+1;
    runtime.setBlock(x,y,placeZ,BLOCK.AIR);runtime.setBlock(x,y,anchorZ,BLOCK.STONE);
    await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x,y,z:anchorZ}),{timeout:5_000}).toBe(BLOCK.STONE);await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x,y,z:placeZ}),{timeout:5_000}).toBe(BLOCK.AIR);

    await setViewAndLock(page,0,0);const canvas=page.locator('#game-canvas');await canvas.click({button:'right',position:{x:40,y:40}});
    await expect.poll(()=>runtime.server.getSessionInputState(session)?.pendingActionCount,{timeout:5_000}).toBe(1);
    expect(runtime.world.getBlock(x,y,placeZ)).toBe(BLOCK.AIR);expect(await page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x,y,z:placeZ})).toBe(BLOCK.AIR);

    tick();await expect.poll(()=>runtime.world.getBlock(x,y,placeZ),{timeout:5_000}).toBe(BLOCK.GRASS);await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x,y,z:placeZ}),{timeout:5_000}).toBe(BLOCK.GRASS);expect(runtime.server.getSessionInputState(session).pendingActionCount).toBe(0);
  }finally{await runtime.stop();}
});
