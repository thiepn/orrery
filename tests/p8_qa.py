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
    page=b.new_page(viewport={'width':1366,'height':768})
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append('console '+m.type+': '+m.text) if m.type=='error' else None)
    page.set_content(html,wait_until='load');page.wait_for_timeout(400)
    page.evaluate("()=>{if(window.finishOnboarding)finishOnboarding();playing=false;syncPlayUI();simDays=0;resetView();setAppearance('antique',false);setLabelMode('smart',false);setViewMode('flat',false);}")
    unit=page.evaluate('OrreryTests.run()');ck('embedded P8 suite',unit['failed']==0,f"{unit['passed']}/{unit['total']}");page.evaluate("document.getElementById('testPanel').hidden=true")
    # Natural + 3D Saturn hero state
    page.evaluate("()=>{setAppearance('natural',true);setViewMode('3d',true);setLabelMode('all',true);prefs.showEcliptic=true;prefs.showTrails=true;tracked=PLANETS[5];targetZoom=zoom=1.18;syncLegend();}")
    page.wait_for_timeout(350)
    ck('natural body class active',page.evaluate("document.body.classList.contains('look-natural')"))
    ck('natural palette active',page.evaluate("PAPER==='#050a10' && INK==='#dce9f2'"))
    ck('look button synchronized',page.locator('#lookBtn').inner_text()=='LOOK · NATURAL',page.locator('#lookBtn').inner_text())
    ck('v5 share state includes natural/all labels',page.evaluate("location.hash.includes('a1l2')"),page.evaluate('location.hash'))
    ring=page.evaluate("()=>{var b=ringBasis();return {u:b.u,v:b.v,un:Math.hypot(b.u.x,b.u.y),vn:Math.hypot(b.v.x,b.v.y)}}")
    ck('projected Saturn ring basis is non-degenerate',ring['un']>.15 and ring['vn']>.15,str(ring))
    lv=page.evaluate("()=>{var v=sceneLightVector(PLANETS[5]);return {x:v.x,y:v.y,z:v.z,n:Math.hypot(v.x,v.y,v.z)}}")
    ck('scene light vector normalized',abs(lv['n']-1)<1e-6,str(lv))
    page.screenshot(path=str(ROOT/'qa'/'p8-natural-saturn-desktop.png'))
    # Appearance setting round trip through UI
    page.click('#settingsBtn');page.select_option('#appearanceSetting','antique');page.wait_for_timeout(80)
    ck('appearance setting applies antique',not page.evaluate("document.body.classList.contains('look-natural')"))
    page.select_option('#appearanceSetting','natural');page.select_option('#labelSetting','minimal');page.uncheck('#showEclipticSetting');page.uncheck('#showTrailsSetting');
    ck('visual settings persist in prefs',page.evaluate("prefs.appearanceMode==='natural'&&prefs.labelMode==='minimal'&&!prefs.showEcliptic&&!prefs.showTrails"))
    page.click('#settingsClose');page.wait_for_timeout(80)
    ck('minimal labels encoded in share state',page.evaluate("location.hash.includes('a1l0')"),page.evaluate('location.hash'))
    # Comet near 2061 perihelion
    page.evaluate("()=>{var period=365.2568983*Math.pow(COMET.au,1.5);simDays=(COMET.periJD+period-MODEL_EPOCH_JD);tracked=COMET;setLabelMode('smart',false);prefs.showTrails=true;setViewMode('3d',false);targetZoom=zoom=1.35;}")
    page.wait_for_timeout(350)
    au=page.evaluate('COMET._au')
    ck('Halley near 2061 perihelion is active',au<0.8,str(au))
    cv=page.evaluate("()=>cometVelocityDisplay(COMET,simDays)")
    ck('dust-tail velocity basis finite',abs((cv['x']**2+cv['y']**2)-1)<1e-4,str(cv))
    page.screenshot(path=str(ROOT/'qa'/'p8-halley-2061-desktop.png'))
    # Mobile natural visual state and settings containment
    page.set_viewport_size({'width':390,'height':844});page.evaluate("()=>{simDays=0;tracked=PLANETS[2];setAppearance('natural',false);setViewMode('3d',false);setLabelMode('smart',false);prefs.showEcliptic=true;prefs.showTrails=true;}");page.wait_for_timeout(300)
    page.click('#moreBtn');page.click('#settingsBtn');page.wait_for_timeout(80)
    box=page.locator('#settingsPanel').bounding_box();ck('P8 settings panel fits mobile',box and box['x']>=-1 and box['x']+box['width']<=391 and box['y']>=0 and box['y']+box['height']<=845,str(box))
    ck('no horizontal overflow in natural mobile mode',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    page.screenshot(path=str(ROOT/'qa'/'p8-natural-mobile.png'))
    page.click('#settingsClose')
    # P6/P7 surfaces retain natural theme geometry
    page.click('#moreBtn');page.click('#modeBtn');page.wait_for_timeout(120) # Observe
    ob=page.locator('#observerPanel').bounding_box();ck('Observer panel fits Natural mobile',ob and ob['x']>=-1 and ob['x']+ob['width']<=391,str(ob))
    page.screenshot(path=str(ROOT/'qa'/'p8-observer-natural-mobile.png'))
    b.close()
report={'results':results,'errors':errors}
(ROOT/'qa'/'p8-matrix.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if errors or any(not r['ok'] for r in results): raise SystemExit(1)
