import {apiUrl} from './api.js';
import {getAll,batch,goneIds} from './db.js';
import {TRASH_DAYS} from './core.js';
export const CHUNK = 4_000_000;
const STORES = ['activities','subjects','files'];
const stamp = r => r?.updatedAt||r?.deletedAt||r?.createdAt||0;
export const fileKey = f => f.id+'.'+stamp(f).toString(36);
async function call(action, {code, space, body, query='', type='application/octet-stream', request=fetch, loc}) {
 let response;
 try {
  response = await request(apiUrl('cloud', loc)+'?action='+action+'&space='+encodeURIComponent(space)+query, {method:'POST', headers:{'Content-Type':type, 'X-CK-Code':code}, body, signal:AbortSignal.timeout(90000)});
 } catch { throw new Error('Sem conexão com a nuvem. Seus dados continuam salvos neste aparelho.'); }
 if(!response.ok) {
  const data = await response.json().catch(()=>({}));
  const error = new Error(data.error || (response.status===404 ? 'A nuvem só funciona na versão do app hospedada na Vercel.' : 'A nuvem respondeu com erro (HTTP '+response.status+').'));
  error.code = data.code; error.status = response.status;
  throw error;
 }
 return response;
}
const pipe = (data, stream) => new Response(new Blob([data]).stream().pipeThrough(stream));
export const pack = state => pipe(JSON.stringify(state), new CompressionStream('gzip')).arrayBuffer();
export const unpack = async buffer => JSON.parse(await pipe(buffer, new DecompressionStream('gzip')).text());
const withoutCode = profile => { if(!profile) return null; const {aiCode, ...rest} = profile; return rest; };

export function mergeState(local, remote, now=Date.now()) {
 const gone = new Map(Object.entries(remote?.gone||{}));
 for(const [id,at] of local.gone) gone.set(id, Math.max(at, gone.get(id)||0));
 for(const [id,at] of gone) if(at<now-180*86400000) gone.delete(id);
 const expired = r => r.deletedAt && r.deletedAt<=now-TRASH_DAYS*86400000;
 const out = {gone};
 for(const store of STORES) {
  const map = new Map();
  for(const r of [...(remote?.[store]||[]), ...local[store]]) { const current = map.get(r.id); if(!current || stamp(r)>=stamp(current)) map.set(r.id, r); }
  out[store] = [...map.values()].filter(r=>!gone.has(r.id) && !expired(r));
 }
 out.profile = stamp(remote?.profile)>stamp(local.profile) ? remote.profile : local.profile;
 return out;
}

export async function syncCloud({code, space='default', progress=()=>{}, ...options}) {
 if(!code) throw Object.assign(new Error('Entre com sua senha para usar a nuvem.'), {code:'ACCESS_CODE'});
 const ctx = {code, space, ...options};
 progress('Conferindo a nuvem…');
 const response = await call('state', ctx);
 const remote = response.status===204 ? null : await unpack(await response.arrayBuffer());
 const local = {gone:await goneIds()};
 for(const store of STORES) local[store] = await getAll(store);
 const settings = await getAll('settings');
 local.profile = settings.find(s=>s.id==='profile') || null;
 const merged = mergeState(local, remote);
 const ops = [];
 for(const store of ['activities','subjects']) {
  const keep = new Set(merged[store].map(r=>r.id));
  for(const r of merged[store]) if(!local[store].includes(r)) ops.push({store, value:r});
  for(const r of local[store]) if(!keep.has(r.id)) ops.push({store, type:'delete', id:r.id});
 }
 const keepFiles = new Set(merged.files.map(f=>f.id));
 for(const r of local.files) if(!keepFiles.has(r.id)) ops.push({store:'files', type:'delete', id:r.id});
 const incoming = merged.files.filter(f=>!local.files.includes(f));
 let downloaded = 0;
 for(const f of incoming) {
  progress('Baixando '+f.name+'…');
  const parts = [];
  for(let n=0; n<f.chunks; n++) parts.push(await (await call('get', {...ctx, query:'&key='+encodeURIComponent(f.key)+'&n='+n})).arrayBuffer());
  const {key, chunks, ...meta} = f;
  ops.push({store:'files', value:{...meta, blob:new Blob(parts, {type:f.mime||'application/octet-stream'})}});
  downloaded++;
 }
 if(merged.profile && merged.profile!==local.profile) ops.push({store:'settings', value:{...merged.profile, id:'profile', aiCode:local.profile?.aiCode||code}});
 await batch(ops, {quiet:true});
 const remoteKeys = new Set((remote?.files||[]).map(f=>f.key));
 const files = [];
 let uploaded = 0;
 for(const f of merged.files) {
  if(!f.blob) { files.push(f); continue; }
  const key = fileKey(f), chunks = Math.ceil(f.blob.size/CHUNK);
  if(!remoteKeys.has(key)) {
   for(let n=0; n<chunks; n++) {
    progress('Enviando '+f.name+(chunks>1?' ('+(n+1)+' de '+chunks+')':'')+'…');
    await call('put', {...ctx, body:f.blob.slice(n*CHUNK, (n+1)*CHUNK), query:'&key='+encodeURIComponent(key)+'&n='+n});
   }
   uploaded++;
  }
  const {blob, ...meta} = f;
  files.push({...meta, key, chunks});
 }
 const state = {app:'ck-promptmaker', version:1, activities:merged.activities, subjects:merged.subjects, files, profile:withoutCode(merged.profile), gone:Object.fromEntries(merged.gone)};
 const same = remote && JSON.stringify({...remote, savedAt:0})===JSON.stringify({...state, savedAt:0});
 if(!same) { progress('Salvando na nuvem…'); await call('save-state', {...ctx, body:await pack({...state, savedAt:Date.now()})}); }
 return {changed:ops.length>0, downloaded, uploaded, saved:!same, at:Date.now()};
}
