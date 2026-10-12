import {MAX_FILE, MAX_TOTAL, TRASH_DAYS, uid} from './core.js';
import {validateBackup} from './backup.js';
import {runExport} from './tasks.js';
const BASE = 'ck-promptmaker';
const STORES = ['activities','subjects','files','settings'];
let database, current = BASE;
export const workspaceDb = id => !id || id==='default' ? BASE : BASE+'-'+id;
export function useWorkspace(id) {
 const name = workspaceDb(id);
 if(name===current) return;
 database?.then(db=>db.close()).catch(()=>{});
 database = null; current = name;
}
export const currentDb = () => current;
export function openDB() {
 return database ||= new Promise((resolve,reject)=>{
 const request = indexedDB.open(current,2);
 request.onupgradeneeded = () => {for(const name of [...STORES,'device']) if(!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name,{keyPath:'id'});};
 request.onsuccess = () => {const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
 request.onerror = () => { database=null; reject(request.error); };
 request.onblocked = () => { database=null; reject(new Error('Feche outras abas do CK para atualizar o armazenamento.')); };
 });
}
export async function deleteWorkspace(id) {
 const name = workspaceDb(id);
 if(name===BASE) throw new Error('O perfil principal não pode ser apagado.');
 if(name===current) useWorkspace('default');
 await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=resolve;});
}
export async function getAll(store) {const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function get(store,id) {const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function batch(operations) {
 const db=await openDB();if(!operations.length)return;
 return new Promise((resolve,reject)=>{
 const tx=db.transaction([...new Set(operations.map(o=>o.store))],'readwrite');
 for(const op of operations) {const s=tx.objectStore(op.store);if(op.type==='delete')s.delete(op.id);else if(op.type==='clear')s.clear();else s.put(op.value);}
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Não foi possível salvar.'));
 });
}
export const put = (store,value)=>batch([{store,value}]);
const storeOf = type => type==='subject' ? 'subjects' : type==='activity' ? 'activities' : 'files';
export async function removeOwner(type,id) {
 const files=await getAll('files');
 await batch([{store:storeOf(type),type:'delete',id},...files.filter(f=>f.ownerType===type&&f.ownerId===id).map(f=>({store:'files',type:'delete',id:f.id}))]);
}
export async function trash(type,id,at=Date.now()) {
 const record=await get(storeOf(type),id);if(!record)return null;
 const ops=[{store:storeOf(type),value:{...record,deletedAt:at,updatedAt:at}}];
 if(type!=='file')for(const f of await getAll('files'))if(f.ownerType===type&&f.ownerId===id&&!f.deletedAt)ops.push({store:'files',value:{...f,deletedAt:at,updatedAt:at,trashedWith:id}});
 await batch(ops);
 return at;
}
export async function untrash(type,id) {
 const record=await get(storeOf(type),id);if(!record)return;
 const now=Date.now(),{deletedAt,...restored}=record;
 const ops=[{store:storeOf(type),value:{...restored,updatedAt:now}}];
 if(type!=='file')for(const f of await getAll('files'))if(f.trashedWith===id){const {deletedAt:_,trashedWith,...file}=f;ops.push({store:'files',value:{...file,updatedAt:now}});}
 await batch(ops);
}
export async function purgeTrash(now=Date.now(),days=TRASH_DAYS) {
 const limit=now-days*86400000,ops=[];
 for(const store of ['activities','subjects','files'])for(const r of await getAll(store))if(r.deletedAt&&r.deletedAt<=limit)ops.push({store,type:'delete',id:r.id});
 await batch(ops);
 return ops.length;
}
export async function addFiles(list, ownerType, ownerId, options={}) {
 const existing=await getAll('files');const input=Array.from(list);
 if(input.some(f=>f.size>MAX_FILE)) throw new Error('Cada arquivo pode ter até 25 MB. Divida arquivos maiores.');
 if(existing.reduce((n,f)=>n+f.size,0)+input.reduce((n,f)=>n+f.size,0)>MAX_TOTAL) throw new Error('Limite local de 120 MB de anexos. Esvazie a lixeira ou exporte um backup e remova materiais antigos.');
 const now=Date.now();
 const records=input.map(file=>({id:uid(),ownerType,ownerId,name:file.name,size:file.size,mime:file.type||'application/octet-stream',kind:options.kind||'base',period:options.period||'',blob:file,createdAt:now,updatedAt:now}));
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
const stamp = r => r.updatedAt||r.deletedAt||r.createdAt||0;
export function pickNewest(local, incoming, summary={updated:0,kept:0,added:0}) {
 const mine = new Map(local.map(r=>[r.id,r]));
 return incoming.filter(value=>{
  const current = mine.get(value.id);
  if(!current){summary.added++;return true;}
  if(stamp(value)>stamp(current)){summary.updated++;return true;}
  if(stamp(value)===stamp(current))return true;
  summary.kept++;return false;
 });
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
 const summary={updated:0,kept:0,added:0};
 const local={};
 for(const store of ['activities','subjects','files'])local[store]=mode==='merge'?await getAll(store):[];
 const incoming={activities:pickNewest(local.activities,data.activities,summary),subjects:pickNewest(local.subjects,data.subjects,summary),files:pickNewest(local.files,files,summary)};
 const merged=new Map(local.files.map(f=>[f.id,f]));for(const f of incoming.files)merged.set(f.id,f);
 if([...merged.values()].reduce((sum,f)=>sum+f.size,0)>MAX_TOTAL)throw new Error('A soma dos anexos ultrapassa 120 MB. Nenhum dado foi alterado.');
 const keptProfile=mode==='replace'&&!includeProfile?(await getAll('settings')).find(s=>s.id==='profile'):null;
 const operations=mode==='replace'?STORES.map(store=>({store,type:'clear'})):[];
 for(const store of ['activities','subjects'])for(const value of incoming[store])operations.push({store,value});
 for(const value of data.settings){if(value.id==='profile'&&!includeProfile)continue;if(value.id==='active'&&mode==='merge')continue;operations.push({store:'settings',value});}
 if(keptProfile)operations.push({store:'settings',value:keptProfile});
 for(const value of incoming.files)operations.push({store:'files',value});
 await batch(operations);
 return summary;
}
