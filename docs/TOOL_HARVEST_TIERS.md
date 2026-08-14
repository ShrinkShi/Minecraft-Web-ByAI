# Tool harvest tiers

## Scope

This change introduces a shared harvest-tier contract without adding new visible content or placeholder artwork.

Existing stone and cobblestone explicitly require:

- tool kind: `pickaxe`;
- minimum harvest tier: `wood`.

The same rule is consumed by the client-side mining model, authoritative server survival mining, and the Jade-style target inspector.

## Tier ranks

Harvest ranks are intentionally distinct from tool mining speed:

| Tier | Harvest rank |
| --- | ---: |
| wood | 0 |
| gold | 0 |
| stone | 1 |
| iron | 2 |
| diamond | 3 |
| netherite | 4 |

Gold therefore shares wood's harvest capability while remaining free to use a different speed when a gold tool is implemented later.

A tool must satisfy both constraints:

1. its `kind` must match the block's required tool kind;
2. its harvest rank must be at least the block's minimum tier.

A high-tier axe never satisfies a pickaxe requirement.

## Compatibility

Blocks that require a tool but do not yet declare `minToolTier` default to `wood`.

Likewise, legacy tool definitions that have a matching kind but no explicit `tier` are treated as `wood`. This prevents old saves/data definitions from silently losing stone/cobblestone drops while the data model is migrated.

Unknown explicit tier names are rejected instead of being guessed.

## Jade metadata

For a block target, the inspector now exposes:

- `requiredToolTier` / `requiredToolTierName`;
- `heldToolTier` / `heldToolTierName`;
- `toolCorrect`, computed from both kind and tier.

The HUD renders required tier inline, for example:

`工具：镐 · 最低木质 ✓`

## Asset/content boundary

This foundation deliberately does **not** add stone pickaxes, iron ore, raw iron, recipes, ore generation, or visual substitutes. Their logical asset keys remain `missing` in `src/asset-manifest.js` until the user-supplied Minecraft archive is available.

The abandoned `game/v0.4-tool-harvest-tiers` branch is not merged wholesale because it contains fabricated `stone_pickaxe.svg` / `raw_iron.svg` resources and placeholder iron-ore presentation.
