/* Sky Surfer / God's Eye View native bridge (add inside upstream's Cesium adapter).
 * Original GEV source remains upstream and MIT-licensed. This is an independent integration.
 */
import * as Cesium from 'cesium';
import { cesiumViewerOf } from './viewers.js';

const PREFIX = 'sky-surfer:';
function validPoint(raw) {
  if (!raw || typeof raw.id !== 'string' || !raw.id || raw.id.length > 130) return null;
  const lat=Number(raw.lat), lng=Number(raw.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
  return {id:raw.id,name:String(raw.name||'Marian apparition').slice(0,180),lat,lng};
}
export function installSkySurferBridge(application){
  if(window.parent===window || !new URL(location.href).searchParams.has('sky-surfer'))return;
  let origin;
  try {origin=new URL(document.referrer).origin;}catch{return;}
  if(!origin || origin==='null')return;
  let viewer=null,handler=null;
  const entities=new Map();
  const positions=new Map();
  let selectedId=null;
  const notify=(type,detail={})=>window.parent.postMessage({type,...detail},origin);
  function renderPoints(points) {
    if(!viewer) return;
    const incoming=new Map(points.filter(Boolean).map(p=>[p.id,p]));
    for(const [id,entity] of entities){if(!incoming.has(id)){viewer.entities.remove(entity);entities.delete(id);positions.delete(id);}}
    for(const point of incoming.values()){
      positions.set(point.id,point);
      if(entities.has(point.id))continue;
      const entity=viewer.entities.add({
        id: PREFIX+point.id,
        name:point.name,
        position:Cesium.Cartesian3.fromDegrees(point.lng,point.lat,10),
        billboard:{
          image:'/sky-surfer-marian-pin.svg',width:30,height:39,
          verticalOrigin:Cesium.VerticalOrigin.BOTTOM,
          heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance:Number.POSITIVE_INFINITY,
          scaleByDistance:new Cesium.NearFarScalar(250,1.15,12e6,0.6)
        },
        label:{
          text:point.name,showBackground:true,
          font:'12px sans-serif',style:Cesium.LabelStyle.FILL,
          fillColor:Cesium.Color.fromCssColorString('#f9e8cd'),
          backgroundColor:Cesium.Color.fromCssColorString('#0a1e2b').withAlpha(.87),
          pixelOffset:new Cesium.Cartesian2(0,-51),
          distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,220000),
          disableDepthTestDistance:Number.POSITIVE_INFINITY
        }
      });
      entities.set(point.id,entity);
    }
    viewer.scene.requestRender();
  }
  function fly(p,near=true){
    if(!viewer || !p)return;
    selectedId=p.id;
    const reduce=window.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches;
    const duration=reduce?0:3.5;
    const target=Cesium.Cartesian3.fromDegrees(p.lng,p.lat,near?3100:1600000);
    const look={heading:Cesium.Math.toRadians(12),pitch:Cesium.Math.toRadians(-56),roll:0};
    if(reduce){viewer.camera.setView({destination:target,orientation:look});}
    else viewer.camera.flyTo({destination:target,orientation:look,duration,easingFunction:Cesium.EasingFunction.QUADRATIC_IN_OUT});
  }
  function onMessage(evt){
    if(evt.origin!==origin || evt.source!==window.parent)return;
    const data=evt.data;
    if(!data||typeof data!=='object'||typeof data.type!=='string')return;
    if(data.type==='sky-surfer:markers'){
      const points=Array.isArray(data.locations) ? data.locations.slice(0,500).map(validPoint) : [];
      renderPoints(points);
    }else if(data.type==='sky-surfer:fly'){
      const point=validPoint(data);
      if(point)fly(point);
    }else if(data.type==='sky-surfer:reset'){
      viewer?.camera.flyHome(2);
    }else if(data.type==='sky-surfer:zoom'){
      if(!viewer)return;
      const height=viewer.camera.positionCartographic.height;
      const amt=Math.min(3e6,Math.max(80,height*.35));
      if(data.direction>0)viewer.camera.zoomIn(amt);
      else viewer.camera.zoomOut(amt);
      viewer.scene.requestRender();
    }else if(data.type==='sky-surfer:resize'){
      viewer?.resize();
    }
  }
  window.addEventListener('message',onMessage);
  application.subscribe(state=>{
    if(state.status!=='ready' || viewer)return;
    try{
      viewer=cesiumViewerOf(application.getComponents().scene.renderer);
      if(!viewer)throw new Error('Original Cesium renderer is not ready');
      handler=new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction(evt=>{
        const picked=viewer.scene.pick(evt.position);
        const id=picked?.id?.id;
        if(typeof id==='string' && id.startsWith(PREFIX))notify('sky-surfer:select',{id:id.slice(PREFIX.length)});
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      notify('sky-surfer:ready');
    }catch(err){notify('sky-surfer:error',{message:String(err?.message||err).slice(0,180)});}
  });
}
