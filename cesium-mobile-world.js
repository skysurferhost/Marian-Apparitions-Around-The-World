/* v1.72: independent Canvas2D distant Earth; same camera as the Cesium globe. */
'use strict';
(()=>{
 const R=6378137,PI=Math.PI;
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 // Intersect a perspective ray with a unit sphere. The ray need not be normalized.
 function intersect(o,d){const a=dot(d,d),b=dot(o,d),c=dot(o,o)-1,disc=b*b-a*c;if(disc<0||b>=0)return null;const t=(-b-Math.sqrt(disc))/a;return t>0?{x:o.x+t*d.x,y:o.y+t*d.y,z:o.z+t*d.z}:null;}
 function uv(p,w,h){return [((Math.floor((Math.atan2(p.y,p.x)/(2*PI)+.5)*w)%w)+w)%w,Math.max(0,Math.min(h-1,Math.floor((.5-Math.asin(Math.max(-1,Math.min(1,p.z)))/PI)*h)))];}
 function create(C,viewer,canvas,markers,log){
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
  const frame=document.createElement('canvas'),fc=frame.getContext('2d',{alpha:true});if(!fc)return null;
  let tex=null,tw=1024,th=512,last='',at=-Infinity,shown=false,dirty=true;
  const img=new Image(),pin=new Image();
  img.onload=()=>{try{const s=document.createElement('canvas');s.width=tw;s.height=th;const c=s.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,tw,th);tex=c.getImageData(0,0,tw,th).data;dirty=true;log('Mobile world: independent Canvas2D NASA texture ready');}catch(e){log('Mobile world texture: '+e.message);}};
  img.onerror=()=>{if(!img.dataset.retried){img.dataset.retried='1';img.src=new URL('assets/earth-natural-v14.webp',document.baseURI).href;}else log('Mobile world texture unavailable');};
  img.src=new URL('assets/cesium-blue-marble-2048.jpg',document.baseURI).href;
  pin.onload=()=>{dirty=true;};pin.src=new URL('assets/marian-apparition-pin.svg',document.baseURI).href;
  function hide(){if(shown){canvas.hidden=true;shown=false;dirty=true;}}
  function draw(enabled){if(!enabled||!tex){hide();return false;}
   const cam=viewer.camera,p=cam.positionWC,d=cam.directionWC,r=cam.rightWC,u=cam.upWC,fr=cam.frustum;
   if(!p||!d||!r||!u||!Number.isFinite(fr.fovy)||fr.fovy<=0){hide();return false;}
   const w=viewer.scene.canvas.clientWidth,h=viewer.scene.canvas.clientHeight;if(!w||!h){hide();return false;}
   const sig=[p.x,p.y,p.z,d.x,d.y,d.z,u.x,u.y,u.z,fr.fovy,w,h,...Array.from(markers.values(),e=>String(e.show)+':'+String(e.billboard.scale))].join('|');
   if(shown&&!dirty&&(last===sig||performance.now()-at<65))return true;
   at=performance.now();last=sig;dirty=false;
   const ratio=Math.min(1,420/Math.max(w,h)),fw=Math.max(1,Math.round(w*ratio)),fh=Math.max(1,Math.round(h*ratio));
   if(frame.width!==fw||frame.height!==fh){frame.width=fw;frame.height=fh;}
   const pix=fc.createImageData(fw,fh),out=pix.data,o={x:p.x/R,y:p.y/R,z:p.z/R};
   const sy=Math.tan(fr.fovy/2),sx=sy*(fr.aspectRatio||w/h);
   for(let j=0;j<fh;j++){const v=(1-2*(j+.5)/fh)*sy;for(let i=0;i<fw;i++){const q=(2*(i+.5)/fw-1)*sx;
    const ray={x:d.x+q*r.x+v*u.x,y:d.y+q*r.y+v*u.y,z:d.z+q*r.z+v*u.z};const hit=intersect(o,ray);if(!hit)continue;
    const [x,y]=uv(hit,tw,th),k=(y*tw+x)*4,n=(j*fw+i)*4;
    out[n]=tex[k];out[n+1]=tex[k+1];out[n+2]=tex[k+2];out[n+3]=255;
   }}
   fc.putImageData(pix,0,0);
   const dpi=Math.min(1.5,window.devicePixelRatio||1),cw=Math.round(w*dpi),ch=Math.round(h*dpi);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
   ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,w,h);ctx.drawImage(frame,0,0,w,h);
   // Native pins remain the pick targets. Redraw just the visible pins above the software disk.
   if(pin.complete&&pin.naturalWidth&&C.SceneTransforms?.worldToWindowCoordinates){for(const e of markers.values()){
    if(!e.show||!e.billboard.show.getValue(viewer.clock.currentTime))continue;
    const pos=e.position.getValue(viewer.clock.currentTime),xy=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,pos);if(!xy)continue;
    const scale=e.billboard.scale?.getValue?.(viewer.clock.currentTime)||1;ctx.drawImage(pin,xy.x-15*scale,xy.y-40*scale,30*scale,40*scale);
   }}
   canvas.hidden=false;shown=true;return true;
  }
  return {draw,hide};
 }
 window.SKY_SURFER_MOBILE_WORLD={create,intersect,uv};
})();
