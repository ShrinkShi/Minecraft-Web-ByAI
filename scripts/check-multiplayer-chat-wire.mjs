import assert from 'node:assert/strict';
import {decodeMultiplayerChatSend,decodeMultiplayerChatMessage,encodeMultiplayerChatSend,encodeMultiplayerChatMessage,MAX_MULTIPLAYER_CHAT_LENGTH,MULTIPLAYER_CHAT_SEND_KIND,MULTIPLAYER_CHAT_MESSAGE_KIND} from '../src/multiplayer-chat-wire.js';

const session='s:chat-wire';
const send=encodeMultiplayerChatSend({session,clientSeq:7,text:'  你好，世界  '});
assert.deepEqual(send,{v:1,kind:MULTIPLAYER_CHAT_SEND_KIND,session,clientSeq:7,text:'你好，世界'});
assert.deepEqual(decodeMultiplayerChatSend({...send},{expectedSession:session}),send);
assert.throws(()=>decodeMultiplayerChatSend({...send,sender:'s:spoof'}),/fields are invalid/,'clients must not submit sender identity');
assert.throws(()=>decodeMultiplayerChatSend({...send,session:'s:other'},{expectedSession:session}),/session mismatch/);
assert.throws(()=>encodeMultiplayerChatSend({session,clientSeq:0,text:'/give stick 1'}),/command prefix/,'slash commands must stay on the command channel');
assert.throws(()=>encodeMultiplayerChatSend({session,clientSeq:0,text:'hello\nworld'}),/control line breaks/);
assert.throws(()=>encodeMultiplayerChatSend({session,clientSeq:0,text:'x'.repeat(MAX_MULTIPLAYER_CHAT_LENGTH+1)}),/1 to 256/);
assert.throws(()=>encodeMultiplayerChatSend({session,clientSeq:-1,text:'hello'}),/uint32/);

const message=encodeMultiplayerChatMessage({messageSeq:11,sender:session,text:'server-validated text'});
assert.deepEqual(message,{v:1,kind:MULTIPLAYER_CHAT_MESSAGE_KIND,messageSeq:11,sender:session,text:'server-validated text'});
assert.deepEqual(decodeMultiplayerChatMessage({...message}),message);
assert.throws(()=>decodeMultiplayerChatMessage({...message,session}),/fields are invalid/);
assert.throws(()=>decodeMultiplayerChatMessage({...message,messageSeq:2**32}),/uint32/);

console.log('strict multiplayer chat send/broadcast wire contract: PASS');
