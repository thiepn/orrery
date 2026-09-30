from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
results=[];errors=[]
def ck(name,cond,detail=''): results.append({'name':name,'ok':bool(cond),'detail':detail})
with sync_playwright() as p:
    chromium='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
    b=p.chromium.launch(headless=not bool(chromium),executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'] if chromium else [])
    page=b.new_page(viewport={'width':1366,'height':768})
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append('console '+m.type+': '+m.text) if m.type=='error' else None)
    page.set_content(html,wait_until='load');page.wait_for_timeout(400)
    page.evaluate('()=>{if(window.finishOnboarding)finishOnboarding();playing=false;syncPlayUI();}')

    # Observer
    page.click('[data-mode="observe"]');page.wait_for_timeout(150)
    ck('Observe mode opens',page.locator('#observerPanel').is_visible() and page.evaluate("appMode==='observe'"))
    page.fill('#observerLat','50.94');page.fill('#observerLon','6.96');page.fill('#observerOffset','2');page.select_option('#observerTarget','Moon');page.locator('#observerLat').dispatch_event('change');page.wait_for_timeout(200)
    vals=page.evaluate("()=>({ra:obsRaDec.textContent,aa:obsAltAz.textContent,d:obsDistance.textContent,ph:obsPhase.textContent,r:obsRise.textContent,s:obsSet.textContent})")
    ck('Observer RA/Dec populated','h ' in vals['ra'] and '/' in vals['ra'],vals['ra'])
    ck('Observer Alt/Az populated','° / ' in vals['aa'],vals['aa'])
    ck('Moon topocentric distance populated','km' in vals['d'],vals['d'])
    ck('Moon phase populated','%' in vals['ph'],vals['ph'])
    ck('rise/set calculation returns values',vals['r']!='—' or vals['s']!='—',f"{vals['r']} / {vals['s']}")
    page.click('#followObserverTarget');page.wait_for_timeout(100);ck('Observer follow selects Moon',page.evaluate("tracked===MOON"))

    # 3D view
    flat=page.evaluate("()=>{setViewMode('flat',false);let q=displayState(PLUTO,simDays);return [q.x,q.y]}")
    threed=page.evaluate("()=>{setViewMode('3d',false);let q=displayState(PLUTO,simDays);return [q.x,q.y]}")
    ck('3D orbital projection changes inclined body',abs(flat[1]-threed[1])>.01,f'{flat}->{threed}')
    ck('3D body class active',page.locator('body').evaluate("e=>e.classList.contains('view-3d')"))
    page.screenshot(path=str(ROOT/'qa'/'p6-observer-desktop.png'))

    # Learn
    page.click('[data-mode="learn"]');page.wait_for_timeout(100)
    ck('Learn mode opens',page.locator('#learnPanel').is_visible() and page.evaluate("appMode==='learn'"))
    page.click('[data-topic="retrograde"]');page.click('#learnDemo');page.wait_for_timeout(150)
    ck('Retrograde demo follows Mars',page.evaluate("tracked===PLANETS[3]"))
    ck('Education banner appears',page.locator('#educationBanner').is_visible())
    ck('Lesson content explains geocentric reversal','heliocentric' in page.locator('#learnContent').inner_text().lower())
    page.screenshot(path=str(ROOT/'qa'/'p6-learn-desktop.png'))

    # Almanac event types, directly call engine to avoid panel choreography
    lunar=page.evaluate("scanAlmanac(0,45,{type:'lunar',body:'Moon'}).map(e=>e.label)")
    season=page.evaluate("scanAlmanac(0,120,{type:'season',body:'Sun'}).map(e=>({label:e.label,date:fmtDate(e.day)}))")
    stations=page.evaluate("scanAlmanac(0,800,{type:'stationary',body:'Mars'}).map(e=>e.sub)")
    ck('Lunar phase events include all principal phases',all(x in lunar for x in ['NEW MOON','FIRST QUARTER','FULL MOON','LAST QUARTER']),str(lunar))
    ck('2026 December solstice date is correct to day',any(x['label']=='DECEMBER SOLSTICE' and x['date']=='21 DEC 2026' for x in season),str(season))
    ck('Mars retrograde stations include begin and resume',any('retrograde' in x for x in stations) and any('direct' in x for x in stations),str(stations))

    # Pluto setting
    page.evaluate("setAppMode('explore')");page.click('#settingsBtn');page.locator('#showPlutoSetting').uncheck();page.locator('#showPlutoSetting').dispatch_event('change');page.wait_for_timeout(60)
    ck('Pluto layer can be hidden',page.evaluate("prefs.showPluto===false") and page.locator('.lg-row').filter(has_text='Pluto').get_attribute('data-hidden')=='true')
    page.locator('#showPlutoSetting').check();page.locator('#showPlutoSetting').dispatch_event('change');page.click('#settingsClose')
    ck('Pluto layer restores',page.evaluate("prefs.showPluto===true"))

    # Mobile mode flow
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(180);page.evaluate("setAppMode('explore')")
    page.click('#moreBtn');page.click('#modeBtn');page.wait_for_timeout(100)
    ck('Mobile mode button enters Observe',page.evaluate("appMode==='observe'") and page.locator('#observerPanel').is_visible())
    ob=page.locator('#observerPanel').bounding_box();ck('Observer panel fits mobile viewport',ob and ob['x']>=-1 and ob['x']+ob['width']<=391 and ob['y']>=0 and ob['y']+ob['height']<=845,str(ob))
    page.click('#moreBtn');page.click('#modeBtn');page.wait_for_timeout(100)
    ck('Mobile mode button cycles Observe → Learn',page.evaluate("appMode==='learn'") and page.locator('#learnPanel').is_visible())
    lb=page.locator('#learnPanel').bounding_box();ck('Learn panel fits mobile viewport',lb and lb['x']>=-1 and lb['x']+lb['width']<=391 and lb['y']>=0 and lb['y']+lb['height']<=845,str(lb))
    page.click('#moreBtn');page.click('#modeBtn');page.wait_for_timeout(60);ck('Mobile mode button cycles Learn → Explore',page.evaluate("appMode==='explore'"))
    page.evaluate("setAppMode('learn')")
    ck('No horizontal overflow in P6 panels',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    page.screenshot(path=str(ROOT/'qa'/'p6-learn-mobile.png'))

    unit=page.evaluate('OrreryTests.run()');ck('Embedded P6 unit suite passes',unit['failed']==0,f"{unit['passed']}/{unit['total']}")
    b.close()
report={'results':results,'errors':errors}
(ROOT/'qa'/'p6-matrix.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if errors or any(not r['ok'] for r in results):raise SystemExit(1)
