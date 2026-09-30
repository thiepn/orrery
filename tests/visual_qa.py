from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
import argparse, json
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'qa'/'baselines'; CUR=ROOT/'qa'/'current'
VIEWS=[('phone-small',320,568),('phone',390,844),('desktop',1366,768)]
parser=argparse.ArgumentParser();parser.add_argument('--update',action='store_true');args=parser.parse_args()
BASE.mkdir(parents=True,exist_ok=True);CUR.mkdir(parents=True,exist_ok=True)
html=(ROOT/'index.html').read_text()
report=[]
with sync_playwright() as pw:
    chromium='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
    browser=pw.chromium.launch(headless=not bool(chromium), executable_path=chromium, args=['--no-sandbox','--disable-dev-shm-usage'] if chromium else [])
    for name,w,h in VIEWS:
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        page.set_content(html,wait_until='load');page.wait_for_function('window.APP_VERSION === "1.4.0"');page.wait_for_timeout(300)
        page.evaluate("""()=>{if(window.finishOnboarding)finishOnboarding();playing=false;syncPlayUI();simDays=0;scaleMode='log';setScaleMode('log',false);resetView();document.body.classList.remove('ui-idle');}""")
        page.wait_for_timeout(250)
        geom=page.evaluate("""()=>({overflow:document.documentElement.scrollWidth-innerWidth,controls:document.querySelector('.controls').getBoundingClientRect().toJSON(),fail:document.querySelector('#fail').classList.contains('show')})""")
        if geom['overflow']>1 or geom['fail']:
            raise SystemExit(f'{name} geometry failure: {geom}')
        out=CUR/f'{name}-{w}x{h}.png';page.screenshot(path=str(out))
        baseline=BASE/out.name
        if args.update or not baseline.exists():
            baseline.write_bytes(out.read_bytes()); ratio=0.0; status='updated'
        else:
            a=Image.open(baseline).convert('RGB');b=Image.open(out).convert('RGB')
            if a.size!=b.size: ratio=1.0
            else:
                diff=ImageChops.difference(a,b)
                # count pixels with a meaningful (>20) channel change
                pix=diff.load();changed=0;total=a.size[0]*a.size[1]
                for y in range(a.size[1]):
                    for x in range(a.size[0]):
                        if max(pix[x,y])>20: changed+=1
                ratio=changed/total
            status='pass' if ratio<=0.02 else 'fail'
            if status=='fail': raise SystemExit(f'{name} visual diff {ratio:.2%} > 2%')
        report.append({'name':name,'viewport':[w,h],'status':status,'changed_ratio':ratio,'controls_height':geom['controls']['height']})
        page.close()
    browser.close()
print(json.dumps(report,indent=2))
