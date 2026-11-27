/* Transparent OpenFreeMap/OpenMapTiles cartography for Cesium. No external JS dependency. */
'use strict';
(()=>{
 const root=typeof window==='undefined'?globalThis:window;
 const SIZE=512, SOURCE_MAX=14, DISPLAY_MAX=18;
 const source='https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';
 const credit='<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';
 const decoder=new TextDecoder();
 // Minimal bounded protobuf reader for the published Mapbox Vector Tile format.
 class PBF{
  constructor(bytes){this.b=bytes;this.p=0;}
  num(){let v=0,f=1;for(let i=0;i<10;i++){if(this.p>=this.b.length)throw Error('Truncated vector tile');const c=this.b[this.p++];v+=(c&127)*f;if(c<128)return v;f*=128;}throw Error('Invalid vector tile integer');}
  bytes(){const n=this.num(),p=this.p;this.p+=n;if(this.p>this.b.length||!Number.isSafeInteger(n))throw Error('Invalid vector tile length');return this.b.subarray(p,this.p);}
  string(){return decoder.decode(this.bytes());}
  skip(w){if(w===0)this.num();else if(w===2)this.bytes();else if(w===1)this.p+=8;else if(w===5)this.p+=4;else throw Error('Unknown vector tile field');if(this.p>this.b.length)throw Error('Truncated vector tile field');}
  fields(f){while(this.p<this.b.length){const t=this.num(),n=Math.floor(t/8),w=t%8;if(!f(n,w))this.skip(w);}}
 }
 const zig=n=>n%2?-(n+1)/2:n/2;
 function packed(bytes){const p=new PBF(bytes),a=[];while(p.p<bytes.length)a.push(p.num());return a;}
 function value(bytes){let v;const p=new PBF(bytes);p.fields((n,w)=>{if(n===1&&w===2)v=p.string();else if(n>=4&&n<=7&&w===0){const x=p.num();v=n===6?zig(x):n===7?Boolean(x):x;}else if((n===2&&w===5)||(n===3&&w===1)){const d=new DataView(p.b.buffer,p.b.byteOffset+p.p,w===5?4:8);v=w===5?d.getFloat32(0,true):d.getFloat64(0,true);p.p+=w===5?4:8;}else return false;return true;});return v;}
 function geometry(a){let x=0,y=0,i=0,line=null,paths=[];while(i<a.length){const command=a[i++],id=command%8,count=Math.floor(command/8);if(!count||count>1000000)throw Error('Invalid MVT geometry command');if(id===7){if(line?.length)line.push(line[0]);continue;}if(id!==1&&id!==2)throw Error('Unsupported MVT geometry');for(let j=0;j<count;j++){if(i+1>=a.length)throw Error('Incomplete MVT geometry');x+=zig(a[i++]);y+=zig(a[i++]);if(id===1||!line){line=[];paths.push(line);}line.push([x,y]);}}return paths;}
 const wanted=new Set(['place','boundary','transportation','transportation_name','water_name','waterway','mountain_peak','poi','building']);
 // Decode only selected layers; feature tags may occur before the key/value tables.
 function parse(buffer){const result=Object.create(null),reader=new PBF(new Uint8Array(buffer));reader.fields((n,w)=>{if(n!==3||w!==2)return false;const p=new PBF(reader.bytes());let name='',extent=4096;const keys=[],values=[],raw=[];p.fields((k,t)=>{if(k===1&&t===2)name=p.string();else if(k===2&&t===2)raw.push(p.bytes());else if(k===3&&t===2)keys.push(p.string());else if(k===4&&t===2)values.push(value(p.bytes()));else if(k===5&&t===0)extent=p.num();else return false;return true;});if(!wanted.has(name)||!extent)return true;
 const fs=[];for(const b of raw){let type=0,tags=[],g=[];const f=new PBF(b);f.fields((k,t)=>{if(k===2&&t===2)tags=packed(f.bytes());else if(k===3&&t===0)type=f.num();else if(k===4&&t===2)g=packed(f.bytes());else return false;return true;});if(!g.length||(type===3&&name!=='building')||(name==='building'&&type!==3))continue;const props=Object.create(null);for(let i=0;i+1<tags.length;i+=2)if(keys[tags[i]]!==undefined)props[keys[tags[i]]]=values[tags[i+1]];fs.push({type,props,g});}result[name]={extent,fs};return true;});return result;}
 const nameOf=p=>String(p['name:en']||p.name_en||p.name||p['name:latin']||p.ref||'').trim();
 function placeRule(p,z){const c=p.class,rank=Number.isFinite(Number(p.rank))?Number(p.rank):99;
  if(c==='continent')return z<=2?[13,1000]:null;
  if(c==='country')return z<=7&&(z>=3||rank<= (z===0?4:z===1?5:7))?[z<4?10:13,950-rank]:null;
  if(c==='state'||c==='province'||c==='region')return z>=5&&z<=10?[12,800-rank]:null;
  if(c==='city')return z>=4&&z<=14&&(z>=6||rank<=4||p.capital)?[z<7?11:13,700-rank]:null;
  if(c==='town')return z>=8&&z<=16?[12,580-rank]:null;
  if(c==='village')return z>=11?[11,450-rank]:null;
  if(['suburb','quarter','neighbourhood','hamlet','isolated_dwelling'].includes(c))return z>=13?[10,400-rank]:null;
  if(c==='island'||c==='islet')return z>=6?[11,350-rank]:null;
  return z>=11?[10,300-rank]:null;
 }
 function roadRule(p,z){const c=p.class;
  if(['motorway','trunk'].includes(c))return z>=7?[1.65,220]:null;
  if(['primary','secondary'].includes(c))return z>=10?[1.4,205]:null;
  if(['tertiary'].includes(c))return z>=12?[1.15,190]:null;
  if(['minor','residential','service','unclassified'].includes(c))return z>=14?[.8,155]:null;
  if(['path','track','pedestrian'].includes(c))return z>=16?[.6,110]:null;
  if(c==='rail')return z>=12?[.8,130]:null;
  return null;
 }
 // Clip a segment against this tile (Liang–Barsky) for stable road-label anchors on overzoomed children.
 function clip(a,b,pad=10){let [x,y]=a,dx=b[0]-x,dy=b[1]-y,t0=0,t1=1;for(const [p,q] of [[-dx,x-pad],[dx,SIZE-pad-x],[-dy,y-pad],[dy,SIZE-pad-y]]){if(!p){if(q<0)return null;continue;}const t=q/p;if(p<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);if(t0>t1)return null;}return [[x+t0*dx,y+t0*dy],[x+t1*dx,y+t1*dy]];}
 function render(data,x,y,z,srcZ,srcX,srcY){const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;const ctx=canvas.getContext('2d');if(!ctx)return canvas;const factor=2**(z-srcZ),ox=x-srcX*factor,oy=y-srcY*factor;
  const candidates=[],occupied=[],seen=new Set();
  function entries(layer,fn){const l=data[layer];if(!l)return;for(const f of l.fs){const map=()=>{if(!f.paths){f.paths=geometry(f.g);f.g=null;}return f.paths.map(path=>path.map(([u,v])=>[(u/l.extent*factor-ox)*SIZE,(v/l.extent*factor-oy)*SIZE]));};fn(f.props,map,f.type);}}
  function drawLines(paths,color,width,dash=[]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(const path of paths){if(path.length<2)continue;ctx.moveTo(...path[0]);for(let i=1;i<path.length;i++)ctx.lineTo(...path[i]);}ctx.stroke();ctx.setLineDash([]);}
  entries('boundary',(p,map)=>{const level=Number(p.admin_level);if(p.maritime||level>4||(!level)||(level>2&&z<5)||z>15)return;drawLines(map(),level===2?'rgba(255,244,211,.53)':'rgba(255,255,255,.30)',level===2?1.05:.75,[6,5]);});
  entries('transportation',(p,map)=>{const rule=roadRule(p,z);if(!rule||p.brunnel==='tunnel')return;const paths=map();drawLines(paths,'rgba(15,20,25,.38)',rule[0]+.8);drawLines(paths,['motorway','trunk'].includes(p.class)?'rgba(255,216,142,.55)':'rgba(248,245,227,.37)',rule[0]*.8);});
  function addPoint(p,map,rule,color,layer){if(!rule)return;const text=nameOf(p);if(!text)return;const a=map()[0]?.[0];if(!a)return;candidates.push({text,x:a[0],y:a[1],size:rule[0],priority:rule[1],color,angle:0,layer});}
  function addLine(p,map,rule,color,layer){if(!rule)return;const text=nameOf(p);if(!text)return;let best=null,len=0;for(const path of map()){for(let i=1;i<path.length;i++){const s=clip(path[i-1],path[i],15);if(!s)continue;const dx=s[1][0]-s[0][0],dy=s[1][1]-s[0][1],l=Math.hypot(dx,dy);if(l>len){len=l;best={x:(s[0][0]+s[1][0])/2,y:(s[0][1]+s[1][1])/2,angle:Math.atan2(dy,dx)};}}}if(!best||len<18)return;if(best.angle>Math.PI/2)best.angle-=Math.PI;if(best.angle< -Math.PI/2)best.angle+=Math.PI;candidates.push({...best,text,size:rule[0],priority:rule[1],color,layer});}
  entries('place',(p,map)=>addPoint(p,map,placeRule(p,z),'#fffdf5','place'));
  entries('water_name',(p,map,type)=>{const rule=z>=4?[11,260]:null;if(type===1)addPoint(p,map,rule,'#c4e9ff','water');else addLine(p,map,rule,'#c4e9ff','water');});
  entries('transportation_name',(p,map,type)=>{const r=roadRule(p,z);if(z<10||!r)return;const rule=[10,r[1]];if(type===1)addPoint(p,map,rule,'#fff1ca','road');else addLine(p,map,rule,'#fff1ca','road');});
  entries('mountain_peak',(p,map)=>addPoint(p,map,z>=11?[10,240]:null,'#f1ead7','peak'));
  entries('poi',(p,map)=>{if(z<14||!['place_of_worship','hospital','school','park','museum','attraction','monument','railway','airport','university','town_hall','library','castle'].includes(p.class)&&!['church','cathedral','chapel','shrine','museum','hospital','school','park','station','monastery'].includes(p.subclass))return;addPoint(p,map,[10,100-(Number(p.rank)||0)],'#fffdf5','poi');});
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  candidates.sort((a,b)=>b.priority-a.priority);for(const c of candidates){if(occupied.length>=(z<=2?8:z<=5?12:z<=10?19:25))break;const key=c.layer+'|'+c.text;if(seen.has(key))continue;ctx.font=`${c.layer==='place'?'500':'400'} ${c.size}px Arial, sans-serif`;let text=c.text;while(text.length>10&&ctx.measureText(text).width>SIZE*.78)text=text.slice(0,-2)+'…';const w=ctx.measureText(text).width+18,h=c.size+12,cos=Math.abs(Math.cos(c.angle)),sin=Math.abs(Math.sin(c.angle)),bw=w*cos+h*sin,bh=w*sin+h*cos;const b=[c.x-bw/2,c.y-bh/2,c.x+bw/2,c.y+bh/2];if(b[0]<2||b[1]<2||b[2]>SIZE-2||b[3]>SIZE-2||occupied.some(a=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1]))continue;occupied.push(b);seen.add(key);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.strokeStyle='rgba(12,20,28,.84)';ctx.lineWidth=2.1;ctx.strokeText(text,0,0);ctx.fillStyle=c.color;ctx.fillText(text,0,0);ctx.restore();}
  return canvas;
 }
 // Shared bounded decoded tile cache for cartography and optional 3D building geometry.
 const cache=new Map();
 function loadTile(C,x,y,z,request){const key=`${z}/${x}/${y}`;let promise=cache.get(key);if(promise){cache.delete(key);cache.set(key,promise);return promise;}
  const url=source.replace('{z}',z).replace('{x}',x).replace('{y}',y),resource=C?new C.Resource({url,request}):null;const download=resource?resource.fetchArrayBuffer():fetch(url).then(r=>{if(!r.ok)throw Error(`Vector tile HTTP ${r.status}`);return r.arrayBuffer();});if(download===undefined)return undefined;
  promise=Promise.resolve(download).then(parse);cache.set(key,promise);promise.catch(()=>{if(cache.get(key)===promise)cache.delete(key);});const limit=typeof matchMedia==='function'&&matchMedia('(max-width:800px)').matches?48:80;while(cache.size>limit)cache.delete(cache.keys().next().value);return promise;
 }
 function create(C){const scheme=new C.WebMercatorTilingScheme();const provider=new C.UrlTemplateImageryProvider({url:source,tilingScheme:scheme,tileWidth:SIZE,tileHeight:SIZE,hasAlphaChannel:true,maximumLevel:DISPLAY_MAX,credit:new C.Credit(credit,false),enablePickFeatures:false});
  provider.requestImage=(x,y,z,request)=>{const sz=Math.min(z,SOURCE_MAX),factor=2**(z-sz),sx=Math.floor(x/factor),sy=Math.floor(y/factor);const promise=loadTile(C,sx,sy,sz,request);if(promise===undefined)return undefined;return promise.then(data=>render(data,x,y,z,sz,sx,sy));};return provider;
 }
 root.SKY_SURFER_CESIUM_LABELS={create,parse,geometry,placeRule,roadRule,render,loadTile,credit};
})();
