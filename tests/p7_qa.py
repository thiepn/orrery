from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
results=[]; errors=[]
def ck(name,cond,detail=''): results.append({'name':name,'ok':bool(cond),'detail':detail})
with sync_playwright() as p:
    chromium='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
    b=p.chromium.launch(headless=not bool(chromium),executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'] if chromium else [])
    page=b.new_page(viewport={'width':1366,'height':768},accept_downloads=True)
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append('console '+m.type+': '+m.text) if m.type=='error' else None)
    def route_handler(route):
        u=route.request.url
        if u.endswith('/health'):
            body={'ok':True,'service':'mock precision','upstream':'NASA/JPL Horizons API','version':'1.0.0'}
        elif '/lookup?' in u:
            body={'ok':True,'source':'NASA/JPL Horizons Lookup','count':1,'results':[{'name':'99942 Apophis','type':'asteroid (integrated barycenter)','pdes':'2004 MN4','spkid':'2099942','alias':['K04M04N'],'command':'2099942'}]}
        elif '/observer?' in u:
            body={'ok':True,'source':'NASA/JPL Horizons','targetName':'Mars (499)','observer':{'time':'2026-Sep-29 12:00:00','raDeg':123.456789,'decDeg':-12.345678,'azDeg':180.25,'elevDeg':31.75,'rangeAu':0.45678901,'rangeRateKms':-3.21001,'lightTimeMin':3.797,'magnitude':-1.23,'illumPct':88.8,'angularDiameterArcsec':12.34,'elongationDeg':45.6,'elongationCode':'/T','phaseDeg':23.4,'constellation':'Aqr','skyMotionArcsecMin':0.12345,'skyMotionPaDeg':87.6}}
        elif '/elements?' in u:
            body={'ok':True,'source':'NASA/JPL Horizons','targetName':'Mars (499)','elements':{'epochJD':2461312.5,'aAu':1.5237,'e':0.0934,'qAu':1.381,'inclinationDeg':1.85,'nodeDeg':49.56,'argPeriDeg':286.5,'meanAnomalyDeg':10.2,'trueAnomalyDeg':11.1,'periodDays':686.98}}
        elif '/events?' in u:
            body={'ok':True,'source':'NASA/JPL Horizons','resolutionMinutes':10,'events':[{'label':'SOLAR ECLIPSE','type':'SOLAR ECLIPSE','time':'2026-Oct-02 08:10:00','detail':'center separation 0.1234°'}]}
        else:
            body={'ok':False,'error':'unknown mock route'}
        route.fulfill(status=200,content_type='application/json',body=json.dumps(body))
    page.route('https://precision.test/**',route_handler)
    page.set_content(html,wait_until='load');page.wait_for_timeout(350)
    page.evaluate('()=>{if(window.finishOnboarding)finishOnboarding();playing=false;syncPlayUI();}')
    page.click('[data-mode="observe"]');page.fill('#observerLat','50.94');page.fill('#observerLon','6.96');page.fill('#observerOffset','2');page.wait_for_timeout(100)
    page.evaluate("prefs.precisionEndpoint='https://precision.test/v1';savePrefs();syncSettings();syncPrecisionUI();")
    ck('precision endpoint accepted',page.evaluate("getPrecisionEndpoint()==='https://precision.test/v1'"))
    page.click('#settingsBtn');page.fill('#precisionEndpointSetting','https://precision.test/v1');page.click('#precisionCheckBtn');page.wait_for_timeout(100)
    ck('precision health check succeeds','READY' in page.locator('#precisionBadge').inner_text(),page.locator('#precisionStatus').inner_text())
    page.click('#settingsClose')
    page.click('[data-mode="observe"]');page.wait_for_timeout(80)
    page.select_option('#precisionTarget','499');page.click('#precisionRefresh');page.wait_for_timeout(130)
    ck('precision observer result loads',page.locator('#precisionData').is_visible())
    ck('apparent RA/Dec populated','123.456789' in page.locator('#precRaDec').inner_text(),page.locator('#precRaDec').inner_text())
    ck('light time populated','3.797' in page.locator('#precLightTime').inner_text(),page.locator('#precLightTime').inner_text())
    ck('constellation populated',page.locator('#precConstellation').inner_text()=='Aqr')
    ck('export enabled',not page.locator('#precisionExportJson').is_disabled() and not page.locator('#precisionExportCsv').is_disabled())
    page.click('#precisionElementsBtn');page.wait_for_timeout(100)
    ck('osculating elements load','SEMI-MAJOR AXIS: 1.5237 AU' in page.locator('#precisionElementsData').inner_text(),page.locator('#precisionElementsData').inner_text())
    page.select_option('#precisionTarget','301');page.select_option('#precisionEventType','auto');page.click('#precisionEventScan');page.wait_for_timeout(120)
    ck('precision event scan renders', 'SOLAR ECLIPSE' in page.locator('#precisionEventResults').inner_text(),page.locator('#precisionEventResults').inner_text())
    page.fill('#precisionCommand','Apophis');page.click('#precisionLookupBtn');page.wait_for_timeout(100)
    ck('Horizons object lookup renders match','99942 Apophis' in page.locator('#precisionLookupResults').inner_text(),page.locator('#precisionLookupResults').inner_text())
    page.locator('.precision-lookup-item').first.click();page.wait_for_timeout(30)
    ck('lookup selects exact Horizons command',page.evaluate("precisionTargetCommand()==='2099942'"),page.input_value('#precisionCommand'))
    page.click('#precisionRefresh');page.wait_for_timeout(100)
    ck('arbitrary looked-up target can fetch precision data',page.locator('#precisionData').is_visible())
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150)
    box=page.locator('#observerPanel').bounding_box();ck('precision observer panel fits mobile viewport',box and box['x']>=-1 and box['x']+box['width']<=391 and box['y']>=0 and box['y']+box['height']<=845,str(box))
    ck('precision panel has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    page.screenshot(path=str(ROOT/'qa'/'p7-precision-mobile.png'))
    page.set_viewport_size({'width':1366,'height':768});page.screenshot(path=str(ROOT/'qa'/'p7-precision-desktop.png'))
    unit=page.evaluate('OrreryTests.run()');ck('embedded scientific suite still passes',unit['failed']==0,f"{unit['passed']}/{unit['total']}")
    b.close()
report={'results':results,'errors':errors}
(ROOT/'qa'/'p7-matrix.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if errors or any(not r['ok'] for r in results):raise SystemExit(1)
