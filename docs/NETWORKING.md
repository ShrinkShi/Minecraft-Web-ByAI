# 联机与跨平台协议约束

## 核心原则

Minecraft-Web-ByAI 只有一个 Web 客户端和一套游戏运行时。桌面浏览器、Android 浏览器、iOS/iPadOS 浏览器以及未来的手柄输入都不得形成独立玩法分支。

平台差异只能存在于以下边界：

```text
设备事件
  -> DesktopControls / MobileControls / future GamepadControls
  -> ControlIntentBus
  -> canonical ControlState + Player absolute view + semantic gameplay actions
  -> PlayerController / shared gameplay rules
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

## PlayerActionFrame v1

`src/player-action-frame.js` 定义第一批离散 gameplay action。这里使用**语义动作**而不是键鼠/触控事件名称：

- `use`：使用/交互/放置，对应当前 runtime 的 secondary gameplay 语义；
- `drop`：丢出当前选中物品；
- `hotbar-select`：把当前快捷栏切换到绝对 `slot=0..8`。

`use` 与 `drop` wire frame 为：

```text
{ v, seq, kind, viewSeq }
```

两者都依赖玩家朝向：使用/放置需要视线 raycast，丢弃物的初速度也沿玩家视线。因此它们必须引用一个已发送的 `PlayerViewFrame` 序号 `viewSeq`。

`hotbar-select` 为：

```text
{ v, seq, kind: "hotbar-select", slot }
```

这里发送绝对 slot，而不是鼠标滚轮 `+1/-1` 或移动端按钮来源。桌面数字键、滚轮、手机热栏和未来手柄都必须先归一化到同一个 0..8 结果。

### 不信任客户端 target

PlayerActionFrame v1 **不允许**包含客户端声称命中的：

- block x/y/z；
- entity id；
- hit face / previous cell；
- reach distance；
- `source/device`。

服务端收到 `use` 或 primary control 后，应使用 authoritative player position 和所引用/已接受的 absolute view 自己做 raycast，再校验模式、交互距离、方块/实体状态、冷却和库存。未来如果为了延迟补偿加入 client target hint，也只能作为非权威提示，并需要新的明确 schema/version 设计。

### 本地动作与独立协议

当前 `ControlIntentBus` 中的动作不能原样全部上网：

- `focus / escape / pause / inventory / view`：客户端 UI/镜头控制，不属于实时世界 action；
- `chat`：未来应走独立 chat/message schema，不塞进 PlayerActionFrame；
- `hotbar-step`：设备相对输入，必须先在客户端解析成绝对 `hotbar-select`；
- `secondary / drop / hotbar-select`：可分别映射为 `use / drop / hotbar-select`。

背包 GUI 本身是本地表现，但未来真正的槽位移动、合成、装备等会改变 authoritative gameplay state，必须另定义 inventory transaction schema，不能因为“inventory 打开动作是本地的”就让物品修改继续客户端权威。

## 未来服务器边界

联机实现默认采用 server-authoritative 世界模型：

1. 客户端把规范化连续控制帧、绝对视角帧和离散 gameplay action 发送给服务器；
2. 服务端分别严格校验 schema/version/sequence，并拒绝未知字段、类型伪装和不兼容版本；
3. 对依赖视线的 action，服务端通过 `viewSeq` 关联已接受的 absolute view，再用 authoritative position 自己 raycast；
4. 服务端校验模式、距离、冷却、库存、方块/实体状态后才执行世界变化；
5. 服务端广播玩家/实体/方块/库存等 authoritative replication；PC 与手机消费相同消息；
6. 客户端可做移动预测/插值和视觉反馈，但不得形成平台专属规则或权威世界修改。

## 兼容性要求

- 网络消息必须带 schema/version，并允许显式拒绝不兼容版本。
- 存档 schema 与网络 schema 分离；不能因为移动端 UI 改版提升世界存档版本。
- 服务端不得依据设备类型赋予不同伤害、移动速度、碰撞、掉落或交互距离。
- 自动化必须保留 desktop/touch/network-peer 的 canonical control frame 等价，并验证 view/action frame 不含 device/source 身份。
- malformed control/view/action frame 必须覆盖非法 sequence、额外字段、类型伪装、未知 bit/kind、未归一化 move、非 canonical yaw、越界 pitch、非法 hotbar slot 和 client target 注入的拒绝。

## 当前状态

当前尚未实现真实多人服务器、WebSocket/WebTransport、玩家复制、房间/认证、inventory transaction、chat message 或服务器存档。`PlayerControlFrame v1`、`PlayerViewFrame v1`、`PlayerActionFrame v1` 已建立实时输入协议边界；下一步才适合建立最小 transport/envelope/ordering 层，而不是继续把 DOM 或客户端命中结果直接暴露给服务器。
