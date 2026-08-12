from pathlib import Path


def read(path): return Path(path).read_text(encoding='utf-8')
def write(path,text): Path(path).write_text(text,encoding='utf-8')

# README
p='README.md';t=read(p)
t=t.replace('`/gamemode`、`/give`、`/tp`、`/kill`、`/time set`、`/weather`、`/help`','`/gamemode`、`/give`、`/tp`、`/kill`、`/xp`、`/time set`、`/weather`、`/help`')
anchor='- 新增标准 self `/kill` 指令，直接进入现有死亡结算/死亡界面，不使用测试专用后门；自动浏览器回归已验证普通可恢复死亡后返回死亡点可重新拾回掉落物。'
if anchor not in t: raise SystemExit('README anchor missing')
t=t.replace(anchor,anchor+'\n- 新增 self `/xp add <points>`（`/experience` 别名），只支持正整数 points；普通死亡浏览器回归现已同时验证死亡 XP 球：16 总经验在等级 2 死亡时掉 14 XP，重生回死亡点后可真实吸收并恢复 `totalXp=14`。',1)
write(p,t)

# PROGRESS
p='docs/PROGRESS.md';t=read(p)
anchor='- [x] Chromium 普通可恢复死亡物品闭环：给予 3 原木→`/kill`→死亡界面确认 3 物品掉落→显式重生→返回死亡坐标→DropSystem 真实拾回→IndexedDB 再次持有 3 原木'
if anchor not in t: raise SystemExit('PROGRESS anchor missing')
t=t.replace(anchor,anchor+'\n- [x] self `/xp add <points>` / `/experience` points 指令，通过现有 `addExperience()` 接入，不支持 levels/目标选择器\n- [x] Chromium 普通死亡 XP 闭环：16 total XP（Lv.2）→`/kill`→摘要确认 14 XP→显式重生→返回死亡点→ExperienceOrbSystem 真实吸收→IndexedDB `totalXp=14`',1)
t=t.replace('- [ ] 普通死亡经验球回收 E2E、死亡统计、床/重生点、`keepInventory`','- [ ] 装备掉落的普通死亡单独拾回断言、死亡统计、床/重生点、`keepInventory`')
write(p,t)

# TESTING
p='docs/TESTING.md';t=read(p)
t=t.replace("2. `/give oak_log 3` 后执行标准 `/kill`。","2. `/give oak_log 3`，再 `/xp add 16`；当前总经验正好对应等级 2，然后执行标准 `/kill`。")
t=t.replace("3. `#death-menu` 必须 active，死亡原因包含“被杀死”，摘要必须包含“3 个物品”和“死亡点”。","3. `#death-menu` 必须 active，死亡原因包含“被杀死”，摘要必须同时包含“3 个物品”“14 点经验”和“死亡点”；14 来自 `Lv.2 × 7` 的现有死亡 XP 公式。")
t=t.replace("8. 新快照中 `block:6` 总数必须重新达到 3，Player hp=20 且位置仍有效。","8. 新快照中 `block:6` 总数必须重新达到 3，`totalXp=14`，Player hp=20 且位置仍有效；这证明 DropSystem 与 ExperienceOrbSystem 都通过真实更新链完成回收。")
t=t.replace('这条用例关闭的是“普通死亡物品掉落→显式重生→返回死亡点→重新拾取”集成链。XP 球回收仍未做确定性浏览器覆盖。','这条用例现在关闭“普通死亡物品 + XP 掉落→显式重生→返回死亡点→重新拾取/吸收”集成链。装备作为普通死亡掉落物的单独拾回断言仍未覆盖。')
t=t.replace('- 普通可恢复死亡的 **物品** 掉落/重新拾取已覆盖；经验球回收与装备掉落的单独可恢复死亡断言仍未覆盖。','- 普通可恢复死亡的物品和 XP 球回收均已覆盖；装备掉落的单独可恢复死亡拾回断言仍未覆盖。')
write(p,t)

# FILE MANIFEST
p='docs/FILE_MANIFEST.md';t=read(p)
old='| `src/commands.js` | 聊天指令解析与参数验证 | `/weather` 通过 context 切天气；标准 self `/kill` 通过 `ctx.kill()` 进入正式死亡生命周期，不直接改 Inventory/UI |'
new='| `src/commands.js` | 聊天指令解析与参数验证 | `/weather` 通过 context 切天气；self `/kill` 进入正式死亡生命周期；`/xp add <points>` / `/experience` 通过 `ctx.addXp()` 调现有经验系统，不直接改 totalXp |'
if old not in t: raise SystemExit('manifest commands row missing')
t=t.replace(old,new,1)
old='| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、水体 oxygen/swimming、WeatherFX、护甲存档、虚空死亡界面，以及普通可恢复死亡拾取 | 第二用例 `/kill` 3 原木后显式重生并回死亡点，通过真实 DropSystem 拾回 3 原木；全程捕获 page/console error |'
new='| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、水体 oxygen/swimming、WeatherFX、护甲存档、虚空死亡界面，以及普通可恢复死亡回收 | 第二用例 3 原木 + 16 XP 后 `/kill`，显式重生回死亡点，通过真实 DropSystem + ExperienceOrbSystem 恢复 3 原木和 14 XP；全程捕获 page/console error |'
if old not in t: raise SystemExit('manifest e2e row missing')
t=t.replace(old,new,1)
write(p,t)

# ARCHITECTURE
p='docs/ARCHITECTURE.md';t=read(p)
anchor='- 标准 self `/kill` 由 `commands.js` 解析后调用 main context 的 `kill()`；main 将 hp 置 0 并直接复用 `beginPlayerDeath(\'你被杀死了\')`。它既是用户可用 Minecraft 风格指令，也是确定性可恢复死亡集成入口，不存在绕过死亡策略的测试后门。'
if anchor not in t: raise SystemExit('architecture kill anchor missing')
t=t.replace(anchor,anchor+'\n- self `/xp add <points>` / `/experience` 只做正整数 points 增量，commands 经 `ctx.addXp()` 调用既有 `addExperience()`；因此等级派生、HUD、saveDirty 和死亡 XP 公式仍只有一套真相源。levels/target selectors 暂不实现。',1)
anchor2='- 浏览器普通死亡回归在同一页面内返回死亡坐标，让现有 DropSystem 自己完成拾取；测试只从随后保存的 IndexedDB 观察 Inventory，避免直接操纵运行时内部数组。'
if anchor2 not in t: raise SystemExit('architecture pickup anchor missing')
t=t.replace(anchor2,'- 浏览器普通死亡回归在同一页面内返回死亡坐标，让现有 DropSystem 与 ExperienceOrbSystem 自己完成物品拾取和 XP 吸收；测试只从随后保存的 IndexedDB 观察 Inventory/totalXp，避免直接操纵运行时内部数组。',1)
write(p,t)

# CHANGELOG
p='CHANGELOG.md';t=read(p)
anchor='- 新增第二条 Chromium 可恢复死亡回归：3 原木→`/kill`→死亡界面报告掉落→显式重生→返回原死亡坐标→真实 DropSystem 拾回→新鲜 IndexedDB 再次持有全部 3 原木。'
if anchor not in t: raise SystemExit('changelog pickup anchor missing')
t=t.replace(anchor,anchor+'\n- 新增 self `/xp add <points>`（`/experience` 别名），通过现有 `addExperience()` 增加 points；拒绝 0/负数、超限和 `levels`。\n- 可恢复死亡 Chromium 回归升级为 3 原木 + 16 XP：Lv.2 死亡摘要必须报告 14 XP，显式重生回死亡点后真实 ExperienceOrbSystem 吸收，最终新鲜 IndexedDB 必须 `totalXp=14`。',1)
t=t.replace('- 普通可恢复死亡的物品掉落/重新拾取已进入 browser E2E；经验球回收与死亡实体跨页面持久化仍未覆盖。','- 普通可恢复死亡的物品与 XP 球回收均已进入 browser E2E；装备掉落的单独回收断言与死亡实体跨页面持久化仍未覆盖。')
write(p,t)

print('recoverable XP documentation patch: PASS')
