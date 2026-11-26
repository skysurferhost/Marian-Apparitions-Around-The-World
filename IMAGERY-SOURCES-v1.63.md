# Cesium v1.63 imagery registry and source notes

Default configuration is keyless. The source URLs and credits are in `cesium-integrated.js`. Public data license and live service terms are distinct; check quotas and terms before high-volume use. Sources with unclear public web embedding rights, paid subscriptions, or unavailable keys were deliberately omitted or left disabled.

| Coverage | Source / attribution | Reuse / documentation |
|---|---|---|
| Global | NASA Blue Marble Next Generation (bundled, Basemap source notice in assets) | https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/ |
| Global | EOxCloudless 2016, modified Copernicus Sentinel data | CC BY 4.0, https://cloudless.eox.at/ |
| Local worldwide | HOT OpenAerialMap, per-image license and contributor credit | https://docs.imagery.hotosm.org/usage/using-imagery/ ; https://docs.imagery.hotosm.org/about/faq/ |
| Contiguous USA | USGS / USDA NAIP | Public domain, https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer |
| Ontario | OIWMS, Government of Ontario | Open Government Licence Ontario, https://www.arcgis.com/home/item.html?id=101295c5d3424045917bdd476f322c02 |
| Mainland Spain and Canaries | PNOA / IGN Spain | CC BY 4.0, https://pnoa.ign.es/pnoa-imagen/visualizadores-y-servicios-web |
| Catalonia | ICGC orthophoto | CC BY 4.0, https://www.icgc.cat/en/Geoinformation-and-Maps/Data-and-products/Image/Territorial-Orthophoto |
| Mainland Portugal | DGT Ortofotos 2025 | CC BY 4.0, https://www.dgterritorio.gov.pt/atividades/cartografia/cartografia-topografica/ortofotos/ortofotos-digitais |
| France, Guadeloupe, Martinique, French Guiana, Réunion, Mayotte, Saint Martin, Saint Pierre and Miquelon | IGN BD ORTHO (coverage varies by territory) | Licence Ouverte 2.0, https://www.data.gouv.fr/datasets/bd-ortho-r ; https://cartes.gouv.fr/aide/fr/partenaires/ign/generalites-ign/actualites/2026-09-mises-a-jour/ |
| Netherlands | PDOK Beeldmateriaal Nederland | CC BY 4.0, https://www.pdok.nl/ogc-webservices/-/article/pdok-luchtfoto-rgb-open- |
| Switzerland | swisstopo SWISSIMAGE | Federal open geodata, https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10 |
| Austria | basemap.at | CC BY 4.0, https://basemap.at/en/orthofoto/ |
| Czechia | ČÚZK ORTOFOTO_WM | CC BY 4.0, https://geoportal.gov.cz/php/micka/en/record/basic/CZ-CUZK-WMTS-ORTOFOTO_900913 |
| Poland | GUGiK standard and high resolution | Free reuse, https://www.geoportal.gov.pl/en/data/orthophotomap-orto/ |
| Luxembourg | ACT BD-L-ORTHO | CC0, https://data.public.lu/en/datasets/bd-l-ortho-webservices-wms-et-wmts/ |
| Slovakia | GKÚ Bratislava / NLC | CC BY 4.0 view service, https://www.gku.sk/geoportal-en/services/web-map-services/wms/wms-zbgis/ ; https://directory.spatineo.com/service/36043/ |
| Estonia | Republic of Estonia Land and Spatial Development Board | Open data, https://geoportaal.maaruum.ee/eng/spatial-data/orthophotos-p309.html |
| Flanders | Digitaal Vlaanderen | Free reuse model licence, https://www.vlaanderen.be/digitaal-vlaanderen |
| Wallonia | SPW orthophotos | CC BY 4.0, https://geoportail.wallonie.be/catalogue/dfc9f3a2-adff-4b7f-ab77-8a890c4cabbb.html |
| Italy | AGEA flights 2022, 2023, 2024 (three separate services; tile endpoint format requires browser verification) | CC BY 4.0, https://geoportale.agea.gov.it/legal-notes ; https://source.coop/mindearth/italy-aerial |
| Germany, North Rhine-Westphalia | Geobasis NRW | Open data, https://www.wms.nrw.de/geobasis/wms_nw_dop |
| Germany, Bavaria | Bayerische Vermessungsverwaltung DOP20 | CC BY 4.0, https://geodatenonline.bayern.de/geodatenonline/seiten/wms_dop20cm |
| Germany, Lower Saxony | LGLN | Open data DL-DE BY 2.0, https://opengeodata.lgln.niedersachsen.de/ |
| Germany, Schleswig-Holstein | LVermGeo | DL-DE BY 2.0, https://data.gov.de/suche/daten/digitale-orthophotos-dop20276fd |
| Croatia | DGU 2021–22 and 2023 | Open licence, anonymous WMS watermark retained, https://geoportal.dgu.hr/cms/en/data-and-services/ |
| Japan, Okinawa, Ogasawara | GSI seamlessphoto | Attribution and live tile terms, https://maps.gsi.go.jp/development/ichiran.html |
| New Zealand (optional) | LINZ aerial | CC BY 4.0, free user-owned key required, https://basemaps.linz.govt.nz/docs/user-guide/_get-started/ |
| Finland (optional) | NLS orthophotos | CC BY 4.0, free user-owned key required, https://www.maanmittauslaitos.fi/en/maps-and-spatial-data/datasets-and-interfaces/map-interface-services/map-image-service-wms-wmts |

Additional source discovery: https://www.technicalgis.com/aerial-imagery-atlas/ and https://osmlab.github.io/editor-layer-index/ . A third-party report on 2026 imagery endpoints is https://github.com/Roti-Poulet/BeamNG.Earth-NT6/blob/main/docs/research/2026-10-10-imagery-sources-world.md ; this is not independent live verification.

## Not enabled
No Google, Bing, Esri or commercial imagery was added. Australian NSW imagery has unclear dataset licensing, and Victoria requires a subscription for business web apps. Denmark, Norway, South Korea and other services require credentials or additional service terms; Hong Kong, Taiwan, Mexico, Bosnia, Ireland and many other countries require additional verified endpoint/licence work. Germany's federal DOP20 service requires access clearance; selected open state services were used instead. OpenAerialMap's blanket mosaic is not used because its newer catalog describes per-image licenses. Open downloads without public browser tile endpoints need separate preprocessing/hosting; they are not represented as implemented. In uncovered regions the global imagery remains available.
