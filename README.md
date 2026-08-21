# Minecraft-Web-ByAI

用现代 Web 架构重新实现 Minecraft Java Edition 玩法语义的浏览器体素沙盒项目。目标不是复制旧 Java/OpenGL 内部实现，而是复刻玩法、资源与交互，同时使用 Worker、紧凑体素数据、显式 GPU 生命周期、IndexedDB 和真正的 Node server-authoritative 多人运行时。

> 当前开发线：`v0.4.0-dev`。严格按 Minecraft Java 1.20.1 完整内容口径，整体规划完成度仍约 **35%**。Merged main 见 [`docs/PROJECT_BASELINE.md`](docs/PROJECT_BASELINE.md)，active delivery 见 [`docs/PROGRESS.md`](docs/PROGRESS.md)。

在线构建：https://shrinkshi.github.io/Minecraft-Web-ByAI/

## 当前 merged main（PR #124）

- desktop Pointer Lock + mobile landscape controls，共享 gameplay runtime；
- F5 first/third-person，source-backed Steve viewmodel/player model；
- 16×16×64 chunk streaming，terrain/mesh Workers，chunk-level batching；
- Inventory、Equipment、2×2 crafting、3×3 Workbench、Furnace、bed、death/respawn、oxygen/swimming/weather；
- deterministic browser/server terrain + simplified iron ore；
- current block families through farmland / dirt path / stripped oak log；
- stone→iron tool/weapon chain through iron pickaxe/axe/shovel/sword/hoe；
- real Node authoritative multiplayer for movement/world/mining/placement/items/Inventory/Equipment/Crafting/Workbench/Furnace/chat/commands/PvP；
- current mobs: cow/sheep/pig/chicken/zombie/skeleton/creeper/spider；
- canonical Java 1.20.1 Workbench GUI；
- corrected first/third-person right-hand presentation；
- source-backed tool/block/mining/current-mob audio baseline, including 1.6-block footsteps and shared fetch+decode break prewarm cache。

Merged main content boundary is **40 item IDs / 14 recipes**. Full Java registry/worldgen/PvE/dimensions/redstone/enchanting etc. remain far from complete.

## Current delivery — PR #125 Iron Armor

Projected post-merge boundary: **44 item IDs / 18 recipes**.

Adds:

- iron helmet 2 armor / 165 durability;
- iron chestplate 6 / 240;
- iron leggings 5 / 225;
- iron boots 2 / 195;
- full set 15 armor points;
- four canonical 1.20.1 item textures + vanilla Workbench recipes;
- restored leather armor durability 55/80/75/65;
- Java-style damage-dependent armor mitigation;
- armor durability/wear/break with item `damage` persistence;
- singleplayer hostile/projectile/explosion applied-only armor wear;
- authoritative PvP armor wear + Equipment revision replication;
- registry-driven `/give minecraft:<item_id>` for registered items.

Iron armor intentionally does not shift the historical starter inventory; it is progression content obtained by crafting or command.

## What is still missing

Major gaps remain:

- hunger/saturation/exhaustion and real food loop;
- crops/farmland hydration/breeding;
- coal and broad ore/material progression;
- most blocks/items/recipes;
- biome/climate/caves/aquifers/features/structures;
- server-authoritative mobs/PvE/projectiles/explosions and multiplayer XP;
- durable multiplayer persistence;
- redstone;
- villagers/trading;
- enchanting/brewing/status effects;
- Nether/End/portals/bosses;
- broad `sounds.json`, replicated SFX, true positional audio and music.

## Running

```bash
npm install
npm run serve
```

Authoritative multiplayer server:

```bash
npm run server
```

Logic/server/Worker regressions:

```bash
npm run test:logic
```

Chromium E2E:

```bash
npx playwright install chromium
npm run test:e2e
```

Quality rule: **only the final exact branch HEAD counts**. An older green run cannot validate a newer commit.

## Near-term roadmap

1. coal ore + coal + Furnace fuel + terrain-generator compatibility/version;
2. hunger/saturation/exhaustion + first food set;
3. wheat/seeds/farmland hydration/growth/harvest;
4. broad reusable block/item registry families;
5. biome → caves → ores/features → structures;
6. server-authoritative PvE/XP + durable persistence;
7. redstone foundation expansion;
8. Nether → portals → enchanting/brewing → End/bosses.

See:

- [`docs/PROJECT_BASELINE.md`](docs/PROJECT_BASELINE.md)
- [`docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md`](docs/MINECRAFT_1_20_1_FEATURE_MATRIX.md)
- [`docs/PROGRESS.md`](docs/PROGRESS.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/TESTING.md`](docs/TESTING.md)
- [`docs/FILE_MANIFEST.md`](docs/FILE_MANIFEST.md)
- [`CHANGELOG.md`](CHANGELOG.md)
