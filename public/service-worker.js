self.addEventListener('push',event=>{
 let data={title:'45:45',body:'עדכון חדש מהקבוצה שלך',url:self.registration.scope};try{data={...data,...event.data.json()};}catch{}
 event.waitUntil(self.registration.showNotification(data.title,{body:data.body,tag:data.tag||'4545',icon:new URL('icon.svg',self.registration.scope).href,data:{url:data.url}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();let url=new URL(event.notification.data?.url||self.registration.scope,self.registration.scope);if(url.origin!==self.location.origin)url=new URL(self.registration.scope);
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const existing=windows.find(w=>w.url.startsWith(self.registration.scope));if(existing){await existing.navigate(url.href);return existing.focus();}return clients.openWindow(url.href);}));
});
