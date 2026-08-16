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
assert.equal(manifest.sourceArchive,'MC原版素材assets.zip');
assert.equal(manifest.sourceArchiveSha256,'b65a2211175af90664de9f41ea422f4869eee855f0da4bf6fe0715434ebe9c69');
assert.deepEqual(manifest.hotbar,{
  width:182,height:22,
  leftCap:'hotbar-left-cap.png',
  slots:Array.from({length:9},(_,index)=>`hotbar-slot-${index}.png`),
  slotWidth:20,slotCount:9,
  rightCap:'hotbar-right-cap.png',
  selector:'hotbar-selector.png',selectorWidth:24,selectorHeight:24
});

assert.deepEqual(manifest.sources,{
  'assets/minecraft/textures/gui/container/inventory.png':{bytes:2195,sha256:'1952f9978a96e15197ad58d998a40840a86f41b1c8cd4323e04fd8eeff9f7337'},
  'assets/minecraft/textures/gui/icons.png':{bytes:8081,sha256:'8d720587f99e2c3d495706ea72249e9b2cc1d1cc9bcd75d4367613e71b898d28'},
  'assets/minecraft/textures/gui/widgets.png':{bytes:15444,sha256:'26a3d4b8a23b75fdb7a0c5e8b7835ce8bdf98873a81695dde9f7010845edfe8b'}
});

const icons='assets/minecraft/textures/gui/icons.png';
const widgets='assets/minecraft/textures/gui/widgets.png';
const inventory='assets/minecraft/textures/gui/container/inventory.png';
const expected={
  'crosshair.png':{source:icons,crop:[0,0,15,15],size:[15,15],sha256:'4d1ed9f1ef8d0153ba0be9e91bed64d1879a02102e89215001734f7826ee960a'},
  'hud-icons.png':{source:icons,crop:[16,0,70,36],size:[54,36],sha256:'040a911feb751ec7babb7aca323d0614516b5bf87952fea449b8d7e611978647'},
  'xp-background.png':{source:icons,crop:[0,64,182,69],size:[182,5],sha256:'f84dc61e621a0fc8da32b0bd73177938a35a6a88b5551c4737caa5d12c5524c8'},
  'xp-progress.png':{source:icons,crop:[0,69,182,74],size:[182,5],sha256:'97edbcab1e8e6becb7d1edd9f3a9b21574079aa2cddaba420b2f58c631624535'},
  'hotbar-left-cap.png':{source:widgets,crop:[0,0,1,22],size:[1,22],sha256:'744876fe2a9a5811e1e1423c1943efa03083346badb479747787477a65f86c86'},
  'hotbar-right-cap.png':{source:widgets,crop:[181,0,182,22],size:[1,22],sha256:'744876fe2a9a5811e1e1423c1943efa03083346badb479747787477a65f86c86'},
  'hotbar-selector.png':{source:widgets,crop:[0,22,24,46],size:[24,24],sha256:'bb1dae5e8223e61bf6da7f4db1a257d4f4efbf501a9f7409d73a227561b287c9'},
  'inventory-panel.png':{source:inventory,crop:[0,0,176,166],size:[176,166],sha256:'67eeab584739a50cc73e1e822ec123a5d968196a40c8431e71b6dd56b06d107e'},
  'inventory-slot.png':{source:inventory,crop:[7,83,25,101],size:[18,18],sha256:'f657453525d95c6f5c67fdaedb8feb5ed339c6716712ad2cfc9ce33070785beb'}
};
const slotHashes=[
  'e168f50b761cf7a154266ba548b65c9d0ac440686306c492e131b9dad9b5f724',
  'e42a49327cc14991b43dc7b5eaed29d158d4b35003d4fc1da169f669cec00c68',
  'ecf44c5a3824192bc8982721f51bafbe4433c8c373b4997f9524e0497b8faa19',
  '2ab4a080eb3c9d2173bc9451833f5e00387dd836f65d51bc6b6d4b157e88b107',
  'aefbe53581a6f98f9ed7abd462e34fa35f69d8be0b37f3b444371d48e1ec3f06',
  'c8587dcf43a15dec536f2fea1f2fb6f369cce95d7bca174ae3f3ceb91a216a28',
  'b0484f82b240619b53b60e34db901d462519dccf4d06ff660855d2453b3fac29',
  '8d4712b549b02f1d3c347be3111f452114350aeefbb30d0faac76c091751e57b',
  '13f8c19eae500c232c9442867762def08c95caef608714104d0a2f16244e0f45'
];
for(let index=0;index<9;index++)expected[`hotbar-slot-${index}.png`]={source:widgets,crop:[1+index*20,0,21+index*20,22],size:[20,22],sha256:slotHashes[index]};

assert.deepEqual(Object.keys(manifest.sprites).sort(),Object.keys(expected).sort());
for(const [name,recordExpected] of Object.entries(expected)){
  const record=manifest.sprites[name];
  assert.ok(record,`${name} must be declared in GUI manifest`);
  assert.equal(record.source,recordExpected.source);
  assert.deepEqual(record.crop,recordExpected.crop);
  assert.deepEqual(record.size,recordExpected.size);
  const path=resolve(root,'assets/gui',name);
  assert.deepEqual(pngSize(path),recordExpected.size,`${name} dimensions must match source crop`);
  assert.equal(sha256(path),recordExpected.sha256,`${name} must equal the staged deterministic GUI artifact bytes`);
}

console.log('Minecraft Java 1.20.1 HUD/hotbar/inventory GUI sprites + exact source provenance: PASS');
