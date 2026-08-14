# Asset import status

## Current repository reality

The current `main` branch does **not** contain the previously supplied full Minecraft asset archives.

Tracked runtime art is still limited to the small placeholder/prototype resources under:

- `assets/textures/atlas.png`
- `assets/items/stick.png`
- `assets/items/wooden_pickaxe.png`
- several CSS / data-URI generated UI and item placeholders

These assets are useful for engine bring-up and automated tests, but they are not the intended final visual layer.

## Required migration

When the user-supplied Minecraft asset archives are staged in an active development workspace, the next asset-focused change should do the following instead of creating more placeholder art:

1. inventory the archive tree and record source paths;
2. identify block, item, GUI, entity, font, particle and sound resources that correspond to implemented gameplay;
3. build a deterministic texture manifest rather than hard-coding atlas tile numbers throughout gameplay code;
4. generate the runtime block atlas from the supplied block textures with nearest-neighbor sampling and stable indices;
5. point item slots at the supplied item textures where available;
6. replace generated HUD/status/menu imagery with the supplied GUI assets in controlled batches;
7. introduce entity texture/model bindings separately from entity simulation data;
8. add sound bindings without coupling simulation outcomes to audio playback;
9. keep a generated manifest/checksum so CI can detect missing or accidentally remapped resources;
10. only retain procedural placeholders for content that is genuinely absent from the supplied archive.

## Architecture boundary

Gameplay definitions should refer to logical asset keys, not filesystem paths or atlas coordinates. A resource manifest should resolve those keys to browser URLs and atlas entries. This keeps world/server simulation independent from the visual pack and makes later texture-pack substitution possible without rewriting gameplay logic.

## Current blocker

The archive bytes must be present in the active workspace before this migration can be executed and verified. Do not silently substitute unrelated web-downloaded copies for the user's supplied files, and do not describe the current prototype atlas as imported original art.
