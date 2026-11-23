/* Sky Surfer v1.38 — hosts the ORIGINAL God's Eye View runtime, not a simulated scene.
   Native source must be installed separately from upstream MIT repository. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const stage = $('cinematicStage');
  const frame = $('gevNativeFrame');
  const setup = $('gevSetup');
  if (!stage || !frame || !setup) return;
  const nativeLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const baseUrl = nativeLocal ? 'http://127.0.0.1:4173/' : new URL('gods-eye-view/', location.href).href;
  const frameUrl = new URL(baseUrl);
  frameUrl.searchParams.set('sky-surfer', '1');
  const trustedOrigin = frameUrl.origin;
  let loaded = false, ready = false, selected = null, currentAttempt = 0;
  let watchdog = null;
  const places = window.SKY_SURFER_DATA?.locations || [];
  function visible(){ return document.body.dataset.viewMode === 'cinematic' && !stage.hidden; }
  function status(msg) { $('gevConnectionNotice').textContent = msg; }
  function showSetup(title, message) {
    $('gevSetupTitle').textContent = title;
    $('gevSetupMessage').textContent = message;
    setup.hidden = false;
  }
  function send(type, detail={}) {
    if (!ready || !frame.contentWindow) return false;
    frame.contentWindow.postMessage({type, ...detail}, trustedOrigin);
    return true;
  }
  function connect() {
    const attempt=++currentAttempt;
    ready=false; loaded=true;
    frame.src=frameUrl.href;
    setup.hidden=false;
    showSetup('Connecting to original God’s Eye View', nativeLocal
      ? 'If this connection does not complete, double-click START_NATIVE_GODS_EYE_VIEW_WINDOWS.bat. It installs the original source from GitHub and starts the native viewer at 127.0.0.1:4173.'
      : 'Publish a compatible, legally licensed God’s Eye View build at /gods-eye-view/ on your website. The native application may also require its own backend for full functionality.');
    status('ORIGINAL GEV · CONNECTING');
    if(watchdog)clearTimeout(watchdog);
    watchdog=setTimeout(()=>{
      if(attempt !== currentAttempt || ready || !visible())return;
      status('ORIGINAL GEV · NOT CONNECTED');
      showSetup('Original viewer not connected', nativeLocal
        ? 'Start START_NATIVE_GODS_EYE_VIEW_WINDOWS.bat. This tab does not display an imitation when the original application is unavailable. Select CONNECT TO NATIVE VIEW to retry after its server starts.'
        : 'The original application is not deployed at /gods-eye-view/. Please configure and deploy its build first.');
    },15000);
  }
  function fly(place) {
    if (!place) return;
    selected=place;
    send('sky-surfer:fly',{id:place.id,lat:place.lat,lng:place.lng,name:place.displayName||place.name});
  }
  function activate(){ if(!loaded)connect();else if(ready)setup.hidden=true; }
  function deactivate(){ /* Keep the embedded native app alive when switching views. */ }
  function select(place){ selected=place; if(ready&&visible()&&place)fly(place); }
  function goSelected(){fly(selected || window.SKY_SURFER_APP?.getSelected?.() || places[0]);}
  function resize(){if(ready)send('sky-surfer:resize');}
  window.addEventListener('message', (event)=>{
    if(event.source !== frame.contentWindow || event.origin !== trustedOrigin)return;
    const data=event.data;
    if(!data || typeof data !== 'object')return;
    if(data.type === 'sky-surfer:ready'){
      ready=true; if(watchdog)clearTimeout(watchdog);
      setup.hidden=true;
      status('ORIGINAL GEV · CONNECTED');
      send('sky-surfer:markers',{locations:places.map(p=>({id:p.id,name:p.displayName||p.name,lat:p.lat,lng:p.lng}))});
      const target=selected || window.SKY_SURFER_APP?.getSelected?.();
      if(target)fly(target);
    }else if(data.type === 'sky-surfer:select' && typeof data.id==='string'){
      const target=places.find(p=>p.id===data.id);
      if(target)window.SKY_SURFER_APP?.selectLocation?.(target);
    }else if(data.type==='sky-surfer:error'){
      status('ORIGINAL GEV · '+String(data.message||'INTEGRATION ERROR').slice(0,100));
    }
  });
  $('gevConnect').addEventListener('click',connect);
  $('gevReload').addEventListener('click',connect);
  $('gevFlySelected').addEventListener('click',goSelected);
  window.SKY_SURFER_CINEMATIC={activate,deactivate,resize,refresh:()=>{},select,
    flyover:goSelected,reset:()=>send('sky-surfer:reset'),
    zoomIn:()=>send('sky-surfer:zoom',{direction:1}),
    zoomOut:()=>send('sky-surfer:zoom',{direction:-1}),
    getStatus:()=>({native:true,connected:ready,base:baseUrl})};
  if(visible())activate();
})();
