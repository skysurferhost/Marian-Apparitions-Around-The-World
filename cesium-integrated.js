/* v1.70: fixed marker anchors; aerial-derived building roof colors. */
'use strict';
(()=>{
 const $=id=>document.getElementById(id), VERSION='1.147';
 const local=new URL('vendor/cesium/',document.baseURI).href;
 const remote=`https://cesium.com/downloads/cesiumjs/releases/${VERSION}/Build/Cesium/`;
 const EOX='https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';
 const IGN='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';
 let viewer, blue, eox, labels, buildings, photomesh, transparent, sampleCanvas, logs=[], frameCount=0, lastError='', baseUrl='', active=false, starting=false, selected=null, renderReady=false;
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
 function world(){if(!viewer||!active)return;const C=window.Cesium;viewer.camera.cancelFlight();viewer.resize();
  buildings?.clear();photomesh?.clear();if(blue)blue.show=true;if(eox)eox.show=true;
  viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-25,25,22000000),orientation:{heading:0,pitch:-Math.PI/2,roll:0},...(C.Matrix4?{endTransform:C.Matrix4.IDENTITY}:{})});
  updateRegions(C);viewer.scene.requestRender?.();}
 function refresh(){if(!viewer)return;const visible=new Set((window.SKY_SURFER_APP?.getFiltered?.()||places).map(p=>p.id));for(const [id,e] of markerEntities){e.show=visible.has(id);e.billboard.scale=selected?.id===id?1.14:1;}}
 function select(place){selected=place;refresh();if(active&&viewer&&place)move(place,Math.max(250,Math.min(18000,viewer.camera.positionCartographic.height)),true);}
 function setupMarkers(C){
  const image=new URL('assets/marian-apparition-pin.svg',document.baseURI).href;
  // Match the Standard Globe's screen-facing pin with its tip at a fixed map
  // coordinate. No clamping to streamed roofs or mesh surfaces: those change
  // with tile LOD and can displace the apparent pin while orbiting.
  const ellipsoid=viewer.scene.globe.ellipsoid;
  for(const p of places){
   const anchor=C.Cartesian3.fromDegrees(+p.lng,+p.lat,0,ellipsoid);
   // A map marker stays visible over buildings, but must never show through
   // the back of the Earth. For a point on the ellipsoid the tangent-plane
   // test is exact: (camera-anchor) dot outward ellipsoid normal >= 0.
   const r=ellipsoid.oneOverRadiiSquared;
   const visibleFromCamera=()=>{
    const eye=viewer.camera.positionWC;
    if(!eye||!r)return true;
    return (eye.x-anchor.x)*anchor.x*r.x+(eye.y-anchor.y)*anchor.y*r.y+(eye.z-anchor.z)*anchor.z*r.z>=-1e-12;
   };
   const entity=viewer.entities.add({id:p.id,position:anchor,billboard:{
    image,width:30,height:40,verticalOrigin:C.VerticalOrigin.BOTTOM,
    heightReference:C.HeightReference.NONE,disableDepthTestDistance:Number.POSITIVE_INFINITY,
    show:new C.CallbackProperty(visibleFromCamera,false),
    sizeInMeters:false,rotation:0
   }});markerEntities.set(p.id,entity);
  }
  log('Fixed geographic pins configured; streamed surfaces cannot change marker anchors.');
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
 // A transparent tile retains underlying imagery. Never convert real shadows or water pixels.
 function emptyTile(){if(!transparent){transparent=document.createElement('canvas');transparent.width=transparent.height=256;}return transparent;}
 function isBlank(image){
  if(!image||!image.width||!image.height)return true;
  try{if(!sampleCanvas){sampleCanvas=document.createElement('canvas');sampleCanvas.width=sampleCanvas.height=16;}
   const ctx=sampleCanvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,16,16);ctx.drawImage(image,0,0,16,16);
   const d=ctx.getImageData(0,0,16,16).data;let black=true,white=true,clear=true;
   for(let i=0;i<d.length;i+=4){if(d[i+3]>0){clear=false;if(Math.max(d[i],d[i+1],d[i+2])>5)black=false;if(Math.min(d[i],d[i+1],d[i+2])<250)white=false;}}
   return clear||black||white;
  }catch(_){sampleCanvas=null;return false;}
 }
 function protect(provider,firstLevel=0){
  const request=provider.requestImage?.bind(provider);if(!request)return provider;
  provider.requestImage=(x,y,z,r)=>{if(z<firstLevel)return Promise.resolve(emptyTile());const result=request(x,y,z,r);if(result===undefined)return undefined;
   return Promise.resolve(result).then(image=>{if(isBlank(image))return emptyTile();if(provider._skyRoofSample)window.SKY_SURFER_CESIUM_BUILDINGS?.capture(provider,x,y,z,image);return image;});};return provider;
 }
 function addRegion(C,name,bounds,make,priority=10){try{const rectangle=C.Rectangle.fromDegrees(...bounds),provider=make(rectangle);tileErrors(provider,name);const layer=viewer.imageryLayers.addImageryProvider(provider);provider._skyRoofSample=!name.startsWith('Australia');layer.show=false;regions.push({name,rectangle,layer,priority,provider});log(name+' configured');return layer;}catch(e){log(name+' setup failed: '+e.message);}}
 function tile(C,url,rectangle,maximumLevel,credit,firstLevel=8,geographic=false){return protect(new C.UrlTemplateImageryProvider({url,rectangle,maximumLevel,credit:new C.Credit(credit,true),tilingScheme:geographic?new C.GeographicTilingScheme():new C.WebMercatorTilingScheme(),enablePickFeatures:false}),firstLevel);}
 function wmsURL(url,layers,geo=false){return url+(url.includes('?')?'&':'?')+'SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS='+encodeURIComponent(layers)+'&STYLES=&CRS='+(geo?'EPSG:4326':'EPSG:3857')+'&FORMAT=image/png&TRANSPARENT=TRUE&WIDTH=256&HEIGHT=256&BBOX='+(geo?'{southDegrees},{westDegrees},{northDegrees},{eastDegrees}':'{westProjected},{southProjected},{eastProjected},{northProjected}');}
 function arcURL(url,operation='export'){return url+'/'+operation+'?bbox={westProjected},{southProjected},{eastProjected},{northProjected}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image';}
 function configureRegions(C){
  const add=(name,bounds,url,max,credit,priority=10,first=8,geo=false)=>addRegion(C,name,bounds,r=>tile(C,url,r,max,credit,first,geo),priority);
  const wms=(name,bounds,url,layer,max,credit,priority=10,geo=false)=>add(name,bounds,wmsURL(url,layer,geo),max,credit,priority,geo?7:8,geo);
  add('USGS NAIP',[-125,24,-66,50],arcURL('https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer','exportImage'),19,'USGS / USDA — National Map NAIP, public domain');
  add('Ontario OIWMS',[-95.3,41.6,-74.2,57],arcURL('https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_Imagery/Ontario_Imagery_Web_Map_Service/MapServer'),19,'Government of Ontario — Open Government Licence Ontario');
  add('Spain PNOA',[-9.5,35.7,4.5,44], 'https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{reverseY}.jpeg',19,'PNOA / IGN Spain — CC BY 4.0');
  add('Catalonia ICGC',[0.1,40.4,3.4,43], 'https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/{z}/{x}/{y}.jpeg',19,'Orthophoto of Catalonia — Institut Cartogràfic i Geològic de Catalunya (ICGC), CC BY 4.0',24);
  add('Canary Islands PNOA',[-18.3,27.5,-13.2,29.6],'https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{reverseY}.jpeg',19,'PNOA / IGN Spain — CC BY 4.0');
  wms('Portugal DGT',[-9.6,36.9,-6.1,42.2],'https://cartografia.dgterritorio.gov.pt/wms/ortos2025','Ortos2025-RGB',20,'Direção-Geral do Território — Ortofotos 2025, CC BY 4.0',12);
  for(const [name,bounds] of [['France IGN',[-5.3,41.2,9.7,51.2]],['Guadeloupe IGN',[-61.9,15.7,-60.9,16.6]],['Martinique IGN',[-61.3,14.3,-60.7,14.95]],['French Guiana IGN',[-54.7,2,-51.5,6]],['Réunion IGN',[55.15,-21.5,55.9,-20.8]],['Mayotte IGN',[44.9,-13.1,45.4,-12.6]],['Saint Martin IGN',[-63.2,17.9,-62.7,18.2]],['Saint Pierre and Miquelon IGN',[-56.5,46.7,-56,47.2]]])add(name,bounds,IGN,19,'IGN France — BD ORTHO, Licence Ouverte 2.0',11);
  add('Netherlands PDOK',[3.3,50.7,7.3,53.7],'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg',20,'Beeldmateriaal Nederland / PDOK — CC BY 4.0',30);
  add('Switzerland SWISSIMAGE',[5.9,45.8,10.6,47.9],'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',20,'© swisstopo — open federal geodata',25);
  add('Austria basemap.at',[9.5,46.3,17.2,49.1],'https://maps.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',19,'Datenquelle: basemap.at — CC BY 4.0',20);
  add('Czechia ČÚZK',[12,48.5,19,51.1],'https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/tile/{z}/{y}/{x}',20,'ČÚZK — Ortofoto ČR, CC BY 4.0',25);
  add('Poland GUGiK',[14.1,48.9,24.2,55],'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg',19,'GUGiK / geoportal.gov.pl — Ortofotomapa, free reuse',20);
  wms('Poland high resolution',[14.1,48.9,24.2,55],'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution','Raster',20,'GUGiK / geoportal.gov.pl — High-resolution orthophotomap',35,true);
  add('Luxembourg ACT',[5.7,49.4,6.6,50.2],'https://wmts.geoportail.lu/opendata/wmts/ortho_latest/GLOBAL_WEBMERCATOR_4_V3/{z}/{x}/{y}.jpeg',20,'ACT Luxembourg — BD-L-ORTHO, CC0',35);
  wms('Slovakia GKÚ',[16.8,47.7,22.7,49.7],'https://zbgisws.skgeodesy.sk/zbgis_ortofoto_wms/service.svc/get','1',19,'GKÚ Bratislava / NLC — Orthophotomosaic, CC BY 4.0',20,true);
  add('Estonia orthophoto',[21.7,57.4,28.3,59.9],'https://tiles.maaamet.ee/tm/tms/1.0.0/foto@GMC/{z}/{x}/{reverseY}.jpg',19,'Republic of Estonia Land and Spatial Development Board — open data',20);
  wms('Belgium Flanders',[2.5,50.65,5.95,51.55],'https://geo.api.vlaanderen.be/omw/wms','OMWRGB25VL',20,'Digitaal Vlaanderen — Modellicentie Gratis Hergebruik',20);
  add('Belgium Wallonia',[2.8,49.4,6.5,50.9],arcURL('https://geoservices.wallonie.be/arcgis/rest/services/IMAGERIE/ORTHO_LAST/MapServer'),20,'Service public de Wallonie (SPW) — latest orthophotos, CC BY 4.0',21);
  for(const year of [2022,2023,2024])add('Italy AGEA '+year,[6.5,35.4,18.7,47.2], 'https://geoportale.agea.gov.it/image/rest/services/AgEA/Ortofoto_AgEA_'+year+'/ImageServer/tile/{z}/{y}/{x}',18,'© AGEA — Agenzia per le Erogazioni in Agricoltura, voli '+year+', CC BY 4.0',15+year-2022);
  wms('Germany NRW DOP',[5.8,50.2,9.5,52.6],'https://www.wms.nrw.de/geobasis/wms_nw_dop','nw_dop_rgb',20,'Geobasis NRW — open data, DL-DE Zero 2.0',26);
  wms('Germany Bavaria DOP20',[8.95,47.2,13.9,50.6],'https://geoservices.bayern.de/od/wms/dop/v1/dop20','by_dop20c',20,'Bayerische Vermessungsverwaltung — CC BY 4.0',24);
  wms('Germany Lower Saxony DOP20',[6.6,51.2,11.7,54.1],'https://opendata.lgln.niedersachsen.de/doorman/noauth/dop_wms','ni_dop20',20,'LGLN Niedersachsen — Datenlizenz Deutschland Namensnennung 2.0',24);
  wms('Germany Schleswig-Holstein DOP20',[7.8,53.3,11.4,55.2],'https://dienste.gdi-sh.de/WMS_SH_DOP20col_OpenGBD','sh_dop20_rgb',20,'LVermGeo Schleswig-Holstein — Datenlizenz Deutschland Namensnennung 2.0',25);
  wms('Croatia DGU',[13.4,42.3,19.5,46.6],'https://geoportal.dgu.hr/services/inspire/orthophoto_2021_2022/wms','OI.OrthoimageCoverage',18,'DGU Croatia — open licence; original watermark retained',12,true);
  wms('Croatia DGU 2023',[13.4,42.3,19.5,46.6],'https://geoportal.dgu.hr/services/inspire/orthophoto_2023/wms','OI.OrthoimageCoverage',18,'DGU Croatia — open licence; original watermark retained',13,true);
  for(const [name,bounds] of [['Japan GSI',[128.5,30,146.1,46]],['Okinawa GSI',[122.5,24,131.5,30.8]],['Ogasawara GSI',[139,24,143,28.5]]])add(name,bounds,'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',18,'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院 / GSI Japan</a>',20,14);
  // Additional open datasets; all are geographically bounded and streamed only in view.
  wms('Slovenia GURS',[13.35,45.4,16.65,46.95],'https://ipi.eprostor.gov.si/wms-si-gurs-ins/ows','SI.GURS.ZPDZ:PREGLEDNI_DOF',19,'Geodetska uprava Republike Slovenije — Ortofoto, CC BY 4.0',22,true);
  wms('Iceland NÁTT',[-25,63,-13,67],'https://gis.natt.is/mapcache/web-mercator/wms','grunnkort-loftmynd',19,'Náttúrufræðistofnun (Natural Science Institute of Iceland), 2025 — Grunnkort Loftmynd, CC BY 4.0',22);
  add('Australia Queensland',[137.8,-29.2,154.1,-9.5],'https://spatial-img.information.qld.gov.au/arcgis/rest/services/Basemaps/LatestStateProgram_AllUsers/ImageServer/tile/{z}/{y}/{x}',20,'© State of Queensland — Latest State Program Public Basemap (CC BY / CC BY-SA per service metadata); includes © Planet Labs Netherlands B.V., reproduced under licence from Planet and Geoplex, all rights reserved, 2026',20);
  add('Australia New South Wales',[140.9,-37.6,153.7,-28.1],'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/tile/{z}/{y}/{x}',19,'NSW Spatial Services — NSW Imagery (CC BY 3.0 AU); includes © AAM, Jacobs Group Ausimage and Landsat per service credits',20);
  // Optional free, user-owned keys are never bundled. Leave disabled until configured.
  const keys=window.SKY_SURFER_IMAGERY_KEYS||{};
  if(keys.linz)add('New Zealand LINZ',[165,-48,179,-33],'https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/{z}/{x}/{y}.webp?api='+encodeURIComponent(keys.linz),20,'LINZ aerial basemap — CC BY 4.0',20);
  if(keys.finland)add('Finland NLS',[19,59,32,70.2],'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/ortokuva/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.jpg?api-key='+encodeURIComponent(keys.finland),19,'National Land Survey of Finland — CC BY 4.0',20);
  // Stack low priorities below high priorities (base layers stay at indices 0 and 1).
  if(viewer.imageryLayers.raiseToTop)for(const r of [...regions].sort((a,b)=>a.priority-b.priority))viewer.imageryLayers.raiseToTop(r.layer);
 }
 let activeNames='', oamLayers=[], oamCell='', oamEpoch=0, oamLast=0, oamWanted='', oamIds='', oamPending=null;
 const oamCache=new Map(); // metadata only; no bulk imagery downloads or permanent tile storage
 function rememberOam(cell,items){oamCache.delete(cell);oamCache.set(cell,{items,at:Date.now()});while(oamCache.size>48)oamCache.delete(oamCache.keys().next().value);}
 let regionMode=false, previousCamera=null, lastMotion=0;
 function tuneDetail(){
  const camera=viewer.camera, p=camera.positionCartographic, now=Date.now(), old=previousCamera;
  const signature=[p.longitude,p.latitude,p.height,camera.heading||0,camera.pitch||0];
  // Only refine once the view has settled; full v1.63 detail returns automatically.
  if(old&&(Math.abs(signature[0]-old[0])+Math.abs(signature[1]-old[1])>Math.max(1e-8,p.height/6378137*.012)||Math.abs(signature[2]-old[2])>Math.max(.25,p.height*.012)||Math.abs(signature[3]-old[3])+Math.abs(signature[4]-old[4])>.012))lastMotion=now;
  previousCamera=signature;
  const moving=now-lastMotion<180, globe=viewer.scene.globe, phone=isPhone();
  const error=moving?(phone?2.8:2.0):(phone?2:1.35);
  if(globe.maximumScreenSpaceError!==error)globe.maximumScreenSpaceError=error;
  // Cache on desktop, keep memory close to the default on mobile.
  globe.tileCacheSize=phone?140:320;
  globe.loadingDescendantLimit=moving?16:32;
  if(labels)labels.alpha=moving?.77:1;
  return moving;
 }
 function removeOam(){for(const l of oamLayers)viewer.imageryLayers.remove?.(l,true);oamLayers=[];oamIds='';}
 function clearOam(){oamEpoch++;oamCell='';oamWanted='';oamPending?.abort();oamPending=null;oamLast=0;removeOam();}
 const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function eligibleLicense(value){return /^(cc-by-4\.0|cc0-1\.0|public-domain|pddl-1\.0)$/i.test(String(value||'').trim())||/^https?:\/\/creativecommons\.org\/(licenses\/by\/4\.0|publicdomain\/zero\/1\.0)\/?$/i.test(String(value||''));}
 function showOam(C,items){
   const chosen=items.slice(0,2).reverse(), ids=JSON.stringify(chosen.map(i=>i.id));
   if(ids===oamIds)return;
   removeOam();for(const item of chosen){
    const props=item.properties||{},providerNames=(props.providers||[]).map(p=>p.name).filter(Boolean).join(', '), attribution=escapeHtml(providerNames||props['attribution']||props['copyright']||'Open Imagery Network contributors');
    const r=C.Rectangle.fromDegrees(...item.bbox),credit='OpenAerialMap — '+attribution+' — '+escapeHtml(props.license)+' — <a href="https://imagery.hotosm.org/" target="_blank" rel="noopener">catalog</a>';
    const provider=tile(C,'https://tiles.imagery.hotosm.org/raster/collections/openaerialmap/items/'+encodeURIComponent(item.id)+'/tiles/WebMercatorQuad/{z}/{x}/{y}?assets=visual&nodata=0',r,21,credit,14);
    tileErrors(provider,'OAM '+item.id);provider._skyRoofSample=true;oamLayers.push(viewer.imageryLayers.addImageryProvider(provider));
   }oamIds=ids;if(labels)viewer.imageryLayers.raiseToTop(labels);if(chosen.length)log('OpenAerialMap: '+oamLayers.length+' explicitly licensed local image(s) requested');
 }
 async function discoverOam(C,center,height,moving){
  if(height>45000||!active){if(oamWanted||oamCell||oamLayers.length)clearOam();return;}
  if(typeof fetch!=='function'||!C.Math)return;
  const lon=C.Math.toDegrees(center.longitude),lat=C.Math.toDegrees(center.latitude),step=.12;
  if(Math.abs(lat)>84||Math.abs(lon)>179.7){if(oamWanted||oamLayers.length)clearOam();return;}
  const cell=[Math.floor(lon/step),Math.floor(lat/step)].join(':');
  if(cell!==oamWanted){oamWanted=cell;oamEpoch++;oamPending?.abort();oamPending=null;oamCell='';}
  if(cell===oamCell)return;
  const cached=oamCache.get(cell);
  if(cached&&Date.now()-cached.at<600000){oamCell=cell;showOam(C,cached.items);return;}
  // Do not compete with visible imagery tiles while crossing the world or scrolling.
  if(moving||oamPending||Date.now()-oamLast<1500)return;
  oamLast=Date.now();const epoch=++oamEpoch, controller=new AbortController();oamPending=controller;
  const timeout=setTimeout(()=>controller.abort(),9000);
  const bbox=[Math.floor(lon/step)*step-.03,Math.floor(lat/step)*step-.03,(Math.floor(lon/step)+1)*step+.03,(Math.floor(lat/step)+1)*step+.03];
  try{const url='https://api.imagery.hotosm.org/stac/search?collections=openaerialmap&limit=30&bbox='+bbox.join(',');
   const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
   if(epoch!==oamEpoch||!active||oamWanted!==cell)return;
   const items=(data.features||[]).filter(f=>eligibleLicense(f.properties?.license)&&f.assets?.visual&&f.bbox?.length===4&&f.bbox.every(Number.isFinite)&&f.bbox[0]<f.bbox[2]&&f.bbox[1]<f.bbox[3]&&f.bbox[0]>=-180&&f.bbox[2]<=180&&f.bbox[1]>=-85&&f.bbox[3]<=85&&f.id);
   items.sort((a,b)=>(Number(a.properties?.gsd)||Infinity)-(Number(b.properties?.gsd)||Infinity));
   rememberOam(cell,items);oamCell=cell;showOam(C,items);
  }catch(e){if(epoch===oamEpoch){oamCell='';oamLast=Date.now()+27000;log('OpenAerialMap discovery unavailable: '+e.message);}}
  finally{clearTimeout(timeout);if(oamPending===controller)oamPending=null;}
 }
 function updateRegions(C){
  if(!active||!viewer||viewer.isDestroyed())return;
  const height=viewer.camera.positionCartographic.height,scene=viewer.scene,canvas=scene.canvas,ellipsoid=scene.globe.ellipsoid;
  const hit=viewer.camera.pickEllipsoid(new C.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2),ellipsoid);
  const center=hit?ellipsoid.cartesianToCartographic(hit):viewer.camera.positionCartographic;
  const moving=tuneDetail();
  // Earlier activation plus a wider exit threshold prevents repeated layer teardown at the boundary.
  regionMode=height<(regionMode?650000:520000);
  const view=regionMode?viewer.camera.computeViewRectangle?.(ellipsoid):null;
  const intersects=r=>C.Rectangle.contains(r.rectangle,center)||(view&&C.Rectangle.intersection?.(r.rectangle,view));
  const matches=regionMode?regions.filter(intersects).sort((a,b)=>Number(C.Rectangle.contains(b.rectangle,center))-Number(C.Rectangle.contains(a.rectangle,center))||b.priority-a.priority):[];
  // Limit simultaneously requested providers; keep every overlapping Italy flight if visible.
  // Restrict competing peripheral downloads during motion; retain the full original set when settled.
  // Centered sources (including multi-year imagery) keep their priority.
  const settledMatches=matches.slice(0,isPhone()?4:6);
  // Prioritize the center source while traveling; other overlapping sources return on settle.
  const enabled=new Set(moving?settledMatches.slice(0,isPhone()?2:3):settledMatches);
  for(const r of regions){const show=enabled.has(r);if(r.layer.show!==show)r.layer.show=show;}
  const names=[...enabled].map(r=>r.name).join(' / ');
  if(names!==activeNames){activeNames=names;log('Regional imagery requested: '+(names||'none'));}
  const text=(names?'Regional imagery requested: '+names:'Global imagery')+' · EOX / NASA below'+(oamLayers.length?' · OpenAerialMap local imagery':'')+(labels?' · OpenFreeMap / OSM labels':'')+(photomesh?.status()?' · '+photomesh.status():'');
  if($('cesiumSourceCredit').textContent!==text)$('cesiumSourceCredit').textContent=text;
  discoverOam(C,center,height,moving);
  const meshVisible=photomesh?.update(center,height,moving);
  // Retain simple 3D geometry while the real mesh streams; avoid duplicating it in covered views.
  buildings?.setEnabled(!meshVisible);
  buildings?.update(center,height,moving,viewer.camera.pitch);
 }
 async function start(){
 if(starting||viewer)return;starting=true;
 try{
  const C=await load();if(!active)return;log('Cesium version '+C.VERSION+'; resource base '+baseUrl);
  // Standard official Viewer setup. No pre-initialization imagery promise, no custom render loop, no tile readiness gate.
  viewer=new C.Viewer('cesiumEarth',{baseLayerPicker:false,baseLayer:false,geocoder:false,animation:false,timeline:false,sceneModePicker:false,homeButton:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,scene3DOnly:true,terrainProvider:new C.EllipsoidTerrainProvider(),requestRenderMode:false});
  viewer.scene.globe.baseColor=C.Color.fromCssColorString('#315e7f');viewer.scene.globe.show=true;viewer.scene.globe.maximumScreenSpaceError=isPhone()?2:1.35;viewer.scene.globe.tileCacheSize=isPhone()?140:320;viewer.scene.globe.loadingDescendantLimit=32;viewer.scene.globe.preloadAncestors=true;viewer.scene.globe.preloadSiblings=false;
  // Match the Standard MapLibre globe: left-drag moves over the globe,
  // right-drag orbits/tilts, wheel zooms. Native Cesium controls retain
  // terrain-aware picking, touch gestures and inertia without competing handlers.
  const controls=viewer.scene.screenSpaceCameraController, gesture=C.CameraEventType;
  controls.minimumZoomDistance=1;
  controls.enableRotate=true;
  controls.enableTilt=true;
  controls.enableCollisionDetection=true;
  controls.enableZoom=true;
  controls.rotateEventTypes=gesture.LEFT_DRAG;
  controls.zoomEventTypes=[gesture.WHEEL,gesture.PINCH];
  controls.tiltEventTypes=[gesture.RIGHT_DRAG,gesture.MIDDLE_DRAG,gesture.PINCH,
    {eventType:gesture.LEFT_DRAG,modifier:C.KeyboardEventModifier.CTRL},
    {eventType:gesture.RIGHT_DRAG,modifier:C.KeyboardEventModifier.CTRL}];
  controls.maximumTiltAngle=80*Math.PI/180;
  controls.inertiaSpin=.75;
  controls.inertiaZoom=.65;
  // Restrict context-menu suppression to the Cesium canvas, not PDF or site UI.
  viewer.scene.canvas.addEventListener('contextmenu',event=>event.preventDefault());
  viewer.scene.canvas.setAttribute('aria-label','Cesium 3D Globe. Left-drag to pan, right-drag to rotate or tilt, scroll to zoom.');
  viewer.scene.canvas.title='Left-drag: pan · Right-drag: rotate / tilt · Wheel: zoom';
  viewer.camera.setView({destination:C.Cartesian3.fromDegrees(-25,25,22000000),orientation:{heading:0,pitch:-Math.PI/2,roll:0}});
  viewer.scene.renderError.addEventListener((_scene,error)=>fail(error));
  viewer.scene.postRender.addEventListener(()=>{frameCount++;if(frameCount===1){renderReady=true;log('First postRender event; canvas '+viewer.scene.canvas.width+'×'+viewer.scene.canvas.height);$('cesiumStatus').hidden=true;}if(frameCount===30)log('30 render frames completed (not a visual verification)');});
  setTimeout(()=>{if(active&&frameCount===0&&!lastError)status('No render frames reported after 12 seconds. Check WebGL / diagnostics.');},12000);
  setupMarkers(C);
  status('Viewer created. Imagery is streaming.');
  if(selected&&active)move(selected,18000,true);
  // Load bundled global imagery first, then add network imagery above it. Never remove the base.
  try{const asset=matchMedia('(max-width:800px)').matches?'assets/cesium-blue-marble-2048.jpg':'assets/cesium-blue-marble-4096.jpg';const provider=await withTimeout(C.SingleTileImageryProvider.fromUrl(new URL(asset,document.baseURI).href,{credit:new C.Credit('NASA Earth Observatory — Blue Marble Next Generation',true)}),15000,'Blue Marble image timed out');tileErrors(provider,'Blue Marble');blue=viewer.imageryLayers.addImageryProvider(provider,0);blue.show=true;log('Bundled Blue Marble provider added');}catch(e){log('Blue Marble setup failed: '+e.message);}
  try{const provider=protect(new C.UrlTemplateImageryProvider({url:EOX,tilingScheme:new C.WebMercatorTilingScheme(),maximumLevel:14,credit:new C.Credit('EOxCloudless by EOX IT Services GmbH (modified Copernicus Sentinel data 2016), CC BY 4.0',true),enablePickFeatures:false}));tileErrors(provider,'EOX');eox=viewer.imageryLayers.addImageryProvider(provider);}catch(e){log('EOX setup failed: '+e.message);}
  configureRegions(C);
  try{if(window.SKY_SURFER_CESIUM_LABELS){const provider=window.SKY_SURFER_CESIUM_LABELS.create(C);tileErrors(provider,'OpenFreeMap labels');labels=viewer.imageryLayers.addImageryProvider(provider);log('Transparent OpenFreeMap geographic labels added');}}catch(e){log('Geographic labels unavailable: '+e.message);}
  try{if(window.SKY_SURFER_CESIUM_BUILDINGS&&viewer.scene.primitives){buildings=window.SKY_SURFER_CESIUM_BUILDINGS.create(C,viewer,isPhone,log,()=>[...oamLayers].reverse().map(l=>l.imageryProvider).filter(Boolean).concat(regions.filter(r=>r.layer.show&&r.provider._skyRoofSample).sort((a,b)=>b.priority-a.priority).map(r=>r.provider)));log('Open-data 3D building renderer configured; natural facade and aerial-derived roof colors');}}catch(e){log('3D buildings unavailable: '+e.message);}
  try{if(window.SKY_SURFER_PHOTOMESH&&C.Cesium3DTileset&&viewer.scene.primitives){photomesh=window.SKY_SURFER_PHOTOMESH.create(C,viewer,isPhone,log,$('cesiumMeshCredit'));log('Native regional photomesh configured');}}catch(e){log('Photomesh unavailable: '+e.message);}
  updateRegions(C);setInterval(()=>{try{updateRegions(C);}catch(e){log('Regional update: '+e.message);}},120);
 }catch(e){fail(e);}finally{starting=false;if(viewer){viewer.useDefaultRenderLoop=active&&!lastError;if(active)viewer.resize();}}
 }
 function setActive(value){active=value;host.hidden=!value;if(!value){if(viewer){clearOam();buildings?.clear();photomesh?.clear();previousCamera=null;lastMotion=0;viewer.camera.cancelFlight();viewer.useDefaultRenderLoop=false;}return;}
  selected=window.SKY_SURFER_APP?.getSelected?.()||null;
  if(viewer){viewer.useDefaultRenderLoop=true;requestAnimationFrame(()=>{if(active){viewer.resize();refresh();updateRegions(window.Cesium);if(selected)move(selected,Math.max(250,Math.min(18000,viewer.camera.positionCartographic.height)),true);}});}else start();
 }
 if(window.ResizeObserver){const observer=new ResizeObserver(()=>{if(active&&viewer)viewer.resize();});observer.observe(host);}
 window.SKY_SURFER_CESIUM={setActive,select,refresh,reset:world,
  zoom(direction){if(!active||!viewer)return;const camera=viewer.camera;camera.cancelFlight();const distance=Math.max(1,camera.positionCartographic.height*.33);if(direction>0)camera.zoomIn(distance);else camera.zoomOut(distance);},
  recenter(place,offset){if(active&&viewer&&place)move(place,Math.max(2,viewer.camera.positionCartographic.height),offset,false);}
 };
})();
