import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const manifest=JSON.parse(readFileSync(resolve(root,'assets/gui/gui-manifest.json'),'utf8'));
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const pngSize=path=>{
  const bytes=readFileSync(path);
  assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG',`${path} must be a PNG`);
  return[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
};

assert.equal(manifest.format,1);
assert.equal(manifest.minecraftVersion,'1.20.1');
assert.equal(manifest.sourceArchiveSha256,'b65a2211175af90664de9f41ea422f4869eee855f0da4bf6fe0715434ebe9c69');
assert.deepEqual(manifest.hotbar,{height:22,selectorRect:[0,22,24,24],sheet:'hotbar.png',width:182});

const expectedSources={
  'assets/minecraft/textures/gui/icons.png':{bytes:8081,sha256:'8d720587f99e2c3d495706ea72249e9b2cc1d1cc9bcd75d4367613e71b898d28'},
  'assets/minecraft/textures/gui/widgets.png':{bytes:15444,sha256:'26a3d4b8a23b75fdb7a0c5e8b7835ce8bdf98873a81695dde9f7010845edfe8b'},
  'assets/minecraft/textures/gui/container/inventory.png':{bytes:2195,sha256:'1952f9978a96e15197ad58d998a40840a86f41b1c8cd4323e04fd8eeff9f7337'}
};
assert.deepEqual(manifest.sources,expectedSources);

const expectedSprites={
  'hotbar.png':{source:'assets/minecraft/textures/gui/widgets.png',sourceRect:[0,0,182,46],size:[182,46]},
  'hud-icons.png':{source:'assets/minecraft/textures/gui/icons.png',sourceRect:[16,0,70,36],size:[54,36]},
  'inventory-slot.png':{source:'assets/minecraft/textures/gui/container/inventory.png',sourceRect:[7,83,25,101],size:[18,18]}
};
for(const [name,expected] of Object.entries(expectedSprites)){
  const record=manifest.sprites[name];
  assert.ok(record,`${name} must be declared in GUI manifest`);
  assert.equal(record.source,expected.source);
  assert.deepEqual(record.sourceRect,expected.sourceRect);
  assert.deepEqual(record.size,expected.size);
  const path=resolve(root,'assets/gui',name);
  assert.deepEqual(pngSize(path),expected.size,`${name} dimensions must match source crop`);
  assert.equal(sha256(path),record.sha256,`${name} tracked bytes must match GUI manifest`);
}

console.log('Minecraft Java 1.20.1 source-backed GUI sprites + provenance: PASS');
