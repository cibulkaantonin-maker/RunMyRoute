const CACHE="runmyroute-v1";
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["/","/manifest.webmanifest"]))));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).catch(()=>caches.match("/"))));});