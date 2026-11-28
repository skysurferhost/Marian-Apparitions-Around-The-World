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
  

  const SATELLITE_TILES = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';
  const EOX_CREDIT = '<a href="https://cloudless.eox.at/" target="_blank" rel="noopener noreferrer">EOxCloudless</a> by <a href="https://eox.at/" target="_blank" rel="noopener noreferrer">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016) · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>';
  const tileModeLabels = {satellite:'Shared regional aerial imagery and photomesh',street:'OpenFreeMap streets and shared white buildings'};
  let viewMode = null;
  let explorerStyleExpanded = true; // Toggle the sub-options without changing the map.
  const DEFAULT_BASEMAP = 'street';
  let basemapMode = DEFAULT_BASEMAP;
  let detail=null, geometryEnabled=true;
  let streetStyleAvailable = null; // Unknown until the remote style is checked.
  let explorerStylePromise = null;
  const layerVisibilityByMode = new Map();
  let automatic3DTilt = false;
  let map = null;
  let mapReady = false;
  let mapFailed = false;
  let pendingInit = false;
  let pendingSelection = null;
  // The phone drawer selection is temporary; keep its last destination across map engines.
  let lastPhoneFocus = null;
  let dependencyPromise = null;
  let initializationTimer = null;
  let lastError = '';
  let lastErrorType = '';
  const markers = new Map();
  const EXPLORER_START = { center: [-40, 30], zoom: 2.35, bearing: 0, pitch: 0 };
  // v1.49: on actual phones, open/reset the flat Marian map at the most
  // zoomed-out supported level. Desktop retains its existing camera.
  const PHONE_EXPLORER_START = {center:[-40, 20],zoom:0,bearing:0,pitch:0};
  function explorerStart(){return isPhoneDrawer()?PHONE_EXPLORER_START:EXPLORER_START;}
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
    showNotice('Satellite map unavailable: '+lastError+'. Try the 3D Globe, or check your connection and refresh.');
    diagDetails.textContent=browserReport()+' · Error: '+lastError;diag.hidden=false;
  }
  function clearFailure(){diag.hidden=true;mapFailed=false;lastError='';lastErrorType='';}
  $('mapUseGlobe').addEventListener('click',()=>setMode('cesium'));
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
        if(basemapMode==='street'){basemapMode='satellite';updateSwitch();}
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
    detail?.configure(viewMode==='satellite',basemapMode,geometryEnabled);
  }
  function adjustAutomatic3DPerspective(){
    if(!map||!mapReady)return;
    const z=map.getZoom();
    if(geometryEnabled && z>=15.65 && map.getPitch()<7){
      automatic3DTilt=true;
      map.easeTo({pitch:48,duration:reducedMotion()?0:580,essential:true});
    }else if(z<14.7 && automatic3DTilt){
      automatic3DTilt=false;
      // Don't override a perspective intentionally changed by right-drag.
      if(Math.abs(map.getPitch()-48)<7)
        map.easeTo({pitch:0,duration:reducedMotion()?0:520,essential:true});
    }
  }

  function setCredits(){credits.hidden=true;credits.textContent='';}
  function updateCube(){if(viewMode!=='satellite')return;const b=$('cesiumBuildingsToggle');b.hidden=false;b.disabled=false;b.setAttribute('aria-pressed',String(geometryEnabled));b.title=geometryEnabled?'Hide 3D buildings':'Show 3D buildings';}
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
  // Mobile only: keep the chosen marker in the exposed RIGHT-hand map region,
  // accounting for the left-hand PDF drawer in either phone orientation.
  function isPhoneDrawer(){return !!document.querySelector('.app-shell.phone-drawer-enabled');}
  function phoneMarkerOffset(){
    if(!isPhoneDrawer())return [0,0];
    const width=$('mapSection').getBoundingClientRect().width;
    // A hidden drawer can report its old parent width before it opens.
    // Compute from phone-specific CSS rules instead so selection is accurate.
    const landscape=window.matchMedia('(orientation: landscape)').matches;
    const panelWidth=Math.min(width*(landscape?.49:.68),landscape?420:340);
    return [Math.round(Math.min(width-45,panelWidth)/2),0];
  }
  function recenterAfterDrawer(place){
    if(viewMode==='cesium'){window.SKY_SURFER_CESIUM?.recenter(place,false);return;}
    if(!place || !isPhoneDrawer())return;
    const active=map;
    const ready=mapReady;
    if(!active||!ready)return;
    active.stop();
    active.easeTo({center:[place.lng,place.lat],zoom:active.getZoom(),offset:[0,0],duration:reducedMotion()?0:400,essential:true});
  }
  function phoneViewportChanged(place){
    if(viewMode==='cesium'){window.SKY_SURFER_CESIUM?.recenter(place,true);return;}
    if(!place||!isPhoneDrawer())return;
    const active=map;
    const ready=mapReady;
    if(!active||!ready)return;
    // Re-frame after the screen rotates; preserve the user's current zoom.
    active.resize();
    active.easeTo({center:[place.lng,place.lat],zoom:active.getZoom(),offset:phoneMarkerOffset(),duration:reducedMotion()?0:350,essential:true});
  }
  function updateMarkers(){
    const visible=new Set((window.SKY_SURFER_APP?.getFiltered?.()||places).map(p=>p.id));
    for(const place of places){
      const record=markers.get(place.id);
      if(record){
        record.element.hidden=!visible.has(place.id);
        record.element.classList.toggle('selected',place.id===pendingSelection?.id);
      }

    }
  }
  function moveToSelected(place,withDrawer=true){
    if(!place||viewMode!=='satellite'||!mapReady||!map)return;
    map.stop();
    const zoom=map.getZoom();const destinationZoom=zoom<7?11.5:zoom;
    const start=map.getCenter();let lng=place.lng;
    while(lng-start.lng>180)lng-=360;
    while(lng-start.lng< -180)lng+=360;
    map.easeTo({center:[lng,place.lat],zoom:destinationZoom,
      offset:withDrawer?phoneMarkerOffset():[0,0],duration:reducedMotion()?0:Math.min(1750,Math.max(760,920+Math.abs(lng-start.lng)*7)),
      easing:t=>t*t*(3-2*t),essential:true});
  }
  function focusExplorer(){
    if(pendingSelection)moveToSelected(pendingSelection);
    else if(isPhoneDrawer()&&lastPhoneFocus)moveToSelected(lastPhoneFocus,false);
  }
  function select(place){pendingSelection=place;if(place&&isPhoneDrawer())lastPhoneFocus=place;updateMarkers();window.SKY_SURFER_CESIUM?.select(place);if(place){
    moveToSelected(place);
  }}

  async function initialize(){
    if(map||pendingInit)return;
    if(!window.maplibregl?.Map){showFailure('MapLibre library not loaded','library');return;}
    pendingInit=true;clearFailure();
    // No blocking loading banner: the basemap remains visible while tiles stream in.
    try{
      const style=await getExplorerStyle();
      if(viewMode!=='satellite'){pendingInit=false;return;}
      // Start with the selected layers already visible, avoiding a satellite flash.
      for(const layer of style.layers){
        const visibility=layerVisibilityByMode.get(layer.id)?.[basemapMode];
        if(visibility)layer.layout={...(layer.layout||{}),visibility};
      }
      map=new maplibregl.Map({
        container:'mapLibreCanvas',style,
        ...explorerStart(),minZoom:isPhoneDrawer()?0:1.5,maxZoom:22,
        attributionControl:false,cooperativeGestures:false,
        renderWorldCopies:true,antialias:!isPhoneDrawer(),
        fadeDuration:200,refreshExpiredTiles:true
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
        try{detail=window.SKY_SURFER_MAP_DETAIL.create(map);}catch(error){console.warn("Detailed imagery unavailable",error);}
        applyExplorerBasemap();
        if(viewMode==='satellite')focusExplorer();
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
          showNotice('A satellite map resource failed: '+message+'. Try the 3D Globe or check your connection.');
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

  function setMode(mode,preferredBasemap=DEFAULT_BASEMAP){
    if(mode==='globe')mode='cesium'; // backwards-compatible links, not a second globe
    if(!['satellite','cesium'].includes(mode))return;
    if(viewMode==='satellite'&&mode!=='satellite'&&isPhoneDrawer())map?.stop();
    if(viewMode==='cesium')geometryEnabled=window.SKY_SURFER_CESIUM?.getGeometryEnabled?.()??geometryEnabled;
    if(mode==='satellite'&&viewMode!=='satellite'){
      basemapMode=preferredBasemap==='satellite'||streetStyleAvailable===false?'satellite':DEFAULT_BASEMAP;
      updateSwitch();
    }
    viewMode=mode;
    const isExplorer=mode==='satellite',isCesium=mode==='cesium';
    document.body.dataset.viewMode=mode;
    $('mapSection').classList.toggle('satellite-active',isExplorer);
    $('mapSection').classList.remove('globe-active');
    $('mapSection').classList.toggle('cesium-active',isCesium);
    if(!isExplorer)detail?.configure(false,basemapMode,geometryEnabled);
    window.SKY_SURFER_CESIUM?.setActive(isCesium,isPhoneDrawer()?lastPhoneFocus:null);
    if(isCesium)window.SKY_SURFER_CESIUM?.setGeometryEnabled(geometryEnabled);
    else {updateCube();applyExplorerBasemap();}
    root.hidden=!isExplorer;

    styleSwitch.hidden=!(isExplorer && explorerStyleExpanded);
    $('satelliteViewBtn').setAttribute('aria-expanded',String(isExplorer && explorerStyleExpanded));
    for(const [id,active] of [['satelliteViewBtn',isExplorer],['cesiumViewBtn',isCesium]]){
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
    $('globeHelp').innerHTML=`<span class="hand-icon">↔</span> DRAG TO ${isExplorer?'PAN':'ROTATE'} <span class="help-sep">•</span> SCROLL TO ZOOM <span class="help-sep">•</span> ${isExplorer?'SELECT A MARKER':'WASD / ARROWS TO MOVE'}`;
    if(isExplorer){
      if(!map){
        if(!mapFailed)hideNotice();
        loadMapLibre().then(()=>{if(viewMode==='satellite')initialize();})
          .catch(error=>showFailure(error?.message||String(error),'library'));
      }
      requestAnimationFrame(()=>{
        if(viewMode!=='satellite')return;
        map?.resize();
        if(mapReady)focusExplorer();
      });
    }
  }
  $('satelliteViewBtn').addEventListener('click',()=>{
    if(viewMode==='satellite'){
      explorerStyleExpanded=!explorerStyleExpanded;
      styleSwitch.hidden=!explorerStyleExpanded;
      $('satelliteViewBtn').setAttribute('aria-expanded',String(explorerStyleExpanded));
    }else{explorerStyleExpanded=true;setMode('satellite');}
  });
  $('cesiumViewBtn').addEventListener('click',()=>setMode('cesium'));
  $('cesiumBuildingsToggle').addEventListener('click',()=>{if(viewMode!=='satellite')return;geometryEnabled=!geometryEnabled;updateCube();detail?.configure(true,basemapMode,geometryEnabled);});
  $('globeZoomIn').addEventListener('click',()=>{
    if(viewMode==='satellite')map?.zoomIn({duration:reducedMotion()?0:280});
    else if(viewMode==='cesium')window.SKY_SURFER_CESIUM?.zoom(1);
  });
  $('globeZoomOut').addEventListener('click',()=>{
    if(viewMode==='satellite')map?.zoomOut({duration:reducedMotion()?0:280});
    else if(viewMode==='cesium')window.SKY_SURFER_CESIUM?.zoom(-1);
  });
  $('resetGlobe').addEventListener('click',()=>{
    if(isPhoneDrawer())lastPhoneFocus=null;
    // Restore ALL initial camera axes: map center, zoom, bearing AND pitch.
    // Right-drag rotates/pitches the map; resetting only center and zoom
    // used to leave the angled perspective behind.
    if(viewMode==='satellite'){
      automatic3DTilt=false;
      const resetBasemap=streetStyleAvailable===false?'satellite':DEFAULT_BASEMAP;
      if(basemapMode!==resetBasemap){
        basemapMode=resetBasemap;
        updateSwitch();
        applyExplorerBasemap();
      }
      map?.stop();
      map?.easeTo({...explorerStart(),duration:reducedMotion()?0:950,essential:true});
    }else if(viewMode==='cesium'){window.SKY_SURFER_CESIUM?.reset();

    }
  });
  window.addEventListener('resize',()=>{
    if(viewMode==='satellite')map?.resize();
  });
  window.SKY_SURFER_MAP={
    refresh:()=>{updateMarkers();window.SKY_SURFER_CESIUM?.refresh();},select:place=>{select(place);},setMode,
    phoneViewportChanged,recenterAfterDrawer,
    getView:()=>({mode:viewMode,basemapMode,zoom:map?.getZoom(),center:map?.getCenter(),ready:mapReady}),
    getTileStats:()=>({library:'MapLibre GL JS',style:tileModeLabels[basemapMode],ready:mapReady,failed:mapFailed,errorType:lastErrorType,error:lastError,report:browserReport()})
  };
  const requestedView=new URLSearchParams(location.search).get('view')?.toLowerCase();
  updateSwitch();setMode(window.SKY_SURFER_GLOBE_NAV?.initialMode(location.search)??(['satellite','map','street','streets'].includes(requestedView)?'satellite':'cesium'),requestedView==='satellite'?'satellite':DEFAULT_BASEMAP);
})();
