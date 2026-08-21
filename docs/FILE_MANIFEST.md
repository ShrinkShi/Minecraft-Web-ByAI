# 文件职责清单

本文件记录影响 gameplay state、authority、resource provenance/lifecycle 或主要 presentation contract 的关键文件，不是仓库 `ls`。

## Application / presentation

| 路径 | 职责 |
|---|---|
| `src/main.js` | browser app/session orchestration、singleplayer interaction entry points |
| `src/client-gameplay-runtime.js` | browser gameplay object graph construction/disposal；安装 singleplayer armor wear bridge |
| `src/browser-bootstrap.js` | source-backed UI / Workbench / mining-audio page bridges |
| `src/ui.js` | Inventory/Crafting/Equipment/HUD DOM binding |
| `src/vanilla-workbench-presentation.js` | canonical Java 1.20.1 Workbench visual coordinates |
| `src/player-model-specs.js` | wide Steve anatomical pivots/boxes/UV |
| `src/first-person-player-presentation.js` | source-backed first-person arm/sleeve/held-item Three.js viewmodel |

## World / resources / audio

| 路径 | 职责 |
|---|---|
| `src/blocks.js` | append-only block IDs/metadata/render classes |
| `src/world.js` | chunk streaming/edit overlay/mesh lifecycle |
| `src/terrain-generator.js` | browser/server deterministic worldgen compatibility source |
| `src/mesh-worker.js` | chunk visible-face/interpreted model batch generation |
| `src/asset-manifest.js` | logical asset key → tracked source-backed URL; direct canonical bindings audited |
| `MC原版素材assets/` | Java 1.20.1 texture/model source input |
| `原版Minecraft音频文件/` | Java 1.20.1 sound-object source corpus |
| `src/vanilla-sounds.js` | current source-backed sound mappings + shared fetch/decode cache |
| `src/vanilla-block-audio.js` | local ordinary block events + material footsteps |
| `src/vanilla-mining-audio.js` | mining hit playback + break-variant shared decoded-buffer prewarm |
| `src/vanilla-mining-audio-runtime.js` | browser `minecraft:mining-hit` event bridge |
| `src/vanilla-mob-sounds.js` | current 8-mob voice mapping + local attenuation |

## Items / armor / crafting

| 路径 | 职责 | #125 contract |
|---|---|---|
| `src/items.js` | runtime item definitions + stable historical `CREATIVE_START` | projected 44 IDs; iron armor registered but does not shift starter slots |
| `src/item-stack.js` | item-instance normalization/damage/merge | armor `damage` uses same instance contract as tools |
| `src/inventory.js` | 36 slots + cursor + snapshot | preserves damaged item instances |
| `src/recipes.js` | shaped/shapeless matcher | projected 18 recipes incl. four iron armor recipes |
| `src/equipment.js` | local head/chest/legs/feet state | points/toughness, damage preservation, armor wear/break |
| `src/armor-rules.js` | pure armor mitigation + per-hit durability wear | browser/server-neutral Java-style semantics |
| `src/armor-damage-bridge.js` | singleplayer applied-damage ordering | wear only after accepted armor-relevant damage |
| `src/commands.js` | local command parsing | `minecraft:<registered_item_id>` resolves through item registry |

## Server authority

| 路径 | 职责 | #125 contract |
|---|---|---|
| `server/player-equipment-state.mjs` | authoritative Equipment domain | preserves damage metadata; `damageArmor` advances one revision per wear event |
| `server/player-combat-state.mjs` | authoritative HP/hurt/attack cooldown | consumes armor points for mitigation |
| `server/combat-runtime-controller.mjs` | PvP transaction orchestration | pre-hit mitigation → accepted damage → armor wear replication → death cleanup |
| `server/runtime.mjs` | production server composition | wires real Equipment hub, Inventory, world, containers and combat |

Other current server domains include movement/world session, mining/placement/secondary actions, ground items, Inventory, crafting/Workbench, Furnace, chat and commands.

## Tests added/expanded by #125

| 路径 | Purpose |
|---|---|
| `scripts/check-armor.mjs` | mitigation/wear/local Equipment state + `/give` |
| `scripts/check-armor-damage-bridge.mjs` | applied-only singleplayer wear ordering |
| `scripts/check-iron-armor-progression.mjs` | item values/assets/recipes/full-set/starter compatibility |
| `scripts/check-authoritative-equipment-state.mjs` | server Equipment damage/revision/break state |
| `scripts/check-authoritative-melee-profile-runtime.mjs` | successful-hit-only weapon/target-armor wear contract |
| `scripts/check-authoritative-pvp-runtime.mjs` | real two-client armor mitigation/wear replication/death |
| `tests/e2e/iron-armor-progression.spec.mjs` | real Workbench craft + canonical image decode + equip/HUD browser acceptance |

## Documentation authority

| 路径 | 职责 |
|---|---|
| `README.md` | project overview / current delivery summary |
| `CHANGELOG.md` | chronological Unreleased history |
| `docs/PROJECT_BASELINE.md` | merged main facts only |
| `docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md` | parity/roadmap authority |
| `docs/PROGRESS.md` | active delivery dashboard |
| `docs/ARCHITECTURE.md` | subsystem/authority boundaries |
| `docs/TESTING.md` | exact-head quality policy |
| `docs/FILE_MANIFEST.md` | this responsibility map |

## Global constraints

- IDs / persistence / starter-slot / network contracts are compatibility surfaces;
- source availability does not equal gameplay implementation;
- multiplayer clients send intent and consume authoritative result;
- browser presentation cannot become gameplay truth;
- every parity-changing PR updates matrix/docs and passes final exact-head quality gate.
