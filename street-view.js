/* Google-only Street Viewer. Prefer Google's generated iframe URL or documented Embed API.
   A normal Street View share URL may be converted to an experimental pb URL;
   pb is not a public API and contributed panoramas may require Google's original embed code. */
(()=>{'use strict';
 const origin='https://www.google.com';
 function googleURL(value){try{const u=new URL(value);return u.origin===origin&&u.pathname.startsWith('/maps/')?u:null;}catch(_){return null;}}
 function sharedEmbed(value){
  if(typeof value!=='string')return '';
  const src=value.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2]||value.trim();
  const u=googleURL(src.replace(/&amp;/g,'&'));
  return u&&u.pathname==='/maps/embed'&&u.searchParams.get('pb')?u.href:'';
 }
 function parseShare(value){
  if(typeof value!=='string')return null;
  const u=googleURL(value.trim());if(!u)return null;
  const p=u.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),3a,(\d+(?:\.\d+)?)y,(-?\d+(?:\.\d+)?)h,(-?\d+(?:\.\d+)?)t/);
  const id=u.pathname.match(/!1s([A-Za-z0-9_-]{10,200})!2e(0|10)(?:!|$)/);
  if(!p||!id)return null;
  const [,lat,lng,fov,heading,tilt]=p.map(Number);
  if(Math.abs(lat)>90||Math.abs(lng)>180||fov<=0||fov>180||tilt<0||tilt>180)return null;
  return {url:u.href,lat,lng,pano:id[1],kind:id[2],heading:Number((((heading%360)+360)%360).toFixed(6)),pitch:Number((90-tilt).toFixed(6)),fov};
 }
 function trialEmbed(p){
  // This is a best-effort adaptation of the Google Share > Embed pb format, not a verified Google-generated URL.
  return origin+'/maps/embed?pb=!4v1!6m8!1m7!1s'+encodeURIComponent(p.pano)+'!2m2!1d'+p.lat+'!2d'+p.lng+'!3f'+p.heading+'!4f'+p.pitch+'!5f0.7820865974627469';
 }
 function urls(place,config={}){
  if(!place||!Number.isFinite(place.lat)||!Number.isFinite(place.lng)||Math.abs(place.lat)>90||Math.abs(place.lng)>180)return {embed:'',external:'',trial:false};
  const coords=`${place.lat},${place.lng}`,p=parseShare(config.shareLinks?.[place.id]);
  const external=p?.url||origin+'/maps/@?api=1&map_action=pano&viewpoint='+encodeURIComponent(coords);
  let embed=sharedEmbed(config.panoramas?.[place.id]),trial=false;
  const key=typeof config.googleMapsEmbedKey==='string'?config.googleMapsEmbedKey.trim():'';
  if(!embed&&key){const params=new URLSearchParams({key,location:p?`${p.lat},${p.lng}`:coords});if(p){params.set('heading',p.heading);params.set('pitch',p.pitch);params.set('fov',p.fov);params.set('pano',p.pano);}embed=origin+'/maps/embed/v1/streetview?'+params.toString();}
  if(!embed&&p&&config.allowTrialShareConversion===true){embed=trialEmbed(p);trial=true;}
  return {embed,external,trial};
 }
 window.SKY_SURFER_STREET_VIEW={urls,parseShare,sharedEmbed};
})();
