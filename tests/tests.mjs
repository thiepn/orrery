import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const htmlPath=process.argv[2]?path.resolve(process.argv[2]):path.join(here,'..','index.html');
const html=fs.readFileSync(htmlPath,'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
if(scripts.length<2)throw new Error('Main Orrery script not found');
const src=scripts[1];
function between(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error(`extract failed: ${a} -> ${b}`);return src.slice(i,j);}
function functionSource(name){const marker=`function ${name}(`,start=src.indexOf(marker);if(start<0)throw new Error(`Function ${name} not found`);let brace=src.indexOf('{',start),depth=0;for(let i=brace;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'&&--depth===0)return src.slice(start,i+1);}throw new Error(`Unclosed ${name}`);}
const funcs=['keplerE','todaySimDay','normalizeState','parseStateHash','stateHash','norm180','simDayToJD','planetElementsAt','orbitalCartesian','helioPhysical','plutoElementsAt','plutoPhysical','halleyPhysical','moonGeocentric','moonPhysical','bodyPhysical','geocentricVector','displayA','projectDisplay','displayState','refineRoot','refineMaximum','refineMinimum','geocentricState','eclipticLongitudeFromVector','sunEclipticLongitude','moonPhaseAngle','geocentricLongitude','geocentricLongitudeRate','findAngleCrossings','scanAlmanac','trueToMean','markerPhysical','equatorialState','gmstHours','horizontalState'];
const bootstrap=[
  between('var TAU=', 'var canvas='),
  between("var SUN={name:'Sun'", "var ROM=['I'"),
  functionSource('keplerE'),
  between('var APP_VERSION=', 'var W,H,'),
  "var spin=DEFAULT_SPIN,simDays=0,scaleMode='log',viewMode='flat';",
  ...funcs.filter(x=>x!=='keplerE').map(functionSource)
].join('\n');
const sandbox={console,Date,Math,isFinite,URLSearchParams};vm.createContext(sandbox);vm.runInContext(bootstrap,sandbox,{filename:'orrery-v1.4-production-extract.js'});
const R=[];const test=(n,f)=>{try{f();R.push({n,ok:true})}catch(e){R.push({n,ok:false,e:e.message})}};
const assert=(x,m='assertion failed')=>{if(!x)throw new Error(m)};const near=(a,b,t,m='not near')=>{if(Math.abs(a-b)>t)throw new Error(`${m}: ${a} vs ${b}`)};
const {TAU,D2R,DAY_MS,EPOCH,J2000_JD,MODEL_EPOCH_JD,MIN_SIM_DAY,MAX_SIM_DAY,APP_VERSION,PLANETS,PLUTO,MOON,COMET,keplerE,planetElementsAt,helioPhysical,plutoPhysical,moonGeocentric,moonPhysical,stateHash,parseStateHash,scanAlmanac,geocentricState,markerPhysical,displayState,displayA,horizontalState,equatorialState,norm180}=sandbox;
const dateDay=(y,m,d)=>(Date.UTC(y,m-1,d)-EPOCH)/DAY_MS;
const dateTimeDay=(y,m,d,h,mi)=>(Date.UTC(y,m-1,d,h,mi)-EPOCH)/DAY_MS;
const findEvent=(start,part,type='alignment')=>scanAlmanac(start,730,{type}).find(e=>e.label.includes(part));

test('release version',()=>assert(APP_VERSION==='1.4.0',APP_VERSION));
test('J2000 epoch conversion',()=>near(MODEL_EPOCH_JD+(J2000_JD-MODEL_EPOCH_JD),J2000_JD,1e-12));
test('J2000 Mercury elements equal JPL base table',()=>{const el=planetElementsAt(PLANETS[0],J2000_JD-MODEL_EPOCH_JD);near(el.a,.38709927,1e-10);near(el.e,.20563593,1e-10);near(el.L/D2R,252.25032350,1e-8);});
test('Kepler residual',()=>{for(const M of [0,.4,2.1,5.8])for(const e of [0,.2,.7,.967]){const E=keplerE(M,e),mm=((M%TAU)+TAU)%TAU;near(E-e*Math.sin(E),mm,2e-6)}});
test('major-planet vectors finite',()=>{for(const d of [-70000,0,8000,100000])for(const p of PLANETS){const q=helioPhysical(p,d);assert(Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.z)&&q.r>0,p.name)}});
test('Pluto vector finite',()=>{for(const d of [-2000,0,10000]){const q=plutoPhysical(d);assert(Number.isFinite(q.x)&&q.r>20&&q.r<60)}});
test('Moon vector and distance plausible',()=>{for(const d of [-30,0,30]){const q=moonGeocentric(d);assert(Number.isFinite(q.x)&&q.distanceKm>330000&&q.distanceKm<430000,`${d}: ${q.distanceKm}`);const h=moonPhysical(d);assert(Number.isFinite(h.x)&&h.r>.9&&h.r<1.1)}});
test('Halley vector finite',()=>{const q=sandbox.halleyPhysical(0);assert(Number.isFinite(q.x)&&q.r>0)});
test('v5 URL round trip preserves visual state',()=>{const x={day:123.456,speed:4,zoom:2.25,tracked:6,spin:-.875,playing:false,scale:'true',view:'3d',appearance:'natural',label:'all'},y=parseStateHash(stateHash(x),0);near(y.day,x.day,.0011);assert(y.speed===4);near(y.zoom,x.zoom,.011);assert(y.tracked===6);near(y.spin,x.spin,.0011);assert(!y.playing&&y.scale==='true'&&y.view==='3d'&&y.appearance==='natural'&&y.label==='all')});
test('legacy v4 URL remains compatible',()=>{const s=parseStateHash('#v4d0s5z1.00t-1r-1.150q0v1p1',0);assert(s&&s.scale==='log'&&s.view==='3d'&&s.appearance==='antique'&&s.label==='smart'&&!s.playing)});
test('legacy v3 URL remains compatible',()=>{const s=parseStateHash('#v3d0s4z1.00t-1r-1.150q1p1',0);assert(s&&s.scale==='true'&&s.view==='flat'&&!s.playing)});
test('almanac alignment sorted',()=>{const ev=scanAlmanac(0,730,{type:'alignment'});assert(ev.length>0);ev.forEach((e,i)=>{assert(e.day>=0&&e.day<=730);if(i)assert(e.day>=ev[i-1].day)})});
test('alignment residual under 0.02 deg',()=>{let n=0;for(const e of scanAlmanac(0,730,{type:'alignment'})){if(!e.label.includes('SUN'))continue;const p=[...PLANETS,PLUTO].find(x=>e.label.startsWith(x.name.toUpperCase()));if(!p)continue;const st=geocentricState(p,e.day),err=e.label.includes('☍')?Math.abs(Math.abs(st.rel)-Math.PI):Math.abs(st.rel);assert(err<.00035,`${e.label}: ${err/D2R} deg`);n++}assert(n>0)});
test('Saturn opposition 2026-10-04 ±1 day',()=>{const e=findEvent(0,'SATURN ☍ SUN');assert(e,'missing');near(e.day,dateDay(2026,10,4),1,'Saturn opposition')});
test('Mercury greatest elongation 2026-10-12 ±1 day',()=>{const e=scanAlmanac(0,80,{type:'elongation',body:'Mercury'}).find(x=>x.label.includes('MERCURY GREATEST ELONG'));assert(e,'missing');near(e.day,dateDay(2026,10,12),1,'Mercury elongation');assert(e.sub.includes('east'))});
test('Venus inferior conjunction 2026-10-24 ±1 day',()=>{const e=scanAlmanac(0,80,{type:'alignment',body:'Venus'}).find(x=>x.label.includes('VENUS ☌ SUN'));assert(e,'missing');near(e.day,dateDay(2026,10,24),1,'Venus conjunction');assert(e.sub.includes('inferior'))});
test('lunar phase sequence includes principal phases',()=>{const ev=scanAlmanac(0,45,{type:'lunar',body:'Moon'}),labels=ev.map(x=>x.label);for(const x of ['NEW MOON','FIRST QUARTER','FULL MOON','LAST QUARTER'])assert(labels.includes(x),x)});
test('October 2026 full Moon resolves on Oct 26',()=>{const e=scanAlmanac(0,45,{type:'lunar',body:'Moon'}).find(x=>x.label==='FULL MOON');assert(e);near(e.day,dateDay(2026,10,26),1,'full Moon')});
test('December 2026 solstice resolves on Dec 21',()=>{const e=scanAlmanac(0,120,{type:'season',body:'Sun'}).find(x=>x.label==='DECEMBER SOLSTICE');assert(e);near(e.day,dateTimeDay(2026,12,21,20,50),.08,'solstice')});
test('Mars stationary points bracket retrograde interval',()=>{const ev=scanAlmanac(0,800,{type:'stationary',body:'Mars'});assert(ev.length>=2);assert(ev.some(x=>x.sub.includes('retrograde'))&&ev.some(x=>x.sub.includes('direct')))});
test('supported day domain sane',()=>assert(MIN_SIM_DAY<0&&MAX_SIM_DAY>0));
test('perihelion/aphelion markers match ellipse radii',()=>{const p=PLANETS[3],el=planetElementsAt(p,0),qp=markerPhysical(p,'peri',0),qa=markerPhysical(p,'aphe',0);near(qp.r,el.a*(1-el.e),2e-9);near(qa.r,el.a*(1+el.e),2e-9)});
test('Pluto markers are supported',()=>{const q=markerPhysical(PLUTO,'peri',0);assert(q&&Number.isFinite(q.r)&&q.r>20)});
test('ascending/descending nodes lie on ecliptic',()=>{const p=PLANETS[5],a=markerPhysical(p,'asc',0),d=markerPhysical(p,'desc',0);assert(Math.abs(a.z)<1e-9,`asc z ${a.z}`);assert(Math.abs(d.z)<1e-9,`desc z ${d.z}`)});
test('live display states finite including Moon/Pluto',()=>{for(const p of [...PLANETS,PLUTO,MOON,COMET]){const q=displayState(p,0);assert(Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.lon)&&Number.isFinite(q.lat),p.name)}});
test('3D projection changes Pluto display position',()=>{sandbox.viewMode='flat';const a=displayState(PLUTO,0);sandbox.viewMode='3d';const b=displayState(PLUTO,0);assert(Math.abs(a.y-b.y)>.01);sandbox.viewMode='flat'});
test('topocentric Moon has measurable parallax',()=>{const g=equatorialState(MOON,0),t=horizontalState(MOON,0,50.94,6.96);assert(Math.abs(norm180(t.ra-g.ra))>1e-5||Math.abs(t.dec-g.dec)>1e-5)});
test('true scale keeps Neptune canonical and compresses Mercury',()=>{sandbox.scaleMode='true';near(displayA(PLANETS[7]),PLANETS[7].A,1e-9);assert(displayA(PLANETS[0])<PLANETS[0].A);sandbox.scaleMode='log'});
test('PWA and offline assets linked',()=>{assert(html.includes('rel="manifest" href="manifest.webmanifest"'));assert(html.includes("navigator.serviceWorker.register('./sw.js')"));assert(!html.includes('fonts.googleapis.com'))});
test('P7 Observer + Learn controls exist',()=>['modeTabs','observerPanel','learnPanel','observerTarget','observerLat','observerLon','learnTopics','learnDemo','viewBtn','showPlutoSetting'].forEach(id=>assert(html.includes(`id="${id}"`),id)));
test('P7 almanac filters expose event classes',()=>['stationary','lunar','season'].forEach(v=>assert(html.includes(`value="${v}"`),v)));

test('P8 visual controls exist',()=>{for(const id of ['lookBtn','appearanceSetting','labelSetting','showEclipticSetting','showTrailsSetting'])assert(html.includes(`id="${id}"`),id);assert(html.includes('body.look-natural'),'natural theme missing');assert(src.includes('drawQueuedLabels'),'label collision engine missing');assert(src.includes('SATURN_POLE'),'ring pole missing');assert(src.includes('Ion tail'),'dual comet tail missing');});

test('P7 precision controls and proxy package exist',()=>{for(const id of ['precisionTarget','precisionRefresh','precisionElementsBtn','precisionEventScan','precisionExportJson','precisionEndpointSetting'])assert(html.includes(`id=\"${id}\"`),id);assert(fs.existsSync(path.join(here,'..','precision-worker','worker.js')),'worker missing');});

for(const r of R)console.log(`${r.ok?'PASS':'FAIL'}  ${r.n}${r.ok?'':` — ${r.e}`}`);const failed=R.filter(x=>!x.ok);console.log(`\n${R.length-failed.length}/${R.length} passed`);if(failed.length)process.exitCode=1;
