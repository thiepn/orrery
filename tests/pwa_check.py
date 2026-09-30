from pathlib import Path
import json, struct, re
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
assert manifest['name']=='The Orrery'
assert manifest['display']=='standalone'
assert manifest['start_url']=='./' and manifest['scope']=='./'
assert 'rel="manifest" href="manifest.webmanifest"' in html
assert "navigator.serviceWorker.register('./sw.js')" in html
assert 'fonts.googleapis.com' not in html and 'fonts.gstatic.com' not in html
expected={'icons/icon-192.png':(192,192),'icons/icon-512.png':(512,512),'icons/icon-maskable-512.png':(512,512)}
listed={x['src']:x for x in manifest['icons']}
for rel,size in expected.items():
    assert rel in listed, rel
    data=(ROOT/rel).read_bytes(); assert data[:8]==b'\x89PNG\r\n\x1a\n'
    w,h=struct.unpack('>II',data[16:24]);assert (w,h)==size,(rel,w,h)
assert listed['icons/icon-maskable-512.png'].get('purpose')=='maskable'
sw=(ROOT/'sw.js').read_text();assert "orrery-v1.4.0" in sw;assert 'caches.open' in sw;assert "req.mode==='navigate'" in sw
print('PASS  PWA manifest/service-worker/icon checks')
