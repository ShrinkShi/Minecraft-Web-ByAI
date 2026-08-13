import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptsDir=dirname(fileURLToPath(import.meta.url));
const root=join(scriptsDir,'..');
const checks=readdirSync(scriptsDir)
  .filter(name=>name==='check.mjs'||(/^check-.*\.mjs$/).test(name))
  .sort((a,b)=>a==='check.mjs'?-1:b==='check.mjs'?1:a.localeCompare(b));

if(!checks.length)throw new Error('no logic check scripts found');
for(const name of checks){
  console.log(`[logic] ${name}`);
  const result=spawnSync(process.execPath,[join(scriptsDir,name)],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
console.log(`[logic] ${checks.length} scripts passed`);
