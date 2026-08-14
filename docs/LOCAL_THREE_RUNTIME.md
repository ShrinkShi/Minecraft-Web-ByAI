# Local Three.js runtime

## Problem

The browser runtime historically imported Three.js directly from:

`https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js`

That made game startup depend on a third-party CDN even though the application itself is deployed from GitHub Pages or a local server.

## Runtime contract

Three.js is now an exact production dependency:

`three: 0.169.0`

`scripts/prepare-static.mjs` verifies the installed package version and copies the package's minified ESM build to:

`vendor/three.module.js`

The generated `vendor/` directory is ignored by Git and is a deployment/build artifact, not hand-maintained source.

`index.html` contains an import map that redirects the historical absolute Three.js module specifier to the generated local module. This deliberately avoids a high-risk mass rewrite of every renderer import while removing the runtime CDN dependency.

## Local development

After `npm install`:

- `npm run serve` prepares the vendor module before starting the static server;
- `npm run test:e2e` prepares the same artifact before Chromium starts;
- `npm run prepare:static` can be run explicitly when needed.

If `three` is missing or its installed version differs from `0.169.0`, preparation fails instead of silently using another runtime.

## GitHub Pages

The Pages workflow now:

1. installs exact production dependencies;
2. runs `npm run prepare:static`;
3. removes build-only `node_modules` from the Pages artifact;
4. uploads the repository plus the generated local vendor module.

The deployed browser therefore loads Three.js from the same site as the game.

## Regression coverage

- Node regression verifies the exact dependency version, import-map redirect, generated file existence and non-stub runtime body.
- Chromium blocks the historical jsDelivr URL and proves the main menu still boots while `/vendor/three.module.js` returns successfully.

## Follow-up

A future bundler migration may replace the import-map compatibility bridge with bare-module imports and hashed build output. That is intentionally separate from this change; the current goal is to remove the live CDN dependency with minimal gameplay risk.
