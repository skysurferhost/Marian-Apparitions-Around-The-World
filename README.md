## v1.72 test — quicker progressive streaming, mobile world and compact credits

- On coarse-pointer/narrow phone views, an independent Canvas2D perspective renderer uses the bundled NASA Blue Marble JPEG at distant Earth scale (enters above 8,000 km, exits below 6,500 km). It follows the actual Cesium camera and redraws visible pins; the native canvas remains the interaction/pick target. Close-up imagery and photomesh remain native Cesium. This is a workaround for black world-scale WebGL imagery, not a diagnosis of the Android GPU. The initial fallback texture loads from the local project, without a new provider.
- Photomesh roots may begin at 20 km (previously 12 km); a candidate stable for 160 ms can start during movement. Enable native flight destination preloading, central tile prioritization and a 0.1 s peripheral refinement delay; preserve settled detail and original photo textures. Desktop terrain cache 420 and desktop mesh cache 256 MiB; mobile terrain cache 100 and mesh cache 80 MiB. Optional local imagery and new footprint requests yield until a supported mesh starts rendering. No bulk downloads or provider changes.
- The native Cesium credits expand control is styled as an information icon, with smaller logo. NASA, EOX, OpenStreetMap and qualifying open imagery credits use the native lightbox; active photomesh provider credit is added to that lightbox when supported. Other provider-specific credits may remain visible, especially Australian third-party data. Keep all attribution accessible. The original map and Standard Globe controls are preserved.
- Browser test: Chromium Canvas2D with the actual NASA JPEG bytes embedded in an isolated test harness (local HTTP browsing was blocked in this environment). Perspective ray/UV, nonblack rendering, rotation and exit passed. The full integrated live Cesium browser, Android device and actual remote download speed were not verified. Verify the version label v1.72 TEST on the deployed site, then zoom out, rotate, Reset, zoom back in, inspect credits, and test Helsinki in both orientations.

## v1.71 test — mobile black Earth mitigation

Replaced the single large global texture with 170 bundled 256×256 geographic JPEG tiles (levels 0–3, 2×1 level-zero grid); the two root tiles are also embedded directly in the Cesium integration script. NASA imagery is installed before remote overlays. At world scale phones display the bundled imagery only; EOX returns below 8,000 km altitude and geographic labels below 4,500 km. Desktop behavior is unchanged apart from the new tiled base. Mobile uses browser-recommended resolution, no HDR, single-sample antialiasing, no ground atmosphere, a smaller terrain tile cache and fewer simultaneous regional layers. Credits remain visible in a compact format.

If the globe is still black, open **Cesium diagnostics → Use compatibility imagery**. This isolates the bundled base by disabling remote imagery, geographic labels and 3D building/mesh layers; press Restore full imagery to resume. The original map and Standard 3D Globe are not modified. On the hosted site, deploy all files and the entire assets/cesium-base directory; refresh the browser, verify v1.71 TEST, and try Cesium, zoom, marker selection, Reset, portrait and landscape. If black persists, copy diagnostics and test the Standard 3D Globe. The exact underlying Android WebGL failure is not confirmed; live rendering on the phone and Squarespace embedding were not tested. The site-level Squarespace header overlap is outside the ZIP and has not been changed.

## v1.70 test — natural building colors in Cesium

Fallback OSM buildings now use separately colored walls and roofs. OpenMapTiles `colour` (and roof tags if supplied) takes priority; otherwise stable muted palettes are used. Where eligible regional aerial imagery is already downloaded at z17+, roof interiors are sampled from a bounded in-memory cache (112 × 128 × 128 RGBA pixels, approximately 7 MiB). Transparent/no-data, dark and green samples are rejected; roof sampling avoids polygon holes. No additional imagery downloads or permanent tile storage. Australian imagery with third-party terms is not used for sampling. Existing photomesh textures, fixed marker coordinates, camera controls, and imagery layers remain unchanged.

Test Lourdes in overhead and tilted views. Allow existing imagery tiles to refine; sampled roof colors may refine in batches once the camera settles. Real facade textures and roof geometry require actual photogrammetry. The colors are estimates, not a photographic 3D reconstruction. No new mesh locations were added. The Open Heritage 3D Lourdes Grotto dataset (https://openheritage3d.org/project.php?id=9qbf-bq75) is noncommercial share-alike, non-georeferenced terrestrial LiDAR, not a ready-to-stream city tileset, so it is not bundled.

Run `node regression-cesium-building-colors.cjs` in addition to the other regression scripts. Synthetic tests pass; live aerial pixel sampling, GPU rendering, color appearance and performance have not been verified in a browser.

## v1.69 test — geographically anchored Cesium markers

- Cesium pins retain their stored longitude/latitude on the existing ellipsoid and no longer clamp to streamed roofs or other 3D Tiles surfaces. The pin tip stays anchored, with a constant screen-facing size. Nearby 3D buildings do not hide the pins; a per-frame ellipsoid horizon check prevents pins showing through the far side of Earth.
- All marker IDs, click/tap handlers, selected scale, camera controls, imagery and 3D Tiles sources remain unchanged. No new controls. The Standard 3D Globe and MapLibre map are unchanged apart from the displayed version.
- The linked Cesium 3D Tiles Feature Styling demo concerns feature-level color and visibility; it is not a geographic anchoring mechanism. Native textured photomeshes remain unstyled to preserve their photographs. No new mesh coverage was added.
- Test Lourdes: select, zoom closely, rotate and tilt in several directions; the tip should stay on the stored coordinate. Test the back of Earth, marker click, Reset and mode switching. Actual browser/GPU appearance is not verified. The current terrain is an ellipsoid; true elevated photomesh terrain may have vertical parallax relative to an ellipsoid-based pin.

## v1.68 test — native photorealistic 3D Tiles and simplified controls

Removed the Cesium cube button (right-drag or middle-drag to tilt/rotate, left-drag to pan, wheel to zoom, touch pinch gestures remain). Nine regional photogrammetry root configurations use the CesiumJS native `Cesium3DTileset.fromUrl` loader. These are Helsinki, Finland, and Aurillac, Bourgoin-Jallieu, Clermont-Ferrand, Gex, Issoire, Le Puy-en-Velay, Saint-Étienne and Voiron, France. No key, Google Maps service or Cesium ion subscription is included. Automatically request a matching source when the camera settles below 12 km; remove it outside the region or above 17 km. One current source, adaptive screen-space error and bounded target GPU cache, collision enabled, provider credits displayed. OSM extrusions remain while loading and outside centered mesh coverage; suppress them for centered covered views after mesh tiles are visible. Aerial layers remain in place. Geographic labels remain on the underlying Earth imagery and may be obscured by actual 3D mesh surfaces. Regional footprints are approximate bounds, not guaranteed complete mesh coverage. Optional user-owned or licensed georeferenced 3D Tiles can be added in `photomesh-config.js`. See PHOTOMESH-SOURCES.md. Live CORS, payload delivery, rendering, mesh alignment, marker visibility and performance remain unverified.

## v1.67 test — Standard 3D Globe mouse navigation

Cesium-only native camera bindings now use left drag for globe panning, right drag for orbit/tilt, and the wheel for zoom. Middle drag and Ctrl+left drag also tilt; touch pinch remains supported. Right drag no longer zooms. The camera tilt is capped at 80 degrees from overhead, with reduced spin and zoom inertia. All imagery, labels, buildings and existing map modes remain unchanged. Actual mouse feel and live GPU rendering still need browser verification.

## v1.66 test — refined Cesium cartography, faster refinement and 3D perspective

Smaller and less dense geographic labels, thinner linework, earlier regional imagery activation, 120 ms region checks, 320/140 desktop/mobile terrain-tile cache and 180 ms motion settle interval. New Cesium-only cube control toggles between overhead and angled views. The existing OpenFreeMap vector source supplies on-demand OSM building footprints and approximate heights, extruded as neutral 3D geometry at close zoom; no ion account or paid data required. The 41 regional configurations and global fallback remain unchanged. Building coverage, height accuracy, actual tile speed, live GPU rendering and service availability require real browser testing. See CESIUM-TEST.md.

## v1.65 test — Cesium worldwide geographic labels and additional aerial imagery

Adds transparent OpenFreeMap / OpenStreetMap cartography on top of all Cesium imagery, with zoom-dependent country, administrative region, settlement, road and selected landmark labels. Includes four additional regional imagery configurations in Slovenia, Iceland and Australia. Retains v1.64 progressive loading, permanent Blue Marble fallback, automatic imagery selection and reset. See CESIUM-TEST.md and IMAGERY-SOURCES-v1.65.md. Live imagery and label rendering remain unverified.

## v1.64 test — faster progressive Cesium imagery loading

Progressive detail, faster regional checks, larger tile cache, and cached local catalog searches; automatic national/regional sources and explicitly licensed OpenAerialMap imagery discovery; permanent bundled Blue Marble base; immediate camera reset. See CESIUM-TEST.md and IMAGERY-SOURCES-v1.64.md. Live imagery and rendering remain unverified.

## v1.62 — Cesium startup correction

Fixed a JavaScript temporal-dead-zone error in automatic regional imagery selection (a local variable shadowed the globe activation state). Startup now proceeds to the underlying Blue Marble layer and regional update timer. No imagery providers or original map features were changed. Live GPU rendering remains unverified.

## v1.62 test — Cesium integrated into index.html

The third map button now switches the in-page Cesium view, rather than opening a separate page. Both launchers open index.html; the Cesium launcher selects the experimental tab automatically. Existing imagery, data and PDFs are preserved. See CESIUM-TEST.md.

# v1.56 stable restoration

Restored the v1.53 stable baseline. The v1.54/v1.55 experimental imagery controls, generator, and integrations are not included. Only release/version references have changed.

# v1.53 minor label refinements

- The map tab now reads **3D Globe** (capital G).
- Removed the eyebrow above the Marian Apparitions Directory title in both browsing modes.
- All other v1.52 behaviors and assets are unchanged.

## v1.52 — Simplified search control and map tabs

- Replaced the top-bar **Search Apparitions** list icon with a clear magnifying-glass icon, preserving its label and the directory interaction.
- Added a subtle country flag immediately underneath each sidebar apparition number (01, 02, etc.) in Country and Timeline modes, using the bundled flag images.
- Removed the redundant **Live Google Map** embedded view and tab. The two views are now **Marian Apparitions Map** (Satellite / Street Map) and **3D Globe**.
- Map imagery failure guidance now offers the retained 3D Globe as an alternative rather than pointing to a removed tab.
- Preserved the source Google My Maps KML file, Street View links, apparition data, map pins, PDF viewer, the new crowned-Mary header icon, and all Country/Timeline features from v1.51.
- Cache-busted the CSS and JavaScript references so mobile browsers load the matching release assets.

## v1.51 — Marian header emblem

- Replaced only the small top-left four-point diamond with the user-selected depiction of Our Lady wearing a crown and standing over a partial globe, surrounded by 12 stars. The emblem has been cropped and optimized as a transparent PNG for the circular desktop/phone header icon.
- Kept **MARIAN APPARITIONS** beside the icon and the same link to `https://www.sky-surfer.com/marian-apparitions`.
- Kept all maps, search controls, timelines, viewer/PDFs, existing markers, and other interactions unchanged from v1.50.
- Cache-busted the header image and stylesheet to prevent older branding persisting after publication.

## v1.50 — Unified Country / Timeline controls

- Replaced the **All apparitions / With media** sidebar filters with synchronized **Country / Timeline** browse choices. The sidebar now lists all matching apparitions in country A–Z order or earliest-to-latest year order (undated records last), while preserving search and marker selection.
- Changed the popup directory label from **By Country** to **Country** and added clear globe/calendar icons to both pairs of equal-width buttons. Desktop and phone use the same gold-and-navy styling with generous touch targets.
- Added versioned stylesheet and app-script URLs (`?v=1.50`) so mobile browsers do not reuse incompatible cached v1.48/v1.49 assets after GitHub Pages updates.
- Original view modes, source data, 22px country group spacing, documents, and mobile PDF drawer unchanged.

## v1.49 — Phone world view and chronological browsing

- On phones only, the Marian Apparitions Map initially opens at MapLibre's minimum supported zoom (`0`) and its reset button returns to that same wide view. Desktop camera settings are unchanged. Marker selection still flies to the selected location.
- Within Search Apparitions, choose **By Country** (original A–Z grouped directory) or **Timeline** (oldest-to-newest apparition years). The timeline uses only the years supplied in the apparition data, and undated records are placed last.
- Existing country-group separation from v1.48 (+22px) is preserved, as are all three map views, the PDF viewer, markers, and mobile drawer.

## v1.48 — Balanced directory country spacing

Added 22px of extra vertical separation between consecutive country groups in the Marian Apparitions Directory. Country headings, flags, listing appearance, map, viewer, and all other functionality are unchanged from v1.47.

## v1.47 — Restore v1.36-style satellite map boundaries

Removed only the extra gold country-border overlays introduced in v1.44. Satellite map boundaries now match v1.36; all v1.46 UI, markers, PDFs, and other functionality remain unchanged.

## v1.46 — satellite map border-style hotfix

- Corrected the MapLibre paint `line-width` expression introduced in v1.44. The wider border halo now uses its **own top-level `interpolate` zoom expression**, instead of nesting a zoom expression inside a `+` operation (which MapLibre rejects and prevents the entire satellite map from loading).
- Kept the international border colors/widths at the same zoom stops, for both the Marian Apparitions Map and 3D globe satellite styles.
- Preserved the v1.44 desktop heading, phone fullscreen/regular layout, Search Apparitions label, Marian markers, PDFs, and original map modes.

## Version 1.44 — fullscreen continuity and clearer geography

- In phone portrait and landscape, **full screen keeps the same search/list/map layout as regular viewing**; the previous fullscreen-only `display:none` for the sidebar is overridden. Phone marker/PDF drawer remains left-sliding.
- Restore centered desktop heading **MARIAN APPARITIONS ✧ STORIES OF FAITH** while keeping the top-left linked gold diamond.
- Rename the searchable directory control **Search Apparitions**.
- Remove per-apparition "1 media / 2 media" labels from the location list (PDF data and media counts within the PDF viewer remain unchanged).
- Slightly strengthen international land borders in the MapLibre satellite Explorer and satellite globe using existing OpenFreeMap vector-tile data, when available. Third-party Google My Maps is not restyled.

## v1.43 — Phone tap-to-dismiss and directory discoverability

- Restored the gold diamond icon inside the upper-left site link (Marian Apparitions URL unchanged).
- On phone portrait and landscape, tapping unused map imagery closes the selected apparition's PDF/details drawer. Dragging, pinching, long pressing, selecting another marker, and tapping a map control do **not** dismiss the drawer. The custom behavior applies to the Sky Surfer satellite map and globe, not to cross-origin Google My Maps iframe taps.
- In phone fullscreen, the directory button now visibly says **Directory** instead of relying on an unlabeled list icon; it opens the existing searchable Marian Apparitions Directory.
- The three original views, desktop right-side details panel, PDFs, and viewer overlay are preserved.

## v1.42 — cleaner embedded header, PDF navigation, and headline

- Updated the main headline to **Explore Marian Apparitions Around the World!**.
- Removed the Sky Surfer wordmark and emblem from **the map app header**; the top-left link now reads **MARIAN APPARITIONS** and opens `https://www.sky-surfer.com/marian-apparitions` in a new tab. The surrounding Squarespace website header (outside the iframe) is controlled in Squarespace, not this app.
- Renamed **Try the Street View** to **Street View**, preserving its Google Maps panorama link for the selected apparition. Moved this link to the bottom of the details panel, after the PDF viewer, so the PDF begins higher.
- Replaced the long mixed desktop/phone PDF gestures with device-specific concise text: **Drag to pan · Pinch to zoom** on phones, mouse/keyboard hints on desktop. Improved the expanded PDF overlay footer's layout in phone portrait and landscape.
- Preserved the three map views, the mobile left drawer, the desktop right panel, the Marian marker design, and all PDF assets.

## v1.41 — Embedded mobile layout + larger PDF viewer

- Phone heading now wraps in two intentional lines rather than three or more.
- On phones, the map fits within the available embed viewport rather than forcing an additional scroll inside the map app. Squarespace must still give the iframe adequate height for the desired map size.
- Removed About This Apparition, its description, and the external links below it on all devices; apparition descriptions remain in site-data.js for searching.
- Removed the automatic scroll-to-map action when selecting an apparition on a phone, so the Squarespace page does not jump.
- The existing desktop right-side PDF preview expands vertically to fill the space; mobile PDF and drawer controls remain intact.
- Existing satellite / live Google / 3D globe views and the Marian markers remain unchanged. God's Eye View remains removed.

# Sky Surfer — Marian Apparitions Map v1.43

## v1.41: phone usability + removal of experimental fourth view

- **God’s Eye View is completely removed**: the experimental fourth tab, remote iframe, bridge, installer and launcher, alternate globe styles, and related documentation are no longer included.
- **Historical note (v1.39):** Three views were present at this stage. The Live Google Map tab was removed in v1.52; Marian Apparitions Map (Satellite / Street Map) and 3D Globe remain.
- **Phone portrait and landscape only:** selecting a marker in the Sky Surfer map, or choosing an entry from the apparition list/directory, opens the existing information/PDF panel as a left-side drawer inside the map. It keeps part of the map visible and has an accessible close button.
- **Phone fullscreen**: fullscreen is map-first, with the tall introduction hidden. The drawer opens from the left, including when the phone is rotated sideways. The PDF FULLSCREEN control still opens the existing in-page expanded viewer.
- **Phone embedded view**: the same mobile drawer works inside a responsive iframe. The containing site's iframe must permit fullscreen for the fullscreen button to work. The iframe's own height is controlled by the containing page, not by this ZIP.
- **Desktop stays unchanged**: the normal right-side information panel, search, map controls, and PDF viewer remain.

Important limitation: Google's **Live Google My Maps** iframe controls its own pins and popups. Its pin clicks cannot directly open Sky Surfer's custom PDF drawer. To open Sky Surfer PDFs, use **Marian Apparitions Map**, **3D globe**, or the apparition list/directory.

## Run locally

1. Extract the entire ZIP, preserving the subfolders.
2. Double-click `START_LOCAL_WINDOWS.bat` (requires Python 3) or host the static folder on GitHub Pages.
3. Select an apparition in **Marian Apparitions Map** or **3D globe** to see its description and attached PDFs.

---

# Sky Surfer — Marian Apparitions Map v1.30

This is a clean testing version built from v1.25. It removes **all previous sample locations and their media files** from the delivered website and replaces them with three sample apparition entries and the three PDFs supplied for this test.

## What is in this version

- **Marian Apparitions Map** is the opening/default mode. It uses MapLibre and the existing EOxCloudless 2016 satellite layer (online), with optional OpenFreeMap **Street Map** and automatic 3D building shapes when zoomed in where data exists.
- **Historical note (before v1.52):** Live Google Map used to load the Google My Maps project: `15WqbuRlgPoyjzpR8lw7uUsQUrV_0EW0`. It will display updated pins from Google if the map's sharing settings permit embedding, but Google-controlled map pins cannot trigger the separate Sky Surfer PDF panel. Use the left catalog or click Sky Surfer Explorer pins for the PDFs.
- **3D globe** retains the MapLibre satellite atmosphere effect and offline fallback.
- Search by location, country, city, historical year, or PDF name. Select a pin or catalog entry for a zoomable/pannable PDF viewer and a working **DOWNLOAD PDF** control.
- Test PDFs: Fátima (2 pages), Guadalupe (1 page), Lourdes (1 page).

**Location accuracy:** The map now uses the exact coordinates from the provided `Marian Apparitions Map.kml`, copied to `google-my-maps.kml`, not provisional positions. Each record shows its year and KML-exact coordinates; source URLs are retained privately in the site data for future maintenance.

The three short historical descriptions are based on official Catholic shrine and Vatican sources, and their references are retained in the data but not displayed in the interface. They are maintained separately from the Google My Maps KML placeholder descriptions in `bindings.json` (`description_override`, `source_references`, and `year`). Future KML exports do not overwrite these researched descriptions.

### v1.34 — fullscreen document overlay (compatible with whole-site fullscreen)
- The **PDF FULLSCREEN** button now opens the *existing* PDF/image viewer in an in-page overlay inside the Sky Surfer experience. The overlay does not request browser fullscreen a second time, so the globe, map mode, selected apparition, and whole-site fullscreen remain intact.
- Click **CLOSE VIEWER**, the dimmed backdrop, or press **Esc** to close the overlay and return to the same map and document details. While the map itself is in browser fullscreen, the first Esc closes only the PDF overlay, and the next Esc can leave map fullscreen.
- Reuses the existing zoom, pan, continuous page navigation, first-page fit, pinch interactions, and download link. The original viewer is *moved and restored* rather than recreated; it continues working across desktop and phone portrait/landscape.
- Apparition pin: restored the earlier blue/gold pin design and kept **only the top cross and M**, removing the bottom cross. The marker now uses a standard centered capital M rather than an extended M shape. All map modes continue to use `assets/marian-apparition-pin.svg`.
- No apparition data, PDF attachments, map layers, or view-switch controls were removed.

## Run it locally (Windows)

1. Extract the ZIP into its own folder, including all subfolders.
2. Double-click **`START_LOCAL_WINDOWS.bat`**. Python 3 is needed for the local server; it will open `http://localhost:8765/index.html`.
3. The Marian Apparitions Map opens by default. Choose **3D Globe** for an alternate Earth view; use **Satellite / Street Map** within the Marian Apparitions Map.
4. Click an apparition from the list or its custom Explorer marker to open the PDF. Scroll the mouse to zoom at the pointer, drag to pan, and use pinch gestures on phones. **DOWNLOAD PDF** saves the original file.

Most of the PDF and illustrated globe features can also work when `index.html` is double-clicked directly, but MapLibre and remote imagery are more dependable over `localhost`. Internet is required for online map tiles and the live Google iframe.

## Updating your apparition locations

1. Edit the project at `https://www.google.com/maps/d/u/1/edit?mid=15WqbuRlgPoyjzpR8lw7uUsQUrV_0EW0&usp=sharing`.
2. From Google My Maps, choose **Export to KML/KMZ → Entire map**, **uncheck** "Keep data up to date with network link KML," and choose **Export as KML**.
3. Replace this project's `google-my-maps.kml` with the downloaded **full KML**. That updates the custom Explorer pins. Do not keep an old `google-earth.kml`—this build imports only the new `google-my-maps.kml`.
4. Place associated documents in `media/`. Exact existing names are retained. If you add PDFs/images, edit `bindings.json` (keyed by the normalized location name) or rely on filename matching, then run `UPDATE_GLOBE_WINDOWS.bat`.
5. That regenerates `site-data.js`, PDF previews in `assets/previews/`, and offline download sidecars in `downloads/`. If a renamed marker breaks its old ID association, update the matching entry in `bindings.json`.
6. Commit the updated files to GitHub Pages. The included GitHub Actions workflow can regenerate site data from the KML and PDFs during a deployment.

**Automatic live synchronization:** Only Google's *own embedded My Maps view* reflects your Google My Maps edits automatically. The Sky Surfer custom Explorer markers/search/PDF links require a fresh full KML export and regeneration. A shared map URL alone is not an authenticated My Maps data API.

## Media and citations

The three original user-supplied PDFs are stored in `media/` and displayed as continuous page previews; all previous testing PDFs are excluded. If the PDFs include third-party images, confirm that you have the necessary rights before making them public.

Satellite maps, OpenFreeMap vector data, Google My Maps and the PDF documents are separate services/sources with distinct terms. Keep all legally required attributions visible and read `IMAGERY-LICENSING.md` before public publication. MapLibre source code being open source does not make satellite imagery or document illustrations public domain.


## Future content editor (not yet built)

A planned later enhancement is a local Marian Apparitions Manager for editing years, descriptions, sources, images, and PDF associations without manually editing `bindings.json`. For now, edit location positions in Google My Maps and regenerate from KML; the verified descriptions and sources remain in `bindings.json`. No editor is included in v1.30.


### v1.32 refinements
- Marian markers use the gold **M** design.
- Clicking **Marian Apparitions Map** a second time collapses **Satellite / Street Map**; clicking it again expands the options without resetting the camera.
- On first opening a PDF, the entire **first page** fits inside the preview regardless of its aspect ratio. The existing wheel zoom, drag pan, multipage navigation, and mobile pinch controls remain. The viewer's Reset/Fit button now restores first-page fit.


### v1.41 — embedded mobile map and PDF usability
- Removed the About This Apparition description block on desktop and mobile.
- Made the document preview taller in desktop detail view while retaining the right panel.
- Removed the automatic selection `scrollIntoView` so Squarespace does not jump the embedded page.
- Shortened phone heading into two lines: “Explore Marian Apparitions / Around the World”.
- Phone-only location selection zooms and keeps the marker in the visible RIGHT side of the map beside the left-side PDF drawer in portrait and landscape, including on rotation.
- The Google My Maps iframe retains Google's own marker behavior; Sky Surfer's custom Explorer and Globe map markers use the PDF drawer.
- The original three map views are retained; God's Eye View integration is not included.

### v1.41 — mobile PDF panel & touch instructions
- Kept the phone-only left slide-in panel and fixed the upper half: compact heading/location, accessible Street View link, two-row PDF controls with a small fullscreen icon, and document preview starts higher in the drawer.
- Restored **Try the Street View**, opening Google Maps Street View near the selected apparition coordinates in a new tab (availability depends on Google coverage).
- Removed mouse-only “drag / scroll” instructions from phone and embedded phone maps; desktop help remains unchanged.
- Kept the three existing views, locally bundled PDFs, full-screen PDF overlay, desktop right-side panel, and existing phone auto-zoom behavior.


## v1.46 — Header label restoration
- Restore **MARIAN APPARITIONS** immediately after the linked gold diamond on wide desktop screens.
- Keep the centered **MARIAN APPARITIONS ✧ STORIES OF FAITH** desktop heading; no duplicate Sky Surfer wordmark.
- Preserve the label on narrow phone fullscreen layouts with tighter spacing.
- Retain all v1.45 map border styling fixes, views, mobile drawer and PDF functionality.
