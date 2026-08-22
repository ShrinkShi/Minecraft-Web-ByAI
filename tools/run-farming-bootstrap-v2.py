from pathlib import Path

helper=Path(__file__).with_name('apply-farming-phase-1.py')
source=helper.read_text(encoding='utf-8')
start='# Asset manifest audit covers new direct-canonical item bindings.\n'
end='# Runtime provenance should explicitly include the new farming model roots.\n'
if source.count(start)!=1 or source.count(end)!=1:
    raise SystemExit('farming bootstrap asset section markers drifted')
prefix,rest=source.split(start,1)
_,suffix=rest.split(end,1)
replacement=r'''# Asset manifest audit covers new direct-canonical item bindings.
_asset_path='scripts/check-asset-manifest.mjs'
_asset_text=read(_asset_path)
_common="'item.apple','item.bread','item.cooked_beef'"
_common_new="'item.apple','item.bread','item.wheat_seeds','item.wheat','item.cooked_beef'"
_common_count=_asset_text.count(_common)
if _common_count!=3: raise SystemExit(f'{_asset_path}: expected 3 canonical item-list anchors, found {_common_count}')
_asset_text=_asset_text.replace(_common,_common_new)
write(_asset_path,_asset_text)
replace_once(_asset_path,
"(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots|coal|apple|bread|cooked_beef|cooked_mutton|cooked_porkchop|cooked_chicken)",
"(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots|coal|apple|bread|wheat_seeds|wheat|cooked_beef|cooked_mutton|cooked_porkchop|cooked_chicken)")
replace_once(_asset_path,
"'iron_boots','coal','apple','bread','cooked_beef'",
"'iron_boots','coal','apple','bread','wheat_seeds','wheat','cooked_beef'")
replace_once(_asset_path,
"for(const itemId of ['apple','bread','cooked_beef','cooked_mutton','cooked_porkchop','cooked_chicken'])",
"for(const itemId of ['apple','bread','wheat_seeds','wheat','cooked_beef','cooked_mutton','cooked_porkchop','cooked_chicken'])")

'''
patched=prefix+replacement+end+suffix
marker="print('farming phase 1 integration patch applied')"
if patched.count(marker)!=1: raise SystemExit('farming bootstrap completion marker drifted')
extra=r'''replace_once('scripts/check-minecraft-model-runtime.mjs',
"assert.deepEqual(runtime.blockIds,[BLOCK.CRAFTING_TABLE,BLOCK.IRON_ORE,BLOCK.GLASS,BLOCK.FURNACE]);",
"assert.deepEqual(runtime.blockIds,[BLOCK.CRAFTING_TABLE,BLOCK.IRON_ORE,BLOCK.GLASS,BLOCK.FURNACE,BLOCK.FARMLAND,BLOCK.FARMLAND_MOISTURE_1,BLOCK.FARMLAND_MOISTURE_2,BLOCK.FARMLAND_MOISTURE_3,BLOCK.FARMLAND_MOISTURE_4,BLOCK.FARMLAND_MOISTURE_5,BLOCK.FARMLAND_MOISTURE_6,BLOCK.FARMLAND_MOISTURE_7,BLOCK.WHEAT_AGE_0,BLOCK.WHEAT_AGE_1,BLOCK.WHEAT_AGE_2,BLOCK.WHEAT_AGE_3,BLOCK.WHEAT_AGE_4,BLOCK.WHEAT_AGE_5,BLOCK.WHEAT_AGE_6,BLOCK.WHEAT_AGE_7]);")

replace_once('scripts/check-minecraft-model-texture-binding.mjs',
"assert.deepEqual(resolver.manifest.closure,{blockstates:10,models:46,textures:18,metadata:0});",
"assert.deepEqual(resolver.manifest.closure,{blockstates:12,models:58,textures:28,metadata:0});")
replace_once('scripts/check-minecraft-model-texture-binding.mjs',
"assert.equal(resolver.textureCount,18);",
"assert.equal(resolver.textureCount,28);")
replace_once('scripts/check-minecraft-model-texture-binding.mjs',
"sha256:'9b9d2837806b361e9f03454e1ca8ff25c5ce24e7784c8737e42be93b2c805ead',",
"sha256:'b8ccd8f5273ab896386ddd1e541419488b89b341748c520521d18fcf59d2658b',")
replace_once('scripts/check-minecraft-model-texture-binding.mjs',
"assert.deepEqual(resolver.requireRegion('block/glass'),{\n  u0:0.1484375,\n  v0:0.1484375,\n  u1:0.2734375,\n  v1:0.2734375\n});",
"assert.deepEqual(resolver.requireRegion('block/glass'),{\n  u0:0.4296875,\n  v0:0.1484375,\n  u1:0.5546875,\n  v1:0.2734375\n});")
replace_once('scripts/check-minecraft-model-texture-binding.mjs',
"assert.deepEqual(resolver.requireRegion('block/furnace_front'),{\n  u0:0.5703125,\n  v0:0.0078125,\n  u1:0.6953125,\n  v1:0.1328125\n});",
"assert.deepEqual(resolver.requireRegion('block/furnace_front'),{\n  u0:0.8515625,\n  v0:0.0078125,\n  u1:0.9765625,\n  v1:0.1328125\n});")
replace_once('scripts/check-minecraft-model-texture-binding.mjs',
"assert.equal(loaded.textureCount,18);",
"assert.equal(loaded.textureCount,28);")
replace_once('scripts/check-minecraft-model-texture-binding.mjs',
"assert.equal(resolver.hasTexture('minecraft:block/furnace_top'),true);",
"assert.equal(resolver.hasTexture('minecraft:block/furnace_top'),true);\nassert.equal(resolver.hasTexture('minecraft:block/farmland'),true);\nassert.equal(resolver.hasTexture('minecraft:block/farmland_moist'),true);\nassert.equal(resolver.hasTexture('minecraft:block/wheat_stage7'),true);")

replace_once('src/main.js',
"singleplayerFarming=new SingleplayerFarmingRuntime({world,getWeather:()=>weather,onChanged:markSaveDirty,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.35,target.z+.5))});",
"singleplayerFarming=new SingleplayerFarmingRuntime({world,getMode:()=>player?.mode||'spectator',getWeather:()=>weather,onChanged:markSaveDirty,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.35,target.z+.5))});")

'''
patched=patched.replace(marker,extra+marker,1)
namespace={'__file__':str(helper),'__name__':'__main__'}
exec(compile(patched,str(helper),'exec'),namespace,namespace)
