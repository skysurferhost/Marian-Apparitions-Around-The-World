/* Sky Surfer Explorer v1.30 - Satellite + Street Map, with automatic 3D buildings.
   The official MapLibre satellite example loads an EOX 2020 raster;
   2018+ EOxCloudless vintages are restricted to non-commercial use unless licensed.
   This project uses EOxCloudless 2016 (CC BY 4.0) instead, with on-map attribution.
   Satellite endpoint is a remote online service with no uptime guarantee.
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = $('satelliteMap');
  const notice = $('mapNotice');
  const styleSwitch = $('explorerStyleSwitch');
  const credits = $('mapCredits');
  const places = window.SKY_SURFER_DATA?.locations || [];

  // 3D building geometry comes from OpenFreeMap's OpenStreetMap-derived vector tiles.
  // We keep the 2016 satellite raster underneath, as requested.
  const STREET_STYLE = 'https://tiles.openfreemap.org/styles/liberty'; // optional labels for satellite
  const BUILDING_TILEJSON = 'https://tiles.openfreemap.org/planet';
  const BUILDING_LAYER = 'sky-surfer-3d-buildings';
  const SATELLITE_TILES = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';
  const EOX_CREDIT = '<a href="https://cloudless.eox.at/" target="_blank" rel="noopener noreferrer">EOxCloudless</a> by <a href="https://eox.at/" target="_blank" rel="noopener noreferrer">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016)';
  const tileModeLabels = { satellite:'EOxCloudless 2016 satellite imagery + 3D OSM buildings at close zoom', street:'OpenFreeMap Liberty Street Map + 3D OSM buildings at close zoom' };
  let viewMode = 'satellite';
  let explorerStyleExpanded = true; // Toggle the sub-options without changing the map.
  let basemapMode = 'satellite';
  let buildingLayerReady = false;
  let streetStyleAvailable = false;
  let explorerStylePromise = null;
  const layerVisibilityByMode = new Map();
  let automatic3DTilt = false;
  let map = null;
  let mapReady = false;
  let mapFailed = false;
  let pendingInit = false;
  let pendingSelection = null;
  let dependencyPromise = null;
  let initializationTimer = null;
  let lastError = '';
  let lastErrorType = '';
  let satelliteStylePromise = null;
  const markers = new Map();
  const globeMarkers = new Map();
  let satelliteGlobe = null;
  let globeReady = false;
  let globePending = false;
  let globeFailed = false;
  const GLOBE_START = { center: [-25, 25], zoom: 1.35, bearing: 0, pitch: 0 };
  const EXPLORER_START = { center: [-40, 30], zoom: 2.35, bearing: 0, pitch: 0 };
  function compactCredits(targetMap) {
    // Attribution is legally required; start it behind the normal MapLibre 'i' button.
    const control = new maplibregl.AttributionControl({compact:true});
    targetMap.addControl(control, 'bottom-right');
    // Force compact/collapsed even on wide desktops.
    const container = targetMap.getContainer();
    const compact = container.querySelector('.maplibregl-ctrl-attrib');
    if(compact) {
      compact.classList.add('maplibregl-compact');
      compact.classList.remove('maplibregl-compact-show');
      const btn = compact.querySelector('.maplibregl-ctrl-attrib-button');
      if(btn){ btn.setAttribute('aria-expanded','false'); btn.title='Map imagery and data credits'; }
    }
  }
  const diag = $('mapDiagnostic');
  const diagDetails = $('mapDiagnosticDetails');
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const showNotice = message => { notice.textContent=message;notice.hidden=false; };
  const hideNotice = () => {notice.hidden=true;};

  function browserReport(){
    let webgl='unknown';
    try {
      const probe=document.createElement('canvas');
      const ctx=probe.getContext('webgl2') || probe.getContext('webgl');
      webgl=ctx ? 'available' : 'unavailable';
      ctx?.getExtension('WEBGL_lose_context')?.loseContext();
    }catch(e){webgl=String(e?.message || e);}
    return `WebGL: ${webgl} · Protocol: ${location.protocol} · MapLibre: ${window.maplibregl?.version||'not loaded'} · Basemap: ${basemapMode}`;
  }
  function showFailure(message,type='map'){
    mapFailed=true;lastError=String(message);lastErrorType=type;
    console.error('Sky Surfer Explorer:',type,lastError,browserReport());
    showNotice('Explorer could not load satellite imagery: '+lastError+'. Live Google Map remains available.');
    diagDetails.textContent=browserReport()+' · Error: '+lastError;diag.hidden=false;
  }
  function clearFailure(){diag.hidden=true;mapFailed=false;lastError='';lastErrorType='';}
  $('mapUseGoogle').addEventListener('click',()=>setMode('google'));
  $('mapCopyDiagnostic').addEventListener('click',()=>{
    const report=diagDetails.textContent;
    if(navigator.clipboard?.writeText&&window.isSecureContext){
      navigator.clipboard.writeText(report).then(()=>$('mapCopyDiagnostic').textContent='Copied')
        .catch(()=>window.prompt('Copy diagnostics:',report));
    }else window.prompt('Copy diagnostics:',report);
  });

  function loadMapLibre(){
    if(window.maplibregl?.Map)return Promise.resolve();
    if(dependencyPromise)return dependencyPromise;
    dependencyPromise=new Promise((resolve,reject)=>{
      if(!document.getElementById('sky-maplibre-css')){
        const css=document.createElement('link');css.id='sky-maplibre-css';css.rel='stylesheet';
        css.href='https://cdn.jsdelivr.net/npm/maplibre-gl@5.15.0/dist/maplibre-gl.css';document.head.append(css);
      }
      const candidates=[
        'https://cdn.jsdelivr.net/npm/maplibre-gl@5.15.0/dist/maplibre-gl.js',
        'https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.js'
      ];
      function loadNext(i){
        if(i>=candidates.length){reject(Error('MapLibre library could not load from either CDN'));return;}
        const script=document.createElement('script');script.src=candidates[i];script.async=true;
        let done=false;const timer=setTimeout(()=>fail(),10000);
        function cleanup(){clearTimeout(timer);script.onload=null;script.onerror=null;}
        function fail(){if(done)return;done=true;cleanup();script.remove();loadNext(i+1);}
        script.onload=()=>{if(done)return;if(window.maplibregl?.Map){done=true;cleanup();resolve();}else fail();};
        script.onerror=fail;document.head.append(script);
      }
      loadNext(0);
    }).catch(error=>{dependencyPromise=null;throw error;});
    return dependencyPromise;
  }

  function basicSatelliteStyle(){
    return {
      version:8,name:'Sky Surfer Satellite 2016',
      sources:{ satellite:{
        type:'raster',tiles:[SATELLITE_TILES],tileSize:256,minzoom:0,maxzoom:14,
        attribution:EOX_CREDIT
      }},
      layers:[{id:'satellite-raster',type:'raster',source:'satellite',paint:{
        'raster-opacity':1,'raster-fade-duration':480,'raster-saturation':-0.07,'raster-contrast':0.04
      }}]
    };
  }
  // The standalone satellite imagery is never dependent on street-map vector tiles.
  // When the OpenFreeMap style is obtainable, add ONLY its text labels on top.
  // If it isn't, continue with the satellite raster and the local Sky Surfer placemarks.
  function getSatelliteStyle(){
    if(satelliteStylePromise)return satelliteStylePromise;
    satelliteStylePromise=(async()=>{
      const base=basicSatelliteStyle();
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),4200);
      try{
        const result=await fetch(STREET_STYLE,{signal:controller.signal});
        if(!result.ok)throw Error('Optional label style HTTP '+result.status);
        const other=await result.json();
        const labels=(other.layers||[]).filter(layer=>
          layer.type==='symbol'&&layer.source&&layer.layout?.['text-field']!==undefined);
        const sourceNames=new Set(labels.map(layer=>layer.source));
        for(const [id,source] of Object.entries(other.sources||{})){
          if(sourceNames.has(id)&&id!=='satellite')base.sources[id]=source;
        }
        if(other.glyphs)base.glyphs=other.glyphs;
        if(other.sprite)base.sprite=other.sprite;
        for(const layer of labels){
          const label={...layer, paint:{...(layer.paint||{})}};
          // Preserve text styling where possible, but add contrast on imagery.
          label.paint['text-color']='#fff8ed';
          label.paint['text-halo-color']='rgba(8,22,33,0.94)';
          label.paint['text-halo-width']=1.3;
          label.paint['text-halo-blur']=0.4;
          base.layers.push(label);
        }
        console.info('Sky Surfer: Satellite with',labels.length,'OpenFreeMap label layers');
      }catch(e){console.info('Sky Surfer: satellite imagery without optional region labels',String(e.message||e));}
      finally{clearTimeout(timeout);}
      return base;
    })();
    return satelliteStylePromise;
  }

  // Keep both basemaps in ONE MapLibre style. Switching is a visibility change,
  // rather than map.setStyle(), so satellite tiles and markers are not reloaded.
  // OpenFreeMap Liberty is a street/vector basemap; EOX is independent raster imagery.
  function getExplorerStyle(){
    if(explorerStylePromise)return explorerStylePromise;
    explorerStylePromise=(async()=>{
      const base=basicSatelliteStyle();
      layerVisibilityByMode.clear();
      layerVisibilityByMode.set('satellite-raster',{satellite:'visible',street:'none'});
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),4500);
      try{
        const response=await fetch(STREET_STYLE,{signal:controller.signal});
        if(!response.ok)throw Error('OpenFreeMap Liberty style HTTP '+response.status);
        const streetStyle=await response.json();
        if(!Array.isArray(streetStyle.layers) || !streetStyle.layers.length)throw Error('OpenFreeMap street style has no layers');
        Object.assign(base.sources,streetStyle.sources||{});
        if(streetStyle.glyphs)base.glyphs=streetStyle.glyphs;
        if(streetStyle.sprite)base.sprite=streetStyle.sprite;
        // Preserve the street map background underneath the optional satellite raster.
        const backgrounds=streetStyle.layers.filter(layer=>layer.type==='background');
        const otherLayers=streetStyle.layers.filter(layer=>layer.type!=='background');
        const satelliteRaster=base.layers.pop();
        base.layers=[];
        const appendStreetLayer=(layer)=>{
          const originalVisibility=layer.layout?.visibility==='none'?'none':'visible';
          const clone=JSON.parse(JSON.stringify(layer));
          clone.layout={...(clone.layout||{}),visibility:'none'};
          base.layers.push(clone);
          layerVisibilityByMode.set(clone.id,{satellite:'none',street:originalVisibility});
          // The satellite imagery retains country/city labels without street-map
          // roads and polygons covering the photographs.
          if(layer.type==='symbol' && layer.source && layer.layout?.['text-field']!==undefined){
            const label=JSON.parse(JSON.stringify(layer));
            label.id='sky-sat-label-'+layer.id;
            label.layout={...(label.layout||{}),visibility:originalVisibility};
            label.paint={...(label.paint||{}),
              'text-color':'#fff8ef',
              'text-halo-color':'rgba(9,25,39,0.94)',
              'text-halo-width':1.3,
              'text-halo-blur':0.3
            };
            base.layers.push(label);
            layerVisibilityByMode.set(label.id,{satellite:originalVisibility,street:'none'});
          }
        };
        backgrounds.forEach(appendStreetLayer);
        base.layers.push(satelliteRaster);
        otherLayers.forEach(appendStreetLayer);
        streetStyleAvailable=true;
        $('streetsBasemapBtn').disabled=false;
        $('streetsBasemapBtn').title='OpenFreeMap Street Map; 3D buildings appear at close zoom';
        console.info('Sky Surfer: Street Map and Satellite merged into one MapLibre style');
      }catch(err){
        streetStyleAvailable=false;
        console.warn('Sky Surfer: OpenFreeMap Street Map unavailable; Satellite still works.',err);
        $('streetsBasemapBtn').disabled=true;
        $('streetsBasemapBtn').title='Street Map unavailable: OpenFreeMap could not load';
      }finally{clearTimeout(timer);}
      return base;
    })();
    return explorerStylePromise;
  }
  function applyExplorerBasemap(){
    if(!map || !mapReady)return;
    for(const [id,modes] of layerVisibilityByMode){
      if(!map.getLayer(id))continue;
      const target=modes[basemapMode]||'none';
      if(map.getLayoutProperty(id,'visibility')!==target)
        map.setLayoutProperty(id,'visibility',target);
    }
    // 3D buildings are deliberately independent of the chosen basemap.
    // Their layer has minzoom 15 and extrudes gradually from zoom 15 to 16.
    if(map.getLayer(BUILDING_LAYER))
      map.setLayoutProperty(BUILDING_LAYER,'visibility','visible');
  }
  function adjustAutomatic3DPerspective(){
    if(!map||!mapReady)return;
    const z=map.getZoom();
    if(z>=15.65 && map.getPitch()<7){
      automatic3DTilt=true;
      map.easeTo({pitch:48,duration:reducedMotion()?0:580,essential:true});
    }else if(z<14.7 && automatic3DTilt){
      automatic3DTilt=false;
      // Don't override a perspective intentionally changed by right-drag.
      if(Math.abs(map.getPitch()-48)<7)
        map.easeTo({pitch:0,duration:reducedMotion()?0:520,essential:true});
    }
  }

  function setCredits(){
    const eox=EOX_CREDIT+' · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>';
    const osm='<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>';
    credits.innerHTML=(basemapMode==='satellite'?eox+' · 3D data: '+osm:osm+' · 3D buildings: OSM');
  }
  function updateSwitch(){
    for(const [id,mode] of [['satelliteBasemapBtn','satellite'],['streetsBasemapBtn','street']]){
      $(id).classList.toggle('active',basemapMode===mode);
      $(id).setAttribute('aria-pressed',String(basemapMode===mode));
    }
    setCredits();
  }
  function compactCreditsOnLoad(){
    const compact=map?.getContainer()?.querySelector('.maplibregl-ctrl-attrib');
    if(compact) {
      compact.classList.add('maplibregl-compact');
      compact.classList.remove('maplibregl-compact-show');
      compact.querySelector('.maplibregl-ctrl-attrib-button')?.setAttribute('aria-expanded','false');
    }
  }
  function makeMarker(place){
    const el=document.createElement('button');el.type='button';el.className='sat-pin maplibre-pin';
    el.setAttribute('aria-label',`Open ${(place.displayName || place.name)} details`);el.title=(place.displayName || place.name);
    const dot=document.createElement('span');dot.className='sat-pin-dot';
    const label=document.createElement('span');label.className='sat-pin-label';label.textContent=(place.displayName || place.name);
    el.append(dot,label);
    el.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      window.SKY_SURFER_APP?.selectLocation(place);
    });
    const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([place.lng,place.lat]).addTo(map);
    markers.set(place.id,{marker,element:el});
  }
  function makeGlobeMarker(place) {
    const el=document.createElement('button');el.type='button';el.className='sat-pin maplibre-pin';
    el.setAttribute('aria-label',`Open ${(place.displayName || place.name)} apparition details`);el.title=(place.displayName || place.name);
    const dot=document.createElement('span');dot.className='sat-pin-dot';
    const label=document.createElement('span');label.className='sat-pin-label';label.textContent=(place.displayName || place.name);
    el.append(dot,label);
    el.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();window.SKY_SURFER_APP?.selectLocation(place);});
    const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([place.lng,place.lat]).addTo(satelliteGlobe);
    globeMarkers.set(place.id,{marker,element:el});
  }
  // Match the Explorer's OSM-derived 3D building extrusions on the atmospheric
  // MapLibre globe. These only become visible at close zoom (15+); no buildings
  // are fetched for the overview, and missing vector tiles do not break the globe.
  function addGlobe3DBuildings(){
    if(!satelliteGlobe || satelliteGlobe.getLayer('sky-globe-buildings'))return;
    try{
      if(!satelliteGlobe.getSource('sky-globe-osm'))satelliteGlobe.addSource('sky-globe-osm',{type:'vector',url:BUILDING_TILEJSON});
      const firstLabel=(satelliteGlobe.getStyle()?.layers||[]).find(l=>l.type==='symbol' && l.layout?.['text-field']);
      satelliteGlobe.addLayer({id:'sky-globe-buildings',type:'fill-extrusion',source:'sky-globe-osm','source-layer':'building',minzoom:15,
        filter:['!=',['get','hide_3d'],true],
        paint:{
          'fill-extrusion-color':'#c6c4bf',
          'fill-extrusion-height':['interpolate',['linear'],['zoom'],15,0,16,['coalesce',['to-number',['get','render_height']],['*',['coalesce',['to-number',['get','building:levels']],1],3],8]],
          'fill-extrusion-base':['interpolate',['linear'],['zoom'],15,0,16,['coalesce',['to-number',['get','render_min_height']],0]],
          'fill-extrusion-opacity':0.84,
          'fill-extrusion-vertical-gradient':true
        }
      },firstLabel?.id);
    }catch(error){console.warn('Optional globe 3D buildings unavailable:',error);}
  }
  let globeAutoTilt=false;
  function adjustGlobeBuildingView(){
    if(!satelliteGlobe || !globeReady)return;
    const zoom=satelliteGlobe.getZoom();
    if(zoom>=15 && !globeAutoTilt){globeAutoTilt=true;satelliteGlobe.easeTo({pitch:48,duration:reducedMotion()?0:550});}
    else if(zoom<13 && globeAutoTilt){globeAutoTilt=false;satelliteGlobe.easeTo({pitch:0,duration:reducedMotion()?0:450});}
  }
  function moveGlobeToSelected(place) {
    if(!place || !satelliteGlobe || !globeReady || viewMode!=='globe')return;
    const current=satelliteGlobe.getZoom();
    satelliteGlobe.stop();
    satelliteGlobe.easeTo({center:[place.lng,place.lat], zoom:Math.max(current,3.2),
      pitch:0, bearing:0, duration:reducedMotion()?0:1150, essential:true});
  }
  function globeFallback(err) {
    globeFailed=true;globePending=false;globeReady=false;
    console.warn('Sky Surfer: satellite globe unavailable; preserving the offline illustrated globe.',err);
    document.body.classList.remove('maplibre-globe-ready');
    $('mapLibreGlobeCanvas').hidden=true;
    $('mapLibreGlobeCredit').hidden=true;
    try{satelliteGlobe?.remove();}catch(_){}
    satelliteGlobe=null;
  }
  async function initializeSatelliteGlobe(){
    if(globeReady || globePending || globeFailed || satelliteGlobe)return;
    globePending=true;
    try{
      await loadMapLibre();
      // Reuse the same 2016 CC BY imagery as Explorer, not the 2020
      // non-commercial imagery from MapLibre's demonstration page.
      const style=JSON.parse(JSON.stringify(await getSatelliteStyle()));
      style.projection={type:'globe'};
      style.sky={
        'atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,5,1,7,0],
        'sky-color':'#081b2a',
        'horizon-color':'#729cb0',
        'fog-color':'#3e647b',
        'sky-horizon-blend':0.45
      };
      style.light={anchor:'map',position:[1.5,90,80]};
      const container=$('mapLibreGlobeCanvas');
      // Initialize only when the globe view is visible.
      if(viewMode!=='globe'){globePending=false;return;}
      container.hidden=false;
      satelliteGlobe=new maplibregl.Map({container:'mapLibreGlobeCanvas',style,
        ...GLOBE_START,minZoom:0,maxZoom:16,attributionControl:false,
        renderWorldCopies:false,antialias:false});
      compactCredits(satelliteGlobe);
      satelliteGlobe.on('load',()=>{
        globePending=false;globeReady=true;
        addGlobe3DBuildings();
        satelliteGlobe.on('zoomend',adjustGlobeBuildingView);
        for(const p of places)makeGlobeMarker(p);
        updateMarkers();
        document.body.classList.add('maplibre-globe-ready');
        $('mapLibreGlobeCredit').hidden=false;
        requestAnimationFrame(()=>satelliteGlobe?.resize());
        if(pendingSelection)moveGlobeToSelected(pendingSelection);
      });
      satelliteGlobe.on('error',event=>{
        const err=String(event?.error?.message||event?.message||'Globe resource failure');
        // Missing optional labels should not remove the globe.
        if(/webgl|gpu|context lost|invalid projection|unsupported projection/i.test(err))globeFallback(err);
        else console.warn('Satellite globe resource:',err);
      });
      satelliteGlobe.on('webglcontextlost',()=>globeFallback('WebGL context lost'));
      // A tile service can be slow; do not abandon offline fallback merely
      // because an ordinary network tile is loading.
    }catch(err){globeFallback(err?.message||String(err));}
  }
  // Based on MapLibre's official 'Display buildings in 3D' example:
  // https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/
  // We reuse that fill-extrusion approach but draw it over the CC BY 4.0 satellite
  // raster rather than replacing the basemap with an ordinary vector street style.
  function ensureBuildingLayer(){
    if(!map || !mapReady)return false;
    if(map.getLayer(BUILDING_LAYER)){
      buildingLayerReady=true;
      return true;
    }
    try{
      let sourceId='openfreemap';
      const source=map.getSource(sourceId);
      if(!source || (source.type && source.type!=='vector')){
        sourceId='sky-surfer-building-source';
        if(!map.getSource(sourceId)){
          map.addSource(sourceId,{type:'vector',url:BUILDING_TILEJSON});
        }
      }
      // Labels must sit on top of buildings, even when they belong to the
      // optional OpenFreeMap satellite-label overlay.
      const symbol=(map.getStyle()?.layers||[]).find(l=>l.type==='symbol'&&l.layout?.['text-field']);
      const extrusion={
        id:BUILDING_LAYER,type:'fill-extrusion',source:sourceId,'source-layer':'building',
        minzoom:15,filter:['!=',['get','hide_3d'],true],
        layout:{visibility:'visible'},
        paint:{
          // Neutral stone-colored volumes read well on satellite photographs.
          'fill-extrusion-color':['interpolate',['linear'],
            ['coalesce',['to-number',['get','render_height']],8],
            0,'#e0dfd8',60,'#c7c6c1',200,'#b7bcc2',400,'#aeb8c3'],
          'fill-extrusion-height':['interpolate',['linear'],['zoom'],15,0,16,
            ['coalesce',['to-number',['get','render_height']],
              ['*',['coalesce',['to-number',['get','building:levels']],1],3],8]],
          'fill-extrusion-base':['interpolate',['linear'],['zoom'],15,0,16,
            ['coalesce',['to-number',['get','render_min_height']],0]],
          'fill-extrusion-opacity':0.88,
          'fill-extrusion-vertical-gradient':true
        }
      };
      map.addLayer(extrusion,symbol?.id);
      buildingLayerReady=true;
      return true;
    }catch(error){
      console.warn('Sky Surfer 3D buildings unavailable:',error);
      // Do not hide working satellite imagery if optional building data fails.
      buildingLayerReady=false;
      return false;
    }
  }
  // The 3D buildings overlay is active for *both* Satellite and Street Map.
  // MapLibre's minzoom setting keeps it hidden until sufficiently close.
  function activateAutomaticBuildings(){
    if(ensureBuildingLayer())
      map.setLayoutProperty(BUILDING_LAYER,'visibility','visible');
  }

  function updateMarkers(){
    const visible=new Set((window.SKY_SURFER_APP?.getFiltered?.()||places).map(p=>p.id));
    for(const place of places){
      const record=markers.get(place.id);
      if(record){
        record.element.hidden=!visible.has(place.id);
        record.element.classList.toggle('selected',place.id===pendingSelection?.id);
      }
      const globeRecord=globeMarkers.get(place.id);
      if(globeRecord){
        globeRecord.element.hidden=!visible.has(place.id);
        globeRecord.element.classList.toggle('selected',place.id===pendingSelection?.id);
      }
    }
  }
  function moveToSelected(place){
    if(!place||viewMode!=='satellite'||!mapReady||!map)return;
    map.stop();
    const zoom=map.getZoom();const destinationZoom=zoom<7?11.5:zoom;
    const start=map.getCenter();let lng=place.lng;
    while(lng-start.lng>180)lng-=360;
    while(lng-start.lng< -180)lng+=360;
    map.easeTo({center:[lng,place.lat],zoom:destinationZoom,
      duration:reducedMotion()?0:Math.min(1750,Math.max(760,920+Math.abs(lng-start.lng)*7)),
      easing:t=>t*t*(3-2*t),essential:true});
  }
  function select(place){pendingSelection=place;updateMarkers();if(place){
    moveToSelected(place);moveGlobeToSelected(place);
  }}

  async function initialize(){
    if(map||pendingInit)return;
    if(!window.maplibregl?.Map){showFailure('MapLibre library not loaded','library');return;}
    pendingInit=true;clearFailure();
    // No blocking loading banner: the basemap remains visible while tiles stream in.
    try{
      const style=await getExplorerStyle();
      if(viewMode!=='satellite'){pendingInit=false;return;}
      map=new maplibregl.Map({
        container:'mapLibreCanvas',style,
        ...EXPLORER_START,minZoom:1.5,maxZoom:19,
        attributionControl:false,cooperativeGestures:false,
        renderWorldCopies:true,antialias:true,
        fadeDuration:430,refreshExpiredTiles:true
      });
      // One stack of Sky Surfer controls sits immediately above the compact 'i'.
      compactCredits(map);
      initializationTimer=setTimeout(()=>{
        if(!mapReady&&viewMode==='satellite'){
          showNotice('Satellite imagery is still loading. Please check internet access.');
          diagDetails.textContent=browserReport()+' · Status: map created but imagery not ready.';
          diag.hidden=false;
        }
      },15000);
      map.on('load',()=>{
        compactCreditsOnLoad();
        clearTimeout(initializationTimer);mapReady=true;pendingInit=false;
        clearFailure();hideNotice();
        for(const place of places)makeMarker(place);
        updateMarkers();map.resize();
        activateAutomaticBuildings();
        applyExplorerBasemap();
        if(pendingSelection)moveToSelected(pendingSelection);
      });
      map.on('error',event=>{
        const raw=event?.error;
        const message=String(raw?.message||event?.message||'Unknown map error');
        const isGPU=window.maplibregl?.GPUInitializationError&&raw instanceof window.maplibregl.GPUInitializationError;
        if(isGPU||/failed to initialize webgl|webgl creation failed|gpu initialization|context lost/i.test(message)){
          clearTimeout(initializationTimer);showFailure(message,'graphics');return;
        }
        if(message===lastError)return;lastError=message;
        console.warn('Sky Surfer satellite map request:',message);
        if(!mapReady){
          showNotice('A satellite map resource failed: '+message+' — Live Google Map remains available.');
          diagDetails.textContent=browserReport()+' · Resource error: '+message;diag.hidden=false;
        }
      });
      map.on('webglcontextlost',()=>showFailure('WebGL context lost','graphics'));
      map.on('zoomend',adjustAutomatic3DPerspective);
      map.on('move',()=>{
        const c=map.getCenter();
        $('coordinates').textContent=`${Math.abs(c.lat).toFixed(3)}° ${c.lat>=0?'N':'S'}  ${Math.abs(c.lng).toFixed(3)}° ${c.lng>=0?'E':'W'} · ZOOM ${map.getZoom().toFixed(1)}`;
      });
    }catch(error){
      pendingInit=false;clearTimeout(initializationTimer);
      try{map?.remove();}catch(_){}map=null;
      showFailure(error?.message||String(error),'initialization');
    }
  }
  function setBasemap(mode){
    if(!['satellite','street'].includes(mode)||mode===basemapMode)return;
    if(mode==='street'&&!streetStyleAvailable){
      showNotice('Street Map could not load. Check your internet connection; Satellite is still available.');
      return;
    }
    basemapMode=mode;
    updateSwitch();
    if(!mapReady)return;
    hideNotice();
    // No automatic zoom/pan or setStyle. Keep current camera and imagery in memory.
    applyExplorerBasemap();
  }
  $('satelliteBasemapBtn').addEventListener('click',()=>setBasemap('satellite'));
  $('streetsBasemapBtn').addEventListener('click',()=>setBasemap('street'));

  function setMode(mode){
    if(!['google','satellite','globe'].includes(mode))return;
    viewMode=mode;
    const isGoogle=mode==='google',isExplorer=mode==='satellite',isGlobe=mode==='globe';
    document.body.dataset.viewMode=mode;
    $('mapSection').classList.toggle('google-active',isGoogle);
    $('mapSection').classList.toggle('satellite-active',isExplorer);
    $('mapSection').classList.toggle('globe-active',isGlobe);
    $('googleLiveMap').hidden=!isGoogle;
    $('googleGuide').hidden=!isGoogle;
    root.hidden=!isExplorer;

    styleSwitch.hidden=!(isExplorer && explorerStyleExpanded);
    $('satelliteViewBtn').setAttribute('aria-expanded',String(isExplorer && explorerStyleExpanded));
    for(const [id,active] of [['googleViewBtn',isGoogle],['satelliteViewBtn',isExplorer],['globeViewBtn',isGlobe]]){
      $(id).classList.toggle('active',active);
      $(id).setAttribute('aria-pressed',String(active));
    }
    const reset=$('resetGlobe');
    const inBtn=$('globeZoomIn'),outBtn=$('globeZoomOut');
    const controlsLabel=isExplorer?'map':'globe';
    reset.setAttribute('aria-label','Reset '+controlsLabel+' view');
    reset.title='Reset '+controlsLabel+' view';
    inBtn.setAttribute('aria-label','Zoom '+controlsLabel+' in');
    inBtn.title='Zoom '+controlsLabel+' in';
    outBtn.setAttribute('aria-label','Zoom '+controlsLabel+' out');
    outBtn.title='Zoom '+controlsLabel+' out';
    $('viewModeLabel').innerHTML=`<span class="live-dot"></span> ${isGoogle?'LIVE GOOGLE MY MAPS':isExplorer?'MARIAN APPARITIONS MAP':'INTERACTIVE 3D GLOBE'} <span class="globe-top-separator">/</span> v1.39`;
    $('globeHelp').innerHTML=`<span class="hand-icon">↔</span> DRAG TO ${isExplorer?'PAN':'ROTATE'} <span class="help-sep">•</span> SCROLL TO ZOOM <span class="help-sep">•</span> SELECT A MARKER`;
    if(isExplorer){
      if(!map){
        if(!mapFailed)hideNotice();
        loadMapLibre().then(()=>{if(viewMode==='satellite')initialize();})
          .catch(error=>showFailure(error?.message||String(error),'library'));
      }
      requestAnimationFrame(()=>{
        map?.resize();
        if(mapReady&&pendingSelection)moveToSelected(pendingSelection);
      });
    }
    if(isGlobe){
      window.dispatchEvent(new Event('resize'));
      if(globeReady){requestAnimationFrame(()=>satelliteGlobe?.resize());if(pendingSelection)moveGlobeToSelected(pendingSelection);}
      else initializeSatelliteGlobe();
    }
  }
  $('googleViewBtn').addEventListener('click',()=>setMode('google'));
  $('satelliteViewBtn').addEventListener('click',()=>{
    if(viewMode==='satellite'){
      explorerStyleExpanded=!explorerStyleExpanded;
      styleSwitch.hidden=!explorerStyleExpanded;
      $('satelliteViewBtn').setAttribute('aria-expanded',String(explorerStyleExpanded));
    }else{explorerStyleExpanded=true;setMode('satellite');}
  });
  $('globeViewBtn').addEventListener('click',()=>setMode('globe'));
  $('refreshGoogle').addEventListener('click',()=>{const frame=$('googleMapFrame');frame.src=frame.src;});
  $('globeZoomIn').addEventListener('click',()=>{
    if(viewMode==='satellite')map?.zoomIn({duration:reducedMotion()?0:280});
    else if(viewMode==='globe' && globeReady)satelliteGlobe?.zoomIn({duration:reducedMotion()?0:300});
  });
  $('globeZoomOut').addEventListener('click',()=>{
    if(viewMode==='satellite')map?.zoomOut({duration:reducedMotion()?0:280});
    else if(viewMode==='globe' && globeReady)satelliteGlobe?.zoomOut({duration:reducedMotion()?0:300});
  });
  $('resetGlobe').addEventListener('click',()=>{
    // Restore ALL initial camera axes: map center, zoom, bearing AND pitch.
    // Right-drag rotates/pitches the map; resetting only center and zoom
    // used to leave the angled perspective behind.
    if(viewMode==='satellite'){
      automatic3DTilt=false;
      if(basemapMode!=='satellite'){
        basemapMode='satellite';
        updateSwitch();
        applyExplorerBasemap();
      }
      map?.stop();
      map?.easeTo({...EXPLORER_START,duration:reducedMotion()?0:950,essential:true});
    }else if(viewMode==='globe' && globeReady){
      satelliteGlobe?.stop();
      satelliteGlobe?.easeTo({...GLOBE_START,duration:reducedMotion()?0:850,essential:true});
    }
  });
  window.addEventListener('resize',()=>{
    if(viewMode==='satellite')map?.resize();
    else if(viewMode==='globe' && globeReady)satelliteGlobe?.resize();
  });
  window.SKY_SURFER_MAP={
    refresh:()=>{updateMarkers();},select:place=>{select(place);},setMode,
    getView:()=>({mode:viewMode,basemapMode,zoom:map?.getZoom(),center:map?.getCenter(),ready:mapReady}),
    getTileStats:()=>({library:'MapLibre GL JS',style:tileModeLabels[basemapMode],ready:mapReady,failed:mapFailed,errorType:lastErrorType,error:lastError,report:browserReport()})
  };
  updateSwitch();setMode('satellite');
})();
