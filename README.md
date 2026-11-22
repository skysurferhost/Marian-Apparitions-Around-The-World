# Sky Surfer Marian Apparitions Map — v1.34

## Changes from v1.30

- Kept the original **Sky Surfer star logo** in the top left unchanged. Updated **apparition location pins** on the satellite Explorer, MapLibre atmospheric globe and offline globe to a local, original Marian-themed blue-and-gold marker with an M and cross (`assets/marian-apparition-pin.svg`). Pins remain clickable and have selected-state feedback.
- Kept the **Browse Apparitions** directory tall, with a scrollable country/entry list. The title, search field and footer remain visible as the list grows.
- Moved **Satellite / Street Map** choices directly beneath the central **Marian Apparitions Map** tab, including on small screens. Switching preserves position, zoom and attached document viewer.
- Added a compact **whole-site fullscreen icon** directly to the right of the day/night toggle. It expands the full Sky Surfer interface (header, map, sidebars, directory and PDF viewer), not just the PDF. Use the icon or Esc to exit. Some mobile browsers don't support web-page fullscreen.
- Preserved all three Marian apparition locations, their PDFs, source metadata, theme persistence, 3D building features and original imported KML.

# Sky Surfer Marian Apparitions Map — v1.30

## Changes from v1.29

- Replaced emoji-only country flags with bundled PNG flags (generated from Noto Color Emoji graphics), avoiding Windows displaying `FR`, `MX`, or `PT` instead of flags. Ships flags for all ISO codes in `country-codes.js` so future countries work offline. No font files are included.
- Enlarged the country directory to use most of the available viewport height, retaining a scrolling results area and accessible mobile layout.
- Removed the **3 APPARITIONS** pill from the top bar. Kept the sun/moon theme toggle beside Browse Apparitions. The sidebar and directory counts remain for browsing context.

- Added **Browse Apparitions** in the top header, opening an accessible, searchable directory overlay. Countries appear alphabetically by English country name and their locally bundled flag image, while apparition entries within each country are alphabetized by apparition title (years break ties). Each entry uses **apparition name – year** with the **city, region, country** subtitle and **no media count**. Selecting an entry closes the directory, navigates to that marker, and opens its PDF/image details in the existing panel.
- The directory search matches apparition names, countries, city/region, years, descriptions, and associated PDF filenames; updates are generated directly from site-data.js, so no manually maintained directory is necessary.
- Replaced the formerly tiny fullscreen icon with a high-contrast, labeled **FULLSCREEN** control (changes to **EXIT FULLSCREEN** while enlarged) in the normal and fullscreen PDF viewer. Kept continuous-page zoom/pan and PDF download controls unchanged.
- Added an optional OpenStreetMap-derived 3D building-extrusion layer to the MapLibre atmospheric globe at close zoom (about level 15 onward). It uses the existing OpenFreeMap vector building source, remains hidden at worldwide zoom, and does not affect the original offline-globe fallback or map markers. Buildings are geometric extrusions, not photographic 3D models; coverage depends on OSM building data and live tiles.
- Preserved night/day toggle, KML locations, historical descriptions, official source metadata, satellite/street map choice, and all three PDFs.

# Sky Surfer — Marian Apparitions Map v1.30

This is a clean testing version built from v1.25. It removes **all previous sample locations and their media files** from the delivered website and replaces them with three sample apparition entries and the three PDFs supplied for this test.

## What is in this version

- **Marian Apparitions Map** is the opening/default mode. It uses MapLibre and the existing EOxCloudless 2016 satellite layer (online), with optional OpenFreeMap **Street Map** and automatic 3D building shapes when zoomed in where data exists.
- **Live Google Map** loads the new Google My Maps project you shared: `15WqbuRlgPoyjzpR8lw7uUsQUrV_0EW0`. It will display updated pins from Google if the map's sharing settings permit embedding, but Google-controlled map pins cannot trigger the separate Sky Surfer PDF panel. Use the left catalog or click Sky Surfer Explorer pins for the PDFs.
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
3. The Marian Apparitions Map opens by default. Use **Live Google Map** to see the Google-managed locations separately, and **3D globe** for the globe.
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
- Each Marian location pin now contains a single gold **M**, with no decorative crosses above or below.
- Clicking **Marian Apparitions Map** a second time collapses **Satellite / Street Map**; clicking it again expands the options without resetting the camera.
- On first opening a PDF, the entire **first page** fits inside the preview regardless of its aspect ratio. The existing wheel zoom, drag pan, multipage navigation, and mobile pinch controls remain. The viewer's Reset/Fit button now restores first-page fit.
