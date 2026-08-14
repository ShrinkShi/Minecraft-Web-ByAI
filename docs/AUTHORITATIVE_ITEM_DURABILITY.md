# 物品实例与工具耐久边界

## 目标

工具耐久不能只作为一个 UI 数字存在。只要磨损状态没有贯穿 Inventory、网络、地面 item entity、单机存档和实际挖掘事务，玩家就可以通过丢弃/拾取、重连、死亡或其它状态转换把磨损工具错误恢复成新品。

当前多人服务器权威链已经完整贯穿挖掘、Inventory、Q 丢弃、地面实体、拾取和客户端槽位显示。单机 Survival 也已经接入同一个 `item-stack` 与 `mining-rules` 规则，不再在 `main.js` 中维护第二套挖掘速度/harvest 公式。

## Item stack 实例状态

`src/item-stack.js` 是共享规范：

- 普通旧 stack 仍可保持 `{id,count}`；
- 只有存在磨损时才持久化 `damage`，即 `{id,count,damage}`；
- `damage=0` 会规范化回无字段的旧形态，因此已有单机存档无需迁移；
- damageable item 当前来自 `ITEMS[itemId].tool.durability`；
- 木镐耐久为 59，可存储 damage 0..58；下一次损耗达到 59 时工具损坏并从 stack 中移除；
- 不可损耗物品不能携带正 damage；
- 合并 stack 时不仅要相同 itemId，还必须具有相同实例 damage。

客户端和服务器都提供两类 API，不能混用：

- `add(id,count)` / `addPickup(id,count)`：批量生成未磨损同类物品，可跨多个槽分配；
- `addStack(stack)` / `addPickupStack(stack)`：移动一个已有实例状态，必须保留 damage。

本地客户端另有 `returnExistingStack()`，只用于把已经存在于本地 UI/旧存档中的 stack 放回背包。它不是网络或新物品创建入口，因此能在不放宽网络严格校验的前提下继续保留历史未知 itemId。

`Inventory.damageAt()` 是单机显式耐久 mutation 入口。它要求槽位和 expected itemId 都匹配，只有真实 damage/break 才写回 stack 并发布 `durability` 变更通知；非 damageable item、空槽或 item 已改变都不会伪造一次损耗。

## 多人协议 v2

引入实例状态后，旧多人 wire 已不再兼容，因此整体 WebSocket subprotocol 从 `minecraft-web-v1` 升为 `minecraft-web-v2`，握手版本同步升为 2。旧客户端应在协议协商/hello 阶段被拒绝，而不是完成连接后才在 Inventory 消息阶段失败。

Inventory snapshot 同步升为 v2：

- 未磨损 stack：`[itemId,count]`；
- 磨损 stack：`[itemId,count,damage]`。

Item entity replication 同步升为 v2，并在 spawn/snapshot 中显式携带数字 `damage`；普通物品为 0。地面实体生命周期中 itemId 和 damage 都视为实例身份的一部分，不能在 snapshot 中被任意替换。

## 多人服务器权威耐久消费

多人 survival 挖掘仍先执行已有权威流程：目标、挖掘时间、harvest、world mutation 和掉落判定都不变。

只有 `SurvivalBlockBreakController.step()` 明确返回 `breakResult.changed=true` 后，runtime 才对该 tick 服务器当前 selected hotbar item 扣 1 点耐久：

1. 使用破坏完成前的工具状态做 harvest 判定；
2. 完成 world mutation；
3. 对同一个 authoritative selected slot 的工具扣耐久；
4. 如果达到最大耐久则删除工具；
5. 推进一次 Inventory revision 并立即复制；
6. 再处理同 tick 后续的 queued use/drop actions。

因此一把只剩 1 点耐久的木镐仍能完成最后一次石头 harvest，然后工具损坏；紧随其后的 Q 不会还能丢出已经损坏的工具。

creative 不走 survival durability 消耗。

## 单机 Survival 挖掘

`src/singleplayer-mining-controller.js` 把原先散落在巨大 `main.js` 中的单机挖掘计时、harvest 和耐久事务抽成显式 controller。

它直接复用 `src/mining-rules.js`：

- `miningDurationMs()` 决定创造/生存破坏时间；
- `canHarvestBlock()` 决定是否产生方块掉落；
- adventure / spectator 不进入有效挖掘；
- 目标坐标或 block id 变化时累计进度立即从 0 重新开始，不把旧目标进度带到新方块。

一次成功单机 Survival 破坏的顺序固定为：

1. 使用当前 selected stack 计算最终 harvest；
2. world mutation 成功；
3. 产生该次 harvest 掉落；
4. 对同一个 selected item 调用 `Inventory.damageAt()` 扣 1 耐久；
5. 如达到最大耐久则工具损坏；
6. 更新 HUD / 存档 dirty 状态。

因此 damage=58 的木镐仍能完成最后一次有效 harvest，然后才从快捷栏消失；world mutation 失败则不会扣耐久。creative 破坏不会消耗工具耐久，也不会产生 Survival harvest drop。

`main.js` 不再保留旧的 `toolMultiplier()` / `canHarvest()` / `breakStart` 第二套规则，只负责把真实 aim、世界修改、DropSystem、Inventory 和 UI 回调接入 controller。

## 丢弃、死亡与拾取

Q 丢弃不能重新构造 `{id,count:1}`。多人 survival runtime 使用 Inventory 真正 `remove()` 出来的 stack 作为地面实体输入；单机也把 `ui.consumeSelected()` 返回的完整 stack 直接交给 `DropSystem.spawnStack()`。

单机死亡掉落、面板 overflow 也都走 `spawnStack()`，因此磨损工具不会通过死亡、关闭界面或异常 overflow 自动恢复满耐久。creative Q 丢弃复制当前 selected stack 的实例 metadata，而不是只复制 itemId。

如果多人 item entity spawn 失败，回滚必须调用 `addPickupStack()`，不能按 itemId 新建新品。

拾取时 item entity 把完整实例状态交给 Inventory；hotbar-first 路由仍保留，但不会抹掉 damage。

## 槽位耐久显示

`src/item-durability-display.js` 只根据 stack 中已经存在的 `damage` 计算显示数据，不自行推测使用次数。

- 满耐久工具不显示耐久条；
- 首次磨损后显示 Minecraft 风格的底部细条；
- 长度表示剩余耐久比例；
- 颜色根据剩余比例由绿色逐步过渡到红色；
- title / aria-label 同时提供 `耐久 remaining / maximum`；
- Inventory model 变更后，快捷栏、背包、工作台背包区和 cursor stack 都由同一 `UI.makeSlot()` 重绘。

最终一次使用删除工具后，新 Inventory state 会直接移除槽位物品和耐久条。

## 合成界面的实例安全

耐久状态不能被 UI 操作洗掉。合成格现在遵守完整 stack identity：

- 左键/右键拿取会复制完整 stack metadata；
- 向空合成格右键放 1 个时保留 damage；
- 只有 itemId 与 damage 都相同的实例才允许合并；
- Shift 从合成格移回背包使用 `returnExistingStack()`；
- `CraftingGrid.drain()` 和 `clearTo()` 保留完整 stack，而不是降级成 `{id,count}`；
- 关闭面板时既不会修复磨损工具，也不会吞掉历史未知本地物品。

## 当前明确未完成

当前仍不把以下内容伪装成已经完成：

- 铁镐、石镐、钻石镐等更多工具与 harvest tier；
- 工具耐久随机减免、附魔等；
- 武器/工具攻击时的耐久消费；
- 装备耐久。

下一阶段应先加入真正有可验证差异的工具 tier 与 harvest level，再扩展更多方块需求；不要先堆一套没有实际物品/方块差异支撑的空抽象层。
