import {ID,expiryOf} from './publish.js';

const CSP = "default-src 'none'; img-src https://*.public.blob.vercel-storage.com data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const notice = (status, title, message) => new Response('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+title+'</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0612;color:#f4edff;font:16px/1.6 system-ui,sans-serif;text-align:center;padding:24px}h1{color:#d7aaff}</style></head><body><main><h1>'+title+'</h1><p>'+message+'</p></main></body></html>', {status, headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':CSP,'X-Robots-Tag':'noindex','Cache-Control':'public, s-maxage=60'}});

export async function handle(request, {env=process.env, blob, fetch:request_=fetch, now=Date.now()}={}) {
 const id = new URL(request.url).searchParams.get('id')||'';
 if(!ID.test(id)) return notice(404, 'Página não encontrada', 'Confira se o link foi copiado inteiro.');
 const expires = expiryOf(id);
 if(expires && expires<now) return notice(410, 'Este link expirou', 'Quem compartilhou pode gerar um novo link no CK Promptmaker.');
 try {
  const sdk = blob || await import('@vercel/blob');
  const info = await sdk.head('pages/'+id+'/index.html', {token:env.BLOB_READ_WRITE_TOKEN});
  const response = await request_(info.url);
  if(!response.ok) throw new Error('missing');
  return new Response(await response.text(), {status:200, headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':CSP,'X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','Cache-Control':'public, s-maxage=60'}});
 } catch {
  return notice(404, 'Página não encontrada', 'O link foi apagado ou ainda está sendo criado.');
 }
}

export const GET = request => handle(request);
