"""Start a local HTTP server from this exact project directory before opening the browser."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import webbrowser
import sys

root = Path(__file__).resolve().parent
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
# A fresh OS-selected port avoids accidentally opening an older running ZIP.
with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
    page = 'index.html?v=1.87' + ('' if '--main' in sys.argv else '&view=cesium')
    url = f'http://127.0.0.1:{server.server_port}/{page}'
    print('Sky Surfer Map v1.87:', url, flush=True)
    print('Keep this window open. Ctrl+C stops the local server.', flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
