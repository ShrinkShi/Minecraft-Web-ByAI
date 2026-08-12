import assert from 'node:assert/strict';

const S=16,H=64,index=(x,y,z)=>x+S*(z+S*y);
const messages=[];
globalThis.self={postMessage:(message,transfers=[])=>messages.push({message,transfers})};
await import(`../src/mesh-worker.js?water-test=${Date.now()}`);

function mesh(data,{px=null,nx=null,pz=null,nz=null,version=1}={}){
  self.onmessage({data:{type:'mesh',key:'0,0',cx:0,cz:0,version,data:data.buffer,px:px?.buffer||null,nx:nx?.buffer||null,pz:pz?.buffer||null,nz:nz?.buffer||null}});
  return messages.pop();
}

let arr=new Uint8Array(S*S*H);arr[index(3,10,4)]=3;
let out=mesh(arr).message;
assert.equal(out.opaque.empty,false);assert.equal(new Uint32Array(out.opaque.indices).length,36);assert.equal(out.water.empty,true);

arr=new Uint8Array(S*S*H);arr[index(3,10,4)]=8;
let result=mesh(arr);out=result.message;
assert.equal(out.opaque.empty,true);assert.equal(out.water.empty,false);assert.equal(new Uint32Array(out.water.indices).length,36);assert.equal(result.transfers.length,5);

arr=new Uint8Array(S*S*H);arr[index(3,10,4)]=8;arr[index(4,10,4)]=8;
out=mesh(arr).message;
assert.equal(new Uint32Array(out.water.indices).length,60,'adjacent water blocks must cull their internal face');

arr=new Uint8Array(S*S*H);arr[index(3,10,4)]=8;arr[index(4,10,4)]=3;
result=mesh(arr);out=result.message;
assert.equal(new Uint32Array(out.opaque.indices).length,36,'opaque block keeps the face bordering transparent water');
assert.equal(new Uint32Array(out.water.indices).length,30,'water face against a solid block is culled');
assert.equal(result.transfers.length,10,'opaque + water buffers are transferred independently');

arr=new Uint8Array(S*S*H);arr[index(15,10,4)]=8;
const px=new Uint8Array(S*S*H);px[index(0,10,4)]=8;
out=mesh(arr,{px,version:2}).message;
assert.equal(new Uint32Array(out.water.indices).length,30,'water must cull same-liquid faces across chunk boundaries');

console.log('water mesh pass checks: PASS');