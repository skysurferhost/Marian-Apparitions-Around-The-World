/* v1.75: smooth independent Canvas2D Earth, adaptive raster and screen-space labels. */
'use strict';
(()=>{
 const R=6378137,PI=Math.PI;
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function intersect(o,d){const a=dot(d,d),b=dot(o,d),c=dot(o,o)-1,disc=b*b-a*c;if(disc<0||b>=0)return null;const t=(-b-Math.sqrt(disc))/a;return t>0?{x:o.x+t*d.x,y:o.y+t*d.y,z:o.z+t*d.z}:null;}
 function uv(p,w,h){return [((Math.floor((Math.atan2(p.y,p.x)/(2*PI)+.5)*w)%w)+w)%w,Math.max(0,Math.min(h-1,Math.floor((.5-Math.asin(Math.max(-1,Math.min(1,p.z)))/PI)*h)))];}
 // Projected diameter relative to the smaller map viewport dimension, not the phone screen.
 function screenFill(cam,w,h){const p=cam.positionWC;if(!p||!w||!h||!cam.frustum?.fovy)return 0;const distance=Math.hypot(p.x,p.y,p.z)/R;if(distance<=1)return Infinity;return h/(Math.tan(cam.frustum.fovy/2)*Math.sqrt(distance*distance-1)*Math.min(w,h));}
 function labelAlpha(fill){return clamp((fill-.64)/.30,0,1);}
 function projectPoint(point,o,d,r,u,w,h,sx,sy){if(dot(point,o)<=1.025)return null;const x=point.x-o.x,y=point.y-o.y,z=point.z-o.z;const depth=x*d.x+y*d.y+z*d.z;if(depth<=0)return null;return {x:w*(.5+(x*r.x+y*r.y+z*r.z)/(2*sx*depth)),y:h*(.5-(x*u.x+y*u.y+z*u.z)/(2*sy*depth))};}
 const toPoint=(lon,lat)=>{const a=lon*PI/180,b=lat*PI/180;return {x:Math.cos(b)*Math.cos(a),y:Math.cos(b)*Math.sin(a),z:Math.sin(b)};};
 const names=(window.SKY_SURFER_WORLD_NAMES||[]).map(([name,lon,lat,area])=>({name,area,point:toPoint(lon,lat)}));
 const oceans=[['North Atlantic Ocean',-42,29],['South Atlantic Ocean',-24,-28],['North Pacific Ocean',-155,27],['South Pacific Ocean',-140,-31],['Indian Ocean',79,-29],['Arctic Ocean',0,83],['Southern Ocean',30,-61]].map(([name,lon,lat])=>({name,point:toPoint(lon,lat),ocean:true,area:Infinity}));
 function create(C,viewer,canvas,markers,log){
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
  const frame=document.createElement('canvas'),fc=frame.getContext('2d',{alpha:true});if(!fc)return null;
  let tex=null,tw=2048,th=1024,last='',at=-Infinity,shown=false,dirty=true,settled=false,movingSize=320,pix=null,xr=null,yr=null,lastSX=0,lastSY=0;
  const img=new Image(),pin=new Image();
  img.onload=()=>{try{const s=document.createElement('canvas');s.width=tw;s.height=th;const c=s.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,tw,th);tex=c.getImageData(0,0,tw,th).data;dirty=true;log('Mobile world: independent Canvas2D NASA texture ready');}catch(e){log('Mobile world texture: '+e.message);}};
  img.onerror=()=>{if(!img.dataset.retried){img.dataset.retried='1';img.src=new URL('assets/earth-natural-v14.webp',document.baseURI).href;}else log('Mobile world texture unavailable');};
  img.src=new URL('assets/cesium-blue-marble-2048.jpg',document.baseURI).href;
  pin.onload=()=>{dirty=true;};pin.src=new URL('assets/marian-apparition-pin.svg',document.baseURI).href;
  function hide(){if(shown){canvas.hidden=true;shown=false;dirty=true;}}
  function draw(enabled,showNames=true){if(!enabled||!tex){hide();return false;}
   const cam=viewer.camera,p=cam.positionWC,d=cam.directionWC,r=cam.rightWC,u=cam.upWC,fr=cam.frustum;
   if(!p||!d||!r||!u||!Number.isFinite(fr.fovy)||fr.fovy<=0){hide();return false;}
   const w=viewer.scene.canvas.clientWidth,h=viewer.scene.canvas.clientHeight;if(!w||!h){hide();return false;}
   const sig=[p.x,p.y,p.z,d.x,d.y,d.z,u.x,u.y,u.z,fr.fovy,fr.aspectRatio,w,h,showNames,...Array.from(markers.values(),e=>String(e.show)+':'+String(e.billboard.scale?.getValue?.(viewer.clock.currentTime)??e.billboard.scale))].join('|');
   const now=performance.now(),same=last===sig;
   if(shown&&!dirty&&(same?(settled||now-at<100):now-at<30))return true;
   at=now;last=sig;dirty=false;settled=same;
   const ratio=Math.min(1,(settled?540:movingSize)/Math.max(w,h)),fw=Math.max(1,Math.round(w*ratio)),fh=Math.max(1,Math.round(h*ratio));
   if(frame.width!==fw||frame.height!==fh||!pix){frame.width=fw;frame.height=fh;pix=fc.createImageData(fw,fh);xr=new Float64Array(fw);yr=new Float64Array(fh);lastSX=lastSY=0;}
   const out=pix.data,o={x:p.x/R,y:p.y/R,z:p.z/R};out.fill(0);
   const sy=Math.tan(fr.fovy/2),sx=sy*(fr.aspectRatio||w/h);
   if(lastSX!==sx){for(let i=0;i<fw;i++)xr[i]=(2*(i+.5)/fw-1)*sx;lastSX=sx;}
   if(lastSY!==sy){for(let j=0;j<fh;j++)yr[j]=(1-2*(j+.5)/fh)*sy;lastSY=sy;}
   const od=dot(o,d),orr=dot(o,r),ou=dot(o,u),c=dot(o,o)-1, tx=tw/(2*PI),ty=th/PI;
   // Camera basis is orthonormal. Avoid per-pixel allocations, dot products and divisions on ray misses.
   for(let j=0;j<fh;j++){const v=yr[j],bx=d.x+v*u.x,by=d.y+v*u.y,bz=d.z+v*u.z,b0=od+v*ou,a0=1+v*v;for(let i=0;i<fw;i++){const q=xr[i],b=b0+q*orr,a=a0+q*q,disc=b*b-a*c;if(disc<0||b>=0)continue;const t=(-b-Math.sqrt(disc))/a;if(t<=0)continue;
    const hx=o.x+t*(bx+q*r.x),hy=o.y+t*(by+q*r.y),hz=clamp(o.z+t*(bz+q*r.z),-1,1);
    const fx=Math.atan2(hy,hx)*tx+tw*.5,fy=clamp(th*.5-Math.asin(hz)*ty,0,th-1),ix=Math.floor(fx)%tw,iy=Math.floor(fy),n=(j*fw+i)*4,k=(iy*tw+ix)*4;
    if(settled){const dx=fx-Math.floor(fx),dy=fy-iy,k2=(iy*tw+(ix+1)%tw)*4,k3=(Math.min(iy+1,th-1)*tw+ix)*4,k4=(Math.min(iy+1,th-1)*tw+(ix+1)%tw)*4;for(let ch=0;ch<3;ch++)out[n+ch]=(tex[k+ch]*(1-dx)+tex[k2+ch]*dx)*(1-dy)+(tex[k3+ch]*(1-dx)+tex[k4+ch]*dx)*dy;}
    else{out[n]=tex[k];out[n+1]=tex[k+1];out[n+2]=tex[k+2];}out[n+3]=255;
   }}
   fc.putImageData(pix,0,0);
   const dpi=Math.min(1.5,window.devicePixelRatio||1),cw=Math.round(w*dpi),ch=Math.round(h*dpi);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
   ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.drawImage(frame,0,0,w,h);
   // Keep labels upright and a fixed screen size; the same projection drives the Earth and the names.
   const pins=[];if(pin.complete&&pin.naturalWidth&&C.SceneTransforms?.worldToWindowCoordinates){for(const e of markers.values()){
    if(!e.show||!e.billboard.show.getValue(viewer.clock.currentTime))continue;
    const pos=e.position.getValue(viewer.clock.currentTime),xy=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,pos);if(!xy)continue;
    const scale=e.billboard.scale?.getValue?.(viewer.clock.currentTime)||1;pins.push({x:xy.x,y:xy.y,scale});
   }}
   const fill=screenFill(cam,w,h),alpha=showNames?labelAlpha(fill):0;
   if(alpha>0){const occupied=pins.map(({x,y,scale})=>[x-17*scale,y-42*scale,x+17*scale,y+4]);const minArea=fill<.95?650000:fill<1.35?180000:55000;let count=0;
    ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.strokeStyle='rgba(10,20,28,.9)';ctx.lineWidth=2;
    for(const entry of [...names,...oceans]){if(count>=Math.max(12,Math.min(34,Math.round(w*h/7500))))break;if(entry.area<minArea)continue;const xy=projectPoint(entry.point,o,d,r,u,w,h,sx,sy);if(!xy)continue;
     const size=entry.ocean?10:11;ctx.font=`${entry.ocean?'italic 400':'500'} ${size}px Arial, sans-serif`;const half=ctx.measureText(entry.name).width/2+4,b=[xy.x-half,xy.y-8,xy.x+half,xy.y+8];if(b[0]<5||b[1]<5||b[2]>w-5||b[3]>h-5||occupied.some(a=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1]))continue;
     occupied.push(b);ctx.fillStyle=entry.ocean?'#b9d7e9':'#f6f4eb';ctx.strokeText(entry.name,xy.x,xy.y);ctx.fillText(entry.name,xy.x,xy.y);count++;
    }ctx.restore();
   }
   for(const {x,y,scale} of pins)ctx.drawImage(pin,x-15*scale,y-40*scale,30*scale,40*scale);
   canvas.hidden=false;shown=true;
   // Adapt to the device rather than forcing a high CPU workload during touch gestures.
   if(!settled){const cost=performance.now()-now;if(cost>26)movingSize=Math.max(220,movingSize-32);else if(cost<12)movingSize=Math.min(400,movingSize+12);}
   return true;
  }
  return {draw,hide};
 }
 window.SKY_SURFER_MOBILE_WORLD={create,intersect,uv,screenFill,labelAlpha,projectPoint};
})();
