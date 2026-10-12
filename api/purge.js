import {expiryOf,ID} from './publish.js';
import {json,sameSecret} from './_shared.js';

export async function handle(request, {env=process.env, blob, now=Date.now()}={}) {
 if(!env.CRON_SECRET || !sameSecret(request.headers.get('authorization')||'', 'Bearer '+env.CRON_SECRET)) return json({error:'Não autorizado.'}, 401);
 const sdk = blob || await import('@vercel/blob');
 const expired = [];
 let cursor;
 do {
  const page = await sdk.list({prefix:'pages/', cursor, limit:1000, token:env.BLOB_READ_WRITE_TOKEN});
  for(const item of page.blobs) {
   const id = item.pathname.split('/')[1]||'';
   const expires = ID.test(id) ? expiryOf(id) : null;
   if(expires && expires<now) expired.push(item.url);
  }
  cursor = page.hasMore ? page.cursor : undefined;
 } while(cursor);
 for(let i=0;i<expired.length;i+=500) await sdk.del(expired.slice(i,i+500), {token:env.BLOB_READ_WRITE_TOKEN});
 return json({removed:expired.length});
}

export const GET = request => handle(request);
