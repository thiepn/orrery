const JPL='https://ssd.jpl.nasa.gov/api/horizons.api';
const JPL_LOOKUP='https://ssd.jpl.nasa.gov/api/horizons_lookup.api';
const DEFAULT_QUANTITIES='2,4,9,10,13,20,21,23,24,29,47';
const MAX_TARGET=80;

function json(data,status=200,origin='*'){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':origin,'access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin'}});
}
function q(v){return `'${String(v)}'`;}
function safeTarget(v){v=String(v||'').trim();if(!v||v.length>MAX_TARGET||/[\r\n]/.test(v))throw new Error('Invalid Horizons target command.');return v;}
function safeNum(v,min,max,name){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`Invalid ${name}.`);return n;}
function csvLine(line){const out=[];let cur='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){out.push(cur.trim());cur='';}else cur+=ch;}out.push(cur.trim());return out.map(x=>x.replace(/^"|"$/g,''));}
function extractTable(result){
  const lines=String(result||'').split(/\r?\n/),si=lines.findIndex(x=>x.includes('$$SOE')),ei=lines.findIndex(x=>x.includes('$$EOE'));
  if(si<0||ei<0||ei<=si)throw new Error('Horizons response did not contain an ephemeris table.');
  const rows=lines.slice(si+1,ei).filter(x=>x.trim()&&x.includes(',')).map(csvLine);
  if(!rows.length)throw new Error('Horizons returned an empty ephemeris table.');
  let header=[];
  for(let i=si-1;i>=0;i--){if(lines[i].includes(',')&&!/^\s*[-]+/.test(lines[i])){const h=csvLine(lines[i]);if(h.length>=rows[0].length-2){header=h;break;}}}
  if(!header.length)header=rows[0].map((_,i)=>`col${i}`);
  while(header.length<rows[0].length)header.push(`col${header.length}`);
  return {columns:header,rows};
}
function findCol(columns,patterns){const lower=columns.map(x=>String(x).toLowerCase());for(const p of patterns){const re=p instanceof RegExp?p:new RegExp(p,'i');const i=lower.findIndex(x=>re.test(x));if(i>=0)return i;}return -1;}
function num(v){if(v==null)return null;const m=String(v).replace(/[<>]/g,'').match(/[-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?/);return m?Number(m[0]):null;}
function strAt(row,i){return i>=0&&i<row.length?String(row[i]).trim():null;}
function numAt(row,i){return num(strAt(row,i));}
function normalizeObserver(table){
  const c=table.columns,r=table.rows[0];
  const idx=(...ps)=>findCol(c,ps);
  const ra=idx(/r\.a\._\(a-app/,/r\.a.*apparent/,/^ra$/),dec=idx(/^dec(?:_|\.|$)/,/dec.*appar/),az=idx(/azi/,/^az$/),el=idx(/elev/,/^el$/),mag=idx(/apmag/,/t-mag/),illum=idx(/illu%/),diam=idx(/ang-diam/),range=idx(/^delta$/,/[ _]delta[ _]?$/),rr=idx(/deldot/),lt=idx(/1-way.*lt/),elong=idx(/s-o-t/),phase=idx(/s-t-o/),cnst=idx(/cnst/),motion=idx(/sky_motion/),pa=idx(/sky_mot_pa/),rva=idx(/relvel-ang/);
  let time=null;for(let i=0;i<c.length;i++){if(/date|calendar|jd/i.test(c[i])){time=strAt(r,i);break;}}if(!time)time=strAt(r,0);
  let elongCode=null;if(elong>=0){const es=strAt(r,elong)||'';const ei=idx(/^\/r$/,/elong.*code/);const cs=(ei>=0?strAt(r,ei):'')||es;const m=cs.match(/\/[TL?*]/);if(m)elongCode=m[0];}
  return {time,raDeg:numAt(r,ra),decDeg:numAt(r,dec),azDeg:numAt(r,az),elevDeg:numAt(r,el),magnitude:numAt(r,mag),illumPct:numAt(r,illum),angularDiameterArcsec:numAt(r,diam),rangeAu:numAt(r,range),rangeRateKms:numAt(r,rr),lightTimeMin:numAt(r,lt),elongationDeg:numAt(r,elong),elongationCode:elongCode,phaseDeg:numAt(r,phase),constellation:strAt(r,cnst),skyMotionArcsecMin:numAt(r,motion),skyMotionPaDeg:numAt(r,pa),relativeVelocityAngleDeg:numAt(r,rva),rawRow:r};
}
function normalizeElements(table){
  const c=table.columns,r=table.rows[0],idx=(...ps)=>findCol(c,ps);
  return {epochJD:numAt(r,idx(/jdtdb/,/jd.*tdb/,/^jd$/)),e:numAt(r,idx(/^ec$/,/eccentric/)),qAu:numAt(r,idx(/^qr$/,/peri.*dist/)),inclinationDeg:numAt(r,idx(/^in$/,/incl/)),nodeDeg:numAt(r,idx(/^om$/,/node/)),argPeriDeg:numAt(r,idx(/^w$/,/arg.*peri/)),meanAnomalyDeg:numAt(r,idx(/^ma$/,/mean.*anom/)),trueAnomalyDeg:numAt(r,idx(/^ta$/,/true.*anom/)),aAu:numAt(r,idx(/^a$/,/semi.*major/)),periodDays:numAt(r,idx(/^pr$/,/period/)),rawRow:r};
}
function targetName(result){const m=String(result||'').match(/Target body name:\s*([^\n\r{]+)/i);return m?m[1].trim():null;}
async function lookupTarget(search){search=safeTarget(search);const u=new URL(JPL_LOOKUP);u.searchParams.set('sstr',search);u.searchParams.set('format','json');const res=await fetch(u.toString(),{headers:{'Accept':'application/json','User-Agent':'The-Orrery-Precision-Proxy/1.0'}});const data=await res.json().catch(()=>null);if(!res.ok||!data)throw new Error(data?.message||data?.error||`Horizons Lookup HTTP ${res.status}`);const rows=Array.isArray(data.result)?data.result:[];return {ok:true,source:'NASA/JPL Horizons Lookup',signature:data.signature||null,count:Number(data.count||rows.length||0),results:rows.slice(0,25).map(x=>({name:x.name||null,type:x.type||null,pdes:x.pdes||null,spkid:x.spkid||null,alias:Array.isArray(x.alias)?x.alias:[],command:x.spkid||x.pdes||x.name}))};}
async function horizons(params){
  const u=new URL(JPL);u.searchParams.set('format','json');for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null)u.searchParams.set(k,v);
  const res=await fetch(u.toString(),{headers:{'Accept':'application/json','User-Agent':'The-Orrery-Precision-Proxy/1.0'}});const data=await res.json().catch(()=>null);if(!res.ok)throw new Error(data?.message||data?.error||`Horizons HTTP ${res.status}`);if(!data||data.error)throw new Error(data?.error||'Invalid Horizons response.');if(/No matches found|Cannot interpret|No ephemeris/i.test(data.result||''))throw new Error((data.result||'Horizons query failed.').slice(0,500));return data;
}
function observerParams(target,jd,lat,lon,elev,extra={}){return {COMMAND:q(target),OBJ_DATA:q('NO'),MAKE_EPHEM:q('YES'),EPHEM_TYPE:q('OBSERVER'),CENTER:q('coord@399'),COORD_TYPE:q('GEODETIC'),SITE_COORD:q(`${lon},${lat},${elev}`),TLIST:q(jd),TLIST_TYPE:q('JD'),TIME_TYPE:q('UT'),TIME_DIGITS:q('SECONDS'),ANG_FORMAT:q('DEG'),APPARENT:q('AIRLESS'),RANGE_UNITS:q('AU'),EXTRA_PREC:q('YES'),CSV_FORMAT:q('YES'),QUANTITIES:q(extra.quantities||DEFAULT_QUANTITIES)};}
async function observer(target,jd,lat,lon,elev){const data=await horizons(observerParams(target,jd,lat,lon,elev));const table=extractTable(data.result);return {ok:true,source:'NASA/JPL Horizons',signature:data.signature||null,targetName:targetName(data.result),observer:normalizeObserver(table),table:{columns:table.columns,row:table.rows[0]}};}
function elementCenterForTarget(target){const t=String(target||'').trim();if(t==='301')return '500@399';if(/^50[1-4]$/.test(t))return '500@599';if(/^(602|605|606|608)$/.test(t))return '500@699';if(t==='801')return '500@899';return '500@10';}
async function elements(target,jd){const center=elementCenterForTarget(target);const data=await horizons({COMMAND:q(target),OBJ_DATA:q('NO'),MAKE_EPHEM:q('YES'),EPHEM_TYPE:q('ELEMENTS'),CENTER:q(center),TLIST:q(jd),TLIST_TYPE:q('JD'),TIME_TYPE:q('TDB'),OUT_UNITS:q('AU-D'),CSV_FORMAT:q('YES')});const table=extractTable(data.result);return {ok:true,source:'NASA/JPL Horizons',signature:data.signature||null,targetName:targetName(data.result),center:center,elements:normalizeElements(table),table:{columns:table.columns,row:table.rows[0]}};}
async function series(target,startJD,stopJD,lat,lon,elev,step='10 m',quantities='2,13,20,23'){
  const data=await horizons({...observerParams(target,startJD,lat,lon,elev,{quantities}),START_TIME:q('JD '+startJD),STOP_TIME:q('JD '+stopJD),STEP_SIZE:q(step),TLIST:undefined,TLIST_TYPE:undefined});
  const table=extractTable(data.result);return {columns:table.columns,rows:table.rows.map(r=>({raw:r,observer:normalizeObserver({columns:table.columns,rows:[r]})}))};
}
function angularSeparationDeg(a,b){if(!Number.isFinite(a.raDeg)||!Number.isFinite(b.raDeg)||!Number.isFinite(a.decDeg)||!Number.isFinite(b.decDeg))return null;const ra1=a.raDeg*Math.PI/180,ra2=b.raDeg*Math.PI/180,d1=a.decDeg*Math.PI/180,d2=b.decDeg*Math.PI/180;return Math.acos(Math.max(-1,Math.min(1,Math.sin(d1)*Math.sin(d2)+Math.cos(d1)*Math.cos(d2)*Math.cos(ra1-ra2))))*180/Math.PI;}
function groupSamples(samples,labelFn){const events=[];let cur=null;for(const s of samples){const label=labelFn(s);if(label){if(!cur||cur.label!==label){if(cur)events.push(cur);cur={label,type:label,start:s.time,end:s.time,best:s};}else cur.end=s.time;if((s.metric??Infinity)<(cur.best.metric??Infinity))cur.best=s;}else if(cur){events.push(cur);cur=null;}}if(cur)events.push(cur);return events.map(e=>({label:e.label,type:e.type,time:e.best.time||e.start,detail:e.best.detail||`sampled ${e.start} – ${e.end}`}));}
async function eventScan(type,target,jd,lat,lon,elev){
  const start=jd-7,stop=jd+7;
  if(type==='satellite'){
    const t=await series(target,start,stop,lat,lon,elev,'10 m','2,12,13,20');const vi=findCol(t.columns,[/ang-sep\/v/,/ang-sep/]),vci=findCol(t.columns,[/^\/v$/,/visibility/]);const timei=findCol(t.columns,[/date/,/calendar/,/jd/]);const samples=t.rows.map(x=>{const raw=strAt(x.raw,vi)||'',vc=strAt(x.raw,vci)||raw;const code=(vc.match(/\/[tOpPuU*\-]/)||[])[0]||'';return {time:strAt(x.raw,timei)||x.observer.time,code,metric:num(raw),detail:(raw+' '+vc).trim()};});return groupSamples(samples,s=>({"/t":"SATELLITE TRANSIT","/O":"SATELLITE OCCULTATION","/p":"PARTIAL UMBRAL ECLIPSE","/P":"OCCULTED + PARTIAL ECLIPSE","/u":"TOTAL UMBRAL ECLIPSE","/U":"OCCULTED + TOTAL ECLIPSE"}[s.code]||null));
  }
  if(type==='solar-eclipse'||type==='solar-transit'){
    const targetCmd=type==='solar-eclipse'?'301':target;const a=await series(targetCmd,start,stop,lat,lon,elev,'10 m','2,13,20,23'),sun=await series('10',start,stop,lat,lon,elev,'10 m','2,13,20');const n=Math.min(a.rows.length,sun.rows.length),samples=[];for(let i=0;i<n;i++){const x=a.rows[i].observer,y=sun.rows[i].observer,sep=x.elongationDeg!=null?x.elongationDeg:angularSeparationDeg(x,y),lim=((x.angularDiameterArcsec||0)+(y.angularDiameterArcsec||0))/7200,front=type==='solar-eclipse'||(x.rangeAu!=null&&y.rangeAu!=null&&x.rangeAu<y.rangeAu);samples.push({time:x.time,metric:sep,detail:`center separation ${sep==null?'?':sep.toFixed(4)}°`,active:front&&sep!=null&&lim>0&&sep<=lim});}return groupSamples(samples,s=>s.active?(type==='solar-eclipse'?'SOLAR ECLIPSE':'SOLAR TRANSIT'):null);
  }
  if(type==='occultation'){
    const a=await series(target,start,stop,lat,lon,elev,'10 m','2,13,20'),moon=await series('301',start,stop,lat,lon,elev,'10 m','2,13,20'),n=Math.min(a.rows.length,moon.rows.length),samples=[];for(let i=0;i<n;i++){const x=a.rows[i].observer,y=moon.rows[i].observer,sep=angularSeparationDeg(x,y),lim=((x.angularDiameterArcsec||0)+(y.angularDiameterArcsec||0))/7200;const moonFront=x.rangeAu!=null&&y.rangeAu!=null&&y.rangeAu<x.rangeAu;samples.push({time:x.time,metric:sep,detail:`Moon separation ${sep==null?'?':sep.toFixed(4)}°`,active:moonFront&&sep!=null&&lim>0&&sep<=lim});}return groupSamples(samples,s=>s.active?'MOON OCCULTATION':null);
  }
  throw new Error('Unsupported precision event type.');
}
function cleanParams(obj){return Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==undefined&&v!==null));}
async function cached(request,env,ctx,producer){const cache=caches.default,key=new Request(request.url,{method:'GET'}),hit=await cache.match(key);if(hit)return hit;const data=await producer();const origin=env?.ALLOWED_ORIGIN||'*',res=json(data,200,origin);const copy=new Response(res.body,{status:res.status,headers:new Headers(res.headers)});copy.headers.set('cache-control','public, max-age=300, s-maxage=21600');ctx.waitUntil(cache.put(key,copy.clone()));return copy;}

export default {async fetch(request,env,ctx){const origin=env?.ALLOWED_ORIGIN||'*',requestOrigin=request.headers.get('Origin')||'';if(origin!=='*'&&requestOrigin!==origin)return json({ok:false,error:'Origin not allowed'},403,origin);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type','x-content-type-options':'nosniff','vary':'Origin'}});if(request.method!=='GET')return json({ok:false,error:'GET only'},405,origin);const u=new URL(request.url),path=u.pathname.replace(/\/+$/,'');try{
  if(path.endsWith('/health'))return json({ok:true,service:'The Orrery precision proxy',upstream:'NASA/JPL Horizons API',version:'1.0.0'},200,origin);
  if(path.endsWith('/lookup')){const search=safeTarget(u.searchParams.get('q'));return cached(request,env,ctx,()=>lookupTarget(search));}
  const target=safeTarget(u.searchParams.get('target'));const jd=safeNum(u.searchParams.get('jd'),-2000000,6000000,'Julian date');
  if(path.endsWith('/observer')){const lat=safeNum(u.searchParams.get('lat'),-90,90,'latitude'),lon=safeNum(u.searchParams.get('lon'),-180,180,'longitude'),elev=safeNum(u.searchParams.get('elev')||0,-1,20,'elevation');return cached(request,env,ctx,()=>observer(target,jd,lat,lon,elev));}
  if(path.endsWith('/elements'))return cached(request,env,ctx,()=>elements(target,jd));
  if(path.endsWith('/events')){const lat=safeNum(u.searchParams.get('lat'),-90,90,'latitude'),lon=safeNum(u.searchParams.get('lon'),-180,180,'longitude'),elev=safeNum(u.searchParams.get('elev')||0,-1,20,'elevation'),type=String(u.searchParams.get('type')||'');if(!['solar-eclipse','solar-transit','satellite','occultation'].includes(type))throw new Error('Invalid event type.');return cached(request,env,ctx,async()=>({ok:true,source:'NASA/JPL Horizons',resolutionMinutes:10,events:await eventScan(type,target,jd,lat,lon,elev)}));}
  return json({ok:false,error:'Unknown route'},404,origin);
}catch(e){return json({ok:false,error:e.message||String(e)},400,origin);}}};

export {csvLine,extractTable,normalizeObserver,normalizeElements,angularSeparationDeg,groupSamples,safeTarget,elementCenterForTarget};
