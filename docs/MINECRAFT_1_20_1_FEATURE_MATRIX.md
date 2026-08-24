# Minecraft Java 1.20.1 Parity Matrix

Status: `DONE` / `PARTIAL` / `FOUNDATION` / `TODO` / `BLOCKED`.

更新时间：2026-08-24。

Percentages are planning estimates, not automated coverage. `PROJECT_BASELINE.md` records merged `main` through PR #131. Where this matrix mentions PR #133, it describes the **projected post-#133 state** and must not be read as merged fact until that PR is merged.

## Overall projected state after PR #133

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering | 85% | PARTIAL | lighting parity, broad collision/model/state/tint/animation |
| Desktop/mobile controls and core UI | 82% | PARTIAL | settings/accessibility/keybind UI, recipe book, broad Creative UI |
| Singleplayer survival core | 79% | PARTIAL | food effects, enchanting/brewing, broad progression/loot tables |
| Blocks/items/recipes breadth | 27% | PARTIAL | most 1.20.1 registry content absent |
| World generation / biomes / caves / structures | 22% | PARTIAL | biome pipeline, caves, vanilla feature/structure placement, Nether/End |
| Entities / PvE | 40% | PARTIAL | species breadth, pathfinding/spawns, breeding/taming/riding, server authority |
| Multiplayer server foundation | 70% | PARTIAL | hunger/farming/PvE/XP authority, durable persistence, rooms/auth/operators |
| Full multiplayer Minecraft parity | 52% | PARTIAL | hunger/farming/PvE authority, prediction breadth, wider content and replicated SFX |
| Original resource integration | 55% | PARTIAL | broad registry use, biome tint/animation, generated sound registry |
| Audio / SFX / music | 12% | PARTIAL | current tool/block/mining/mob subset; broad events/spatial/music remain |
| Farming / food / processing | 68% | PARTIAL | timed eating + seed/bone-meal loop present; exact ticks/effects/broader crops absent |
| Creative mode | 28% | PARTIAL | starter inventory exists, but catalog UI, flight toggle and hostile exclusion are next PR |
| Redstone | 3% | FOUNDATION | neighbor updates, scheduled ticks, power graph/components |
| Villagers / trading | 0% | TODO | entire system |
| Enchanting / brewing / status effects | 0% | TODO | entire system |
| Nether / End / portals | 0% | TODO | dimensions/progression/bosses |
| Advancements / statistics | 0% | TODO | entire system |
| Engineering / CI | 90% | PARTIAL | performance/load/device/visual-diff breadth |

**Overall strict Java 1.20.1 parity remains conservatively about 35%.** PR #133 improves presentation fidelity and closes input/mining/drop inconsistencies but does not materially reduce the dominant registry/worldgen/redstone/dimension/status-effect gaps.

## Runtime / rendering / UI

| Feature | Status | Notes |
|---|---|---|
| Shared desktop/mobile runtime | DONE | Unified control-intent model. |
| First/third-person camera | DONE | F5 cycle. |
| First-person held viewmodel | PARTIAL | Source-backed Steve arm, 70° FOV, shoulder→wrist hierarchy. PR #133 slightly adjusts neutral hand anchor; exact Java transforms/equip animation remain incomplete. |
| Third-person Steve model | PARTIAL | Source-backed articulated wide Steve. PR #133 projects distinct walk/sprint gait with body lean/bob/sway. |
| Desktop sprint input | PARTIAL | Projected #133: Ctrl+W or double-W; browser-level Ctrl+W uses immersive capture + Keyboard Lock where supported. Configurable keybind UI absent. |
| Chunk streaming + Workers + batching | DONE | Bounded lifecycle and merged geometry. |
| Generic blockstate/model interpreter | PARTIAL | Selected roots live, including farmland/wheat/short grass; broad registry/state/collision breadth incomplete. |
| Water | PARTIAL | Static/simplified; no full levels/flow. |
| Vanilla lighting / biome tint / animated textures | TODO | Major rendering parity gaps; short grass uses explicit fallback tint. |
| Inventory / Workbench / Furnace UI | PARTIAL | Workbench canonical source-backed layout; modal HUD/viewmodel handling exists; recipe book/settings breadth missing. |
| Hunger HUD | PARTIAL | 10-shank HUD tracks food; exact effect animation breadth remains. |
| Creative inventory UI | TODO | Historical `CREATIVE_START` bootstrap is not a full categorized/searchable Creative catalog. |

## Blocks / items / crafting

Current gameplay families/states include:

`grass_block`, `short_grass`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `coal_ore`, `glass`, `furnace`, `farmland moisture 0..7`, `wheat age 0..7`, `dirt_path`, `stripped_oak_log`.

| Feature | Status | Notes |
|---|---|---|
| 36-slot Inventory + hotbar | DONE | Cursor/stack/Shift semantics. |
| 2×2 / 3×3 crafting | DONE | Current recipe set only. |
| Wooden/stone/iron pickaxes | DONE | Current harvest/durability path. |
| Wooden/stone/iron swords | PARTIAL | Full Java combat curve/critical/sweep/shield absent. |
| Iron axe/shovel/hoe | PARTIAL | Current secondary actions; breadth narrow. |
| Raw iron / iron ingot | PARTIAL | Stone→iron chain. |
| Coal / coal ore | PARTIAL | Wooden+ harvest, canonical assets, 1600-tick Furnace fuel; charcoal/coal block/ore XP/enchantments absent. |
| Iron armor | PARTIAL | 4 pieces, recipes, 15 armor points, durability/wear, local + authoritative PvP state. |
| Leather armor durability | PARTIAL | Java durability metadata and generic wear. |
| Food registry slice | PARTIAL | Raw meats, rotten flesh, apple, bread and four cooked meats; broad registry absent. |
| Wheat seeds / wheat | PARTIAL | Canonical items, natural short-grass seed bootstrap, planting/growth/harvest loop. |
| Wheat → bread | PARTIAL | 3-wide Workbench recipe playable after harvest. |
| Bone meal | PARTIAL | Canonical item, bone→3 bone meal and singleplayer wheat/grass use path; broader bonemealable blocks absent. |
| Short grass | PARTIAL | Canonical model, terrain-v4 decoration and base seed-drop path; biome tint/loot-table breadth incomplete. |
| Explosion block drops | PARTIAL | Projected #133 routes local simplified explosion drops through block drop metadata; generic Java loot tables/explosion decay/Silk Touch/Fortune absent. |
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
| Hunger / saturation / exhaustion | PARTIAL | FoodData-like state and >4 exhaustion drain ordering. |
| Hunger-driven sprint gate | PARTIAL | Survival food <=6 blocks sprint. Projected #133 unifies physical speed, gait and exhaustion under the same active-sprint condition. |
| Natural regeneration | PARTIAL | Saturated fast regen and food>=18 slow regen; gamerule toggle not exposed. |
| Starvation | PARTIAL | Fixed current Normal-style floor at 1 HP because difficulty system is absent. |
| Eating | PARTIAL | PR #131: 1.6 s held, interruptible singleplayer food use with continuous first-person pose. Multiplayer hunger transaction absent. |
| Food status effects | TODO | Raw chicken / rotten flesh Hunger effects require status-effect system. |
| Mining crack feedback | PARTIAL | Projected #133: singleplayer + multiplayer share Java 1.20.1 `destroy_stage_0..9`; full Java mining particles/hand cadence breadth incomplete. |
| Oxygen / swimming | PARTIAL | Simplified. |
| XP / levels | PARTIAL | Singleplayer; multiplayer server-owned XP absent. |
| Bed sleep / respawn | PARTIAL | Core slice only. |
| Enchantments/effects/brewing | TODO | None. |

## Food-use contract merged in #131

| Behavior | State |
|---|---|
| Use duration | 1.6 s |
| Desktop input | right-mouse held press/release |
| Mobile input | Use held press/release |
| Early release | cancels, no consumption |
| Control/panel/pause loss | cancels |
| Hotbar/item/mode change | cancels |
| Primary attack during use | cancels |
| Completion | exactly-once hunger + inventory commit |
| Low-FPS duration | monotonic wall-clock compensated |
| First-person pose | continuous progress |
| Multiplayer hunger authority | not implemented; held press only routes existing authoritative use action |

## World generation

| Feature | Status | Notes |
|---|---|---|
| Deterministic shared terrain | DONE | Current generator v4; explicit singleplayer v2/v3 paths retained. |
| Singleplayer terrain-version persistence | PARTIAL | `terrainVersion` required since schema v8; save schema v9 preserves boundary. |
| Heightmap / surface / sea / oak trees | DONE | Simplified baseline. |
| Iron ore | PARTIAL | Simplified deterministic distribution. |
| Coal ore | PARTIAL | Deterministic v3+ injection; not vanilla Java placement. |
| Short-grass surface decoration | PARTIAL | v4 deterministic decoration on eligible surfaces; not biome feature-placement parity. |
| Player-created farming states | PARTIAL | Sparse edits persist farmland moisture and wheat age IDs. |
| Biomes/climate | TODO | No Java biome pipeline. |
| Caves/aquifers | TODO | None. |
| Broad ores/features/structures | TODO | None. |
| Java vertical range | TODO | Current height 64. |
| Nether/End | TODO | None. |

### Terrain compatibility boundary

- v2 remains the legacy pre-coal singleplayer path.
- v3 adds deterministic coal while keeping explicit compatibility.
- v4 adds deterministic short-grass decoration for new/current-v4 worlds.
- v2/v3 remain regression-checked and are not silently upgraded.
- multiplayer requires the exact current terrain generator version; mixed versions are rejected.

## Entities / PvE

Current mobs: cow, sheep, pig, chicken, zombie, skeleton, creeper, spider.

| Feature | Status | Notes |
|---|---|---|
| Current 8 mob models/AI/combat | PARTIAL | Source textures + compatible geometry, simplified behavior. |
| Current mob ambient/hurt/death audio | PARTIAL | Source-backed baseline. |
| Mob raw-food drops | PARTIAL | Existing meat drops enter hunger loop; loot breadth simplified. |
| Vanilla spawn/pathfinding/breeding/taming/riding | TODO | Major breadth gap. |
| Creative hostile-target exclusion | TODO | Planned next PR after #133. |
| Server-authoritative PvE/projectiles/explosions | TODO | Major multiplayer gap. |
| Most species | TODO | Absent. |

## Multiplayer authority

| Feature | Status | Notes |
|---|---|---|
| Handshake/session/input/movement | DONE | Real authoritative runtime. |
| World edits/mining/placement | DONE | Revisioned server truth. |
| Terrain generator compatibility | DONE | Requires exact current terrain version v4. |
| Ground items / Inventory / item durability | DONE | Server-owned. |
| Equipment transactions | DONE | Server-owned. |
| Crafting / Workbench | DONE | Current scope. |
| Furnace | PARTIAL | Authoritative process-memory state; durable storage absent. |
| PvP | PARTIAL | HP/melee/armor/wear/knockback/death/respawn current slice. |
| Mining crack presentation | PARTIAL | Server mining progress already authoritative; projected #133 shares one canonical client overlay with singleplayer. |
| Hunger / food | TODO | No server-owned hunger/eat-duration/inventory transaction. |
| Farming / bone meal | TODO | No server-owned planting/random-tick/crop-drop/bone-meal transaction. |
| PvE / XP / durable persistence | TODO | Not server-owned / not durable. |
| Replicated gameplay SFX | TODO | Local audio only. |

## Farming / food / processing

| Feature | Status | Notes |
|---|---|---|
| Furnace | PARTIAL | raw iron + four raw meats; coal at 1600 ticks. |
| Farmland creation | PARTIAL | Hoe tilling exists. |
| Farmland moisture / irrigation | PARTIAL | moisture 0..7, water/rain hydration and simplified drying. |
| Hunger/saturation/exhaustion | PARTIAL | FoodData-like core. |
| Timed food use | PARTIAL | #131 complete local held/cancel/commit foundation; effects and server authority absent. |
| Wheat planting | PARTIAL | Seeds plant on empty-topped farmland; survival consumes after successful mutation. |
| Wheat growth | PARTIAL | age 0..7; simplified growth chance rather than exact Java formula. |
| Wheat harvest / seed recycling | PARTIAL | mature wheat + seed loop; exact Fortune/RNG absent. |
| Bread acquisition | PARTIAL | harvested wheat can craft bread. |
| Natural seed acquisition | PARTIAL | short grass base seed drop; generic loot tables absent. |
| Bone meal on wheat / grass | PARTIAL | advances wheat and spreads short grass under current simplified singleplayer rules. |
| Other crops / breeding | TODO | Not implemented. |

## Creative mode

| Feature | Status | Notes |
|---|---|---|
| Creative mode identity | PARTIAL | Mode exists locally/authoritatively. |
| Instant block breaking | PARTIAL | Existing local/authoritative slice. |
| No survival item consumption for implemented actions | PARTIAL | Existing action-specific rules. |
| Historical starter bootstrap | FOUNDATION | `CREATIVE_START` remains compatibility surface, not full catalog. |
| Categorized/searchable item catalog | TODO | Next PR. |
| Double-Space flight toggle | TODO | Current implementation does not yet match desired grounded/flying toggle behavior. |
| Creative-specific HUD | TODO | Next PR. |
| Hostile mobs ignore Creative player | TODO | Next PR. |

## Original resources / audio

| Feature | Status | Notes |
|---|---|---|
| Extracted Java 1.20.1 texture/model tree | DONE | `MC原版素材assets/` is tracked canonical source. |
| Sound-object corpus | DONE | `原版Minecraft音频文件/` tracked with mapping/index. |
| Runtime item/block/model use | PARTIAL | Explicit opt-in only; availability != implementation. |
| Mining destroy-stage textures | PARTIAL | Projected #133 directly uses canonical `destroy_stage_0..9` in shared overlay. |
| Block/tool/mob sound subset | PARTIAL | Current mapped source-backed events. |
| Full sounds.json/spatial/music | TODO | Broad gap. |

## Engineering / CI

| Feature | Status | Notes |
|---|---|---|
| Node syntax + auto-discovered logic tests | DONE | Mandatory exact-head gate. |
| Chromium E2E sharding | DONE | Two mandatory shards. |
| Resource provenance checks | PARTIAL | Strong for implemented source-backed paths; breadth still grows with registry. |
| Save/terrain compatibility regressions | DONE | Version surfaces explicitly tested. |
| Multiplayer real-WebSocket regressions | PARTIAL | Strong current-domain coverage; absent domains remain absent. |
| Visual-diff/performance/load/device matrix | TODO | Current CI is not exhaustive. |

## Current roadmap after #133

1. Creative overhaul: grounded/flying toggle, HUD, hostile-target exclusion, categorized/searchable registry-backed inventory.
2. Hunger/status effects/difficulty/gamerules and server-owned eating transaction.
3. Broad block/item/recipe families.
4. Biomes → caves/aquifers → features/structures.
5. Server-owned PvE/XP and durable world/block-entity persistence.
6. Farming parity breadth and exact loot/random-tick semantics.

The matrix must stay conservative: a source file existing in the repository, a client-only approximation, or a presentation improvement is not enough to mark a gameplay domain DONE.
