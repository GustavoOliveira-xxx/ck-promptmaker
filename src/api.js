export const REMOTE_ORIGIN = 'https://ck-promptmaker.vercel.app';
export function apiUrl(name, loc=location) {
 return loc.hostname.endsWith('github.io') ? REMOTE_ORIGIN+'/api/'+name : new URL('./api/'+name, loc.href).href;
}
export async function callApi(name, body, {code='', query='', headers={}, raw=false, timeout=75000, request=fetch, loc}={}) {
 let response;
 try {
  response = await request(apiUrl(name, loc)+query, {method:'POST', headers:{'Content-Type':raw?(body.type||'application/octet-stream'):'application/json', ...(code?{'X-CK-Code':code}:{}), ...headers}, body:raw?body:JSON.stringify(body), signal:AbortSignal.timeout(timeout)});
 } catch(error) {
  throw new Error(error.name==='TimeoutError' ? 'O servidor demorou demais para responder. Tente de novo.' : 'Sem conexão com o servidor. Confira sua internet.');
 }
 const data = await response.json().catch(()=>({}));
 if(!response.ok) {
  const error = new Error(data.error || (response.status===404 ? 'Este recurso precisa da versão do app hospedada na Vercel.' : response.status===413 ? 'O envio ficou grande demais. Use menos arquivos.' : 'O servidor não respondeu (HTTP '+response.status+').'));
  error.code = data.code; error.status = response.status;
  throw error;
 }
 return data;
}
