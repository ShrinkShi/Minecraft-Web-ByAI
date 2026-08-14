# 多人服务器权威地面物品实体

本阶段把地面掉落物从“客户端本地 Three.js 对象 + 本地背包拾取”提升为多人服务器权威实体。单人模式继续使用原有 `DropSystem` 本地模拟；多人模式的地面物品位置、数量、寿命、拾取和消失均由服务器决定。

## 协议

新增 `item-entity-replication v1`：

- `item-entity-spawn`：建立实体与 revision 基线；
- `item-entity-snapshot`：更新位置、速度、数量、age 与 pickupDelay；
- `item-entity-despawn`：以 `picked / expired / removed` 之一结束实体生命周期。

客户端为每个 item entity 维护独立 revision gate。重复 spawn、未知实体 snapshot/despawn、重复或陈旧 revision 都是协议错误，不静默容忍。

## 服务端生命周期

`ServerItemEntityHub` 在 authoritative world 的全局 tick 完成后只更新一次，因此实体模拟速度不会随在线玩家数量倍增。当前包括：

- 20 Hz 重力与水平阻尼；
- 简单落地碰撞与反弹；
- 300 秒寿命；
- 默认 0.45 秒拾取延迟；
- 玩家附近的服务器拾取判定；
- 新玩家加入时 replay 当前仍存在的全部地面实体。

服务器 Q 丢弃现已接入：客户端发送带引用 view sequence 的 `drop` action，服务器根据该 action 当时的 selected hotbar slot 与 view 生成抛出方向。生存/冒险会从服务器 Inventory 扣除 1 个物品；创造模式生成副本而不消耗原库存；旁观模式禁止丢弃。

## 拾取顺序

多人拾取调用服务器 `ServerPlayerInventoryState.addPickup()`，排序与单人模式保持一致：

1. 快捷栏已有同类未满堆叠；
2. 快捷栏空位；
3. 主背包已有同类未满堆叠；
4. 主背包空位。

因此“捡起物品优先进入快捷栏”不再只是客户端视觉行为，而是服务器 Inventory 真相。

拾取成功后先推进并复制 Inventory revision，再更新或 despawn 地面 item entity。客户端最终只根据服务器 Inventory snapshot 与 item entity replication 更新 UI/Three.js，不自行决定拾取结果。

## 客户端渲染

`MultiplayerMovementSession` 会缓存当前全部权威 item entity。若 spawn 在 gameplay runtime 创建之前到达，runtime attach 后会 replay，而不是丢失。

`DropSystem` 新增权威实体视觉路径：

- `spawnAuthoritative()`；
- `snapshotAuthoritative()`；
- `despawnAuthoritative()`。

权威实体只做位置插值与旋转，不运行本地重力和本地 pickup，避免双真相。

## 下一阶段

当前服务器地面 item entity 已可作为后续 survival 链路的统一落点。下一阶段应把方块破坏改为服务器计时/工具/harvest 判定，并在破坏成功时调用服务器 item entity spawn，而不是客户端 `drops.spawn()`。随后再接 survival 放置消耗、方块掉落规则扩展与多人死亡掉落。
