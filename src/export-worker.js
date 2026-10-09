import {createZip} from './zip.js';
self.onmessage=async event=>{
 try{
  const {type,payload}=event.data;
  if(type==='zip')self.postMessage({blob:await createZip(payload)});
  else if(type==='backup'){
   const files=[];
   for(const f of payload.files){const {blob,...meta}=f;const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});files.push({...meta,data});}
   self.postMessage({blob:new Blob([JSON.stringify({...payload,files})],{type:'application/json'})});
  }
 }catch(error){self.postMessage({error:error.message});}
};

