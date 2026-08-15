import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

async function debugXYZ(page){
  const text=await page.locator('#debug').innerText(),match=text.match(/XYZ\s+([-\d.]+)\s*\/\s*([-\d.]+)\s*\/\s*([-\d.]+)/);
  if(!match)throw new Error(`missing XYZ in debug text: ${text}`);
  return{x:Number(match[1]),y:Number(match[2]),z:Number(match[3]),text};
}

async function setViewAndLock(page,yaw,pitch=0){
  const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
  await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});await page.waitForTimeout(100);
}

test('real browser movement and live blocks are driven by the authoritative Node server',async({page})=>{
  const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-authoritative-world',seed:'golden-seed',prompt:'mountain forest',mode:'survival',spawnX:33,spawnZ:-17,prefetchRadius:1,terrainCacheChunks:32}});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();
    await expect(page.locator('#multiplayer-menu')).toHaveClass(/active/);await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
    await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-authoritative-world'});
    const start=await debugXYZ(page);expect(start.x).toBeCloseTo(33.5,1);expect(start.z).toBeCloseTo(-16.5,1);expect(start.text).toContain('Network server-authoritative');expect(start.text).toContain('World e2e-authoritative-world');

    const liveX=36,liveZ=-17,liveY=runtime.world.highestSolid(liveX,liveZ)+1,previous=runtime.world.getBlock(liveX,liveY,liveZ),liveId=previous===BLOCK.STONE?BLOCK.AIR:BLOCK.STONE;
    const live=runtime.setBlock(liveX,liveY,liveZ,liveId);expect(live.changed).toBe(true);expect(live.broadcast).toBe(1);expect(live.failed).toBe(0);
    await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E?.worldBlock(x,y,z),{x:liveX,y:liveY,z:liveZ}),{timeout:5_000}).toBe(liveId);

    await setViewAndLock(page,Math.PI/2,0);await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w');await page.waitForTimeout(180);
    const moved=await debugXYZ(page);expect(moved.x).toBeLessThan(start.x-1.5);expect(Math.abs(moved.z-start.z)).toBeLessThan(.7);

    const inventory=page.locator('#inventory');await page.keyboard.press('e');await expect(inventory).not.toHaveClass(/hidden/);await page.keyboard.press('e');await expect(inventory).toHaveClass(/hidden/);
  }finally{await runtime.stop();}
});
