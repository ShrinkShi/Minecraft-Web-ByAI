# 联机与跨平台协议约束

## 核心原则

Minecraft-Web-ByAI 只有一个 Web 客户端和一套游戏运行时。桌面浏览器、Android 浏览器、iOS/iPadOS 浏览器以及未来的手柄输入都不得形成独立玩法分支。

平台差异只能存在于以下边界：

```text
设备事件
  -> DesktopControls / MobileControls / future GamepadControls
  -> ControlIntentBus
  -> canonical ControlState + Player absolute view
  -> PlayerController / shared gameplay actions
  -> future network protocol
```

World、Player、Inventory、Equipment、Crafting、Combat、Entity、Storage、规则计算和未来 multiplayer replication 均为共享实现。

## PlayerControlFrame v1

`src/player-control-frame.js` 定义未来实时联机可以复用的连续玩家控制帧。当前 v1 只表达：

- `v`：协议版本；
- `seq`：uint32 顺序号；
- `move`：归一化 `[side, forward]`；
- `buttons`：jump / sneak / sprint / primary 的位掩码。

明确禁止把以下内容放入控制帧：

- `desktop` / `touch` / `mobile` 等输入源名称；
- User-Agent、浏览器品牌、操作系统；
- 屏幕尺寸、DPI、安全区；
- Pointer Lock 状态；
- 移动端 UI 按钮布局。

同一个逻辑控制状态无论来自键鼠、触控还是未来网络/手柄适配器，编码后的 PlayerControlFrame 必须相同。

### 严格 wire 校验

本地 `ControlIntentBus` 可以把设备噪声和多输入源合并为规范化状态；网络边界不能继续使用这种“尽量修正”的策略。`PlayerControlFrame v1` 的 encoder/decoder 必须显式拒绝协议错误，而不是静默改写：

- `seq` 必须原本就是 `0..0xffffffff` 的整数；非法值不得自动变成 `0`；
- `move` 两项必须原本就是有限 `number`，不接受数值字符串；
- `move` 每轴必须位于 `[-1,1]`，二维长度不得超过 1（仅容许浮点误差）；
- `buttons` 只能使用 v1 已定义的四个位；
- v1 frame 只能出现 `v / seq / move / buttons` 四个字段，额外的 `source`、`device` 或其他未知字段直接拒绝；
- 不兼容版本必须显式拒绝，不能退化为旧版本解析。

这样可以保证未来 server-authoritative 服务端收到的是已经满足协议不变量的输入，而不是把畸形或恶意数据归一化成另一条合法指令。

## PlayerViewFrame v1

仅有移动按键仍不足以做服务端权威模拟。玩家“向前”取决于 yaw，而攻击、挖掘、放置和实体交互还依赖 yaw + pitch。因此 `src/player-view-frame.js` 单独定义绝对视角帧：

- `v`：视角帧版本；
- `seq`：uint32 顺序号；
- `yaw`：规范化到 `[-π, π)` 的绝对水平朝向；
- `pitch`：绝对俯仰角，范围与当前 Player 运行时一致，为 `[-1.553, 1.553]`。

这里刻意发送“绝对朝向”而不是 MouseEvent/PointerEvent/touch drag 的原始 delta。桌面鼠标、手机拖拽和未来手柄摇杆只负责在客户端形成同一个 Player yaw/pitch；网络协议不携带输入设备来源。

wire decoder 对 view frame 同样采用严格校验：数值字符串、NaN/Infinity、非 canonical yaw、越界 pitch、非法 seq、额外字段和不兼容版本全部拒绝。encoder 只对本地可无限累积的 yaw 做环绕规范化，不会把越界 pitch 静默夹回合法范围。

## 本地动作与未来网络动作

暂停、打开背包 GUI、切换第三人称、本地菜单焦点等属于客户端表现，不应发送给服务器作为世界模拟命令。

攻击/挖掘、使用/放置、丢弃、选择快捷栏、聊天和后续实体交互需要在真正实现联机时定义独立的、可验证的网络 action schema；不能直接把 DOM event、KeyboardEvent、PointerEvent 或 MobileControls callback 透传到服务器。

## 未来服务器边界

联机实现默认采用 server-authoritative 世界模型：

1. 客户端把规范化连续控制帧、绝对视角帧和离散游戏动作发送给服务器；
2. 服务器严格校验 schema/version/sequence 与动作合法性，再用 authoritative position + view 校验模式、距离、冷却、方块/实体状态；
3. 服务器执行世界变化并广播玩家/实体/方块状态；
4. PC 与手机玩家消费完全相同的 replication 消息；
5. 客户端可做移动预测/插值，但不得形成平台专属规则。

## 兼容性要求

- 网络消息必须带 schema/version，并允许显式拒绝不兼容版本。
- 存档 schema 与网络 schema 分离；不能因为移动端 UI 改版提升世界存档版本。
- 服务端不得依据设备类型赋予不同伤害、移动速度、碰撞、掉落或交互距离。
- 自动化必须保留 desktop/touch/network-peer 的 canonical control frame 等价，并验证绝对 view frame 不含 device/source 身份。
- malformed control/view frame 必须覆盖非法 sequence、额外字段、类型伪装、未知 bit、未归一化 move、非 canonical yaw 和越界 pitch 的拒绝。

## 当前状态

当前尚未实现真实多人服务器、WebSocket/WebTransport、玩家复制、房间/认证或服务器存档。`PlayerControlFrame v1` 与 `PlayerViewFrame v1` 只建立协议边界；下一步仍应先定义离散 gameplay action schema，再接传输层，避免把本地 UI 事件直接固化成网络协议。
