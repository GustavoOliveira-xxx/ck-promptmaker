export function runExport(type,payload){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./export-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=event=>{worker.terminate();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.blob);};
  worker.onerror=event=>{worker.terminate();reject(new Error(event.message||'Não foi possível preparar a exportação.'));};
  worker.postMessage({type,payload});
 });
}

