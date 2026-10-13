export function memoryBlob(clock=()=>Date.now()) {
 const store = new Map();
 return {store,
  put:async(path,body,options)=>{if(store.has(path)&&!options.allowOverwrite)throw new Error('exists');store.set(path,{url:'https://blob.test/'+path,body:Buffer.from(body),uploadedAt:new Date(clock()).toISOString()});return {url:'https://blob.test/'+path};},
  head:async path=>{if(!store.has(path))throw new Error('not found');return {url:store.get(path).url};},
  list:async({prefix})=>({blobs:[...store].filter(([k])=>k.startsWith(prefix)).map(([pathname,v])=>({pathname,url:v.url,uploadedAt:v.uploadedAt})),hasMore:false}),
  del:async urls=>{for(const [k,v] of store)if(urls.includes(v.url))store.delete(k);},
  fetch:async url=>{const hit=[...store.values()].find(v=>v.url===url);return hit?new Response(hit.body):new Response('',{status:404});}
 };
}
