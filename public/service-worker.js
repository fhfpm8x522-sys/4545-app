const PUBLIC_CACHE='4545-public-shell-v1';
const ROOT=self.registration.scope;
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(PUBLIC_CACHE);const shellUrl=new URL(ROOT);shellUrl.searchParams.set('app_shell_version',PUBLIC_CACHE);const response=await fetch(shellUrl,{cache:'reload'});if(!response.ok)throw new Error('App shell unavailable');await cache.put(ROOT,response);const manifest=await fetch(new URL('offline-assets.json',ROOT),{cache:'reload'});if(manifest.ok){const assets=await manifest.json();const valid=Array.isArray(assets)?assets.filter(path=>typeof path==='string'&&/^assets\/[A-Za-z0-9._-]+\.(js|css)$/.test(path)).slice(0,250):[];await Promise.all(valid.map(async path=>{const url=new URL(path,ROOT).href;const r=await fetch(url);if(!r.ok)throw new Error('Offline asset unavailable');await cache.put(url,r);}));}await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('4545-public-shell-')&&key!==PUBLIC_CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(ROOT);if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok&&url.pathname===scope.pathname&&[...url.searchParams.keys()].every(key=>key==='app_reload')){const cache=await caches.open(PUBLIC_CACHE);await cache.put(ROOT,response.clone());}return response;}catch{const cached=await caches.match(ROOT);if(cached)return cached;return new Response('אין חיבור ואין עדיין עותק שמור. פתח את 45:45 פעם אחת עם חיבור לאינטרנט.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());return;}
 if(url.search||!url.pathname.startsWith(scope.pathname+'assets/')||!/[A-Za-z0-9._-]+\.(js|css)$/.test(url.pathname))return;
 event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const r=await fetch(request);if(r.ok){const cache=await caches.open(PUBLIC_CACHE);await cache.put(request,r.clone());}return r;})());
});
self.addEventListener('push',event=>{
 let data={title:'45:45',body:'עדכון חדש מהקבוצה שלך',url:self.registration.scope};try{data={...data,...event.data.json()};}catch{}
 event.waitUntil(self.registration.showNotification(data.title,{body:data.body,tag:data.tag||'4545',icon:new URL('icon.svg',self.registration.scope).href,data:{url:data.url}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();let url=new URL(event.notification.data?.url||self.registration.scope,self.registration.scope);if(url.origin!==self.location.origin)url=new URL(self.registration.scope);
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const existing=windows.find(w=>w.url.startsWith(self.registration.scope));if(existing){await existing.navigate(url.href);return existing.focus();}return clients.openWindow(url.href);}));
});
