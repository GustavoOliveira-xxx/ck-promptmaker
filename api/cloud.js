import {randomBytes} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {json,guard,sign} from './_shared.js';

export const MAX_CHUNK = 4_300_000;
const SPACE = /^[a-z0-9-]{1,40}$/;
const KEY = /^[A-Za-z0-9_-]{1,90}\.[0-9a-z]{1,12}$/;
const blobSdk = () => import('@vercel/blob');
const root = (secret, space) => 'cloud/'+sign(secret, 'cloud|'+space)+'/';

async function listAll(sdk, prefix, token) {
 const out = [];
 let cursor;
 do {
  const page = await sdk.list({prefix, cursor, limit:1000, token});
  out.push(...page.blobs);
  cursor = page.hasMore ? page.cursor : undefined;
 } while(cursor);
 return out;
}
async function remove(sdk, urls, token) {
 for(let i=0;i<urls.length;i+=500) await sdk.del(urls.slice(i,i+500), {token});
}
const keyOf = (pathname, base) => pathname.slice(base.length+6).split('/')[0];
export function keysIn(body) {
 const state = JSON.parse(gunzipSync(Buffer.from(body)).toString('utf8'));
 if(!Array.isArray(state?.files)) throw new Error('Estado inválido.');
 return new Set(state.files.map(f=>f.key).filter(Boolean));
}

export async function handle(request, {env=process.env, blob, fetch:fetch_=fetch, now=Date.now()}={}) {
 const gate = guard(request, env, {methods:'POST, OPTIONS', max:900});
 if(gate.response) return gate.response;
 const ready = !!env.BLOB_READ_WRITE_TOKEN && !!env.CK_ACCESS_CODE;
 if(request.method==='GET') return json({ok:true, configured:ready}, 200, gate.cors);
 if(!ready) return json({error:'A nuvem precisa de BLOB_READ_WRITE_TOKEN e CK_ACCESS_CODE configurados na Vercel.'}, 503, gate.cors);
 const token = env.BLOB_READ_WRITE_TOKEN;
 const url = new URL(request.url);
 const action = url.searchParams.get('action')||'';
 const space = url.searchParams.get('space')||'default';
 if(!SPACE.test(space)) return json({error:'Perfil inválido.'}, 400, gate.cors);
 const base = root(token, space);
 const sdk = blob || await blobSdk();
 try {
  if(action==='state') {
   const states = (await listAll(sdk, base+'state/', token)).sort((a,b)=>a.pathname<b.pathname?1:-1);
   if(!states.length) return new Response(null, {status:204, headers:{'Cache-Control':'no-store', ...gate.cors}});
   const response = await fetch_(states[0].url, {cache:'no-store'});
   if(!response.ok) throw new Error('state '+response.status);
   return new Response(await response.arrayBuffer(), {status:200, headers:{'Content-Type':'application/octet-stream', 'Cache-Control':'no-store', 'X-CK-State':states[0].pathname.slice(base.length+6), ...gate.cors}});
  }
  if(action==='save-state') {
   const body = await request.arrayBuffer();
   if(!body.byteLength || body.byteLength>MAX_CHUNK) return json({error:'Os textos ficaram grandes demais para a nuvem.'}, 413, gate.cors);
   let keep;
   try { keep = keysIn(body); } catch { return json({error:'Estado da nuvem inválido.'}, 400, gate.cors); }
   const name = now.toString(36).padStart(10,'0')+'-'+randomBytes(4).toString('hex');
   await sdk.put(base+'state/'+name, body, {access:'public', contentType:'application/octet-stream', addRandomSuffix:false, token});
   const older = (await listAll(sdk, base+'state/', token)).sort((a,b)=>a.pathname<b.pathname?1:-1).slice(3);
   const stale = (await listAll(sdk, base+'files/', token)).filter(b=>!keep.has(keyOf(b.pathname, base)) && now-new Date(b.uploadedAt).getTime()>86400000);
   await remove(sdk, [...older, ...stale].map(b=>b.url), token);
   return json({state:name}, 200, gate.cors);
  }
  if(action==='put' || action==='get') {
   const key = url.searchParams.get('key')||'';
   const part = Number(url.searchParams.get('n'));
   if(!KEY.test(key) || !Number.isInteger(part) || part<0 || part>99) return json({error:'Parte de arquivo inválida.'}, 400, gate.cors);
   const path = base+'files/'+key+'/'+String(part).padStart(2,'0');
   if(action==='put') {
    const body = await request.arrayBuffer();
    if(!body.byteLength || body.byteLength>MAX_CHUNK) return json({error:'Parte de arquivo grande demais.'}, 413, gate.cors);
    await sdk.put(path, body, {access:'public', contentType:'application/octet-stream', addRandomSuffix:false, allowOverwrite:true, token});
    return json({ok:true}, 200, gate.cors);
   }
   const info = await sdk.head(path, {token}).catch(()=>null);
   if(!info) return json({error:'Arquivo não encontrado na nuvem.'}, 404, gate.cors);
   const response = await fetch_(info.url);
   if(!response.ok) throw new Error('file '+response.status);
   return new Response(await response.arrayBuffer(), {status:200, headers:{'Content-Type':'application/octet-stream', 'Cache-Control':'no-store', ...gate.cors}});
  }
  if(action==='keys') {
   const keys = new Set((await listAll(sdk, base+'files/', token)).map(b=>keyOf(b.pathname, base)));
   return json({keys:[...keys]}, 200, gate.cors);
  }
  return json({error:'Ação desconhecida.'}, 400, gate.cors);
 } catch(error) {
  console.error('cloud', action, error?.message);
  return json({error:'A nuvem não respondeu agora. Seus dados continuam salvos neste aparelho.'}, 502, gate.cors);
 }
}

export const POST = request => handle(request);
export const GET = request => handle(request);
export const OPTIONS = request => handle(request);
