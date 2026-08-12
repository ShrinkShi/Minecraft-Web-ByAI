from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path); text=p.read_text(encoding='utf-8'); count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# README
replace_once('README.md',
"显式死亡界面/重生、第一版护甲装备系统、水独立透明渲染 pass",
"显式死亡界面/重生、持久化自定义重生点、第一版护甲装备系统、水独立透明渲染 pass",
'readme intro respawn')
replace_once('README.md',
"IndexedDB 自动保存玩家状态、背包、四个护甲槽、经验、天气和方块修改；再次进入相同“世界名称 + seed”会恢复。氧气和 swimCoverage 是瞬时状态，不进入存档。",
"IndexedDB 自动保存玩家状态、背包、四个护甲槽、经验、天气、自定义重生点和方块修改；当前逻辑快照为 v6，再次进入相同“世界名称 + seed”会恢复。氧气和 swimCoverage 是瞬时状态，不进入存档。",
'readme storage')
replace_once('README.md',
"当前支持 `/gamemode`、`/give`、`/tp`、`/kill`、`/xp`、`/time set`、`/weather`、`/help`。",
"当前支持 `/gamemode`、`/give`、`/tp`、`/spawnpoint`、`/kill`、`/xp`、`/time set`、`/weather`、`/help`。",
'readme commands')
replace_once('README.md',
"死亡结算后不会立即传送：游戏进入独立死亡界面并阻断普通输入/本地世界更新，只有点击“重生”才调用 `Player.respawn(0,0)` 返回出生点；也可在死亡结算已保存后返回标题画面。",
"死亡结算后不会立即传送：游戏进入独立死亡界面并阻断普通输入/本地世界更新；点击“重生”时优先解析持久化自定义重生点及其附近安全候选，全部失效才回退世界出生点。也可在死亡结算已保存后返回标题画面。",
'readme death respawn')
replace_once('README.md',
"新增 self `/xp add <points>`（`/experience` 别名），只支持正整数 points；普通死亡浏览器回归现已同时验证死亡 XP 球：16 总经验在等级 2 死亡时掉 14 XP，重生回死亡点后可真实吸收并恢复 `totalXp=14`。",
"新增 self `/xp add <points>`（`/experience` 别名），只支持正整数 points；普通死亡浏览器回归现已同时验证死亡 XP 球：16 总经验在等级 2 死亡时掉 14 XP，重生回死亡点后可真实吸收并恢复 `totalXp=14`（此时派生等级为 Lv.1）。\n- 新增 self `/spawnpoint [x y z]`：无参数记录玩家当前精确位置，也支持 `~` 相对坐标；world record v6 持久化 `respawnPoint`。显式重生会按 exact→附近候选顺序检查脚下实体支撑、脚/眼空间和 AABB 碰撞，找不到安全候选时回退世界出生点。",
'readme respawn command')
replace_once('README.md',
"快照版本 v5 保存/恢复装备。",
"world record v6 保存/恢复装备。",
'readme equipment snapshot')
replace_once('README.md',
"纯逻辑 / Worker / 护甲 / 水网格 / 氧气 / 游泳 / 天气回归：",
"纯逻辑 / Worker / 护甲 / 水网格 / 氧气 / 游泳 / 天气 / 死亡集成 / 自定义重生回归：",
'readme tests label')
replace_once('README.md',
"随后验证护甲 v5 IndexedDB 快照、虚空死亡界面持续存在、Escape 无法绕入暂停菜单，以及点击“重生”后才写入 hp=20 的出生点状态。",
"随后验证护甲 v6 IndexedDB 快照、虚空死亡显式重生、普通死亡物品+经验真实回收，并在第三个独立世界验证 `/spawnpoint` 持久化后异地死亡会返回该精确安全重生点。",
'readme browser summary')

# Architecture
replace_once('docs/ARCHITECTURE.md',
"Inventory、Equipment、配方、战斗、护甲、氧气、游泳、天气 profile 和死亡规则尽量保持纯数据/纯逻辑。",
"Inventory、Equipment、配方、战斗、护甲、氧气、游泳、天气 profile、死亡与重生候选规则尽量保持纯数据/纯逻辑。",
'arch principle')
replace_once('docs/ARCHITECTURE.md',"不进入 v5 world record。","不进入 v6 world record。",'arch oxygen v6')
replace_once('docs/ARCHITECTURE.md',"继续写入既有 v5 world record。","继续写入 v6 world record。",'arch weather v6')
replace_once('docs/ARCHITECTURE.md',"v5 world record 保存 Equipment","v6 world record 保存 Equipment",'arch equipment v6')
replace_once('docs/ARCHITECTURE.md',
"- `completeRespawn()` 只由“重生”按钮调用：`Player.respawn(0,0)` → reset oxygen → 清 deathState → 返回游戏 → 标记存档 dirty。",
"- `completeRespawn()` 只由“重生”按钮调用：先用 `respawn-rules.js` 对持久化 `respawnPoint` 生成 exact/周边候选，并由 main 的 world/AABB 安全检查选择首个可用位置；成功时走 `Player.respawnAt()`，全部候选失效才回退 `Player.respawn(0,0)`。随后 reset oxygen → 清 deathState → 返回游戏 → 标记存档 dirty。",
'arch complete respawn')
replace_once('docs/ARCHITECTURE.md',
"- “返回标题画面”会先 force-save 已清算的 hp=0 死亡状态再 dispose world；DeathScreen 本身不持久化。下次载入 hp<=0 的世界时，现有 `startWorld()` fallback 会直接 `player.respawn(0,0)`，因此不会把死亡 UI 跨页面保存。",
"- “返回标题画面”会先 force-save 已清算的 hp=0 死亡状态再 dispose world；DeathScreen 本身不持久化。下次载入 hp<=0 的世界时，`startWorld()` 会优先解析已保存的自定义重生点及安全候选，失败才回世界出生点，因此不会把死亡 UI 跨页面保存。",
'arch dead save respawn')
replace_once('docs/ARCHITECTURE.md',
"- DropSystem / ExperienceOrbSystem 当前仍不跨页面持久化。",
"- `respawn-rules.js` 是纯逻辑层：只负责 `{x,y,z}` 归一化、固定候选顺序和 first-safe 选择；它不读取 Three.js/World。`/spawnpoint` 只更新 main 的 `respawnPoint` + saveDirty，安全性在真正重生时由 world/player 检查。\n- `Player.respawnAt()` 只接受已经解析的精确位置，重置生命/饱食/受伤状态并复用 Player AABB 碰撞；床等未来重生来源应复用同一 setter/resolver，而不是另造重生状态机。\n- DropSystem / ExperienceOrbSystem 当前仍不跨页面持久化。",
'arch respawn rules insert')
replace_once('docs/ARCHITECTURE.md',
"- IndexedDB object-store schema version 1；world record 逻辑快照 v5。\n- 保存 Player、Inventory、Equipment、totalXp、gameTime、weather、voxel edits。",
"- IndexedDB object-store schema version 1；world record 逻辑快照 v6。\n- 保存 Player、Inventory、Equipment、totalXp、gameTime、weather、`respawnPoint`、voxel edits。",
'arch storage v6')
replace_once('docs/ARCHITECTURE.md',
"1. static-checks：语法 + base/armor/water/oxygen/swim/weather 六套回归。\n2. browser-smoke：固定海洋世界验证 water/oxygen/swimming；随后真实执行 `/weather rain → thunder → clear`，debug 必须出现 446 → 720 → 0；再验证 Equipment v5 存档和虚空死亡。",
"1. static-checks：语法 + base/armor/water/oxygen/swim/weather/death/respawn 八套回归。\n2. browser-smoke：第一世界验证 water/oxygen/swimming、WeatherFX、Equipment v6、虚空显式重生；第二世界验证普通死亡 3 原木 + 14 XP 的真实回收；第三世界验证 `/spawnpoint` v6 持久化与异地死亡后精确自定义重生。",
'arch CI')
replace_once('docs/ARCHITECTURE.md',
"- 死亡统计、床/重生点、keepInventory、死亡世界实体持久化尚未完成。",
"- 死亡统计、床方块/睡眠语义、keepInventory、死亡世界实体持久化尚未完成；自定义重生点内核已经独立落库。",
'arch debt')

# Progress
replace_once('docs/PROGRESS.md',
"基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation 回归。",
"基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation + Death Integration + Custom Respawn 回归。",
'progress test list')
replace_once('docs/PROGRESS.md',
"Playwright Chromium browser smoke：海洋世界→氧气→游泳→rain/thunder/clear WeatherFX→护甲装备/存档→虚空死亡界面→显式重生→IndexedDB 核对。",
"Playwright Chromium browser smoke：主海洋世界覆盖氧气/游泳/WeatherFX/护甲 v6/虚空死亡；第二世界覆盖普通死亡物品+XP 回收；第三世界覆盖 `/spawnpoint` 持久化与精确自定义重生。",
'progress browser')
replace_once('docs/PROGRESS.md',
"显式死亡界面/重生、第一版护甲、透明水 pass",
"显式死亡界面/重生、持久化自定义重生点、第一版护甲、透明水 pass",
'progress status')
replace_once('docs/PROGRESS.md',
"- [x] Chromium 普通死亡 XP 闭环：16 total XP（Lv.2）→`/kill`→摘要确认 14 XP→显式重生→返回死亡点→ExperienceOrbSystem 真实吸收→IndexedDB `totalXp=14`\n- [ ] 装备掉落的普通死亡单独拾回断言、死亡统计、床/重生点、`keepInventory`",
"- [x] Chromium 普通死亡 XP 闭环：16 total XP（Lv.2）→`/kill`→摘要确认 14 XP→显式重生→返回死亡点→ExperienceOrbSystem 真实吸收→IndexedDB `totalXp=14`（恢复后派生 Lv.1）\n- [x] `respawn-rules.js` + `Player.respawnAt()`：精确点/周边候选、安全位置解析和世界出生点 fallback\n- [x] self `/spawnpoint [x y z]`：当前点或 `~` 相对坐标；v6 world record 持久化 `respawnPoint`\n- [x] Chromium 自定义重生 E2E：非原点设置并保存 `/spawnpoint`→移动到异地 `/kill`→显式重生必须回到持久化精确安全点\n- [ ] 装备掉落的普通死亡单独拾回断言、死亡统计、床方块/睡眠、`keepInventory`",
'progress respawn items')
replace_once('docs/PROGRESS.md',"v5 world record 保存/恢复 Equipment","v6 world record 保存/恢复 Equipment",'progress equipment v6')
replace_once('docs/PROGRESS.md',"不写入 v5 world record","不写入 v6 world record",'progress oxygen v6')

# Testing
replace_once('docs/TESTING.md',"scripts/check-death.mjs\n```","scripts/check-death.mjs\nscripts/check-respawn.mjs\n```",'testing suite append')
replace_once('docs/TESTING.md',
"该 contract 是针对主线 `7e2a4920...` 的真实回归新增：当时 static-checks 仍为绿色，但 Chromium 因 `#death-menu` 不存在而两条死亡用例同时失败。此后死亡 UI 的 DOM、状态机和工具清理不再只依赖浏览器阶段发现。\n\n## Chromium browser smoke",
"该 contract 是针对主线 `7e2a4920...` 的真实回归新增：当时 static-checks 仍为绿色，但 Chromium 因 `#death-menu` 不存在而两条死亡用例同时失败。此后死亡 UI 的 DOM、状态机和工具清理不再只依赖浏览器阶段发现。\n\n### Custom respawn rules\n\n`scripts/check-respawn.mjs` 覆盖 respawnPoint 数值归一化、14 个 exact/同层周边/+1Y 候选的稳定顺序、first-safe 选择、全部不可用返回 null，以及非法 `isSafe` 拒绝。该模块不导入 Three.js/World；真实方块支撑、液体、眼部空间和 Player AABB 检查由 Chromium/runtime 覆盖。\n\n## Chromium browser smoke",
' testing respawn section')
replace_once('docs/TESTING.md',"`version=5`、chest 正确","`version=6`、chest 正确",'testing v6')
replace_once('docs/TESTING.md',
"6. 等待真实 `DropSystem.update()` 运行；测试不直接写 Inventory 或 IndexedDB。\n7. 暂停触发保存",
"6. 不使用固定 sleep 猜测回收完成；直接等待公开 debug 达到 `Drops 0 · XPOrbs 0 · XP 14 / Lv.1`，证明 DropSystem 与 ExperienceOrbSystem 都完成更新。\n7. 暂停触发保存",
'testing deterministic pickup')
replace_once('docs/TESTING.md',
"这条用例现在关闭“普通死亡物品 + XP 掉落→显式重生→返回死亡点→重新拾取/吸收”集成链。装备作为普通死亡掉落物的单独拾回断言仍未覆盖。\n\n## GitHub Pages 部署验证",
"这条用例现在关闭“普通死亡物品 + XP 掉落→显式重生→返回死亡点→重新拾取/吸收”集成链。装备作为普通死亡掉落物的单独拾回断言仍未覆盖。\n\n### Persistent custom spawnpoint browser regression\n\n第三条独立 Chromium 用例使用世界 `CI Custom Respawn`：\n\n1. 在非原点位置等待玩家落地稳定，读取公开 debug XYZ。\n2. 执行 `/spawnpoint`，暂停触发保存；只接受新鲜 world record，并要求 `version=6` 与 `respawnPoint` 精确匹配记录坐标。\n3. 恢复后移动到另一位置执行 `/kill`，必须进入正式 DeathScreen。\n4. 显式点击“重生”，最终 debug XYZ 必须回到持久化自定义点（允许 0.15 格浮点观测误差）。\n5. 该测试不直接修改 respawnPoint/Player/IndexedDB，并持续捕获 pageerror/console error。\n\n## GitHub Pages 部署验证",
'testing custom browser')
replace_once('docs/TESTING.md',
"- 死亡界面“返回标题画面”按钮的专门 browser E2E；运行时会 force-save 已结算的 hp=0 状态，重新进入世界时由现有 startup fallback 自动回出生点。",
"- 死亡界面“返回标题画面”按钮的专门 browser E2E；运行时会 force-save 已结算的 hp=0 状态，重新进入时优先使用持久化自定义重生点，失效才回世界出生点。\n- 自定义重生点被方块阻塞时周边候选/fallback 的专门 Chromium 场景；纯规则候选顺序已有 Node 回归。",
'testing remaining respawn')

# Manifest
replace_once('docs/FILE_MANIFEST.md',
"| `src/death-rules.js` | 模式死亡损失、死亡经验、虚空/可恢复位置判断 | 纯逻辑；不生成实体/不操作 UI |",
"| `src/death-rules.js` | 模式死亡损失、死亡经验、虚空/可恢复位置判断 | 纯逻辑；不生成实体/不操作 UI |\n| `src/respawn-rules.js` | 自定义重生点归一化、固定周边候选与 first-safe 解析 | 纯逻辑；不导入 Three.js/World；安全判定由调用方注入 |",
'manifest respawn rules')
replace_once('docs/FILE_MANIFEST.md',
"self `/kill` 进入正式死亡生命周期；`/xp add <points>` / `/experience` 通过 `ctx.addXp()` 调现有经验系统，不直接改 totalXp",
"self `/kill` 进入正式死亡生命周期；`/xp add <points>` / `/experience` 调现有经验系统；`/spawnpoint [x y z]` 只经 context 更新持久化自定义点，均不直接改 IndexedDB",
'manifest commands')
replace_once('docs/FILE_MANIFEST.md',
"AABB 碰撞、视角、玩家快照、受伤/击退/重生 | 三点 liquid 采样；所有模式共用单一轴向位移积分 |",
"AABB 碰撞、视角、玩家快照、受伤/击退/世界出生与精确 `respawnAt()` | 三点 liquid 采样；所有模式共用单一轴向位移积分；精确重生仍使用 AABB 校验 |",
'manifest player')
replace_once('docs/FILE_MANIFEST.md',
"DB schema v1；逻辑快照 v5；weather 已持久化，oxygen/swimCoverage 不持久化",
"DB schema v1；逻辑快照 v6；weather/respawnPoint 持久化，oxygen/swimCoverage 不持久化",
'manifest storage')
replace_once('docs/FILE_MANIFEST.md',
"| `scripts/check-death.mjs` | 死亡 DOM/样式、DeathScreen/deathState、显式重生和旧立即重生路径的集成契约 | Node 静态契约；同时拒绝历史一次性 death patch 工具进入交付树 |",
"| `scripts/check-death.mjs` | 死亡 DOM/样式、DeathScreen/deathState、显式重生和旧立即重生路径的集成契约 | Node 静态契约；同时拒绝历史一次性 death patch 工具进入交付树 |\n| `scripts/check-respawn.mjs` | respawnPoint 归一化、14 个候选顺序、first-safe 与失败边界 | 纯逻辑；不依赖 Three.js/World |",
'manifest respawn check')
replace_once('docs/FILE_MANIFEST.md',
"| `tests/e2e/smoke.spec.mjs` | Chromium 世界启动、水体 oxygen/swimming、WeatherFX、护甲存档、虚空死亡界面，以及普通可恢复死亡回收 | 第二用例 3 原木 + 16 XP 后 `/kill`，显式重生回死亡点，通过真实 DropSystem + ExperienceOrbSystem 恢复 3 原木和 14 XP；全程捕获 page/console error |",
"| `tests/e2e/smoke.spec.mjs` | Chromium 主世界水体/天气/护甲/虚空死亡、普通可恢复死亡回收，以及持久化自定义重生 | 第二世界真实恢复 3 原木和 14 XP；第三世界验证 `/spawnpoint` v6 保存和异地死亡后精确重生；全程捕获 page/console error |",
'manifest e2e')
replace_once('docs/FILE_MANIFEST.md',
"`test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death 七套测试",
"`test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn 八套测试",
'manifest package')

# Changelog
replace_once('CHANGELOG.md',
"Death Integration 七套回归。",
"Death Integration、Custom Respawn 八套回归。",
'changelog suite count')
replace_once('CHANGELOG.md',
"- 新增 `scripts/check-death.mjs`：锁定死亡 DOM/样式引用、`DeathScreen`/`deathState`/显式重生接线，禁止旧 `respawnPlayer()` 和一次性 death patch 工具重新进入交付树。",
"- 新增 `scripts/check-death.mjs`：锁定死亡 DOM/样式引用、`DeathScreen`/`deathState`/显式重生接线，禁止旧 `respawnPlayer()` 和一次性 death patch 工具重新进入交付树。\n- 新增 `scripts/check-respawn.mjs`：覆盖自定义重生点归一化、14 个固定候选顺序、first-safe 解析和失败边界。",
'changelog respawn test')
replace_once('CHANGELOG.md',
"Equipment/v5 存档和虚空死亡界面→显式重生链。",
"Equipment/v6 存档和虚空死亡界面→显式重生链；第二世界验证普通死亡物品+XP 回收，第三世界验证持久化 `/spawnpoint`。",
'changelog browser v6')
replace_once('CHANGELOG.md',
"- 可恢复死亡 Chromium 回归升级为 3 原木 + 16 XP：Lv.2 死亡摘要必须报告 14 XP，显式重生回死亡点后真实 ExperienceOrbSystem 吸收，最终新鲜 IndexedDB 必须 `totalXp=14`。",
"- 可恢复死亡 Chromium 回归升级为 3 原木 + 16 XP：Lv.2 死亡摘要必须报告 14 XP，显式重生回死亡点后真实 ExperienceOrbSystem 吸收，最终新鲜 IndexedDB 必须 `totalXp=14`（派生 Lv.1）；测试由固定 1400ms sleep 改为等待公开 runtime 状态 `Drops 0 · XPOrbs 0 · XP 14`。\n- 新增 `respawn-rules.js` 与 `Player.respawnAt()`：持久化精确点通过固定周边候选和世界/AABB 安全判定选择首个可用重生位置，全部无效时回退世界出生点。\n- 新增 self `/spawnpoint [x y z]`，支持当前精确位置和 `~` 相对坐标；world record 逻辑快照升级到 v6 并保存 `respawnPoint`，IndexedDB object-store schema 仍为 v1。\n- 新增第三条 Chromium 自定义重生用例：非原点设置 `/spawnpoint`→确认 v6 新鲜存档→异地 `/kill`→显式重生必须回到该持久化安全点。",
'changelog respawn feature')
replace_once('CHANGELOG.md',"world record 逻辑快照 v5 保存 Equipment","world record 逻辑快照 v6 保存 Equipment 与 respawnPoint",'changelog snapshot v6')
replace_once('CHANGELOG.md',"不进入 v5 world record。","不进入 v6 world record。",'changelog oxygen v6')
replace_once('CHANGELOG.md',
"死亡统计/床重生/`keepInventory`、完整流体",
"死亡统计/床方块与睡眠/`keepInventory`、完整流体",
'changelog limitations')

print('custom respawn docs patch: PASS')
