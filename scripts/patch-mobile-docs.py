from pathlib import Path

def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

# README
rep('README.md',
'以及可见降雨/雷雨粒子已经落库；',
'可见降雨/雷雨粒子，以及手机浏览器自动识别 + 横屏触控底座已经落库；',
'readme intro mobile')
rep('README.md',
'- 第一人称 WASD、鼠标视角、空格跳跃、Ctrl 疾跑、Shift 潜行减速。',
'- 第一人称 WASD、鼠标视角、空格跳跃、Ctrl 疾跑、Shift 潜行减速。\n- 自动区分桌面浏览器与手机/触控优先浏览器：桌面继续使用 Pointer Lock + 键鼠；手机横屏显示左摇杆、右侧拖动视角，以及攻击/持续挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天和 F5 等价视角按钮。手机竖屏会覆盖游戏并提示旋转到横屏；不强制调用浏览器方向锁定 API。',
'readme controls mobile')
rep('README.md',
'纯逻辑 / Worker / 护甲 / 水网格 / 氧气 / 游泳 / 天气 / 死亡集成 / 自定义重生 / 床规则回归：',
'纯逻辑 / Worker / 护甲 / 水网格 / 氧气 / 游泳 / 天气 / 死亡集成 / 自定义重生 / 床规则 / 移动端设备与输入回归：',
'readme logic label')
rep('README.md',
'第四个独立世界通过真实背包→热栏→Pointer Lock→右键流程放置两格床、右键床设置重生点，并验证异地死亡后返回床锚点。',
'第四个独立世界通过真实背包→热栏→右键流程放置两格床、右键床设置重生点，并验证异地死亡后返回床锚点；第五条 Android 移动端用例使用 touch + Mobile UA + 844×390 横屏，验证设备自动识别、横竖屏提示、无 Pointer Lock 触控模式、背包/暂停/视角按钮、虚拟摇杆移动和触控热栏。',
'readme browser mobile')

# CHANGELOG
rep('CHANGELOG.md',
'- `static-checks` 同时检查 `src/*.js`、`scripts/*.mjs`；`npm run test:logic` 现在顺序执行基础、Equipment/Armor、Water Mesh、Oxygen/Drowning、Swimming/Buoyancy、Weather/Precipitation、Death Integration、Custom Respawn、Bed Rules 九套回归。',
'- `static-checks` 同时检查 `src/*.js`、`scripts/*.mjs`；`npm run test:logic` 现在顺序执行基础、Equipment/Armor、Water Mesh、Oxygen/Drowning、Swimming/Buoyancy、Weather/Precipitation、Death Integration、Custom Respawn、Bed Rules、Mobile Device/Input 十套回归。',
'changelog ten suites')
rep('CHANGELOG.md',
'- browser smoke 使用固定 seed + `海` prompt 真实生成水体，验证 Oxygen `data-air`、Space 上游、Shift 下潜；随后实际执行 `/weather rain → thunder → clear` 并要求 `WeatherFX 446 → 720 → 0`，再继续 Equipment/v6 存档和虚空死亡界面→显式重生链；第二世界验证普通死亡物品+XP 回收，第三世界验证持久化 `/spawnpoint`，第四世界用真实背包/热栏/Pointer Lock/右键链验证两格床放置与床锚点重生。',
'- browser smoke 使用固定 seed + `海` prompt 真实生成水体，验证 Oxygen `data-air`、Space 上游、Shift 下潜；随后实际执行 `/weather rain → thunder → clear` 并要求 `WeatherFX 446 → 720 → 0`，再继续 Equipment/v6 存档和虚空死亡界面→显式重生链；第二世界验证普通死亡物品+XP 回收，第三世界验证持久化 `/spawnpoint`，第四世界验证两格床放置与床锚点重生；第五条 Android 横屏用例验证手机自动识别、旋转提示、无 Pointer Lock 触控、摇杆与移动端 UI 操作。',
'changelog browser mobile')
rep('CHANGELOG.md',
'- `EntityStore` + `SpatialHash` 实体数据/空间索引基础。',
'- `device-profile.js`：结合 Mobile UA / `userAgentData.mobile` 与 touch + coarse pointer + no-hover 回退自动区分手机与桌面；iPadOS 桌面 UA 可识别，普通带触摸屏但仍有 fine pointer/hover 的笔记本保持 desktop。\n- `mobile-controls.js` + `mobile.css`：手机横屏提供虚拟摇杆、拖动视角、攻击/挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天、视角和触控热栏；竖屏显示旋转提示，safe-area 参与布局。\n- `PlayerController` 新增独立 virtual input；桌面键盘/Pointer Lock 与手机触控共用同一位移积分和主/副交互路径。手机 gameplay 不要求 Pointer Lock，普通桌面行为保持不变。\n- 新增 Android Chromium 移动端回归：Mobile UA + touch + 844×390，真实验证 portrait/landscape 切换、背包/暂停/视角、摇杆位移和触控热栏。\n- `EntityStore` + `SpatialHash` 实体数据/空间索引基础。',
'changelog mobile feature')

# ARCHITECTURE
rep('docs/ARCHITECTURE.md',
'9. **远端证据决定完成度**：只有进入 GitHub `main` 且质量门和 Pages 通过才算完成。',
'9. **远端证据决定完成度**：只有进入 GitHub `main` 且质量门和 Pages 通过才算完成。\n10. **输入设备适配与玩法逻辑分离**：桌面键鼠和手机手势只产生统一 Player/交互输入，不允许移动端控制层直接修改 World/Inventory/IndexedDB。',
'arch mobile principle')
rep('docs/ARCHITECTURE.md',
'## World / Water render',
'''## Device profile / Mobile browser input

- `device-profile.js` 是纯环境判定层：优先使用 Mobile UA / `navigator.userAgentData.mobile`，并用 `maxTouchPoints + (pointer:coarse) + (hover:none) + compact viewport` 覆盖 iPadOS 桌面 UA；带触摸屏但仍有 fine pointer/hover 的桌面设备不自动切到手机布局。
- 判定结果写入 `body[data-device]` / `body[data-orientation]`，并监听 resize/orientation/media-query 变化。portrait 手机只显示旋转提示；landscape 才允许触控游戏控件。
- `mobile-controls.js` 只把 pointer 手势转换为 `onMove/onLook/onHold/onToggle/onAction`；它不读取或写入 World、Inventory、Storage。
- `PlayerController.virtualInput` 与键盘 `keys` 分离，在唯一的 `PlayerController.update()` 中合成；触控摇杆保留模拟量，键盘语义不变。
- 主编排层将桌面鼠标和手机按钮统一收口到 `primaryActionStart/End()` 与 `secondaryAction()`，因此攻击、持续挖掘、raycast、放置、工作台和床交互只有一条 gameplay 路径。
- 手机 gameplay 的 `canControl()` 不要求 Pointer Lock；桌面仍要求 Pointer Lock。暂停、死亡、背包、工作台或聊天打开时会清除 virtual input，避免松手事件丢失造成持续移动/攻击。
- `mobile.css` 使用 `env(safe-area-inset-*)` 避开刘海/圆角，并压缩横屏 HUD/背包；不设置 `user-scalable=no`，也不依赖浏览器通常受手势权限限制的强制 orientation lock。

## World / Water render''',
'arch mobile section')
rep('docs/ARCHITECTURE.md',
'1. static-checks：语法 + base/armor/water/oxygen/swim/weather/death/respawn/bed 九套回归。\n2. browser-smoke：第一世界验证 water/oxygen/swimming、WeatherFX、Equipment v6、虚空显式重生；第二世界验证普通死亡 3 原木 + 14 XP 的真实回收；第三世界验证 `/spawnpoint` v6 持久化与异地死亡后精确自定义重生；第四世界通过真实 Inventory→hotbar→Pointer Lock→右键链放置/激活床并验证床锚点重生。',
'1. static-checks：语法 + base/armor/water/oxygen/swim/weather/death/respawn/bed/mobile 十套回归。\n2. browser-smoke：第一世界验证 water/oxygen/swimming、WeatherFX、Equipment v6、虚空显式重生；第二世界验证普通死亡 3 原木 + 14 XP 的真实回收；第三世界验证 `/spawnpoint` v6 持久化与异地死亡后精确自定义重生；第四世界验证两格床放置/激活与床锚点重生；第五条 Android 横屏用例验证设备检测、portrait rotate overlay、无 Pointer Lock 触控、移动端 UI、虚拟摇杆和触控热栏。',
'arch ci mobile')
rep('docs/ARCHITECTURE.md',
'## 当前技术债',
'## 当前技术债\n\n- 手机端目前是浏览器横屏适配，不是原生 App/PWA；尚缺真实 iOS Safari/Android 设备矩阵、手柄/震动反馈、控件自定义、PWA 离线/安装、可选全屏/方向锁定和更细的触控合成体验。',
'arch mobile debt')

# PROGRESS
rep('docs/PROGRESS.md',
'- [x] `npm run test:logic`：基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation + Death Integration + Custom Respawn + Bed Rules 回归。',
'- [x] `npm run test:logic`：基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation + Death Integration + Custom Respawn + Bed Rules + Mobile Device/Input 十套回归。',
'progress ten suites')
rep('docs/PROGRESS.md',
'- [x] Playwright Chromium browser smoke：主海洋世界覆盖氧气/游泳/WeatherFX/护甲 v6/虚空死亡；第二世界覆盖普通死亡物品+XP 回收；第三世界覆盖 `/spawnpoint` 持久化与精确自定义重生；第四世界覆盖真实床放置/激活与床锚点重生。',
'- [x] Playwright Chromium browser smoke：主海洋世界覆盖氧气/游泳/WeatherFX/护甲 v6/虚空死亡；第二世界覆盖普通死亡物品+XP 回收；第三世界覆盖 `/spawnpoint` 持久化与精确自定义重生；第四世界覆盖真实床放置/激活与床锚点重生；第五条 Android 横屏用例覆盖移动端自动识别、旋转提示、触控 UI 和摇杆移动。',
'progress mobile browser')
rep('docs/PROGRESS.md',
'基础游泳/浮力和可见降雨 FX 已落库；',
'基础游泳/浮力、可见降雨 FX 和手机浏览器横屏触控底座已落库；',
'progress status mobile')
rep('docs/PROGRESS.md',
'### Equipment / Armor',
'''### Mobile browser / Landscape touch
- [x] `device-profile.js`：Mobile UA / UA-CH + touch/coarse/no-hover 回退；iPadOS 桌面 UA 与 touchscreen laptop false-positive 边界回归
- [x] portrait 手机全屏旋转提示；landscape 自动启用 safe-area-aware 触控 HUD
- [x] 左模拟摇杆 + 右侧拖动视角；Player virtual input 与桌面键盘输入分离后在单一积分器合成
- [x] 攻击/持续挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天、视角切换与触控热栏
- [x] 手机控制不依赖 Pointer Lock；桌面 Pointer Lock/键鼠路径保持原语义
- [x] Android Chromium 844×390 + touch + Mobile UA：横竖屏、背包、暂停、视角、摇杆位移、热栏选择 E2E
- [ ] 真实 iOS Safari / Android 设备矩阵、可选全屏/方向锁定、震动反馈、控件尺寸/位置自定义、PWA 安装与离线缓存

### Equipment / Armor''',
'progress mobile section')

# TESTING
rep('docs/TESTING.md',
'scripts/check-bed.mjs\n```',
'scripts/check-bed.mjs\nscripts/check-mobile.mjs\n```',
'testing mobile suite list')
rep('docs/TESTING.md',
'## Chromium browser smoke',
'''### Mobile device / input contract

`scripts/check-mobile.mjs` 覆盖桌面 Chrome、Android、iPhone portrait、iPadOS 桌面 UA 回退、带触摸屏 Windows 笔记本 false-positive 保护，以及 `userAgentData.mobile`。静态 contract 同时要求移动端 DOM/CSS、`MobileControls`、Player virtual input、共享主/副交互和 HUD hotbar touch index 接线存在。

Node 层不伪造 Pointer Lock/Touch UI；真实设备画像、横竖屏切换和触控事件由下面的 Android Chromium 用例覆盖。

## Chromium browser smoke''',
'testing mobile contracts')
rep('docs/TESTING.md',
'## GitHub Pages 部署验证',
'''### Android landscape mobile browser regression

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

## GitHub Pages 部署验证''',
'testing mobile browser')
rep('docs/TESTING.md',
'## 仍未覆盖的浏览器集成边界',
'## 仍未覆盖的浏览器集成边界\n\n- 真实 Android Chrome/Samsung Internet 与 iOS Safari 设备矩阵；当前自动移动端回归是 Chromium + Android UA/touch emulation。\n- 可选浏览器 fullscreen/orientation-lock、虚拟按键布局/灵敏度自定义、haptics、PWA 安装/离线缓存和更复杂的移动端 crafting 长按/拆分手势。',
'testing mobile gaps')

# FILE MANIFEST
rep('docs/FILE_MANIFEST.md',
'| `index.html` | 菜单、HUD、背包、工作台、聊天、护甲槽、Oxygen HUD 与死亡界面 DOM 壳层 | 不承载游戏逻辑 |',
'| `index.html` | 菜单、HUD、背包、工作台、聊天、护甲槽、Oxygen HUD、死亡界面、横屏旋转提示与手机触控 DOM 壳层 | 不承载游戏逻辑 |',
'manifest index mobile')
rep('docs/FILE_MANIFEST.md',
'| `death.css` | 死亡覆盖层、死亡原因/摘要和重生按钮样式 | 只负责表现，不参与死亡损失/重生规则 |',
'| `death.css` | 死亡覆盖层、死亡原因/摘要和重生按钮样式 | 只负责表现，不参与死亡损失/重生规则 |\n| `mobile.css` | 手机 portrait 旋转提示、landscape 虚拟控件、safe-area 与紧凑 HUD/Inventory 布局 | 只负责移动端表现；不改变 gameplay 规则 |',
'manifest mobile css')
rep('docs/FILE_MANIFEST.md',
'| `src/main.js` | 应用状态机、Three.js 场景、系统编排、交互、奖励/死亡/护甲/氧气/天气接线与自动保存 | 死亡先 `beginPlayerDeath()` 清算并进入 deathState；只有显式动作 `completeRespawn()`；死亡时阻断普通世界帧/输入 |',
'| `src/main.js` | 应用状态机、Three.js 场景、系统编排、桌面/移动共享交互、奖励/死亡/护甲/氧气/天气接线与自动保存 | 主/副交互只有一条 gameplay 路径；手机不要求 Pointer Lock，桌面仍要求；暂停/面板/死亡清虚拟输入 |\n| `src/device-profile.js` | 桌面/手机与横竖屏环境判定、body dataset 同步 | 纯环境逻辑；UA/UA-CH + touch/coarse/no-hover 边界可 Node 测试 |\n| `src/mobile-controls.js` | 摇杆、拖动视角、hold/toggle/action 触摸手势适配 | 只输出虚拟输入/callback；不得直接写 World/Inventory/Storage |',
'manifest mobile modules')
rep('docs/FILE_MANIFEST.md',
'| `src/player.js` | 输入、陆地/飞行/水中移动、AABB 碰撞、视角、玩家快照、受伤/击退/世界出生与精确 `respawnAt()` | 三点 liquid 采样；所有模式共用单一轴向位移积分；精确重生仍使用 AABB 校验 |',
'| `src/player.js` | 键盘 + virtual input、陆地/飞行/水中移动、AABB 碰撞、视角、玩家快照、受伤/击退/世界出生与精确 `respawnAt()` | 桌面/手机输入只在单一 `update()` 积分；触控模拟量保持幅度；精确重生仍使用 AABB 校验 |',
'manifest player mobile')
rep('docs/FILE_MANIFEST.md',
'| `scripts/check-bed.mjs` | 床朝向/配对/锚点、BLOCKS/ITEMS 元数据、3×3 配方和羊毛 loot 来源 | 纯逻辑/静态数据；不启动浏览器 |',
'| `scripts/check-bed.mjs` | 床朝向/配对/锚点、BLOCKS/ITEMS 元数据、3×3 配方和羊毛 loot 来源 | 纯逻辑/静态数据；不启动浏览器 |\n| `scripts/check-mobile.mjs` | 手机/桌面设备画像、iPad/触摸笔记本边界与移动输入静态集成 contract | Node 22；不伪造 WebGL/Pointer Lock |',
'manifest check mobile')
rep('docs/FILE_MANIFEST.md',
'| `tests/e2e/smoke.spec.mjs` | Chromium 主世界、普通死亡回收、自定义 `/spawnpoint` 与床重生锚点四世界集成 | 第四世界通过真实 Inventory→hotbar→Pointer Lock→右键放床/激活，并验证两端 edits + respawnPoint + 异地死亡重生；全程捕获 page/console error |',
'| `tests/e2e/smoke.spec.mjs` | Chromium 主世界、普通死亡回收、自定义 `/spawnpoint` 与床重生锚点四世界集成 | 桌面玩法回归；床仍经过真实 raycast/right-click/persist/death/respawn；全程捕获 page/console error |\n| `tests/e2e/mobile.spec.mjs` | Android Mobile UA + touch 的横屏浏览器集成 | 横竖屏检测、无 Pointer Lock、背包/暂停/视角、摇杆位移和触控热栏 |',
'manifest mobile test')
rep('docs/FILE_MANIFEST.md',
'| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn/bed 九套测试 |',
'| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn/bed/mobile 十套测试 |',
'manifest package ten')
