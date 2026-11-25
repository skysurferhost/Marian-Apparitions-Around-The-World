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
