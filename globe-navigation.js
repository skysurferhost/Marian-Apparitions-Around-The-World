/* Keyboard navigation and camera-relative daylight for the Cesium globe. */
'use strict';
(()=>{
 const R=6378137, PI=Math.PI, rad=PI/180;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const keyMap={w:[0,1],arrowup:[0,1],s:[0,-1],arrowdown:[0,-1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
 // Advance along a great circle at a scale-dependent speed, preserving altitude and orientation.
 function advance(lon,lat,height,heading,x,y,dt){
  if(!x&&!y)return {lon,lat};
  const bearing=heading+Math.atan2(x,y),angle=clamp(Math.max(1,height)*.82/R,1e-8,.8)*clamp(dt,0,.05);
  const nextLat=Math.asin(clamp(Math.sin(lat)*Math.cos(angle)+Math.cos(lat)*Math.sin(angle)*Math.cos(bearing),-1,1));
  const nextLon=lon+Math.atan2(Math.sin(bearing)*Math.sin(angle)*Math.cos(lat),Math.cos(angle)-Math.sin(lat)*Math.sin(nextLat));
  return {lon:((nextLon+3*PI)%(2*PI))-PI,lat:clamp(nextLat,-89.95*rad,89.95*rad)};
 }
 // A camera-relative sun above and left creates a stable lower-right twilight crescent.
 // Near the ground, return to front lighting to preserve the existing building appearance.
 function shadowAmount(height){const t=clamp((height-6500000)/3500000,0,1);return t*t*(3-2*t);}
 function viewLight(position,right,up,height=22000000){
  if(!position)return {x:1,y:0,z:0};
  const m=Math.hypot(position.x,position.y,position.z);
  if(!Number.isFinite(m)||m<=0)return {x:1,y:0,z:0};
  const n={x:position.x/m,y:position.y/m,z:position.z/m};
  if(!right||!up)return n;
  // Project camera axes onto the tangent plane so a tilted camera cannot skew the sun.
  const d=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const tangent={x:-.80*right.x+.60*up.x,y:-.80*right.y+.60*up.y,z:-.80*right.z+.60*up.z};
  const k=d(tangent,n),x=tangent.x-k*n.x,y=tangent.y-k*n.y,z=tangent.z-k*n.z,len=Math.hypot(x,y,z);
  if(!Number.isFinite(len)||len<1e-6)return n;
  const angle=55*rad*shadowAmount(height),c=Math.cos(angle),s=Math.sin(angle)/len;
  return {x:n.x*c+x*s,y:n.y*c+y*s,z:n.z*c+z*s};
 }
 function daylightShade(dot,height){
  // Soft terminator, deep twilight at the rim; fade entirely before the mobile renderer handoff.
  const t=clamp((dot+.12)/.40,0,1),lit=.07+.93*t*t*(3-2*t);
  return 1-shadowAmount(height)*(1-lit);
 }
 function initialMode(search){
  const value=new URLSearchParams(search).get('view')?.toLowerCase();
  return ['satellite','map','street','streets'].includes(value)?'satellite':'cesium';
 }
 function install(C,viewer,isActive){
  const keys=new Set();let frame=null,last=null;
  const stop=()=>{keys.clear();last=null;if(frame!==null){window.cancelAnimationFrame(frame);frame=null;}};
  const blocked=target=>{
   if(document.hidden||!isActive()||['apparitionsDirectory','mediaOverlay'].some(id=>{const el=document.getElementById(id);return el&&!el.hidden;}))return true;
   return !!(target?.isContentEditable||target?.closest?.('input,textarea,select,[contenteditable],iframe,#infoPanel,.cesium-credit-lightbox, [role="dialog"],a'));
  };
  function step(now){
   frame=null;if(!keys.size||blocked(document.activeElement)){stop();return;}
   const dt=last===null?1/60:clamp((now-last)/1000,0,.05);last=now;
   let x=0,y=0;for(const k of keys){const v=keyMap[k];x+=v[0];y+=v[1];}
   x=Math.sign(x);y=Math.sign(y);
   if(x||y){const cam=viewer.camera,p=cam.positionCartographic;
    if(p&&Number.isFinite(p.height)){const next=advance(p.longitude,p.latitude,p.height,cam.heading||0,x,y,dt);
     cam.setView({destination:C.Cartesian3.fromRadians(next.lon,next.lat,p.height),orientation:{heading:cam.heading,pitch:cam.pitch,roll:cam.roll}});viewer.scene.requestRender?.();}
   }
   frame=window.requestAnimationFrame(step);
  }
  window.addEventListener('keydown',e=>{
   const key=e.key?.toLowerCase();if(!Object.hasOwn(keyMap,key)||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||blocked(e.target))return;
   e.preventDefault();e.stopPropagation();
   if(!keys.size){viewer.camera.cancelFlight();last=null;}keys.add(key);if(frame===null)frame=window.requestAnimationFrame(step);
  },true);
  window.addEventListener('keyup',e=>{const key=e.key?.toLowerCase();if(keys.delete(key)){e.preventDefault();e.stopPropagation();if(!keys.size)stop();}},true);
  window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);
  document.addEventListener('focusin',e=>{if(blocked(e.target))stop();});
  return {stop};
 }
 window.SKY_SURFER_GLOBE_NAV={advance,viewLight,daylightShade,shadowAmount,initialMode,install};
})();
