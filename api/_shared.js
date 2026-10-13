import {createHmac,timingSafeEqual} from 'node:crypto';

const API = 'https://generativelanguage.googleapis.com/v1beta/models/';
const DEFAULT_MODELS = 'gemini-3.5-flash,gemini-3.8-flash,gemini-flash-latest,gemini-flash-lite-latest';

export const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...headers}});

export function originAllowed(origin, host, env) {
 if(!origin) return true;
 let url; try { url = new URL(origin); } catch { return false; }
 if(url.host===host) return true;
 if(url.hostname==='localhost' || url.hostname==='127.0.0.1') return true;
 const list = (env.ALLOWED_ORIGINS ?? 'https://gustavooliveira-xxx.github.io').split(',').map(s=>s.trim().replace(/\/$/,'')).filter(Boolean);
 return list.includes(url.origin);
}

export function sameSecret(a, b) {
 const x = Buffer.from(String(a)), y = Buffer.from(String(b));
 return x.length===y.length && timingSafeEqual(x, y);
}

const hits = new Map();
export function limited(key, max=30, windowMs=600000, now=Date.now()) {
 const recent = (hits.get(key)||[]).filter(t=>now-t<windowMs);
 recent.push(now); hits.set(key, recent);
 if(hits.size>5000) hits.clear();
 return recent.length>max;
}

export function guard(request, env, {methods='POST, OPTIONS', code=true, max=30}={}) {
 const origin = request.headers.get('origin');
 const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
 const allowed = originAllowed(origin, host, env);
 const cors = allowed && origin ? {'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':methods, 'Access-Control-Allow-Headers':'Content-Type, X-CK-Code, X-CK-Token', 'Access-Control-Max-Age':'600', Vary:'Origin'} : {};
 if(request.method==='OPTIONS') return {response:new Response(null, {status:allowed?204:403, headers:cors})};
 if(request.method==='GET') return {cors};
 if(!methods.includes(request.method)) return {response:json({error:'Método não permitido.'}, 405, cors)};
 if(!allowed) return {response:json({error:'Origem não autorizada.'}, 403)};
 if(code && env.CK_ACCESS_CODE && !sameSecret(request.headers.get('x-ck-code')||'', env.CK_ACCESS_CODE)) return {response:json({error:'Senha incorreta.', code:'ACCESS_CODE'}, 401, cors)};
 const ip = (request.headers.get('x-forwarded-for')||'').split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
 if(limited(new URL(request.url).pathname+'|'+ip, max)) return {response:json({error:'Muitas solicitações em pouco tempo. Aguarde alguns minutos.'}, 429, cors)};
 return {cors};
}

export async function callGemini(build, env, request, deadline) {
 const models = (env.GEMINI_MODELS || DEFAULT_MODELS).split(',').map(s=>s.trim()).filter(Boolean);
 let last;
 for(const model of models) {
  for(const thinking of [true,false]) {
   const remaining = deadline - Date.now();
   if(remaining<4000) break;
   let response;
   try {
    response = await request(API+encodeURIComponent(model)+':generateContent', {method:'POST', headers:{'Content-Type':'application/json', 'x-goog-api-key':env.GEMINI_API_KEY}, body:JSON.stringify(build(thinking)), signal:AbortSignal.timeout(Math.min(remaining-1000, 45000))});
   } catch(error) { last = {status:504, detail:error.name}; break; }
   if(response.ok) {
    const data = await response.json();
    const candidate = data.candidates?.[0];
    const output = (candidate?.content?.parts||[]).filter(p=>!p.thought && typeof p.text==='string').map(p=>p.text).join('');
    if(!output) { last = {status:422, detail:candidate?.finishReason || data.promptFeedback?.blockReason || 'EMPTY'}; break; }
    try { return {model:data.modelVersion || model, result:JSON.parse(output)}; }
    catch { last = {status:502, detail:'INVALID_JSON'}; break; }
   }
   const detail = (await response.text().catch(()=>'')).slice(0,300);
   last = {status:response.status, detail};
   if(response.status===400 && thinking && /thinking/i.test(detail)) continue;
   if(response.status===401 || response.status===403) return {error:last};
   break;
  }
 }
 return {error:last || {status:503, detail:'NO_MODEL'}};
}

export function geminiError(error, cors) {
 console.error('gemini', error.status, error.detail);
 const message = error.status===429 ? 'A cota gratuita da IA acabou por agora. Tente novamente mais tarde.'
  : error.status===401 || error.status===403 ? 'A chave da IA foi recusada pelo Google. Confira GEMINI_API_KEY.'
  : error.status===422 ? 'A IA não conseguiu responder sobre esse material. Tente outra foto ou descreva a atividade.'
  : 'A IA está sobrecarregada ou indisponível agora. Tente novamente em instantes.';
 return json({error:message}, error.status===429?429:502, cors);
}

export const sign = (secret, value) => createHmac('sha256', secret).update(value).digest('base64url').slice(0,32);
