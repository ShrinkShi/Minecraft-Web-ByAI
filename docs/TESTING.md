# 测试与验证记录

## 质量门结构

`Repository quality` 分两层执行：

1. `static-checks`：Node 22 语法、纯逻辑和 Worker 回归。
2. `browser-smoke`：真实 Chromium 中启动静态站并验证跨模块集成链。

PR 必须先通过 `static-checks`，随后才运行 `browser-smoke`。浏览器失败会保留 Playwright trace / screenshot / HTML report 目录。

## Node / Worker 自动检查

`npm run test:logic` 当前顺序执行：

```text
scripts/check.mjs
scripts/check-armor.mjs
scripts/check-water.mjs
scripts/check-oxygen.mjs
scripts/check-swim.mjs
scripts/check-weather.mjs
scripts/check-death.mjs
scripts/check-respawn.mjs
scripts/check-bed.mjs
scripts/check-mobile.mjs
scripts/check-controls.mjs
scripts/check-network-view.mjs
scripts/check-sleep.mjs
```

基础套件覆盖 Inventory / Crafting / Commands / EntityStore / SpatialHash / 四种敌对生物 / Combat / Projectile / Experience / Spider / Death / Mesh Worker / Terrain Worker。

### Equipment / Armor
- 四个固定 Equipment 槽、错误部位拒绝、cursor 装备/取下。
- 非法快照过滤和 stack count 归一化。
- `Equipment.drain()` 死亡清算。
- 皮革套 7 护甲点；当前 4%/点、80% 上限的减伤公式。
- `/give minecraft:leather_chestplate 1`。

### Water mesh
- 单个实体方块只产 opaque，单个水方块只产 water。
- 同水相邻内部面剔除，包括跨 chunk 边界。
- 水对实体方块接触面剔除，实体面对透明水保留。
- opaque / water 使用独立 TypedArray / Transferable buffers。
- opaque 旧顶层 buffer 字段仍作为临时兼容视图。

### Oxygen / Drowning
- survival/adventure 使用氧气；creative/spectator 满空气且不溺水。
- 15 秒耗尽、离水 4× 恢复、跨 0 点时序。
- 0 空气后 1 秒一个 drowning event；当前每个事件 2 HP。
- 非法 state/dt/submerged 输入拒绝。

### Swimming / Buoyancy
- 脚/躯干/眼睛三点布尔采样得到 0、1/3、2/3、1 的覆盖率。
- coverage=0 严格 no-op，防止水规则污染陆地路径。
- coverage 从 0→1 时水平倍率从 1 平滑插值到 0.5。
- 完整浸水有轻微正浮力；Space 上游、Shift 下潜。
- +3.4 / -3.0 垂直限速；冲突输入与非法参数均有回归。

### Weather / Precipitation

`scripts/check-weather.mjs` 覆盖：

- 唯一天气类型为 `clear / rain / thunder`，未知类型拒绝。
- 固定默认容量 `WEATHER_MAX_SEGMENTS=720`。
- clear 激活 0 条；rain 激活 `floor(720×.62)=446`；thunder 激活 720 条。
- rain 必须具有正的 fallSpeed、length、opacity；thunder 的数量、下落速度、雨线长度、透明度和总风偏强度必须高于 rain。
- 自定义小容量也按 ratio 计算，例如 rain 10 条容量时激活 6，thunder 1 条容量时激活 1。
- 非正整数容量拒绝。

Node 层只验证 profile，不导入 Three.js WeatherSystem；后者由 Chromium 实际创建/更新，避免在 Node 中伪造 WebGL 对象。

### Death integration contract

`scripts/check-death.mjs` 验证 `index.html` 必须加载 `death.css` 并包含 `#death-menu/#death-reason/#death-detail` 与显式重生/返回标题动作；`main.js` 必须构造 `DeathScreen`、持有 `deathState`、提供 `beginPlayerDeath()`/`completeRespawn()`、在死亡时阻断键盘与世界更新，并禁止旧 `respawnPlayer()` 立即重生路径。该检查同时拒绝历史一次性 death patch workflow/script 出现在交付树。

该 contract 是针对主线 `7e2a4920...` 的真实回归新增：当时 static-checks 仍为绿色，但 Chromium 因 `#death-menu` 不存在而两条死亡用例同时失败。此后死亡 UI 的 DOM、状态机和工具清理不再只依赖浏览器阶段发现。

### Custom respawn rules

`scripts/check-respawn.mjs` 覆盖 respawnPoint 数值归一化、14 个 exact/同层周边/+1Y 候选的稳定顺序、first-safe 选择、全部不可用返回 null，以及非法 `isSafe` 拒绝。该模块不导入 Three.js/World；真实方块支撑、液体、眼部空间和 Player AABB 检查由 Chromium/runtime 覆盖。

### Unified control intents

`scripts/check-controls.mjs` 覆盖：

- 标准移动向量归一化与 `CONTROL_INTENT_VERSION=1`。
- 多输入 source 合并与 source reset；不同 source 同时按住 primary 时只有合并状态真正释放才产生 release edge。
- look intent 的有限幅度、动作白名单和非法动作拒绝。
- `desktop`、`touch`、`network-peer` 对同一逻辑输入必须生成完全相同的规范化 gameplay state。
- `PlayerControlFrame v1` 对上述 canonical state 的编码必须完全一致，wire frame 只能包含 `v/seq/move/buttons`，不得携带 source/device。
- control wire decoder 必须拒绝非法 uint32 sequence、未知 button bit、数值字符串 move、未归一化 move、额外字段与不兼容版本。
- `scripts/check-mobile.mjs` 额外静态拒绝 Player 重新出现 `virtualInput`、`setVirtualMove`、DOM keyboard/mouse listener，并要求 DesktopControls/MobileControls 都只通过同一个 bus 输出 move/button/look/action。

### Platform-neutral absolute view frame

`scripts/check-network-view.mjs` 覆盖：

- `PLAYER_VIEW_FRAME_VERSION=1` 与当前 Player pitch 上限 `1.553`。
- 本地可无限累积 yaw 在 encoder 中规范化为 `[-π, π)`；`π` 必须 canonicalize 为 `-π`。
- 相同绝对 yaw/pitch 无论来自桌面鼠标、手机拖动或未来 network-peer，都必须产生完全一致的 `{v,seq,yaw,pitch}` frame。
- frame 不得携带 `source/device` 或原始 MouseEvent/PointerEvent/touch delta。
- decoder 必须拒绝非 canonical yaw、越界 pitch、数值字符串、非法 sequence、额外字段与不兼容版本。

该 view frame 是服务端验证“前进方向”、攻击、挖掘、放置和实体交互方向的协议前置。当前并未实现网络 transport，也不把浏览器原始鼠标/触控 delta 作为网络消息。

真实桌面键盘/Pointer Lock 和 Android touch 路径继续由 Playwright 五场浏览器回归覆盖，因此 Node 层不伪造 DOM 输入。

### Bed rules

`scripts/check-bed.mjs` 覆盖 8 个床 voxel ID 的唯一性、四方向 look→facing、foot/head 两端坐标、从任一端解析 partner、两端归一到同一 respawn anchor、BLOCKS/ITEMS/drop/tint 元数据、3×3 `3 wool + 3 planks -> bed` 配方消费，以及真实 sheep loot 的 `white_wool` 来源。2×2 工作区不得误匹配床配方。

### Bed sleep / multiplayer-ready quorum

`scripts/check-sleep.mjs` 覆盖 24000 tick 归一化、晴天 `12542..23459` 与雨天 `12010..23991` 睡眠窗口、雷暴任意时间可睡、清晨目标 1000、非负 32 位 sleeper percentage、超过 100% 的不可达 quorum、单人 ready 与多人 waiting→ready。设备类型不参与 sleeper 计算。

### Mobile device / input contract

`scripts/check-mobile.mjs` 覆盖桌面 Chrome、Android、iPhone portrait、iPadOS 桌面 UA 回退、带触摸屏 Windows 笔记本 false-positive 保护，以及 `userAgentData.mobile`。静态 contract 同时要求移动端 DOM/CSS、`MobileControls`、`DesktopControls` 与 Player DOM 输入解耦、共享 `ControlIntentBus` 主/副交互和 HUD hotbar touch index 接线存在。

Node 层不伪造 Pointer Lock/Touch UI；真实设备画像、横竖屏切换和触控事件由下面的 Android Chromium 用例覆盖。

## Chromium browser smoke

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

当前 smoke 使用固定世界名、seed `ci-browser-smoke-2026` 和 terrain prompt `海`，验证：

1. 主菜单→生存世界，HUD 与 WebGL Canvas 启动。
2. 世界经过 mesh Worker opaque/water 双 pass。
3. 真实水体触发 Oxygen HUD，`data-air` 明显下降。
4. 从 debug HUD 解析玩家 Y；Space 后上升、Shift 后下降。
5. `/tp 0 35 0` 离水，Oxygen HUD 恢复后隐藏。
6. 执行 `/weather rain`，debug 必须变为 `WeatherFX rain:446`。
7. 执行 `/weather thunder`，debug 必须变为 `WeatherFX thunder:720`。
8. 执行 `/weather clear`，debug 必须变为 `WeatherFX clear:0`。
9. WeatherSystem 在上述切换和逐帧 update 期间不得产生 pageerror / console error。
10. `/give minecraft:leather_chestplate 1`→真实 Equipment 拖放→护甲 HUD。
11. 暂停读取新鲜 IndexedDB：`version=6`、chest 正确、weather=`clear`，且没有持久化 oxygen。
12. 恢复→给予原木→传送虚空；`#death-menu` 必须进入 active，原因包含“虚空”，损失摘要包含“无法回收”。
13. 等待约 450 ms 后死亡界面必须仍然 active；发送 Escape 后也必须继续停在死亡界面，`#pause-menu` 不得 active，证明没有自动重生或暂停菜单绕过。
14. 点击“重生”后死亡界面关闭；随后 Escape 才能打开暂停菜单。
15. 读取重生后的新鲜 IndexedDB：Inventory=0、Equipment=0、XP=0、Player hp=20，位置回到可恢复出生点。
16. 全程无 pageerror / console error。

当前天气 browser smoke 验证的是命令→profile→固定池数量→主循环/Three.js 生命周期，不做截图像素比较；屋顶遮雨、雨滴碰撞、透明效果和不同 GPU 的实际像素结果仍是未覆盖边界。


### Recoverable death / pickup browser regression

第二条独立 Chromium 用例使用世界 `CI Recoverable Death`：

1. 创建 survival 世界并 `/tp 0 35 0` 到固定可恢复坐标。
2. `/give oak_log 3`，再 `/xp add 16`；当前总经验正好对应等级 2，然后执行标准 `/kill`。
3. `#death-menu` 必须 active，死亡原因包含“被杀死”，摘要必须同时包含“3 个物品”“14 点经验”和“死亡点”；14 来自 `Lv.2 × 7` 的现有死亡 XP 公式。
4. 显式点击“重生”，而不是依赖自动重生。
5. 记录拾取阶段时间，再 `/tp 0 35 0` 返回同一死亡坐标。
6. 不使用固定 sleep 猜测回收完成；直接等待公开 debug 达到 `Drops 0 · XPOrbs 0 · XP 14 / Lv.1`，证明 DropSystem 与 ExperienceOrbSystem 都完成更新。
7. 暂停触发保存，只接受 `updatedAt >= pickupPhaseStartedAt` 的新鲜 world record。
8. 新快照中 `block:6` 总数必须重新达到 3，`totalXp=14`，Player hp=20 且位置仍有效；这证明 DropSystem 与 ExperienceOrbSystem 都通过真实更新链完成回收。
9. 全程无 pageerror / console error。

这条用例现在关闭“普通死亡物品 + XP 掉落→显式重生→返回死亡点→重新拾取/吸收”集成链。装备作为普通死亡掉落物的单独拾回断言仍未覆盖。

### Persistent custom spawnpoint browser regression

第三条独立 Chromium 用例使用世界 `CI Custom Respawn`：

1. 在非原点位置等待玩家落地稳定，读取公开 debug XYZ。
2. 执行 `/spawnpoint`，暂停触发保存；只接受新鲜 world record，并要求 `version=6` 与 `respawnPoint` 精确匹配记录坐标。
3. 恢复后移动到另一位置执行 `/kill`，必须进入正式 DeathScreen。
4. 显式点击“重生”，最终 debug XYZ 必须回到持久化自定义点（允许 0.15 格浮点观测误差）。
5. 该测试不直接修改 respawnPoint/Player/IndexedDB，并持续捕获 pageerror/console error。

### Bed respawn-anchor browser regression

第四条独立 Chromium 用例使用世界 `CI Bed Anchor`：

1. 在平原世界非原点落地，`/give bed 1` 后按真实 UI 流程打开背包，将主背包槽 0 的床移动到热栏槽 27，并断言 HUD 当前选中物品确实是“床”。
2. 获取真实 Pointer Lock，用鼠标向下看并右键世界；必须出现“放置 床”，说明运行时确实经过准星 raycast 和 `placeBed()`，不是直接写 voxel。
3. 再次右键已放置床，必须出现“重生点已设置”。
4. 通过正式 `/time set night` 把共享世界时钟推进到夜间，再次右键同一张床；必须出现“已睡到清晨”，公开 debug `Time` 必须回到约 1000 tick。
5. 暂停后只接受新鲜 v6 world record，并要求 edits 包含合法 foot/head 配对且 `respawnPoint` 已保存。
6. 返回游戏后传送到远处 `/kill`，显式“重生”后的公开 debug XYZ 必须回到保存的床锚点。
7. 全程捕获 pageerror/console error；测试不直接修改 world edits、respawnPoint、gameTime 或 IndexedDB。

### Android landscape mobile browser regression

第五条 Chromium 用例 `tests/e2e/mobile.spec.mjs` 使用 Android Mobile UA、`hasTouch=true` 和 844×390 viewport：

1. 标题页必须自动得到 `body[data-device="mobile"]` 与 landscape；此时游戏触控层尚未显示。
2. 动态切到 390×844 portrait 时必须显示“请将手机横屏”覆盖层；切回 landscape 后覆盖层自动消失。
3. 创建 creative 平原世界后触控层必须可见，同时 `document.pointerLockElement` 仍为 null，证明手机控制不借用桌面 Pointer Lock。
4. 通过真实移动端按钮打开/关闭背包，并要求 gameplay controls 在 panel 打开时隐藏、关闭后恢复。
5. 移动端“视角”按钮必须进入第三人称背面；“暂停”必须打开正式 pause menu，返回后恢复 controls。
6. 用 PointerEvent 驱动左摇杆并从公开 debug XYZ 观察水平位移，要求移动超过 0.3 格。
7. HUD 必须暴露 9 个可触控 hotbar slot，触摸 index 3 后 selected 必须同步到 3。
8. 全程无 pageerror / console error。

该自动化验证的是 Chromium 的 Android 浏览器模型，不等同于已经覆盖真实 Chrome Android / Samsung Internet / Safari iOS 的设备矩阵。

## GitHub Pages 部署验证

仓库 Pages Source 为 **GitHub Actions**。每个主线 squash 后必须同时核对 `Repository quality` 与 `Deploy GitHub Pages` 最终 success。

在线地址：`https://shrinkshi.github.io/Minecraft-Web-ByAI/`

## 仍未覆盖的浏览器集成边界

- 真实 Android Chrome/Samsung Internet 与 iOS Safari 设备矩阵；当前自动移动端回归是 Chromium + Android UA/touch emulation。
- 可选浏览器 fullscreen/orientation-lock、虚拟按键布局/灵敏度自定义、haptics、PWA 安装/离线缓存和更复杂的移动端 crafting 长按/拆分手势。

- 自动天气周期和 weather duration。
- 群系降水/雪、屋顶遮雨、雨线 world collision、地面 splash/湿润、闪电 flash/bolt/damage/sound。
- 天气粒子的像素级密度、blending、不同 GPU/浏览器表现。
- 完整 15 秒耗尽→真实 drowning damage→死亡/重生。
- 横向水中速度与陆地速度的浏览器定量对比。
- 冲刺游泳姿态、三维视线方向推进、爬行过渡、实体游泳 AI、水流/流体传播。
- Water surface blending、透明排序、深度冲突和水下 fog/折射。
- 真实敌对生物有/无护甲 HP 差值。
- Pointer Lock/F5/持续陆地移动的专门 E2E。
- 普通可恢复死亡的物品和 XP 球回收均已覆盖；装备掉落的单独可恢复死亡拾回断言仍未覆盖。
- 死亡界面“返回标题画面”按钮的专门 browser E2E；运行时会 force-save 已结算的 hp=0 状态，重新进入时优先使用持久化自定义重生点，失效才回世界出生点。
- 自定义重生点被方块阻塞时周边候选/fallback 的专门 Chromium 场景；纯规则候选顺序已有 Node 回归。
- 床半高专用 mesh/collision、睡觉/跳夜、占用、附近怪物限制、床支撑更新、下界/末地爆炸和联动破坏的专门 Chromium 断言尚未覆盖；当前 browser E2E 聚焦真实放置→激活→重生锚点主链。
- 死亡世界实体跨页面持久化、IndexedDB 配额/schema 迁移。
- Three.js 运行时仍依赖 jsDelivr。
