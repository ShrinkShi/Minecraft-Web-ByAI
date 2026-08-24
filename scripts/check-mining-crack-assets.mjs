import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {MINING_CRACK_ASSET_COUNT,MINING_CRACK_ASSET_URLS,miningCrackAssetUrl} from '../src/mining-crack-assets.js';
import {MINING_CRACK_STAGE_COUNT} from '../src/mining-crack-rules.js';

assert.equal(MINING_CRACK_ASSET_COUNT,10);assert.equal(MINING_CRACK_ASSET_COUNT,MINING_CRACK_STAGE_COUNT);assert.equal(MINING_CRACK_ASSET_URLS.length,10);
for(let stage=0;stage<10;stage++){
  const url=miningCrackAssetUrl(stage);assert.equal(url,`./MC原版素材assets/minecraft/textures/block/destroy_stage_${stage}.png`);assert.equal(MINING_CRACK_ASSET_URLS[stage],url);
  const path=resolve(process.cwd(),url);assert.equal(existsSync(path),true,`canonical destroy_stage_${stage}.png must be tracked`);
  const bytes=readFileSync(path);assert.equal(bytes.subarray(1,4).toString(),'PNG',`destroy_stage_${stage}.png must be a PNG`);
}
assert.throws(()=>miningCrackAssetUrl(-1),/0 to 9/);assert.throws(()=>miningCrackAssetUrl(10),/0 to 9/);assert.throws(()=>miningCrackAssetUrl(.5),/0 to 9/);
console.log('canonical Java 1.20.1 destroy_stage_0..9 mining crack assets: PASS');
