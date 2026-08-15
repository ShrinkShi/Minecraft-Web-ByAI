import {test,expect} from '@playwright/test';
import {createAuthoritativeServerRuntime} from '../../server/runtime.mjs';

const ORIGIN='http://127.0.0.1:4173';

test('multiplayer ordinary chat is displayed only after authoritative server broadcast',async({page})=>{
  const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'e2e-authoritative-chat',seed:'chat-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},onError:event=>errors.push(event)});
  try{
    const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}/ws`;
    await page.goto('/?e2e=1');await page.getByRole('button',{name:'多人游戏'}).click();await page.locator('#multiplayer-url').fill(url);await page.locator('#multiplayer-insecure').check();await page.getByRole('button',{name:'连接服务器'}).click();
    await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:30_000});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.multiplayer?.()),{timeout:30_000}).toMatchObject({sessionKind:'multiplayer',state:'ready',ready:true,worldId:'e2e-authoritative-chat'});

    const wrap=page.locator('#chat-input-wrap'),input=page.locator('#chat-input'),log=page.locator('#chat-log');await wrap.evaluate(element=>element.classList.remove('hidden'));await input.focus();await input.fill('服务器权威聊天测试');await page.keyboard.press('Enter');
    await expect(wrap).toHaveClass(/hidden/);await expect(log).toContainText('服务器权威聊天测试',{timeout:5_000});await expect(log).toContainText('玩家-');expect(errors).toEqual([]);
  }finally{await runtime.stop();}
});
