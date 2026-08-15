export const DEFAULT_MINECRAFT_NAMESPACE='minecraft';

const NAMESPACE_RE=/^[a-z0-9_.-]+$/;
const PATH_RE=/^[a-z0-9_./-]+$/;

function assertNamespace(value,label='namespace'){
  if(typeof value!=='string'||!value||!NAMESPACE_RE.test(value))throw new TypeError(`${label} must match [a-z0-9_.-]+`);
  return value;
}

function assertPath(value){
  if(typeof value!=='string'||!value||!PATH_RE.test(value))throw new TypeError('resource path must match [a-z0-9_./-]+');
  if(value.startsWith('/')||value.endsWith('/')||value.includes('//'))throw new TypeError('resource path must not contain empty path segments');
  const parts=value.split('/');
  if(parts.some(part=>part==='.'||part==='..'))throw new TypeError('resource path must not contain traversal segments');
  return value;
}

export function parseMinecraftResourceId(value,{defaultNamespace=DEFAULT_MINECRAFT_NAMESPACE}={}){
  assertNamespace(defaultNamespace,'default namespace');
  if(typeof value!=='string'||!value)throw new TypeError('resource identifier must be a non-empty string');
  if(value.trim()!==value)throw new TypeError('resource identifier must not contain surrounding whitespace');
  const first=value.indexOf(':');
  if(first!==-1&&value.indexOf(':',first+1)!==-1)throw new TypeError('resource identifier must contain at most one namespace separator');
  const namespace=first===-1?defaultNamespace:value.slice(0,first);
  const path=first===-1?value:value.slice(first+1);
  assertNamespace(namespace);
  assertPath(path);
  return Object.freeze({namespace,path,id:`${namespace}:${path}`});
}

export function normalizeMinecraftResourceId(value,options){
  return parseMinecraftResourceId(value,options).id;
}

export function minecraftModelAssetPath(value,options){
  const {namespace,path}=parseMinecraftResourceId(value,options);
  return `./assets/${namespace}/models/${path}.json`;
}

export function minecraftTextureAssetPath(value,options){
  const {namespace,path}=parseMinecraftResourceId(value,options);
  return `./assets/${namespace}/textures/${path}.png`;
}

export function minecraftBlockstateAssetPath(value,options){
  const {namespace,path}=parseMinecraftResourceId(value,options);
  if(path.includes('/'))throw new TypeError('blockstate resource identifier must name a block, not a model path');
  return `./assets/${namespace}/blockstates/${path}.json`;
}
