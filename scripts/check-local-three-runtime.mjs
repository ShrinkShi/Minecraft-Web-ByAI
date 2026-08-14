import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {prepareThreeVendor,THREE_RUNTIME_VERSION,THREE_VENDOR_RELATIVE_PATH} from './prepare-static.mjs';

const root=resolve(import.meta.dirname,'..');
const packageJson=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
assert.equal(packageJson.dependencies?.three,THREE_RUNTIME_VERSION,'Three.js must stay exactly version-pinned');
assert.equal(packageJson.scripts?.['prepare:static'],'node scripts/prepare-static.mjs');

const html=await readFile(resolve(root,'index.html'),'utf8');
const remoteSpecifier=`https://cdn.jsdelivr.net/npm/three@${THREE_RUNTIME_VERSION}/build/three.module.js`;
assert.ok(html.includes(`"${remoteSpecifier}":"./${THREE_VENDOR_RELATIVE_PATH}"`),'index import map must redirect the historical Three.js specifier to the local vendor file');

const pages=await readFile(resolve(root,'.github','workflows','pages.yml'),'utf8');
assert.match(pages,/npm install --omit=dev/,'Pages must install production runtime dependencies');
assert.match(pages,/npm run prepare:static/,'Pages must generate local vendor files before upload');
assert.match(pages,/rm -rf node_modules/,'Pages artifact must not include build-only node_modules');

const prepared=await prepareThreeVendor({root,clean:true});
assert.equal(prepared.version,THREE_RUNTIME_VERSION);
assert.equal(prepared.relativePath,THREE_VENDOR_RELATIVE_PATH);
const info=await stat(prepared.targetPath);assert.ok(info.isFile());assert.ok(info.size>400_000,'generated Three.js module should be the real pinned runtime, not a stub');
const source=await readFile(prepared.targetPath,'utf8');assert.ok(source.includes('REVISION'),'generated Three.js module must expose the Three.js runtime body');

console.log(`local Three.js ${THREE_RUNTIME_VERSION} vendor preparation + Pages contract: PASS`);
