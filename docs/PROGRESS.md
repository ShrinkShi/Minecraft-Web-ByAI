# Minecraft Web - 当前开发进度

更新时间：2026-08-26

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体完成度仍保守维持约 **35%**。浏览器渲染/资源管线、单机生存基础和 authoritative multiplayer 骨架已形成，当前主要缺口转向 registry breadth、原版 worldgen、redstone、dimensions、enchanting/brewing、广泛 status effects、server-authoritative PvE/XP/persistence 与更深 farming parity。

当前 merged `main`：`7dafe9f23700ae57af261d357339cc673eb4afb6`，为 PR #137 `docs: roll baseline forward after hunger authority` 的合并结果；它只滚动 merged documentation，不新增生产功能。

`docs/PROJECT_BASELINE.md` 只描述 merged main；未合并功能必须放在 active delivery 中。

## 最近完成：PR #136 Hunger follow-up

PR #136 已于 2026-08-26 squash merge。

### Food status effects

- 新增可复用 finite-duration status-effect state，不再把食物中毒逻辑硬编码进 Player loop。
- raw chicken：30% 概率 Hunger I / 30 秒。
- rotten flesh：80% 概率 Hunger I / 30 秒。
- effect roll 只在完整 1.6 s food transaction 成功提交后发生；cancel/reject 不产生效果。
- Hunger effect 通过同一 exhaustion state 生效，不建立第二套饥饿状态。

### Difficulty / gamerule boundary

- Peaceful：无 starvation damage，并进入当前实现的和平恢复规则。
- Easy：starvation 最低 10 HP。
- Normal：starvation 最低 1 HP。
- Hard：starvation 可降到 0 HP。
- `naturalRegeneration=false` 禁止 hunger-driven natural healing。
- 规则保持 pure/testable，不依赖浏览器 DOM。

### Singleplayer persistence

- save schema 从 **v9 → v10**，用于持久化 normalized active status effects。
- `terrainVersion` 自 schema v8 起必填的独立兼容合同保持不变。
- terrain generator 仍为 **v4**。
- active food-use input 继续是 transient state，不写入存档。
- pre-v10 world 继续通过显式 compatibility path 打开，而不是静默 reinterpret。

### Multiplayer Hunger authority

- 新增 `ServerPlayerHungerHub` + `HungerRuntimeController`，服务器持有 food / saturation / exhaustion / timer / status effects / active food use 真值。
- multiplayer food use 保持 1.6 s held/cancelable 行为。
- `use-release`、attack、drop、respawn、mode/death、selected-stack change 都能在完成前取消且不消费。
- completion 时重新校验 selected stack，并通过 authoritative inventory `commitSelected()` 原子提交 Hunger/effect mutation 与物品扣除。
- Workbench/Furnace interaction 优先于 eating，手持食物不会阻止打开容器。
- movement/swim/jump/successful attack/successful damage exhaustion 接入服务器 Hunger。
- food<=6 的 sprint gate 在服务器 input state 上执行。
- regeneration/starvation 不直接篡改 Combat HP，而是调用 Combat authority 的 heal/environment-damage API。
- respawn/mode/session lifecycle 同步 Hunger state。

### Multiplayer wire / browser presentation

- 新增 revisioned `player-hunger-snapshot`。
- live multiplayer bootstrap 必须收到首个 Hunger snapshot 才进入 ready。
- browser 只把 authoritative Hunger snapshot 应用到 Player cache、HUD 和 first-person eating progress，不运行 competing Hunger simulation。
- `use-release` 改变 action wire semantics：player action frame 为 **v3**，handshake/subprotocol 升级为 **v5 / `minecraft-web-v5`**；legacy v4 不伪装兼容。

### Validation

最终 exact head：`80cc188fd9deaec104c4a86ab8e952965f4759f1`

Repository quality run #1271 (`32924502937`)：

- JavaScript syntax：PASS；
- full logic/worker regression：PASS；
- Chromium shard 1/2：PASS；
- Chromium shard 2/2：PASS；
- real browser → real authoritative Node server Hunger E2E：PASS；
- final base drift：0；
- reviews / review threads / PR comments：0。

Squash merge commit：`6a56c33d79c074f95f2be750f9d25ec246766b1b`。

## 当前兼容性边界

- block/item IDs 保持 append-only，不重排现有 ID；
- singleplayer save schema：**v10**；
- terrain generator：**v4**，local v2/v3 compatibility path 保持不变；
- historical `CREATIVE_START` 顺序/slot mapping 不变；
- multiplayer handshake/subprotocol：**v5 / `minecraft-web-v5`**；
- player action frame：**v3**；
- browser presentation 不成为 gameplay authority；
- multiplayer Hunger/food use 不允许 client-side competing truth。

## Active delivery：PR #138 Registry breadth phase 1

当前 Draft PR #138 基于 `main 7dafe9f23700ae57af261d357339cc673eb4afb6`，本阶段只收口普通 full-cube stone/wood breadth 与已经进入同一 PR 的 Creative/first-person presentation 修复，不向 stateful block families 扩 scope。

### Registry breadth phase 1

- append-only 新增 block ID 44..53：granite、diorite、andesite、spruce/birch/jungle/acacia/dark oak/mangrove/cherry planks；既有 oak planks 继续保持 ID 5。
- granite/diorite/andesite 使用 stone/pickaxe contract；新增木板使用 axe-effective plank contract；drop/item path 直接复用 live registry。
- oak planks 与 ID 44..53 接入 canonical Java 1.20.1 blockstate/model/texture source，普通 full cube 通过 declarative `MINECRAFT_SIMPLE_FULL_CUBE_MODELS` 注册，不为每个方块增加 renderer special-case。
- model runtime closure 扩为 **24 blockstates / 70 models / 39 textures / 0 metadata**；deterministic model atlas 保持 128×128。
- runtime/source manifests 与生成闭包同步，并在 Minecraft asset source audit 中逐字节 `cmp`，防止闭包改变后 tracked manifest 陈旧却继续绿灯。
- Creative catalog 继续从 live `ITEMS` registry 派生；历史 `CREATIVE_START` 不变；新 stone/wood blocks 直接进入实际 Creative 分类与 3D block preview path。

### Presentation 同步收口

- Creative inventory 改为更接近 Java 原版的 category/search/survival inventory tabs，并复用 canonical Java 1.20.1 GUI sprites。
- source-backed block items 统一按 block semantic 走 3D preview，不再因为纹理来源而错误退化为 flat sprite。
- 第一人称右手 idle anchor 下移/右移；pickaxe/sword/axe/shovel/hoe 使用区分后的 held transform。

### 本阶段明确不做

- 不在同一 PR 扩展 logs、slabs、stairs、fences、doors；下一阶段先建立 `axis` / `facing` / `half` / `shape` / `open` 等可复用 family-state rule，再扩具体种类。
- 不在本阶段把新增 registry blocks 塞入 terrain/worldgen distribution；worldgen 仍作为独立连续开发阶段推进。
- 不改变 save schema v10、terrain v4、multiplayer v5 / action frame v3。
- 不扩展或重排历史 `CREATIVE_START`。

## 下一阶段：Stateful registry families

PR #138 收口后，下一连续 Registry breadth 切片优先建立 family rule，而不是继续堆特殊-case：

1. 建立 wood/log `axis` 与 slab/stair/fence/door 等 state/property 的通用映射与碰撞/放置规则；
2. 在通用规则稳定后再批量增加对应 wood species/family entries；
3. 继续复用 Java 1.20.1 source-backed blockstate/model/texture pipeline；
4. Creative catalog 继续从 live `ITEMS` registry 派生，不扩展历史 `CREATIVE_START` starter contract；
5. 只有新增 family 真正要求 save/network contract 变化时才显式 bump，否则保持 save v10、terrain v4、multiplayer v5。

## 后续连续开发顺序

1. Registry breadth：stateful wood/log/slab/stair/fence/door common families；
2. Worldgen：biomes → caves/aquifers → ores/features → structures；
3. Server gameplay breadth：server-authoritative PvE/XP、durable world/block-entity persistence；
4. Farming 后续：farmland trampling、exact crop random tick/light/neighbor formula、Fortune/loot tables、其它 crops/breeding；
5. 更广 status effects / enchanting / brewing / redstone / dimensions 等系统继续按依赖关系展开。

## 工程规则

- 只认 exact-head CI；旧 head 的绿灯不授权新 head 合并；
- source asset availability ≠ runtime implementation；
- gameplay pure rules、browser presentation、server authority 分层；
- persistence / terrain version / starter slots / network state 是独立兼容性表面；
- 多人缺失 authority 必须保持禁用，不通过 client-side fake authority 伪造完成度；
- 不通过降低测试、静默升级旧存档或删除失败覆盖来换绿色门禁。
