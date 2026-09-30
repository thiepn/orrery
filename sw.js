const CACHE='orrery-v1.4.0';
const ROOT=new URL('./',self.location.href).href;
const CORE=['','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('orrery-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(new URL('index.html',ROOT).href,copy));return res;}).catch(()=>caches.match(new URL('index.html',ROOT).href)));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
});
