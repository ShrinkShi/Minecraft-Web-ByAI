import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}

async function debugXYZ(page){
  const text=await page.locator('#debug').innerText(),match=text.match(/XYZ\s+([-\d.]+)\s*\/\s*([-\d.]+)\s*\/\s*([-\d.]+)/);
  if(!match)throw new Error(`cannot parse player XYZ from debug HUD: ${text}`);
  return{x:Number(match[1]),y:Number(match[2]),z:Number(match[3])};
}

async function holdKey(page,code,durationMs=320){
  await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);
  await page.waitForTimeout(durationMs);
  await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true})),code);
  await page.waitForTimeout(80);
}

async function setViewAndLock(page,yaw,pitch=0){
  const canvas=page.locator('#game-canvas');
  await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
  await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});
  await page.waitForTimeout(60);
}

async function resetAtOrigin(page,yaw){
  if(await page.evaluate(()=>!!document.pointerLockElement))await page.evaluate(()=>document.exitPointerLock?.());
  await runCommand(page,'/tp 0 40 0');
  await setViewAndLock(page,yaw,0);
  return debugXYZ(page);
}

test('WASD movement follows the actual camera yaw instead of fixed world axes',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Camera Relative Movement',seed:'ci-camera-relative-2026',mode:'creative',prompt:'平原'});

  let start=await resetAtOrigin(page,0);
  await holdKey(page,'KeyW');
  let end=await debugXYZ(page);
  expect(end.z).toBeLessThan(start.z-.6);
  expect(Math.abs(end.x-start.x)).toBeLessThan(.3);

  start=await resetAtOrigin(page,Math.PI/2);
  await holdKey(page,'KeyW');
  end=await debugXYZ(page);
  expect(end.x).toBeLessThan(start.x-.6);
  expect(Math.abs(end.z-start.z)).toBeLessThan(.3);

  start=await resetAtOrigin(page,-Math.PI/2);
  await holdKey(page,'KeyW');
  end=await debugXYZ(page);
  expect(end.x).toBeGreaterThan(start.x+.6);
  expect(Math.abs(end.z-start.z)).toBeLessThan(.3);

  start=await resetAtOrigin(page,Math.PI/2);
  await holdKey(page,'KeyD');
  end=await debugXYZ(page);
  expect(end.z).toBeLessThan(start.z-.6);
  expect(Math.abs(end.x-start.x)).toBeLessThan(.3);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
