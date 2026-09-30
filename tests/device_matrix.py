from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
VIEWS=[(320,568),(360,640),(375,667),(390,844),(430,932),(667,375),(844,390),(768,1024),(900,700),(1024,768),(1050,700),(1366,768),(1440,900)]
rows=[];errors=[]
with sync_playwright() as p:
    chromium='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
    browser=p.chromium.launch(headless=not bool(chromium),executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'] if chromium else [])
    for w,h in VIEWS:
        page=browser.new_page(viewport={'width':w,'height':h})
        local=[];page.on('pageerror',lambda e,local=local: local.append(str(e)))
        page.set_content(html,wait_until='load');page.wait_for_function('window.APP_VERSION === "1.4.0"');page.wait_for_timeout(250)
        page.evaluate("()=>{if(window.finishOnboarding)finishOnboarding();playing=false;syncPlayUI();resetView();document.body.classList.remove('ui-idle');}")
        page.wait_for_timeout(100)
        data=page.evaluate("""()=>{const c=document.querySelector('.controls').getBoundingClientRect(),hint=getComputedStyle(document.querySelector('.hint')).display;return {overflow:document.documentElement.scrollWidth-innerWidth,fail:document.querySelector('#fail').classList.contains('show'),controls:{x:c.x,y:c.y,width:c.width,height:c.height,right:c.right,bottom:c.bottom},hint};}""")
        ok=data['overflow']<=1 and not data['fail'] and data['controls']['x']>=-1 and data['controls']['right']<=w+1 and data['controls']['bottom']<=h+1 and not local
        if h<560 and w>h: ok=ok and data['hint']=='none'
        rows.append({'viewport':f'{w}x{h}','ok':ok,**data,'errors':local})
        page.close()
    browser.close()
(ROOT/'qa'/'browser-matrix.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))
if not all(r['ok'] for r in rows): raise SystemExit(1)
