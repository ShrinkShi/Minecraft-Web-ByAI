#!/usr/bin/env python3
from pathlib import Path

path=Path(__file__).with_name('apply-coal-progression.py')
text=path.read_text(encoding='utf-8')
old="replace_once('scripts/check-asset-manifest.mjs',\"'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots',\",\"'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','item.coal',\")"
new="replace_once('scripts/check-asset-manifest.mjs',\"  'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots',\\n  'item.leather_helmet',\",\"  'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','item.coal',\\n  'item.leather_helmet',\")"
if text.count(old)!=1:
    raise RuntimeError(f'expected exactly one bootstrap anchor, found {text.count(old)}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('coal bootstrap asset anchor tightened')
