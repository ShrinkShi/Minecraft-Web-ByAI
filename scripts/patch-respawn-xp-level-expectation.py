from pathlib import Path
p=Path('tests/e2e/smoke.spec.mjs')
text=p.read_text(encoding='utf-8')
old="Drops 0 · XPOrbs 0 · XP 14 / Lv.2"
new="Drops 0 · XPOrbs 0 · XP 14 / Lv.1"
count=text.count(old)
if count!=1: raise SystemExit(f'xp pickup level expectation: expected 1 match, got {count}')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('respawn XP level expectation patch: PASS')
