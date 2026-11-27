/* Shared regional aerial catalog for both map engines. */
'use strict';
(()=>{
 const IGN='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';
 function wmsURL(url,layers,geo=false){return url+(url.includes('?')?'&':'?')+'SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS='+encodeURIComponent(layers)+'&STYLES=&CRS='+(geo?'EPSG:4326':'EPSG:3857')+'&FORMAT=image/png&TRANSPARENT=TRUE&WIDTH=256&HEIGHT=256&BBOX='+(geo?'{southDegrees},{westDegrees},{northDegrees},{eastDegrees}':'{westProjected},{southProjected},{eastProjected},{northProjected}');}
 function arcURL(url,operation='export'){return url+'/'+operation+'?bbox={westProjected},{southProjected},{eastProjected},{northProjected}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image';}
 function list(){const sources=[];const add=(name,bounds,url,max,credit,priority=10,first=8,geo=false)=>sources.push({name,bounds,url,max,credit,priority,first,geo});
 const wms=(name,bounds,url,layer,max,credit,priority=10,geo=false)=>add(name,bounds,wmsURL(url,layer,geo),max,credit,priority,geo?7:8,geo);
  add('USGS NAIP',[-125,24,-66,50],arcURL('https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer','exportImage'),19,'USGS / USDA — National Map NAIP, public domain');
  add('Ontario OIWMS',[-95.3,41.6,-74.2,57],arcURL('https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_Imagery/Ontario_Imagery_Web_Map_Service/MapServer'),19,'Government of Ontario — Open Government Licence Ontario');
  add('Spain PNOA',[-9.5,35.7,4.5,44], 'https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{reverseY}.jpeg',19,'PNOA / IGN Spain — CC BY 4.0');
  add('Catalonia ICGC',[0.1,40.4,3.4,43], 'https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/{z}/{x}/{y}.jpeg',19,'Orthophoto of Catalonia — Institut Cartogràfic i Geològic de Catalunya (ICGC), CC BY 4.0',24);
  add('Canary Islands PNOA',[-18.3,27.5,-13.2,29.6],'https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{reverseY}.jpeg',19,'PNOA / IGN Spain — CC BY 4.0');
  wms('Portugal DGT',[-9.6,36.9,-6.1,42.2],'https://cartografia.dgterritorio.gov.pt/wms/ortos2025','Ortos2025-RGB',20,'Direção-Geral do Território — Ortofotos 2025, CC BY 4.0',12);
  for(const [name,bounds] of [['France IGN',[-5.3,41.2,9.7,51.2]],['Guadeloupe IGN',[-61.9,15.7,-60.9,16.6]],['Martinique IGN',[-61.3,14.3,-60.7,14.95]],['French Guiana IGN',[-54.7,2,-51.5,6]],['Réunion IGN',[55.15,-21.5,55.9,-20.8]],['Mayotte IGN',[44.9,-13.1,45.4,-12.6]],['Saint Martin IGN',[-63.2,17.9,-62.7,18.2]],['Saint Pierre and Miquelon IGN',[-56.5,46.7,-56,47.2]]])add(name,bounds,IGN,19,'IGN France — BD ORTHO, Licence Ouverte 2.0',11);
  add('Netherlands PDOK',[3.3,50.7,7.3,53.7],'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg',20,'Beeldmateriaal Nederland / PDOK — CC BY 4.0',30);
  add('Switzerland SWISSIMAGE',[5.9,45.8,10.6,47.9],'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',20,'© swisstopo — open federal geodata',25);
  add('Austria basemap.at',[9.5,46.3,17.2,49.1],'https://maps.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',19,'Datenquelle: basemap.at — CC BY 4.0',20);
  add('Czechia ČÚZK',[12,48.5,19,51.1],'https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/tile/{z}/{y}/{x}',20,'ČÚZK — Ortofoto ČR, CC BY 4.0',25);
  add('Poland GUGiK',[14.1,48.9,24.2,55],'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg',19,'GUGiK / geoportal.gov.pl — Ortofotomapa, free reuse',20);
  wms('Poland high resolution',[14.1,48.9,24.2,55],'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution','Raster',20,'GUGiK / geoportal.gov.pl — High-resolution orthophotomap',35,true);
  add('Luxembourg ACT',[5.7,49.4,6.6,50.2],'https://wmts.geoportail.lu/opendata/wmts/ortho_latest/GLOBAL_WEBMERCATOR_4_V3/{z}/{x}/{y}.jpeg',20,'ACT Luxembourg — BD-L-ORTHO, CC0',35);
  wms('Slovakia GKÚ',[16.8,47.7,22.7,49.7],'https://zbgisws.skgeodesy.sk/zbgis_ortofoto_wms/service.svc/get','1',19,'GKÚ Bratislava / NLC — Orthophotomosaic, CC BY 4.0',20,true);
  add('Estonia orthophoto',[21.7,57.4,28.3,59.9],'https://tiles.maaamet.ee/tm/tms/1.0.0/foto@GMC/{z}/{x}/{reverseY}.jpg',19,'Republic of Estonia Land and Spatial Development Board — open data',20);
  wms('Belgium Flanders',[2.5,50.65,5.95,51.55],'https://geo.api.vlaanderen.be/omw/wms','OMWRGB25VL',20,'Digitaal Vlaanderen — Modellicentie Gratis Hergebruik',20);
  add('Belgium Wallonia',[2.8,49.4,6.5,50.9],arcURL('https://geoservices.wallonie.be/arcgis/rest/services/IMAGERIE/ORTHO_LAST/MapServer'),20,'Service public de Wallonie (SPW) — latest orthophotos, CC BY 4.0',21);
  for(const year of [2022,2023,2024])add('Italy AGEA '+year,[6.5,35.4,18.7,47.2], 'https://geoportale.agea.gov.it/image/rest/services/AgEA/Ortofoto_AgEA_'+year+'/ImageServer/tile/{z}/{y}/{x}',18,'© AGEA — Agenzia per le Erogazioni in Agricoltura, voli '+year+', CC BY 4.0',15+year-2022);
  wms('Germany NRW DOP',[5.8,50.2,9.5,52.6],'https://www.wms.nrw.de/geobasis/wms_nw_dop','nw_dop_rgb',20,'Geobasis NRW — open data, DL-DE Zero 2.0',26);
  wms('Germany Bavaria DOP20',[8.95,47.2,13.9,50.6],'https://geoservices.bayern.de/od/wms/dop/v1/dop20','by_dop20c',20,'Bayerische Vermessungsverwaltung — CC BY 4.0',24);
  wms('Germany Lower Saxony DOP20',[6.6,51.2,11.7,54.1],'https://opendata.lgln.niedersachsen.de/doorman/noauth/dop_wms','ni_dop20',20,'LGLN Niedersachsen — Datenlizenz Deutschland Namensnennung 2.0',24);
  wms('Germany Schleswig-Holstein DOP20',[7.8,53.3,11.4,55.2],'https://dienste.gdi-sh.de/WMS_SH_DOP20col_OpenGBD','sh_dop20_rgb',20,'LVermGeo Schleswig-Holstein — Datenlizenz Deutschland Namensnennung 2.0',25);
  wms('Croatia DGU',[13.4,42.3,19.5,46.6],'https://geoportal.dgu.hr/services/inspire/orthophoto_2021_2022/wms','OI.OrthoimageCoverage',18,'DGU Croatia — open licence; original watermark retained',12,true);
  wms('Croatia DGU 2023',[13.4,42.3,19.5,46.6],'https://geoportal.dgu.hr/services/inspire/orthophoto_2023/wms','OI.OrthoimageCoverage',18,'DGU Croatia — open licence; original watermark retained',13,true);
  for(const [name,bounds] of [['Japan GSI',[128.5,30,146.1,46]],['Okinawa GSI',[122.5,24,131.5,30.8]],['Ogasawara GSI',[139,24,143,28.5]]])add(name,bounds,'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',18,'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院 / GSI Japan</a>',20,14);
  // Additional open datasets; all are geographically bounded and streamed only in view.
  wms('Slovenia GURS',[13.35,45.4,16.65,46.95],'https://ipi.eprostor.gov.si/wms-si-gurs-ins/ows','SI.GURS.ZPDZ:PREGLEDNI_DOF',19,'Geodetska uprava Republike Slovenije — Ortofoto, CC BY 4.0',22,true);
  wms('Iceland NÁTT',[-25,63,-13,67],'https://gis.natt.is/mapcache/web-mercator/wms','grunnkort-loftmynd',19,'Náttúrufræðistofnun (Natural Science Institute of Iceland), 2025 — Grunnkort Loftmynd, CC BY 4.0',22);
  add('Australia Queensland',[137.8,-29.2,154.1,-9.5],'https://spatial-img.information.qld.gov.au/arcgis/rest/services/Basemaps/LatestStateProgram_AllUsers/ImageServer/tile/{z}/{y}/{x}',20,'© State of Queensland — Latest State Program Public Basemap (CC BY / CC BY-SA per service metadata); includes © Planet Labs Netherlands B.V., reproduced under licence from Planet and Geoplex, all rights reserved, 2026',20);
  add('Australia New South Wales',[140.9,-37.6,153.7,-28.1],'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Imagery/MapServer/tile/{z}/{y}/{x}',19,'NSW Spatial Services — NSW Imagery (CC BY 3.0 AU); includes © AAM, Jacobs Group Ausimage and Landsat per service credits',20);
  // Optional free, user-owned keys are never bundled. Leave disabled until configured.
  const keys=window.SKY_SURFER_IMAGERY_KEYS||{};
  if(keys.linz)add('New Zealand LINZ',[165,-48,179,-33],'https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/{z}/{x}/{y}.webp?api='+encodeURIComponent(keys.linz),20,'LINZ aerial basemap — CC BY 4.0',20);
  if(keys.finland)add('Finland NLS',[19,59,32,70.2],'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/ortokuva/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.jpg?api-key='+encodeURIComponent(keys.finland),19,'National Land Survey of Finland — CC BY 4.0',20);
return sources;}
 window.SKY_SURFER_IMAGERY={list};
})();
