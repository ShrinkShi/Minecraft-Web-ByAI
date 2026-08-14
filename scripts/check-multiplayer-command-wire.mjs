import assert from 'node:assert/strict';
import {decodeMultiplayerCommandRequest,decodeMultiplayerCommandResult,encodeMultiplayerCommandRequest,encodeMultiplayerCommandResult,MAX_MULTIPLAYER_COMMAND_LENGTH,MULTIPLAYER_COMMAND_REQUEST_KIND,MULTIPLAYER_COMMAND_RESULT_KIND} from '../src/multiplayer-command-wire.js';

const session='s:command-wire';
const request=encodeMultiplayerCommandRequest({session,requestId:7,text:'  /give stick 3  '});
assert.deepEqual(request,{v:1,kind:MULTIPLAYER_COMMAND_REQUEST_KIND,session,requestId:7,text:'/give stick 3'});
assert.deepEqual(decodeMultiplayerCommandRequest({...request},{expectedSession:session}),request);
assert.throws(()=>decodeMultiplayerCommandRequest({...request,extra:true}),/fields are invalid/);
assert.throws(()=>decodeMultiplayerCommandRequest({...request,session:'s:other'},{expectedSession:session}),/session mismatch/);
assert.throws(()=>encodeMultiplayerCommandRequest({session,requestId:0,text:'hello'}),/start with/);
assert.throws(()=>encodeMultiplayerCommandRequest({session,requestId:0,text:'/'+ 'x'.repeat(MAX_MULTIPLAYER_COMMAND_LENGTH)}),/1 to 256/);
assert.throws(()=>encodeMultiplayerCommandRequest({session,requestId:0,text:'/help\n/give stick'}),/control line breaks/);

const result=encodeMultiplayerCommandResult({session,requestId:7,ok:true,code:'ok',message:'给予 木棍 × 3'});
assert.deepEqual(result,{v:1,kind:MULTIPLAYER_COMMAND_RESULT_KIND,session,requestId:7,ok:true,code:'ok',message:'给予 木棍 × 3'});
assert.deepEqual(decodeMultiplayerCommandResult({...result},{expectedSession:session}),result);
assert.throws(()=>encodeMultiplayerCommandResult({session,requestId:7,ok:true,code:'denied',message:'x'}),/ok\/code mismatch/);
assert.throws(()=>encodeMultiplayerCommandResult({session,requestId:7,ok:false,code:'wat',message:'x'}),/code is invalid/);
assert.throws(()=>decodeMultiplayerCommandResult({...result,requestId:-1}),/uint32/);

console.log('strict multiplayer command request/result wire protocol: PASS');
