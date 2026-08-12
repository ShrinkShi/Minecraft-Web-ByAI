import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const main=fs.readFileSync('src/main.js','utf8');
const deathScreen=fs.readFileSync('src/death-screen.js','utf8');

assert.match(html,/href="\.\/death\.css"/,'index.html must load death.css');
for(const id of ['death-menu','death-reason','death-detail'])assert.match(html,new RegExp(`id="${id}"`),`missing #${id}`);
assert.match(html,/data-action="respawn"/,'death screen must expose explicit respawn');
assert.match(html,/data-action="death-main"/,'death screen must expose return-to-title action');

assert.match(deathScreen,/document\.querySelector\('#death-menu'\)/,'DeathScreen must bind the death root');
assert.match(main,/import \{DeathScreen\} from '\.\/death-screen\.js';/,'main must import DeathScreen');
assert.match(main,/deathScreen=new DeathScreen\(\)/,'main must construct DeathScreen');
assert.match(main,/let deathState=null;/,'main must own explicit death state');
assert.match(main,/function beginPlayerDeath\(/,'main must split death settlement from respawn');
assert.match(main,/function completeRespawn\(/,'main must expose explicit respawn completion');
assert.match(main,/name==='death'\?deathScreen\.root/,'screen routing must include the death layer');
assert.match(main,/if\(deathState\)\{e\.preventDefault\(\);return;\}/,'keyboard input must be gated while dead');
assert.match(main,/if\(running&&!paused&&player&&!deathState\)/,'world simulation must stop while the death screen is active');
assert.equal(main.includes('respawnPlayer('),false,'legacy immediate respawnPlayer path must not return');

assert.equal(fs.existsSync('.github/workflows/death-main-patch.yml'),false,'stale one-shot death workflow must not ship');
assert.equal(fs.existsSync('scripts/patch-death-main.py'),false,'stale death patch script must not ship');
assert.equal(fs.existsSync('.github/workflows/death-runtime-recovery.yml'),false,'recovery workflow must not ship');

console.log('death integration contract: PASS');
