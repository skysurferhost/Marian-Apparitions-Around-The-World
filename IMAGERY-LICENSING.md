# Satellite and map licensing — v1.26

**Explorer Satellite** is MapLibre GL JS displaying EOxCloudless 2016 satellite tiles (modified Copernicus Sentinel data). The EOX 2016 data is described as CC BY 4.0 with attribution; the public endpoint is provided without uptime guarantees, and its availability / acceptable traffic policy can change. At very close zoom levels, MapLibre enlarges the last available satellite image instead of revealing nonexistent detail. EOX is not Google Maps imagery. Attribution remains displayed in the map.

**Street Map / 3D buildings** uses OpenFreeMap's public service and OpenStreetMap-derived vector data. MapLibre is an open-source rendering library, not the imagery provider. Follow the terms of the tile service, acknowledge OpenFreeMap/OpenStreetMap contributors and observe any applicable data licenses.

**Live Google Map** is Google's separate embedded Google My Maps iframe for the newly provided map ID. It follows Google's own embed/sharing rules. It does not grant the website access to Google Maps tiles for its custom Explorer.

**User-supplied PDFs** may contain copyrighted images and educational text. Confirm permission to publicly publish the PDFs or choose appropriately licensed materials. Their presence in the ZIP does not constitute a license.

References:
- https://cloudless.eox.at/documentation/faq
- https://creativecommons.org/licenses/by/4.0/
- https://openfreemap.org/
- https://www.openstreetmap.org/copyright
- https://support.google.com/mymaps/answer/3109452

## Cinematic 3D (Beta) — v1.36

Open-source CesiumJS (Apache 2.0) provides the 3D Earth engine. The built-in
imagery layer is EOxCloudless 2016 (CC BY 4.0), with required attribution
and ordinary provider availability limits. Neither a Cesium ion account nor
an API key is necessary for this base globe. The ZIP includes a local globe
as a fallback when the engine or imagery cannot be loaded.

Photorealistic 3D building/terrain tiles from third parties, including Google
Photorealistic 3D Tiles, are not part of this release. A free CesiumJS license
does not give permission to use external restricted data or waive provider fees.

References:
- https://github.com/CesiumGS/cesium
- https://cloudless.eox.at/
- https://creativecommons.org/licenses/by/4.0/

## v1.38 Cinematic satellite and optional photorealistic 3D

The independent default cinematic view uses MapLibre GL JS, a free map engine,
and requests image tiles from the public **Esri World Imagery** service. Esri
imagery is **not open source**; use is subject to the imagery provider's terms,
quotas and required credits. Esri imagery source attribution and an on-screen
credit are retained. If the provider blocks the requests, use the **EOX 2016**
option or the existing map views. The source-specific credits are kept on map.
3D building shapes are provided by **OpenStreetMap-derived OpenFreeMap**
vector tiles, with variable coverage and approximate geometric heights. These
are not photogrammetric buildings and the free mode does not include terrain
meshes.

**Optional photorealistic mode** loads CesiumJS (Apache 2.0) only after the
visitor explicitly selects it. Cesium ion or Google Maps Platform service
access must be separately authorized for Google Photorealistic 3D Tiles, and
provider availability, rate limits, geographic coverage, payment requirements,
and terms apply. In a public deployment, only client-disclosable,
referrer-restricted credentials should be used, and budget controls considered.
The software does not publish credentials to Sky Surfer or store them in the
project files. The Cesium renderer retains provider attribution.

- https://www.esri.com/en-us/legal/terms/web-site-service
- https://support.esri.com/en-us/knowledge-base/what-is-the-correct-way-to-cite-an-arcgis-online-basema-000012040
- https://developers.google.com/maps/documentation/tile/3d-tiles-overview
- https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles
- https://github.com/bilawalsidhu/gods-eye-view
