# Minecraft Java 1.20.1 Parity Matrix

Status: `DONE` / `PARTIAL` / `FOUNDATION` / `TODO` / `BLOCKED`.

更新时间：2026-08-25。

Percentages are planning estimates, not automated coverage. `PROJECT_BASELINE.md` records merged `main` through PR #133. PR #134 entries below describe the active projected post-merge state and are not merged facts until that PR lands.

## Overall projected state after PR #134

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering | 85% | PARTIAL | lighting parity, broad collision/model/state/tint/animation |
| Desktop/mobile controls and core UI | 84% | PARTIAL | settings/accessibility/keybind UI, recipe book, full vanilla Creative tabs |
| Singleplayer survival core | 79% | PARTIAL | food effects, enchanting/brewing, broad progression/loot tables |
| Blocks/items/recipes breadth | 27% | PARTIAL | most 1.20.1 registry content absent |
| World generation / biomes / caves / structures | 22% | PARTIAL | biome pipeline, caves, vanilla feature/structure placement, Nether/End |
| Entities / PvE | 42% | PARTIAL | species breadth, pathfinding/spawns, breeding/taming/riding, server authority |
| Multiplayer server foundation | 72% | PARTIAL | hunger/farming/PvE/XP authority, durable persistence, rooms/auth/operators |
| Full multiplayer Minecraft parity | 53% | PARTIAL | hunger/farming/PvE authority, prediction breadth, wider content and replicated SFX |
| Original resource integration | 55% | PARTIAL | broad registry use, biome tint/animation, generated sound registry |
| Audio / SFX / music | 12% | PARTIAL | current tool/block/mining/mob subset; broad events/spatial/music remain |
| Farming / food / processing | 68% | PARTIAL | timed eating + seed/bone-meal loop present; exact ticks/effects/broader crops absent |
| Creative mode | 58% | PARTIAL | active #134 adds flight/HUD/target/catalog/authority; full vanilla tabs/saved hotbars/content breadth absent |
| Redstone | 3% | FOUNDATION | neighbor updates, scheduled ticks, power graph/components |
| Villagers / trading | 0% | TODO | entire system |
| Enchanting / brewing / status effects | 0% | TODO | entire system |
| Nether / End / portals | 0% | TODO | dimensions/progression/bosses |
| Advancements / statistics | 0% | TODO | entire system |
| Engineering / CI | 90% | PARTIAL | performance/load/device/visual-diff breadth |

**Overall strict Java 1.20.1 parity remains conservatively about 35%.** PR #134 materially improves Creative-mode coherence but does not reduce the dominant registry/worldgen/redstone/dimension/status-effect gaps.

## Runtime / rendering / UI

| Feature | Status | Notes |
|---|---|---|
| Shared desktop/mobile runtime | DONE | Unified control-intent model. |
| First/third-person camera | DONE | F5 cycle. |
| First-person held viewmodel | PARTIAL | Source-backed Steve arm, 70° FOV, shoulder→wrist hierarchy; exact Java transforms/equip animation incomplete. |
| Third-person Steve model | PARTIAL | Source-backed articulated wide Steve with distinct walk/sprint locomotion. |
| Desktop sprint input | PARTIAL | Ctrl+W or double-W; browser-level Ctrl+W uses immersive capture + Keyboard Lock where supported. Configurable keybind UI absent. |
| Chunk streaming + Workers + batching | DONE | Bounded lifecycle and merged geometry. |
| Generic blockstate/model interpreter | PARTIAL | Selected roots live; broad registry/state/collision breadth incomplete. |
| Water | PARTIAL | Static/simplified; no full levels/flow. |
| Vanilla lighting / biome tint / animated textures | TODO | Major rendering parity gaps. |
| Inventory / Workbench / Furnace UI | PARTIAL | Current container views exist; recipe book/settings breadth missing. |
| Hunger HUD | PARTIAL | 10-shank HUD tracks food; exact effect animation breadth remains. |
| Creative-specific HUD | PARTIAL | Active #134 hides survival-only groups without falsifying underlying values. |
| Creative inventory UI | PARTIAL | Active #134 registry-backed category/search view with real hotbar/cursor; not full Java tab/tag/saved-hotbar parity. |

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
| Coal / coal ore | PARTIAL | Wooden+ harvest, canonical assets, 1600-tick Furnace fuel. |
| Iron armor | PARTIAL | 4 pieces, recipes, 15 armor points, durability/wear, local + authoritative PvP state. |
| Food registry slice | PARTIAL | Raw meats, rotten flesh, apple, bread and four cooked meats; broad registry absent. |
| Wheat seeds / wheat / bread | PARTIAL | Natural short-grass seed bootstrap, planting/growth/harvest and bread recipe. |
| Bone meal | PARTIAL | Bone→3; singleplayer wheat/grass use path. |
| Explosion block drops | PARTIAL | Merged #133 routes simplified local explosion drops through block metadata; Java loot tables/explosion decay/Silk Touch/Fortune absent. |
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
| Armor/tool/weapon durability | PARTIAL | Current implemented set. |
| Hunger / saturation / exhaustion | PARTIAL | FoodData-like state and >4 exhaustion drain ordering. |
| Hunger-driven sprint gate | PARTIAL | Survival food <=6 blocks sprint; merged #133 unifies movement/gait/exhaustion condition. |
| Natural regeneration / starvation | PARTIAL | Current simplified Normal-style behavior. |
| Eating | PARTIAL | 1.6 s held/interruptible singleplayer use; multiplayer hunger transaction absent. |
| Food status effects | TODO | Requires generic status-effect system. |
| Mining crack feedback | PARTIAL | Merged #133 shares canonical Java 1.20.1 destroy-stage 0..9 across single/multiplayer presentation. |
| Oxygen / swimming | PARTIAL | Simplified. |
| XP / levels | PARTIAL | Singleplayer; multiplayer server-owned XP absent. |
| Bed sleep / respawn | PARTIAL | Core slice only. |
| Enchantments/effects/brewing | TODO | None. |

## World generation

| Feature | Status | Notes |
|---|---|---|
| Deterministic shared terrain | DONE | Current generator v4; explicit singleplayer v2/v3 paths retained. |
| Singleplayer terrain-version persistence | PARTIAL | `terrainVersion` required since schema v8; save schema v9. |
| Heightmap / surface / sea / oak trees | DONE | Simplified baseline. |
| Iron ore / coal ore | PARTIAL | Simplified deterministic distributions. |
| Short-grass surface decoration | PARTIAL | v4 deterministic decoration; not biome feature-placement parity. |
| Player-created farming states | PARTIAL | Sparse edits persist farmland moisture/wheat age IDs. |
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
- multiplayer requires exact current terrain generator version.

## Entities / PvE

Current mobs: cow, sheep, pig, chicken, zombie, skeleton, creeper, spider.

| Feature | Status | Notes |
|---|---|---|
| Current 8 mob models/AI/combat | PARTIAL | Source textures + compatible geometry, simplified behavior. |
| Current mob ambient/hurt/death audio | PARTIAL | Source-backed baseline. |
| Mob raw-food drops | PARTIAL | Existing meat drops enter hunger loop; loot breadth simplified. |
| Creative hostile-target exclusion | PARTIAL | Active #134: Creative/Spectator ineligible; chase/attack/fuse target state cleared. |
| Vanilla spawn/pathfinding/breeding/taming/riding | TODO | Major breadth gap. |
| Server-authoritative PvE/projectiles/explosions | TODO | Major multiplayer gap. |
| Most species | TODO | Absent. |

## Multiplayer authority

| Feature | Status | Notes |
|---|---|---|
| Handshake/session/input/movement | DONE | Active #134 wire boundary becomes v4 because Creative inventory action semantics expand. |
| World edits/mining/placement | DONE | Revisioned server truth. |
| Terrain generator compatibility | DONE | Requires exact current terrain v4. |
| Ground items / Inventory / item durability | DONE | Server-owned. |
| Creative item creation | PARTIAL | Active #134 inventory transaction v2 `creative-pick`; server validates mode/item/revision and derives count. |
| Creative flight | PARTIAL | Active #134 server-owned flight-toggle state; client cannot declare flying truth. |
| Equipment transactions | DONE | Server-owned. |
| Crafting / Workbench | DONE | Current scope. |
| Furnace | PARTIAL | Authoritative process-memory state; durable storage absent. |
| PvP | PARTIAL | HP/melee/armor/wear/knockback/death/respawn current slice. |
| Hunger / food | TODO | No server-owned hunger/eat-duration transaction. |
| Farming / bone meal | TODO | No server-owned crop/random-tick transaction. |
| PvE / XP / durable persistence | TODO | Not server-owned / not durable. |
| Replicated gameplay SFX | TODO | Local audio only. |

## Creative mode

| Feature | Status | Notes |
|---|---|---|
| Creative mode identity | PARTIAL | Mode exists locally/authoritatively. |
| Instant block breaking | PARTIAL | Existing local/authoritative slice. |
| No survival item consumption for implemented actions | PARTIAL | Existing action-specific rules. |
| Historical starter bootstrap | FOUNDATION | `CREATIVE_START` remains stable compatibility surface, not the catalog source. |
| Categorized/searchable item catalog | PARTIAL | Active #134 derives all current entries from `ITEMS`; 7 categories + All + search. |
| Catalog → real cursor/hotbar | PARTIAL | Active #134 uses physical cursor/hotbar, preserving inventory continuity across mode changes. |
| Double-Jump flight toggle | PARTIAL | Active #134; Creative toggles, Spectator forced, Survival/Adventure denied. |
| Creative-specific HUD | PARTIAL | Active #134 hides survival-only presentation, hotbar retained. |
| Hostile mobs ignore Creative player | PARTIAL | Active #134 target-eligibility gate. |
| Full Java Creative tab/tag ordering and saved hotbars | TODO | Not implemented. |

## Original resources / audio

| Feature | Status | Notes |
|---|---|---|
| Extracted Java 1.20.1 texture/model tree | DONE | `MC原版素材assets/` tracked canonical source. |
| Sound-object corpus | DONE | `原版Minecraft音频文件/` tracked with mapping/index. |
| Runtime item/block/model use | PARTIAL | Explicit opt-in only; availability != implementation. |
| Mining destroy-stage textures | PARTIAL | Merged #133 directly uses canonical destroy_stage_0..9. |
| Block/tool/mob sound subset | PARTIAL | Current mapped source-backed events. |
| Full sounds.json/spatial/music | TODO | Broad gap. |

## Engineering / CI

| Feature | Status | Notes |
|---|---|---|
| Node syntax + auto-discovered logic tests | DONE | Mandatory exact-head gate. |
| Chromium E2E sharding | DONE | Two mandatory shards. |
| Resource provenance checks | PARTIAL | Strong for implemented source-backed paths; breadth still grows with registry. |
| Final base/review gate | DONE | Policy: exact head, no base drift, no unresolved blockers before merge. |
