import {MAX_FILE, MAX_TOTAL, uid} from './core.js';
import {validateBackup} from './backup.js';
import {runExport} from './tasks.js';
const DB_NAME = 'ck-promptmaker';
let database;
export function openDB() {
 return database ||= new Promise((resolve,reject)=>{
 const request = indexedDB.open(DB_NAME,1);
 request.onupgradeneeded = () => {for(const name of ['activities','subjects','files','settings']) request.result.createObjectStore(name,{keyPath:'id'});};
 request.onsuccess = () => resolve(request.result);
 request.onerror = () => { database=null; reject(request.error); };
 request.onblocked = () => { database=null; reject(new Error('Feche outras abas do CK para atualizar o armazenamento.')); };
 });
}
export async function getAll(store) {const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function batch(operations) {
 const db=await openDB();if(!operations.length)return;
 return new Promise((resolve,reject)=>{
 const tx=db.transaction([...new Set(operations.map(o=>o.store))],'readwrite');
 for(const op of operations) {const s=tx.objectStore(op.store);if(op.type==='delete')s.delete(op.id);else if(op.type==='clear')s.clear();else s.put(op.value);}
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Não foi possível salvar.'));
 });
}
export const put = (store,value)=>batch([{store,value}]);
export async function removeOwner(type,id) {
 const files=await getAll('files');
 await batch([{store:type==='subject'?'subjects':'activities',type:'delete',id},...files.filter(f=>f.ownerType===type&&f.ownerId===id).map(f=>({store:'files',type:'delete',id:f.id}))]);
}
export async function addFiles(list, ownerType, ownerId, options={}) {
 const existing=await getAll('files');const input=Array.from(list);
 if(input.some(f=>f.size>MAX_FILE)) throw new Error('Cada arquivo pode ter até 25 MB. Divida arquivos maiores.');
 if(existing.reduce((n,f)=>n+f.size,0)+input.reduce((n,f)=>n+f.size,0)>MAX_TOTAL) throw new Error('Limite local de 120 MB de anexos. Exporte um backup e remova materiais antigos.');
 const records=input.map(file=>({id:uid(),ownerType,ownerId,name:file.name,size:file.size,mime:file.type||'application/octet-stream',kind:options.kind||'base',period:options.period||'',blob:file,createdAt:Date.now()}));
 await batch(records.map(value=>({store:'files',value})));
 return records;
}
export async function exportBackup() {
 const [activities,subjects,files,settings]=await Promise.all(['activities','subjects','files','settings'].map(getAll));
 return runExport('backup',{app:'ck-promptmaker',version:1,exportedAt:new Date().toISOString(),activities,subjects,files,settings});
}
export async function readBackup(file) {
 if(file.size>175*1024*1024)throw new Error('Backup muito grande.');
 return validateBackup(JSON.parse(await file.text()));
}
export async function restoreBackup(file,{mode='replace',includeProfile=true}={}) {
 const data=file instanceof Blob?await readBackup(file):validateBackup(file);
 if(!['replace','merge'].includes(mode))throw new Error('Modo de importação inválido.');
 let total=0;
 const files=[];
 for(const f of data.files){
 if(typeof f.name!=='string'||!['activity','subject','profile'].includes(f.ownerType)||typeof f.data!=='string'||!/^data:[^,]*;base64,/.test(f.data))throw new Error('Anexo inválido no backup.');
 const binary=atob(f.data.slice(f.data.indexOf(',')+1));total+=binary.length;
 if(binary.length>MAX_FILE||total>MAX_TOTAL)throw new Error('O backup ultrapassa o limite de anexos.');
 const blob=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:f.mime||'application/octet-stream'});const {data:_,...meta}=f;files.push({...meta,size:blob.size,blob});
 }
 const mergedFiles=new Map((mode==='merge'?await getAll('files'):[]).map(f=>[f.id,f]));
 for(const f of files)mergedFiles.set(f.id,f);
 if([...mergedFiles.values()].reduce((sum,f)=>sum+f.size,0)>MAX_TOTAL)throw new Error('A soma dos anexos ultrapassa 120 MB. Nenhum dado foi alterado.');
 const keptProfile=mode==='replace'&&!includeProfile?(await getAll('settings')).find(s=>s.id==='profile'):null;
 const operations=mode==='replace'?['activities','subjects','files','settings'].map(store=>({store,type:'clear'})):[];
 for(const store of ['activities','subjects','settings'])for(const value of data[store]){if(store==='settings'&&value.id==='profile'&&!includeProfile)continue;operations.push({store,value});}
 if(keptProfile)operations.push({store:'settings',value:keptProfile});
 for(const value of files)operations.push({store:'files',value});
 await batch(operations);
}

