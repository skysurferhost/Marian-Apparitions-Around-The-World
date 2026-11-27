#!/usr/bin/env python3
"""Build the Sky Surfer Marian Apparitions map from one KML export.

Replace google-my-maps.kml with a full Google My Maps export (network link disabled),
then run this script. bindings.json maps placemarks to PDFs and images.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import difflib
import html
import json
import math
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES = ROOT / 'assets' / 'previews'
MEDIA = ROOT / 'media'
SOURCES = [(ROOT / 'google-my-maps.kml','Google My Maps')]
BINDINGS = ROOT / 'bindings.json'
GEOGRAPHY = ROOT / 'geography.json'
OUT = ROOT / 'site-data.js'
VALID_IMAGES = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
VALID_MEDIA = VALID_IMAGES | {'.pdf'}
NS = {'k':'http://www.opengis.net/kml/2.2'}


def normal(s):
    return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower()).strip()


def html_text(raw):
    raw = re.sub(r'<\s*br\s*/?\s*>','\n',raw or '',flags=re.I)
    raw = re.sub(r'</\s*(?:div|p)\s*>','\n',raw,flags=re.I)
    return ' '.join(html.unescape(re.sub(r'<[^>]*>','',raw)).replace('\xa0',' ').split())


def association(name,filename):
    a,b=normal(name),normal(Path(filename).stem)
    if not a or not b: return 0
    if a==b: return 1.0
    if a in b or b in a: return .95
    a_words,b_words=set(a.split()),set(b.split())
    return .57*difflib.SequenceMatcher(None,a,b).ratio()+.43*len(a_words&b_words)/max(1,len(a_words))


def km_distance(a,b):
    lat1,lat2=math.radians(a['lat']),math.radians(b['lat'])
    dlat=lat2-lat1;dlon=math.radians(b['lng']-a['lng'])
    h=math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 12742*math.asin(min(1,math.sqrt(h)))


def parse_kml(filepath,source):
    if not filepath.exists(): return []
    tree=ET.parse(filepath)
    root=tree.getroot()
    # Network link exports contain no usable point placemarks.
    if root.find('.//k:NetworkLink',NS) is not None and not root.findall('.//k:Placemark',NS):
        raise SystemExit(f'{filepath.name} is a network-link export. Export the entire map with "Keep data up to date with network link KML" UNCHECKED.')
    out=[]
    def visit(el,region=''):
        tag=el.tag.rsplit('}',1)[-1]
        if tag=='Folder': region=(el.findtext('k:name',default='',namespaces=NS) or '').strip() or region
        if tag=='Placemark':
            rawcoord=el.findtext('.//k:Point/k:coordinates',default='',namespaces=NS)
            if not rawcoord: return
            try:
                lon,lat=map(float,rawcoord.strip().split()[0].split(',')[:2])
            except (ValueError,IndexError):return
            if not(-180<=lon<=180 and -90<=lat<=90):return
            raw_name=(el.findtext('k:name',default='',namespaces=NS) or '').strip()
            year_match=re.search(r'(?<!\d)([1-9][0-9]{2}|1[0-9]{3}|20[0-9]{2})(?!\d)',raw_name)
            apparition_year=int(year_match.group(1)) if year_match else None
            # My Maps may put place + year in parentheses after the devotional name.
            # Keep the human-facing title concise and the source marker unchanged.
            name=re.sub(r'\s*\([^)]*(?:[1-9][0-9]{2}|1[0-9]{3}|20[0-9]{2})[^)]*\)\s*$', '', raw_name).strip() or raw_name
            desc=html_text(el.findtext('k:description',default='',namespaces=NS) or '')
            original_id=el.attrib.get('id','').strip()
            # My Maps exports normally have no marker ID. Normalized names are
            # stable across coordinate moves. Rename? Re-associate via bindings.
            stable_id=original_id or 'mymaps-'+normal(name or f'point-{lat:.5f}-{lon:.5f}').replace(' ','-')
            out.append({'id':stable_id,'name':name or f'Unnamed marker ({lat:.4f}, {lon:.4f})','originalName':name,
                        'lat':lat,'lng':lon,'description':desc,'source':source,'region':region,'year':apparition_year})
            return
        for child in el:
            if child.tag.rsplit('}',1)[-1] in ('Document','Folder','Placemark'):
                visit(child,region)
    visit(root)
    return out


def merge_locations():
    combined=[]
    for path,source in SOURCES:
        for loc in parse_kml(path,source):
            existing=None
            for prev in combined:
                if prev['id']==loc['id']:
                    existing=prev;break
                name_similarity=difflib.SequenceMatcher(None,normal(prev['name']),normal(loc['name'])).ratio()
                if name_similarity>.86 and km_distance(prev,loc)<2:
                    existing=prev;break
            if existing:
                # The live-managed My Maps export is authoritative for position,
                # but retain original Earth name and unique ID for PDF bindings.
                existing['lat'],existing['lng']=loc['lat'],loc['lng']
                if loc['description']:existing['description']=loc['description']
                if loc['region']:existing['region']=loc['region']
                existing['source']=source+' / '+existing['source']
            else:combined.append(loc)
    return combined


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fresh',action='store_true',help='regenerate all PDF page previews')
    args=parser.parse_args()
    places=merge_locations()
    if not places:raise SystemExit('No coordinates found. Include a full Google Earth or My Maps KML export.')
    MEDIA.mkdir(exist_ok=True);PAGES.mkdir(parents=True,exist_ok=True)
    items=sorted(p for p in MEDIA.rglob('*') if p.is_file() and p.suffix.lower() in VALID_MEDIA and not p.name.startswith('.'))
    all_paths={p.relative_to(MEDIA).as_posix():p for p in items}
    prior=json.loads(BINDINGS.read_text(encoding='utf8')) if BINDINGS.exists() else {}
    if not isinstance(prior,dict):prior={}
    geo=json.loads(GEOGRAPHY.read_text(encoding='utf8')) if GEOGRAPHY.exists() else {}
    mapped={}
    for p in places:
        ident=p['id'];cfg=prior.get(ident,{})
        if not isinstance(cfg,dict):cfg={}
        assigned=cfg.get('files',[])
        if isinstance(assigned,str):assigned=[assigned]
        assigned=[f.replace('\\','/') for f in assigned if isinstance(f,str) and f.replace('\\','/') in all_paths]
        if not assigned and p['originalName'] and not cfg.get('manual_files'):
            candidates=sorted(((association(p['originalName'],f),f) for f in all_paths),reverse=True)
            if candidates and candidates[0][0]>=.67: assigned=[candidates[0][1]]
        for f in all_paths:
            if not cfg.get('manual_files') and f not in assigned and p['originalName'] and Path(f).suffix.lower() in VALID_IMAGES and association(p['originalName'],f)>=.83:
                assigned.append(f)
        cfg['files']=assigned;mapped[ident]=cfg
        p['description']=cfg.get('description_override') or p['description'] or ''
        p['year']=cfg.get('year') or p.get('year')
        p['displayName']=f"{p['name']} – {p['year']}" if p['year'] else p['name']
        p['listOrder']=cfg.get('list_order',9999)
        p['sourceReferences']=[src for src in cfg.get('source_references',[]) if isinstance(src,dict) and isinstance(src.get('name'),str) and isinstance(src.get('url'),str) and src['url'].startswith('https://')]
        p['geo']=geo.get(ident,{})
        p['searchText']=' '.join([p['name'],p['displayName'],str(p.get('year') or ''),p['description'],p.get('region',''),p.get('source',''),str(p['lat']),str(p['lng'])] + [str(v) for v in p['geo'].values() if isinstance(v,str)] + [str(v) for v in p['geo'].get('keywords',[])] + [str(f) for f in assigned])
        p['media']=[]
        for rel in assigned:
            source=all_paths[rel]
            uri='media/'+rel
            if source.suffix.lower()=='.pdf':
                try:
                    import fitz
                    doc=fitz.open(source)
                    if doc.needs_pass:raise ValueError('encrypted PDF')
                    for index,page in enumerate(doc):
                        safeid=re.sub(r'[^a-zA-Z0-9_-]+','-',ident)[:54]
                        imagefile=f'{safeid}-p{index+1}.webp'
                        target=PAGES/imagefile
                        if args.fresh or not target.exists() or source.stat().st_mtime>target.stat().st_mtime:
                            scale=max(1.2,min(3.8,3200/max(page.rect.width,page.rect.height)))
                            pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False)
                            from PIL import Image
                            import io
                            Image.open(io.BytesIO(pix.tobytes('png'))).save(target,'WEBP',quality=93,method=5)
                        p['media'].append({'type':'pdf','src':uri,'preview':'assets/previews/'+imagefile,
                                           'page':index+1,'pageCount':len(doc),'label':Path(rel).stem})
                    doc.close()
                except (ImportError,ValueError) as e:
                    p['media'].append({'type':'pdf','src':uri,'preview':None,'page':1,'pageCount':1,'label':Path(rel).stem})
                    print('PDF preview unavailable; browser original fallback:',rel,e)
            else:p['media'].append({'type':'image','src':uri,'preview':uri,'label':Path(rel).stem})
        del p['originalName']
    places.sort(key=lambda item: (item.get('listOrder',9999),item['name']))
    # Generate on-demand original-PDF download sidecars. They work when opened
    # locally using file:// as well as on a GitHub Pages site, and avoid the
    # browser's built-in PDF viewer intercepting the DOWNLOAD PDF control.
    download_dir=ROOT/'downloads'
    download_dir.mkdir(exist_ok=True)
    manifest={}
    for rel,source in all_paths.items():
        if source.suffix.lower()!='.pdf':continue
        uri='media/'+rel
        safe_hash=hashlib.sha256(uri.encode('utf-8')).hexdigest()[:20]
        script_name=f'pdf-{safe_hash}.js'
        manifest[uri]='downloads/'+script_name
        encoded=base64.b64encode(source.read_bytes()).decode('ascii')
        content='window.SKY_SURFER_PDF_DATA = window.SKY_SURFER_PDF_DATA || {};\n'
        content+='window.SKY_SURFER_PDF_DATA['+json.dumps(uri,ensure_ascii=False)+'] = '+json.dumps(encoded)+';\n'
        (download_dir/script_name).write_text(content,encoding='utf-8')
    for item in download_dir.glob('pdf-*.js'):
        if item.name not in {Path(x).name for x in manifest.values()}:item.unlink()
    (ROOT/'download-manifest.js').write_text('window.SKY_SURFER_DOWNLOAD_MANIFEST = '+json.dumps(manifest,indent=2,ensure_ascii=False)+';\n',encoding='utf-8')
    BINDINGS.write_text(json.dumps(mapped,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    OUT.write_text('window.SKY_SURFER_DATA = '+json.dumps({'project':'Sky Surfer | Marian Apparitions Map','locations':places},indent=2,ensure_ascii=False)+';\n',encoding='utf8')
    print('\nUpdated',len(places),'unique locations from',', '.join(path.name for path,_ in SOURCES if path.exists()))
    for p in places:print(' -',p['name'],f'({len(p["media"])} media pages) [{p["source"]}]')
    print('Wrote',OUT.name,'and',BINDINGS.name)

if __name__=='__main__':main()
