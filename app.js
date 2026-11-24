/* Sky Surfer Marian Apparitions Map — no frameworks, APIs, or network connections required. */
(() => {
  'use strict';
  const D = window.SKY_SURFER_DATA || {locations:[]};
  const locations = D.locations || [];
  const $ = id => document.getElementById(id);
  const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));
  const rad = Math.PI/180;
  const PI = Math.PI;
  const state = {yaw:-98*rad,pitch:39*rad,zoom:1.0,filter:'all',search:'',selected:null,fly:null,globeDragging:false,pointer:null,justDragged:false,mediaIndex:0,mediaZoom:1,mediaPanX:0,mediaPanY:0,stageDragging:false,stagePointer:null,pinching:false,pinchStart:0,pinchZoom:1};
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let globeGL=null,globeProgram=null,globeData=null,globeW=0,globeH=0,globeRadius=0,globeCenterX=0,globeCenterY=0,sceneDirty=true;
  // WebGL is optional: draw an actual textured, orthographic Earth on a 2D
  // canvas when graphics acceleration, WebGL, or shader compilation is blocked.
  let softwareCanvas=null,softwareContext=null,softwareEarth=null,softwareLastFrame=0;
  let webGLFirstDraw=true;
  const softwareFrame=document.createElement('canvas');
  const softwareFrameCtx=softwareFrame.getContext('2d',{willReadFrequently:true});
  let softwareEarthPixels=null,softwareEarthW=0,softwareEarthH=0;
  const buttons = new Map();
  // UI day/night theme; the satellite tiles and PDF pages retain their original colors.
  // Night is the default, and the choice persists when browser storage is available.
  const themeButton = $('themeToggle');
  function setTheme(mode, persist = false) {
    const day = mode === 'day';
    document.documentElement.dataset.theme = day ? 'day' : 'night';
    themeButton.setAttribute('aria-pressed', String(day));
    themeButton.setAttribute('aria-label', day ? 'Switch to night mode' : 'Switch to day mode');
    themeButton.title = day ? 'Switch to night mode' : 'Switch to day mode';
    if (persist) {
      try { localStorage.setItem('sky-surfer-marian-theme', day ? 'day' : 'night'); }
      catch (_) { /* Storage may be unavailable with file:// or privacy settings. */ }
    }
  }
  setTheme(document.documentElement.dataset.theme);
  themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'day' ? 'night' : 'day', true));
  // Whole-app fullscreen: preserve map, sidebar, details, directory and theme.
  const siteFullscreenButton = $('siteFullscreen');
  const appShell = document.querySelector('.app-shell');
  const detailPanel = $('infoPanel');
  const originalPanelParent = detailPanel.parentElement;
  let panelCloseTimer = 0;
  let phoneDrawer = false;
  // A coarse pointer + phone-sized viewport is used so resizing a desktop browser
  // does not change the already-approved PC layout. This works in Squarespace iframes
  // as well as when the app is opened directly on an Android phone.
  function isPhoneViewport(){
    return window.matchMedia('(pointer: coarse)').matches &&
      window.innerWidth <= 1100 &&
      Math.min(window.innerWidth, window.innerHeight) <= 600;
  }
  function syncPhoneDrawer(){
    const enabled = isPhoneViewport();
    if(phoneDrawer !== enabled){
      phoneDrawer = enabled;
      document.body.classList.toggle('phone-drawer-page', enabled);
      appShell.classList.toggle('phone-drawer-enabled', enabled);
      const newParent = enabled ? $('mapSection') : originalPanelParent;
      if(detailPanel.parentElement !== newParent) newParent.appendChild(detailPanel);
      if(!enabled){
        clearTimeout(panelCloseTimer);
        detailPanel.classList.remove('is-open');
      } else if(!detailPanel.hidden) {
        detailPanel.classList.add('is-open');
      }
    }
  }
  syncPhoneDrawer();
  window.addEventListener('resize', ()=>{
    syncPhoneDrawer();
    if(phoneDrawer && state.selected)window.SKY_SURFER_MAP?.phoneViewportChanged?.(state.selected);
  }, {passive:true});
  function openDetailPanel(){
    clearTimeout(panelCloseTimer);
    syncPhoneDrawer();
    detailPanel.hidden = false;
    detailPanel.scrollTop = 0;
    if(phoneDrawer){
      detailPanel.classList.remove('is-open');
      requestAnimationFrame(()=>requestAnimationFrame(()=>detailPanel.classList.add('is-open')));
    }
  }
  function hideDetailPanel(){
    clearTimeout(panelCloseTimer);
    if(!phoneDrawer){
      detailPanel.hidden=true;
      detailPanel.classList.remove('is-open');
      return;
    }
    detailPanel.classList.remove('is-open');
    panelCloseTimer=setTimeout(()=>{
      if(!detailPanel.classList.contains('is-open'))detailPanel.hidden=true;
    },310);
  }

  function currentFullscreen(){ return document.fullscreenElement || document.webkitFullscreenElement; }
  function updateSiteFullscreenButton(){
    const active = !!currentFullscreen();
    siteFullscreenButton.setAttribute('aria-pressed', String(active));
    siteFullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen map' : 'Enter fullscreen map');
    siteFullscreenButton.title = active ? 'Exit fullscreen map' : 'Enter fullscreen map';
    siteFullscreenButton.querySelector('.site-fullscreen-expand').hidden = active;
    siteFullscreenButton.querySelector('.site-fullscreen-contract').hidden = !active;
    syncPhoneDrawer();
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  siteFullscreenButton.addEventListener('click',async () => {
    try {
      if(currentFullscreen()){
        if(document.exitFullscreen) await document.exitFullscreen();
        else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if(appShell.requestFullscreen) await appShell.requestFullscreen();
      else if(appShell.webkitRequestFullscreen) appShell.webkitRequestFullscreen();
      else window.alert('Fullscreen is not supported in this browser. You can still use the browser fullscreen shortcut (F11 on Windows).');
    } catch (error) {
      console.warn('Fullscreen request was not granted:', error);
      window.alert('The browser could not enter fullscreen. Try F11 on Windows.');
    }
    updateSiteFullscreenButton();
  });
  document.addEventListener('fullscreenchange', updateSiteFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateSiteFullscreenButton);

  const allCount=locations.length, docCount=locations.filter(p=>p.media&&p.media.length).length;
  $('allCount').textContent=allCount; $('docCount').textContent=docCount;
  const fmt = (v,pos,neg)=>`${Math.abs(v).toFixed(3)}° ${v>=0?pos:neg}`;
  const labelCoords = p=>`${fmt(p.lat,'N','S')}  ·  ${fmt(p.lng,'E','W')}`;
  function filtered() { const s=state.search.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); return locations.filter(p=>(state.filter==='all'||(p.media||[]).length>0)&&(!s||(p.searchText||`${p.name} ${p.description||''}`).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(s))); }
  function buildPlaces() {
    const container=$('placeList');container.replaceChildren();
    const selected=filtered(); $('visibleCount').textContent=String(selected.length).padStart(2,'0')+' APPARITIONS';
    if(!selected.length){const empty=document.createElement('div');empty.className='list-empty';empty.textContent='No apparitions match. Try another search.';container.append(empty);}
    for(const p of selected){
      const btn=document.createElement('button');btn.type='button';btn.className='place-item'+(p.id===state.selected?.id?' active':'');
      const index=document.createElement('span');index.className='place-number';index.textContent=String(locations.indexOf(p)+1).padStart(2,'0');
      const info=document.createElement('span');info.className='place-info';
      const name=document.createElement('span');name.className='place-name';name.textContent=p.displayName || p.name;
      const sub=document.createElement('span');sub.className='place-sub';sub.textContent=([p.geo?.city,p.geo?.state,p.geo?.country].filter(Boolean).join(', ') || p.region || 'Marian apparition');
      const chev=document.createElement('span');chev.className='place-chevron';chev.textContent='›';
      info.append(name,sub);btn.append(index,info,chev);btn.addEventListener('click',()=>selectLocation(p,true));container.append(btn);
    }
    renderMarkers();
    window.SKY_SURFER_MAP?.refresh?.();
  }
  // Country directory uses the same apparition records as Explorer, so edits to
  // site-data.js (via the KML import) automatically populate and alphabetize it.
  const directory=$('apparitionsDirectory');
  const countryCollator=new Intl.Collator('en',{sensitivity:'base',numeric:true,ignorePunctuation:true});
  const plain=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  // Use bundled flag images rather than the regional-indicator emoji sequence.
  // Some Windows fonts render the sequence as FR/MX/PT letter codes, not flags.
  // All ISO country flags are included locally so later KML additions work offline.
  function countryFlagCode(name){
    const codes=window.SKY_SURFER_COUNTRY_CODES||{};
    const code=codes[name]||codes[Object.keys(codes).find(k=>plain(k)===plain(name))]||null;
    return code && /^[A-Z]{2}$/.test(code) ? code.toLowerCase() : null;
  }
  function makeCountryFlag(country){
    const holder=document.createElement('span');holder.className='directory-flag';holder.setAttribute('aria-hidden','true');
    const code=countryFlagCode(country);
    if(code){
      const flag=document.createElement('img');flag.src=`flags/${code}.png`;flag.className='directory-flag-image';
      flag.width=40;flag.height=28;flag.alt='';flag.decoding='async';
      flag.addEventListener('error',()=>{flag.remove();holder.textContent=code.toUpperCase();holder.classList.add('directory-flag-fallback');},{once:true});
      holder.append(flag);
    } else {holder.textContent='🌐';}
    return holder;
  }
  function renderDirectory(){
    const term=plain($('directorySearch').value.trim());
    const matched=locations.filter(p=>!term||plain([p.name,p.displayName,p.year,p.description,p.geo?.city,p.geo?.state,p.geo?.country,p.geo?.continent,p.searchText,(p.media||[]).map(m=>m.label||m.src).join(' ')].join(' ')).includes(term));
    const groups=new Map();
    for(const p of matched){const country=p.geo?.country||'Other locations';if(!groups.has(country))groups.set(country,[]);groups.get(country).push(p);}
    const list=$('directoryResults');list.replaceChildren();
    for(const country of [...groups.keys()].sort(countryCollator.compare)){
      const section=document.createElement('section');section.className='directory-country';section.setAttribute('role','listitem');
      const heading=document.createElement('h3');heading.className='directory-country-name';
      const flag=makeCountryFlag(country);
      const name=document.createElement('span');name.textContent=country;heading.append(flag,name);section.append(heading);
      groups.get(country).sort((a,b)=>countryCollator.compare(a.name,b.name)||((a.year||0)-(b.year||0))).forEach(p=>{
        const item=document.createElement('button');item.type='button';item.className='directory-place';
        item.setAttribute('aria-label',`Show ${p.displayName||p.name} on the map and open details`);
        const info=document.createElement('span');info.className='directory-place-info';
        const title=document.createElement('span');title.className='directory-place-name';title.textContent=p.displayName||`${p.name}${p.year?' – '+p.year:''}`;
        const location=document.createElement('span');location.className='directory-place-sub';location.textContent=[p.geo?.city,p.geo?.state,p.geo?.country].filter(Boolean).join(', ')||p.region||'';
        const arrow=document.createElement('span');arrow.className='directory-place-arrow';arrow.textContent='›';
        info.append(title,location);item.append(info,arrow);
        item.addEventListener('click',()=>{closeDirectory();selectLocation(p,true);});
        section.append(item);
      });list.append(section);
    }
    if(!groups.size){const empty=document.createElement('p');empty.className='directory-empty';empty.textContent='No apparitions found. Try another place, year, or name.';list.append(empty);}
    $('directoryCount').textContent=`${matched.length} apparition${matched.length===1?'':'s'} · ${groups.size} countr${groups.size===1?'y':'ies'}`;
  }
  function openDirectory(){directory.hidden=false;document.body.classList.add('directory-open');$('openDirectory').setAttribute('aria-expanded','true');$('directorySearch').value='';renderDirectory();$('directorySearch').focus();}
  function closeDirectory(){directory.hidden=true;document.body.classList.remove('directory-open');$('openDirectory').setAttribute('aria-expanded','false');$('openDirectory').focus();}
  $('openDirectory').addEventListener('click',openDirectory);
  $('closeDirectory').addEventListener('click',closeDirectory);
  $('directoryBackdrop').addEventListener('click',closeDirectory);
  $('directorySearch').addEventListener('input',renderDirectory);
  directory.addEventListener('keydown',e=>{
    if(e.key==='Tab'){
      const focusable=Array.from(directory.querySelectorAll('button:not([disabled]),input:not([disabled])')).filter(el=>el.getClientRects().length);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  $('search').addEventListener('input',e=>{state.search=e.target.value;buildPlaces();});
  document.addEventListener('keydown',e=>{
    // Close the PDF overlay *before* the browser fullscreen or the details panel.
    // A second Escape exits the surrounding map fullscreen, when active.
    if(e.key==='Escape'&&!$('mediaOverlay').hidden){e.preventDefault();e.stopPropagation();closeMediaOverlay();return;}
    if(!$('mediaOverlay').hidden){
      if(e.key==='Tab'){trapMediaOverlayFocus(e);return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')e.preventDefault();
      if(state.selected&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();changeMedia(e.key==='ArrowRight'?1:-1);}
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();$('search').select();}
    if(e.key==='Escape'&&!directory.hidden){e.preventDefault();closeDirectory();return;}
    if(e.key==='Escape'&&document.fullscreenElement){document.exitFullscreen();}
    else if(e.key==='Escape'&&state.selected){closePanel();}
    if(e.target instanceof HTMLInputElement)return;
    if(state.selected && (e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();changeMedia(e.key==='ArrowRight'?1:-1);}
  });
  function setFilter(filter){state.filter=filter;for(const [name,id] of [['all','showAll'],['docs','showDocs']]){$(id).classList.toggle('active',filter===name);$(id).setAttribute('aria-pressed',String(filter===name));}buildPlaces();}
  $('showAll').addEventListener('click',()=>setFilter('all'));
  $('showDocs').addEventListener('click',()=>setFilter('docs'));
  function smooth(a,b,t){return a+(b-a)*t;}
  function shortestAngle(from,to){return from+Math.atan2(Math.sin(to-from),Math.cos(to-from));}
  function flyTo(p){
    // Phone-only: automatically zoom the fallback globe so the selected shrine
    // remains easy to locate in the uncovered map area beside the left PDF drawer.
    if(phoneDrawer)state.zoom=Math.max(state.zoom,1.28);
    const targetYaw=p.lng*rad, targetPitch=clamp(p.lat*rad,-1.36,1.36);
    state.fly=reducedMotion?null:{start:performance.now(),dur:820,fromYaw:state.yaw,toYaw:shortestAngle(state.yaw,targetYaw),fromPitch:state.pitch,toPitch:targetPitch};
    if(reducedMotion){state.yaw=targetYaw;state.pitch=targetPitch;sceneDirty=true;renderMarkers();}
  }
  function selectLocation(p){
    state.selected=p; flyTo(p);window.SKY_SURFER_MAP?.select?.(p);openDetailPanel();
    $('placeTitle').textContent=p.displayName || p.name;
    $('placeLocation').textContent=[p.geo?.city,p.geo?.state,p.geo?.country].filter(Boolean).join(', ');
    $('placeCoords').textContent=labelCoords(p);
    // Google Maps Street View panorama near the selected coordinates. Coverage is
    // determined by Google; the link does not imply a panorama exists at the shrine.
    const streetView=$('streetViewLink');
    streetView.href='https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+encodeURIComponent(`${p.lat},${p.lng}`);
    streetView.title='Open Google Street View near '+(p.displayName||p.name);
    const fileCount=new Set((p.media||[]).map(m=>m.src)).size;
    const pageCount=(p.media||[]).filter(m=>m.type==='pdf').length;
    $('mediaCounter').textContent=fileCount?`${fileCount} FILE${fileCount===1?'':'S'}${pageCount?' · '+pageCount+' PDF PAGE'+(pageCount===1?'':'S'):''}`:'0 FILES';
    $('emptyMedia').hidden=Boolean(p.media?.length);$('viewerBox').hidden=!p.media?.length;
    state.mediaIndex=0;
    if(p.media?.length)renderMedia();
    buildPlaces();
    window.requestAnimationFrame(resize);
    // Do not scroll the containing Squarespace page/iframe on marker or list selection.
    // The side drawer overlays the visible map without changing the viewport.
  }
  function closePanel(){
    if(!$('mediaOverlay').hidden)closeMediaOverlay();
    const previous=state.selected;
    state.selected=null;
    window.SKY_SURFER_MAP?.select?.(null);
    hideDetailPanel();buildPlaces();window.requestAnimationFrame(resize);
    if(phoneDrawer && previous)window.SKY_SURFER_MAP?.recenterAfterDrawer?.(previous);
  }
  $('closePanel').setAttribute('aria-label','Close apparition details and return to map');
  $('closePanel').addEventListener('click',closePanel);

  // Phone-only: a brief, single-finger TAP on empty map imagery dismisses
  // the details drawer. Preserve the drawer during drags, pinches, long presses,
  // marker selection, and map UI button taps. Register in capture phase to
  // observe MapLibre's pointer-captured gestures without stealing them.
  const mapTapSurface = $('mapSection');
  let potentialMapTap = null;
  const mapTouchIds = new Set();
  let mapMultiTouch = false;
  function isBareMapTarget(target){
    if(!(target instanceof Element))return false;
    if(!target.closest('#mapLibreCanvas, #mapLibreGlobeCanvas, #globe, #globeArea'))return false;
    return !target.closest('button, a, iframe, input, .sat-pin, .map-marker, .maplibregl-marker, .maplibregl-control-container, .globe-controls, .view-switch, .explorer-style-switch, .info-panel, .map-notice, .map-diagnostic, .map-credits, .maplibre-globe-credit, .globe-top-label');
  }
  mapTapSurface.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch')return;
    mapTouchIds.add(e.pointerId);
    if(mapTouchIds.size>1){mapMultiTouch=true;potentialMapTap=null;return;}
    if(!phoneDrawer || !state.selected || !isBareMapTarget(e.target) ||
       !$('mediaOverlay').hidden || !directory.hidden){potentialMapTap=null;return;}
    potentialMapTap={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),moved:false};
  },true);
  window.addEventListener('pointermove',e=>{
    if(!potentialMapTap || e.pointerId!==potentialMapTap.id)return;
    if(Math.hypot(e.clientX-potentialMapTap.x,e.clientY-potentialMapTap.y)>9)
      potentialMapTap.moved=true;
  },true);
  window.addEventListener('pointerup',e=>{
    if(e.pointerType!=='touch')return;
    const attempt=potentialMapTap;
    const completed=attempt && attempt.id===e.pointerId;
    if(completed)potentialMapTap=null;
    const eligible=completed && !mapMultiTouch && !attempt.moved &&
      Math.hypot(e.clientX-attempt.x,e.clientY-attempt.y)<=9 &&
      performance.now()-attempt.at<=420 &&
      phoneDrawer && state.selected && directory.hidden && $('mediaOverlay').hidden;
    mapTouchIds.delete(e.pointerId);
    if(mapTouchIds.size===0)mapMultiTouch=false;
    if(eligible)closePanel();
  },true);
  window.addEventListener('pointercancel',e=>{
    mapTouchIds.delete(e.pointerId);
    if(potentialMapTap?.id===e.pointerId)potentialMapTap=null;
    if(mapTouchIds.size===0)mapMultiTouch=false;
  },true);

  // v1.9 continuous-page viewer, with Rosary-reference pointer-centered wheel zoom,
  // free 2-axis dragging, 2-finger pinch AND pan, and touch double-tap zoom.
  // Entirely local: uses high-resolution page images generated from the attached PDFs.
  const stage=$('mediaStage'), strip=$('mediaStrip');
  const viewer={pages:[],baseW:0,totalH:0,panX:0,panY:0,zoom:1,activeFile:'',generation:0,ready:false,pointerMap:new Map(),pinchStart:null,singleStart:null,hadPinch:false,lastTap:null,stageW:0,stageH:0,fitZoom:1,userAdjusted:false};
  let layoutPending=false;
  // Keep a visible portion of the page on screen without forcing a fit-width
  // document to remain centered. Horizontal and vertical panning are both free.
  function clampPan(){
    const sw=stage.clientWidth,sh=stage.clientHeight,w=viewer.baseW*viewer.zoom,h=viewer.totalH*viewer.zoom;
    const visibleX=Math.min(Math.max(54,sw*.2),w*.55);
    const visibleY=Math.min(Math.max(54,sh*.18),h*.55);
    viewer.panX=clamp(viewer.panX,visibleX-w,sw-visibleX);
    viewer.panY=clamp(viewer.panY,visibleY-h,sh-visibleY);
  }
  function updatePageNumber(){
    if(!viewer.pages.length)return;
    const offset=Math.max(0,-viewer.panY/viewer.zoom+stage.clientHeight*.25/viewer.zoom);
    let idx=viewer.pages.findIndex(p=>offset<p.top+p.height);
    if(idx<0)idx=viewer.pages.length-1;
    state.mediaIndex=viewer.pages[idx].dataIndex;
    const p=viewer.pages[idx];
    $('pageLabel').textContent=p.item.type==='pdf'?`PAGE ${p.item.page||idx+1} / ${p.item.pageCount||viewer.pages.length}`:`${idx+1} / ${viewer.pages.length}`;
    $('mediaPrev').disabled=idx===0;
    $('mediaNext').disabled=idx===viewer.pages.length-1;
  }
  function drawViewer(){
    if(!viewer.ready)return;
    clampPan();
    strip.style.transform=`translate3d(${viewer.panX}px,${viewer.panY}px,0) scale(${viewer.zoom})`;
    $('zoomLabel').textContent=`${Math.round(viewer.zoom*100)}%`;
    updatePageNumber();
  }
  function requestViewerDraw(){if(layoutPending)return;layoutPending=true;requestAnimationFrame(()=>{layoutPending=false;drawViewer();});}
  // Fit the FULL first PDF page into the available preview on first opening.
  // This uses each page's intrinsic preview aspect ratio, so both very tall and
  // very wide PDFs remain fully visible without needing standard page sizes.
  function fitFirstMediaPage(){
    if(!viewer.ready||!viewer.pages.length)return;
    const sw=stage.clientWidth, sh=stage.clientHeight;
    const first=viewer.pages[0];
    const margin=12;
    viewer.fitZoom=Math.max(.002,Math.min(2,(sw-2*margin)/viewer.baseW,(sh-2*margin)/first.height));
    viewer.zoom=viewer.fitZoom;
    viewer.panX=(sw-viewer.baseW*viewer.zoom)/2;
    viewer.panY=(sh-first.height*viewer.zoom)/2;
    viewer.userAdjusted=false;
    viewer.stageW=sw;viewer.stageH=sh;
    requestViewerDraw();
  }
  function jumpToPage(pageIndex){
    if(!viewer.ready||!viewer.pages.length)return;
    const p=viewer.pages[clamp(pageIndex,0,viewer.pages.length-1)];
    viewer.panY=18-p.top*viewer.zoom;
    viewer.userAdjusted=true;
    requestViewerDraw();
  }
  function setZoomAt(factor,px,py){
    if(!viewer.ready)return;
    const old=viewer.zoom,newZoom=clamp(old*factor,Math.min(.002,viewer.fitZoom),9);
    if(Math.abs(old-newZoom)<.0001)return;
    viewer.panX=px-(px-viewer.panX)*(newZoom/old);
    viewer.panY=py-(py-viewer.panY)*(newZoom/old);
    viewer.zoom=newZoom;viewer.userAdjusted=true;requestViewerDraw();
  }
  function renderMedia(){
    const media=state.selected?.media||[];if(!media.length)return;
    state.mediaIndex=clamp(state.mediaIndex,0,media.length-1);
    const selected=media[state.mediaIndex];
    const pages=selected.type==='pdf'?media.map((item,i)=>({item,index:i})).filter(p=>p.item.type==='pdf'&&p.item.src===selected.src):[{item:selected,index:state.mediaIndex}];
    const generation=++viewer.generation;
    viewer.pages=[];viewer.ready=false;viewer.panX=0;viewer.panY=10;viewer.zoom=1;viewer.fitZoom=1;viewer.userAdjusted=false;viewer.activeFile=selected.src;
    viewer.pointerMap.clear();viewer.pinchStart=null;viewer.singleStart=null;viewer.hadPinch=false;stage.classList.remove('dragging');
    strip.replaceChildren();strip.hidden=true;$('mediaImage').hidden=true;$('mediaFallback').hidden=true;
    $('stageLoading').textContent='Loading document pages…';$('stageLoading').hidden=false;
    $('openOriginal').href=encodeURI(selected.src);
    $('openOriginal').setAttribute('download',selected.src.split('/').pop());
    $('openOriginal').textContent=selected.type==='pdf'?'DOWNLOAD PDF':'DOWNLOAD IMAGE';
    $('openOriginal').setAttribute('aria-label',selected.type==='pdf'?'Download PDF document':'Download image');
    const images=pages.map(p=>new Promise(resolve=>{
      if(!p.item.preview){resolve({width:0,height:0,broken:true});return;}
      const img=new Image();img.decoding='async';
      img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight,broken:false});
      img.onerror=()=>resolve({width:0,height:0,broken:true});
      img.src=encodeURI(p.item.preview);
    }));
    Promise.all(images).then(dims=>{
      if(viewer.generation!==generation)return;
      const valid=dims.some(d=>!d.broken);
      if(!valid){
        if(selected.type==='pdf'){$('mediaFallback').src=encodeURI(selected.src)+'#toolbar=0';$('mediaFallback').hidden=false;$('stageLoading').hidden=true;}
        else $('stageLoading').textContent='Preview unavailable. Use Download below.';
        return;
      }
      viewer.baseW=Math.max(200,Math.min(stage.clientWidth-28,800));
      const gap=18;let top=0;
      const frag=document.createDocumentFragment();
      for(let i=0;i<pages.length;i++){
        const item=pages[i].item,d=dims[i],aspect=d.broken?1.414:d.height/d.width;
        const h=Math.round(viewer.baseW*aspect);
        const paper=document.createElement('div');paper.className='media-paper';paper.style.top=`${top}px`;paper.style.width=`${viewer.baseW}px`;paper.style.height=`${h}px`;
        if(!d.broken){const image=document.createElement('img');image.alt=`${state.selected.name} — ${item.type==='pdf'?`page ${item.page||i+1}`:'photo'}`;image.loading=i>2?'lazy':'eager';image.decoding='async';image.draggable=false;image.src=encodeURI(item.preview);paper.append(image);}
        frag.append(paper);viewer.pages.push({item,dataIndex:pages[i].index,top,height:h,aspect});top+=h+gap;
      }
      viewer.totalH=top-gap;
      strip.style.width=`${viewer.baseW}px`;strip.style.height=`${viewer.totalH}px`;strip.replaceChildren(frag);strip.hidden=false;viewer.ready=true;
      $('stageLoading').hidden=true;fitFirstMediaPage();
    });
  }
  function changeMedia(step){
    if(!viewer.pages.length)return;
    const idx=viewer.pages.findIndex(p=>p.dataIndex===state.mediaIndex);
    jumpToPage(idx+step);
  }
  $('mediaPrev').addEventListener('click',()=>changeMedia(-1));$('mediaNext').addEventListener('click',()=>changeMedia(1));
  $('mediaZoomIn').addEventListener('click',()=>setZoomAt(1.25,stage.clientWidth/2,stage.clientHeight/2));
  $('mediaZoomOut').addEventListener('click',()=>setZoomAt(.8,stage.clientWidth/2,stage.clientHeight/2));
  $('mediaReset').addEventListener('click',()=>fitFirstMediaPage());
  // v1.33: A TRUE IN-PAGE OVERLAY instead of viewerBox.requestFullscreen().
  // Calling requestFullscreen() on the child viewer while appShell is fullscreen
  // replaces the browser's fullscreen element and makes the rest of the map vanish.
  // Reparent the existing viewer into a modal that lives INSIDE appShell; preserving
  // the actual viewer node preserves its PDF pages, controls, zoom, and event handlers.
  const mediaOverlay=$('mediaOverlay');
  const mediaOverlayDialog=$('mediaOverlayDialog');
  const viewerBox=$('viewerBox');
  const viewerHome=viewerBox.parentNode;
  const viewerHomeNext=viewerBox.nextSibling;
  let previousMediaFocus=null;
  function updateMediaOverlayButton(){
    const active=!mediaOverlay.hidden;
    $('mediaFullscreenLabel').textContent=active?'CLOSE VIEWER':'FULLSCREEN';
    $('mediaFullscreen').setAttribute('aria-label',active?'Close expanded document viewer':'Open expanded document viewer');
    $('mediaFullscreen').setAttribute('aria-pressed',String(active));
    $('mediaFullscreen').setAttribute('aria-expanded',String(active));
    $('mediaFullscreen').title=active?'Return to map and document details':'Expand document over the map';
  }
  function updateMediaOverlayLayout(){
    requestAnimationFrame(()=>{
      // The ResizeObserver keeps the same page in view during stage-size changes.
      // Fit the complete first PDF page automatically when there is no user zoom/pan.
      if(!viewer.ready)return;
      resizeMediaViewer();
      if(!viewer.userAdjusted)fitFirstMediaPage();
    });
  }
  function openMediaOverlay(){
    if(!mediaOverlay.hidden || viewerBox.hidden)return;
    previousMediaFocus=document.activeElement;
    mediaOverlayDialog.appendChild(viewerBox);
    mediaOverlay.hidden=false;
    document.body.classList.add('media-overlay-open');
    updateMediaOverlayButton();
    updateMediaOverlayLayout();
    $('mediaFullscreen').focus({preventScroll:true});
  }
  function closeMediaOverlay(){
    if(mediaOverlay.hidden)return;
    // Hide before restoring the viewer to prevent a flash in the original panel.
    mediaOverlay.hidden=true;
    viewerHome.insertBefore(viewerBox,viewerHomeNext);
    document.body.classList.remove('media-overlay-open');
    updateMediaOverlayButton();
    updateMediaOverlayLayout();
    const returnFocus=previousMediaFocus?.isConnected?previousMediaFocus:$('mediaFullscreen');
    if(returnFocus?.focus)requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
    previousMediaFocus=null;
  }
  function trapMediaOverlayFocus(e){
    const controls=Array.from(mediaOverlayDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(el=>!el.hidden && el.getClientRects().length);
    if(!controls.length){e.preventDefault();return;}
    const first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey && (document.activeElement===first || !mediaOverlayDialog.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey && (document.activeElement===last || !mediaOverlayDialog.contains(document.activeElement))){e.preventDefault();first.focus();}
  }
  $('mediaFullscreen').addEventListener('click',()=>{
    if(mediaOverlay.hidden)openMediaOverlay();else closeMediaOverlay();
  });
  $('mediaOverlayBackdrop').addEventListener('click',closeMediaOverlay);
  updateMediaOverlayButton();
  // Mouse wheel / trackpad: zoom exactly at the pointer like the Rosary viewer.
  // Shift + wheel or a horizontal trackpad gesture pans left/right instead.
  stage.addEventListener('wheel',e=>{
    if(!viewer.ready)return;
    e.preventDefault();
    const line=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;
    const dx=e.deltaX*line,dy=e.deltaY*line;
    if(e.shiftKey || (Math.abs(dx)>Math.abs(dy)*1.35 && !e.ctrlKey && !e.metaKey)){
      viewer.userAdjusted=true;
      viewer.panX -= e.shiftKey && Math.abs(dx)<.01 ? dy : dx;
      viewer.panY -= e.shiftKey ? 0 : dy*.12;
      requestViewerDraw();
      return;
    }
    const rect=stage.getBoundingClientRect();
    const px=e.clientX-rect.left,py=e.clientY-rect.top;
    const delta=clamp(dy,-240,240);
    setZoomAt(Math.exp(-delta*.0016),px,py);
  },{passive:false});

  // Fully independent 2-axis pan, including when an entire PDF page fits.
  // Touch: 1 finger pans, 2 fingers pinch AND pan together, double tap zooms.
  function pointInStage(e){const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function twoPointerGesture(){
    const [a,b]=Array.from(viewer.pointerMap.values());
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    return {midX:mx,midY:my,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  }
  function startSingle(point){
    viewer.singleStart={x:point.x,y:point.y,panX:viewer.panX,panY:viewer.panY};
    viewer.pinchStart=null;
  }
  function startPinch(){
    if(viewer.pointerMap.size<2)return;
    const g=twoPointerGesture();
    viewer.pinchStart={distance:g.distance,zoom:viewer.zoom,worldX:(g.midX-viewer.panX)/viewer.zoom,worldY:(g.midY-viewer.panY)/viewer.zoom};
    viewer.singleStart=null;
    viewer.hadPinch=true;
  }
  stage.addEventListener('pointerdown',e=>{
    if(!viewer.ready||(e.pointerType==='mouse'&&e.button!==0))return;
    if(e.pointerType!=='mouse')e.preventDefault();
    const point=pointInStage(e);
    viewer.pointerMap.set(e.pointerId,{...point,downX:point.x,downY:point.y,moved:false,type:e.pointerType});
    try{stage.setPointerCapture(e.pointerId);}catch(_){}
    stage.classList.add('dragging');
    if(viewer.pointerMap.size===1){viewer.hadPinch=false;startSingle(point);}
    else if(viewer.pointerMap.size===2)startPinch();
  });
  stage.addEventListener('pointermove',e=>{
    const point=viewer.pointerMap.get(e.pointerId);
    if(!point)return;
    e.preventDefault();
    const next=pointInStage(e);
    point.x=next.x;point.y=next.y;
    if(Math.hypot(point.x-point.downX,point.y-point.downY)>7)point.moved=true;
    if(viewer.pointerMap.size>=2){
      if(!viewer.pinchStart)startPinch();
      const g=twoPointerGesture(),p=viewer.pinchStart;
      viewer.userAdjusted=true;
      viewer.zoom=clamp(p.zoom*(g.distance/p.distance),Math.min(.002,viewer.fitZoom),9);
      viewer.panX=g.midX-p.worldX*viewer.zoom;
      viewer.panY=g.midY-p.worldY*viewer.zoom;
    }else if(viewer.pointerMap.size===1 && viewer.singleStart){
      viewer.userAdjusted=true;
      viewer.panX=viewer.singleStart.panX+point.x-viewer.singleStart.x;
      viewer.panY=viewer.singleStart.panY+point.y-viewer.singleStart.y;
    }
    requestViewerDraw();
  },{passive:false});
  function finishViewerPointer(e){
    const point=viewer.pointerMap.get(e.pointerId);
    if(!point)return;
    const single=viewer.pointerMap.size===1;
    viewer.pointerMap.delete(e.pointerId);
    try{if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}catch(_){}
    if(single && point.type==='touch' && !viewer.hadPinch && !point.moved){
      const now=performance.now();
      const previous=viewer.lastTap;
      if(previous && now-previous.time<340 && Math.hypot(previous.x-point.x,previous.y-point.y)<45){
        setZoomAt(viewer.zoom>1.5?1/viewer.zoom:1.8,point.x,point.y);
        viewer.lastTap=null;
      }else viewer.lastTap={time:now,x:point.x,y:point.y};
    }
    if(viewer.pointerMap.size>=2)startPinch();
    else if(viewer.pointerMap.size===1){
      const remaining=Array.from(viewer.pointerMap.values())[0];
      startSingle(remaining);
    }else{
      viewer.singleStart=null;viewer.pinchStart=null;viewer.hadPinch=false;
      stage.classList.remove('dragging');
    }
  }
  stage.addEventListener('pointerup',finishViewerPointer);
  stage.addEventListener('pointercancel',finishViewerPointer);
  stage.addEventListener('lostpointercapture',e=>{if(viewer.pointerMap.has(e.pointerId))finishViewerPointer(e);});
  stage.addEventListener('dblclick',e=>{
    if(!viewer.ready)return;
    e.preventDefault();const p=pointInStage(e);
    setZoomAt(viewer.zoom>1.5?1/viewer.zoom:1.8,p.x,p.y);
  });
  // Reflow page widths for phone portrait/landscape while retaining view position.
  function resizeMediaViewer(){
    if(!viewer.ready)return;
    const sw=stage.clientWidth,sh=stage.clientHeight;
    const newWidth=Math.max(200,Math.min(sw-28,800));
    if(viewer.stageW && Math.abs(newWidth-viewer.baseW)>2){
      const ratio=newWidth/viewer.baseW;
      const oldCenterX=(viewer.stageW/2-viewer.panX)/viewer.zoom;
      const oldCenterY=(viewer.stageH/2-viewer.panY)/viewer.zoom;
      viewer.baseW=newWidth;
      const gap=18;let top=0;
      for(let i=0;i<viewer.pages.length;i++){
        const p=viewer.pages[i];p.top=top;p.height=Math.round(newWidth*p.aspect);
        const paper=strip.children[i];
        if(paper){paper.style.top=top+'px';paper.style.width=newWidth+'px';paper.style.height=p.height+'px';}
        top+=p.height+gap;
      }
      viewer.totalH=top-gap;
      strip.style.width=newWidth+'px';strip.style.height=viewer.totalH+'px';
      viewer.panX=sw/2-oldCenterX*ratio*viewer.zoom;
      viewer.panY=sh/2-oldCenterY*ratio*viewer.zoom;
    }else if(viewer.stageW && (sw!==viewer.stageW || sh!==viewer.stageH)){
      viewer.panX+=(sw-viewer.stageW)/2;
      viewer.panY+=(sh-viewer.stageH)/2;
    }
    viewer.stageW=sw;viewer.stageH=sh;
    if(!viewer.userAdjusted)fitFirstMediaPage();
    else requestViewerDraw();
  }
  if(window.ResizeObserver)new ResizeObserver(resizeMediaViewer).observe(stage);

  function activateSoftwareGlobe(reason){
    if(softwareContext)return;
    console.warn('Sky Surfer: using offline software globe ('+reason+').');
    const fallback=document.createElement('canvas');
    fallback.setAttribute('aria-hidden','true');fallback.className='software-globe';
    $('globe').after(fallback);
    softwareCanvas=fallback;
    softwareContext=fallback.getContext('2d',{alpha:true});
    if(!softwareContext)return;
    const img=new Image();
    img.onload=()=>{
      // Reduce the source size for quick software sampling; keeps all imagery local.
      const source=document.createElement('canvas');
      source.width=1200;source.height=600;
      const sourceCtx=source.getContext('2d',{willReadFrequently:true});
      sourceCtx.drawImage(img,0,0,source.width,source.height);
      softwareEarth=img;softwareEarthW=source.width;softwareEarthH=source.height;
      softwareEarthPixels=sourceCtx.getImageData(0,0,source.width,source.height).data;
      sceneDirty=true;
    };
    img.onerror=()=>{
      // The included file works even if a browser blocks an embedded data URL.
      if(!img.dataset.retried){img.dataset.retried='1';img.src='assets/earth-illustrated.webp';}
    };
    img.src=window.SKY_SURFER_EARTH_TEXTURE || 'assets/earth-illustrated.webp';
    sceneDirty=true;
  }
  function drawSoftwareGlobe(){
    if(!softwareContext||!softwareCanvas||!globeW||!globeH)return;
    const c=softwareCanvas,ctx=softwareContext,dpr=c.width/globeW;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);
    const cx=globeCenterX*dpr,cy=globeCenterY*dpr,r=globeRadius*dpr;
    // Always render a clearly visible planet, even before its texture is decoded.
    if(!softwareEarthPixels){
      const g=ctx.createRadialGradient(cx-r*.24,cy-r*.30,r*.06,cx,cy,r);
      g.addColorStop(0,'#4c8993');g.addColorStop(.72,'#1c5368');g.addColorStop(1,'#09212e');
      ctx.beginPath();ctx.arc(cx,cy,r,0,2*PI);ctx.fillStyle=g;ctx.fill();
      return;
    }
    // Render at a bounded resolution then scale the disk for responsive performance.
    const size=Math.max(260,Math.min(430,Math.round(globeRadius*1.36)));
    if(softwareFrame.width!==size||softwareFrame.height!==size){softwareFrame.width=size;softwareFrame.height=size;}
    const data=softwareFrameCtx.createImageData(size,size),dst=data.data;
    const cyaw=Math.cos(state.yaw),syaw=Math.sin(state.yaw);
    const cpitch=Math.cos(state.pitch),spitch=Math.sin(state.pitch);
    const rightX=-syaw,rightZ=cyaw,upX=-spitch*cyaw,upY=cpitch,upZ=-spitch*syaw;
    const frontX=cpitch*cyaw,frontY=spitch,frontZ=cpitch*syaw;
    const invR=2/size;
    for(let j=0;j<size;j++){
      const y=1-(j+.5)*invR;
      for(let i=0;i<size;i++){
        const x=(i+.5)*invR-1;
        const r2=x*x+y*y;
        if(r2>=1)continue;
        const z=Math.sqrt(1-r2);
        const wx=rightX*x+upX*y+frontX*z;
        const wy=upY*y+frontY*z;
        const wz=rightZ*x+upZ*y+frontZ*z;
        let u=(Math.atan2(wz,wx)/(2*PI)+.5)*softwareEarthW;
        const v=(.5-Math.asin(Math.max(-1,Math.min(1,wy)))/PI)*softwareEarthH;
        u=((Math.floor(u)%softwareEarthW)+softwareEarthW)%softwareEarthW;
        const sy=Math.min(softwareEarthH-1,Math.max(0,Math.floor(v)));
        const si=(sy*softwareEarthW+u)*4,di=(j*size+i)*4;
        const diffuse=Math.max(0,-.52*x+.72*y+z);
        const shade=.25+.78*diffuse;
        const rim=(1-z)*(1-z)*.38;
        dst[di]=Math.min(255,softwareEarthPixels[si]*shade+30*rim);
        dst[di+1]=Math.min(255,softwareEarthPixels[si+1]*shade+97*rim);
        dst[di+2]=Math.min(255,softwareEarthPixels[si+2]*shade+130*rim);
        dst[di+3]=255;
      }
    }
    softwareFrameCtx.putImageData(data,0,0);
    ctx.shadowBlur=25*dpr;ctx.shadowColor='rgba(63,167,204,.38)';
    ctx.drawImage(softwareFrame,cx-r,cy-r,r*2,r*2);
    ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(cx,cy,r+.5*dpr,0,2*PI);
    ctx.strokeStyle='rgba(133,199,216,.32)';ctx.lineWidth=1.7*dpr;ctx.stroke();
  }
  function makeWebGL(){
    const canvas=$('globe');
    let gl;
    try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false})||canvas.getContext('experimental-webgl');}
    catch(err){activateSoftwareGlobe('WebGL context error');return;}
    if(!gl){activateSoftwareGlobe('WebGL unavailable');return;}
    const vsrc=`attribute vec2 a_xy; void main(){gl_Position=vec4(a_xy,0.,1.);}`;
    const fsrc=`precision highp float;
      uniform sampler2D u_tex;
      uniform vec2 u_center;
      uniform float u_radius,u_yaw,u_pitch;
      const float PI=3.141592653589793;
      void main(){
        vec2 xy=(gl_FragCoord.xy-u_center)/u_radius;
        float r2=dot(xy,xy);
        if(r2>=1.0) discard;
        float z=sqrt(1.0-r2);
        float sy=sin(u_yaw),cy=cos(u_yaw),sp=sin(u_pitch),cp=cos(u_pitch);
        vec3 right=vec3(-sy,0.,cy);
        vec3 up=vec3(-sp*cy,cp,-sp*sy);
        vec3 front=vec3(cp*cy,sp,cp*sy);
        vec3 world=right*xy.x+up*xy.y+front*z;
        float lon=atan(world.z,world.x),lat=asin(clamp(world.y,-1.,1.));
        vec2 uv=vec2(lon/(2.0*PI)+0.5,lat/PI+0.5);
        vec3 earth=texture2D(u_tex,uv).rgb;
        vec3 light=normalize(vec3(-0.52,0.72,1.0));
        float diffuse=max(0.0,dot(normalize(vec3(xy,z)),light));
        float shade=0.23+0.85*diffuse;
        float rim=pow(1.0-z,2.0);
        vec3 color=earth*shade + vec3(0.07,0.24,0.29)*rim*0.70;
        gl_FragColor=vec4(color,1.0);
      }`;
    function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;}
    try{
      const pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,vsrc));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,fsrc));gl.linkProgram(pr);
      if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));gl.useProgram(pr);
      const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const att=gl.getAttribLocation(pr,'a_xy');gl.enableVertexAttribArray(att);gl.vertexAttribPointer(att,2,gl.FLOAT,false,0,0);
      globeData={center:gl.getUniformLocation(pr,'u_center'),radius:gl.getUniformLocation(pr,'u_radius'),yaw:gl.getUniformLocation(pr,'u_yaw'),pitch:gl.getUniformLocation(pr,'u_pitch')};
      const sampler=gl.getUniformLocation(pr,'u_tex');gl.uniform1i(sampler,0);
      const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([21,77,88,255]));
      const img=new Image();
      img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);sceneDirty=true;};
      img.onerror=()=>{if(!img.dataset.retried){img.dataset.retried='1';img.src='assets/earth-illustrated.webp';}};
      img.src=window.SKY_SURFER_EARTH_TEXTURE || 'assets/earth-illustrated.webp';
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();activateSoftwareGlobe('graphics context lost');sceneDirty=true;});
      globeGL=gl;globeProgram=pr;
    } catch(err){console.error('WebGL initialization:',err);activateSoftwareGlobe('shader initialization blocked');}
  }
  function resize(){
    const canvas=$('globe');const box=canvas.getBoundingClientRect();if(box.width===0||box.height===0)return;
    const dpr=Math.min(window.devicePixelRatio||1,1.6);
    globeW=box.width;globeH=box.height;
    const cw=Math.round(box.width*dpr),ch=Math.round(box.height*dpr);
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    const base=Math.min(globeW,globeH)*0.385;
    globeRadius=base*state.zoom;
    // Shift the globe's projected centre to the uncovered RIGHT side when a
    // mobile marker is selected. Do not move the desktop globe or overlay.
    if(phoneDrawer && state.selected){
      const landscape=window.matchMedia('(orientation: landscape)').matches;
      const panelWidth=Math.min(globeW*(landscape?.49:.68),landscape?420:340);
      globeCenterX=(globeW+panelWidth)*.5;
    }else globeCenterX=globeW*.5;
    globeCenterY=globeH*.51;
    sceneDirty=true;renderMarkers();
    if($('stars').width!==cw||$('stars').height!==ch){$('stars').width=cw;$('stars').height=ch;drawStars();}
    if(softwareCanvas&&(softwareCanvas.width!==cw||softwareCanvas.height!==ch)){softwareCanvas.width=cw;softwareCanvas.height=ch;}
    if(viewer.ready)requestViewerDraw();
  }
  function drawStars(){
    const cv=$('stars'),ctx=cv.getContext('2d');const w=cv.width,h=cv.height;ctx.clearRect(0,0,w,h);
    let seed=329;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<190;i++){const x=rand()*w,y=rand()*h,r=.25+rand()*1.0,a=.09+rand()*.38;ctx.fillStyle=`rgba(214,232,232,${a})`;ctx.beginPath();ctx.arc(x,y,r,0,2*PI);ctx.fill();}
  }
  function drawGlobe(){
    if(softwareContext){drawSoftwareGlobe();return;}
    if(!globeGL || !globeData)return;
    const gl=globeGL,dpr=$('globe').width/globeW;
    gl.viewport(0,0,$('globe').width,$('globe').height);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(globeProgram);
    gl.uniform2f(globeData.center,globeCenterX*dpr,(globeH-globeCenterY)*dpr);
    gl.uniform1f(globeData.radius,globeRadius*dpr);
    gl.uniform1f(globeData.yaw,state.yaw);gl.uniform1f(globeData.pitch,state.pitch);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if(webGLFirstDraw){
      webGLFirstDraw=false;
      // Detect silent shader / GPU failures (a blank canvas with working pins).
      try{
        const pixel=new Uint8Array(4);
        gl.readPixels(Math.round(globeCenterX*dpr),Math.round((globeH-globeCenterY)*dpr),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        if(gl.getError()!==gl.NO_ERROR || pixel[3]===0){activateSoftwareGlobe('graphics output is blank');sceneDirty=true;}
      }catch(err){activateSoftwareGlobe('graphics output unavailable');sceneDirty=true;}
    }
  }
  function project(p){
    const lat=p.lat*rad, lon=p.lng*rad;
    const delta=lon-state.yaw,cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
    const x=Math.cos(lat)*Math.sin(delta);
    const y=Math.sin(lat)*cp-Math.cos(lat)*sp*Math.cos(delta);
    const front=Math.sin(lat)*sp+Math.cos(lat)*cp*Math.cos(delta);
    return {x:globeCenterX+x*globeRadius,y:globeCenterY-y*globeRadius,visible:front>0.025};
  }
  function renderMarkers(){
    if(!globeW)return;
    const target=$('globeMarkers');const visibleIds=new Set(filtered().map(p=>p.id));
    for(const p of locations){
      if(!buttons.has(p.id)){
        const b=document.createElement('button');b.type='button';b.className='map-marker';b.setAttribute('aria-label',`Open ${p.name}`);
        const dot=document.createElement('span');dot.className='dot';const tooltip=document.createElement('span');tooltip.className='marker-tooltip';tooltip.textContent=p.name;
        b.append(dot,tooltip);b.addEventListener('click',()=>selectLocation(p));target.append(b);buttons.set(p.id,b);
      }
      const b=buttons.get(p.id),xy=project(p);
      b.style.left=`${xy.x}px`;b.style.top=`${xy.y}px`;
      b.hidden=!visibleIds.has(p.id)||!xy.visible;
      b.classList.toggle('active',p.id===state.selected?.id);
    }
  }
  const canvas=$('globe');let previousDrag=null;
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);previousDrag={id:e.pointerId,x:e.clientX,y:e.clientY};state.fly=null;state.globeDragging=true;});
  canvas.addEventListener('pointermove',e=>{
    if(!previousDrag||previousDrag.id!==e.pointerId)return;
    const dx=e.clientX-previousDrag.x,dy=e.clientY-previousDrag.y;
    state.yaw-=dx/Math.max(180,globeRadius)*.85;state.pitch=clamp(state.pitch+dy/Math.max(180,globeRadius)*.85,-1.45,1.45);
    previousDrag.x=e.clientX;previousDrag.y=e.clientY;sceneDirty=true;renderMarkers();
  });
  const up=e=>{if(previousDrag?.id===e.pointerId)previousDrag=null;state.globeDragging=false;};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom*(e.deltaY<0?1.09:.91),.62,1.8);resize();},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.yaw+=(e.key==='ArrowLeft'?.12:-.12);sceneDirty=true;renderMarkers();}
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();state.pitch=clamp(state.pitch+(e.key==='ArrowUp'?.1:-.1),-1.45,1.45);sceneDirty=true;renderMarkers();}
  });
  $('globeZoomIn').addEventListener('click',()=>{if(document.body.dataset.viewMode!=='globe'||document.body.classList.contains('maplibre-globe-ready'))return;state.zoom=clamp(state.zoom*1.2,.62,1.8);resize();});
  $('globeZoomOut').addEventListener('click',()=>{if(document.body.dataset.viewMode!=='globe'||document.body.classList.contains('maplibre-globe-ready'))return;state.zoom=clamp(state.zoom/1.2,.62,1.8);resize();});
  $('resetGlobe').addEventListener('click',()=>{if(document.body.dataset.viewMode!=='globe'||document.body.classList.contains('maplibre-globe-ready'))return;if(window.SKY_SURFER_PHOTO3D?.reset?.())return;state.fly=null;state.yaw=-98*rad;state.pitch=39*rad;state.zoom=1;resize();});
  function tick(time){
    if(state.fly){const f=state.fly;const t=clamp((time-f.start)/f.dur,0,1);const s=1-Math.pow(1-t,3);state.yaw=smooth(f.fromYaw,f.toYaw,s);state.pitch=smooth(f.fromPitch,f.toPitch,s);sceneDirty=true;renderMarkers();if(t>=1)state.fly=null;}
    if(sceneDirty && (!softwareContext || !state.fly || time-softwareLastFrame>65)){softwareLastFrame=time;drawGlobe();$('coordinates').textContent=`${fmt(state.pitch/rad,'N','S')}   ${fmt(state.yaw/rad,'E','W')}`;sceneDirty=false;}
    requestAnimationFrame(tick);
  }
  window.SKY_SURFER_APP={locations, selectLocation, getSelected:()=>state.selected, getFiltered:filtered,
    localGlobeZoomIn:()=>{state.zoom=clamp(state.zoom*1.2,.62,1.8);resize();},
    localGlobeZoomOut:()=>{state.zoom=clamp(state.zoom/1.2,.62,1.8);resize();},
    localGlobeReset:()=>{state.fly=null;state.yaw=-98*rad;state.pitch=39*rad;state.zoom=1;resize();}
  };
  makeWebGL();
  window.addEventListener('resize',resize);
  if('ResizeObserver' in window)new ResizeObserver(()=>resize()).observe($('globeArea'));
  buildPlaces();resize();requestAnimationFrame(tick);
})();
