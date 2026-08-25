import {ITEMS} from './items.js';

export const CREATIVE_CATALOG_CATEGORIES=Object.freeze([
  Object.freeze({id:'building',label:'建筑方块'}),
  Object.freeze({id:'tools',label:'工具'}),
  Object.freeze({id:'combat',label:'战斗'}),
  Object.freeze({id:'food',label:'食物'}),
  Object.freeze({id:'nature',label:'自然'}),
  Object.freeze({id:'materials',label:'材料'}),
  Object.freeze({id:'misc',label:'其他'})
]);

const CATEGORY_IDS=new Set(CREATIVE_CATALOG_CATEGORIES.map(category=>category.id));

function categoryFor(def){
  if(def?.tool)return'tools';
  if(def?.armorSlot||def?.combat)return'combat';
  if(def?.food)return'food';
  if(def?.plantKind||def?.useKind==='bone_meal')return'nature';
  if(Number.isInteger(def?.blockId)||def?.placeKind)return'building';
  if(Number.isInteger(def?.stack)&&def.stack>1)return'materials';
  return'misc';
}

function descriptor(id,def){return Object.freeze({id,name:def?.name||id,stack:def?.stack||64,category:categoryFor(def)});}
function normalizeQuery(value){if(typeof value!=='string')throw new TypeError('creative catalog query must be a string');return value.trim().toLowerCase();}
function normalizedId(id){return id.replace(/[:_-]+/gu,' ');}
function matchesQuery(entry,tokens){if(!tokens.length)return true;const haystack=`${entry.id} ${normalizedId(entry.id)} ${entry.name}`.toLowerCase();return tokens.every(token=>haystack.includes(token));}
function normalizeCategory(value){if(typeof value!=='string')throw new TypeError('creative catalog category must be a string');if(value!=='all'&&!CATEGORY_IDS.has(value))throw new RangeError(`unknown creative catalog category: ${value}`);return value;}

export const CREATIVE_CATALOG_ITEMS=Object.freeze(Object.entries(ITEMS).map(([id,def])=>descriptor(id,def)));
const CATALOG_BY_ID=new Map(CREATIVE_CATALOG_ITEMS.map(entry=>[entry.id,entry]));

export function creativeCatalogCategoryFor(itemId){return CATALOG_BY_ID.get(itemId)?.category||null;}

export function listCreativeCatalog({category='all',query=''}={}){
  category=normalizeCategory(category);const normalized=normalizeQuery(query),tokens=normalized?normalized.split(/\s+/u):[];
  if(category==='all'&&!tokens.length)return CREATIVE_CATALOG_ITEMS;
  return Object.freeze(CREATIVE_CATALOG_ITEMS.filter(entry=>(category==='all'||entry.category===category)&&matchesQuery(entry,tokens)));
}
