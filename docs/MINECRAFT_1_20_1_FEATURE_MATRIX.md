# Minecraft Java 1.20.1 Parity Matrix

Status: `DONE` / `PARTIAL` / `FOUNDATION` / `TODO` / `BLOCKED`.

Percentages are planning estimates, not automated coverage. `PROJECT_BASELINE.md` records merged `main`; this matrix describes the **projected post-PR #129 state** where explicitly noted.

## Overall projected state after PR #129

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering | 85% | PARTIAL | lighting parity, broad collision/model/state/tint/animation |
| Desktop/mobile controls and core UI | 80% | PARTIAL | settings/accessibility/keybind UI, recipe book |
| Singleplayer survival core | 77% | PARTIAL | food-use duration/effects, enchanting/brewing, broad progression |
| Blocks/items/recipes breadth | 27% | PARTIAL | most 1.20.1 registry content absent |
| World generation / biomes / caves / structures | 21% | PARTIAL | biome pipeline, caves, vanilla ore/feature/structure placement, Nether/End |
| Entities / PvE | 40% | PARTIAL | species breadth, pathfinding/spawns, breeding/taming/riding, server authority |
| Multiplayer server foundation | 70% | PARTIAL | hunger/farming/PvE/XP authority, durable persistence, rooms/auth/operators |
| Full multiplayer Minecraft parity | 52% | PARTIAL | hunger/farming/PvE authority, prediction breadth, wider content and replicated SFX |
| Original resource integration | 53% | PARTIAL | broad registry use, biome tint/animation, generated sound registry |
| Audio / SFX / music | 12% | PARTIAL | current tool/block/mining/mob subset; broad events/spatial/music remain |
| Farming / food / processing | 62% | PARTIAL | vegetation seed bootstrap + bone meal foundation added; exact crop ticks/effects/broader crops absent |
| Redstone | 3% | FOUNDATION | neighbor updates, scheduled ticks, power graph/components |
| Villagers / trading | 0% | TODO | entire system |
| Enchanting / brewing / status effects | 0% | TODO | entire system |
| Nether / End / portals | 0% | TODO | dimensions/progression/bosses |
| Advancements / statistics | 0% | TODO | entire system |
| Engineering / CI | 90% | PARTIAL | performance/load/device/visual-diff breadth |

**Overall strict Java 1.20.1 parity remains conservatively about 35%.** PR #129 closes the first natural wheat-seed bootstrap and a first bone-meal path, but registry/worldgen/dimension/redstone/effect gaps still dominate total parity.

## Runtime / rendering / UI

| Feature | Status | Notes |
|---|---|---|
| Shared desktop/mobile runtime | DONE | Unified intent model. |
| First/third-person camera | DONE | F5 cycle. |
| First-person held viewmodel | PARTIAL | PR #130: smaller source-backed Steve arm, 70° viewmodel FOV, shoulder→wrist hierarchy and block/tool/food/flat presentation. Exact Java transforms/equip animation remain incomplete. |
| Third-person Steve model | PARTIAL | Source-backed articulated wide Steve. |
| Chunk streaming + Workers + batching | DONE | Bounded lifecycle and merged geometry. |
| Generic blockstate/model interpreter | PARTIAL | Selected roots live, including farmland/wheat and projected short grass; broad registry/state/collision breadth incomplete. |
| Water | PARTIAL | Static/simplified; no full levels/flow. |
| Vanilla lighting / biome tint / animated textures | TODO | Major rendering parity gaps; short grass currently uses explicit fallback tint. |
| Inventory / Workbench / Furnace UI | PARTIAL | Workbench canonical source-backed layout; PR #130 fixes container modal HUD/viewmodel behavior; recipe book/settings breadth missing. |
| Hunger HUD | PARTIAL | 10-shank HUD tracks food; exact vanilla effect animation breadth remains. |

## Blocks / items / crafting

Projected post-#129 registry is approximately **55 runtime item IDs / 20 crafting recipes** plus **5 Furnace recipes**. Historical `CREATIVE_START` order remains intentionally stable.

Current/projected gameplay families/states include:

`grass_block`, `short_grass`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `coal_ore`, `glass`, `furnace`, `farmland moisture 0..7`, `wheat age 0..7`, `dirt_path`, `stripped_oak_log`.

| Feature | Status | Notes |
|---|---|---|
| 36-slot Inventory + hotbar | DONE | Cursor/stack/Shift semantics. |
| 2×2 / 3×3 crafting | DONE | Current recipe set only. |
| Wooden/stone/iron pickaxes | DONE | Current harvest/durability path. |
| Wooden/stone/iron swords | PARTIAL | Full Java combat curve/critical/sweep/shield absent. |
| Iron axe/shovel/hoe | PARTIAL | Current secondary actions; breadth narrow. |
| Raw iron / iron ingot | PARTIAL | Stone→iron chain. |
| Coal / coal ore | PARTIAL | wooden+ harvest, canonical assets, 1600-tick Furnace fuel; charcoal/coal block/ore XP/enchantments absent. |
| Iron armor | PARTIAL | 4 pieces, recipes, 15 armor points, durability/wear, local + authoritative PvP state. |
| Leather armor durability | PARTIAL | Java durability metadata and generic wear. |
| Food registry slice | PARTIAL | raw meats, rotten flesh, apple, bread and four cooked meats; broad food registry absent. |
| Wheat seeds / wheat | PARTIAL | Canonical items, planting/growth/harvest loop. PR #129 adds natural short-grass seed acquisition. |
| Wheat → bread | PARTIAL | 3-wide Workbench recipe playable after harvest. |
| Bone meal | PARTIAL | PR #129 adds canonical item, bone→3 bone meal and singleplayer wheat/grass use path; broader bonemealable blocks absent. |
| Short grass | PARTIAL | PR #129 adds canonical model, terrain-v4 decoration and base seed drop path; biome tint/loot-table breadth incomplete. |
| Gold/diamond/netherite progression | TODO | Architecture exists but content absent. |
| Shields / player ranged weapons / buckets | TODO | Not implemented. |
| Slabs/stairs/fences/walls/doors | TODO | Broad shapes/state/collision missing. |
| Chests/barrels/hoppers | TODO | Durable block-entity foundation required. |

## Survival / combat

| Feature | Status | Notes |
|---|---|---|
| HP / hurt cooldown / death / respawn | DONE | Singleplayer + authoritative PvP slices. |
| Knockback | DONE | Shared foundations. |
| Java-style armor mitigation | PARTIAL | Damage-dependent formula; toughness-bearing tiers not present. |
| Armor durability / break | PARTIAL | Local + authoritative wear/break. |
| Tool/weapon durability | PARTIAL | Current implemented set. |
| Hunger / saturation / exhaustion | PARTIAL | #127 explicit FoodData-like state and >4 exhaustion drain ordering. |
| Hunger-driven sprint gate | PARTIAL | Survival food <=6 blocks sprint; broader effects/attributes absent. |
| Natural regeneration | PARTIAL | Saturated fast regen and food>=18 slow regen; gamerule toggle not exposed. |
| Starvation | PARTIAL | Fixed current Normal-style floor at 1 HP because difficulty system is absent. |
| Eating | PARTIAL | Singleplayer right-click consumption works; vanilla use duration/animation/cancel semantics absent. |
| Food status effects | TODO | Raw chicken / rotten flesh Hunger effects require status-effect system. |
| Oxygen / swimming | PARTIAL | Simplified. |
| XP / levels | PARTIAL | Singleplayer; multiplayer server-owned XP absent. |
| Bed sleep / respawn | PARTIAL | Core slice only. |
| Enchantments/effects/brewing | TODO | None. |

## Food values merged in #127

| Item | Nutrition | Saturation modifier | Runtime source |
|---|---:|---:|---|
| Apple | 4 | 0.3 | canonical Java 1.20.1 item PNG |
| Bread | 5 | 0.6 | canonical Java 1.20.1 item PNG |
| Raw beef | 3 | 0.3 | source-backed runtime item |
| Steak | 8 | 0.8 | canonical Java 1.20.1 item PNG |
| Raw mutton | 2 | 0.3 | source-backed runtime item |
| Cooked mutton | 6 | 0.8 | canonical Java 1.20.1 item PNG |
| Raw porkchop | 3 | 0.3 | source-backed runtime item |
| Cooked porkchop | 8 | 0.8 | canonical Java 1.20.1 item PNG |
| Raw chicken | 2 | 0.3 | source-backed runtime item; Hunger effect not yet implemented |
| Cooked chicken | 6 | 0.6 | canonical Java 1.20.1 item PNG |
| Rotten flesh | 4 | 0.1 | source-backed runtime item; Hunger effect not yet implemented |

## World generation

| Feature | Status | Notes |
|---|---|---|
| Deterministic shared terrain | DONE | Projected current generator v4; explicit singleplayer v2/v3 paths remain supported for saved worlds. |
| Singleplayer terrain-version persistence | PARTIAL | `terrainVersion` required since schema v8; current save schema v9 preserves the boundary. |
| Heightmap / surface / sea / oak trees | DONE | Simplified baseline. |
| Iron ore | PARTIAL | Simplified deterministic distribution. |
| Coal ore | PARTIAL | Deterministic v3+ injection; not vanilla Java placement. |
| Short-grass surface decoration | PARTIAL | PR #129 v4 deterministic 18% candidate decoration on eligible grass surfaces; not biome feature-placement parity. |
| Player-created farming states | PARTIAL | Sparse edits persist farmland moisture and wheat age IDs. |
| Biomes/climate | TODO | No Java biome pipeline. |
| Caves/aquifers | TODO | None. |
| Broad ores/features/structures | TODO | None. |
| Java vertical range | TODO | Current height 64. |
| Nether/End | TODO | None. |

### Terrain compatibility boundary

- v2 remains the legacy pre-coal singleplayer path.
- v3 keeps coal and all existing terrain semantics.
- v4 adds deterministic short-grass surface decoration for **new/current-v4 worlds only**.
- v2/v3 generation remains explicit and is regression-checked rather than silently upgraded.
- multiplayer continues to require the exact current terrain generator version; mixed v3/v4 sessions are rejected.

## Entities / PvE

Current mobs: cow, sheep, pig, chicken, zombie, skeleton, creeper, spider.

| Feature | Status | Notes |
|---|---|---|
| Current 8 mob models/AI/combat | PARTIAL | Source textures + compatible geometry, simplified behavior. |
| Current mob ambient/hurt/death audio | PARTIAL | Source-backed baseline. |
| Mob raw-food drops | PARTIAL | Existing meat drops enter hunger loop; loot breadth remains simplified. |
| Vanilla spawn/pathfinding/breeding/taming/riding | TODO | Major breadth gap. |
| Server-authoritative PvE/projectiles/explosions | TODO | Major multiplayer gap. |
| Most species | TODO | Absent. |

## Multiplayer authority

| Feature | Status | Notes |
|---|---|---|
| Handshake/session/input/movement | DONE | Real authoritative runtime. |
| World edits/mining/placement | DONE | Revisioned server truth. |
| Terrain generator compatibility | DONE | Multiplayer requires exact current terrain version; projected #129 version is v4. |
| Ground items / Inventory / item durability | DONE | Server-owned. |
| Equipment transactions | DONE | Server-owned. |
| Crafting / Workbench | DONE | Current scope. |
| Furnace | PARTIAL | Authoritative process-memory state; recipes shared pure rules; durable storage absent. |
| PvP | PARTIAL | HP/melee/armor/wear/knockback/death/respawn current slice. |
| Hunger / food | TODO | No authoritative multiplayer hunger/eat transaction; client rejects local multiplayer food use. |
| Farming / bone meal | TODO | No server-owned planting/random tick/crop-drop/bone-meal transaction; client does not simulate competing multiplayer farming truth. |
| PvE / XP / durable persistence | TODO | Not server-owned / not durable. |
| Replicated gameplay SFX | TODO | Local audio only. |

## Farming / food / processing

| Feature | Status | Notes |
|---|---|---|
| Furnace | PARTIAL | raw iron + four raw meats; coal at 1600 ticks. |
| Farmland creation | PARTIAL | Hoe tilling exists. |
| Farmland moisture / irrigation | PARTIAL | moisture 0..7, nearby water/rain hydration and drying with simplified 10-second tick semantics. |
| Hunger/saturation/exhaustion | PARTIAL | #127 FoodData-like core. |
| First edible set | PARTIAL | raw/cooked meats, apple, bread, rotten flesh. |
| Wheat planting | PARTIAL | Seeds plant on empty-topped farmland; survival consumes after successful mutation. |
| Wheat growth | PARTIAL | age 0..7 and canonical models; simplified wet/dry growth chance rather than exact Java light/neighbor/random-tick formula. |
| Wheat harvest / seed recycling | PARTIAL | immature seed return and mature wheat + 0..3 seed loop; exact Fortune/RNG absent. |
| Bread acquisition | PARTIAL | harvested wheat can craft bread through Workbench recipe. |
| Natural seed acquisition | PARTIAL | PR #129: short grass has base 1/8 wheat-seed drop in survival. Fortune/exact loot-table machinery absent. |
| Bone meal on wheat | PARTIAL | PR #129: advances 2..5 age steps and caps at mature age 7. |
| Bone meal on grass | PARTIAL | PR #129: bounded nearby short-grass spread; simplified vs Java biome/random-walk/flower behavior. |
| Farmland trampling | TODO | Not implemented. |
| Food use duration/eating animation | TODO | Current use is instantaneous. |
| Food status effects | TODO | Hunger effect and general MobEffect system absent. |
| Other crops | TODO | Carrot/potato/beetroot/melon/pumpkin/etc. absent. |
| Breeding | TODO | None. |

## Major untouched systems

- Redstone: ~3% foundation only.
- Villagers/trading: 0%.
- Enchanting/brewing/status effects: 0%.
- Nether/End/portals/bosses: 0%.
- Advancements/statistics: 0%.

## Immediate roadmap after #129

1. Hunger phase 2: use duration/eating animation, status-effect foundation, difficulty/gamerule boundaries, then multiplayer hunger authority;
2. broad block/item/recipe registry families;
3. biome/cave/ore/feature/structure worldgen;
4. server-owned PvE/XP and durable block-entity/world persistence;
5. farming follow-ups: trampling, exact crop tick/light/neighbor rules, Fortune/loot tables and additional crops/breeding.
