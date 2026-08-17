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
  expect(manifest.atlas.path).toBe('textures/atlas.png');

  const playerManifestResponse=await request.get('/assets/minecraft/player-assets-manifest.json');
  expect(playerManifestResponse.ok()).toBeTruthy();
  expect(playerManifestResponse.headers()['content-type']).toContain('application/json');
  const playerManifest=await playerManifestResponse.json();
  expect(playerManifest).toMatchObject({format:1,minecraftVersion:'1.20.1',sourceKind:'directory',sourceRoot:'MC原版素材assets'});
  expect(playerManifest.files['textures/entity/player/wide/steve.png']).toMatchObject({
    canonical:'assets/minecraft/textures/entity/player/wide/steve.png',
    sha256:'090da8d92c9f54fcbea87e6a2fb94125604a5a92a9ed6a52c10ee61c3b84bb79',
    bytes:1196,
    source:'MC原版素材assets/minecraft/textures/entity/player/wide/steve.png'
  });

  const atlasResponse=await request.get('/assets/textures/atlas.png');
  expect(atlasResponse.ok()).toBeTruthy();
  expect(atlasResponse.headers()['content-type']).toContain('image/png');
  expect(await decodedImage(page,'/assets/textures/atlas.png')).toEqual({width:64,height:64,complete:true});

  const modelManifestResponse=await request.get('/assets/model-textures/model-texture-atlas.json');
  expect(modelManifestResponse.ok()).toBeTruthy();
  expect(modelManifestResponse.headers()['content-type']).toContain('application/json');
  const modelManifest=await modelManifestResponse.json();
  expect(modelManifest.format).toBe(1);
  expect(modelManifest.minecraftVersion).toBe('1.20.1');
  expect(modelManifest).toMatchObject({sourceKind:'directory',sourceRoot:'MC原版素材assets'});
  expect(modelManifest.atlas).toMatchObject({
    path:'model-texture-atlas.png',
    width:128,
    height:128,
    gutterPx:1,
    sha256:'865966f994cf36e1ae0f11fe2c3dd0d5962ab9290c92429eeacb0fcd2bed6ad9'
  });
  expect(Object.keys(modelManifest.textures)).toHaveLength(14);
  expect(modelManifest.textures['minecraft:block/glass']).toBeTruthy();

  const modelAtlasResponse=await request.get('/assets/model-textures/model-texture-atlas.png');
  expect(modelAtlasResponse.ok()).toBeTruthy();
  expect(modelAtlasResponse.headers()['content-type']).toContain('image/png');
  expect(await decodedImage(page,'/assets/model-textures/model-texture-atlas.png')).toEqual({width:128,height:128,complete:true});

  for(const path of[
    '/assets/items/wooden_pickaxe.png',
    '/assets/items/leather_chestplate.png',
    '/assets/items/raw_beef.png',
    '/assets/minecraft/textures/entity/bed/red.png',
    '/assets/minecraft/textures/entity/player/wide/steve.png'
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
    '/assets/minecraft/textures/entity/spider/spider.png':[64,32],
    '/assets/minecraft/textures/entity/player/wide/steve.png':[64,64]
  };
  for(const [path,[width,height]] of Object.entries(entitySheets)){
    const response=await request.get(path);
    expect(response.ok(),`${path} must be served`).toBeTruthy();
    expect(response.headers()['content-type'],`${path} must be served as PNG`).toContain('image/png');
    expect(await decodedImage(page,path),`${path} must decode at the model sheet dimensions`).toEqual({width,height,complete:true});
  }
});
