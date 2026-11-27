# Imagery, map data and licensing — v1.76

Both views use EOxCloudless 2016 (modified Copernicus Sentinel data, CC BY 4.0) as the global online satellite imagery, and the same regional aerial catalog. The globe also uses bundled NASA Blue Marble Next Generation imagery and the Natural Earth overview names. The flat map uses MapLibre GL JS and OpenFreeMap/OpenMapTiles/OpenStreetMap for streets and labels. Both use the same decoded OpenFreeMap building polygons. Deck.gl is loaded on demand for the flat satellite map's photomesh overlay; the globe uses CesiumJS. The Cesium ion logo is retained from the viewer's native credits; no ion imagery or building subscription is configured.

Credits for active providers are retained in compact attribution controls; provider-specific required on-map notices remain visible. The KML remains a local data input, not an embedded live Google map. Individual Street View links still open Google Maps. User-provided PDFs and photographs require publication permission. Public data licenses do not automatically authorize unrestricted third-party service traffic. Confirm service terms before public deployment. No bulk tile downloads or paid credentials are bundled.

## v1.65 additions

OpenFreeMap / OpenMapTiles / OpenStreetMap labels are separately attributed in Cesium; do not remove the credits. New aerial imagery is streamed directly from original public services, not redistributed. Queensland and NSW public services include third-party material; do not infer a license to copy or rehost all imagery from public service availability. Refer to IMAGERY-SOURCES.md.

## v1.66 3D building data
The fallback geometry is derived on demand from the existing OpenFreeMap/OpenMapTiles vector tiles using OpenStreetMap data (ODbL attribution retained). It is not Cesium ion's hosted OSM Buildings product and is not photogrammetry. No new imagery source, paid account or token is introduced. See https://openfreemap.org/, https://openmaptiles.org/docs/schema/ and https://www.openstreetmap.org/copyright.

## v1.68 — Native photogrammetry
City of Helsinki mesh (CC BY 4.0) and CRAIG experimental photomaillage (Licence Ouverte Etalab) are configured with provider credits. Open data rights are distinct from hosted service availability and traffic policies; verify direct browser access and service conditions before public launch. See PHOTOMESH-SOURCES.md. No paid service enabled.

### v1.70 building color derivation
Only existing eligible regional imagery and explicitly licensed OAM imagery is sampled, in memory, with existing source attribution retained. Australian layers with third-party terms are excluded. OpenMapTiles schema https://openmaptiles.org/docs/schema/ and OpenStreetMap contributions are credited by the existing geographic layer. No new external data service.

## v1.72 attribution UI
Credits are retained in Cesium’s native attribution lightbox when the license permits flexible placement; mandatory or uncertain provider credits stay visible. The smaller Cesium logo and information icon do not remove source acknowledgments. See https://osmfoundation.org/wiki/Attribution_Guidelines and https://creativecommons.org/licenses/by/4.0/. Confirm provider-specific on-screen requirements before public deployment.

### v1.75 overview place names

The bundled `cesium-world-names.js` contains derived interior label points and approximate areas from the Natural Earth 1:110m low-resolution country polygon dataset (177 records, including some territories); it is not a complete political gazetteer. Natural Earth raster and vector data are public domain: https://www.naturalearthdata.com/about/terms-of-use/. Ocean label positions are manually chosen. Native OpenFreeMap/OpenMapTiles/OpenStreetMap attribution remains in place for detailed labels.
