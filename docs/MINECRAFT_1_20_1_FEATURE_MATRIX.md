# Minecraft Java 1.20.1 Parity Matrix

Status: `DONE` / `PARTIAL` / `FOUNDATION` / `TODO` / `BLOCKED`.

Percentages are planning estimates, not automated coverage. `PROJECT_BASELINE.md` records merged main; this matrix describes the **projected post-PR #127 state** where explicitly noted.

## Overall projected state after PR #127

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering | 85% | PARTIAL | lighting parity, broad collision/model/state/tint/animation |
| Desktop/mobile controls and core UI | 78% | PARTIAL | settings/accessibility/keybind UI, recipe book |
| Singleplayer survival core | 72% | PARTIAL | farming, food-use duration/effects, enchanting/brewing, broad progression |
| Blocks/items/recipes breadth | 25% | PARTIAL | most 1.20.1 registry content absent |
| World generation / biomes / caves / structures | 20% | PARTIAL | biome pipeline, caves, vanilla ore placement breadth, features/structures, Nether/End |
| Entities / PvE | 40% | PARTIAL | species breadth, pathfinding/spawns, breeding/taming/riding, server authority |
| Multiplayer server foundation | 70% | PARTIAL | hunger/PvE/XP authority, durable persistence, rooms/auth/operators |
| Full multiplayer Minecraft parity | 52% | PARTIAL | hunger/PvE authority, prediction breadth, wider content and replicated SFX |
| Original resource integration | 50% | PARTIAL | broad registry use, tint/animation, generated sound registry |
| Audio / SFX / music | 12% | PARTIAL | current tool/block/mining/mob subset; broad events/spatial/music remain |
| Farming / food / processing | 42% | PARTIAL | hunger core + first foods + Furnace meats; crops/hydration/effects/broad food absent |
| Redstone | 3% | FOUNDATION | neighbor updates, scheduled ticks, power graph/components |
| Villagers / trading | 0% | TODO | entire system |
| Enchanting / brewing / status effects | 0% | TODO | entire system |
| Nether / End / portals | 0% | TODO | dimensions/progression/bosses |
| Advancements / statistics | 0% | TODO | entire system |
| Engineering / CI | 90% | PARTIAL | performance/load/device/visual-diff breadth |

**Overall strict Java 1.20.1 parity remains conservatively about 35%.** Hunger/food closes an important survival loop, but the dominant registry/worldgen/dimension/redstone/effects gaps are still much larger.

## Runtime / rendering / UI

| Feature | Status | Notes |
|---|---|---|
| Shared desktop/mobile runtime | DONE | Unified intent model. |
| First/third-person camera | DONE | F5 cycle. |
| First-person held viewmodel | PARTIAL | Source-backed Steve arm + 3D held presentation; full Java equip/use transforms absent. |
| Third-person Steve model | PARTIAL | Source-backed articulated wide Steve. |
| Chunk streaming + Workers + batching | DONE | Bounded lifecycle and merged geometry. |
| Generic blockstate/model interpreter | PARTIAL | Selected roots live; broad registry/state/collision breadth incomplete. |
| Water | PARTIAL | Static/simplified; no full levels/flow. |
| Vanilla lighting / biome tint / animated textures | TODO | Major rendering parity gaps. |
| Inventory / Workbench / Furnace UI | PARTIAL | Workbench canonical source-backed layout; recipe book/settings breadth missing. |
| Hunger HUD | PARTIAL | Existing 10-shank HUD tracks projected food level; exact half-shank/effect animation breadth remains. |

## Blocks / items / crafting

Projected post-#127 registry: **52 runtime item IDs / 18 crafting recipes** plus **5 Furnace recipes**.

Current gameplay families/states:

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `coal_ore`, `glass`, `furnace`, `farmland`, `dirt_path`, `stripped_oak_log`.

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
| Gold/diamond/netherite progression | TODO | Architecture exists but content absent. |
| Shields / player ranged weapons / buckets | TODO | Not implemented. |
| Slabs/stairs/fences/walls/doors | TODO | Broad shapes/state/collision missing. |
| Chests/barrels/hoppers | TODO | Durable block-entity foundation required. |

Iron armor, coal/coal ore and #127 food additions are not inserted into historical `CREATIVE_START`; they remain registered/obtainable without shifting starter-slot contracts.

## Survival / combat

| Feature | Status | Notes |
|---|---|---|
| HP / hurt cooldown / death / respawn | DONE | Singleplayer + authoritative PvP slices. |
| Knockback | DONE | Shared foundations. |
| Java-style armor mitigation | PARTIAL | Damage-dependent formula; toughness-bearing tiers not present. |
| Armor durability / break | PARTIAL | local + authoritative wear/break. |
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

## Food values projected in #127

| Item | Nutrition | Saturation modifier | Runtime source |
|---|---:|---:|---|
| Apple | 4 | 0.3 | canonical Java 1.20.1 item PNG |
| Bread | 5 | 0.6 | canonical Java 1.20.1 item PNG |
| Raw beef | 3 | 0.3 | existing source-backed runtime item |
| Steak | 8 | 0.8 | canonical Java 1.20.1 item PNG |
| Raw mutton | 2 | 0.3 | existing source-backed runtime item |
| Cooked mutton | 6 | 0.8 | canonical Java 1.20.1 item PNG |
| Raw porkchop | 3 | 0.3 | existing source-backed runtime item |
| Cooked porkchop | 8 | 0.8 | canonical Java 1.20.1 item PNG |
| Raw chicken | 2 | 0.3 | existing source-backed runtime item; Hunger effect not yet implemented |
| Cooked chicken | 6 | 0.6 | canonical Java 1.20.1 item PNG |
| Rotten flesh | 4 | 0.1 | existing source-backed runtime item; Hunger effect not yet implemented |

## World generation

| Feature | Status | Notes |
|---|---|---|
| Deterministic shared terrain | DONE | Browser/server current generator v3; singleplayer keeps explicit v2 support for legacy local saves. |
| Singleplayer terrain-version persistence | PARTIAL | #126 schema v8 introduced `terrainVersion`; #127 schema v9 preserves the “required since v8” boundary. |
| Heightmap / surface / sea / oak trees | DONE | Simplified baseline. |
| Iron ore | PARTIAL | Simplified deterministic distribution. |
| Coal ore | PARTIAL | Deterministic v3 injection; not vanilla Java placement. |
| Biomes/climate | TODO | No Java biome pipeline. |
| Caves/aquifers | TODO | None. |
| Broad ores/features/structures | TODO | None. |
| Java vertical range | TODO | Current height 64. |
| Nether/End | TODO | None. |

## Entities / PvE

Current mobs: cow, sheep, pig, chicken, zombie, skeleton, creeper, spider.

| Feature | Status | Notes |
|---|---|---|
| Current 8 mob models/AI/combat | PARTIAL | Source textures + compatible geometry, simplified behavior. |
| Current mob ambient/hurt/death audio | PARTIAL | Source-backed baseline. |
| Mob raw-food drops | PARTIAL | Existing meat drops now enter the hunger loop; loot breadth remains simplified. |
| Vanilla spawn/pathfinding/breeding/taming/riding | TODO | Major breadth gap. |
| Server-authoritative PvE/projectiles/explosions | TODO | Major multiplayer gap. |
| Most species | TODO | Absent. |

## Multiplayer authority

| Feature | Status | Notes |
|---|---|---|
| Handshake/session/input/movement | DONE | Real authoritative runtime. |
| World edits/mining/placement | DONE | Revisioned server truth. |
| Terrain generator compatibility | DONE | Multiplayer requires exact current terrain version. |
| Ground items / Inventory / item durability | DONE | Server-owned. |
| Equipment transactions | DONE | Server-owned. |
| Crafting / Workbench | DONE | Current scope. |
| Furnace | PARTIAL | Authoritative process-memory state; #127 recipes are shared pure rules; durable storage absent. |
| PvP | PARTIAL | HP/melee/armor/wear/knockback/death/respawn current slice. |
| Hunger / food | TODO | No authoritative multiplayer hunger state or eat transaction; client deliberately rejects local multiplayer food use. |
| PvE / XP / durable persistence | TODO | Not server-owned / not durable. |
| Replicated gameplay SFX | TODO | Local audio only. |

## Farming / food / processing

| Feature | Status | Notes |
|---|---|---|
| Furnace | PARTIAL | raw iron + four raw meats; coal at 1600 ticks. |
| Farmland creation | PARTIAL | Hoe tilling exists. |
| Hunger/saturation/exhaustion | PARTIAL | #127 FoodData-like core. |
| First edible set | PARTIAL | raw/cooked meats, apple, bread, rotten flesh. |
| Bread acquisition | PARTIAL | Bread is registered/giveable; wheat→bread crafting waits for farming slice. |
| Food use duration/eating animation | TODO | Current use is instantaneous. |
| Food status effects | TODO | Hunger effect and general MobEffect system absent. |
| Moisture/irrigation/trampling | TODO | None. |
| Wheat/seeds/growth/harvest | TODO | None. |
| Breeding | TODO | None. |

## Major untouched systems

- Redstone: ~3% foundation only.
- Villagers/trading: 0%.
- Enchanting/brewing/status effects: 0%.
- Nether/End/portals/bosses: 0%.
- Advancements/statistics: 0%.

## Immediate roadmap after #127

1. farming phase 1: seeds/wheat/farmland hydration/growth/harvest + bread chain;
2. hunger phase 2: use duration/eating animation, status effects, difficulty/gamerule boundaries, multiplayer authority;
3. broad block/item/recipe registry families;
4. biome/cave/ore/feature/structure worldgen;
5. server-owned PvE/XP and durable block-entity/world persistence.
