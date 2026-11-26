/* v1.62 integrated automatic open imagery viewer; no ion service or automatic credential use. */
'use strict';
(()=>{
 const $=id=>document.getElementById(id), VERSION='1.147';
 const local=new URL('vendor/cesium/',document.baseURI).href;
 const remote=`https://cesium.com/downloads/cesiumjs/releases/${VERSION}/Build/Cesium/`;
 const EOX='https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';
 const IGN='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';
 let viewer, blue, eox, logs=[], frameCount=0, lastError='', baseUrl='', active=false, starting=false, selected=null, renderReady=false;
 const markerEntities=new Map();
 const host=$('cesiumView');
 function log(s){logs.push(new Date().toISOString().slice(11,19)+' '+s);logs=logs.slice(-22);$('cesiumLog').textContent=logs.join('\n');}
 function status(s){$('cesiumStatus').textContent=s;log(s);}
 function fail(e){lastError=e?.message||String(e);status('Error: '+lastError);$('cesiumStatus').hidden=true;$('cesiumReason').textContent=lastError;$('cesiumFailure').hidden=false;}
 $('cesiumRetry').onclick=()=>{const url=new URL(location.href);url.searchParams.set('view','cesium');location.assign(url.href);};$('cesiumReturn').onclick=()=>window.SKY_SURFER_MAP?.setMode('satellite');$('cesiumCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('cesiumLog').textContent);$('cesiumCopy').textContent='Copied';}catch(e){$('cesiumCopy').textContent='Select and copy the text above';}};
 function withTimeout(p,ms,desc){return new Promise((res,rej)=>{let id=setTimeout(()=>rej(Error(desc)),ms);Promise.resolve(p).then(v=>{clearTimeout(id);res(v)},e=>{clearTimeout(id);rej(e)});});}
 async function load(){
  if(window.Cesium?.Viewer)return window.Cesium;
  let isLocal=false;
  try{const r=await fetch(local+'Cesium.js',{method:'HEAD',signal:AbortSignal.timeout(2500)});isLocal=r.ok&&!/text\/html/i.test(r.headers.get('content-type')||'');}catch(e){log('No local Cesium installation detected');}
  for(const base of isLocal?[local,remote]:[remote]){
   window.CESIUM_BASE_URL=base; baseUrl=base;status('Loading CesiumJS '+VERSION+' from '+(base===local?'local installation':'official CDN'));
   const css=document.createElement('link');css.rel='stylesheet';css.href=base+'Widgets/widgets.css';document.head.append(css);
   const script=document.createElement('script');script.src=base+'Cesium.js';
   try{await withTimeout(new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Unable to download '+script.src));document.head.append(script);}),45000,'Cesium library download timed out');if(!window.Cesium?.Viewer)throw Error('Cesium Viewer not found');return window.Cesium;}
   catch(e){script.remove();css.remove();log(e.message);if(window.Cesium?.Viewer)throw e;if(base===remote)throw e;}
  }
 }
 const places=window.SKY_SURFER_DATA?.locations||[];
 const regions=[];
 function isPhone(){return document.querySelector('.app-shell')?.classList.contains('phone-drawer-enabled');}
 function move(place,height,offset=true,animate=true){
  if(!viewer||!active||!place)return;const C=window.Cesium;const camera=viewer.camera;
  camera.cancelFlight();viewer.resize();
  const destination=C.Cartesian3.fromDegrees(+place.lng,+place.lat,height);
  const orientation={heading:0,pitch:-Math.PI/2,roll:0};
  const shift=()=>{if(!active||!offset||!isPhone()||selected?.id!==place.id)return;
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    const landscape=matchMedia('(orientation: landscape)').matches;
    const panel=Math.min(w*(landscape?.49:.68),landscape?420:340);
    const halfWidth=height*Math.tan((camera.frustum.fovy||Math.PI/3)/2)*w/h;
    camera.moveLeft(halfWidth*panel/w);};
  if(animate)camera.flyTo({destination,orientation,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:1.3,complete:shift});
  else{camera.setView({destination,orientation});shift();}
 }
 function world(){if(!viewer||!active)return;const C=window.Cesium;viewer.camera.cancelFlight();viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(-25,25,22000000),orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration:1.4});}
 function refresh(){if(!viewer)return;const visible=new Set((window.SKY_SURFER_APP?.getFiltered?.()||places).map(p=>p.id));for(const [id,e] of markerEntities){e.show=visible.has(id);e.billboard.scale=selected?.id===id?1.14:1;}}
 function select(place){selected=place;refresh();if(active&&viewer&&place)move(place,Math.max(250,Math.min(18000,viewer.camera.positionCartographic.height)),true);}
 function setupMarkers(C){
  const image=new URL('assets/marian-apparition-pin.svg',document.baseURI).href;
  for(const p of places){const entity=viewer.entities.add({id:p.id,position:C.Cartesian3.fromDegrees(+p.lng,+p.lat,0),billboard:{image,width:30,height:40,verticalOrigin:C.VerticalOrigin.BOTTOM,heightReference:C.HeightReference.CLAMP_TO_GROUND}});markerEntities.set(p.id,entity);}
  const canvas=viewer.scene.canvas;
  const handler=new C.ScreenSpaceEventHandler(canvas);
  const find=position=>{const hit=viewer.scene.pick(position);return places.find(p=>p.id===hit?.id?.id&&markerEntities.get(p.id)?.show);};
  handler.setInputAction(event=>{if(!active)return;const p=find(event.position);if(p)window.SKY_SURFER_APP?.selectLocation(p);},C.ScreenSpaceEventType.LEFT_CLICK);
  let tap=null;const pointers=new Set();
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;pointers.add(e.pointerId);if(pointers.size>1){tap=null;return;}tap={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()};},{passive:true});
  canvas.addEventListener('pointermove',e=>{if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>10)tap=null;},{passive:true});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);tap=null;});
  canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);const t=tap;tap=null;if(!t||t.id!==e.pointerId||pointers.size||!active||!isPhone()||!selected||performance.now()-t.t>420||Math.hypot(e.clientX-t.x,e.clientY-t.y)>10)return;
    const box=canvas.getBoundingClientRect();if(!find(new C.Cartesian2(e.clientX-box.left,e.clientY-box.top)))$('closePanel').click();},{passive:true});
  refresh();
 }
 function tileErrors(provider,name){let n=0;provider.errorEvent.addEventListener(e=>{n++;if(n<=3||n%20===0){log(name+' tile error #'+n+': '+(e.message||'request failed'));if(n===1&&!renderReady)$('cesiumStatus').textContent=name+' imagery request failed. The underlying globe remains available.';}});}
 function addRegion(C,name,bounds,make){try{const rectangle=C.Rectangle.fromDegrees(...bounds),provider=make(rectangle);tileErrors(provider,name);const layer=viewer.imageryLayers.addImageryProvider(provider);layer.show=false;regions.push({name,rectangle,layer});log(name+' configured');}catch(e){log(name+' setup failed: '+e.message);}}
 function configureRegions(C){
  const tile=(url,rectangle,maximumLevel,credit)=>new C.UrlTemplateImageryProvider({url,rectangle,maximumLevel,credit:new C.Credit(credit,true),tilingScheme:new C.WebMercatorTilingScheme(),enablePickFeatures:false});
  const wms=(url,layers,rectangle,credit)=>tile(url+'?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS='+encodeURIComponent(layers)+'&STYLES=&CRS=EPSG:3857&FORMAT=image/png&TRANSPARENT=TRUE&WIDTH=256&HEIGHT=256&BBOX={westProjected},{southProjected},{eastProjected},{northProjected}',rectangle,19,credit);
  addRegion(C,'USGS NAIP',[-125,24,-66,50],r=>tile('https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox={westProjected},{southProjected},{eastProjected},{northProjected}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image',r,18,'USGS / USDA — National Map NAIP'));
  addRegion(C,'Spain PNOA',[-9.4,35.8,4.4,43.9],r=>tile('https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{reverseY}.jpeg',r,19,'PNOA / IGN Spain — CC BY 4.0'));
  addRegion(C,'Portugal DGT',[-9.6,36.9,-6.1,42.2],r=>wms('https://cartografia.dgterritorio.gov.pt/wms/ortos2025','Ortos2025-RGB',r,'Direção-Geral do Território — Ortofotos 2025, CC BY 4.0'));
  addRegion(C,'France IGN',[-5.3,41.2,9.7,51.2],r=>tile(IGN,r,19,'IGN France — Orthophotographies, Licence Ouverte 2.0'));
 }
 let activeNames='';
 function updateRegions(C){
  if(!active||!viewer||viewer.isDestroyed())return;
  const height=viewer.camera.positionCartographic.height;
  const scene=viewer.scene,canvas=scene.canvas,ellipsoid=scene.globe.ellipsoid;
  const hit=viewer.camera.pickEllipsoid(new C.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2),ellipsoid);
  const center=hit?ellipsoid.cartesianToCartographic(hit):viewer.camera.positionCartographic;
  // A single regional overlay at a time prevents an overlapping neighbor's blank tiles
  // from covering the active country's imagery. These rectangles are approximate.
  const selected=height<350000?[...regions].reverse().find(r=>C.Rectangle.contains(r.rectangle,center)):null;
  const visibleRegionNames=[];
  for(const region of regions){
   const show=region===selected;
   if(region.layer.show!==show)region.layer.show=show;
   if(show)visibleRegionNames.push(region.name);
  }
  const names=visibleRegionNames.join(' / ');
  if(names!==activeNames){activeNames=names;log('Regional imagery requested: '+(names||'none'));}
  const creditText=names?'Regional imagery requested: '+names+' · EOX / NASA below':'Global imagery: EOX / NASA · Regional detail is automatic';
  if($('cesiumSourceCredit').textContent!==creditText)$('cesiumSourceCredit').textContent=creditText;
 }
 async function start(){
 if(starting||viewer)return;starting=true;
 try{
  const C=await load();if(!active)return;log('Cesium version '+C.VERSION+'; resource base '+baseUrl);
  // Standard official Viewer setup. No pre-initialization imagery promise, no custom render loop, no tile readiness gate.
  viewer=new C.Viewer('cesiumEarth',{baseLayerPicker:false,baseLayer:false,geocoder:false,animation:false,timeline:false,sceneModePicker:false,homeButton:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,scene3DOnly:true,terrainProvider:new C.EllipsoidTerrainProvider(),requestRenderMode:false});
  viewer.scene.globe.baseColor=C.Color.fromCssColorString('#315e7f');viewer.scene.globe.show=true;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance=1;
  viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-25,25,22000000),orientation:{heading:0,pitch:-Math.PI/2,roll:0}});
  viewer.scene.renderError.addEventListener((_scene,error)=>fail(error));
  viewer.scene.postRender.addEventListener(()=>{frameCount++;if(frameCount===1){renderReady=true;log('First postRender event; canvas '+viewer.scene.canvas.width+'×'+viewer.scene.canvas.height);$('cesiumStatus').hidden=true;}if(frameCount===30)log('30 render frames completed (not a visual verification)');});
  setTimeout(()=>{if(active&&frameCount===0&&!lastError)status('No render frames reported after 12 seconds. Check WebGL / diagnostics.');},12000);
  setupMarkers(C);
  status('Viewer created. Imagery is streaming.');
  if(selected&&active)move(selected,18000,true);
  // Add the online base immediately; a failed image cannot prevent the viewer from opening.
  try{const provider=new C.UrlTemplateImageryProvider({url:EOX,tilingScheme:new C.WebMercatorTilingScheme(),maximumLevel:14,credit:new C.Credit('EOxCloudless by EOX IT Services GmbH (modified Copernicus Sentinel data 2016), CC BY 4.0',true),enablePickFeatures:false});tileErrors(provider,'EOX');eox=viewer.imageryLayers.addImageryProvider(provider);}catch(e){log('EOX setup failed: '+e.message);}
  configureRegions(C);updateRegions(C);setInterval(()=>{try{updateRegions(C);}catch(e){log('Regional update: '+e.message);}},600);
  try{const asset=matchMedia('(max-width:800px)').matches?'assets/cesium-blue-marble-2048.jpg':'assets/cesium-blue-marble-4096.jpg';const provider=await withTimeout(C.SingleTileImageryProvider.fromUrl(new URL(asset,document.baseURI).href,{credit:new C.Credit('NASA Earth Observatory — Blue Marble Next Generation',true)}),15000,'Blue Marble image timed out');tileErrors(provider,'Blue Marble');blue=viewer.imageryLayers.addImageryProvider(provider,0);blue.show=true;log('Bundled Blue Marble provider added');}catch(e){log('Blue Marble setup failed: '+e.message);}
 }catch(e){fail(e);}finally{starting=false;if(viewer){viewer.useDefaultRenderLoop=active&&!lastError;if(active)viewer.resize();}}
 }
 function setActive(value){active=value;host.hidden=!value;if(!value){if(viewer){viewer.camera.cancelFlight();viewer.useDefaultRenderLoop=false;}return;}
  selected=window.SKY_SURFER_APP?.getSelected?.()||null;
  if(viewer){viewer.useDefaultRenderLoop=true;requestAnimationFrame(()=>{if(active){viewer.resize();refresh();if(selected)move(selected,Math.max(250,Math.min(18000,viewer.camera.positionCartographic.height)),true);}});}else start();
 }
 if(window.ResizeObserver){const observer=new ResizeObserver(()=>{if(active&&viewer)viewer.resize();});observer.observe(host);}
 window.SKY_SURFER_CESIUM={setActive,select,refresh,reset:world,
  zoom(direction){if(!active||!viewer)return;const camera=viewer.camera;camera.cancelFlight();const distance=Math.max(1,camera.positionCartographic.height*.33);if(direction>0)camera.zoomIn(distance);else camera.zoomOut(distance);},
  recenter(place,offset){if(active&&viewer&&place)move(place,Math.max(2,viewer.camera.positionCartographic.height),offset,false);}
 };
})();
