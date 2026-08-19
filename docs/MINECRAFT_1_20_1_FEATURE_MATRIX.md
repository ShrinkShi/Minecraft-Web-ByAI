# Minecraft Java 1.20.1 Parity Matrix

Status legend:

- `DONE` — implemented on `main` with validation evidence.
- `PARTIAL` — meaningful implementation exists, but Minecraft 1.20.1 parity is incomplete.
- `FOUNDATION` — architecture exists but the user-facing Minecraft feature/content is largely not present.
- `TODO` — not meaningfully implemented yet.
- `BLOCKED` — requires an external asset/source or prerequisite that is not currently present.

This matrix is the roadmap authority. Percentages are planning estimates, not automated coverage metrics. Feature PRs update this file for the state that will exist after that PR merges; an unmerged PR does not retroactively change `main`.

## Overall baseline

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering foundation | 85% | PARTIAL | lighting parity, generic non-cube gameplay breadth, advanced particles, broader performance work |
| Desktop/mobile controls and core UI | 75% | PARTIAL | full settings/accessibility, polished mobile customization, broader browser/device matrix |
| Singleplayer survival core | 58% | PARTIAL | hunger/food breadth, farming, full iron/tool progression, effects/enchanting/brewing, generic block-entity scheduling |
| Blocks/items/recipes breadth | 16% | PARTIAL | most 1.20.1 registry content is not exposed |
| World generation / biomes / caves / structures | 18% | PARTIAL | true biome pipeline, caves, broad ore distribution, features, structures, Nether/End |
| Entities / PvE | 35% | PARTIAL | species breadth, pathfinding/spawn parity, breeding/taming/riding, server authority |
| Multiplayer server foundation | 68% | PARTIAL | durable persistence, rooms/auth/operators, server PvE, authoritative XP and broader shared containers |
| Full multiplayer Minecraft parity | 50% | PARTIAL | same as above plus prediction/reconciliation and wider gameplay coverage |
| Original resource integration | 36% | PARTIAL | much wider registry use, item models, tint/animation, audio |
| Audio/music | 0% | BLOCKED | supplied archive contains no sound object set or sounds.json |
| Redstone | 3% | FOUNDATION | block state/update scheduler/power graph/components |
| Farming/food/smelting | 20% | PARTIAL | Furnace processing now has singleplayer persistence plus authoritative multiplayer runtime; food effects, crops, breeding, broad recipes/fuels and automation remain |
| Villagers/trading | 0% | TODO | entire system |
| Enchanting/brewing/status effects | 0% | TODO | entire system |
| Nether/End/portal progression | 0% | TODO | dimensions, portals, dimension worldgen, bosses |
| Advancements/statistics | 0% | TODO | entire system |
| Engineering/CI | 90% | PARTIAL | broaden browser/device/performance/load coverage and eliminate known flaky presentation timing |

**Overall strict Minecraft Java 1.20.1 parity planning estimate remains ~35%.** Completing one narrow Furnace progression slice does not justify a large overall percentage jump while most registries and major gameplay domains remain absent.

## 1. Runtime, rendering and platform

| Feature | Status | Notes / next work |
|---|---|---|
| Shared desktop/mobile Web runtime | DONE | Device adapters converge on one gameplay intent model. |
| Pointer Lock desktop controls | DONE | Production path covered. |
| Landscape mobile touch controls | DONE | Android Chromium automation exists; real-device matrix still needed. |
| First/third-person camera modes | DONE | F5 cycle implemented. |
| Chunk streaming | DONE | Load/unload around player with explicit geometry disposal. |
| Terrain Worker | DONE | Deterministic shared generator. |
| Mesh Worker | DONE | Legacy opaque/water + bed descriptors + opt-in interpreted model batches. |
| Chunk merged mesh rendering | DONE | Legacy and interpreted paths remain chunk-batched; no one-Mesh-per-block runtime. |
| Local/pinned Three.js runtime | DONE | Historical runtime CDN dependency removed. |
| Water transparent pass | PARTIAL | No vanilla fluid levels/flow/animation/refraction. |
| Bed special model renderer | DONE | Red bed world visual uses imported entity texture; logical collision still simplified. |
| General blockstate/model JSON interpreter | PARTIAL | Source-backed JSON preloads/compiles into the real Worker/VoxelWorld opt-in path; crafting table, iron ore, glass and furnace are live gameplay roots, but broad registry coverage is still missing. |
| General multipart/variant model support | PARTIAL | Weighted variants/multipart compile and execute in the runtime; generalized gameplay-state/neighbor-state mapping is not wired yet. |
| Interpreted translucent block layer | PARTIAL | Glass proves real translucent model-atlas rendering and same-type internal-face culling; broader transparent families, sorting edge cases and panes remain incomplete. |
| Animated block/item textures | TODO | Water animation metadata retained but playback absent. |
| Biome tint/color resolver | TODO | Current compatibility uses baked/default tint where required. |
| Vanilla lighting model | TODO | Current lighting/day-night is simplified. |
| Particle system parity | PARTIAL | Weather/explosion effects exist; general particle registry does not. |
| Resource-pack abstraction | FOUNDATION | Logical asset manifest exists; generic pack loading does not. |
| PWA/offline install | TODO | Not part of current runtime contract. |

## 2. World and block registry

### Implemented gameplay block families

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `glass`, `furnace`.

The bed uses multiple internal block-state IDs, but counts as one gameplay family.

| Feature family | Status | Notes |
|---|---|---|
| Basic full cubes | PARTIAL | Small gameplay registry only. |
| Directional full cubes | PARTIAL | Crafting table and furnace render through source-backed interpreted models, but generalized per-cell directional state is not available. |
| Beds | PARTIAL | Two-block state + rendering + sleep/respawn; full vanilla support/update/bounce/dimension rules incomplete. |
| Ores | PARTIAL | Iron ore has gameplay metadata, source-backed model, shared worldgen and stone-tier harvest; other ores and exact vanilla distribution are absent. |
| Stone variants | TODO | Granite/diorite/andesite/deepslate/tuff/etc. |
| Wood families | TODO | Only oak foundation is exposed. |
| Logs/stripped wood | TODO | Registry/model/state expansion needed. |
| Leaves/saplings | PARTIAL | Oak leaves exist; saplings/growth missing. |
| Flowers/grass/plants | TODO | Requires crossed/non-cube model support. |
| Glass/panes | PARTIAL | Source-backed normal glass is a solid translucent gameplay block with same-glass internal-face culling and ordinary no-drop breaking; stained glass and panes are absent. |
| Slabs/stairs | TODO | Requires model/state collision shapes. |
| Fences/walls/gates | TODO | Requires neighbor-driven multipart state. |
| Doors/trapdoors | TODO | Requires paired/multipart state and collision shapes. |
| Buttons/levers/pressure plates | TODO | Redstone prerequisite. |
| Ladders/vines | TODO | Non-full collision/placement. |
| Torches/lanterns | TODO | Model + lighting integration. |
| Chests/barrels | TODO | Persistent block entity and shared viewer concurrency needed. |
| Furnaces/smokers/blast furnaces | PARTIAL | Furnace block `21`, original Java model/assets, harvest/drop metadata, recipe and iron-ingot content exist. #116 provides authoritative multiplayer container/tick/viewer/WebSocket/UI; #117 adds persistent singleplayer world-cell runtime using the same state/smelting core. Durable multiplayer storage, dynamic facing/lit state, smokers and blast furnaces remain. |
| Signs/hanging signs | TODO | Block entities/text UI. |
| Bookshelves/chiseled bookshelf | TODO | State/container interactions. |
| Shulker boxes | TODO | End/content prerequisites. |
| Redstone components | TODO | See Redstone section. |
| Decorative 1.20 blocks | TODO | Broad registry/model import needed. |

## 3. Items and crafting

Current runtime item registry: **33 IDs** at this delivery baseline.

Current recipes: **seven**.

| Feature | Status | Notes |
|---|---|---|
| 36-slot inventory/hotbar | DONE | Singleplayer and authoritative multiplayer paths exist. |
| Cursor/stack transactions | DONE | Left/right/Shift semantics implemented. |
| 2×2 crafting | DONE | Small recipe set only. |
| 3×3 workbench crafting | DONE | Small recipe set only; multiplayer authority exists. |
| Wooden pickaxe | DONE | Mining speed, harvest rules and durability supported. |
| Stone pickaxe | DONE | Source-backed item, 3×3 cobblestone/stick recipe, stone-tier speed/harvest and 131 durability are wired. |
| Iron/gold/diamond/netherite tools | FOUNDATION | Tier rules/assets may exist in part, but gameplay items/recipes/progression are not wired. |
| Raw iron | PARTIAL | Source-backed item is produced by correctly harvested iron ore and can be processed into registered `iron_ingot` through the shared smelting rules in both persistent singleplayer and authoritative multiplayer Furnace paths. Broader ore/smelting content is absent. |
| Iron ingot | PARTIAL | Source-backed registered gameplay item exists and is the Furnace smelting output; iron tools/armor and broader recipes are not wired. |
| Furnace block item | PARTIAL | Source-backed three-face Inventory/hotbar preview and block placement content exist; dynamic facing/lit parity is absent. |
| Glass block item | DONE | Source-identical Java 1.20.1 glass texture is deterministically generated and used by Inventory/hotbar without a false terrain-atlas fallback. |
| Swords/axes/shovels/hoes | TODO | Full behaviour/recipes/durability missing. |
| Armor materials beyond leather | TODO | Equipment architecture exists. |
| Shields | TODO | Blocking/state/network rules required. |
| Bow/crossbow player mechanics | TODO | Skeleton projectile foundation exists only. |
| Buckets | TODO | Fluid/state interaction required. |
| Food items and eating | TODO | Hunger/saturation system needs completion. |
| Furnace crafting recipe | PARTIAL | Vanilla-shaped eight-cobblestone furnace recipe is registered; recipe book/discovery parity is absent. |
| Furnace smelting recipes | PARTIAL | Deterministic raw iron → iron ingot, fuel times, 200-tick cooking, cooldown and stored-XP bookkeeping exist in the shared core; singleplayer persistence/extraction and authoritative multiplayer processing bind to that core. Broad vanilla recipe/fuel coverage remains. |
| Smithing | TODO | Netherite/template system absent. |
| Stonecutter/loom/grindstone/etc. | TODO | Workstation/container systems absent. |
| Recipe book | TODO | No full recipe discovery/UI. |

## 4. Player survival and progression

| Feature | Status | Notes |
|---|---|---|
| HP/damage/death | DONE | Singleplayer and multiplayer PvP have real flows. |
| Knockback/hurt cooldown | DONE | Shared foundations exist. |
| Hunger HUD | PARTIAL | Presentation/foundation exists; full food/saturation/exhaustion parity does not. |
| Oxygen/drowning | PARTIAL | Functional simplified implementation. |
| Swimming/buoyancy | PARTIAL | No sprint-swimming/crawl/pitch-directed vanilla parity. |
| Fall damage | PARTIAL | Player collision/fall handling exists but full vanilla edge cases are not a parity claim. |
| Experience/levels | PARTIAL | Singleplayer XP orbs + level formulas exist and #117 feeds extracted Furnace stored XP through Java-style fractional materialization into that system. Multiplayer still lacks a server-owned XP/level domain. |
| Death drops/respawn | DONE | Recoverable singleplayer loop and authoritative PvP death drops exist. |
| Custom spawnpoint | DONE | Persistent singleplayer path. |
| Bed sleep/respawn | PARTIAL | Night skip/safety implemented; occupancy/animation/full rules incomplete. |
| Tool durability | PARTIAL | Wooden and stone pickaxes use item-instance durability; broad tool/armor durability coverage is not complete. |
| Stone → iron mining progression | PARTIAL | Stone-tier iron harvest → raw iron → Furnace → registered iron ingot works in singleplayer and authoritative multiplayer processing paths. Iron pickaxe/tools/armor continuation is still absent. |
| Armor durability | TODO | Equipment exists but armor wear does not. |
| Hunger/exhaustion/saturation | TODO | Major survival gap. |
| Eating/drinking | TODO | Major survival gap. |
| Fire/lava/burning | TODO | Required before Nether parity. |
| Status effects | TODO | No potion/effect engine. |
| Enchantments | TODO | No enchantment engine/table/anvil. |
| Brewing | TODO | No brewing stand/potions. |

## 5. Mobs and PvE

| Mob/system | Status | Notes |
|---|---|---|
| Cow | PARTIAL | Spawn/wander/flee/combat loot + textured model; breeding/milking/baby rules missing. |
| Sheep | PARTIAL | Loot + wool model layer; shearing/dye/breeding missing. |
| Pig | PARTIAL | Core passive behaviour; saddle/breeding missing. |
| Chicken | PARTIAL | Core passive behaviour; egg/breeding missing. |
| Zombie | PARTIAL | Chase/melee/loot; full spawn/daylight/equipment variants missing. |
| Skeleton | PARTIAL | Ranged AI/arrow; bow equipment rendering and vanilla combat rules incomplete. |
| Creeper | PARTIAL | Fuse/explosion; vanilla explosion/entity interactions incomplete. |
| Spider | PARTIAL | Melee + bounded climbing; full wall/path/spawn behaviour incomplete. |
| Server-authoritative PvE | TODO | Largest current multiplayer gameplay authority gap. |
| General pathfinding/navigation | TODO | Current AI uses lightweight direct/local movement. |
| Vanilla spawn rules | TODO | No biome/light/cap/despawn parity. |
| Breeding/babies | TODO | None. |
| Taming/riding | TODO | None. |
| Aquatic mobs | TODO | None. |
| Villagers/illagers | TODO | None. |
| Nether mobs | TODO | Dimension absent. |
| End mobs/bosses | TODO | Dimension absent. |

## 6. World generation

| Feature | Status | Notes |
|---|---|---|
| Deterministic seed generation | DONE | Browser/server share terrain generator v2 and terrain version participates in multiplayer compatibility. |
| Heightmap terrain | DONE | Simplified fBm baseline. |
| Sea/water fill | DONE | Simplified fixed sea parameter. |
| Oak tree feature | DONE | Simple generation rule. |
| Prompt-adjusted terrain parameters | DONE | Keyword-driven amplitude/sea/forest/sand tuning. |
| Biome registry/source selection | TODO | Replace prompt-only surface classification with a real pipeline. |
| Climate/noise biome placement | TODO | None. |
| Cave generation | TODO | None. |
| Aquifers | TODO | None. |
| Ore veins/distribution | PARTIAL | Terrain v2 injects deterministic underground iron ore with an independent 3D hash; exact Java 1.20.1 ore noise/height rules and other ores are absent. |
| Surface rule breadth | TODO | Only basic stone/dirt/grass/sand. |
| Vegetation/feature placement framework | FOUNDATION | Tree path exists; needs generic feature stages. |
| Structures | TODO | Villages, mineshafts, dungeons, strongholds, monuments, etc. absent. |
| Expanded Java-like vertical range | TODO | Current world height is 64. |
| Nether worldgen | TODO | None. |
| End worldgen | TODO | None. |

Terrain v2 compatibility note: if generated `IRON_ORE` cells are normalized back to `STONE`, the locked v1 golden surface/terrain/tree byte sequences remain unchanged. The generator version was still bumped because ore contents change the deterministic world and the version is a multiplayer compatibility boundary.

## 7. Fluids, weather and environment

| Feature | Status | Notes |
|---|---|---|
| Static water blocks/rendering | PARTIAL | Transparent pass and swim sampling exist. |
| Fluid levels | TODO | None. |
| Flow/propagation | TODO | None. |
| Water/lava interaction | TODO | None. |
| Lava | TODO | None. |
| Rain/thunder visual FX | PARTIAL | Pooled line renderer; no biome/roof/splash parity. |
| Automatic weather cycle | TODO | Current weather changes by command/save state. |
| Lightning entity/damage | TODO | None. |
| Snow/ice weather effects | TODO | None. |
| Underwater fog/refraction | TODO | None. |

## 8. Multiplayer

| Feature | Status | Notes |
|---|---|---|
| WebSocket server transport | DONE | Real Node runtime. |
| Strict protocol/session sequencing | DONE | Multiple independent authority domains. |
| Authoritative movement/collision | DONE | 20 Hz server simulation. |
| Remote player replication/rendering | DONE | Public player IDs and interpolation. |
| Authoritative world edits | DONE | Bootstrap + live revisions. |
| Authoritative mining | DONE | Survival timing/progress/crack feedback; shared harvest rules cover iron ore and ordinary glass breaking. |
| Authoritative placement | DONE | Creative + Survival ordinary block placement. |
| Authoritative ground items | DONE | Drop/pickup lifecycle. |
| Authoritative Inventory | DONE | Full slots + cursor transactions. |
| Authoritative Equipment | DONE | Dual-revision Inventory/Equipment transactions. |
| Authoritative 2×2 crafting | DONE | Server-owned recipe state. |
| Authoritative workbench | DONE | Server-owned transient 3×3 container. |
| Authoritative furnace container | PARTIAL | #116 provides strict world-cell snapshot/close/transaction wire, dual revision guards, 20 Hz server processing, shared viewers, authoritative Inventory cursor transactions, forced invalidation and browser Furnace UI. #117 reuses the same shared Furnace state core rather than forking multiplayer rules. Durable server storage, server-owned player XP and complete vanilla Furnace state remain. |
| Authoritative chat | DONE | Session-derived sender + rate limit. |
| Authoritative command channel | DONE | Development/admin permission gate. |
| Authoritative PvP melee | DONE | HP, mitigation, knockback, death/drop/respawn. |
| Authoritative PvE/mobs/projectiles/explosions | TODO | Next major multiplayer authority milestone. |
| Authoritative XP/levels | TODO | Singleplayer XP including Furnace extraction exists, but multiplayer server does not yet own XP/level state. Furnace stored XP still has no production multiplayer player-XP sink. |
| Persistent server world saves | TODO | Sparse edits and Furnace state are authoritative but not durable server storage. |
| Persistent/shared containers | PARTIAL | Furnace is world-cell keyed, survives viewer close, ticks on the server and replicates to concurrent viewers. State is still process-memory only; durable server save/restore is not wired and chests remain absent. |
| Rooms/world list | TODO | Current server is a direct world endpoint. |
| Accounts/authentication | TODO | Sessions are transport identity only. |
| OP/whitelist/ban/mute | TODO | Current command enable flag is not operator auth. |
| Reconnect/resume | TODO | No durable player/session resume contract. |
| Client prediction/reconciliation | TODO | Current local player follows authoritative interpolation. |
| Skins/nameplates | TODO | Remote visual identity remains simple. |
| Realms-like product layer | TODO | Hosting/list/subscription/product semantics absent. |

## 9. Redstone and block updates

| Feature | Status | Notes |
|---|---|---|
| Mutable block state foundation | FOUNDATION | Multiple logical state IDs and authoritative world edits exist. |
| Neighbor update engine | TODO | Required for redstone and many blocks. |
| Scheduled block ticks | TODO | Required for repeaters, fluids, crops, etc. |
| Redstone power graph | TODO | None. |
| Redstone dust | TODO | None. |
| Torch/block power | TODO | None. |
| Lever/button/plate | TODO | None. |
| Repeater/comparator | TODO | None. |
| Pistons | TODO | None. |
| Observer | TODO | None. |
| Hopper/dropper/dispenser | TODO | Needs inventory/block entities. |

## 10. Containers, processing and farming

| Feature | Status | Notes |
|---|---|---|
| Workbench | DONE | Singleplayer + authoritative multiplayer transient container. |
| Chest | TODO | Persistent block entity and shared viewer concurrency needed. |
| Furnace | PARTIAL | Gameplay block/model/item, recipe, shared 3-slot state, fuel/cook timers, stored XP and stable transaction revisions exist. #116 binds authoritative multiplayer server/shared-viewer/WebSocket/UI; #117 binds real singleplayer right-click/UI, Inventory transactions, 20 Hz processing, IndexedDB world save/restore, break drain/drop and output XP to the same core. Durable server save, multiplayer XP, dynamic facing/lit state, loaded-chunk block-entity scheduling and broad vanilla recipe/fuel coverage remain. |
| Hopper | TODO | Redstone/inventory automation prerequisite. |
| Crop growth | TODO | Scheduled ticks/world rules needed. |
| Farmland/hydration | TODO | None. |
| Animal breeding | TODO | None. |
| Fishing | TODO | None. |
| Beekeeping | TODO | None. |

## 11. Dimensions and endgame

| Feature | Status | Notes |
|---|---|---|
| Overworld | PARTIAL | Core simplified world only. |
| Nether portal | TODO | None. |
| Nether dimension/worldgen | TODO | None. |
| Nether survival/content | TODO | None. |
| End portal/stronghold link | TODO | None. |
| End dimension/worldgen | TODO | None. |
| Ender Dragon | TODO | None. |
| Wither | TODO | None. |
| End credits/progression completion | TODO | None. |

## 12. Assets, audio and presentation

| Feature | Status | Notes |
|---|---|---|
| Deterministic imported block atlas subset | DONE | Runtime hashes/provenance tracked. |
| Imported implemented item textures | DONE | Current subset includes source-backed stone pickaxe, raw iron, iron ingot and direct glass block-item texture. |
| Imported furnace source closure | DONE | Canonical directory-backed Java 1.20.1 furnace blockstate/models/textures and GUI texture are used; no placeholder art is substituted. |
| Imported 8 current mob texture sheets | DONE | Texture-backed cuboid models. |
| Imported red-bed entity texture | DONE | Used by world bed renderer. |
| Full block/model resource interpretation | PARTIAL | Source-backed closure/model atlas feed live crafting-table, iron-ore, glass and furnace Worker/VoxelWorld rendering; broad registry/state coverage remains missing. |
| Full item model interpretation | TODO | Current items mostly bind direct textures or project-side block preview renderers. |
| Entity geometry exact model-layer parity | PARTIAL | Current models are compatible reconstructions. |
| Player skin pipeline | TODO | None. |
| Sound registry/audio engine | BLOCKED | Current supplied source tree has no sounds or sounds.json. |
| Music | BLOCKED | Same source gap. |
| Spatial SFX | BLOCKED | Audio source + engine required. |
| Animated textures | TODO | None. |
| Biome color maps/tinting | TODO | None. |

## 13. Menus, settings and product shell

| Feature | Status | Notes |
|---|---|---|
| Main menu | DONE | Minecraft-style project shell. |
| Singleplayer world creation/list/persistence | PARTIAL | Functional IndexedDB world records now include Furnace world-cell state/timers/XP in save version 7; Java world import/options and generic block-entity persistence are still incomplete. |
| Multiplayer direct connection screen | PARTIAL | Real server connection; no server list ecosystem. |
| Pause/settings shell | PARTIAL | Core pause/control flows only. |
| Controls customization | TODO | No full keybind/touch layout editor. |
| Video/settings breadth | TODO | No Java-style graphics/performance option suite. |
| Language system | TODO | UI text is not a full resource-driven localization system. |
| Accessibility settings | TODO | Not full Minecraft parity. |
| Resource pack UI | TODO | None. |
| Data pack support | TODO | None. |
| Realms | TODO | Not implemented beyond the broader multiplayer foundation. |

## 14. Quality, compatibility and performance

| Feature | Status | Notes |
|---|---|---|
| Node syntax/logic regression gate | DONE | #116 final exact head passed 160 automatically discovered logic/server/Worker scripts. #117 pre-E2E integration head `3ef6a33823b96313abab3000e5abb68ef63db019` passed **161 scripts**, adding persistent singleplayer Furnace coverage while retaining all authoritative Furnace checks; final exact-head CI is still required before merge. |
| Chromium E2E | DONE | #116 final exact head passed both 21-test Chromium shards without retries. #117 adds a real singleplayer Pointer-Lock/right-click Furnace test covering mid-smelt IndexedDB save/re-enter, resumed processing, 2× iron-ingot extraction and XP; that new test must pass on the final exact head before merge. |
| Asset source reproducibility audit | DONE | Selective Minecraft source/runtime outputs are reproducible; furnace/iron-ingot assets are directory-backed from the tracked Java 1.20.1 source tree and validated rather than replaced with placeholders. |
| GitHub Pages deployment | DONE | Current public Web delivery path. |
| Failure artifacts | DONE | Browser failures preserve screenshots/traces/context. |
| Real Android device coverage | TODO | Automated Chromium emulation exists, real device matrix does not. |
| iOS Safari coverage | TODO | Not yet established. |
| Load/performance budgets | FOUNDATION | Runtime is designed for bounded objects/workers; formal budgets/benchmarks need expansion. |

## Immediate roadmap after #117

1. Continue the iron progression with **iron pickaxe/tools/armor**, including source-backed assets, recipes, durability, mining-tier/combat/armor behaviour.
2. Add **coal ore + coal item + coal fuel** and broaden the Furnace recipe/fuel registry without forking singleplayer/multiplayer smelting rules.
3. Add a **server-owned XP/level domain** before claiming multiplayer Furnace XP parity or server-authoritative PvE XP.
4. Add **durable server world/container persistence** and a generic block-entity/loaded-chunk tick lifecycle, then chest/barrel shared containers.
5. Continue interpreted-model gameplay validation with slabs/stairs/doors/fences/torches while keeping visual models separate from collision/state/update rules.
6. Resume the larger missing domains: biome/caves/structures worldgen, server-authoritative PvE/projectiles/explosions, hunger/food/farming/breeding, redstone, Nether/End and audio when a valid sound source is available.
