import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyDevice} from '../src/device-profile.js';

const desktop=classifyDevice({ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151',maxTouchPoints:0,coarse:false,hoverNone:false,width:1440,height:900});
assert.equal(desktop.mobile,false);assert.equal(desktop.kind,'desktop');assert.equal(desktop.orientation,'landscape');
const android=classifyDevice({ua:'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Chrome/151 Mobile Safari/537.36',maxTouchPoints:5,coarse:true,hoverNone:true,width:844,height:390});
assert.equal(android.mobile,true);assert.equal(android.kind,'mobile');assert.equal(android.orientation,'landscape');
const iphone=classifyDevice({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) Mobile/15E148',maxTouchPoints:5,coarse:true,hoverNone:true,width:390,height:844});
assert.equal(iphone.mobile,true);assert.equal(iphone.orientation,'portrait');
const ipadDesktopUa=classifyDevice({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',maxTouchPoints:5,coarse:true,hoverNone:true,width:1366,height:1024});
assert.equal(ipadDesktopUa.mobile,true,'touch-first compact iPad should be mobile even with desktop UA');
const touchLaptop=classifyDevice({ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',maxTouchPoints:10,coarse:false,hoverNone:false,width:1920,height:1080});
assert.equal(touchLaptop.mobile,false,'touch-capable desktop with fine pointer/hover must stay desktop');
const uaData=classifyDevice({ua:'',uaDataMobile:true,width:800,height:360});assert.equal(uaData.mobile,true);

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8'),main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),player=readFileSync(new URL('../src/player.js',import.meta.url),'utf8'),ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),mobile=readFileSync(new URL('../src/mobile-controls.js',import.meta.url),'utf8'),desktopAdapter=readFileSync(new URL('../src/desktop-controls.js',import.meta.url),'utf8');
for(const token of ['mobile.css','id="rotate-device"','id="mobile-controls"','data-mobile-hold="attack"','data-mobile-action="use"','data-mobile-action="inventory"'])assert.ok(index.includes(token),`index missing ${token}`);
for(const token of ['new ControlIntentBus','new DesktopControls','new MobileControls','handleControlIntent','primaryActionStart','secondaryAction'])assert.ok(main.includes(token),`main missing ${token}`);
for(const token of ['controlState','setControlState','clearControlState','applyLookIntent'])assert.ok(player.includes(token),`player missing ${token}`);
for(const forbidden of ['virtualInput','setVirtualMove','setVirtualButton','window.addEventListener(\'keydown\'','document.addEventListener(\'mousemove\''])assert.ok(!player.includes(forbidden),`PlayerController must not own device input: ${forbidden}`);
for(const token of ['bus.setMove','bus.setButton','bus.action','bus.look'])assert.ok(mobile.includes(token),`mobile adapter missing ${token}`);
for(const token of ['bus.setMove','bus.setButton','bus.action','bus.look'])assert.ok(desktopAdapter.includes(token),`desktop adapter missing ${token}`);
assert.ok(ui.includes('data.hotbarIndex')||ui.includes('dataset.hotbarIndex'),'HUD hotbar must expose touch selection indexes');
console.log('mobile device/input adapter contracts: PASS');
