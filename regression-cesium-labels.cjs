const assert=require('node:assert/strict');
const draws=[];const strokes=[];
const ctx={setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes.push(1)},save(){},restore(){},translate(){},rotate(){},strokeText(){},fillText(t){draws.push(t)},measureText(t){return{width:t.length*7}}};
global.document={createElement(){return{getContext:()=>ctx}}};require('./cesium-labels.js');const L=global.SKY_SURFER_CESIUM_LABELS;
const varint=n=>{const out=[];while(n>127){out.push(n%128+128);n=Math.floor(n/128)}out.push(n);return out};const field=(n,a)=>[...varint(n*8+2),...varint(a.length),...a];const int=(n,a)=>[...varint(n*8),...varint(a)];const str=(n,s)=>field(n,[...Buffer.from(s)]);const val=s=>field(4,str(1,s));const zz=n=>n<0?-2*n-1:2*n;
function layer(name,cls,label,type,geom){const f=[...field(2,[0,0,1,1]),...int(3,type),...field(4,geom.flatMap(varint))];return field(3,[...str(1,name),...field(2,f),...str(3,'class'),...str(3,'name'),...val(cls),...val(label),...int(5,4096),...int(15,2)]);}
const pt=layer('place','country','France',1,[9,zz(2048),zz(2048)]), city=layer('place','city','Paris',1,[9,zz(2048),zz(2048)]), road=layer('transportation_name','minor','Rue de Test',2,[9,zz(100),zz(1000),10,zz(1700),zz(0)]), path=layer('transportation','minor','Rue de Test',2,[9,zz(100),zz(1000),10,zz(1700),zz(0)]);
const raw=a=>Uint8Array.from(a).buffer;
assert.equal(L.parse(raw(pt)).place.fs[0].props.name,'France');assert.deepEqual(L.geometry([9,4,6,10,2,3]),[[[2,3],[3,1]]]);
L.render(L.parse(raw(pt)),0,0,3,3,0,0);assert(draws.includes('France'));draws.length=0;
L.render(L.parse(raw(city)),0,0,9,9,0,0);assert(draws.includes('Paris'));draws.length=0;
L.render(L.parse(raw([...road,...path])),0,0,15,14,0,0);assert(draws.includes('Rue de Test'));assert(strokes.length>0);draws.length=0;
let calls=0;class Provider{constructor(options){this.options=options;}}class Resource{constructor(options){assert(options.url.includes('/14/'));}fetchArrayBuffer(){calls++;return Promise.resolve(raw(road));}}
const C={UrlTemplateImageryProvider:Provider,WebMercatorTilingScheme:class{},Credit:class{},Resource};
(async()=>{const p=L.create(C);const [a,b]=await Promise.all([p.requestImage(0,0,15,{}),p.requestImage(1,0,15,{})]);assert.equal(calls,1);assert.equal(a.width,512);assert.equal(b.height,512);assert.equal(p.options.maximumLevel,18);assert.equal(p.options.enablePickFeatures,false);console.log('PASS: synthetic MVT decode, country/city/street rendering, road strokes, 512px alpha canvas, overzoom parent cache reuse.');})().catch(e=>{console.error(e);process.exitCode=1});
