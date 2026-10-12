const CACHE='ck-promptmaker-__VERSION__';
const ASSETS=__PRECACHE__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ck-promptmaker-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function receiveShare(request){
 const data=await request.formData();
 const box=await caches.open('ck-share');
 for(const key of await box.keys())await box.delete(key);
 const files=data.getAll('files').filter(f=>f&&typeof f!=='string'&&f.size).slice(0,12);
 let n=0;
 for(const file of files)await box.put('./shared/'+(n++),new Response(file,{headers:{'content-type':file.type||'application/octet-stream','x-name':encodeURIComponent(file.name||'compartilhado')}}));
 const text=[data.get('title'),data.get('text'),data.get('url')].filter(Boolean).join('\n');
 await box.put('./shared/meta',new Response(JSON.stringify({text}),{headers:{'content-type':'application/json'}}));
 return Response.redirect(new URL('./?share=1',self.registration.scope).href,303);
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method==='POST'&&url.origin===self.location.origin&&url.pathname.endsWith('/share-target')){event.respondWith(receiveShare(event.request));return;}
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/')||url.pathname.includes('/p/'))return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
