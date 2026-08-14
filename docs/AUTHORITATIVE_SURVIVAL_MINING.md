# 多人生存模式服务器权威挖掘

本阶段把多人 survival 的方块破坏从“禁止客户端本地破坏”推进为服务器权威连续挖掘。客户端仍只发送标准连续 `primary` control；服务器根据玩家权威位置/视角、当前服务器 Inventory 快捷栏和方块元数据决定目标、进度、是否破坏以及是否产生掉落。

## 权威边界

服务器每个 20 Hz 玩家 tick 执行：

1. 读取当前 `primary` 是否按住；
2. 使用权威玩家位置、yaw、pitch 做 6 格 DDA raycast；
3. 根据目标坐标与 block id 判断是否继续同一挖掘目标；
4. 使用服务器当前 selected hotbar item 计算本 tick 进度；
5. 达到完成阈值后通过既有 `commitBlockChange()` 修改世界并广播 world revision；
6. 按 harvest 规则决定是否生成服务器权威 item entity。

松开 primary、目标消失、目标切换、离开 survival 模式都会清除已累计进度。客户端不能直接提交“我挖完了某个坐标”的请求。

## 当前挖掘公式

`src/mining-rules.js` 固化了当前项目原有单人模式的数值语义：

- survival 基础时间：`hardness * 900ms`；
- 正确工具：倍率 `2.5 * tool.speed`；
- 手持其他工具但方块不要求该工具：通用倍率 `1.2`；
- 最短破坏时间：`120ms`；
- creative 参考瞬破时间：`70ms`；
- adventure / spectator 不参与该 survival controller。

例如石头 hardness 1.5：空手约 1350ms；木镐 speed 2，正确工具倍率 5，因此约 270ms。服务器 20 Hz 下木镐需要 6 个 50ms tick 完成。

为避免 `450ms / 50ms` 这类理论整 tick 时间被浮点累加误差拖成额外一 tick，完成判断使用极小 epsilon。

## Harvest 与掉落

方块是否能被破坏与是否产生掉落分开处理：

- 不要求工具的方块可正常掉落；
- `requires: 'pickaxe'` 的方块只有当前服务器快捷栏物品为 pickaxe 才 harvest；
- 石头使用木镐会生成 `block:10` 圆石；
- 空手破坏石头仍可完成，但不会产生圆石。

成功掉落不直接塞进背包，而是调用上一阶段完成的服务器权威 item entity 系统。之后由统一 pickup radius / delay / hotbar-first Inventory 路径完成拾取。

## 客户端输入

多人 gameplay 安装 scoped primary interceptor，只用于阻止旧 `main.js` 的“联机方块/战斗权威尚未接入”本地 fallback。它不会截断 `onState`：primary 状态仍经 `MultiplayerInputBridge` 发往服务器。

离开多人 runtime 后 interceptor 被释放，单人模式原有 `onPrimary -> primaryActionStart/End` 路径保持不变。

## 当前未包含

本阶段暂不伪造客户端挖掘进度。方块破坏结果由已有 world-block-change 实时复制，掉落由 item entity 复制；但多人 HUD 的破坏裂纹/进度条还没有服务器 progress 协议。后续应增加低频、可校验的 mining progress feedback，而不是让客户端自行决定进度。

另外仍未在本阶段实现：

- survival 右键放置的服务器 Inventory 扣除；
- 工具耐久消耗；
- 更完整的工具 tier / harvest level；
- 附魔、急迫/挖掘疲劳、水下/悬空惩罚；
- 多人战斗 primary authority。
