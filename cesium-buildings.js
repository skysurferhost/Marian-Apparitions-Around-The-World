/* v1.70: bounded 3D building footprints with mapped facade colors and aerial-sampled roof colors.
   No Cesium ion token, no remote 3D Tiles subscription, no terrain-height claim. */
'use strict';
(()=>{
 const Z=14,N=2**Z,rad=Math.PI/180;
 const area=r=>r.reduce((s,a,i)=>{const b=r[(i+1)%r.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
 function tileXY(lon,lat){const phi=Math.max(-85.05112878,Math.min(85.05112878,lat))*rad;return [Math.max(0,Math.min(N-1,Math.floor((lon+180)/360*N))),Math.max(0,Math.min(N-1,Math.floor((1-Math.asinh(Math.tan(phi))/Math.PI)/2*N)))];}
 function lonlat(x,y,u,v,extent){return [(x+u/extent)/N*360-180,Math.atan(Math.sinh(Math.PI*(1-2*(y+v/extent)/N)))/rad];}
 function footprints(data,x,y,limit=650){const l=data.building;if(!l)return [];const out=[];for(const f of l.fs){const p=f.props;if(p.hide_3d===true||p.hide_3d===1||p.hide_3d==='true'||p.hide_3d==='1')continue;let top=Number(p.render_height),bottom=Number(p.render_min_height)||0;if(!Number.isFinite(top)||top<=0)top=6;top=Math.min(top,1000);bottom=Math.max(0,Math.min(bottom,top-1));
   let group=null;let rings;try{rings=f.paths||(f.paths=window.SKY_SURFER_CESIUM_LABELS.geometry(f.g));}catch(_){continue;}
   for(const original of rings){const r=original.filter((a,i)=>!i||a[0]!==original[i-1][0]||a[1]!==original[i-1][1]);if(r.length>3&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1])r.pop();if(r.length<3)continue;const a=area(r);if(Math.abs(a)<3)continue;
    if(a>0){const u=r.reduce((s,p)=>s+p[0],0)/r.length,v=r.reduce((s,p)=>s+p[1],0)/r.length;group=null;if(u<0||v<0||u>=l.extent||v>=l.extent)continue;group={outer:r,holes:[],top,bottom,area:a,props:p};out.push(group);}else if(group)group.holes.push(r);
   }
  }return out.sort((a,b)=>b.area-a.area).slice(0,limit).map(p=>({...p,outer:p.outer.flatMap(([u,v])=>lonlat(x,y,u,v,l.extent)),holes:p.holes.map(r=>r.flatMap(([u,v])=>lonlat(x,y,u,v,l.extent)))}));}
 // Never issue extra imagery requests. Read only already-delivered, explicitly
 // reusable regional photos; bounded session cache, no persistent storage.
 const raster=new Map(), ids=new WeakMap(), levels=new Map(), SIZE=128;let nextId=0,revision=0,canvas;
 function capture(provider,x,y,z,image){if(z<17||!image?.width||!image?.height||!provider?.tilingScheme)return;
  try{if(!ids.has(provider))ids.set(provider,++nextId);const key=`${ids.get(provider)}/${z}/${x}/${y}`;if(raster.has(key))return;
   if(!canvas){canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;}const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,SIZE,SIZE);ctx.drawImage(image,0,0,SIZE,SIZE);const pixels=ctx.getImageData(0,0,SIZE,SIZE).data;
   raster.set(key,pixels);const levelKey=`${ids.get(provider)}/${z}`;levels.set(levelKey,(levels.get(levelKey)||0)+1);while(raster.size>112){const old=raster.keys().next().value;const k=old.split('/').slice(0,2).join('/');const n=levels.get(k)-1;if(n)levels.set(k,n);else levels.delete(k);raster.delete(old);}revision++;
  }catch(_){canvas=null;} // CORS/tainted canvas: retain the neutral roof palette.
 }
 const rgbHex=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
 const named={white:'#ffffff',black:'#000000',grey:'#808080',gray:'#808080',red:'#b44b3e',brown:'#805d42',beige:'#d3c2a4',yellow:'#dfc582',orange:'#c48252',green:'#668267',blue:'#627d9c',cream:'#e4d9b9',tan:'#c0a481',silver:'#b7b7b7'};
 function colorTag(v){if(typeof v!=='string')return null;v=v.trim().toLowerCase();if(/^#[0-9a-f]{6}$/.test(v))return v;if(/^#[0-9a-f]{3}$/.test(v))return '#'+v.slice(1).split('').map(c=>c+c).join('');return named[v]||null;}
 function hash(p){let h=2166136261;for(const v of p.outer){h=Math.imul(h^Math.round(v*1e6),16777619);}return h>>>0;}
 function palette(p){const h=hash(p),q=p.props||{},explicit=colorTag(q.colour||q['building:colour']||q.color),roof=colorTag(q['roof:colour']||q['roof:color']);
  const walls=['#a59b89','#b4a38c','#a99d93','#b4b0a2','#998779','#c0ad94','#9e9c94','#b6afa0'];
  const roofs=['#706b64','#84746b','#8a5747','#817c74','#925f49','#68696a','#a47b62','#797473'];
  return {wall:explicit||walls[h%walls.length],roof:roof||roofs[(h>>>8)%roofs.length],explicitRoof:!!roof};
 }
 function contains(r,x,y){let inside=false;for(let i=0,j=r.length-2;i<r.length;j=i,i+=2){const a=r[i],b=r[i+1],c=r[j],d=r[j+1];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
 function samplePoints(p){const r=p.outer;let w=Infinity,e=-Infinity,s=Infinity,n=-Infinity;for(let i=0;i<r.length;i+=2){w=Math.min(w,r[i]);e=Math.max(e,r[i]);s=Math.min(s,r[i+1]);n=Math.max(n,r[i+1]);}const pts=[];for(const a of [.28,.5,.72])for(const b of [.28,.5,.72]){const x=w+(e-w)*a,y=s+(n-s)*b;if(contains(r,x,y)&&!p.holes.some(h=>contains(h,x,y)))pts.push([x,y]);}return pts;}
 function sampleAt(C,provider,lon,lat,z){const id=ids.get(provider);if(!id)return null;const ts=provider.tilingScheme,pos=C.Cartographic.fromDegrees(lon,lat),xy=ts.positionToTileXY(pos,z);if(!xy)return null;const pixels=raster.get(`${id}/${z}/${xy.x}/${xy.y}`);if(!pixels)return null;const r=ts.tileXYToRectangle(xy.x,xy.y,z),merc=ts instanceof C.WebMercatorTilingScheme;const my=v=>merc?Math.asinh(Math.tan(v)):v;
  const u=(pos.longitude-r.west)/(r.east-r.west),v=(my(r.north)-my(pos.latitude))/(my(r.north)-my(r.south));if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||v<0||u>1||v>1)return null;const i=(Math.min(SIZE-1,Math.floor(v*SIZE))*SIZE+Math.min(SIZE-1,Math.floor(u*SIZE)))*4;
  const [a,b,c,d]=pixels.subarray(i,i+4);if(d<240||Math.max(a,b,c)<22||Math.min(a,b,c)>247||b>a*1.18&&b>c*1.12)return null;return [a,b,c];
 }
 function roofSample(C,p,providers){if(!raster.size||!providers.length)return null;const pts=samplePoints(p);if(pts.length<2)return null;for(let z=21;z>=17;z--)for(const provider of providers){if(!levels.has(`${ids.get(provider)}/${z}`)||z>(provider.maximumLevel??21))continue;try{const colors=pts.map(([x,y])=>sampleAt(C,provider,x,y,z)).filter(Boolean);if(colors.length<Math.max(2,Math.ceil(pts.length*.45)))continue;
    const med=[0,1,2].map(i=>{const v=colors.map(c=>c[i]).sort((a,b)=>a-b);return v[Math.floor(v.length/2)];});const deviations=colors.map(c=>Math.max(...c.map((v,i)=>Math.abs(v-med[i])))).sort((a,b)=>a-b);if(deviations[Math.floor(deviations.length/2)]>55)continue;
    return {color:rgbHex(med.map(v=>Math.max(38,Math.min(205,v*.91)))),score:z};
   }catch(_){} }return null;
 }
 function create(C,viewer,isPhone,log,getProviders=()=>[]){const tiles=new Map();let desired=new Set(),inflight=0,enabled=true,epoch=0;const collection=viewer.scene.primitives;
  function drop(k,t){if(t.primitive)collection.remove(t.primitive);tiles.delete(k);}
  function clear(){epoch++;desired.clear();for(const [k,t] of tiles)drop(k,t);}
  function make(data,x,y,t){const polygons=footprints(data,x,y,isPhone()?350:650),instances=[],roofs=[];const providers=getProviders();for(const p of polygons){try{const hierarchy=new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(p.outer),p.holes.map(r=>new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(r))));const colors=palette(p),sample=colors.explicitRoof?null:roofSample(C,p,providers);const base={polygonHierarchy:hierarchy,vertexFormat:C.PerInstanceColorAppearance.VERTEX_FORMAT,arcType:C.ArcType.GEODESIC};
    const wall=new C.PolygonGeometry({...base,height:p.top,extrudedHeight:p.bottom,closeTop:false});const roof=new C.PolygonGeometry({...base,height:p.top});const id=`roof-${roofs.length}`;
    const instance=(geometry,color,id)=>new C.GeometryInstance({geometry,id,attributes:{color:C.ColorGeometryInstanceAttribute.fromColor(C.Color.fromCssColorString(color))}});
    instances.push(instance(wall,colors.wall),instance(roof,sample?.color||colors.roof,id));roofs.push({id,p,score:sample?.score||0,explicit:colors.explicitRoof});
   }catch(_){} }
   t.roofs=roofs;t.revision=revision;t.checked=Date.now();t.cursor=0;if(!instances.length)return null;return collection.add(new C.Primitive({geometryInstances:instances,appearance:new C.PerInstanceColorAppearance({closed:false,translucent:false}),asynchronous:true,allowPicking:false,releaseGeometryInstances:true}));}
  function refine(t){if(!t.primitive?.ready||t.revision===revision||Date.now()-t.checked<350)return;t.checked=Date.now();const providers=getProviders();if(!providers.length)return;
   const batch=(t.roofs||[]).slice(t.cursor,t.cursor+48);t.cursor+=batch.length;if(t.cursor>=(t.roofs||[]).length){t.cursor=0;t.revision=revision;}
   for(const r of batch){if(r.explicit||r.score>=21)continue;const sample=roofSample(C,r.p,providers);if(!sample||sample.score<=r.score)continue;try{const attrs=t.primitive.getGeometryInstanceAttributes(r.id);if(attrs){attrs.color=C.ColorGeometryInstanceAttribute.toValue(C.Color.fromCssColorString(sample.color),attrs.color);r.score=sample.score;}}catch(_){} }
  }
  function update(center,height,moving,pitch){if(!enabled||height>(isPhone()?1700:2900)||!center||!Number.isFinite(center.longitude)||!Number.isFinite(center.latitude)){if(tiles.size||desired.size)clear();return;}
   // Build only around the visible ground center; avoid network/CPU competition while moving.
   const [x,y]=tileXY(center.longitude/rad,center.latitude/rad);const offsets=isPhone()?[[0,0],[1,0],[-1,0],[0,1],[0,-1]]:[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
   const coords=offsets.map(([a,b])=>[(x+a+N)%N,y+b]).filter(([,v])=>v>=0&&v<N);desired=new Set(coords.map(([a,b])=>`${a}/${b}`));for(const [k,t] of tiles)if(!desired.has(k))drop(k,t);
   if(moving)return;for(const t of tiles.values())refine(t);for(const [a,b] of coords){if(inflight>=2)break;const key=`${a}/${b}`,existing=tiles.get(key);if(existing&&(!existing.failed||Date.now()-existing.failed<30000))continue;if(existing)drop(key,existing);
    const t={};tiles.set(key,t);const generation=epoch;let promise;try{promise=window.SKY_SURFER_CESIUM_LABELS.loadTile(C,a,b,Z);}catch(e){t.failed=Date.now();continue;}if(!promise){tiles.delete(key);continue;}inflight++;Promise.resolve(promise).then(data=>{if(generation!==epoch||tiles.get(key)!==t||!desired.has(key))return;t.primitive=make(data,a,b,t);viewer.scene.requestRender?.();}).catch(e=>{if(tiles.get(key)===t){t.failed=Date.now();log?.('3D buildings tile unavailable: '+e.message);}}).finally(()=>{inflight--;});
   }
  }
  return {update,clear,setEnabled(value){value=!!value;if(enabled===value)return;enabled=value;if(!enabled)clear();}};
 }
 window.SKY_SURFER_CESIUM_BUILDINGS={create,footprints,tileXY,lonlat,capture,palette,roofSample,samplePoints,colorTag};
})();
