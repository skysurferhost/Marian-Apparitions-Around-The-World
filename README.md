# Sky Surfer Marian Apparitions Map — v1.90

Production-format project with two modes: **Marian Apparitions Map** (Satellite / Street Map) and **3D Globe** (CesiumJS). The previous Standard 3D Globe is removed.

## Open locally

Extract the complete ZIP. Run `START_LOCAL_WINDOWS.bat` (Python 3 required), or `START_3D_GLOBE_WINDOWS.bat` to open the globe directly. Both now open the 3D Globe by default and start a local HTTP server; keep its window open. Internet access is required for remote imagery, map libraries, vector tiles and photogrammetry. `INSTALL_CESIUM_WINDOWS.bat` optionally downloads a local copy of CesiumJS. The map is not an offline imagery archive.

## Publish

Upload all extracted files and folders to the existing GitHub Pages repository. Remove obsolete files from earlier versions if replacing the repository in place (the retired globe texture/script, old test launcher and old Earth illustrations are no longer referenced). Keep the whole `assets/cesium-base` directory, media, flags, configuration and `.github` workflow. The entry point is `index.html`; both modes are available there. The 3D Globe is the default on desktop and mobile. Existing `?view=cesium` or `?view=globe` links still open it; `?view=map` or `?view=satellite` explicitly opens the Marian Apparitions Map. Refresh the embedded page; the visible version stamp has been removed.

## v1.80 globe refinements

- Keyboard travel multiplier increased from 0.72 to 0.82, and angular speed cap from 0.70 to 0.80 rad/s (about 14% faster at ordinary heights and at world scale).
- Native Cesium photomesh begins earlier (36 km desktop, 30 km mobile), opens immediately when the camera center is within coverage, and retains nearby meshes longer. The moving request cull multiplier is slightly reduced (desktop 16, mobile 24), coarse-first priority uses a 0.25 height fraction, and peripheral delay is 15/25 ms. Final detail targets, memory budgets, provider catalog and mobile Earth renderer remain unchanged. These are configuration changes, not a measured live loading speed. The flat map renderer is unchanged.

- Hold WASD or arrow keys to move over the globe relative to the camera heading; speed scales with altitude. Typing, PDF/directory dialogs and other map mode are excluded.
- Camera-relative daylight uses an upper-left virtual sun (55° off-axis at world scale) to produce a lower-right twilight crescent like the supplied reference. Desktop uses Cesium’s native directional light and atmosphere; mobile uses the same direction with a smooth software shading curve that fades before the close-up handoff. This is an exploration lighting effect, not real-time day/night or a new cloud layer. The exact contrast differs between native and software renderers.
- Removed visible version/mode overlay and globe diagnostics; required attribution remains. Internal compatibility and logging hooks remain for regression checks.

## Map improvements

- Shared `regional-imagery.js` catalog with 41 default regional configurations and optional user-owned keys. Map zoom limit 22; native image detail is still determined by provider source resolution. Geographic WMS imagery is reprojected into Web Mercator in the flat map. Missing or blank regional tiles leave the EOX base visible. Local OpenAerialMap discovery is limited to explicitly eligible licenses and bounded session caching.
- One cube switch controls 3D geometry in both map modes and the globe. Its preference survives mode changes and reset during the page session; it does not move the camera. Street Map uses white extrusions. Satellite uses mapped/estimated natural colors and aerial-sampled roof colors when readable. Both use the same z14 decoded OpenFreeMap footprints, heights, minimum heights, courtyard geometry and palette. Native rendering and footprint clipping differ between engines, so pixel-perfect visual equality is not guaranteed.
- Satellite and globe use the same nine textured 3D Tiles roots (plus expressly licensed custom configuration), with simplified buildings elsewhere. The flat map lazily loads deck.gl 9.1.14 using MapboxOverlay/Tile3DLayer; if it cannot load, simplified geometry and imagery remain available. The flat map mesh rendering is a new integration; live CORS, GPU rendering and visual alignment need verification. Street Map intentionally uses white simplified extrusions, not textured meshes.
- The v1.75 software-rendered mobile distant Earth and geographic label fade are retained.
- Removed the obsolete Google My Maps status footer and retired globe credits; retain required attribution to the sources actually used. The map's native compact attribution and globe's information control remain accessible.

## Update your locations

Keep the existing `google-my-maps.kml`, `bindings.json`, `geography.json` and the PDF/image files under `media/`. These are content inputs; the KML is not displayed as a status message. `UPDATE_GLOBE_WINDOWS.bat` regenerates the location and preview data. The GitHub Actions workflow performs the same update on deployment. The existing project content is preserved, including its currently supplied locations and PDFs; this release does not invent new shrine records.

## Release verification

JavaScript syntax and eight regression suites were checked, including camera-relative daylight, default view selection, keyboard navigation, provider selection, geometry switching, and credit cleanup. Network access from the build container is unavailable, so real remote raster/mesh delivery, CDN availability, GPU rendering, browser performance and the Android device are not certified by these checks.

Before publishing to all visitors: test Lourdes in Satellite (close zoom, cube on/off) and Street Map (white buildings), Helsinki in Satellite and 3D Globe (textured meshes), and the phone's zoomed-out Earth, rotation, reset, label fade and PDF drawer. If the new flat-map mesh service is inaccessible, fallback geometry should remain usable. See `IMAGERY-LICENSING.md`, `IMAGERY-SOURCES.md` and `PHOTOMESH-SOURCES.md` for source and rights notes. No paid API keys are included.

## v1.81 — Image / Street Viewer and sky objects

IMAGE VIEWER and STREET VIEWER share the apparition panel. The PDF viewer retains its page and zoom when switching back. The street iframe is unloaded when closing the panel or changing location.

To enable embedded Google Street View for all locations:
1. Enable Maps Embed API in a billing-enabled Google Cloud project. The Embed API itself is free with unlimited requests under Google's published terms.
2. Create a public browser key restricted to Maps Embed API and your website HTTP referrers (e.g. your GitHub Pages origin; add localhost for local testing).
3. In `street-view-config.js`, set `googleMapsEmbedKey` to that key. Never use private server credentials in this public static site.
4. Alternatively, use Google Maps' own Street View Share / Embed action, where offered, and paste the generated iframe `src` URL into the `panoramas` object by apparition ID. These URLs override the key-based location lookup.

No API key or verified share panorama URL is included. See the v1.83 notes below for the supplied Lourdes trial. Panorama coverage depends on Google.
See https://developers.google.com/maps/documentation/embed/embedding-map and https://developers.google.com/maps/documentation/embed/get-api-key.

Cesium's native Sun and Moon are enabled again. They use astronomical positions and may not always be within the camera field of view. Camera-relative globe illumination and close-up daylight remain unchanged.

## v1.82 — Lightweight planetary background

Seven planetary sky directions follow approximate JPL Keplerian elements (1800–2050) in Earth-fixed coordinates. Planet sprites have illustrative colors, approximate signed rotation periods and enhanced visibility, not exact planetary textures, ring geometry, scale or navigable orbits. Recomputed once per minute, only projected at distant Earth views; no extra texture downloads. Cesium Sun/Moon retained.

## v1.83 — Google-only Street Viewer

KartaView is removed. The Street Viewer only uses Google: a genuine Google Share / Embed iframe or the documented Maps Embed API. The iframe is created on demand when the tab is selected and unloaded on close or return to Image Viewer. The globe and planetary renderer are unchanged.

The supplied Lourdes URL has been included as an experimental conversion to the Google embed player format (not a verified Google-generated iframe). Its contributed photosphere may not load; the original viewpoint remains available via the Google link. No live Google rendering was verified here. Fátima and Guadalupe have external Street View links until their Google-generated embed codes or a restricted API key are provided.

For reliable no-key embeds, open the exact panorama in desktop Google Maps, select the three-dot menu, Share or embed image, Embed a map, and Copy HTML. Paste its iframe src (or full iframe markup as a quoted JavaScript string) into the corresponding ID in `street-view-config.js`. Google-generated embeds take priority over the trial. You can disable the trial via `allowTrialShareConversion: false`. The visitor does not have to leave the site unless choosing the fallback link.

References: https://support.google.com/maps/answer/7101463 and https://developers.google.com/maps/documentation/embed/embedding-map. The experimental pb parameter is undocumented and may change.

## v1.84 — Street Viewer expansion and Lourdes update

The latest Lourdes share link is configured (same contributed panorama ID, new heading 322.58°, pitch −11.47°, and 63.8° field of view in the documented API). The existing experimental keyless conversion is still unverified; a black Google frame can mean the contributed panorama cannot be loaded using the reconstructed embed. Use Google's Share or embed image → Embed a map → Copy HTML and place the exact iframe in `street-view-config.js` under `panoramas` for a reliable configuration. A Reload control and the original Google link are available. Google-only; no replacement photography.

Street Viewer now expands within the same in-app overlay as the PDF viewer. The iframe has no native fullscreen permission to avoid competing with whole-app fullscreen. A close control remains outside the iframe. Modern browsers preserve the iframe context using `moveBefore`; older browsers may reload the original panorama when moving the frame. Desktop, portrait and landscape share the same overlay. No globe or planetary rendering changes.


## v1.86 — All three Google-generated Street View embeds

Lourdes, Fátima and Guadalupe now use the exact original Google Share → Embed iframe URLs supplied by the site owner. No API key or billing account is required for these embeds. Original panorama IDs and camera parameters are preserved. The optional API configuration remains empty and experimental URL conversion remains disabled. Existing in-app fullscreen, reload, external fallback and lazy loading remain unchanged. Add future original iframe src URLs to the panoramas object in `street-view-config.js`. Live Google panorama rendering is not verified in this environment.

## v1.87 — Street Viewer motion controls

The Google iframe now delegates accelerometer, gyroscope and magnetometer access only to https://www.google.com. Native child fullscreen is still disabled; use the app's existing FULLSCREEN button. The three original panorama URLs, no-key configuration and globe renderer are unchanged.

When embedding the map in Squarespace, the outer iframe must also delegate these permissions to the hosted project and Google. Add the following attribute to the existing outer iframe (merge with its existing `allow` attribute, and keep its original `src`, dimensions and styles):

```html
allow="accelerometer 'src' https://www.google.com; gyroscope 'src' https://www.google.com; magnetometer 'src' https://www.google.com; fullscreen 'src'"
```

Retain the outer iframe's existing `allowfullscreen` attribute if present. Every ancestor iframe and response Permissions-Policy must permit sensor delegation. Use HTTPS. If motion tracking still fails, compare the direct GitHub Pages project URL with the Squarespace embed, and check the phone browser's motion sensor site permission. Browser/device and Google viewer restrictions may still prevent this feature; granting permission does not force the viewer to use sensors. Manual drag remains available. No live device motion test was performed. Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy

## v1.88 — Lourdes Street Viewer viewpoint

Replaced the Lourdes Google-generated embed URL with the updated original supplied by the site owner (heading 325.4316946817612°, pitch 0.013044887587255971°, original Google zoom parameter 0.4000000000000002). Fátima, Guadalupe, existing external fallback links, motion sensor permissions, and all other functionality are unchanged.

## v1.89 — Lourdes and Guadalupe Street Viewer viewpoints

Verified that the supplied Lourdes embed matches v1.88 exactly. Replaced Guadalupe with the original Google-generated embed supplied by the site owner (heading 359.6049949067248°, pitch 2.3851084392022273°, original Google zoom parameter 0.5194893952558471). Fátima and all other functionality remain unchanged.

## v1.90 — Street Map default

The 3D Globe remains the default website view. Entering Marian Apparitions Map selects Street Map (white 3D buildings if enabled); the Satellite tab is still selectable. Reset in the flat map returns to Street Map. The explicit `?view=satellite` URL still opens Satellite. If the street style cannot load, Satellite is used as a fallback. Existing Street View embeds, sensor permissions and all other features remain unchanged.
