import fs from 'node:fs';
import {createTerrainGenerator,hashTerrainSeed} from '../src/terrain-generator.js';

const outputPath=process.argv[2];
if(!outputPath)throw new Error('usage: node scripts/generate-godot-terrain-fixtures.mjs <output.json>');

const coreCases=[
  {seed:'1',prompt:'',version:2,x:0,z:0},
  {seed:'1',prompt:'',version:3,x:-17,z:33},
  {seed:'山海🌍',prompt:'森林 山 海',version:4,x:48,z:-35},
  {seed:'',prompt:'plain river',version:2,x:-64,z:-16}
];

const probes=coreCases.map(entry=>{
  const generator=createTerrainGenerator(entry);
  const top=generator.heightAt(entry.x,entry.z);
  const y=Math.max(4,Math.min(top-4,12));
  return{
    ...entry,
    y,
    seedHash:hashTerrainSeed(entry.seed),
    parameters:generator.parameters,
    height:top,
    hash2:generator.hash2(entry.x,entry.z),
    hash3:generator.hash3(entry.x,y,entry.z,0x51ad),
    iron:generator.isIronOre(entry.x,y,entry.z,top),
    coal:generator.isCoalOre(entry.x,y,entry.z,top),
    shortGrass:generator.isShortGrassDecoration(entry.x,top+1,entry.z)
  };
});

const coalV3=createTerrainGenerator({seed:'1',prompt:'',version:3});
let coalGate=null;
for(let x=-64;x<=64&&!coalGate;x++)for(let z=-64;z<=64&&!coalGate;z++){
  const top=coalV3.heightAt(x,z);
  for(let y=4;y<=Math.min(56,top-4);y++)if(coalV3.isCoalOre(x,y,z,top)){coalGate={seed:'1',prompt:'',x,y,z,top};break;}
}
if(!coalGate)throw new Error('failed to find deterministic coal gate probe');

const grassV4=createTerrainGenerator({seed:'ci-terrain-2026',prompt:'平原',version:4});
let grassGate=null;
for(let x=-64;x<=64&&!grassGate;x++)for(let z=-64;z<=64&&!grassGate;z++){
  const top=grassV4.heightAt(x,z);
  if(grassV4.isShortGrassDecoration(x,top+1,z))grassGate={seed:'ci-terrain-2026',prompt:'平原',x,y:top+1,z};
}
if(!grassGate)throw new Error('failed to find deterministic short-grass gate probe');

const fullEntry={seed:'ci-terrain-2026',prompt:'平原',version:4,cx:0,cz:0};
const fullGenerator=createTerrainGenerator(fullEntry);
const fullChunk=fullGenerator.generateChunk(fullEntry.cx,fullEntry.cz);

const document={
  schema:'minecraft-godot-terrain-fixture-v2',
  probes,
  coalGate,
  grassGate,
  fullChunk:{...fullEntry,chunkHex:Buffer.from(fullChunk).toString('hex')}
};
fs.writeFileSync(outputPath,JSON.stringify(document));
console.log(`wrote ${probes.length} terrain probes + 1 full chunk fixture to ${outputPath}`);
