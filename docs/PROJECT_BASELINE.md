# Project Baseline — 2026-08-16

This document is the authoritative human-readable snapshot of what is actually present on `main` at the baseline commit below. It exists to prevent roadmap/documentation drift from being mistaken for implementation state.

## Authority

- Baseline branch point: `dbdd6a2b632b6a14b9232806bcbf6a9ccea74113`
- Baseline source: GitHub `main` after merged PR #94
- Development line: `v0.4.0-dev`
- Stable release label remains `v0.3.0` until a release is intentionally cut.
- A feature counts as complete only when its code is on `main` and the repository quality gate for its delivery head is green.
- PR descriptions and older progress documents are historical evidence, not current truth when they conflict with `main`.

## Planning completion estimate

The project currently has two very different completion measures:

- Browser voxel/Minecraft engine foundation: about **75–80%** of the foundation needed for the intended product.
- Strict Minecraft Java 1.20.1 gameplay/content parity: about **35%** overall.

The second number is the roadmap number. It stays much lower because Minecraft parity is dominated by content breadth: blocks, items, recipes, world generation, structures, mobs, redstone, dimensions, progression, audio and server product features.

## Current verified runtime facts

### Browser/client foundation

- One shared Web runtime for desktop and mobile; input devices are adapters over `ControlIntentBus` rather than separate clients.
- First-person movement, jumping, sprint/sneak, flying modes, Pointer Lock desktop input and landscape touch controls.
- F5 first/third-person view cycling.
- Chunk streaming with 16×16×64 compact voxel chunks.
- Terrain generation and chunk meshing run through separate Workers.
- Chunk-level merged opaque/water meshes rather than one Three.js mesh per voxel.
- Explicit unload/dispose lifecycle for chunk geometry and shared rendering resources.
- Three.js is pinned and served from the project rather than depending on the historical runtime jsDelivr import.
- IndexedDB singleplayer persistence for world edits and implemented player state.

### World and blocks

Current registered block gameplay families are intentionally small: grass, dirt, stone, sand, oak planks, oak log, oak leaves, water, crafting table, cobblestone and the red bed structure.

Beds use eight internal state IDs for four facings × foot/head, but represent one gameplay block family. Since PR #94, beds are no longer rendered as tinted one-metre cubes: chunk meshing emits special bed descriptors and `BedModelRenderer` builds the partial red-bed visual from the imported Java 1.20.1 entity texture.

Current terrain generation is a deterministic heightmap/fBm baseline with stone/dirt/grass/sand/water and oak trees. Prompt keywords alter amplitude, sea, forest and sand parameters. It is **not** yet a Minecraft biome/cave/ore/structure generator.

### Items, crafting and progression

- 36-slot Inventory + 9-slot hotbar.
- Cursor transactions, left/right click, stack split/place/merge and Shift transfer.
- Equipment slots for head/chest/legs/feet.
- Current item registry contains 28 runtime item IDs.
- Current recipe registry contains five recipes: oak log → planks, planks → sticks, crafting table, red bed and wooden pickaxe.
- Wooden pickaxe has item-instance durability and shared mining/harvest rules.
- Tool-tier foundation exists, but the full stone/iron/gold/diamond/netherite progression is not yet wired into gameplay.
- Leather armor exists with a simplified mitigation formula; full Java armor/toughness/enchantment behaviour is not complete.

### Survival systems

Implemented slices include:

- HP, damage, knockback and hurt cooldown foundations.
- Experience orbs and Java-style XP level/total calculations.
- Singleplayer death settlement, explicit death screen, respawn and recoverable item/XP drops.
- Persistent custom respawn point.
- Two-block bed placement, respawn anchor, night skip and nearby-hostile sleep rejection.
- Water render pass, oxygen, drowning and basic buoyancy/swimming.
- Rain/thunder particle renderer and time/weather commands.
- Item durability presentation and persistence for supported damageable tools.

Major survival progression systems still missing include full hunger/saturation behaviour, food consumption breadth, furnaces/smelting, farming, animal breeding, full tool/weapon progression, enchanting, brewing and status effects.

### Entities and PvE

Eight gameplay mob types currently exist:

- passive: cow, sheep, pig, chicken
- hostile: zombie, skeleton, creeper, spider

All eight now use imported Minecraft Java 1.20.1 entity texture sheets with reconstructed cuboid models instead of the earlier colour-only prototypes.

Singleplayer includes simplified AI/combat, skeleton arrows, creeper explosions, loot and XP. Full pathfinding, vanilla spawn rules, daylight behaviour, breeding/taming/riding and most Minecraft mob species remain unimplemented.

### Multiplayer/server authority

The project now has a real Node WebSocket authoritative runtime, not client-position relay multiplayer. Merged work covers:

- strict handshake/session/input protocol and sequence gates;
- deterministic shared terrain and server collision simulation;
- server-authoritative player movement and self/remote snapshot replication;
- live authoritative world edits;
- creative and survival mining/placement;
- authoritative item entities and pickup;
- authoritative Inventory, carried cursor, Equipment, 2×2 player crafting and 3×3 workbench transactions;
- authoritative chat and development/admin command channels;
- server-owned PvP HP, melee targeting, armor mitigation, knockback, death drops and respawn;
- real two-browser integration tests for important multiplayer paths.

Important remaining authority gap: the current mob AI/PvE/projectile/explosion systems are still client-side gameplay systems and are not yet a server-owned multiplayer domain. Multiplayer world persistence, rooms/accounts/operator permissions and shared persistent containers also remain incomplete.

## Minecraft asset baseline

Tracked source archive: `MC原版素材assets.zip`.

Deterministic audit from the asset import work found 7,623 files, including approximately:

- 977 block textures
- 582 item textures
- 497 entity textures
- 2,016 block-model JSON files
- 1,675 item-model JSON files
- 1,005 blockstates
- 0 `.bbmodel` files
- 0 sound files and no `sounds.json`

The runtime currently imports only a selective subset needed by implemented gameplay. The archive therefore contains far more content than the game currently exposes.

Current major asset/render gaps:

- no general Minecraft blockstate/model JSON interpreter;
- no broad generated block/item registry from the resource tree;
- no runtime biome tint system yet; current grass/foliage/water compatibility uses stable baked/default tinting where needed;
- no animated water frame playback yet;
- no audio source set in the supplied archive, so the sound/music layer requires a separate source.

## Quality baseline

PR #94 delivery validation records:

- `Repository quality` run `31892750659`: success
- static checks: JavaScript syntax plus 131 logic/worker regression scripts
- Chromium browser smoke shard 1/2: success
- Chromium browser smoke shard 2/2: success

Recent asset imports additionally use a deterministic source-archive audit that rebuilds selected runtime resources and checks hashes/bytes.

## Documentation policy from this baseline onward

1. `docs/PROJECT_BASELINE.md` records the current verified implementation snapshot.
2. `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` records target parity by domain and is the roadmap authority.
3. `docs/PROGRESS.md` is a short active-work dashboard, not a second exhaustive implementation history.
4. `README.md` describes the product at a user/developer overview level and links to the two authority documents above.
5. `CHANGELOG.md` remains chronological history; it must not be used to infer unfinished/current work.
6. Every feature PR that changes parity status must update the feature matrix in the same PR.
7. A matrix item may move to `DONE` only with merged implementation and validation evidence. Architectural groundwork without user-visible parity remains `PARTIAL`.

## Next milestone

The project is now transitioning from **v0.4 foundation construction** to **large-scale Minecraft content integration**.

The highest-leverage next implementation is a Minecraft Java blockstate/model interpreter over the already tracked 1.20.1 resource subset. That interpreter should be followed by generated/validated registries and batch content import rather than continuing to hand-author one renderer per ordinary block.