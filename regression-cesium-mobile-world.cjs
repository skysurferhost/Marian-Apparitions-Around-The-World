const assert=require('assert'),vm=require('vm'),fs=require('fs');const ctx={Math};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/cesium-mobile-world.js','utf8'),ctx);const {intersect,uv}=ctx.SKY_SURFER_MOBILE_WORLD;
const a=intersect({x:4,y:0,z:0},{x:-1,y:0,z:0});assert(Math.abs(a.x-1)<1e-10);assert.equal(intersect({x:4,y:0,z:0},{x:1,y:0,z:0}),null);assert.equal(intersect({x:4,y:0,z:0},{x:-1,y:1,z:0}),null);assert.deepEqual(Array.from(uv(a,1024,512)),[512,256]);assert.deepEqual(Array.from(uv({x:0,y:1,z:0},1024,512)),[768,256]);assert.deepEqual(Array.from(uv({x:0,y:0,z:1},1024,512)),[512,0]);console.log('PASS: software world perspective ray hits/misses, ECEF longitude/latitude mapping.');
const {screenFill,labelAlpha,projectPoint}=ctx.SKY_SURFER_MOBILE_WORLD;
const cam={positionWC:{x:4*6378137,y:0,z:0},frustum:{fovy:Math.PI/3}};
assert(screenFill(cam,380,500)<.64);assert.equal(labelAlpha(.6),0);assert(Math.abs(labelAlpha(.79)-.5)<1e-9);assert.equal(labelAlpha(1),1);
cam.positionWC.x=2*6378137;assert(screenFill(cam,380,500)>1);
const eye={x:2,y:0,z:0},dir={x:-1,y:0,z:0},right={x:0,y:1,z:0},up={x:0,y:0,z:1};
const pt=projectPoint({x:1,y:0,z:0},eye,dir,right,up,380,500,.45,.58);assert.equal(pt.x,190);assert.equal(pt.y,250);assert.equal(projectPoint({x:-1,y:0,z:0},eye,dir,right,up,380,500,.45,.58),null);
vm.runInContext(fs.readFileSync(__dirname+'/cesium-world-names.js','utf8'),ctx);assert.equal(ctx.SKY_SURFER_WORLD_NAMES.length,177);assert(ctx.SKY_SURFER_WORLD_NAMES.some(x=>x[0]==='France'));console.log('PASS: viewport-based fade, projected label visibility, 177 bundled Natural Earth country/territory anchors.');
