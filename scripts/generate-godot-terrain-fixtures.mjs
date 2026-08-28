import fs from 'node:fs';
import {createTerrainGenerator,hashTerrainSeed} from '../src/terrain-generator.js';

const outputPath=process.argv[2];
if(!outputPath)throw new Error('usage: node scripts/generate-godot-terrain-fixtures.mjs <output.json>');

const cases=[
  {seed:'1',prompt:'',version:2,cx:0,cz:0},
  {seed:'1',prompt:'',version:3,cx:-1,cz:2},
  {seed:'ci-terrain-2026',prompt:'平原',version:4,cx:0,cz:0},
  {seed:'ci-terrain-2026',prompt:'沙漠',version:4,cx:2,cz:-3},
  {seed:'山海🌍',prompt:'森林 山 海',version:4,cx:3,cz:-2},
  {seed:'',prompt:'plain river',version:2,cx:-4,cz:-1}
];

const fixtures=cases.map(entry=>{
  const generator=createTerrainGenerator(entry);
  const chunk=generator.generateChunk(entry.cx,entry.cz);
  return{
    ...entry,
    seedHash:hashTerrainSeed(entry.seed),
    parameters:generator.parameters,
    chunkHex:Buffer.from(chunk).toString('hex')
  };
});

fs.writeFileSync(outputPath,JSON.stringify({schema:'minecraft-godot-terrain-fixture-v1',fixtures}));
console.log(`wrote ${fixtures.length} terrain fixtures to ${outputPath}`);
