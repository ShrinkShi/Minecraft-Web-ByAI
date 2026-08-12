from pathlib import Path


def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('README.md',
'- 自动区分桌面浏览器与手机/触控优先浏览器：桌面继续使用 Pointer Lock + 键鼠；手机横屏显示左摇杆、右侧拖动视角，以及攻击/持续挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天和 F5 等价视角按钮。手机竖屏会覆盖游戏并提示旋转到横屏；不强制调用浏览器方向锁定 API。\n',
'- 自动区分桌面浏览器与手机/触控优先浏览器：桌面继续使用 Pointer Lock + 键鼠；手机横屏显示左摇杆、右侧拖动视角，以及攻击/持续挖掘、使用/放置、跳跃、疾跑、潜行、丢弃、背包、暂停、聊天和 F5 等价视角按钮。手机竖屏会覆盖游戏并提示旋转到横屏；不强制调用浏览器方向锁定 API。\n- **PC 与手机不是两个游戏端**：仓库只有一套 Web runtime、Player、World、Inventory、存档和玩法状态机。`DesktopControls` 与 `MobileControls` 只负责把不同设备事件翻译成同一个版本化 `ControlIntentBus`；未来联机也必须复用同一控制/世界协议，使桌面与手机可以进入同一服务器、同一世界。\n',
'README unified client')

rep('docs/ARCHITECTURE.md',
'9. **远端证据决定完成度**：只有进入 GitHub `main` 且质量门和 Pages 通过才算完成。\n',
'9. **远端证据决定完成度**：只有进入 GitHub `main` 且质量门和 Pages 通过才算完成。\n10. **单客户端、多输入适配器**：桌面/手机不得分叉 World、Player、Inventory、命令、存档或玩法规则。设备差异只允许存在于输入适配和响应式 UI；未来网络层接收/发送的也是平台无关 gameplay intent/state。\n',
'architecture principle')

marker='## World / Water render\n'
insert='''## Platform / Control Intent\n\n- 浏览器项目只有一个客户端 runtime，没有“电脑版逻辑”和“手机版逻辑”两棵树。\n- `control-intents.js` 定义 `CONTROL_INTENT_VERSION=1`、规范化连续状态和一次性动作；状态来源可以是 `desktop`、`touch`，以后也可以是 `gamepad` 或 `network-peer`。\n- `desktop-controls.js` 只把 Keyboard/Mouse/Pointer Lock 翻译成标准意图；`mobile-controls.js` 只把摇杆/触摸/按钮翻译成同一标准意图。\n- `PlayerController` 不再注册 DOM keyboard/mouse listener，也不保存 `virtualInput`；它只消费规范化 `controlState` 和平台无关 look intent。\n- `main.js` 的 `handleControlIntent()` 不按输入来源分叉玩法：primary/secondary、背包、热栏、暂停、聊天、视角和丢弃都进入同一运行时函数。\n- Pointer Lock、横竖屏提示和 safe-area 属于 presentation/input adapter，不得进入世界快照或未来 server-authoritative gameplay state。\n- 联机实现时客户端平台字段可以用于 UI/遥测，但不得决定碰撞、伤害、移动速度、物品、实体或世界协议。PC 与手机必须能进入同一房间并互相看到/交互。\n\n'''
rep('docs/ARCHITECTURE.md',marker,insert+marker,'architecture platform section')

rep('docs/PROGRESS.md',
'- [x] `npm run test:logic`：基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation + Death Integration + Custom Respawn + Bed Rules + Mobile Device/Input 十套回归。\n',
'- [x] `npm run test:logic`：基础世界/实体/Worker + Equipment/Armor + Water Mesh + Oxygen/Drowning + Swimming/Buoyancy + Weather/Precipitation + Death Integration + Custom Respawn + Bed Rules + Mobile Device/Input + Unified Control Intent，共 11 套回归。\n- [x] PC/手机输入统一：`ControlIntentBus` 为唯一 gameplay input contract；Desktop/Touch 只是适配器，Player 不再拥有 DOM 键盘监听或 mobile virtualInput。\n- [x] 联机前置平台约束：同一 World/Player/Inventory/存档/玩法语义，未来 `network-peer` 与本地输入复用相同控制状态，不创建独立 mobile client protocol。\n',
'progress control gate')

rep('docs/TESTING.md',
'scripts/check-mobile.mjs\n```\n',
'scripts/check-mobile.mjs\nscripts/check-controls.mjs\n```\n',
'testing suite list')

bed_marker='### Bed rules\n'
control_section='''### Unified control intents\n\n`scripts/check-controls.mjs` 覆盖：\n\n- 标准移动向量归一化与 `CONTROL_INTENT_VERSION=1`。\n- 多输入 source 合并与 source reset；不同 source 同时按住 primary 时只有合并状态真正释放才产生 release edge。\n- look intent 的有限幅度、动作白名单和非法动作拒绝。\n- `desktop`、`touch`、`network-peer` 对同一逻辑输入必须生成完全相同的规范化 gameplay state。\n- `scripts/check-mobile.mjs` 额外静态拒绝 Player 重新出现 `virtualInput`、`setVirtualMove`、DOM keyboard/mouse listener，并要求 DesktopControls/MobileControls 都只通过同一个 bus 输出 move/button/look/action。\n\n真实桌面键盘/Pointer Lock 和 Android touch 路径继续由 Playwright 五场浏览器回归覆盖，因此 Node 层不伪造 DOM 输入。\n\n'''
rep('docs/TESTING.md',bed_marker,control_section+bed_marker,'testing control section')

rep('docs/FILE_MANIFEST.md',
'| `src/player.js` | 输入、陆地/飞行/水中移动、AABB 碰撞、视角、玩家快照、受伤/击退/世界出生与精确 `respawnAt()` | 三点 liquid 采样；所有模式共用单一轴向位移积分；精确重生仍使用 AABB 校验 |\n',
'| `src/control-intents.js` | 平台无关控制意图版本、连续状态归一化、多 source 合并、look/action 分发 | 纯逻辑；未来 gamepad/network-peer 必须复用，不得携带 DOM/设备规则 |\n| `src/desktop-controls.js` | Keyboard/Mouse/Pointer Lock → ControlIntentBus 桌面适配 | 只翻译输入，不访问 World/Inventory/玩法规则 |\n| `src/mobile-controls.js` | Touch/摇杆/手机按钮 → ControlIntentBus 触控适配 | 只翻译输入和维护触控 UI 状态，不实现独立玩法 |\n| `src/player.js` | 平台无关 controlState、陆地/飞行/水中移动、AABB 碰撞、视角、玩家快照、受伤/击退/世界出生与精确 `respawnAt()` | 不注册 DOM 输入；所有平台/未来网络输入共用单一轴向位移积分 |\n',
'manifest input modules')

rep('docs/FILE_MANIFEST.md',
'| `scripts/check-mobile.mjs` | 手机设备判定、触控布局/输入接线静态契约 | Node 22；Android Chromium 真实交互另由 mobile E2E 覆盖 |\n',
'| `scripts/check-mobile.mjs` | 手机设备判定、Desktop/Touch 适配器与 Player 输入解耦静态契约 | Node 22；Android Chromium 真实交互另由 mobile E2E 覆盖 |\n| `scripts/check-controls.mjs` | ControlIntent v1、source 合并、primary edge、look/action、desktop/touch/network-peer 等价性 | 纯逻辑；联机输入协议前置契约 |\n',
'manifest control tests')

rep('docs/FILE_MANIFEST.md',
'| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn/bed/mobile 十套测试 |\n',
'| `package.json` | Node 22+ 测试脚本与固定 Playwright | `test:logic` 顺序跑基础/armor/water/oxygen/swim/weather/death/respawn/bed/mobile/controls 十一套测试 |\n',
'manifest package count')

rep('CHANGELOG.md',
'### Engineering quality\n',
'### Engineering quality\n- 输入架构收口为单一 `ControlIntentBus v1`：桌面键鼠、手机触控与未来 network/gamepad source 使用同一 gameplay state/action 语义；`PlayerController` 不再直接监听 DOM，也不再保留 mobile-only `virtualInput`。\n- 新增 `DesktopControls` 适配器并重构 `MobileControls`：两者只负责设备事件翻译，primary/secondary/背包/热栏/聊天/暂停/视角等统一进入 `handleControlIntent()`，World/Player/Inventory/存档不按平台分叉。\n- 新增第 11 套 `scripts/check-controls.mjs`，明确验证 `desktop` / `touch` / `network-peer` 的规范化状态等价，为未来 PC↔手机同服联机建立协议前置约束。\n',
'changelog controls')
