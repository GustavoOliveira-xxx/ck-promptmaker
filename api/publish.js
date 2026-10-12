import {randomBytes} from 'node:crypto';
import {json,guard,sign,sameSecret} from './_shared.js';
import {pageHTML} from '../src/page-html.js';
import {safeName} from '../src/core.js';

export const MAX_UPLOAD = 4_300_000;
const DAY = 86400000;
const TOKEN_TTL = 3600000;
export const ID = /^(e[0-9a-z]{1,8}|n)-[A-Za-z0-9_-]{22}$/;
export const expiryOf = id => id.startsWith('n-') ? null : parseInt(id.slice(1,id.indexOf('-')),36)*DAY;
export function newId(days, now=Date.now()) {
 const random = randomBytes(16).toString('base64url');
 return days ? 'e'+Math.ceil((now+days*DAY)/DAY).toString(36)+'-'+random : 'n-'+random;
}
const blobSdk = () => import('@vercel/blob');
const uploadToken = (secret, id, at=Date.now()) => at+'.'+sign(secret,'up|'+id+'|'+at);
export const deleteToken = (secret, id) => sign(secret,'del|'+id);
function validUpload(secret, id, token, now=Date.now()) {
 const [at, mac] = String(token||'').split('.');
 return ID.test(id||'') && Number(at)>now-TOKEN_TTL && Number(at)<=now+60000 && sameSecret(mac||'', sign(secret,'up|'+id+'|'+at));
}
const text = (v, max) => typeof v==='string' ? v.slice(0,max) : '';

export async function handle(request, {env=process.env, blob}={}) {
 const gate = guard(request, env, {methods:'POST, OPTIONS', max:150});
 if(gate.response) return gate.response;
 if(request.method==='GET') return json({ok:true, configured:!!env.BLOB_READ_WRITE_TOKEN}, 200, gate.cors);
 const secret = env.BLOB_READ_WRITE_TOKEN;
 if(!secret) return json({error:'O armazenamento de páginas não está configurado neste servidor.'}, 503, gate.cors);
 const sdk = blob || await blobSdk();
 const url = new URL(request.url);
 const origin = (env.PUBLIC_URL || url.origin).replace(/\/$/,'');
 try {
  if(url.searchParams.get('action')==='file') {
   const id = url.searchParams.get('id')||'';
   if(!validUpload(secret, id, request.headers.get('x-ck-token'))) return json({error:'Envio expirado. Gere o link de novo.'}, 403, gate.cors);
   const body = await request.arrayBuffer();
   if(!body.byteLength || body.byteLength>MAX_UPLOAD) return json({error:'Arquivo grande demais para o link.'}, 413, gate.cors);
   const name = safeName(url.searchParams.get('name')||'arquivo');
   const index = String(Math.min(999,Math.max(1,Number(url.searchParams.get('n'))||1))).padStart(3,'0');
   const stored = await sdk.put('pages/'+id+'/arquivos/'+index+'-'+name, body, {access:'public', contentType:request.headers.get('content-type')||'application/octet-stream', addRandomSuffix:false, token:secret});
   return json({url:stored.url}, 200, gate.cors);
  }
  const data = await request.json();
  if(data.action==='start') {
   const days = [1,7,30,90].includes(Number(data.days)) ? Number(data.days) : 0;
   const id = newId(days);
   return json({id, token:uploadToken(secret, id), expiresAt:expiryOf(id)}, 200, gate.cors);
  }
  if(data.action==='finish') {
   if(!validUpload(secret, data.id, data.token)) return json({error:'Envio expirado. Gere o link de novo.'}, 403, gate.cors);
   const documents = (Array.isArray(data.documents) ? data.documents : []).slice(0,60).map(d=>({name:text(d?.name,200)||'arquivo', status:text(d?.status,120), warning:text(d?.warning,600), text:text(d?.text,3_000_000), url:/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/pages\//.test(d?.url||'') ? d.url : ''}));
   const html = pageHTML({title:text(data.title,200)||'Atividade', prompt:text(data.prompt,400_000), documents}, documents.map(d=>d.url));
   await sdk.put('pages/'+data.id+'/index.html', html, {access:'public', contentType:'text/html; charset=utf-8', addRandomSuffix:false, token:secret});
   return json({id:data.id, url:origin+'/p/'+data.id, expiresAt:expiryOf(data.id), deleteToken:deleteToken(secret, data.id)}, 200, gate.cors);
  }
  if(data.action==='delete') {
   if(!ID.test(data.id||'') || !sameSecret(String(data.deleteToken||''), deleteToken(secret, data.id))) return json({error:'Este link não pode ser apagado daqui.'}, 403, gate.cors);
   const found = await sdk.list({prefix:'pages/'+data.id+'/', token:secret});
   if(found.blobs.length) await sdk.del(found.blobs.map(b=>b.url), {token:secret});
   return json({deleted:found.blobs.length}, 200, gate.cors);
  }
  return json({error:'Ação desconhecida.'}, 400, gate.cors);
 } catch(error) {
  console.error('publish', error?.message);
  return json({error:'Não foi possível salvar a página agora. Tente de novo em instantes.'}, 502, gate.cors);
 }
}

export const POST = request => handle(request);
export const GET = request => handle(request);
export const OPTIONS = request => handle(request);
