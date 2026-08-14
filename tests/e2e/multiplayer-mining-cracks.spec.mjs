import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {PLAYER_EYE_HEIGHT} from '../../src/player-environment-rules.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

async function lockPointerAndSetView(page,yaw=0,pitch=0){
  const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});
}

test('authoritative mining cracks follow an exact server target/stage and reset on release',async({page})=>{
  let tick=null;const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-mining-cracks',seed:'mining-cracks-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:callback=>(tick=callback,{timer:'manual-mining-cracks'}),clearIntervalFn:()=>{}});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-mining-cracks'});
    const [session]=[...runtime.authoritative.sessions];expect(session).toBeTruthy();const beforeLock=runtime.server.getSessionInputState(session)?.control?.sequence??-1;await lockPointerAndSetView(page);await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.sequence??-1,{timeout:5_000}).toBeGreaterThan(beforeLock);await expect.poll(()=>runtime.server.getSessionInputState(session)?.view?.yaw,{timeout:5_000}).toBe(0);await expect.poll(()=>runtime.server.getSessionInputState(session)?.view?.pitch,{timeout:5_000}).toBe(0);
    const player=runtime.authoritative.snapshot(session),x=Math.floor(player.position.x),y=Math.floor(player.position.y+PLAYER_EYE_HEIGHT),z=Math.floor(player.position.z)-1;runtime.setBlock(x,y,z,BLOCK.AIR);const placed=runtime.setBlock(x,y,z,BLOCK.LOG);expect(placed.changed).toBe(true);await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x,y,z}),{timeout:5_000}).toBe(BLOCK.LOG);await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.miningCrack?.()?.visible??false)).toBe(false);
    await page.mouse.down({button:'left'});await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.primary,{timeout:5_000}).toBe(true);
    for(let i=0;i<4;i++)tick();expect(runtime.authoritative.snapshot(session).tick).toBe(4);expect(runtime.survivalBreak.progress(session)?.progress).toBeGreaterThan(.1);expect(runtime.world.getBlock(x,y,z)).toBe(BLOCK.LOG);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.miningCrack?.()),{timeout:5_000}).toMatchObject({visible:true,stage:1,target:{x,y,z,id:BLOCK.LOG}});await expect(page.locator('#break-meter')).not.toHaveClass(/hidden/);
    await page.mouse.up({button:'left'});await expect.poll(()=>runtime.server.getSessionInputState(session)?.control?.primary,{timeout:5_000}).toBe(false);tick();expect(runtime.authoritative.snapshot(session).tick).toBe(5);expect(runtime.survivalBreak.progress(session)).toBeNull();expect(runtime.world.getBlock(x,y,z)).toBe(BLOCK.LOG,'release before completion must not mutate the world');await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.miningCrack?.()?.visible??false),{timeout:5_000}).toBe(false);await expect(page.locator('#break-meter')).toHaveClass(/hidden/);
  }finally{await runtime.stop();}
});
