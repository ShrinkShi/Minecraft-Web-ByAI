# Minecraft Java 1.20.1 Parity Matrix

Status legend:

- `DONE` — implemented on `main` with validation evidence.
- `PARTIAL` — meaningful implementation exists, but Minecraft 1.20.1 parity is incomplete.
- `FOUNDATION` — architecture exists but the user-facing Minecraft feature/content is largely not present.
- `TODO` — not meaningfully implemented yet.
- `BLOCKED` — requires an external asset/source or prerequisite that is not currently present.

This matrix is the roadmap authority. Percentages are planning estimates, not automated coverage metrics.

## Overall baseline

| Domain | Planning completion | Status | Main gaps |
|---|---:|---|---|
| Browser engine / chunk / rendering foundation | 85% | PARTIAL | lighting parity, generic non-cube gameplay breadth, advanced particles, broader performance work |
| Desktop/mobile controls and core UI | 75% | PARTIAL | full settings/accessibility, polished mobile customization, broader browser/device matrix |
| Singleplayer survival core | 55% | PARTIAL | hunger/food breadth, smelting, farming, full progression, effects/enchanting/brewing |
| Blocks/items/recipes breadth | 15% | PARTIAL | most 1.20.1 registry content is not exposed |
| World generation / biomes / caves / structures | 18% | PARTIAL | true biome pipeline, caves, ores, features, structures, Nether/End |
| Entities / PvE | 35% | PARTIAL | species breadth, pathfinding/spawn parity, breeding/taming/riding, server authority |
| Multiplayer server foundation | 65% | PARTIAL | persistence, rooms/auth/operators, server PvE, shared persistent containers |
| Full multiplayer Minecraft parity | 48% | PARTIAL | same as above plus prediction/reconciliation and wider gameplay coverage |
| Original resource integration | 35% | PARTIAL | much wider registry use, item models, tint/animation, audio |
| Audio/music | 0% | BLOCKED | supplied archive contains no sound object set or sounds.json |
| Redstone | 3% | FOUNDATION | block state/update scheduler/power graph/components |
| Farming/food/smelting | 8% | FOUNDATION | furnaces, food effects, crops, breeding, recipes |
| Villagers/trading | 0% | TODO | entire system |
| Enchanting/brewing/status effects | 0% | TODO | entire system |
| Nether/End/portal progression | 0% | TODO | dimensions, portals, dimension worldgen, bosses |
| Advancements/statistics | 0% | TODO | entire system |
| Engineering/CI | 90% | PARTIAL | broaden browser/device/performance/load coverage |

**Overall strict Minecraft Java 1.20.1 parity planning estimate: ~35%.**

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
| General blockstate/model JSON interpreter | PARTIAL | Source-backed JSON now preloads/compiles into a real Worker/VoxelWorld opt-in path; only a tiny gameplay registry currently consumes it. |
| General multipart/variant model support | PARTIAL | Weighted variants/multipart compile and execute in the runtime; generalized gameplay-state/neighbor-state mapping is not wired yet. |
| Animated block/item textures | TODO | Water animation metadata retained but playback absent. |
| Biome tint/color resolver | TODO | Current compatibility uses baked/default tint where required. |
| Vanilla lighting model | TODO | Current lighting/day-night is simplified. |
| Particle system parity | PARTIAL | Weather/explosion effects exist; general particle registry does not. |
| Resource-pack abstraction | FOUNDATION | Logical asset manifest exists; generic pack loading does not. |
| PWA/offline install | TODO | Not part of current runtime contract. |

## 2. World and block registry

### Implemented gameplay block families

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`.

The bed uses multiple internal block-state IDs, but counts as one gameplay family.

| Feature family | Status | Notes |
|---|---|---|
| Basic full cubes | PARTIAL | Small hand-authored registry only. |
| Directional full cubes | PARTIAL | Crafting table gameplay semantics exist; its visual is the first live source-backed interpreted-model runtime proof. |
| Beds | PARTIAL | Two-block state + rendering + sleep/respawn; full vanilla support/update/bounce/dimension rules incomplete. |
| Ores | TODO | Iron ore source resources are tracked but gameplay registry/worldgen is not wired. |
| Stone variants | TODO | Granite/diorite/andesite/deepslate/tuff/etc. |
| Wood families | TODO | Only oak foundation is exposed. |
| Logs/stripped wood | TODO | Registry/model/state expansion needed. |
| Leaves/saplings | PARTIAL | Oak leaves exist; saplings/growth missing. |
| Flowers/grass/plants | TODO | Requires crossed/non-cube model support. |
| Glass/panes | TODO | Requires transparent model/state support. |
| Slabs/stairs | TODO | Requires model/state collision shapes. |
| Fences/walls/gates | TODO | Requires neighbor-driven multipart state. |
| Doors/trapdoors | TODO | Requires paired/multipart state and collision shapes. |
| Buttons/levers/pressure plates | TODO | Redstone prerequisite. |
| Ladders/vines | TODO | Non-full collision/placement. |
| Torches/lanterns | TODO | Model + lighting integration. |
| Chests/barrels | TODO | Persistent block entities/containers. |
| Furnaces/smokers/blast furnaces | TODO | Persistent processing/container system. |
| Signs/hanging signs | TODO | Block entities/text UI. |
| Bookshelves/chiseled bookshelf | TODO | State/container interactions. |
| Shulker boxes | TODO | End/content prerequisites. |
| Redstone components | TODO | See Redstone section. |
| Decorative 1.20 blocks | TODO | Broad registry/model import needed. |

## 3. Items and crafting

Current runtime item registry: 28 IDs at this baseline.

Current recipes: five.

| Feature | Status | Notes |
|---|---|---|
| 36-slot inventory/hotbar | DONE | Singleplayer and authoritative multiplayer paths exist. |
| Cursor/stack transactions | DONE | Left/right/Shift semantics implemented. |
| 2×2 crafting | DONE | Small recipe set only. |
| 3×3 workbench crafting | DONE | Small recipe set only; multiplayer authority exists. |
| Wooden pickaxe | DONE | Mining speed, harvest rules and durability supported. |
| Stone/iron/gold/diamond/netherite tools | FOUNDATION | Tier rules/assets partly prepared; gameplay content not wired. |
| Swords/axes/shovels/hoes | TODO | Full behaviour/recipes/durability missing. |
| Armor materials beyond leather | TODO | Equipment architecture exists. |
| Shields | TODO | Blocking/state/network rules required. |
| Bow/crossbow player mechanics | TODO | Skeleton projectile foundation exists only. |
| Buckets | TODO | Fluid/state interaction required. |
| Food items and eating | TODO | Hunger/saturation system needs completion. |
| Furnace recipes | TODO | Furnace subsystem absent. |
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
| Experience/levels | PARTIAL | XP orbs + level formulas exist; enchanting/repair/etc. absent. |
| Death drops/respawn | DONE | Recoverable singleplayer loop and authoritative PvP death drops exist. |
| Custom spawnpoint | DONE | Persistent singleplayer path. |
| Bed sleep/respawn | PARTIAL | Night skip/safety implemented; occupancy/animation/full rules incomplete. |
| Tool durability | PARTIAL | Wooden pickaxe item-instance durability is implemented; broad item durability is not. |
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
| Deterministic seed generation | DONE | Browser/server share generator. |
| Heightmap terrain | DONE | Simplified fBm baseline. |
| Sea/water fill | DONE | Simplified fixed sea parameter. |
| Oak tree feature | DONE | Simple generation rule. |
| Prompt-adjusted terrain parameters | DONE | Keyword-driven amplitude/sea/forest/sand tuning. |
| Biome registry/source selection | TODO | Replace prompt-only surface classification with a real pipeline. |
| Climate/noise biome placement | TODO | None. |
| Cave generation | TODO | None. |
| Aquifers | TODO | None. |
| Ore veins/distribution | TODO | None. |
| Surface rule breadth | TODO | Only basic stone/dirt/grass/sand. |
| Vegetation/feature placement framework | FOUNDATION | Tree path exists; needs generic feature stages. |
| Structures | TODO | Villages, mineshafts, dungeons, strongholds, monuments, etc. absent. |
| Expanded Java-like vertical range | TODO | Current world height is 64. |
| Nether worldgen | TODO | None. |
| End worldgen | TODO | None. |

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
| Authoritative mining | DONE | Survival timing/progress/crack feedback. |
| Authoritative placement | DONE | Creative + Survival ordinary block placement. |
| Authoritative ground items | DONE | Drop/pickup lifecycle. |
| Authoritative Inventory | DONE | Full slots + cursor transactions. |
| Authoritative Equipment | DONE | Dual-revision Inventory/Equipment transactions. |
| Authoritative 2×2 crafting | DONE | Server-owned recipe state. |
| Authoritative workbench | DONE | Server-owned transient 3×3 container. |
| Authoritative chat | DONE | Session-derived sender + rate limit. |
| Authoritative command channel | DONE | Development/admin permission gate. |
| Authoritative PvP melee | DONE | HP, mitigation, knockback, death/drop/respawn. |
| Authoritative PvE/mobs/projectiles/explosions | TODO | Next major multiplayer authority milestone. |
| Persistent server world saves | TODO | Sparse edits are authoritative but not durable server storage. |
| Persistent/shared containers | TODO | Chests/furnaces need concurrency + storage. |
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
| Furnace | TODO | Processing tick + fuel + recipes + persistent inventory needed. |
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
| Imported implemented item textures | DONE | Current item subset. |
| Imported 8 current mob texture sheets | DONE | Texture-backed cuboid models. |
| Imported red-bed entity texture | DONE | Used by world bed renderer. |
| Full block/model resource interpretation | PARTIAL | Source-backed closure and model atlas now feed a live opt-in Worker/VoxelWorld runtime; broad registry/state coverage remains missing. |
| Full item model interpretation | TODO | Current items mostly bind direct textures. |
| Entity geometry exact model-layer parity | PARTIAL | Current models are compatible reconstructions. |
| Player skin pipeline | TODO | None. |
| Sound registry/audio engine | BLOCKED | Current supplied ZIP has no sounds or sounds.json. |
| Music | BLOCKED | Same source gap. |
| Spatial SFX | BLOCKED | Audio source + engine required. |
| Animated textures | TODO | None. |
| Biome color maps/tinting | TODO | None. |

## 13. Menus, settings and product shell

| Feature | Status | Notes |
|---|---|---|
| Main menu | DONE | Minecraft-style project shell. |
| Singleplayer world creation/list/persistence | PARTIAL | Functional, not full Java options/import parity. |
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
| Node syntax/logic regression gate | DONE | PR #108 delivery candidate reaches 146 automatically discovered logic/server/Worker regressions. |
| Chromium E2E | DONE | Sharded browser smoke; PR #108 candidate covers 35 tests including real interpreted-model Worker/VoxelWorld integration. |
| Asset source reproducibility audit | DONE | Used for imported Minecraft source subset. |
| GitHub Pages deployment | DONE | Current public Web delivery path. |
| Failure artifacts | DONE | Browser failures preserve diagnostics. |
| Real Android device coverage | TODO | Automated Chromium emulation exists, real device matrix does not. |
| iOS Safari coverage | TODO | Not yet established. |
| Load/performance budgets | FOUNDATION | Runtime is designed for bounded objects/workers; formal budgets/benchmarks need expansion. |
