const assert=require('assert'),fs=require('fs'),vm=require('vm');
const context={window:{},URL,URLSearchParams};vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/street-view.js','utf8'),context);
const urls=context.window.SKY_SURFER_STREET_VIEW.urls;
const p={id:'lourdes',lat:43.097,lng:-0.058};
assert.equal(urls(p).embed,'');assert(urls(p).external.includes('map_action=pano'));
const keyed=new URL(urls(p,{googleMapsEmbedKey:'example-key'}).embed);assert.equal(keyed.pathname,'/maps/embed/v1/streetview');assert.equal(keyed.searchParams.get('location'),'43.097,-0.058');assert.equal(keyed.searchParams.get('key'),'example-key');
const shared='https://www.google.com/maps/embed?pb=example';assert.equal(urls(p,{googleMapsEmbedKey:'example-key',panoramas:{lourdes:shared}}).embed,shared);
assert.equal(urls(p,{panoramas:{lourdes:'https://www.google.com.evil.test/maps/embed?pb=example'}}).embed,'');assert.equal(urls({lat:200,lng:0}).embed,'');
const html=fs.readFileSync(__dirname+'/index.html','utf8');assert(html.includes('>IMAGE VIEWER</button>'));assert(html.includes('>STREET VIEWER</button>'));assert(!html.includes('IMAGE & PDF VIEWER'));
const js=fs.readFileSync(__dirname+'/cesium-integrated.js','utf8');assert(js.includes('viewer.scene.sun.show=true'));assert(js.includes('viewer.scene.moon.show=true'));
console.log('PASS: viewer tabs, official coordinate-based embed URL, optional shared panorama, keyless fallback, URL validation, Sun and Moon enabled.');
const config={window:{}};vm.createContext(config);vm.runInContext(fs.readFileSync(__dirname+'/street-view-config.js','utf8'),config);
const c=config.window.SKY_SURFER_STREET_VIEW_CONFIG;const l={id:'mymaps-our-lady-of-lourdes',lat:43.097,lng:-0.058};
const official=urls(l,c);assert(!official.trial);assert.equal(official.embed,'https://www.google.com/maps/embed?pb=!4v1795738700858!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJQ0UzT1NDbXdF!2m2!1d43.09752947384609!2d-0.05851616828101665!3f325.4316946817612!4f0.013044887587255971!5f0.4000000000000002');assert(official.external.includes('43.0975295,-0.0585162'));assert.equal(c.allowTrialShareConversion,false);
assert.equal(urls(l,{...c,googleMapsEmbedKey:'example-key'}).embed,official.embed);
assert.equal(urls(l,{...c,panoramas:{[l.id]:'<iframe src="https://www.google.com/maps/embed?pb=verified"></iframe>'}}).embed,'https://www.google.com/maps/embed?pb=verified');assert(!html.includes('street-photo-fallback'));assert(!html.includes('KartaView'));assert(!fs.existsSync(__dirname+'/street-photo-fallback.js'));
const site={window:{}};vm.createContext(site);vm.runInContext(fs.readFileSync(__dirname+'/site-data.js','utf8'),site);
assert.equal(site.window.SKY_SURFER_DATA.locations.length,3);
const addedEmbeds={"mymaps-our-lady-of-fatima": "https://www.google.com/maps/embed?pb=!4v1795737455955!6m8!1m7!1sCAoSFkNJSE0wb2dLRUlDQWdJRDRfUHU4SlE.!2m2!1d39.63166400815706!2d-8.673331033344116!3f17.756852490181416!4f1.8278612642870797!5f0.4000000000000002", "mymaps-our-lady-of-guadalupe": "https://www.google.com/maps/embed?pb=!4v1795738792651!6m8!1m7!1sCAoSFkNJSE0wb2dLRUlDQWdJQ2M4ZXFJUkE.!2m2!1d19.48626802949736!2d-99.1159299058451!3f359.6049949067248!4f2.3851084392022273!5f0.5194893952558471"};
for(const loc of site.window.SKY_SURFER_DATA.locations.filter(x=>x.id!==l.id)){
 const u=urls(loc,c);assert.equal(u.embed,addedEmbeds[loc.id]);assert(!u.trial);assert.equal(new URL(u.external).searchParams.get('viewpoint'),`${loc.lat},${loc.lng}`);
 assert.equal(urls(loc,{...c,googleMapsEmbedKey:'example-key'}).embed,u.embed);
}
assert.equal(c.googleMapsEmbedKey,'');assert.equal(Object.keys(c.panoramas).length,3);
console.log('PASS: all three exact original Google embeds without API key, original embed precedence, coordinate fallback, no KartaView.');
const share=context.window.SKY_SURFER_STREET_VIEW.parseShare(c.shareLinks[l.id]);assert.equal(share.heading,322.58);assert.equal(share.pitch,-11.47);assert.equal(share.fov,63.8);assert.equal(share.pano,'CIHM0ogKEICAgICE3OSCmwE');
const exact=new URL(urls(l,{...c,panoramas:{},googleMapsEmbedKey:'example-key'}).embed);assert.equal(exact.searchParams.get('pano'),share.pano);assert.equal(exact.searchParams.get('fov'),'63.8');
assert(html.includes('id="streetFullscreen"'));assert(html.includes('id="streetReload"'));assert(html.includes('allow="accelerometer https://www.google.com; gyroscope https://www.google.com; magnetometer https://www.google.com; fullscreen \'none\'"'));const app=fs.readFileSync(__dirname+'/app.js','utf8');assert(app.includes("openMediaOverlay('street')"));assert(app.includes("moveStreet(streetHome,streetHomeNext)"));console.log('PASS: latest Lourdes heading/pitch/FOV, exact panorama ID, app-owned Street Viewer fullscreen, nested native fullscreen disabled.');
