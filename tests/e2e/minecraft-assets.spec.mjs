import {test,expect} from '@playwright/test';

async function decodedImage(page,url){
  return page.evaluate(async assetUrl=>{
    const image=new Image();
    image.src=assetUrl;
    await image.decode();
    return{width:image.naturalWidth,height:image.naturalHeight,complete:image.complete};
  },url);
}

test('imported Minecraft runtime assets resolve and decode through the real HTTP server',async({page,request})=>{
  await page.goto('/');

  const manifestResponse=await request.get('/assets/minecraft/runtime-manifest.json');
  expect(manifestResponse.ok()).toBeTruthy();
  expect(manifestResponse.headers()['content-type']).toContain('application/json');
  const manifest=await manifestResponse.json();
  expect(manifest.minecraftVersion).toBe('1.20.1');
  expect(manifest.sourceArchiveSha256).toBe('b65a2211175af90664de9f41ea422f4869eee855f0da4bf6fe0715434ebe9c69');
  expect(manifest.atlas.path).toBe('textures/atlas.png');

  const atlasResponse=await request.get('/assets/textures/atlas.png');
  expect(atlasResponse.ok()).toBeTruthy();
  expect(atlasResponse.headers()['content-type']).toContain('image/png');
  expect(await decodedImage(page,'/assets/textures/atlas.png')).toEqual({width:64,height:64,complete:true});

  for(const path of[
    '/assets/items/wooden_pickaxe.png',
    '/assets/items/leather_chestplate.png',
    '/assets/items/raw_beef.png',
    '/assets/minecraft/textures/entity/bed/red.png'
  ]){
    const response=await request.get(path);
    expect(response.ok(),`${path} must be served`).toBeTruthy();
    expect(response.headers()['content-type'],`${path} must be served as PNG`).toContain('image/png');
    const decoded=await decodedImage(page,path);
    expect(decoded.complete).toBeTruthy();
    expect(decoded.width).toBeGreaterThan(0);
    expect(decoded.height).toBeGreaterThan(0);
  }

  const entitySheets={
    '/assets/minecraft/textures/entity/cow/cow.png':[64,32],
    '/assets/minecraft/textures/entity/sheep/sheep.png':[64,32],
    '/assets/minecraft/textures/entity/sheep/sheep_fur.png':[64,32],
    '/assets/minecraft/textures/entity/pig/pig.png':[64,32],
    '/assets/minecraft/textures/entity/chicken.png':[64,32],
    '/assets/minecraft/textures/entity/zombie/zombie.png':[64,64],
    '/assets/minecraft/textures/entity/skeleton/skeleton.png':[64,32],
    '/assets/minecraft/textures/entity/creeper/creeper.png':[64,32],
    '/assets/minecraft/textures/entity/spider/spider.png':[64,32]
  };
  for(const [path,[width,height]] of Object.entries(entitySheets)){
    const response=await request.get(path);
    expect(response.ok(),`${path} must be served`).toBeTruthy();
    expect(response.headers()['content-type'],`${path} must be served as PNG`).toContain('image/png');
    expect(await decodedImage(page,path),`${path} must decode at the model sheet dimensions`).toEqual({width,height,complete:true});
  }
});
