# 服务器权威 Inventory / Hotbar 基础

这一增量只建立多人服务器后续生存玩法需要的物品状态底座，不提前实现掉落拾取、放置、装备或客户端背包同步。

## 36 格布局

背包固定为 36 格：主背包 27 格（0..26），hotbar 9 格（27..35）。共享模块 `src/inventory-layout.js` 统一这些常量和 hotbar 校验。

原有创造模式初始化有 10 个 `CREATIVE_START` 物品，却从索引 27 连续写入，因此第 10 个物品会落到索引 36，把数组扩成 37 格。现在前 9 个 starter 放入 hotbar，多出的 starter 从主背包索引 0 开始放置，所有客户端和服务器状态都保持 36 格。

## 服务器状态

`ServerPlayerInventoryState` 独立维护服务器 slots，不复用客户端 `Inventory` 的 cursor/click UI 语义。它只接受已知 item id、合法数量和合法 slot/hotbar 范围，并返回克隆快照。

`ServerPlayerInventoryHub` 按 session 管理状态。production runtime 在 session ready 时创建 inventory，在断开、启动失败或 runtime stop 时清理。

服务器当前 hotbar 选择仍来自既有严格 `hotbar-select` action gate；`runtime.selectedStack(session)` 将该已校验 selectedSlot 与服务器自己保存的 inventory 组合，因此未来 survival 挖掘的工具判定不需要相信客户端声称“手里拿了什么”。

## 暂不包含

- inventory snapshot 网络协议与客户端 reconciliation；
- 服务端拾取/掉落；
- 服务端耐久；
- 装备栏；
- crafting；
- placement/use 消耗。

这些能力后续应在此服务器状态上继续扩展，而不是让客户端提交最终 inventory 结果。
