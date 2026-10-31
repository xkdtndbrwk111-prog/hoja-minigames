// Network first, so an update reaches players at once; the saved copy is only for when the network is gone.
const CACHE='hoja-minigames-1';
const FILES=['./','manifest.webmanifest','icon-180.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{
    if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request.mode==='navigate'?'./':e.request,copy));}
    return r;
  }).catch(()=>caches.match(e.request.mode==='navigate'?'./':e.request,{ignoreSearch:true})));
});
