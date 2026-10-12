import {callApi} from './api.js';
export const MAX_UPLOAD = 4_300_000;
export async function publishToVercel({bundle, days, code}, progress=()=>{}, options={}) {
 progress('Reservando um link privado…');
 const start = await callApi('publish', {action:'start', days}, {code, ...options});
 const documents = [];
 for(let i=0;i<bundle.documents.length;i++) {
  const d = bundle.documents[i];
  let url = '';
  if(d.blob.size<=MAX_UPLOAD) {
   progress('Enviando arquivo '+(i+1)+' de '+bundle.documents.length+'…');
   const query = '?action=file&id='+encodeURIComponent(start.id)+'&n='+(i+1)+'&name='+encodeURIComponent(d.name);
   url = (await callApi('publish', d.blob, {code, raw:true, query, headers:{'X-CK-Token':start.token}, ...options})).url;
  }
  documents.push({name:d.name, status:d.status, warning:d.warning, text:d.text, url});
 }
 progress('Montando a página…');
 const done = await callApi('publish', {action:'finish', id:start.id, token:start.token, title:bundle.title, prompt:bundle.prompt, documents}, {code, ...options});
 return {...done, skipped:documents.filter(d=>!d.url).map(d=>d.name)};
}
export const deleteVercelPage = ({id, deleteToken, code}, options={}) => callApi('publish', {action:'delete', id, deleteToken}, {code, ...options});
