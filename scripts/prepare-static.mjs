import {copyFile,mkdir,readFile,rm} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const THREE_RUNTIME_VERSION='0.169.0';
export const THREE_VENDOR_RELATIVE_PATH='vendor/three.module.js';

const scriptsDir=dirname(fileURLToPath(import.meta.url));
const defaultRoot=resolve(scriptsDir,'..');

export async function prepareThreeVendor({root=defaultRoot,clean=false}={}){
  const packagePath=join(root,'node_modules','three','package.json');
  const sourcePath=join(root,'node_modules','three','build','three.module.min.js');
  const vendorDir=join(root,'vendor'),targetPath=join(root,THREE_VENDOR_RELATIVE_PATH);
  let packageJson;
  try{packageJson=JSON.parse(await readFile(packagePath,'utf8'));}catch(error){throw new Error('Three.js dependency is not installed; run npm install before preparing static assets',{cause:error});}
  if(packageJson.version!==THREE_RUNTIME_VERSION)throw new Error(`Three.js version mismatch: expected ${THREE_RUNTIME_VERSION}, got ${packageJson.version}`);
  if(clean)await rm(vendorDir,{recursive:true,force:true});
  await mkdir(vendorDir,{recursive:true});
  await copyFile(sourcePath,targetPath);
  return Object.freeze({version:packageJson.version,sourcePath,targetPath,relativePath:THREE_VENDOR_RELATIVE_PATH});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await prepareThreeVendor({clean:true});
  console.log(`Prepared Three.js ${result.version} -> ${result.relativePath}`);
}
