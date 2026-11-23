"""Idempotent patch to user's downloaded original God's Eye View source.
   This patch adds a small camera-and-marker bridge; it does not replace the app.
"""
from pathlib import Path
import shutil,sys
if len(sys.argv)!=2: raise SystemExit('Usage: patch_gev.py PATH_TO_DOWNLOADED_GEV_SOURCE')
base=Path(sys.argv[1]).resolve()
entry=base/'src'/'main.js'
renderer=base/'src'/'render'/'cesium'
if not entry.exists() or not (renderer/'viewers.js').exists():
    raise SystemExit('The downloaded God\'s Eye View source does not match the expected upstream layout; no patch applied.')
s=entry.read_text(encoding='utf-8')
import_line="import { installSkySurferBridge } from './render/cesium/skySurferBridge.js';"
call_line='installSkySurferBridge(application);'
if import_line not in s:
    s=import_line+'\n'+s
if call_line not in s:
    # Insert after the created application, before startup. Upstream exports at the bottom.
    anchor='application.start().catch('
    if anchor not in s: raise SystemExit('God\'s Eye View start() structure has changed; no patch applied.')
    s=s.replace(anchor,call_line+'\n\n'+anchor,1)
entry.write_text(s,encoding='utf-8')
shutil.copy2(Path(__file__).with_name('skySurferBridge.js'),renderer/'skySurferBridge.js')
public=base/'public';public.mkdir(exist_ok=True)
shutil.copy2(Path(__file__).resolve().parents[1]/'assets'/'marian-apparition-pin.svg',public/'sky-surfer-marian-pin.svg')
print('Sky Surfer bridge installed into original God\'s Eye View source.')
