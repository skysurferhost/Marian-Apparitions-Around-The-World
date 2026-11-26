**Cesium v1.64:** see `IMAGERY-SOURCES-v1.64.md` for the experimental Cesium-only registry, rights and service limitations. The original MapLibre imagery notes below remain applicable.

# Satellite and map licensing — v1.26

**Explorer Satellite** is MapLibre GL JS displaying EOxCloudless 2016 satellite tiles (modified Copernicus Sentinel data). The EOX 2016 data is described as CC BY 4.0 with attribution; the public endpoint is provided without uptime guarantees, and its availability / acceptable traffic policy can change. At very close zoom levels, MapLibre enlarges the last available satellite image instead of revealing nonexistent detail. EOX is not Google Maps imagery. Attribution remains displayed in the map.

**Street Map / 3D buildings** uses OpenFreeMap's public service and OpenStreetMap-derived vector data. MapLibre is an open-source rendering library, not the imagery provider. Follow the terms of the tile service, acknowledge OpenFreeMap/OpenStreetMap contributors and observe any applicable data licenses.

**Google My Maps KML** provides location data for the Sky Surfer map. The Live Google Map iframe tab was removed in v1.52; Google Street View links remain available from individual apparition details. Google data and imagery remain subject to their respective provider terms.

**User-supplied PDFs** may contain copyrighted images and educational text. Confirm permission to publicly publish the PDFs or choose appropriately licensed materials. Their presence in the ZIP does not constitute a license.

References:
- https://cloudless.eox.at/documentation/faq
- https://creativecommons.org/licenses/by/4.0/
- https://openfreemap.org/
- https://www.openstreetmap.org/copyright
- https://support.google.com/mymaps/answer/3109452

## v1.65 additions

OpenFreeMap / OpenMapTiles / OpenStreetMap labels are separately attributed in Cesium; do not remove the credits. New aerial imagery is streamed directly from original public services, not redistributed. Queensland and NSW public services include third-party material; do not infer a license to copy or rehost all imagery from public service availability. Refer to IMAGERY-SOURCES-v1.65.md.

## v1.66 3D building data
The new geometry is derived on demand from the existing OpenFreeMap/OpenMapTiles vector tiles using OpenStreetMap data (ODbL attribution retained). It is not Cesium ion's hosted OSM Buildings product and is not photogrammetry. No new imagery source, paid account or token is introduced. See https://openfreemap.org/, https://openmaptiles.org/docs/schema/ and https://www.openstreetmap.org/copyright.

## v1.68 — Native photogrammetry
City of Helsinki mesh (CC BY 4.0) and CRAIG experimental photomaillage (Licence Ouverte Etalab) are configured with provider credits. Open data rights are distinct from hosted service availability and traffic policies; verify direct browser access and service conditions before public launch. See PHOTOMESH-SOURCES.md. No paid service enabled.

### v1.70 building color derivation
Only existing eligible regional imagery and explicitly licensed OAM imagery is sampled, in memory, with existing source attribution retained. Australian layers with third-party terms are excluded. OpenMapTiles schema https://openmaptiles.org/docs/schema/ and OpenStreetMap contributions are credited by the existing geographic layer. No new external data service.

## v1.72 attribution UI
Credits are retained in Cesium’s native attribution lightbox when the license permits flexible placement; mandatory or uncertain provider credits stay visible. The smaller Cesium logo and information icon do not remove source acknowledgments. See https://osmfoundation.org/wiki/Attribution_Guidelines and https://creativecommons.org/licenses/by/4.0/. Confirm provider-specific on-screen requirements before public deployment.
