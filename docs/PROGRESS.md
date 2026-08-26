# Minecraft Web - 当前开发进度

更新时间：2026-08-26

## 当前主线

项目处于 `v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整玩法/内容口径，整体完成度仍保守维持约 **35%**。浏览器渲染/资源管线、单机生存基础和 authoritative multiplayer 骨架已形成，当前主要缺口集中在 registry breadth、原版 worldgen、redstone、dimensions、enchanting/brewing、广泛 status effects、server-authoritative PvE/XP/persistence 与更深 farming parity。

当前 merged `main`：`9edb249f1f5c44dc9f4f0098fc4d7395b41974e7`，为 PR #138 `feat: expand registry breadth and align vanilla inventory presentation` 的 squash merge 结果。

`docs/PROJECT_BASELINE.md` 只描述 merged main；未合并功能必须放在 active delivery 中。

## 最近完成：PR #138 Registry breadth phase 1

PR #138 已于 2026-08-26 squash merge。

### Registry breadth

- append-only 新增 block ID 44..53：granite、diorite、andesite、spruce/birch/jungle/acacia/dark oak/mangrove/cherry planks；既有 oak planks 继续保持 ID 5。
- granite/diorite/andesite 使用 stone/pickaxe contract；新增木板使用 axe-effective plank contract；drop/item path 直接复用 live registry。
- oak planks 与 ID 44..53 接入 canonical Java 1.20.1 blockstate/model/texture source。
- 普通 full cube 通过 declarative `MINECRAFT_SIMPLE_FULL_CUBE_MODELS` 注册，不为每个方块增加 renderer special-case。
- model runtime closure 扩为 **24 blockstates / 70 models / 39 textures / 0 metadata**。
- deterministic model atlas 保持 **128×128**，SHA-256 `28dea729513157f790032964dc4607a88ba6657e72d3e9eca5a9cc85fa5ce1b5`。
- runtime/source manifests 与生成闭包同步，并在 Minecraft asset source audit 中逐字节 `cmp`，防止 tracked manifest 陈旧却继续绿灯。

### Creative / first-person presentation

- Creative inventory 使用更接近 Java 原版的 category/search/survival inventory tabs，并复用 canonical Java 1.20.1 GUI sprites。
- Creative catalog 继续从 live `ITEMS` registry 派生；历史 `CREATIVE_START` 不变。
- 新 stone/wood blocks 直接进入实际 Creative 分类和 3D block-preview path。
- source-backed block items 按 block semantic 走 3D preview，不因纹理来源错误退化为 flat sprite。
- 第一人称右手 idle anchor 下移/右移；pickaxe/sword/axe/shovel/hoe 使用区分后的 held transform。

### Exact-head validation

最终 exact head：`a40ac69137a0636f6831ba3e91d1590e676ad730`

- Minecraft asset source audit #317 (`32971126562`)：PASS；
- Repository quality #1296 (`32971126568`)：PASS；
- JavaScript syntax：PASS；
- full logic/worker regression：PASS；
- Chromium shard 1/2：PASS；
- Chromium shard 2/2：PASS；
- final base drift：0；
- reviews / review threads / PR comments：0。

Squash merge commit：`9edb249f1f5c44dc9f4f0098fc4d7395b41974e7`。

## 当前兼容性边界

- block/item IDs 保持 append-only，不重排现有 ID；
- singleplayer save schema：**v10**；
- terrain generator：**v4**，local v2/v3 compatibility path 保持不变；
- historical `CREATIVE_START` 顺序/slot mapping 不变；
- multiplayer handshake/subprotocol：**v5 / `minecraft-web-v5`**；
- player action frame：**v3**；
- browser presentation 不成为 gameplay authority；
- multiplayer 缺失 authority 不允许 client-side competing truth。

## 关键架构发现：stateful block 不能继续用 ID 爆炸替代 property

当前 `VoxelWorld` 的每个 cell 仍只存一个 block ID。

现有 stateful 内容采取了两种临时/局部策略：

- bed direction、farmland moisture、wheat age：不同状态分别占用 append-only block ID；
- furnace：interpreter 固定使用 `facing=north,lit=false` 的 canonical state。

这种策略不适合继续扩展 Java 原版的 stateful families。若对 stairs/doors/fences/logs 继续“每状态一个 ID”，会快速造成 registry、存档、多人同步和 collision/placement 逻辑失控。因此下一阶段必须先建立通用 block-property/state 表达层。

## Active delivery：Stateful registry families foundation

下一连续切片先做基础设施，不直接把所有木制家族一次性塞入 registry。

### Phase A：pure state schema / deterministic key

1. 定义可复用 property schema：
   - `axis`: x/y/z；
   - horizontal `facing`: north/east/south/west；
   - slab `type`: bottom/top/double；
   - stair `half` + `shape` + facing；
   - door `half` + `hinge` + `open` + `powered` + facing；
   - fence north/east/south/west connectivity；
   - `waterlogged` boolean。
2. 所有 state 都必须 normalize、validate、canonical serialize，属性顺序不能影响 state key。
3. pure rules 不依赖 DOM、Three.js、World 或 WebSocket，先形成可单测的共享事实层。

### Phase B：world/save/network state storage

1. 为 block ID 之外的 properties 建立 sparse sidecar，而不是重写现有 dense voxel ID buffer；
2. 明确 edit/export/import 格式与旧存档迁移边界；
3. multiplayer sparse world edits 同步同一 normalized state；
4. 如果 wire/save contract 真正变化，显式 bump 对应版本，禁止静默 reinterpret。

### Phase C：runtime model / gameplay integration

1. normalized properties 输入现有 Java 1.20.1 blockstate/model interpreter；
2. placement 根据点击面、玩家朝向等生成 canonical state；
3. collision/selection/interaction 使用 family rule，不在 renderer 中硬编码；
4. 先完成 oak representative family，再数据驱动扩其它 wood species。

## 下一批具体内容顺序

1. logs / stripped logs：先验证 `axis`；
2. slabs：验证 top/bottom/double 与非 full-cube collision；
3. stairs：验证 facing/half/shape 与复杂 collision；
4. fences：验证邻接 connectivity；
5. doors：验证双 block、facing/hinge/open/powered 与 interaction；
6. family infrastructure 稳定后，再批量扩 spruce/birch/jungle/acacia/dark oak/mangrove/cherry 对应 entries。

## 暂不在本切片扩大

- 不把 PR #138 新增 stone/wood registry blocks 强行加入 worldgen distribution；
- 不在 state representation 未稳定前大量追加 stairs/door block IDs；
- 不通过 per-block renderer special-case 绕过 blockstate interpreter；
- 不为了避免 save/network bump 而偷偷丢弃 state properties；
- 不改变历史 `CREATIVE_START` starter contract。

## 后续连续开发顺序

1. Registry breadth：stateful family foundation → wood/log/slab/stair/fence/door breadth；
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
