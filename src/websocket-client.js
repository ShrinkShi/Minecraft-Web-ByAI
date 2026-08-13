import {encodeClientInputEnvelope} from './client-input-envelope.js';
import {nextNetworkSequence} from './network-sequence.js';
import {MULTIPLAYER_SUBPROTOCOL,decodeServerHandshake,encodeClientHello} from './multiplayer-handshake.js';

export const WEBSOCKET_CLIENT_STATES=Object.freeze(['idle','connecting','handshaking','ready','rejected','closed','error']);
export const DEFAULT_HANDSHAKE_TIMEOUT_MS=5000;
export const HANDSHAKE_TIMEOUT_CLOSE_CODE=4000;

function assertSocketFactory(factory){if(typeof factory!=='function')throw new TypeError('socketFactory must be a function');return factory;}
function assertCallback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function assertTimeout(value){if(!Number.isInteger(value)||value<250||value>60000)throw new RangeError('handshake timeout must be an integer from 250 to 60000 ms');return value;}

export function normalizeWebSocketUrl(value,{allowInsecure=false}={}){
  if(typeof value!=='string'||!value.trim())throw new TypeError('websocket url must be a non-empty string');
  let url;try{url=new URL(value);}catch{throw new RangeError('websocket url must be an absolute URL');}
  if(url.username||url.password)throw new RangeError('websocket url must not contain embedded credentials');
  if(url.protocol==='wss:')return url.href;
  if(url.protocol==='ws:'&&allowInsecure)return url.href;
  if(url.protocol==='ws:')throw new RangeError('insecure ws:// requires explicit allowInsecure=true');
  throw new RangeError('websocket url must use ws:// or wss://');
}

function parseServerMessage(data){
  if(typeof data!=='string')throw new TypeError('server websocket messages must be UTF-8 JSON text');
  let parsed;try{parsed=JSON.parse(data);}catch{throw new RangeError('server websocket message must contain valid JSON');}
  return decodeServerHandshake(parsed);
}

export class MultiplayerWebSocketClient{
  constructor({socketFactory,onStateChange=()=>{},onProtocolError=()=>{},handshakeTimeoutMs=DEFAULT_HANDSHAKE_TIMEOUT_MS,setTimer=setTimeout,clearTimer=clearTimeout,allowInsecure=false}={}){
    this.socketFactory=assertSocketFactory(socketFactory);this.onStateChange=assertCallback(onStateChange,'onStateChange');this.onProtocolError=assertCallback(onProtocolError,'onProtocolError');
    this.handshakeTimeoutMs=assertTimeout(handshakeTimeoutMs);this.setTimer=assertCallback(setTimer,'setTimer');this.clearTimer=assertCallback(clearTimer,'clearTimer');this.allowInsecure=!!allowInsecure;
    this.socket=null;this.state='idle';this.session=null;this.packetSeq=0;this.handshakeTimer=null;
  }

  setState(next,detail=null){if(this.state===next)return;this.state=next;this.onStateChange({state:next,detail});}
  clearHandshakeTimer(){if(this.handshakeTimer!==null){this.clearTimer(this.handshakeTimer);this.handshakeTimer=null;}}
  armHandshakeTimer(){
    this.clearHandshakeTimer();
    this.handshakeTimer=this.setTimer(()=>{
      this.handshakeTimer=null;
      if(this.state!=='handshaking')return;
      this.protocolFailure(new Error('multiplayer handshake timed out'),HANDSHAKE_TIMEOUT_CLOSE_CODE,'handshake timeout');
    },this.handshakeTimeoutMs);
  }

  connect(url){
    if(!['idle','closed','rejected','error'].includes(this.state))throw new Error(`cannot connect while websocket client is ${this.state}`);
    const normalized=normalizeWebSocketUrl(url,{allowInsecure:this.allowInsecure});
    this.clearHandshakeTimer();this.session=null;this.packetSeq=0;
    const socket=this.socketFactory(normalized,MULTIPLAYER_SUBPROTOCOL);
    if(!socket||typeof socket.addEventListener!=='function'||typeof socket.send!=='function'||typeof socket.close!=='function')throw new TypeError('socketFactory must return a WebSocket-compatible object');
    this.socket=socket;this.setState('connecting');
    socket.addEventListener('open',()=>this.handleOpen(socket));
    socket.addEventListener('message',event=>this.handleMessage(socket,event));
    socket.addEventListener('error',event=>this.handleError(socket,event));
    socket.addEventListener('close',event=>this.handleClose(socket,event));
    return normalized;
  }

  handleOpen(socket){
    if(socket!==this.socket||this.state!=='connecting')return;
    if(typeof socket.protocol==='string'&&socket.protocol!==MULTIPLAYER_SUBPROTOCOL){this.protocolFailure(new Error(`server did not negotiate websocket subprotocol ${MULTIPLAYER_SUBPROTOCOL}`),1002,'subprotocol mismatch');return;}
    this.setState('handshaking');socket.send(JSON.stringify(encodeClientHello()));this.armHandshakeTimer();
  }

  handleMessage(socket,event){
    if(socket!==this.socket)return;
    if(this.state!=='handshaking'){
      this.protocolFailure(new Error(`unexpected server message while websocket client is ${this.state}`),1002,'unexpected message');return;
    }
    let message;try{message=parseServerMessage(event?.data);}catch(error){this.protocolFailure(error,1002,'invalid handshake');return;}
    this.clearHandshakeTimer();
    if(message.kind==='reject'){
      this.session=null;this.setState('rejected',message.code);socket.close(1000,'server rejected connection');return;
    }
    this.session=message.session;this.packetSeq=0;this.setState('ready',message.session);
  }

  handleError(socket,event){
    if(socket!==this.socket)return;
    this.clearHandshakeTimer();this.session=null;this.setState('error',event||null);
  }

  handleClose(socket,event){
    if(socket!==this.socket)return;
    this.clearHandshakeTimer();this.session=null;
    if(this.state!=='rejected'&&this.state!=='error')this.setState('closed',event||null);
  }

  protocolFailure(error,code=1002,reason='protocol error'){
    this.clearHandshakeTimer();this.session=null;this.onProtocolError(error);
    const socket=this.socket;this.setState('error',error?.message||String(error));
    if(socket)try{socket.close(code,reason);}catch{}
  }

  sendInput(kind,payload){
    if(this.state!=='ready'||!this.session||!this.socket)throw new Error('websocket client is not ready');
    if(this.socket.readyState!==undefined&&this.socket.readyState!==1)throw new Error('websocket transport is not open');
    const envelope=encodeClientInputEnvelope({session:this.session,packetSeq:this.packetSeq,kind,payload});
    this.socket.send(JSON.stringify(envelope));this.packetSeq=nextNetworkSequence(this.packetSeq);return envelope;
  }

  close(code=1000,reason='client closed connection'){
    this.clearHandshakeTimer();this.session=null;
    const socket=this.socket;this.socket=null;
    if(socket)socket.close(code,reason);
    this.setState('closed',{code,reason});
  }
}
