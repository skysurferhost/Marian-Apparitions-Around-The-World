# v1.68 photogrammetry sources and testing

Native textured mesh 3D Tiles (not extruded footprint geometry). Nine root JSON documents were retrieved through web research; their child binary tiles, browser CORS and service load capacity were not tested. Some CRAIG open mesh datasets are offered on request; confirm third-party public-site streaming conditions before production deployment. No API keys bundled. Credits appear on the globe when a root is active.

| Dataset | Root |
|---|---|
| Helsinki 2024 | https://kartta.hel.fi/3d/mesh/Helsinki_2024/tileset.json |
| Aurillac | https://3d.craig.fr/datasets/Aurillac/3dtiles/tileset.json |
| Bourgoin-Jallieu | https://3d.craig.fr/datasets/Bourgoin/3dtiles/tileset.json |
| Clermont-Ferrand | https://3d.craig.fr/datasets/Clermont/3dtiles/tileset.json |
| Gex | https://3d.craig.fr/datasets/Gex/3dtiles/tileset.json |
| Issoire | https://3d.craig.fr/datasets/Issoire/3dtiles/tileset.json |
| Le Puy-en-Velay | https://3d.craig.fr/datasets/LePuy/3dtiles/tileset.json |
| Saint-Étienne | https://3d.craig.fr/datasets/St-Etienne/3dtiles/tileset.json |
| Voiron | https://3d.craig.fr/datasets/Voiron/3dtiles/tileset.json |

Sources: https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d (CC BY 4.0); https://www.craig.fr/projets/experimentation-3d and https://www.craig.fr/services/photomaillage (Licence Ouverte); https://ids.craig.fr/home/services/opendata/ (access conditions); https://github.com/vvoovv/blosm/wiki/Data-sets-with-OGC-3D-Tiles (endpoint discovery); https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html (native loading and cache options).

## Test locations
Navigate manually to Helsinki (24.95 E, 60.17 N), Clermont-Ferrand (3.08 E, 45.78 N), or Le Puy-en-Velay (3.88 E, 45.04 N). Zoom to a few km above the location, stop moving, then tilt with right mouse drag. Check diagnostics and the visible credit. Verify textured buildings, camera collision, marker access, reset and fallback when leaving. Check at different zooms; mesh elevations are ellipsoid-relative and terrain is still the original ellipsoid. Mesh may obscure draped street labels. Areas without mesh retain the previous imagery and OSM extrusions. No worldwide photorealistic claim.

## Custom tilesets
Edit photomesh-config.js to add a user-owned or openly licensed tileset URL, geographic bounds [west, south, east, north] in degrees, title and attribution. Serve all root/child assets with CORS where required, in a georeferenced WGS84 Earth-fixed frame. For local data, use a relative URL under the project and preserve the child directory hierarchy. A generic non-georeferenced GLB or splat is not a compatible tileset without conversion/georeferencing. Google Photorealistic 3D Tiles is not enabled; it requires billing/API access and compliance with Google display/attribution terms.
