from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path); text=p.read_text(encoding='utf-8'); count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# README
replace_once('README.md',
"显式死亡界面/重生、持久化自定义重生点、第一版护甲装备系统",
"显式死亡界面/重生、持久化自定义重生点、两格床重生锚点、第一版护甲装备系统",
'readme intro bed')
replace_once('README.md',
"- 草方块、泥土、石头、圆石、沙子、木板、原木、树叶、水、工作台等基础方块。",
"- 草方块、泥土、石头、圆石、沙子、木板、原木、树叶、水、工作台，以及四方向两格逻辑床等基础方块。床当前仍用两个 1m³ voxel 占位，半高专用模型/碰撞尚未接入。",
'readme blocks bed')
replace_once('README.md',
"- 3×3 工作台：当前至少可制作木镐。",
"- 3×3 工作台：当前至少可制作木镐，以及 3 白色羊毛 + 3 橡木木板合成 1 张床；羊会通过既有 loot 路径掉落白色羊毛。",
'readme crafting bed')
replace_once('README.md',
"- 新增 self `/spawnpoint [x y z]`：无参数记录玩家当前精确位置，也支持 `~` 相对坐标；world record v6 持久化 `respawnPoint`。显式重生会按 exact→附近候选顺序检查脚下实体支撑、脚/眼空间和 AABB 碰撞，找不到安全候选时回退世界出生点。",
"- 新增 self `/spawnpoint [x y z]`：无参数记录玩家当前精确位置，也支持 `~` 相对坐标；world record v6 持久化 `respawnPoint`。显式重生会按 exact→附近候选顺序检查脚下实体支撑、脚/眼空间和 AABB 碰撞，找不到安全候选时回退世界出生点。\n- 新增两格床重生锚点：床按玩家水平朝向原子放置 foot/head 两端，右键任一端都会通过同一 `respawnPoint` setter 设置持久化重生点；破坏任一端会联动移除配对端并只掉落 1 张床。当前不含睡觉、跳夜、占用、怪物限制、下界爆炸或半高床模型。",
'readme bed feature')
replace_once('README.md',
"纯逻辑 / Worker / 护甲 / 水网格 / 氧气 / 游泳 / 天气 / 死亡集成 / 自定义重生回归：",
"纯逻辑 / Worker / 护甲 / 水网格 / 氧气 / 游泳 / 天气 / 死亡集成 / 自定义重生 / 床规则回归：",
'readme test label')
replace_once('README.md',
"并在第三个独立世界验证 `/spawnpoint` 持久化后异地死亡会返回该精确安全重生点。",
"并在第三个独立世界验证 `/spawnpoint` 持久化后异地死亡会返回该精确安全重生点；第四个独立世界通过真实背包→热栏→Pointer Lock→右键流程放置两格床、右键床设置重生点，并验证异地死亡后返回床锚点。",
'readme browser bed')

# Architecture
replace_once('docs/ARCHITECTURE.md',
"Inventory、Equipment、配方、战斗、护甲、氧气、游泳、天气 profile、死亡与重生候选规则尽量保持纯数据/纯逻辑。",
"Inventory、Equipment、配方、战斗、护甲、氧气、游泳、天气 profile、死亡/重生候选与床配对规则尽量保持纯数据/纯逻辑。",
'arch principle bed')
replace_once('docs/ARCHITECTURE.md',
"- `Player.respawnAt()` 只接受已经解析的精确位置，重置生命/饱食/受伤状态并复用 Player AABB 碰撞；床等未来重生来源应复用同一 setter/resolver，而不是另造重生状态机。",
"- `Player.respawnAt()` 只接受已经解析的精确位置，重置生命/饱食/受伤状态并复用 Player AABB 碰撞。\n- `bed-rules.js` 把四个水平方向编码成 8 个 foot/head voxel ID，并纯逻辑负责朝向、配对端坐标和两端归一到同一床重生锚点；它不读取 World/Three.js。main 的 `placeBed()` 负责两端占位检查和原子写入，`breakBed()` 只在预期配对 ID 仍存在时联动删除，`activateBed()` 则只调用与 `/spawnpoint` 共用的 `setRespawnPoint()`。\n- 当前床渲染仍沿用标准 1m³ voxel mesh/collision，并通过通用 per-block vertex tint 区分视觉；这是明确的过渡实现，不等同于原版半高床模型。后续专用床 geometry/collision 不应改变已持久化的床 ID 或 respawnPoint 协议。",
'arch bed section')
replace_once('docs/ARCHITECTURE.md',
"1. static-checks：语法 + base/armor/water/oxygen/swim/weather/death/respawn 八套回归。\n2. browser-smoke：第一世界验证 water/oxygen/swimming、WeatherFX、Equipment v6、虚空显式重生；第二世界验证普通死亡 3 原木 + 14 XP 的真实回收；第三世界验证 `/spawnpoint` v6 持久化与异地死亡后精确自定义重生。",
"1. static-checks：语法 + base/armor/water/oxygen/swim/weather/death/respawn/bed 九套回归。\n2. browser-smoke：第一世界验证 water/oxygen/swimming、WeatherFX、Equipment v6、虚空显式重生；第二世界验证普通死亡 3 原木 + 14 XP 的真实回收；第三世界验证 `/spawnpoint` v6 持久化与异地死亡后精确自定义重生；第四世界通过真实 Inventory→hotbar→Pointer Lock→右键链放置/激活床并验证床锚点重生。",
'arch ci bed')
replace_once('docs/ARCHITECTURE.md',
"- 死亡统计、床方块/睡眠语义、keepInventory、死亡世界实体持久化尚未完成；自定义重生点内核已经独立落库。",
"- 死亡统计、床睡眠/跳夜/占用/怪物限制/维度爆炸语义、半高床 geometry/collision、keepInventory、死亡世界实体持久化尚未完成；两格床重生锚点基础已经落库。",
'arch debt bed')

# Progress
replace_once('docs/PROGRESS.md',
"Death Integration + Custom Respawn 回归。",
"Death Integration + Custom Respawn + Bed Rules 回归。",
'progress logic bed')
replace_once('docs/PROGRESS.md',
"第三世界覆盖 `/spawnpoint` 持久化与精确自定义重生。",
"第三世界覆盖 `/spawnpoint` 持久化与精确自定义重生；第四世界覆盖真实床放置/激活与床锚点重生。",
'progress browser bed')
replace_once('docs/PROGRESS.md',
"持久化自定义重生点、第一版护甲、透明水 pass",
"持久化自定义重生点、两格床重生锚点、第一版护甲、透明水 pass",
'progress status bed')
replace_once('docs/PROGRESS.md',
"- [x] Chromium 自定义重生 E2E：非原点设置并保存 `/spawnpoint`→移动到异地 `/kill`→显式重生必须回到持久化精确安全点\n- [ ] 装备掉落的普通死亡单独拾回断言、死亡统计、床方块/睡眠、`keepInventory`",
"- [x] Chromium 自定义重生 E2E：非原点设置并保存 `/spawnpoint`→移动到异地 `/kill`→显式重生必须回到持久化精确安全点\n- [x] `bed-rules.js`：四方向 foot/head 配对、任一端 partner 解析与统一床锚点纯规则\n- [x] 生存床物品/配方：3 白色羊毛 + 3 橡木木板→1 床；羊既有 loot 提供 `white_wool`\n- [x] 两格床 runtime：真实朝向原子放置、任一端右键设置共享 respawnPoint、破坏任一端联动清理并只掉 1 床\n- [x] Chromium 床 E2E：`/give bed`→真实背包槽 0→热栏 27→Pointer Lock/向下看→右键放置→右键床设重生点→v6 同时保存两端 edits/respawnPoint→异地死亡回床锚点\n- [ ] 装备掉落的普通死亡单独拾回断言、死亡统计、床睡眠/跳夜/占用/怪物限制/半高模型、`keepInventory`",
'progress bed checks')

# Testing
replace_once('docs/TESTING.md',
"scripts/check-respawn.mjs\n```",
"scripts/check-respawn.mjs\nscripts/check-bed.mjs\n```",
'testing bed suite')
replace_once('docs/TESTING.md',
"`scripts/check-respawn.mjs` 覆盖 respawnPoint 数值归一化、14 个 exact/同层周边/+1Y 候选的稳定顺序、first-safe 选择、全部不可用返回 null，以及非法 `isSafe` 拒绝。该模块不导入 Three.js/World；真实方块支撑、液体、眼部空间和 Player AABB 检查由 Chromium/runtime 覆盖。",
"`scripts/check-respawn.mjs` 覆盖 respawnPoint 数值归一化、14 个 exact/同层周边/+1Y 候选的稳定顺序、first-safe 选择、全部不可用返回 null，以及非法 `isSafe` 拒绝。该模块不导入 Three.js/World；真实方块支撑、液体、眼部空间和 Player AABB 检查由 Chromium/runtime 覆盖。\n\n### Bed rules\n\n`scripts/check-bed.mjs` 覆盖 8 个床 voxel ID 的唯一性、四方向 look→facing、foot/head 两端坐标、从任一端解析 partner、两端归一到同一 respawn anchor、BLOCKS/ITEMS/drop/tint 元数据、3×3 `3 wool + 3 planks -> bed` 配方消费，以及真实 sheep loot 的 `white_wool` 来源。2×2 工作区不得误匹配床配方。",
'testing bed rules section')
replace_once('docs/TESTING.md',
"5. 该测试不直接修改 respawnPoint/Player/IndexedDB，并持续捕获 pageerror/console error。\n\n## GitHub Pages 部署验证",
"5. 该测试不直接修改 respawnPoint/Player/IndexedDB，并持续捕获 pageerror/console error。\n\n### Bed respawn-anchor browser regression\n\n第四条独立 Chromium 用例使用世界 `CI Bed Anchor`：\n\n1. 在平原世界非原点落地，`/give bed 1` 后按真实 UI 流程打开背包，将主背包槽 0 的床移动到热栏槽 27，并断言 HUD 当前选中物品确实是“床”。\n2. 获取真实 Pointer Lock，用鼠标向下看并右键世界；必须出现“放置 床”，说明运行时确实经过准星 raycast 和 `placeBed()`，不是直接写 voxel。\n3. 再次右键已放置床，必须出现“重生点已设置”。\n4. 暂停后只接受新鲜 v6 world record，并要求 edits 同时包含一对朝北床 ID `11/12`，且 `respawnPoint` 已保存。\n5. 返回游戏后传送到远处 `/kill`，显式“重生”后的公开 debug XYZ 必须回到保存的床锚点。\n6. 全程捕获 pageerror/console error；测试不直接修改 world edits、respawnPoint 或 IndexedDB。\n\n## GitHub Pages 部署验证",
'testing bed browser')
replace_once('docs/TESTING.md',
"- 自定义重生点被方块阻塞时周边候选/fallback 的专门 Chromium 场景；纯规则候选顺序已有 Node 回归。",
"- 自定义重生点被方块阻塞时周边候选/fallback 的专门 Chromium 场景；纯规则候选顺序已有 Node 回归。\n- 床半高专用 mesh/collision、睡觉/跳夜、占用、附近怪物限制、床支撑更新、下界/末地爆炸和联动破坏的专门 Chromium 断言尚未覆盖；当前 browser E2E 聚焦真实放置→激活→重生锚点主链。",
'testing remaining bed')

# Manifest
replace_once('docs/FILE_MANIFEST.md',
"| `src/blocks.js` | 方块 ID、属性、atlas 索引、基础掉落约束 | `liquid/transparent` 供水 render、oxygen 与 Player water coverage 使用 |",
"| `src/blocks.js` | 方块 ID、属性、atlas 索引、基础掉落约束 | 注册 8 个四方向床 foot/head ID；`tint` 可供 mesh Worker 做通用顶点着色 |",
'manifest blocks bed')
replace_once('docs/FILE_MANIFEST.md',
"| `src/items.js` | 物品定义、方块物品映射、工具/攻击/皮革护甲元数据 | 静态数据，不保存运行时状态 |",
"| `src/items.js` | 物品定义、方块物品映射、工具/攻击/皮革护甲/床元数据 | 床是 stack=1 的 `placeKind=bed` 功能物品；图标为程序化 SVG |",
'manifest items bed')
replace_once('docs/FILE_MANIFEST.md',
"| `src/recipes.js` | 2×2 / 3×3 配方和 CraftingGrid death drain | 纯逻辑，无 DOM/Three.js |",
"| `src/recipes.js` | 2×2 / 3×3 配方和 CraftingGrid death drain | 床配方限制 3×3：3 白羊毛 + 3 木板；纯逻辑，无 DOM/Three.js |",
'manifest recipes bed')
replace_once('docs/FILE_MANIFEST.md',
"| `src/respawn-rules.js` | 自定义重生点归一化、固定周边候选与 first-safe 解析 | 纯逻辑；不导入 Three.js/World；安全判定由调用方注入 |",
"| `src/respawn-rules.js` | 自定义重生点归一化、固定周边候选与 first-safe 解析 | 纯逻辑；不导入 Three.js/World；安全判定由调用方注入 |\n| `src/bed-rules.js` | 四方向两格床 ID、朝向、foot/head partner 与统一床 respawn anchor | 纯逻辑；不读取 World/Three.js；runtime 只消费计划结果 |",
'manifest bed rules')
replace_once('docs/FILE_MANIFEST.md',
"| `src/mesh-worker.js` | 一次 chunk 扫描构建 opaque / water mesh payload | Worker；独立 TypedArray/Transferable；opaque 顶层兼容字段为临时层 |",
"| `src/mesh-worker.js` | 一次 chunk 扫描构建 opaque / water mesh payload | Worker；支持可选 per-block tint；床当前复用整格 voxel mesh，并非半高专用 geometry |",
'manifest mesh bed')
replace_once('docs/FILE_MANIFEST.md',
"| `scripts/check-respawn.mjs` | respawnPoint 归一化、14 个候选顺序、first-safe 与失败边界 | 纯逻辑；不依赖 Three.js/World |",
"| `scripts/check-respawn.mjs` | respawnPoint 归一化、14 个候选顺序、first-safe 与失败边界 | 纯逻辑；不依赖 Three.js/World |\n| `scripts/check-bed.mjs` | 床朝向/配对/锚点、BLOCKS/ITEMS 元数据、3×3 配方和羊毛 loot 来源 | 纯逻辑/静态数据；不启动浏览器 |",
'manifest bed check')
replace_once('docs/FILE_MANIFEST.md',
"| `tests/e2e/smoke.spec.mjs` | Chromium 主世界水体/天气/护甲/虚空死亡、普通可恢复死亡回收，以及持久化自定义重生 | 第二世界真实恢复 3 原木和 14 XP；第三世界验证 `/spawnpoint` v6 保存和异地死亡后精确重生；全程捕获 page/console error |",
"| `tests/e2e/smoke.spec.mjs` | Chromium 主世界、普通死亡回收、自定义 `/spawnpoint` 与床重生锚点四世界集成 | 第四世界通过真实 Inventory→hotbar→Pointer Lock→右键放床/激活，并验证两端 edits + respawnPoint + 异地死亡重生；全程捕获 page/console error |",
'manifest bed e2e')
replace_once('docs/FILE_MANIFEST.md',
"`test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn 八套测试",
"`test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn/bed 九套测试",
'manifest package nine')

# Changelog
replace_once('CHANGELOG.md',
"Death Integration、Custom Respawn 八套回归。",
"Death Integration、Custom Respawn、Bed Rules 九套回归。",
'changelog nine suites')
replace_once('CHANGELOG.md',
"- 新增 `scripts/check-respawn.mjs`：覆盖自定义重生点归一化、14 个固定候选顺序、first-safe 解析和失败边界。",
"- 新增 `scripts/check-respawn.mjs`：覆盖自定义重生点归一化、14 个固定候选顺序、first-safe 解析和失败边界。\n- 新增 `scripts/check-bed.mjs`：覆盖 8 个床 ID、四方向朝向、foot/head 配对、统一重生锚点、方块/物品元数据、3×3 床配方和羊毛 loot 来源。",
'changelog bed check')
replace_once('CHANGELOG.md',
"第二世界验证普通死亡物品+XP 回收，第三世界验证持久化 `/spawnpoint`。",
"第二世界验证普通死亡物品+XP 回收，第三世界验证持久化 `/spawnpoint`，第四世界用真实背包/热栏/Pointer Lock/右键链验证两格床放置与床锚点重生。",
'changelog browser fourth')
replace_once('CHANGELOG.md',
"- 新增第三条 Chromium 自定义重生用例：非原点设置 `/spawnpoint`→确认 v6 新鲜存档→异地 `/kill`→显式重生必须回到该持久化安全点。",
"- 新增第三条 Chromium 自定义重生用例：非原点设置 `/spawnpoint`→确认 v6 新鲜存档→异地 `/kill`→显式重生必须回到该持久化安全点。\n- 新增两格床基础：四方向 foot/head voxel ID，按玩家水平视线原子放置；右键任一端经共享 `setRespawnPoint()` 设置床锚点，破坏任一端会联动删除预期配对端并只掉 1 床。\n- 新增床物品与 3×3 配方：3 `white_wool` + 3 橡木木板→1 床，羊既有 loot 作为真实羊毛来源；床图标为程序化 SVG。\n- `mesh-worker.js` 增加通用 per-block vertex tint；床当前用红色 tint + 现有木板 tile 形成明显占位视觉，仍是两个整格 voxel 的过渡 mesh/collision。\n- 新增第四条 Chromium 床用例：`/give bed` 后真实从背包主区移到热栏，再通过 Pointer Lock + 鼠标视角 + 右键放置/激活；v6 快照必须同时包含两端 bed edits 与 respawnPoint，异地死亡后显式重生回床锚点。",
'changelog bed feature')
replace_once('CHANGELOG.md',
"死亡统计/床方块与睡眠/`keepInventory`、完整流体",
"死亡统计/床睡眠与半高模型/`keepInventory`、完整流体",
'changelog limitation bed')

print('bed docs patch: PASS')
