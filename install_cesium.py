"""Install official CesiumJS 1.147 browser distribution, no npm or ion account.
Usage: python install_cesium.py [path-to-Cesium-1.147.zip]
"""
from pathlib import Path, PurePosixPath
import shutil, sys, tempfile, urllib.request, zipfile
VERSION='1.147'
ROOT=Path(__file__).resolve().parent
TARGET=ROOT/'vendor'/'cesium'
URL=f'https://github.com/CesiumGS/cesium/releases/download/{VERSION}/Cesium-{VERSION}.zip'
REQUIRED=['Cesium.js','Widgets/widgets.css']
def installed(p):
    return all((p/x).is_file() for x in REQUIRED) and all((p/x).is_dir() for x in ['Assets','Workers','ThirdParty','Widgets'])
if installed(TARGET) and len(sys.argv)==1:
    print('CesiumJS browser build already installed:',TARGET);sys.exit(0)
with tempfile.TemporaryDirectory() as tmp:
    tmp=Path(tmp); archive=Path(sys.argv[1]).expanduser() if len(sys.argv)>1 else tmp/'cesium.zip'
    if len(sys.argv)==1:
        print('Downloading official CesiumJS release (approximately 128 MB):',URL,flush=True)
        with urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'SkySurfer-Cesium-Installer/1.60'}),timeout=90) as r, archive.open('wb') as f: shutil.copyfileobj(r,f)
    stage=tmp/'stage';stage.mkdir()
    with zipfile.ZipFile(archive) as z:
        candidates=[n[:-len('Cesium.js')] for n in z.namelist() if n.endswith('/Build/Cesium/Cesium.js') or n=='Build/Cesium/Cesium.js']
        if not candidates:raise RuntimeError('The archive is not the official prebuilt Cesium release; download the release ZIP, not Source code.zip.')
        prefix=candidates[0]
        for item in z.infolist():
            if not item.filename.startswith(prefix) or item.is_dir():continue
            rel=PurePosixPath(item.filename[len(prefix):])
            if rel.is_absolute() or '..' in rel.parts:raise RuntimeError('Invalid archive path')
            out=stage.joinpath(*rel.parts);out.parent.mkdir(parents=True,exist_ok=True)
            with z.open(item) as r,out.open('wb') as f:shutil.copyfileobj(r,f)
        for item in z.infolist():
            if item.is_dir():continue
            name=PurePosixPath(item.filename).name
            if name.lower() in {'license.md','license','license.txt','notice','notice.txt','thirdpartynotices.txt','thirdpartynotices.md'} and '/Build/' not in item.filename and len(PurePosixPath(item.filename).parts)<=2:
                with z.open(item) as r,(stage/name).open('wb') as f:shutil.copyfileobj(r,f)
    if not installed(stage):raise RuntimeError('Required Cesium assets missing; existing installation was not changed.')
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    if TARGET.exists():shutil.rmtree(TARGET)
    shutil.copytree(stage,TARGET)
print('Installed official CesiumJS',VERSION,'at',TARGET)
