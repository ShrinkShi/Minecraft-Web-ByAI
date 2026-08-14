# 多人生存模式服务器权威挖掘

多人 survival 的方块破坏由服务器执行连续挖掘。客户端只发送标准连续 `primary` control；服务器根据玩家权威位置/视角、服务器 Inventory 当前快捷栏物品和方块元数据决定目标、进度、是否破坏以及是否产生掉落。客户端不会提交“我已经挖完某个方块”的结果。

## 权威边界

服务器每个 20 Hz 玩家 tick 执行：

1. 读取当前 `primary` 是否按住；
2. 使用权威玩家位置、yaw、pitch 做 6 格 DDA raycast；
3. 根据目标坐标与 block id 判断是否继续同一挖掘目标；
4. 使用服务器当前 selected hotbar item 计算本 tick 进度；
5. 达到完成阈值后通过既有 `commitBlockChange()` 修改世界并广播 world revision；
6. 按 harvest 规则决定是否生成服务器权威 item entity；
7. 将本 tick 的服务器挖掘状态通过 `mining-progress` v1 反馈给对应客户端。

松开 primary、目标消失、离开 survival 模式或完成破坏都会清除服务器累计进度。目标切换不会沿用旧目标的累计值，而是从新目标重新开始。

## 当前挖掘公式

`src/mining-rules.js` 固化当前项目的数值语义：

- survival 基础时间：`hardness * 900ms`；
- 正确工具：倍率 `2.5 * tool.speed`；
- 手持其他工具但方块不要求该工具：通用倍率 `1.2`；
- 最短破坏时间：`120ms`；
- creative 参考瞬破时间：`70ms`；
- adventure / spectator 不参与该 survival controller。

例如石头 hardness 1.5：空手约 1350ms；木镐 speed 2，正确工具倍率 5，因此约 270ms。服务器 20 Hz 下木镐需要 6 个 50ms tick 完成。

为避免理论整 tick 时间被浮点累加误差拖成额外一 tick，完成判断使用极小 epsilon。

## Harvest 与掉落

方块是否能被破坏与是否产生掉落分开处理：

- 不要求工具的方块可正常掉落；
- `requires: 'pickaxe'` 的方块只有服务器当前快捷栏物品为 pickaxe 才 harvest；
- 石头使用木镐会生成 `block:10` 圆石；
- 空手破坏石头仍可完成，但不会产生圆石。

成功掉落不直接写入背包，而是进入服务器权威 item entity 系统，之后由统一 pickup radius / pickup delay / hotbar-first Inventory 路径完成拾取。

## Mining progress v1

`src/mining-progress-replication.js` 定义严格的 `mining-progress` v1 wire：

- `session`：只允许反馈给该玩家自己的连接；
- `tick`：沿用服务器网络序列语义，客户端要求严格单调递增；
- `active`：是否存在正在累计的服务器挖掘状态；
- `progress`：仅由服务器计算，范围 0..1；active 状态必须严格位于 0 与 1 之间；
- `target`：active 时携带目标 `x/y/z/blockId`，reset 时必须为 null。

`MiningProgressReplicationHub` 只在存在活动挖掘时按权威 tick 推送 progress。活动状态结束时只发送一次 reset；如果 reset 发送失败，会保留待清理状态并在下一 tick 重试，而不是静默让客户端残留旧进度。

浏览器 WebSocket 客户端对 progress tick 使用独立 `NetworkSequenceGate`。重复或倒退 tick、session 不匹配、非法 target/progress 都属于协议错误并 fail closed。

## HUD 显示边界

多人 HUD 不自行累计挖掘时间。`MultiplayerMovementSession` 只发布已经过 wire 校验的服务器 progress，`UI` 将其作为权威破坏进度显示。

UI 同时保留单机本地进度与多人权威进度两个展示槽：权威进度存在时优先显示，因此旧多人渲染循环的本地 `setBreak(0)` 不会覆盖服务器状态；收到服务器 reset 或断开多人会话后才回退到本地槽。这保证单人模式原有挖掘 UI 不需要复制或分叉。

不同多人 MovementSession 使用 owner token 隔离展示状态。旧连接的延迟 cleanup 不能清除新连接已经发布的进度。

## 客户端输入

多人 gameplay 安装 scoped primary interceptor，只用于阻止旧 `main.js` 的“联机方块/战斗权威尚未接入”本地 fallback。它不会截断 `onState`：primary 状态仍经 `MultiplayerInputBridge` 发往服务器。

离开多人 runtime 后 interceptor 被释放，单人模式原有 `onPrimary -> primaryActionStart/End` 路径保持不变。

## 当前未包含

本阶段只把 HUD 进度条服务端化，并没有宣称方块裂纹纹理已经网络复制。裂纹阶段贴图、远端玩家挖掘动画等仍需要后续独立设计，不能从本地计时猜测服务器进度。

另外仍未在本阶段实现：

- 工具耐久消耗；
- 更完整的工具 tier / harvest level；
- 附魔、急迫/挖掘疲劳、水下/悬空惩罚；
- 多人战斗 primary authority；
- 床、工作台等有状态交互的完整多人权威状态机。

普通 survival 方块右键放置与 Inventory 成功扣除已经由独立的服务器权威放置事务完成，不再属于本清单的缺口。
