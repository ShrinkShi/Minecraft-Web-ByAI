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

'''
patched=patched.replace(marker,extra+marker,1)
namespace={'__file__':str(helper),'__name__':'__main__'}
exec(compile(patched,str(helper),'exec'),namespace,namespace)
