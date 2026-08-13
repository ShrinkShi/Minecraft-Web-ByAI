import assert from 'node:assert/strict';
import {OrderedChangeBuffer} from '../src/ordered-change-buffer.js';
const buffer=new OrderedChangeBuffer(),seen=[];
buffer.push(1);buffer.push(2);assert.equal(buffer.size,2);assert.equal(buffer.attach(value=>seen.push(value)),2);assert.deepEqual(seen,[1,2]);assert.equal(buffer.size,0);buffer.push(3);assert.deepEqual(seen,[1,2,3]);assert.throws(()=>buffer.attach(()=>{}),/already attached/);assert.equal(typeof buffer.detach(),'function');buffer.push(4);assert.equal(buffer.size,1);buffer.clear();assert.equal(buffer.size,0);assert.equal(buffer.detach(),null);
console.log('ordered change buffer: PASS');
