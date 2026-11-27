const assert=require('assert'),vm=require('vm'),fs=require('fs');
const listeners={},docListeners={},queue=new Map();let serial=0,active=true,flight=0,render=0;
const dialogs={apparitionsDirectory:{hidden:true},mediaOverlay:{hidden:true}};
const doc={hidden:false,activeElement:null,getElementById:id=>dialogs[id],addEventListener:(k,f)=>docListeners[k]=f};
const ctx={Math,URLSearchParams,document:doc,addEventListener:(k,f)=>listeners[k]=f,requestAnimationFrame:f=>{queue.set(++serial,f);return serial;},cancelAnimationFrame:id=>queue.delete(id)};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/globe-navigation.js','utf8'),ctx);
const {advance,viewLight,daylightShade,initialMode,install}=ctx.SKY_SURFER_GLOBE_NAV;
const R=6378137,rad=Math.PI/180;
// Verify a modest increase in speed, including the capped world-scale case.
for(const h of [100,10000,22000000]){const old=Math.min(h*.72/R,.7)*.02;const actual=advance(0,0,h,0,0,1,.02).lat;assert(actual/old>1.13&&actual/old<1.15); }
assert(advance(0,0,1e7,0,0,1,.02).lat>0);assert(advance(0,0,1e7,0,1,0,.02).lon>0);assert(advance(0,0,1e7,0,0,-1,.02).lat<0);assert(advance(0,0,1e7,0,-1,0,.02).lon<0);
assert(advance(0,0,1000,Math.PI/2,0,1,.02).lon>0);assert(advance(0,0,1000,0,1,0,.02).lon<advance(0,0,10000,0,1,0,.02).lon);
assert(advance(Math.PI-.00001,0,1e7,0,1,0,.05).lon<0);assert(advance(0,89.94*rad,1e7,0,0,1,.05).lat<=89.95*rad);
for(const p of [{x:4,y:0,z:0},{x:-4,y:0,z:0},{x:0,y:3,z:1},{x:0,y:0,z:-5}]){const l=viewLight(p),m=Math.hypot(p.x,p.y,p.z);assert(Math.abs(Math.hypot(l.x,l.y,l.z)-1)<1e-10);assert(Math.abs((p.x*l.x+p.y*l.y+p.z*l.z)/m-1)<1e-10);assert.equal(daylightShade(1,22000000),1);}
assert.equal(daylightShade(0,6500000),1);assert(Math.abs(daylightShade(-.2,22000000)-.07)<1e-9);assert.equal(daylightShade(.5,22000000),1);assert(daylightShade(0,22000000)<.4);assert(daylightShade(-.2,8000000)>.5);
const front={x:1,y:0,z:0},right={x:0,y:1,z:0},up={x:0,y:0,z:1};
const lit=viewLight(front,right,up,22000000);assert(lit.y<0&&lit.z>0&&lit.x>.5);assert(Math.abs(Math.hypot(lit.x,lit.y,lit.z)-1)<1e-10);
const opposite=viewLight({x:-1,y:0,z:0},{x:0,y:-1,z:0},up,22000000);assert(Math.abs(opposite.x+lit.x)<1e-10&&Math.abs(opposite.y+lit.y)<1e-10&&Math.abs(opposite.z-lit.z)<1e-10);
const close=viewLight(front,right,up,1000);assert.equal(close.x,1);assert.equal(close.y,0);assert.equal(close.z,0);
// Representative surface samples: central day and lower-right night at world scale.
const lightDot=(v)=>v.x*lit.x+v.y*lit.y+v.z*lit.z;
assert.equal(daylightShade(lightDot(front),22000000),1);
assert(daylightShade(lightDot({x:.43589,y:.72,z:-.54}),22000000)<.15);
assert.equal(daylightShade(lightDot({x:.43589,y:-.72,z:.54}),22000000),1);assert.equal(initialMode(''),'cesium');assert.equal(initialMode('?view=globe'),'cesium');assert.equal(initialMode('?view=cesium'),'cesium');assert.equal(initialMode('?view=map'),'satellite');assert.equal(initialMode('?view=satellite'),'satellite');assert.equal(initialMode('?view=invalid'),'cesium');
const camera={positionCartographic:{longitude:0,latitude:0,height:100000},heading:0,pitch:-1,roll:0,cancelFlight(){flight++},setView({destination,orientation}){this.positionCartographic=destination;Object.assign(this,orientation);}};
const viewer={camera,scene:{requestRender(){render++}}};const nav=install({Cartesian3:{fromRadians:(longitude,latitude,height)=>({longitude,latitude,height})}},viewer,()=>active);
const event=(key,target=null,extra={})=>({key,target,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...extra});
function frame(t){const [id,f]=queue.entries().next().value;queue.delete(id);f(t)}
let e=event('w');listeners.keydown(e);assert(e.prevented&&e.stopped);assert.equal(flight,1);frame(100);assert(camera.positionCartographic.latitude>0);assert.equal(camera.positionCartographic.height,100000);assert.equal(camera.pitch,-1);assert.equal(render,1);frame(116);assert.equal(render,2);listeners.keyup(event('w'));assert.equal(queue.size,0);
listeners.keydown(event('ArrowRight'));frame(150);assert(camera.positionCartographic.longitude>0);listeners.blur();assert.equal(queue.size,0);
e=event('a',{closest:()=>true});listeners.keydown(e);assert(!e.prevented&&!queue.size);dialogs.mediaOverlay.hidden=false;e=event('ArrowLeft');listeners.keydown(e);assert(!e.prevented);dialogs.mediaOverlay.hidden=true;active=false;e=event('s');listeners.keydown(e);assert(!e.prevented);active=true;e=event('w',null,{ctrlKey:true});listeners.keydown(e);assert(!e.prevented);listeners.keydown(event('d'));nav.stop();assert.equal(queue.size,0);
const html=fs.readFileSync(__dirname+'/index.html','utf8');assert(!html.includes('id="viewModeLabel"'));assert(!html.includes('<summary>Globe diagnostics'));assert(html.includes('id="cesiumDiagnostics" hidden inert'));assert(html.includes('globe-navigation.js?v=1.90'));
console.log('PASS: WASD/arrows, altitude-scaled camera movement, orientation and altitude preservation, focus/dialog/modifier safeguards, release/blur/mode cleanup, camera-relative daylight, upper-left light and lower-right twilight crescent and default view, hidden diagnostics and removed version overlay.');
