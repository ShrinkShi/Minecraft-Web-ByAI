# 多人物品实例与工具耐久权威边界

## 目标

工具耐久不能只作为一个 UI 数字存在。只要磨损状态没有贯穿 Inventory、网络和地面 item entity，玩家就可以通过丢弃/拾取、重连或其它状态转换把磨损工具错误恢复成新品。

本阶段先把多人服务器权威链完整打通。单机仍使用同一个共享 `item-stack` 数据模型，但单机挖掘入口的耐久扣除将在下一阶段先从巨大 `main.js` 中抽离后接入，避免为了一个副作用整文件手工重写入口。

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

## 多人协议 v2

引入实例状态后，旧多人 wire 已不再兼容，因此整体 WebSocket subprotocol 从 `minecraft-web-v1` 升为 `minecraft-web-v2`，握手版本同步升为 2。旧客户端应在协议协商/hello 阶段被拒绝，而不是完成连接后才在 Inventory 消息阶段失败。

Inventory snapshot 同步升为 v2：

- 未磨损 stack：`[itemId,count]`；
- 磨损 stack：`[itemId,count,damage]`。

Item entity replication 同步升为 v2，并在 spawn/snapshot 中显式携带数字 `damage`；普通物品为 0。地面实体生命周期中 itemId 和 damage 都视为实例身份的一部分，不能在 snapshot 中被任意替换。

## 服务器权威耐久消费

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

## 丢弃与拾取

Q 丢弃时不能重新构造 `{id,count:1}`。survival runtime 使用 Inventory 真正 `remove()` 出来的 stack 作为地面实体输入，所以 wear 会随工具一起丢出。

如果 item entity spawn 失败，回滚也必须调用 `addPickupStack()`，不能按 itemId 新建新品。

拾取时服务器 item entity 把完整实例状态交给 Inventory；Inventory hotbar-first 路由仍保留，但不会抹掉 damage。

客户端 DropSystem 也保存 damage，使网络权威地面工具的 debug/state/最终单机复用都不会丢失实例信息。

## 当前明确未完成

本阶段不把以下内容伪装成已经完成：

- 单机挖掘成功后的耐久扣除；
- HUD 槽位耐久条；
- 铁镐、石镐、钻石镐等更多工具与 harvest tier；
- 工具耐久随机减免、附魔等；
- 武器/工具攻击时的耐久消费；
- 装备耐久。

下一阶段优先抽离单机 mining interaction，再接同一个共享 item-stack durability 规则；之后再决定 UI 耐久条与工具 tier 数据扩展。
