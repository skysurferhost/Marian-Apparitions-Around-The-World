/* Sky Surfer Marian Apparitions Map — directory, markers, PDF viewer and interface. */
(() => {
  'use strict';
  const D = window.SKY_SURFER_DATA || {locations:[]};
  const locations = D.locations || [];
  const $ = id => document.getElementById(id);
  const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));
  const state = {search:'',selected:null,viewerMode:'image',pointer:null,justDragged:false,mediaIndex:0,mediaZoom:1,mediaPanX:0,mediaPanY:0,stageDragging:false,stagePointer:null,pinching:false,pinchStart:0,pinchZoom:1};
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  const fmt = (v,pos,neg)=>`${Math.abs(v).toFixed(3)}° ${v>=0?pos:neg}`;
  const labelCoords = p=>`${fmt(p.lat,'N','S')}  ·  ${fmt(p.lng,'E','W')}`;
  // Country/Timeline choices control the listing order; they never hide map markers.
  // The search still filters both browse modes against the same apparition records.
  function filtered() {
    const query=state.search.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const visible=locations.filter(p=>!query||(p.searchText||`${p.name} ${p.description||''}`).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(query));
    if(directoryBrowseMode==='timeline'){
      return visible.sort((a,b)=>(chronologicalYear(a)??Number.MAX_SAFE_INTEGER)-(chronologicalYear(b)??Number.MAX_SAFE_INTEGER)||countryCollator.compare(a.name,b.name));
    }
    return visible.sort((a,b)=>countryCollator.compare(a.geo?.country||'',b.geo?.country||'')||countryCollator.compare(a.name,b.name));
  }
  function buildPlaces() {
    const container=$('placeList');container.replaceChildren();
    const selected=filtered(); $('visibleCount').textContent=String(selected.length).padStart(2,'0')+' APPARITIONS';
    if(!selected.length){const empty=document.createElement('div');empty.className='list-empty';empty.textContent='No apparitions match. Try another search.';container.append(empty);}
    for(const [i,p] of selected.entries()){
      const btn=document.createElement('button');btn.type='button';btn.className='place-item'+(p.id===state.selected?.id?' active':'');
      const index=document.createElement('span');index.className='place-index';
      const number=document.createElement('span');number.className='place-number';number.textContent=String(i+1).padStart(2,'0');
      index.append(number);
      // Display the location's own flag below its ordinal, in both browse modes.
      // Country codes and flag PNGs are already bundled for the directory.
      const flagCode=countryFlagCode(p.geo?.country);
      if(flagCode){
        const flag=document.createElement('img');flag.className='place-flag';flag.src=`flags/${flagCode}.png`;
        flag.alt='';flag.setAttribute('aria-hidden','true');flag.width=21;flag.height=14;
        flag.loading='lazy';flag.decoding='async';
        flag.addEventListener('error',()=>flag.remove(),{once:true});
        index.append(flag);
      }
      const info=document.createElement('span');info.className='place-info';
      const name=document.createElement('span');name.className='place-name';name.textContent=p.displayName || p.name;
      if(p.isNew===true) name.append(makeNewLabel());
      const sub=document.createElement('span');sub.className='place-sub';sub.textContent=([p.geo?.city,p.geo?.state,p.geo?.country].filter(Boolean).join(', ') || p.region || 'Marian apparition');
      const chev=document.createElement('span');chev.className='place-chevron';chev.textContent='›';
      info.append(name,sub);btn.append(index,info,chev);btn.addEventListener('click',()=>selectLocation(p,true));container.append(btn);
    }

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
  // Inline flags use the same bundled country-code lookup as the directory headings.
  // Keep the country and its small flag together without changing the location text.
  function appendLocationWithFlag(target, geo, fallback=''){
    target.replaceChildren();
    const parts=[geo?.city,geo?.state].filter(Boolean);
    const country=geo?.country;
    if(!country){target.textContent=parts.join(', ')||fallback;return;}
    if(parts.length)target.append(document.createTextNode(parts.join(', ')+', '));
    const countryGroup=document.createElement('span');countryGroup.className='location-country-inline';
    countryGroup.textContent=country;
    const code=countryFlagCode(country);
    if(code){
      const flag=document.createElement('img');flag.className='inline-country-flag';
      flag.src=`flags/${code}.png`;flag.alt='';flag.setAttribute('aria-hidden','true');
      flag.width=17;flag.height=12;flag.decoding='async';
      flag.addEventListener('error',()=>flag.remove(),{once:true});
      countryGroup.append(flag);
    }
    target.append(countryGroup);
  }
  let directoryBrowseMode='country';
  // Use verified location year values only. Unknown years are grouped last,
  // not guessed from media files or descriptions.
  function chronologicalYear(place){
    const numeric=Number(place.year);
    return Number.isInteger(numeric)&&numeric>0?numeric:null;
  }
  function makeNewLabel(){const tag=document.createElement('span');tag.className='apparition-new-label';tag.textContent='NEW';return tag;}
  function directoryItem(place, chronological=false){
    /* Published NEW indicator */
    const item=document.createElement('button');item.type='button';item.className='directory-place';
    item.setAttribute('aria-label',`Show ${place.displayName||place.name} on the map and open details`);
    const info=document.createElement('span');info.className='directory-place-info';
    const title=document.createElement('span');title.className='directory-place-name';
    title.textContent=place.displayName||`${place.name}${place.year?' – '+place.year:''}`;
    if(place.isNew===true) title.append(makeNewLabel());
    const location=document.createElement('span');location.className='directory-place-sub';
    appendLocationWithFlag(location,place.geo,place.region||'');
    const arrow=document.createElement('span');arrow.className='directory-place-arrow';arrow.textContent='›';
    info.append(title,location);item.append(info,arrow);
    item.addEventListener('click',()=>{closeDirectory();selectLocation(place,true);});
    return item;
  }
  function setDirectoryMode(mode){
    if(mode!=='country' && mode!=='timeline')return;
    directoryBrowseMode=mode;
    for(const [id,value] of [
      ['directoryByCountry','country'],['directoryByTimeline','timeline'],
      ['showAll','country'],['showDocs','timeline']
    ]){
      const btn=$(id),selected=mode===value;
      btn.classList.toggle('is-active',selected);
      btn.classList.toggle('active',selected); // Existing sidebar active styling.
      btn.setAttribute('aria-pressed',String(selected));
    }
    buildPlaces();
    $('directoryTitle').textContent=mode==='country'?'Marian Apparitions Directory':'Marian Apparitions Timeline';
    $('directoryIntro').textContent=mode==='country'
      ?'Select an apparition to find its location and view the accompanying document.'
      :'Explore apparitions from earliest to latest, then select one to view its location and document.';
    $('directorySortLabel').textContent=mode==='country'?'Countries listed A–Z':'Earliest to latest';
    renderDirectory();
    $('directoryResults').scrollTop=0;
  }
  function renderDirectory(){
    const term=plain($('directorySearch').value.trim());
    const matched=locations.filter(p=>!term||plain([p.name,p.displayName,p.year,p.description,p.geo?.city,p.geo?.state,p.geo?.country,p.geo?.continent,p.searchText,(p.media||[]).map(m=>m.label||m.src).join(' ')].join(' ')).includes(term));
    const list=$('directoryResults');list.replaceChildren();
    if(directoryBrowseMode==='country'){
      const groups=new Map();
      for(const p of matched){const country=p.geo?.country||'Other locations';if(!groups.has(country))groups.set(country,[]);groups.get(country).push(p);}
      for(const country of [...groups.keys()].sort(countryCollator.compare)){
        const section=document.createElement('section');section.className='directory-country';section.setAttribute('role','listitem');
        const heading=document.createElement('h3');heading.className='directory-country-name';
        const flag=makeCountryFlag(country);
        const name=document.createElement('span');name.textContent=country;heading.append(flag,name);section.append(heading);
        groups.get(country).sort((a,b)=>countryCollator.compare(a.name,b.name)||((a.year||0)-(b.year||0))).forEach(p=>section.append(directoryItem(p)));
        list.append(section);
      }
      $('directoryCount').textContent=`${matched.length} apparition${matched.length===1?'':'s'} · ${groups.size} countr${groups.size===1?'y':'ies'}`;
    }else{
      const sorted=[...matched].sort((a,b)=>{
        const yearA=chronologicalYear(a),yearB=chronologicalYear(b);
        return (yearA??Number.MAX_SAFE_INTEGER)-(yearB??Number.MAX_SAFE_INTEGER)||countryCollator.compare(a.name,b.name);
      });
      const groups=new Map();
      for(const p of sorted){const year=chronologicalYear(p);const key=year??'Undated';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
      for(const [year,places] of groups){
        const section=document.createElement('section');section.className='directory-year';section.setAttribute('role','listitem');
        const heading=document.createElement('h3');heading.className='directory-year-name';
        heading.textContent=year==='Undated'?'Date not specified':String(year);
        section.append(heading);
        for(const place of places)section.append(directoryItem(place,true));
        list.append(section);
      }
      const dated=sorted.filter(p=>chronologicalYear(p)!==null).length;
      $('directoryCount').textContent=`${matched.length} apparition${matched.length===1?'':'s'} · ${dated} dated`;
    }
    if(!matched.length){const empty=document.createElement('p');empty.className='directory-empty';empty.textContent='No apparitions found. Try another place, year, or name.';list.append(empty);}
  }
  $('directoryByCountry').addEventListener('click',()=>setDirectoryMode('country'));
  $('directoryByTimeline').addEventListener('click',()=>setDirectoryMode('timeline'));
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
      if(expandedViewer==='image'&&state.selected&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();changeMedia(e.key==='ArrowRight'?1:-1);}
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('search').focus();$('search').select();}
    if(e.key==='Escape'&&!directory.hidden){e.preventDefault();closeDirectory();return;}
    if(e.key==='Escape'&&document.fullscreenElement){document.exitFullscreen();}
    else if(e.key==='Escape'&&state.selected){closePanel();}
    if(e.target instanceof HTMLInputElement)return;
    if(state.selected && state.viewerMode==='image' && (e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();changeMedia(e.key==='ArrowRight'?1:-1);}
  });
  // The sidebar and the popup directory share exactly one browse mode.
  $('showAll').addEventListener('click',()=>setDirectoryMode('country'));
  $('showDocs').addEventListener('click',()=>setDirectoryMode('timeline'));
  function selectLocation(p){
    if(!$('mediaOverlay').hidden)closeMediaOverlay();
    state.selected=p;window.SKY_SURFER_MAP?.select?.(p);openDetailPanel();
    $('placeTitle').textContent=p.displayName || p.name;
    appendLocationWithFlag($('placeLocation'),p.geo);
    $('placeCoords').textContent=labelCoords(p);
    const fileCount=new Set((p.media||[]).map(m=>m.src)).size;
    const pageCount=(p.media||[]).filter(m=>m.type==='pdf').length;
    $('mediaCounter').textContent=fileCount?`${fileCount} FILE${fileCount===1?'':'S'}${pageCount?' · '+pageCount+' PDF PAGE'+(pageCount===1?'':'S'):''}`:'0 FILES';
    state.mediaIndex=0;
    setViewerMode('image',true);
    if(p.media?.length)renderMedia();
    buildPlaces();
    window.requestAnimationFrame(resize);
    // Do not scroll the containing Squarespace page/iframe on marker or list selection.
    // The side drawer overlays the visible map without changing the viewport.
  }
  function clearStreetViewer(){
    const frame=$('streetViewerFrame');
    frame.removeAttribute('src');frame.hidden=true;
    $('streetReload').disabled=true;$('streetTrialHint').hidden=true;
    $('streetViewer').hidden=true;
  }
  function setViewerMode(mode,initial=false){
    if(!state.selected)return;
    if(!initial&&mode===state.viewerMode)return;
    if(!$('mediaOverlay').hidden)closeMediaOverlay();
    const street=mode==='street';
    state.viewerMode=street?'street':'image';
    $('imageViewerTab').setAttribute('aria-pressed',String(!street));
    $('streetViewerTab').setAttribute('aria-pressed',String(street));
    $('mediaCounter').hidden=street;
    const hasMedia=Boolean(state.selected.media?.length);
    if(street){
      if(!viewer.ready)++viewer.generation;
      $('viewerBox').hidden=true;$('emptyMedia').hidden=true;
      const urls=window.SKY_SURFER_STREET_VIEW.urls(state.selected,window.SKY_SURFER_STREET_VIEW_CONFIG);
      const frame=$('streetViewerFrame');
      $('streetViewLink').href=urls.external||'https://www.google.com/maps/';
      $('streetViewer').hidden=false;
      $('streetViewerUnavailable').hidden=Boolean(urls.embed);
      frame.hidden=!urls.embed;
      $('streetReload').disabled=!urls.embed;$('streetTrialHint').hidden=!urls.trial;
      if(urls.embed)frame.src=urls.embed;else frame.removeAttribute('src');
    }else{
      clearStreetViewer();
      $('viewerBox').hidden=!hasMedia;$('emptyMedia').hidden=hasMedia;
      if(!initial&&hasMedia){if(!viewer.ready)renderMedia();else requestAnimationFrame(resizeMediaViewer);}
    }
  }
  $('imageViewerTab').addEventListener('click',()=>setViewerMode('image'));
  $('streetViewerTab').addEventListener('click',()=>setViewerMode('street'));
  function closePanel(){
    if(!$('mediaOverlay').hidden)closeMediaOverlay();
    const previous=state.selected;
    clearStreetViewer();state.viewerMode='image';
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
    if(!target.closest('#mapLibreCanvas, #cesiumEarth'))return false;
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
    if(!viewer.ready||state.viewerMode!=='image'||!stage.clientWidth||!stage.clientHeight)return;
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
  const streetBox=$('streetViewer');
  const streetHome=streetBox.parentNode;
  const streetHomeNext=streetBox.nextSibling;
  let previousMediaFocus=null,expandedViewer=null;
  // State-preserving DOM moves retain the iframe's browsing context on modern Chromium.
  // Older browsers reload the same panorama after a conventional DOM reparent.
  function moveStreet(parent,next=null){
    if(typeof parent.moveBefore==='function'){
      try{parent.moveBefore(streetBox,next);return;}catch(_){}
    }
    parent.insertBefore(streetBox,next);
  }
  function updateStreetOverlayButton(){
    const active=expandedViewer==='street'&&!mediaOverlay.hidden;
    const b=$('streetFullscreen');
    $('streetFullscreenLabel').textContent=active?'CLOSE VIEWER':'FULLSCREEN';
    b.setAttribute('aria-label',active?'Close expanded Street Viewer':'Expand Street Viewer');
    b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-expanded',String(active));
    b.title=active?'Return to map and apparition details':'Expand Street Viewer over the map';
  }
  function updateMediaOverlayButton(){
    const active=expandedViewer==='image'&&!mediaOverlay.hidden;
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
  function openMediaOverlay(kind='image'){
    const street=kind==='street';
    if(!mediaOverlay.hidden || (street?streetBox.hidden:viewerBox.hidden))return;
    previousMediaFocus=document.activeElement;expandedViewer=kind;
    mediaOverlay.setAttribute('aria-label',street?'Expanded Street Viewer':'Expanded document viewer');
    if(street)moveStreet(mediaOverlayDialog);else mediaOverlayDialog.appendChild(viewerBox);
    mediaOverlay.hidden=false;
    document.body.classList.add('media-overlay-open');
    updateMediaOverlayButton();updateStreetOverlayButton();
    if(!street)updateMediaOverlayLayout();
    $(street?'streetFullscreen':'mediaFullscreen').focus({preventScroll:true});
  }
  function closeMediaOverlay(){
    if(mediaOverlay.hidden)return;
    // Hide before restoring the viewer to prevent a flash in the original panel.
    mediaOverlay.hidden=true;
    const street=expandedViewer==='street';
    if(street)moveStreet(streetHome,streetHomeNext);else viewerHome.insertBefore(viewerBox,viewerHomeNext);
    expandedViewer=null;
    document.body.classList.remove('media-overlay-open');
    updateMediaOverlayButton();updateStreetOverlayButton();
    if(!street)updateMediaOverlayLayout();
    const returnFocus=previousMediaFocus?.isConnected?previousMediaFocus:$(street?'streetFullscreen':'mediaFullscreen');
    if(returnFocus?.focus)requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
    previousMediaFocus=null;
  }
  function trapMediaOverlayFocus(e){
    const controls=Array.from(mediaOverlayDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])'))
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
  $('streetFullscreen').addEventListener('click',()=>{
    if(mediaOverlay.hidden)openMediaOverlay('street');else closeMediaOverlay();
  });
  $('streetReload').addEventListener('click',()=>{
    const frame=$('streetViewerFrame');const src=frame.getAttribute('src');if(src)frame.src=src;
  });
  updateMediaOverlayButton();updateStreetOverlayButton();
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
    if(state.viewerMode!=='image'||!sw||!sh)return;
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

  function resize(){if(viewer.ready)requestViewerDraw();}
  window.SKY_SURFER_APP={locations,selectLocation,getSelected:()=>state.selected,getFiltered:filtered};
  window.addEventListener('resize',resize);
  buildPlaces();resize();
})();
