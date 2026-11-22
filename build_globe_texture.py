"""One-time artwork generation for an illustrated (not Google satellite) Earth."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import geopandas as gpd
ROOT=Path(__file__).resolve().parent
W,H=2400,1200
rng=np.random.default_rng(12)
y,x=np.mgrid[:H,:W]
noise=rng.normal(0,1,(H,W)).astype(np.float32)
# Ocean in deep mineral blues; subtle latitude bands and light grain.
lat=(.5-y/H)*np.pi
shade=0.62+0.10*np.cos(lat*3)+.06*np.cos(x/W*12*np.pi)+.04*noise
imgarr=np.zeros((H,W,3),dtype=np.uint8)
imgarr[:,:,0]=np.clip(9+shade*8,0,255)
imgarr[:,:,1]=np.clip(37+shade*24,0,255)
imgarr[:,:,2]=np.clip(50+shade*24,0,255)
img=Image.fromarray(imgarr,'RGB')
landmask=Image.new('L',(W,H),0)
draw=ImageDraw.Draw(landmask)
shape='/opt/pyvenv/lib/python3.13/site-packages/pyogrio/tests/fixtures/naturalearth_lowres/naturalearth_lowres.shp'
gdf=gpd.read_file(shape)
def polygon_points(poly):
    return [(int((lon+180)/360*W),int((90-lat)/180*H)) for lon,lat in poly.exterior.coords]
for geometry in gdf.geometry:
    if geometry is None: continue
    polygons=([geometry] if geometry.geom_type=='Polygon' else geometry.geoms if geometry.geom_type=='MultiPolygon' else [])
    for poly in polygons:
        coords=polygon_points(poly)
        if len(coords)>2: draw.polygon(coords,fill=255)
        for ring in poly.interiors:
            coords=[(int((lon+180)/360*W),int((90-lat)/180*H)) for lon,lat in ring.coords]
            if len(coords)>2:draw.polygon(coords,fill=0)
mask=np.asarray(landmask).astype(np.float32)/255.0
# Plant green, sandy ocher with procedural shading.
longitude=np.linspace(-np.pi,np.pi,W)[None,:]
latitude=np.linspace(np.pi/2,-np.pi/2,H)[:,None]
local=(np.sin(longitude*6+latitude*5)*8+np.cos(latitude*12)*6+np.sin(longitude*13-latitude*19)*3+noise*5)
land=np.empty_like(imgarr)
land[:,:,0]=np.clip(105+local+10*np.cos(latitude*4),0,255)
land[:,:,1]=np.clip(120+local*.8+9*np.cos(latitude*3),0,255)
land[:,:,2]=np.clip(91+local*.45+6*np.cos(latitude*2),0,255)
blend=mask[:,:,None]
arr=np.asarray(img).astype(np.float32)*(1-blend)+land.astype(np.float32)*blend
img=Image.fromarray(arr.astype('uint8'),'RGB')
# Faint graticule makes the illustrated globe legible at a distance.
g=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(g)
for line in range(0,W,W//12):
    d.line([(line,0),(line,H)],fill=(192,217,200,13),width=1)
for line in range(0,H,H//12):
    d.line([(0,line),(W,line)],fill=(192,217,200,10),width=1)
img=Image.alpha_composite(img.convert('RGBA'),g).convert('RGB')
out=ROOT/'assets'/'earth-illustrated.webp';img.save(out,'WEBP',quality=91,method=5)
print(out,out.stat().st_size)
