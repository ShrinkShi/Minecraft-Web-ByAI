# Minecraft Java 1.20.1 Parity Matrix

Status: `DONE` / `PARTIAL` / `FOUNDATION` / `TODO` / `BLOCKED`.

Percentages are planning estimates, not automated coverage. `PROJECT_BASELINE.md` records merged main; this matrix describes the **projected post-PR #125 state** where explicitly noted.

## Overall projected state after PR #125

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering | 85% | PARTIAL | lighting parity, broad collision/model/state/tint/animation |
| Desktop/mobile controls and core UI | 78% | PARTIAL | settings/accessibility/keybind UI, recipe book |
| Singleplayer survival core | 66% | PARTIAL | hunger/food/farming, effects/enchanting/brewing, broad progression |
| Blocks/items/recipes breadth | 22% | PARTIAL | most 1.20.1 registry content absent |
| World generation / biomes / caves / structures | 18% | PARTIAL | biome pipeline, caves, broad ores/features/structures, Nether/End |
| Entities / PvE | 40% | PARTIAL | species breadth, pathfinding/spawns, breeding/taming/riding, server authority |
| Multiplayer server foundation | 70% | PARTIAL | durable persistence, PvE/XP, rooms/auth/operators, broader block entities |
| Full multiplayer Minecraft parity | 52% | PARTIAL | PvE authority, prediction breadth, wider content and replicated SFX |
| Original resource integration | 47% | PARTIAL | broad registry use, tint/animation, generated sound registry |
| Audio / SFX / music | 12% | PARTIAL | current tool/block/mining/mob subset; broad events/spatial/music remain |
| Farming / food / processing | 24% | PARTIAL | Furnace + farmland creation; hunger/crops/food/broad fuels absent |
| Redstone | 3% | FOUNDATION | neighbor updates, scheduled ticks, power graph/components |
| Villagers / trading | 0% | TODO | entire system |
| Enchanting / brewing / status effects | 0% | TODO | entire system |
| Nether / End / portals | 0% | TODO | dimensions/progression/bosses |
| Advancements / statistics | 0% | TODO | entire system |
| Engineering / CI | 90% | PARTIAL | performance/load/device/visual-diff breadth |

**Overall strict Java 1.20.1 parity remains conservatively about 35%.** Iron armor closes an important survival slice but does not materially shrink the dominant registry/worldgen/dimension gaps.

## Runtime / rendering / UI

| Feature | Status | Notes |
|---|---|---|
| Shared desktop/mobile runtime | DONE | Unified intent model. |
| First/third-person camera | DONE | F5 cycle. |
| First-person held viewmodel | PARTIAL | Source-backed Steve arm + 3D held presentation; full Java equip/attack-strength transforms absent. |
| Third-person Steve model | PARTIAL | Source-backed articulated wide Steve; anatomical limb sides fixed in #124. |
| Chunk streaming + Workers + batching | DONE | Bounded lifecycle and merged geometry. |
| Generic blockstate/model interpreter | PARTIAL | Selected roots live; broad registry/state/collision breadth incomplete. |
| Water | PARTIAL | Static/simplified; no full levels/flow. |
| Vanilla lighting / biome tint / animated textures | TODO | Major rendering parity gaps. |
| Inventory / Workbench / Furnace UI | PARTIAL | Workbench now canonical source-backed layout; recipe book/settings breadth missing. |

## Blocks / items / crafting

Projected post-#125 registry: **44 runtime item IDs / 18 recipes**.

Current gameplay families/states remain:

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `glass`, `furnace`, `farmland`, `dirt_path`, `stripped_oak_log`.

| Feature | Status | Notes |
|---|---|---|
| 36-slot Inventory + hotbar | DONE | Cursor/stack/Shift semantics. |
| 2×2 / 3×3 crafting | DONE | Current recipe set only. |
| Wooden/stone/iron pickaxes | DONE | Current harvest/durability path. |
| Wooden/stone/iron swords | PARTIAL | Full Java combat curve/critical/sweep/shield absent. |
| Iron axe/shovel/hoe | PARTIAL | Current secondary actions; breadth narrow. |
| Raw iron / iron ingot | PARTIAL | Stone→iron chain. |
| **Iron armor** | PARTIAL | #125: 4 pieces, recipes, 15 armor points, durability/wear, local + authoritative PvP state. Third-person armor model/sounds/enchantments absent. |
| Leather armor durability | PARTIAL | #125 restores Java durability metadata and generic wear. |
| Gold/diamond/netherite progression | TODO | Architecture exists but content absent. |
| Shields / player ranged weapons / buckets / food | TODO | Not implemented. |
| Slabs/stairs/fences/walls/doors | TODO | Broad shapes/state/collision missing. |
| Chests/barrels/hoppers | TODO | Durable block-entity foundation required. |

Iron armor is intentionally not inserted into the historical `CREATIVE_START`; it is registered/craftable/giveable without shifting existing starter-slot contracts.

## Survival / combat

| Feature | Status | Notes |
|---|---|---|
| HP / hurt cooldown / death / respawn | DONE | Singleplayer + authoritative PvP slices. |
| Knockback | DONE | Shared foundations. |
| Java-style armor mitigation | PARTIAL | #125 replaces fixed 4%-per-point approximation with damage-dependent formula; toughness-bearing tiers not present. |
| Armor durability / break | PARTIAL | #125 local + authoritative wear/break; damage metadata survives equipment state paths. |
| PvP armor replication | PARTIAL | Server computes pre-hit mitigation, applies wear only on successful damage, replicates Equipment revision. |
| Singleplayer armor wear | PARTIAL | hostile/projectile/explosion applied-damage bridge; drowning bypasses wear. |
| Tool/weapon durability | PARTIAL | Current implemented set. |
| Hunger HUD | PARTIAL | Presentation only. |
| Hunger/exhaustion/saturation/food | TODO | Major survival gap. |
| Oxygen / swimming | PARTIAL | Simplified. |
| XP / levels | PARTIAL | Singleplayer; multiplayer server-owned XP absent. |
| Bed sleep / respawn | PARTIAL | Core slice only. |
| Enchantments/effects/brewing | TODO | None. |

## World generation

| Feature | Status | Notes |
|---|---|---|
| Deterministic shared terrain | DONE | Browser/server versioned generator. |
| Heightmap / surface / sea / oak trees | DONE | Simplified baseline. |
| Iron ore | PARTIAL | Simplified deterministic distribution. |
| Coal ore | TODO | Next planned terrain-version delivery. |
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
| Current mob ambient/hurt/death audio | PARTIAL | Source-backed baseline from #124. |
| Vanilla spawn/pathfinding/breeding/taming/riding | TODO | Major breadth gap. |
| Server-authoritative PvE/projectiles/explosions | TODO | Major multiplayer gap. |
| Most species | TODO | Absent. |

## Multiplayer authority

| Feature | Status | Notes |
|---|---|---|
| Handshake/session/input/movement | DONE | Real authoritative runtime. |
| World edits/mining/placement | DONE | Revisioned server truth. |
| Ground items / Inventory / item durability | DONE | Server-owned. |
| Equipment transactions | DONE | Server-owned. |
| **Armor wear replication** | PARTIAL | #125 extends authoritative Equipment with damage/break revisions and PvP integration. |
| Crafting / Workbench | DONE | Current scope. |
| Furnace | PARTIAL | Authoritative process-memory state; durable storage absent. |
| PvP | PARTIAL | HP/melee/armor/wear/knockback/death/respawn current slice. |
| PvE / XP / durable persistence | TODO | Not server-owned / not durable. |
| Replicated gameplay SFX | TODO | Local audio only. |

## Audio

| Feature | Status | Notes |
|---|---|---|
| Java 1.20.1 sound-object corpus | DONE | Tracked source input. |
| Tool secondary-action sounds | PARTIAL | till / strip / flatten. |
| Block break/place/step | PARTIAL | Current sound families only. |
| Footsteps | PARTIAL | 1.6-block local cadence, current sound families. |
| Mining hit / break prewarm | PARTIAL | ~200 ms hit cadence + shared fetch/decode AudioBuffer prewarm cache. |
| Current mob voices | PARTIAL | Ambient/hurt/death subset + simple local attenuation. |
| Full `sounds.json` semantics / subtitles | TODO | Manual narrow mappings today. |
| Remote replicated SFX | TODO | None. |
| True positional/HRTF / music | TODO | None. |

## Farming / food / processing

| Feature | Status | Notes |
|---|---|---|
| Furnace | PARTIAL | Raw iron smelting + current fuel baseline. |
| Farmland creation | PARTIAL | Hoe tilling exists. |
| Moisture/irrigation/trampling | TODO | None. |
| Wheat/seeds/growth/harvest | TODO | None. |
| Food/eating/hunger/saturation | TODO | None. |
| Breeding | TODO | None. |

## Major untouched systems

- Redstone: ~3% foundation only.
- Villagers/trading: 0%.
- Enchanting/brewing/status effects: 0%.
- Nether/End/portals/bosses: 0%.
- Advancements/statistics: 0%.

## Immediate roadmap after #125

1. coal ore + coal + Furnace fuel + terrain compatibility/version;
2. hunger/saturation/exhaustion + first food set;
3. wheat/seeds/farmland hydration/growth/harvest;
4. broad block/item/recipe registry families;
5. biome/cave/ore/feature/structure worldgen;
6. server-owned PvE/XP and durable block-entity/world persistence.
