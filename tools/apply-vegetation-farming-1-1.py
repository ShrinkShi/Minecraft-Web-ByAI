from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(path,old,new):
    text=read(path)
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}: {old[:120]!r}')
    write(path,text.replace(old,new,1))

def replace_count(path,old,new,expected):
    text=read(path)
    count=text.count(old)
    if count!=expected:
        raise SystemExit(f'{path}: expected {expected} anchors, found {count}: {old!r}')
    write(path,text.replace(old,new))

main='src/main.js'
replace_once(main,
"import {SingleplayerFarmingRuntime} from './singleplayer-farming-runtime.js';",
"import {SingleplayerFarmingRuntime} from './singleplayer-farming-runtime.js';\nimport {SingleplayerVegetationRuntime} from './singleplayer-vegetation-runtime.js';")
replace_once(main,
"let deviceProfile=detectDeviceProfile(),desktopControls=null,mobileControls=null,gameplayRuntime=null,singleplayerFurnace=null,singleplayerFarming=null;",
"let deviceProfile=detectDeviceProfile(),desktopControls=null,mobileControls=null,gameplayRuntime=null,singleplayerFurnace=null,singleplayerFarming=null,singleplayerVegetation=null;")
replace_once(main,
"  resolveDrops:({target,block})=>singleplayerFarming?.dropsForBlock(target.id,block?.drops)??(block?.drops?[{id:block.drops,count:1}]:[]),",
"  resolveDrops:({target,block})=>{const vegetation=singleplayerVegetation?.dropsForBlock(target.id);if(vegetation!==null&&vegetation!==undefined)return vegetation;return singleplayerFarming?.dropsForBlock(target.id,block?.drops)??(block?.drops?[{id:block.drops,count:1}]:[]);},")
replace_once(main,
"onWorldEdit:event=>{markSaveDirty();singleplayerFarming?.observeEdit(event);}",
"onWorldEdit:event=>{markSaveDirty();singleplayerFarming?.observeEdit(event);singleplayerVegetation?.observeEdit(event);}")
replace_once(main,
"  singleplayerFarming=new SingleplayerFarmingRuntime({world,getMode:()=>player?.mode||'spectator',getWeather:()=>weather,onChanged:markSaveDirty,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.35,target.z+.5))});\n  const needsTerrainMetadataMigration=",
"  singleplayerFarming=new SingleplayerFarmingRuntime({world,getMode:()=>player?.mode||'spectator',getWeather:()=>weather,onChanged:markSaveDirty,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.35,target.z+.5))});\n  singleplayerVegetation=new SingleplayerVegetationRuntime({world,getMode:()=>player?.mode||'spectator',onChanged:markSaveDirty,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.35,target.z+.5))});\n  const needsTerrainMetadataMigration=")
replace_once(main,
"running=false;clearPlayerInput();const movement=multiplayerMovement;multiplayerMovement=null;multiplayerStarting=false;singleplayerFarming?.dispose();singleplayerFarming=null;singleplayerFurnace?.dispose();singleplayerFurnace=null;sessionKind=null;",
"running=false;clearPlayerInput();const movement=multiplayerMovement;multiplayerMovement=null;multiplayerStarting=false;singleplayerVegetation?.dispose();singleplayerVegetation=null;singleplayerFarming?.dispose();singleplayerFarming=null;singleplayerFurnace?.dispose();singleplayerFurnace=null;sessionKind=null;")
replace_once(main,
"farmingTick:()=>singleplayerFarming?.tickNow(()=>0)||false,prepareSingleplayerFarmingPlot,plantWheatAt:",
"farmingTick:()=>singleplayerFarming?.tickNow(()=>0)||false,setVegetationRandom:value=>{if(!singleplayerVegetation||!Number.isFinite(value)||value<0||value>=1)return false;singleplayerVegetation.random=()=>value;return true;},prepareSingleplayerFarmingPlot,plantWheatAt:")
replace_once(main,
"ui.showToast(`食用 ${def.name}`);return;}if(player.mode!=='spectator'&&player.mode!=='adventure'&&def?.plantKind==='wheat')",
"ui.showToast(`食用 ${def.name}`);return;}if(player.mode!=='spectator'&&player.mode!=='adventure'&&def?.useKind==='bone_meal'){if(!hit){ui.showToast('这里无法使用骨粉');return;}const result=singleplayerVegetation?.applyBoneMeal(hit);if(!result?.changed){ui.showToast(result?.reason==='no-space'?'附近没有可催生的位置':'这里无法使用骨粉');return;}if(player.mode!=='creative')ui.consumeSelected(1);markSaveDirty();ui.showToast(result.kind==='wheat'?`催熟 小麦 ${result.fromAge}→${result.toAge}`:`催生 矮草 ×${result.placements}`);return;}if(player.mode!=='spectator'&&player.mode!=='adventure'&&def?.plantKind==='wheat')")

# Use the already generated runtime tint profile exactly instead of a rounded approximation.
replace_once('src/blocks.js',"tint:[.57,.74,.35]","tint:[145/255,189/255,89/255]")

asset='scripts/check-asset-manifest.mjs'
replace_count(asset,"'item.wheat','item.cooked_beef'","'item.wheat','item.bone_meal','item.cooked_beef'",3)
replace_count(asset,"'wheat','cooked_beef'","'wheat','bone_meal','cooked_beef'",2)
replace_once(asset,
"(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots|coal|apple|bread|wheat_seeds|wheat|cooked_beef|cooked_mutton|cooked_porkchop|cooked_chicken)",
"(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots|coal|apple|bread|wheat_seeds|wheat|bone_meal|cooked_beef|cooked_mutton|cooked_porkchop|cooked_chicken)")
replace_once(asset,
"assert.equal(ITEMS.bed.entityAssetKey,'entity.bed.red');",
"assert.equal(ITEMS.bone_meal.useKind,'bone_meal');\nassert.equal(ITEMS.bed.entityAssetKey,'entity.bed.red');")

runtime_assets='scripts/check-minecraft-runtime-assets.mjs'
replace_once(runtime_assets,
"'blockstates/farmland.json','models/block/farmland.json','models/block/farmland_moist.json','blockstates/wheat.json','models/block/wheat_stage0.json','models/block/wheat_stage7.json'",
"'blockstates/farmland.json','models/block/farmland.json','models/block/farmland_moist.json','blockstates/wheat.json','models/block/wheat_stage0.json','models/block/wheat_stage7.json',\n  'blockstates/grass.json','models/block/grass.json','models/block/tinted_cross.json','textures/block/grass.png'")

model_runtime='scripts/check-minecraft-model-runtime.mjs'
replace_once(model_runtime,
"BLOCK.WHEAT_AGE_6,BLOCK.WHEAT_AGE_7]);",
"BLOCK.WHEAT_AGE_6,BLOCK.WHEAT_AGE_7,BLOCK.SHORT_GRASS]);")
replace_once(model_runtime,
"const first=instantiateMinecraftModelTemplate(crafting,3,40,-2);",
"const shortGrass=minecraftModelTemplate(runtime,BLOCK.SHORT_GRASS);\nassert.equal(shortGrass.blockstate,'minecraft:grass');\nassert.equal(shortGrass.renderLayer,'cutout');\nassert.equal(shortGrass.parts.length,1);\nassert.equal(shortGrass.parts[0].alternatives.models[0].modelId,'minecraft:block/grass');\nassert.equal(shortGrass.parts[0].alternatives.models[0].model.faces.length,4);\nassert.ok(shortGrass.parts[0].alternatives.models[0].model.faces.every(face=>face.tintIndex===0),'canonical tinted_cross faces must preserve tintindex 0');\nassert.equal(blockstateReads.get('minecraft:grass'),1);\nassert.equal(modelReads.get('minecraft:block/grass'),1);\nassert.equal(modelReads.get('minecraft:block/tinted_cross'),1);\n\nconst first=instantiateMinecraftModelTemplate(crafting,3,40,-2);")
replace_once(model_runtime,
"console.log('Minecraft interpreted-model preload/cache/template selection runtime + iron ore/glass/furnace roots: PASS');",
"console.log('Minecraft interpreted-model preload/cache/template selection runtime + iron ore/glass/furnace/grass roots: PASS');")

print('vegetation farming phase 1.1 integration patch applied')
