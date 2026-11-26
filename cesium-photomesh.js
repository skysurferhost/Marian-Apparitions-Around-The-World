/* v1.68: native OGC 3D Tiles photogrammetry. No token or paid API by default. */
'use strict';
(()=>{
 const rad=Math.PI/180,MB=1024*1024;
 const france=(name,path,bounds)=>({name,url:`https://3d.craig.fr/datasets/${path}/3dtiles/tileset.json`,bounds,credit:'CRAIG — Licence Ouverte Etalab'});
 // Bounds are the geographic regions from the published root tilesets (radians).
 const sources=[
  {name:'Helsinki, Finland',url:'https://kartta.hel.fi/3d/mesh/Helsinki_2024/tileset.json',bounds:[.43334475,1.04937759,.44081,1.05241775],credit:'City of Helsinki — Helsinki 3D mesh 2024, CC BY 4.0'},
  france('Aurillac, France','Aurillac',[.04213886,.78368519,.04289552,.78441466]),
  france('Bourgoin-Jallieu, France','Bourgoin',[.09169855,.79537926,.09272203,.79600674]),
  france('Clermont-Ferrand, France','Clermont',[.05307802,.79768221,.05749029,.80084478]),
  france('Gex, France','Gex',[.10534929,.80701299,.10715031,.80890361]),
  france('Issoire, France','Issoire',[.05633398,.79454945,.05711059,.79531737]),
  france('Le Puy-en-Velay, France','LePuy',[.06739167,.78583116,.06858271,.78643629]),
  france('Saint-Étienne, France','St-Etienne',[.07614398,.79233890,.07701684,.79358420]),
  france('Voiron, France','Voiron',[.09733502,.79148579,.097919,.79211741])
 ];
 // User-owned / expressly licensed local or HTTPS 3D Tiles, in WGS84 ECEF.
 for(const s of (window.SKY_SURFER_CUSTOM_PHOTOMESH||[])){
  if(!s||typeof s.name!=='string'||!s.name.trim()||typeof s.url!=='string'||typeof s.credit!=='string'||!s.credit.trim()||!Array.isArray(s.bounds)||s.bounds.length!==4||!s.bounds.every(Number.isFinite))continue;
  const [w,b,e,n]=s.bounds;if(w< -180||e>180||b< -90||n>90||w>=e||b>=n)continue;
  try{const u=new URL(s.url,document.baseURI);if(u.protocol!=='https:'&&u.origin!==new URL(document.baseURI).origin)continue;sources.push({name:s.name,url:u.href,credit:s.credit,bounds:s.bounds.map(v=>v*rad)});}catch(_){}
 }
 function inside(s,p){const [w,b,e,n]=s.bounds;return p.longitude>=w&&p.longitude<=e&&p.latitude>=b&&p.latitude<=n;}
 function distance(s,p){const [w,b,e,n]=s.bounds;const dx=Math.max(w-p.longitude,0,p.longitude-e)*Math.cos(p.latitude),dy=Math.max(b-p.latitude,0,p.latitude-n);return Math.hypot(dx,dy)*6371000;}
 function create(C,viewer,isPhone,log,creditNode){
  let current=null,pending=null,wanted=null,generation=0,visibleAt=0,failures=0,startedAt=0;
  const retry=new Map(),collection=viewer.scene.primitives;
  function credit(text=''){if(creditNode){creditNode.textContent=text;creditNode.hidden=!text;}}
  function remove(){generation++;wanted=null;visibleAt=0;if(current){collection.remove(current.tileset);current=null;}credit();}
  function clear(){remove();}
  function destroyUnused(tileset){if(tileset&&!tileset.isDestroyed?.())tileset.destroy?.();}
  function options(){const phone=isPhone();return {maximumScreenSpaceError:phone?24:16,cacheBytes:(phone?72:192)*MB,maximumCacheOverflowBytes:(phone?32:96)*MB,showCreditsOnScreen:true,dynamicScreenSpaceError:true,cullRequestsWhileMoving:true,preloadWhenHidden:false,preloadFlightDestinations:false,progressiveResolutionHeightFraction:.35,enableCollision:true};}
  async function open(source){const token=++generation;const job={source,token,at:Date.now()};pending=job;startedAt=job.at;failures=0;let tileset;
   try{tileset=await C.Cesium3DTileset.fromUrl(source.url,options());
    if(token!==generation||wanted!==source||viewer.isDestroyed()){destroyUnused(tileset);return;}
    current={source,tileset};visibleAt=0;
    tileset.tileVisible.addEventListener(()=>{if(current?.tileset===tileset)visibleAt=Date.now();});
    tileset.tileFailed.addEventListener(e=>{if(current?.tileset!==tileset)return;failures++;if(failures<=3)log('Photomesh tile failed: '+source.name+' — '+(e.message||'network error'));});
    collection.add(tileset);log('Native 3D Tiles root opened: '+source.name);credit('3D mesh: '+source.name+' · '+source.credit);viewer.scene.requestRender?.();
   }catch(e){if(token===generation){if(tileset&&current?.tileset===tileset){collection.remove(tileset);current=null;}else destroyUnused(tileset);retry.set(source,Date.now()+60000);wanted=null;credit();log('Photomesh unavailable: '+source.name+' — '+e.message);}}
   finally{if(pending===job)pending=null;}
  }
  function update(center,height,moving){
   // Expire a stuck root attempt. A late result still gets destroyed by its token check.
   if(pending&&Date.now()-pending.at>30000){const job=pending;pending=null;retry.set(job.source,Date.now()+60000);if(job.token===generation){remove();log('Photomesh root timed out: '+job.source.name);}}
   if(!center||!Number.isFinite(center.longitude)||!Number.isFinite(center.latitude)||!Number.isFinite(height)||height>(current?17000:12000)){if(wanted||current)remove();return false;}
   const reach=current?2500:1600;const available=sources.filter(s=>distance(s,center)<=reach&&(retry.get(s)||0)<=Date.now()).sort((a,b)=>distance(a,center)-distance(b,center));
   const next=current&&available.includes(current.source)?current.source:available[0];
   if(!next){if(current||wanted)remove();return false;}
   if(wanted!==next){remove();wanted=next;}
   // Only one root request at a time; obsolete results are destroyed on arrival.
   if(!current&&!pending&&!moving){open(next);return false;}
   if(!current)return false;
   const phone=isPhone();current.tileset.maximumScreenSpaceError=moving?(phone?36:28):(phone?20:12);
   // Keep fallback until some mesh actually renders; failed roots get a cooldown.
   if(!visibleAt&&Date.now()-startedAt>45000){retry.set(next,Date.now()+60000);log('Photomesh timed out: '+next.name);remove();return false;}
   return !!visibleAt&&Date.now()-visibleAt<1600&&inside(current.source,center);
  }
  return {update,clear,status:()=>current?'3D mesh: '+current.source.name:pending&&wanted===pending.source?'3D mesh loading: '+pending.source.name:''};
 }
 window.SKY_SURFER_PHOTOMESH={create,sources,inside,distance};
})();
