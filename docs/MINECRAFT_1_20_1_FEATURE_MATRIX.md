# Minecraft Java 1.20.1 Parity Matrix

Status legend:

- `DONE` — implemented with validation for the currently scoped runtime contract.
- `PARTIAL` — meaningful implementation exists, but Java 1.20.1 parity is incomplete.
- `FOUNDATION` — architecture exists while most user-facing content is absent.
- `TODO` — not meaningfully implemented.
- `BLOCKED` — requires an unavailable prerequisite.

This matrix is the roadmap authority. Percentages are planning estimates, not automated coverage. `docs/PROJECT_BASELINE.md` records merged `main`; this matrix may describe the state expected **after the current open delivery merges**, when explicitly labeled.

## Overall baseline / projected PR #124 state

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering foundation | 85% | PARTIAL | lighting parity, collision/model breadth, animation/tint, formal performance budgets |
| Desktop/mobile controls and core UI | 78% | PARTIAL | full settings/accessibility/keybind UI, recipe book, broader device matrix |
| Singleplayer survival core | 64% | PARTIAL | hunger/food, farming depth, armor progression/wear, effects/enchanting/brewing |
| Blocks/items/recipes breadth | 20% | PARTIAL | most 1.20.1 registry content absent |
| World generation / biomes / caves / structures | 18% | PARTIAL | biome pipeline, caves, broad ores/features/structures, Nether/End |
| Entities / PvE | 40% | PARTIAL | species breadth, pathfinding/spawns, breeding/taming/riding, server authority |
| Multiplayer server foundation | 69% | PARTIAL | durable persistence, rooms/auth/operators, server PvE/XP, broader block entities |
| Full multiplayer Minecraft parity | 51% | PARTIAL | prediction/reconciliation, PvE authority, wider content and replicated SFX |
| Original resource integration | 46% | PARTIAL | broad registry use, item-model interpretation, tint/animation, generated sound registry |
| Audio / SFX / music | 12% | PARTIAL | current tool/block + first mob/mining subset; broad events, true spatial audio and music remain |
| Redstone | 3% | FOUNDATION | neighbor updates, scheduled ticks, power graph/components |
| Farming / food / smelting | 24% | PARTIAL | Furnace + farmland creation; hydration, crops, food, breeding, broad recipes/fuels remain |
| Villagers / trading | 0% | TODO | entire system |
| Enchanting / brewing / status effects | 0% | TODO | entire system |
| Nether / End / portal progression | 0% | TODO | dimensions, portals, worldgen, bosses |
| Advancements / statistics | 0% | TODO | entire system |
| Engineering / CI | 90% | PARTIAL | wider real-device/performance/load/visual-diff coverage |

**Overall strict Java 1.20.1 parity remains conservatively ~35%.** PR #124 repairs visible regressions and expands a narrow audio slice; it does not materially close the dominant content domains.

## 1. Runtime, rendering and platform

| Feature | Status | Notes / next work |
|---|---|---|
| Shared desktop/mobile runtime | DONE | Input adapters converge on one control-intent model. |
| Pointer Lock desktop controls | DONE | Production path covered. |
| Landscape mobile touch controls | DONE | Chromium coverage exists; broader physical-device validation remains. |
| First/third-person camera | DONE | F5 cycle implemented. |
| First-person held-item viewmodel | PARTIAL | Source-backed Steve right arm/sleeve, 3D held visuals and attack/use exist. PR #124 corrects reversed arm direction; exact Java equip/attack-strength transforms remain. |
| Third-person player model | PARTIAL | Source-backed articulated wide Steve. PR #124 fixes physical left/right limb pivots so right-hand actions appear on anatomical right. |
| Chunk streaming | DONE | Bounded load/unload + explicit disposal. |
| Terrain Worker | DONE | Shared deterministic browser/server terrain. |
| Mesh Worker | DONE | Legacy + selected interpreted model batches. |
| Chunk merged mesh rendering | DONE | No one-Mesh-per-block runtime regression. |
| Local pinned Three.js | DONE | Same-origin runtime module. |
| Water rendering | PARTIAL | No vanilla flow/levels/refraction. |
| Bed special renderer | DONE | Paired source-backed red-bed presentation. |
| General blockstate/model interpreter | PARTIAL | Parent/texture inheritance, variants/multipart, rotations, cull/tint metadata and batching work for selected roots. |
| Translucent interpreted layer | PARTIAL | Glass path exists; broad transparent families/sorting remain. |
| Animated textures | TODO | Metadata may exist; playback absent. |
| Biome tint resolver | TODO | Current compatibility uses fixed/default tint where needed. |
| Vanilla lighting | TODO | Current lighting/day-night is simplified. |
| General particle registry | TODO | Weather/combat/explosion effects are bespoke partial presentation. |
| Resource-pack abstraction | FOUNDATION | Logical manifest/provenance exists; arbitrary packs do not. |

## 2. Current block/content boundary

Projected gameplay families/states through PR #124 remain the PR #123 set:

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `glass`, `furnace`, `farmland`, `dirt_path`, `stripped_oak_log`.

| Family | Status | Notes |
|---|---|---|
| Basic full cubes | PARTIAL | Small registry only. |
| Directional/source-model cubes | PARTIAL | Crafting table/furnace and selected roots; generalized state storage incomplete. |
| Beds | PARTIAL | Two-block placement/render/sleep/respawn; full support/bounce/dimension rules absent. |
| Ores | PARTIAL | Iron only. |
| Wood/logs | PARTIAL | Oak baseline + stripped oak; other species/states absent. |
| Farmland / dirt path | PARTIAL | Real mutations exist; hydration/trampling/crops/scheduled updates absent. |
| Leaves / saplings | PARTIAL | Oak leaves; growth/decay/saplings absent. |
| Glass / panes | PARTIAL | Full-cube glass only. |
| Slabs/stairs/fences/walls/doors | TODO | Collision + neighbor/state breadth missing. |
| Chests/barrels | TODO | Durable block-entity storage/viewer concurrency required. |
| Furnace family | PARTIAL | Furnace runtime works; smoker/blast furnace/facing-lit parity/durable server storage remain. |
| Plants/flowers/signs | TODO | Broad non-full blocks/block entities absent. |
| Redstone components | TODO | See redstone domain. |

## 3. Items, tools and crafting

Projected registry remains **40 runtime item IDs** and **14 recipes** through PR #124.

| Feature | Status | Notes |
|---|---|---|
| Inventory/hotbar | DONE | 36 slots + 9 hotbar. |
| Cursor/stack transactions | DONE | Left/right/Shift semantics. |
| 2×2 player crafting | DONE | Small recipe set. |
| 3×3 Workbench crafting | DONE | Functional singleplayer + authoritative multiplayer. PR #124 replaces the legacy visual composition with canonical Java 1.20.1 `crafting_table.png` geometry. |
| Wooden/stone/iron pickaxes | DONE | Current tiers, harvest and durability paths. |
| Wooden/stone/iron swords | PARTIAL | Damage/durability profiles exist; full Java combat curve/critical/sweep/shield semantics absent. |
| Iron axe | PARTIAL | Mining + oak stripping; broad stripping/shield-disable rules absent. |
| Iron shovel | PARTIAL | Mining + grass/dirt path flattening; broader use rules absent. |
| Iron hoe | PARTIAL | Source-backed, recipe, durability + current tilling; broad hoe families absent. |
| Gold/diamond/netherite tools | FOUNDATION | Shared architecture but no gameplay breadth. |
| Raw iron / iron ingot | PARTIAL | Current stone→iron chain works. |
| Iron armor | TODO | Next content delivery. |
| Shields | TODO | Blocking/network semantics absent. |
| Player bow/crossbow | TODO | Skeleton has ranged presentation; player ranged gameplay absent. |
| Buckets | TODO | Fluid interaction prerequisite. |
| Food/eating | TODO | Hunger/saturation loop incomplete. |
| Recipe book | TODO | No discovery/UI parity. |

## 4. Player survival and progression

| Feature | Status | Notes |
|---|---|---|
| HP / damage / death | DONE | Singleplayer + authoritative PvP flows. |
| Knockback / hurt cooldown | DONE | Shared foundations. |
| Held-item melee profiles | PARTIAL | Damage/min interval/wear; not full Java attack-strength curve. |
| Hunger HUD | PARTIAL | Presentation only; real exhaustion/saturation/food loop absent. |
| Oxygen / drowning | PARTIAL | Functional simplified path. |
| Swimming / buoyancy | PARTIAL | No full sprint-swim/crawl parity. |
| XP / levels | PARTIAL | Singleplayer + Furnace extraction; server-owned multiplayer XP absent. |
| Death drops / respawn | DONE | Singleplayer and authoritative PvP. |
| Bed sleep / respawn | PARTIAL | Core behavior works; full occupancy/animation/rules incomplete. |
| Tool/weapon durability | PARTIAL | Current wooden/stone/iron tools/weapons; armor wear absent. |
| Tool effectiveness vs harvest | DONE | Separate dimensions. |
| Tool secondary actions | PARTIAL | till/strip/flatten narrow subset. |
| Stone→iron progression | PARTIAL | Complete through current iron tool/weapon/hoe set; iron armor and coal remain. |
| Hunger/exhaustion/saturation | TODO | Major survival gap. |
| Generic fire/lava | TODO | Hostile daylight burn is not a general fire system. |
| Enchantments/effects/brewing | TODO | None. |

## 5. Entities and PvE

| Mob/system | Status | Notes |
|---|---|---|
| Cow | PARTIAL | Basic passive AI/combat/loot/model; PR #124 adds source-backed ambient/hurt/death baseline. |
| Sheep | PARTIAL | Wool visual/loot; PR #124 adds voice baseline; shearing/dye/breeding absent. |
| Pig | PARTIAL | Basic passive behavior + PR #124 voice baseline; saddle/breeding absent. |
| Chicken | PARTIAL | Basic passive behavior + PR #124 voice baseline; eggs/breeding absent. |
| Zombie | PARTIAL | Chase/melee/daylight presentation + PR #124 voice baseline. |
| Skeleton | PARTIAL | Ranged AI/bow + PR #124 voice baseline. |
| Creeper | PARTIAL | Fuse/explosion; PR #124 adds hurt/death source sounds; no ordinary ambient voice. |
| Spider | PARTIAL | Melee/bounded climbing + PR #124 voice baseline. |
| General pathfinding | TODO | Current movement is lightweight/direct. |
| Vanilla spawn rules | TODO | Biome/light/cap parity absent. |
| Breeding/babies/taming/riding | TODO | None. |
| Server-authoritative PvE | TODO | Major multiplayer gap. |
| Most species | TODO | Aquatic, villagers/illagers, Nether/End etc. absent. |

## 6. World generation

| Feature | Status | Notes |
|---|---|---|
| Deterministic seeded terrain | DONE | Browser/server share versioned generator. |
| Heightmap + surface/sea | DONE | Simplified fBm baseline. |
| Oak trees | DONE | Simplified deterministic feature. |
| Iron ore | PARTIAL | Simplified deterministic underground distribution. |
| Prompt-adjusted parameters | DONE | Keyword-driven coarse parameters. |
| Biomes/climate | TODO | No Java biome pipeline. |
| Caves/aquifers | TODO | None. |
| Broad ores/features | TODO | Coal and others absent. |
| Structures | TODO | None. |
| Java vertical range | TODO | Current world height remains 64. |
| Nether/End worldgen | TODO | None. |

## 7. Fluids, weather and environment

| Feature | Status | Notes |
|---|---|---|
| Static water | PARTIAL | Rendering + swim sampling. |
| Fluid levels/flow | TODO | None. |
| Lava / water-lava interaction | TODO | None. |
| Rain/thunder visual FX | PARTIAL | Pooled renderer; no full biome/roof/splash rules. |
| Automatic weather cycle | TODO | Command/save driven. |
| Lightning entity/damage | TODO | None. |
| Underwater fog/refraction | TODO | None. |

## 8. Multiplayer authority

| Feature | Status | Notes |
|---|---|---|
| WebSocket/session sequencing | DONE | Real Node authoritative runtime. |
| Movement/collision | DONE | 20 Hz server simulation. |
| Remote players | DONE | Replication/interpolation. |
| World edits | DONE | Revisioned bootstrap/live edits. |
| Mining / placement | DONE | Survival/creative ordinary paths. |
| Tool secondary actions | PARTIAL | till/strip/flatten server-owned; breadth narrow. |
| Ground items / Inventory / durability | DONE | Current authoritative paths. |
| Equipment | DONE | Transaction path exists. |
| 2×2 crafting / Workbench | DONE | Server-authoritative container paths. |
| Furnace | PARTIAL | Process-memory state/viewers; durable storage absent. |
| Chat / commands | PARTIAL | Controlled current subset. |
| PvP | PARTIAL | HP/melee/armor/knockback/death/respawn; broader combat semantics absent. |
| PvE/projectiles/explosions | TODO | Still client/singleplayer-owned. |
| XP/levels | TODO | Not server-owned. |
| Durable world/container persistence | TODO | Major backend gap. |
| Accounts/rooms/reconnect | TODO | Product/backend gap. |
| Replicated gameplay SFX | TODO | PR #124 audio remains local runtime. |

## 9. Audio / SFX / music

Audio parity rule: **tracked sound objects do not make an event implemented by themselves**. An event counts only when runtime selection/playback exists and tests validate the actual source boundary.

| Feature | Status | Notes |
|---|---|---|
| Java 1.20.1 sound-object source corpus | DONE | Tracked separately from client texture/model tree. |
| Tool secondary-action sounds | PARTIAL | till / strip / flatten use source-backed OGG variants. |
| Block break/place | PARTIAL | Current grass/gravel/stone/sand/wood/glass families only. |
| Local footsteps | PARTIAL | Current sound types only; PR #124 changes over-dense 0.55-block cadence to 1.6-block movement cadence. |
| Mining hit cadence | PARTIAL | PR #124 adds ~200 ms source-backed hit events and early break-object prefetch for singleplayer survival mining. |
| Current mob ambient/hurt/death | PARTIAL | PR #124 covers the current eight mobs where those voice events exist. Many specialized events remain. |
| Local distance attenuation for mobs | PARTIAL | PR #124 adds a simple 24-block linear gain curve; this is **not** full 3D positional/HRTF parity. |
| Player/combat specialized source sounds | FOUNDATION | Some older events still use procedural fallback. |
| Remote multiplayer SFX replication | TODO | No authoritative sound-event replication. |
| Weather/cave/ambient source scheduling | TODO | None. |
| Music | TODO | No scheduling/playback parity. |
| Full `sounds.json` registry semantics | TODO | Current mappings are intentionally narrow/manual. |
| True 3D spatial listener/HRTF | TODO | No Panner-based positional system yet. |

## 10. UI / menus / settings

| Feature | Status | Notes |
|---|---|---|
| Main/world/pause/death flow | PARTIAL | Functional current shell; not full Java menu parity. |
| HUD/hotbar/status | PARTIAL | Source-backed presentation for current elements. |
| Inventory | PARTIAL | Canonical source-backed panel + Steve preview; recipe book absent. |
| Workbench | PARTIAL | Functional crafting; PR #124 moves live panel/slot geometry to canonical Java 1.20.1 crafting-table texture. |
| Furnace UI | PARTIAL | Functional current runtime; not full recipe-book/container breadth. |
| Chat | PARTIAL | Current single/multiplayer functionality. |
| Options/settings | FOUNDATION | Broad video/audio/control/accessibility settings absent. |
| Keybind customization | TODO | None. |
| Accessibility/subtitles | TODO | None. |

## 11. Redstone / automation

| Feature | Status | Notes |
|---|---|---|
| Neighbor update foundation | FOUNDATION | Some block mutations/remesh paths exist, not a redstone graph. |
| Scheduled ticks | TODO | General scheduler absent. |
| Power propagation | TODO | None. |
| Components/observers/pistons | TODO | None. |
| Hoppers/container automation | TODO | Needs durable block entities + tick system. |

## 12. Farming, food and processing

| Feature | Status | Notes |
|---|---|---|
| Furnace processing | PARTIAL | Raw iron smelting + current fuel/XP state. |
| Farmland creation | PARTIAL | Iron hoe can till current grass/dirt subset. |
| Hydration/trampling | TODO | None. |
| Crop planting/growth | TODO | None. |
| Food/eating/hunger loop | TODO | None. |
| Breeding | TODO | None. |
| Broad smelting/fuels | TODO | Narrow current set only. |

## 13. Dimensions / progression systems

| Feature | Status | Notes |
|---|---|---|
| Nether | TODO | No dimension/portal/worldgen/content. |
| End | TODO | No dimension/portal/worldgen/boss. |
| Advancements/statistics | TODO | None. |
| Villagers/trading | TODO | None. |
| Enchanting | TODO | None. |
| Brewing/status effects | TODO | None. |

## 14. Immediate delivery order after PR #124

1. Iron armor items + recipes + equipment integration; armor durability/wear remains an explicit sub-delivery.
2. Coal ore/item/fuel with a versioned terrain-generator compatibility decision.
3. Registry-driven source audio generation, then broader entity/combat/environment/music + proper spatial listener.
4. Server-owned XP/levels and durable generic block-entity/world persistence.
5. Continue registry/worldgen breadth without regressing chunk batching or authority boundaries.

## Validation requirements for parity changes

- current exact branch HEAD only;
- Node syntax + automatically discovered logic/server/Worker regressions;
- two Chromium shards;
- source asset/object existence and provenance checks for affected resource features;
- browser tests for user-visible/WebAudio boundaries where pure tests are insufficient;
- no unresolved review blocker;
- branch must remain composed against current main (`behind=0`) before Ready/merge.
