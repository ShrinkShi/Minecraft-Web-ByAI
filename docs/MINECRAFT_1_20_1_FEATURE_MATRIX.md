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
| Browser engine / chunk / rendering foundation | 85% | PARTIAL | lighting parity, generic non-cube gameplay breadth, broader particle registry, performance/load work |
| Desktop/mobile controls and core UI | 76% | PARTIAL | full settings/accessibility, polished mobile customization, broader browser/device matrix |
| Singleplayer survival core | 61% | PARTIAL | hunger/food breadth, farming, iron hoe/armor and tool secondary actions, complete Java combat strength/critical/sweep rules, effects/enchanting/brewing, generic block-entity scheduling |
| Blocks/items/recipes breadth | 19% | PARTIAL | most 1.20.1 registry content is not exposed |
| World generation / biomes / caves / structures | 18% | PARTIAL | true biome pipeline, caves, broad ore distribution, features, structures, Nether/End |
| Entities / PvE | 39% | PARTIAL | species breadth, pathfinding/spawn parity, breeding/taming/riding, full combat rules, server authority |
| Multiplayer server foundation | 68% | PARTIAL | durable persistence, rooms/auth/operators, server PvE, authoritative XP and broader shared containers |
| Full multiplayer Minecraft parity | 50% | PARTIAL | same as above plus prediction/reconciliation and wider gameplay coverage |
| Original resource integration | 39% | PARTIAL | much wider registry use, item-model interpretation, tint/animation, original audio source |
| Audio/SFX/music | 2% | PARTIAL | procedural event SFX fallback exists, but supplied source tree has no Minecraft sound object set or `sounds.json`; original SFX/music parity remains blocked |
| Redstone | 3% | FOUNDATION | block state/update scheduler/power graph/components |
| Farming/food/smelting | 20% | PARTIAL | Furnace processing has singleplayer persistence plus authoritative multiplayer runtime; food effects, crops, breeding, broad recipes/fuels and automation remain |
| Villagers/trading | 0% | TODO | entire system |
| Enchanting/brewing/status effects | 0% | TODO | entire system |
| Nether/End/portal progression | 0% | TODO | dimensions, portals, dimension worldgen, bosses |
| Advancements/statistics | 0% | TODO | entire system |
| Engineering/CI | 90% | PARTIAL | broaden browser/device/performance/load coverage and eliminate known timing-sensitive presentation cases |

**Overall strict Minecraft Java 1.20.1 parity planning estimate remains ~35%.** PR #121 materially improves first-person combat presentation, wood/stone sword progression, hostile-mob feedback and explosion closure, but registries, dimensions, redstone, farming, enchanting, server PvE and complete Java combat semantics remain large gaps.

## 1. Runtime, rendering and platform

| Feature | Status | Notes / next work |
|---|---|---|
| Shared desktop/mobile Web runtime | DONE | Device adapters converge on one gameplay intent model. |
| Pointer Lock desktop controls | DONE | Production path covered. |
| Landscape mobile touch controls | DONE | Android Chromium automation exists; real-device matrix still needed. |
| First/third-person camera modes | DONE | F5 cycle implemented. |
| First-person held-item viewmodel | PARTIAL | PR #121 uses a real Three.js source-backed Steve right arm + sleeve, 3D held-item/block presentation and attack/use animation. Exact Java item transforms, equip transitions, attack-strength animation and broader hand/item model parity remain incomplete. |
| Chunk streaming | DONE | Load/unload around player with explicit geometry disposal. |
| Terrain Worker | DONE | Deterministic shared generator. |
| Mesh Worker | DONE | Legacy opaque/water + bed descriptors + opt-in interpreted model batches. |
| Chunk merged mesh rendering | DONE | Legacy and interpreted paths remain chunk-batched; no one-Mesh-per-block runtime. |
| Local/pinned Three.js runtime | DONE | Production world runtime uses generated same-origin `vendor/three.module.js`; browser-only presentation modules remain isolated from Node rule checks. |
| Water transparent pass | PARTIAL | No vanilla fluid levels/flow/animation/refraction. |
| Bed special model renderer | DONE | Red bed world visual uses imported entity texture; logical collision still simplified. |
| General blockstate/model JSON interpreter | PARTIAL | Source-backed JSON preloads/compiles into the real Worker/VoxelWorld opt-in path; crafting table, iron ore, glass and furnace are live gameplay roots, but broad registry coverage is still missing. |
| General multipart/variant model support | PARTIAL | Weighted variants/multipart compile and execute in the runtime; generalized gameplay-state/neighbor-state mapping is not wired yet. |
| Interpreted translucent block layer | PARTIAL | Glass proves real translucent model-atlas rendering and same-type internal-face culling; broader transparent families, sorting edge cases and panes remain incomplete. |
| Animated block/item textures | TODO | Water animation metadata retained but playback absent. |
| Biome tint/color resolver | TODO | Current compatibility uses baked/default tint where required. |
| Vanilla lighting model | TODO | Current lighting/day-night and daylight exposure are simplified. |
| Particle system parity | PARTIAL | Weather plus PR #121 explosion flash/spark/ember/smoke effects exist; a general vanilla particle registry/parameter system does not. |
| Resource-pack abstraction | FOUNDATION | Logical asset manifest exists; generic pack loading does not. |
| PWA/offline install | TODO | Not part of current runtime contract. |

## 2. World and block registry

### Implemented gameplay block families

`grass_block`, `dirt`, `stone`, `sand`, `oak_planks`, `oak_log`, `oak_leaves`, `water`, `crafting_table`, `cobblestone`, `red_bed`, `iron_ore`, `glass`, `furnace`.

The bed uses multiple internal block-state IDs, but counts as one gameplay family.

| Feature family | Status | Notes |
|---|---|---|
| Basic full cubes | PARTIAL | Small gameplay registry only. Block metadata separates `effectiveTool` mining speed from `requires` / `minToolTier` harvest eligibility. |
| Directional full cubes | PARTIAL | Crafting table and furnace render through source-backed interpreted models, but generalized per-cell directional state is not available. |
| Beds | PARTIAL | Two-block state + rendering + sleep/respawn; full vanilla support/update/bounce/dimension rules incomplete. PR #121 also keeps paired-bed explosion cleanup single-drop-safe. |
| Ores | PARTIAL | Iron ore has gameplay metadata, source-backed model, shared worldgen and stone-tier pickaxe harvest. Other ores and exact vanilla distribution are absent. |
| Stone variants | TODO | Granite/diorite/andesite/deepslate/tuff/etc. |
| Wood families | PARTIAL | Only oak foundation is exposed; planks/log/workbench are axe-effective while remaining hand-harvestable. Stripping and broader wood families are absent. |
| Logs/stripped wood | TODO | Log stripping secondary action and broader registry/model/state expansion needed. |
| Leaves/saplings | PARTIAL | Oak leaves exist; saplings/growth and full hoe-effective classification are missing. |
| Flowers/grass/plants | TODO | Requires crossed/non-cube model support. |
| Glass/panes | PARTIAL | Source-backed normal glass is a solid translucent gameplay block with same-glass internal-face culling and ordinary no-drop breaking; stained glass and panes are absent. |
| Slabs/stairs | TODO | Requires model/state collision shapes. |
| Fences/walls/gates | TODO | Requires neighbor-driven multipart state. |
| Doors/trapdoors | TODO | Requires paired/multipart state and collision shapes. |
| Buttons/levers/pressure plates | TODO | Redstone prerequisite. |
| Ladders/vines | TODO | Non-full collision/placement. |
| Torches/lanterns | TODO | Model + lighting integration. |
| Chests/barrels | TODO | Persistent block entity and shared viewer concurrency needed. |
| Furnaces/smokers/blast furnaces | PARTIAL | Furnace block `21`, original Java model/assets, harvest/effectiveness metadata, recipe and iron-ingot content exist. #116 provides authoritative multiplayer runtime; #117 adds persistent singleplayer runtime. Durable multiplayer storage, dynamic facing/lit state, smokers and blast furnaces remain. |
| Signs/hanging signs | TODO | Block entities/text UI. |
| Bookshelves/chiseled bookshelf | TODO | State/container interactions. |
| Shulker boxes | TODO | End/content prerequisites. |
| Redstone components | TODO | See Redstone section. |
| Decorative 1.20 blocks | TODO | Broad registry/model import needed. |

## 3. Items and crafting

Current runtime item registry: **39 IDs** at this delivery baseline.

Current recipes: **thirteen**.

| Feature | Status | Notes |
|---|---|---|
| 36-slot inventory/hotbar | DONE | Singleplayer and authoritative multiplayer paths exist. |
| Cursor/stack transactions | DONE | Left/right/Shift semantics implemented. |
| 2×2 crafting | DONE | Small recipe set only. |
| 3×3 workbench crafting | DONE | Small recipe set only; multiplayer authority exists. |
| Wooden pickaxe | DONE | Mining speed, harvest rules and durability supported. |
| Stone pickaxe | DONE | Source-backed item, 3×3 cobblestone/stick recipe, stone-tier speed/harvest and 131 durability are wired. |
| Iron pickaxe | DONE | Source-backed Java 1.20.1 item texture, 3×3 iron-ingot/stick recipe, iron-tier speed 6, 250 durability and shared mining/drop integration are wired. |
| Wooden sword | PARTIAL | PR #121 binds tracked Java 1.20.1 `wooden_sword.png`, 2-planks + stick 3×3 recipe, 4 damage, 59 durability, attack speed 1.6 and successful-hit wear 1. Continuous Java attack strength, sweep/critical/shield semantics remain absent. |
| Stone sword | PARTIAL | PR #121 binds tracked Java 1.20.1 `stone_sword.png`, 2-cobblestone + stick 3×3 recipe, 5 damage, 131 durability, attack speed 1.6 and successful-hit wear 1. Continuous Java attack strength, sweep/critical/shield semantics remain absent. |
| Iron axe | PARTIAL | Source-backed Java 1.20.1 texture, mirrored 3×3 recipe, iron-tier speed 6, 250 durability, axe-effective mining and shared held-item melee profile are wired. Log stripping, shield-disable and full Java attack-strength parity are absent. |
| Iron shovel | PARTIAL | Source-backed Java 1.20.1 texture, 3×3 recipe, iron-tier speed 6, 250 durability, shovel-effective mining and shared held-item melee profile are wired. Dirt-path/campfire secondary actions and full Java attack-strength parity are absent. |
| Iron sword | PARTIAL | Source-backed Java 1.20.1 texture, 2-iron + 1-stick workbench recipe, 6 damage, 250 durability, attack-speed 1.6 profile and successful-hit-only wear are wired in singleplayer and authoritative PvP. Sweep, critical, shield interaction and continuous Java attack strength remain absent. |
| Iron hoe | TODO | Gameplay item, recipe, tilling and effective-block behaviour are not wired yet. |
| Other gold/diamond/netherite tools | FOUNDATION | Shared tier/rule foundations exist, but gameplay items/recipes/behaviours are not wired. |
| Raw iron | PARTIAL | Correctly harvested iron ore produces source-backed raw iron, processed through shared Furnace rules in persistent singleplayer and authoritative multiplayer paths. |
| Iron ingot | PARTIAL | Source-backed registered Furnace output feeds real iron pickaxe, axe, shovel and sword recipes; iron hoe/armor and broader recipes remain absent. |
| Furnace block item | PARTIAL | Source-backed three-face Inventory/hotbar preview and block placement content exist; dynamic facing/lit parity is absent. |
| Glass block item | DONE | Source-identical Java 1.20.1 glass texture is deterministically generated and used by Inventory/hotbar. |
| Swords/axes/shovels/hoes breadth | PARTIAL | Wooden, stone and iron sword cores plus iron axe/shovel exist; iron hoe, secondary tool actions, broader material tiers and full combat semantics remain incomplete. |
| Armor materials beyond leather | TODO | Equipment architecture exists. |
| Shields | TODO | Blocking/state/network rules required. |
| Bow/crossbow player mechanics | TODO | PR #121 uses canonical bow art for skeleton equipment only; no player bow item state/charge/ammo gameplay. |
| Buckets | TODO | Fluid/state interaction required. |
| Food items and eating | TODO | Hunger/saturation system needs completion. |
| Furnace crafting recipe | PARTIAL | Vanilla-shaped eight-cobblestone furnace recipe is registered; recipe book/discovery parity is absent. |
| Furnace smelting recipes | PARTIAL | Deterministic raw iron → iron ingot, fuel times, 200-tick cooking, cooldown and stored-XP bookkeeping exist in the shared core. Broad vanilla recipe/fuel coverage remains. |
| Smithing | TODO | Netherite/template system absent. |
| Stonecutter/loom/grindstone/etc. | TODO | Workstation/container systems absent. |
| Recipe book | TODO | No full recipe discovery/UI. |

## 4. Player survival and progression

| Feature | Status | Notes |
|---|---|---|
| HP/damage/death | DONE | Singleplayer and multiplayer PvP have real flows. |
| Knockback/hurt cooldown | DONE | Shared foundations exist. |
| Held-item melee profiles | PARTIAL | Shared metadata drives damage, item-specific hard minimum attack interval and successful-hit durability cost for wooden/stone/iron swords plus existing tool profiles. This is a full-charge approximation, not Java 1.20.1's continuous attack-strength/damage curve. |
| Hunger HUD | PARTIAL | Presentation/foundation exists; full food/saturation/exhaustion parity does not. |
| Oxygen/drowning | PARTIAL | Functional simplified implementation. |
| Swimming/buoyancy | PARTIAL | No sprint-swimming/crawl/pitch-directed vanilla parity. |
| Fall damage | PARTIAL | Player collision/fall handling exists but full vanilla edge cases are not a parity claim. |
| Experience/levels | PARTIAL | Singleplayer XP orbs + level formulas exist and #117 feeds extracted Furnace stored XP into that system. Multiplayer still lacks a server-owned XP/level domain. |
| Death drops/respawn | DONE | Recoverable singleplayer loop and authoritative PvP death drops exist. |
| Custom spawnpoint | DONE | Persistent singleplayer path. |
| Bed sleep/respawn | PARTIAL | Night skip/safety implemented; occupancy/animation/full rules incomplete. |
| Tool/weapon durability | PARTIAL | Wooden/stone/iron pickaxes, wooden/stone/iron swords, iron axe and iron shovel use item-instance durability; mining wear and successful-hit melee wear are wired. Tool secondary actions and armor durability remain incomplete. |
| Tool effectiveness vs harvest eligibility | DONE | Shared mining rules model fast-tool classification independently from drop eligibility. |
| Stone → iron progression | PARTIAL | Stone-tier iron harvest → raw iron → Furnace → iron ingot → iron pickaxe/axe/shovel/sword crafting works. Iron hoe/armor, coal and broader mining/combat progression are absent. |
| Armor durability | TODO | Equipment exists but armor wear does not. |
| Hunger/exhaustion/saturation | TODO | Major survival gap. |
| Eating/drinking | TODO | Major survival gap. |
| Fire/lava/burning | PARTIAL | PR #121 adds simplified zombie/skeleton daylight burning with clear-weather exposure and rain/thunder/water extinguish. Generic player/entity fire state, lava ignition, fire blocks, immunity, armor/enchantment interactions and Nether rules are absent. |
| Status effects | TODO | No potion/effect engine. |
| Enchantments | TODO | No enchantment engine/table/anvil. |
| Brewing | TODO | No brewing stand/potions. |

## 5. Mobs and PvE

| Mob/system | Status | Notes |
|---|---|---|
| Cow | PARTIAL | Spawn/wander/flee/combat loot + source-textured model + per-entity hurt flash/knockback presentation; breeding/milking/baby rules missing. |
| Sheep | PARTIAL | Loot + wool model layer + per-entity hurt flash; shearing/dye/breeding missing. |
| Pig | PARTIAL | Core passive behaviour + per-entity hurt flash; saddle/breeding missing. |
| Chicken | PARTIAL | Core passive behaviour + per-entity hurt flash; egg/breeding missing. |
| Zombie | PARTIAL | Chase/melee/loot, per-entity hurt flash and simplified clear-weather daylight burn with wet extinguish are wired. Full light/spawn/equipment/variant/fire parity is absent. |
| Skeleton | PARTIAL | Ranged AI, source-backed bow equipment, source-backed arrow projectile visual, hurt flash and simplified daylight burn/extinguish are wired. Player bow mechanics, broad equipment/spawn and full vanilla combat rules remain incomplete. |
| Creeper | PARTIAL | Fuse/explosion plus PR #121 growth/white-flash priming and expanded explosion particles; destroyed singleplayer blocks enter DropSystem. Full vanilla block/entity exposure, mob damage, status interaction and server authority remain incomplete. |
| Spider | PARTIAL | Melee + bounded climbing + per-entity hurt flash; full wall/path/spawn behaviour incomplete. |
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
| Rain/thunder visual FX | PARTIAL | Pooled line renderer; PR #121 also lets wet weather suppress the simplified hostile daylight burn. No biome/roof/splash parity. |
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
| Authoritative mining | DONE | Survival timing/progress/crack feedback uses the shared effectiveness/harvest split. |
| Authoritative placement | DONE | Creative + Survival ordinary block placement. |
| Authoritative ground items | DONE | Drop/pickup lifecycle. |
| Authoritative Inventory | DONE | Full slots + cursor transactions. Successful melee weapon wear advances and replicates Inventory revision. |
| Authoritative Equipment | DONE | Dual-revision Inventory/Equipment transactions. |
| Authoritative 2×2 crafting | DONE | Server-owned recipe state. |
| Authoritative workbench | DONE | Server-owned transient 3×3 container and shared recipe matcher include current tool/sword recipes. |
| Authoritative furnace container | PARTIAL | #116 provides strict world-cell snapshot/close/transaction wire, dual revision guards, 20 Hz processing, shared viewers and UI. #117 reuses the same shared Furnace state core in singleplayer. Durable server storage and server-owned XP remain. |
| Authoritative chat | DONE | Session-derived sender + rate limit. |
| Authoritative command channel | DONE | Development/admin permission gate. |
| Authoritative PvP melee | DONE | Server owns HP, mitigation, knockback, death/drop/respawn and consumes held-item damage/interval profiles; successful weapon wear replicates authoritatively. Full Java attack-strength/critical/sweep/shield semantics remain broader parity gaps. |
| Authoritative PvE/mobs/projectiles/explosions | TODO | PR #121 improves client/singleplayer presentation only; it does not move mob simulation authority to the server. |
| Authoritative XP/levels | TODO | Singleplayer XP including Furnace extraction exists, but multiplayer server does not own XP/level state. |
| Persistent server world saves | TODO | Sparse edits and Furnace state are authoritative but not durable server storage. |
| Persistent/shared containers | PARTIAL | Furnace is world-cell keyed and shared-viewer authoritative, but process-memory only; chests remain absent. |
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
| Furnace | PARTIAL | Gameplay block/model/item, recipe, shared 3-slot state, fuel/cook timers, stored XP and stable transaction revisions exist. #116 binds authoritative multiplayer; #117 binds persistent singleplayer to the same core. Durable server save, multiplayer XP, dynamic facing/lit state, loaded-chunk scheduling and broad recipes/fuels remain. |
| Hopper | TODO | Redstone/inventory automation prerequisite. |
| Crop growth | TODO | Scheduled ticks/world rules needed. |
| Farmland/hydration | TODO | Iron hoe/tilling is the next tool-behaviour prerequisite; hydration/crop scheduling remain absent. |
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
| Imported implemented item textures | DONE | Current subset includes source-backed stone pickaxe, raw iron, iron ingot, iron pickaxe/axe/shovel/sword, PR #121 wooden/stone swords and the canonical bow texture used by skeleton equipment. |
| Imported furnace source closure | DONE | Canonical directory-backed Java 1.20.1 furnace blockstate/models/textures and GUI texture are used. |
| Imported 8 current mob texture sheets | DONE | Source-textured cuboid models. |
| Imported red-bed entity texture | DONE | Used by world bed renderer. |
| Full block/model resource interpretation | PARTIAL | Source-backed closure/model atlas feed live crafting-table, iron-ore, glass and furnace Worker/VoxelWorld rendering; broad registry/state coverage remains missing. |
| Full item model interpretation | TODO | Current items mostly bind direct textures or project-side preview/viewmodel renderers. |
| Entity geometry exact model-layer parity | PARTIAL | Current models are compatible reconstructions. PR #121 explicitly keeps source-backed `mob-box:*`/equipment meshes separate from procedural fire/effect overlays in provenance tests. |
| Player skin pipeline | PARTIAL | Source-backed wide Steve already feeds player presentation and PR #121 first-person arm/sleeve. Custom skins, profile identity, slim-model selection and network skin distribution are absent. |
| Sound registry/audio engine | PARTIAL | PR #121 adds an interim procedural WebAudio event layer for swing/use/shoot/burn/prime/explosion. Supplied source tree contains no Minecraft sound objects or `sounds.json`, so source-backed original sound-event parity remains blocked. |
| Music | BLOCKED | Supplied source tree has no music/sound object set. |
| Spatial SFX | BLOCKED | Current procedural fallback is non-spatial and is not Minecraft source audio; original source inputs remain absent. |
| Animated textures | TODO | None. |
| Biome color maps/tinting | TODO | None. |

## 13. Menus, settings and product shell

| Feature | Status | Notes |
|---|---|---|
| Main menu | DONE | Minecraft-style project shell. |
| Singleplayer world creation/list/persistence | PARTIAL | Functional IndexedDB world records include Furnace world-cell state/timers/XP in save version 7; Java world import/options and generic block-entity persistence are incomplete. |
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
| Node syntax/logic regression gate | DONE | PR #121 pre-doc implementation head `3e1b2f8…` passed JavaScript syntax plus **168** automatically discovered logic/server/Worker scripts. Node-safe immersive/first-person rule modules prevent browser-only Three.js imports from leaking into logic checks. Final merge still requires the same complete suite on the post-doc exact head. |
| Chromium E2E | DONE | PR #121 pre-doc head `3e1b2f8…` passed shard 1 **23/23** with the real 3D first-person viewmodel and source-model/effect-mesh regression, and shard 2 **23/23** covering authoritative multiplayer, persistent Furnace, durability and long smoke/world-selection paths. No retries were required. Final merge requires both shards again on the post-doc exact head. |
| Asset source reproducibility audit | DONE | Selective source/runtime outputs are reproducible. PR #121 explicitly audits direct canonical wooden-sword, stone-sword and bow bindings rather than fabricating substitute runtime art. |
| GitHub Pages deployment | DONE | Current public Web delivery path. |
| Failure artifacts | DONE | Browser failures preserve screenshots/traces/context. |
| Real Android device coverage | TODO | Automated Chromium emulation exists, real device matrix does not. |
| iOS Safari coverage | TODO | Not yet established. |
| Load/performance budgets | FOUNDATION | Runtime is designed for bounded objects/workers; formal budgets/benchmarks need expansion. |

## Immediate roadmap after #121

1. Deliver **iron hoe and secondary tool actions**: source-backed iron hoe/recipe/durability, farmland tilling, axe stripping, shovel path creation, world mutation/durability and multiplayer authority; then broaden effective block families such as leaves.
2. Add **iron armor** on the existing Equipment foundation, while keeping armor durability as a separate parity gap until wear is implemented.
3. Deliver **coal ore + coal item + coal fuel** as a separate terrain/world-compatibility change: deterministic generation must bump or explicitly version the terrain contract instead of silently changing existing seeded worlds.
4. Add a **server-owned XP/level domain** before claiming multiplayer Furnace XP parity or server-authoritative PvE XP.
5. Add **durable server world/container persistence** and a generic block-entity/loaded-chunk tick lifecycle, then chest/barrel shared containers.
