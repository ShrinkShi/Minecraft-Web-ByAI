import {test,expect} from '@playwright/test';

const THREE_CDN_PREFIX='https://cdn.jsdelivr.net/npm/three@0.169.0/';

test('browser boots from the generated local Three.js vendor without CDN access',async({page})=>{
  const cdnRequests=[];page.on('request',request=>{if(request.url().startsWith(THREE_CDN_PREFIX))cdnRequests.push(request.url());});
  await page.route(`${THREE_CDN_PREFIX}**`,route=>route.abort('blockedbyclient'));
  const vendorResponse=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/vendor/three.module.js'));
  await page.goto('/?e2e=1');
  await expect(page.getByRole('button',{name:'单人游戏'})).toBeVisible();
  const response=await vendorResponse;expect(response.status()).toBe(200);expect(cdnRequests).toEqual([]);
  const resourceUrls=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name));
  expect(resourceUrls.some(url=>new URL(url).pathname.endsWith('/vendor/three.module.js'))).toBe(true);
});
