import {test,expect} from '@playwright/test';

test('multiplayer handshake and bootstrap timeouts use native browser timers safely',async({page})=>{
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));await page.goto('/?e2e=1');
  const result=await page.evaluate(async()=>{
    const {MultiplayerWebSocketClient,HANDSHAKE_TIMEOUT_CLOSE_CODE}=await import('/src/websocket-client.js');
    const {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome}=await import('/src/multiplayer-handshake.js');
    const {MultiplayerSessionBootstrap,WORLD_SYNC_TIMEOUT_CLOSE_CODE}=await import('/src/multiplayer-session-bootstrap.js');
    class FakeSocket{
      constructor(){this.protocol=MULTIPLAYER_SUBPROTOCOL;this.readyState=1;this.listeners=new Map();this.sent=[];this.closed=[];}
      addEventListener(type,handler){const list=this.listeners.get(type)||[];list.push(handler);this.listeners.set(type,list);}
      emit(type,event={}){for(const handler of this.listeners.get(type)||[])handler(event);}
      send(value){this.sent.push(value);}
      close(code,reason){this.closed.push({code,reason});this.readyState=3;}
    }
    const wait=ms=>new Promise(resolve=>globalThis.setTimeout(resolve,ms));

    const clearSocket=new FakeSocket(),clearErrors=[];
    const clearClient=new MultiplayerWebSocketClient({socketFactory:()=>clearSocket,allowInsecure:true,handshakeTimeoutMs:250,onProtocolError:error=>clearErrors.push(error.message)});
    clearClient.connect('ws://localhost/ws');clearSocket.emit('open');clearSocket.emit('message',{data:JSON.stringify(encodeServerWelcome('s:native-timer-clear'))});await wait(320);

    const timeoutSocket=new FakeSocket(),timeoutErrors=[];
    const timeoutClient=new MultiplayerWebSocketClient({socketFactory:()=>timeoutSocket,allowInsecure:true,handshakeTimeoutMs:250,onProtocolError:error=>timeoutErrors.push(error.message)});
    timeoutClient.connect('ws://localhost/ws');timeoutSocket.emit('open');await wait(320);

    let bootstrapCallbacks=null;const bootstrapClosed=[];
    const bootstrapClient={state:'idle',connect(){this.state='connecting';return 'ws://localhost/ws';},close(code,reason){bootstrapClosed.push({code,reason});this.state='closed';}};
    const bootstrap=new MultiplayerSessionBootstrap({worldSyncTimeoutMs:1000,clientFactory:options=>(bootstrapCallbacks=options,bootstrapClient)});
    bootstrap.connect('ws://localhost/ws');bootstrapClient.state='ready';bootstrapCallbacks.onStateChange({state:'ready',detail:'s:native-bootstrap'});await wait(1100);

    return{
      clear:{state:clearClient.state,closed:clearSocket.closed,errors:clearErrors},
      timeout:{state:timeoutClient.state,closed:timeoutSocket.closed,errors:timeoutErrors,expectedCode:HANDSHAKE_TIMEOUT_CLOSE_CODE},
      bootstrap:{state:bootstrap.state,error:bootstrap.lastError?.message||null,closed:bootstrapClosed,expectedCode:WORLD_SYNC_TIMEOUT_CLOSE_CODE}
    };
  });

  expect(result.clear).toEqual({state:'ready',closed:[],errors:[]});
  expect(result.timeout.state).toBe('error');expect(result.timeout.errors).toEqual(['multiplayer handshake timed out']);expect(result.timeout.closed).toEqual([{code:result.timeout.expectedCode,reason:'handshake timeout'}]);
  expect(result.bootstrap.state).toBe('failed');expect(result.bootstrap.error).toBe('multiplayer world synchronization timed out');expect(result.bootstrap.closed).toEqual([{code:result.bootstrap.expectedCode,reason:'world sync timeout'}]);
  expect(pageErrors.filter(message=>/illegal invocation/i.test(message))).toEqual([]);
});
