from pathlib import Path


def read(path): return Path(path).read_text(encoding='utf-8')
def write(path,text): Path(path).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old,new,1)

# README
p='README.md'; t=read(p)
t=t.replace('`/gamemode`、`/give`、`/tp`、`/time set`、`/weather`、`/help`','`/gamemode`、`/give`、`/tp`、`/kill`、`/time set`、`/weather`、`/help`')
anchor='- 死亡结算后不会立即传送：游戏进入独立死亡界面并阻断普通输入/本地世界更新，只有点击“重生”才调用 `Player.respawn(0,0)` 返回出生点；也可在死亡结算已保存后返回标题画面。'
if anchor not in t: raise SystemExit('README death anchor missing')
t=t.replace(anchor,anchor+'\n- 新增标准 self `/kill` 指令，直接进入现有死亡结算/死亡界面，不使用测试专用后门；自动浏览器回归已验证普通可恢复死亡后返回死亡点可重新拾回掉落物。',1)
write(p,t)

# PROGRESS
p='docs/PROGRESS.md'; t=read(p)
anchor='- [x] Chromium 虚空死亡 E2E：死亡界面必须持续存在，Escape 不得打开暂停菜单，点击“重生”后才恢复 hp=20；背包/装备/XP 仍保持清空'
if anchor not in t: raise SystemExit('PROGRESS death anchor missing')
t=t.replace(anchor,anchor+'\n- [x] 标准 `/kill` self 指令通过正式 `beginPlayerDeath()` 进入死亡流程；额外参数拒绝\n- [x] Chromium 普通可恢复死亡物品闭环：给予 3 原木→`/kill`→死亡界面确认 3 物品掉落→显式重生→返回死亡坐标→DropSystem 真实拾回→IndexedDB 再次持有 3 原木',1)
t=t.replace('- [ ] 普通死亡浏览器 E2E、死亡统计、床/重生点、`keepInventory`','- [ ] 普通死亡经验球回收 E2E、死亡统计、床/重生点、`keepInventory`')
write(p,t)

# TESTING
p='docs/TESTING.md'; t=read(p)
insert='''\n### Recoverable death / pickup browser regression\n\n第二条独立 Chromium 用例使用世界 `CI Recoverable Death`：\n\n1. 创建 survival 世界并 `/tp 0 35 0` 到固定可恢复坐标。\n2. `/give oak_log 3` 后执行标准 `/kill`。\n3. `#death-menu` 必须 active，死亡原因包含“被杀死”，摘要必须包含“3 个物品”和“死亡点”。\n4. 显式点击“重生”，而不是依赖自动重生。\n5. 记录拾取阶段时间，再 `/tp 0 35 0` 返回同一死亡坐标。\n6. 等待真实 `DropSystem.update()` 运行；测试不直接写 Inventory 或 IndexedDB。\n7. 暂停触发保存，只接受 `updatedAt >= pickupPhaseStartedAt` 的新鲜 world record。\n8. 新快照中 `block:6` 总数必须重新达到 3，Player hp=20 且位置仍有效。\n9. 全程无 pageerror / console error。\n\n这条用例关闭的是“普通死亡物品掉落→显式重生→返回死亡点→重新拾取”集成链。XP 球回收仍未做确定性浏览器覆盖。\n'''
marker='## GitHub Pages 部署验证'
if marker not in t: raise SystemExit('TESTING marker missing')
t=t.replace(marker,insert+'\n'+marker,1)
t=t.replace('- 普通可恢复死亡的掉落/经验/护甲重新拾取。','- 普通可恢复死亡的 **物品** 掉落/重新拾取已覆盖；经验球回收与装备掉落的单独可恢复死亡断言仍未覆盖。')
write(p,t)

# FILE_MANIFEST
p='docs/FILE_MANIFEST.md'; t=read(p)
old='| `src/commands.js` | 聊天指令解析与参数验证 | `/weather` 只发 setWeather context，不直接操作 Three.js |'
new='| `src/commands.js` | 聊天指令解析与参数验证 | `/weather` 通过 context 切天气；标准 self `/kill` 通过 `ctx.kill()` 进入正式死亡生命周期，不直接改 Inventory/UI |'
if old in t: t=t.replace(old,new,1)
old='| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、水体 oxygen/swimming、WeatherFX、护甲存档、死亡界面/显式重生 | 虚空死亡必须停在 death screen；Escape 不得绕过；点击重生后断言 hp=20 和损失状态；全程捕获 page/console error |'
new='| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、水体 oxygen/swimming、WeatherFX、护甲存档、虚空死亡界面，以及普通可恢复死亡拾取 | 第二用例 `/kill` 3 原木后显式重生并回死亡点，通过真实 DropSystem 拾回 3 原木；全程捕获 page/console error |'
if old not in t: raise SystemExit('FILE_MANIFEST e2e row missing')
t=t.replace(old,new,1)
write(p,t)

# ARCHITECTURE
p='docs/ARCHITECTURE.md'; t=read(p)
anchor='- `completeRespawn()` 只由“重生”按钮调用：`Player.respawn(0,0)` → reset oxygen → 清 deathState → 返回游戏 → 标记存档 dirty。'
if anchor not in t: raise SystemExit('ARCHITECTURE death anchor missing')
t=t.replace(anchor,anchor+'\n- 标准 self `/kill` 由 `commands.js` 解析后调用 main context 的 `kill()`；main 将 hp 置 0 并直接复用 `beginPlayerDeath(\'你被杀死了\')`。它既是用户可用 Minecraft 风格指令，也是确定性可恢复死亡集成入口，不存在绕过死亡策略的测试后门。\n- 浏览器普通死亡回归在同一页面内返回死亡坐标，让现有 DropSystem 自己完成拾取；测试只从随后保存的 IndexedDB 观察 Inventory，避免直接操纵运行时内部数组。',1)
write(p,t)

# CHANGELOG
p='CHANGELOG.md'; t=read(p)
anchor='- Chromium E2E 现在要求虚空死亡界面至少持续约 450 ms、Escape 仍停在死亡界面；点击“重生”后新鲜存档必须 hp=20、Inventory/Equipment/XP 仍清空。'
if anchor not in t: raise SystemExit('CHANGELOG death anchor missing')
t=t.replace(anchor,anchor+'\n- 新增标准 self `/kill` 指令，复用正式 `beginPlayerDeath()`；命令回归覆盖成功调用和额外参数拒绝。\n- 新增第二条 Chromium 可恢复死亡回归：3 原木→`/kill`→死亡界面报告掉落→显式重生→返回原死亡坐标→真实 DropSystem 拾回→新鲜 IndexedDB 再次持有全部 3 原木。',1)
t=t.replace('- 普通可恢复死亡的掉落/重新拾取尚未进入 browser E2E；死亡掉落与经验球也不跨页面持久化。','- 普通可恢复死亡的物品掉落/重新拾取已进入 browser E2E；经验球回收与死亡实体跨页面持久化仍未覆盖。')
write(p,t)

print('recoverable death documentation patch: PASS')
