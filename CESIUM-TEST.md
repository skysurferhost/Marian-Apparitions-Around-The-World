# v1.62 — integrated native Cesium globe with automatic open imagery

This is a separate experiment. Keep v1.56 as your official release. The existing map engines, records, PDF assets and layouts are preserved. The Cesium globe is a third view inside index.html. It shares the sidebar, directory, markers, details/PDF panel and map controls.

## v1.62 correction
The regional selection function no longer shadows the viewer activation state. Error notices no longer overlap the startup status. This fixes the reported ReferenceError, not a claim of verified live rendering.

## Run on Windows
1. Extract the ZIP to a fresh folder. Run `START_CESIUM_TEST_WINDOWS.bat` to open index.html with the Cesium tab selected, or `START_LOCAL_WINDOWS.bat` and choose **Cesium 3D Globe**. Both launchers use a fresh available local port. Python 3 is required.
2. Rotate and zoom normally; there is no imagery selector. Use the shared reset control and apparition list or markers to test Fátima, Lourdes and Guadalupe.
3. CesiumJS 1.147 loads from the official CDN or a local `vendor/cesium` installation. If the library fails to load, run `INSTALL_CESIUM_WINDOWS.bat` or download the official prebuilt ZIP and drag it onto that installer. No ion token is used.
4. For problems, expand Technical diagnostics and copy the output. Diagnostics report which regional layer is requested, not whether the imagery actually loaded.

## Automatic imagery
The EOX 2016 worldwide imagery remains active. Bundled NASA Blue Marble is a low-resolution underlying fallback. Below 350 km camera altitude, a single regional source is automatically enabled based on the center of the camera view, with approximate rectangular geographic bounds. Returning to the global view hides regional layers. No imagery selector, account, paid tile service or billing configuration is included. Public services may impose limits or become unavailable. Source seams and missing tiles are possible; no worldwide rooftop-level guarantee.

- Portugal mainland: DGT Ortofotos 2025, nominal 25 cm; WMS https://cartografia.dgterritorio.gov.pt/wms/ortos2025, layer Ortos2025-RGB. CC BY 4.0. https://www.dgterritorio.gov.pt/novo-catalogo-de-ortofotos-de-portugal-continental-no-centro-de-dados-da-dgt ; https://www.dgterritorio.gov.pt/atividades/cartografia/cartografia-topografica/ortofotos/ortofotos-digitais
- Metropolitan France: IGN orthophotography, BD ORTHO nominal 20 cm where available; WMTS https://data.geopf.fr/wmts. Open Licence 2.0. https://www.data.gouv.fr/datasets/bd-ortho-r
- Mainland Spain: PNOA latest imagery TMS https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg; CC BY 4.0, PNOA / IGN Spain. https://datos.gob.es/es/catalogo/e00125901-spaignpnoama ; https://pnoa.ign.es/pnoa-imagen/visualizadores-y-servicios-web
- Contiguous United States: USGS/USDA National Map NAIP service, primarily 0.6 m according to the service description. Public-domain NAIP. https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer
- Guadalupe, Mexico, and other uncovered areas: EOX only (about 10 m), no verified open high-resolution tile service configured.
- Global: EOxCloudless by EOX IT Services GmbH, modified Copernicus Sentinel data 2016, CC BY 4.0, https://cloudless.eox.at/ ; NASA Earth Observatory Blue Marble Next Generation, via Matplotlib Basemap data (bundled source notice).
- Engine: CesiumJS, Apache 2.0, https://github.com/CesiumGS/cesium/blob/master/LICENSE.md ; https://cesium.com/learn/cesiumjs/ref-doc/UrlTemplateImageryProvider.html

This uses an ellipsoid, not elevation terrain or photorealistic 3D buildings. The external library and regional services cannot be reached in the build environment; live tile CORS, coverage, image quality, and GPU rendering are unverified. The user's v1.59 standalone test rendered, but this does not establish v1.60 live behavior. See test-results.txt for local checks.
