import {CATEGORIES,DEFAULT_PROFILE,newActivity,MAX_FILE,MAX_TOTAL} from './core.js';
const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,90}$/.test(x);
const bad=()=>{throw new Error('Estrutura do backup inválida. Nenhum dado foi substituído.');};
const isText=x=>typeof x==='string'&&x.length<=2000000;
export function validateBackup(data){
 if(!data||data.app!=='ck-promptmaker'||data.version!==1)throw new Error('Este arquivo não é um backup CK compatível.');
 for(const key of ['activities','subjects','files','settings']){
  if(!Array.isArray(data[key])||data[key].length>10000)bad();
  const ids=new Set();for(const item of data[key]){if(!item||!validId(item.id)||ids.has(item.id))bad();ids.add(item.id);}
 }
 for(const a of data.activities){
  const defaults=newActivity();
  for(const [key,v] of Object.entries(defaults)){if(typeof v==='string'&&!isText(a[key]))bad();}
  if(!Array.isArray(a.deliveries)||a.deliveries.length>30||!Array.isArray(a.members)||a.members.length>30||a.members.some(m=>!isText(m)))bad();
  for(const d of a.deliveries)if(!d||!CATEGORIES.some(c=>c.id===d.category&&c.formats.includes(d.format)))bad();
  if(!['individual','group'].includes(a.mode)||!['draft','done'].includes(a.status)||![1,2,3,4].includes(Number(a.period)))bad();
  if(!['number','string'].includes(typeof a.groupSize)||String(a.groupSize).length>20||(a.groupSize!==''&&!Number.isFinite(Number(a.groupSize))))bad();
  if(!a.website||!['original','remaster','custom'].includes(a.website.identity)||!['alta','media','baixa'].includes(a.website.interaction)||!['alta','media','baixa'].includes(a.website.threeD))bad();
  for(const key of ['hasMedia','github'])if(typeof a.website[key]!=='boolean')bad();
  for(const key of ['repo','details'])if(!isText(a.website[key]))bad();
  if(typeof a.customSite!=='boolean')bad();
  a.includeManual=a.includeManual??true;
  if(typeof a.includeManual!=='boolean'||!Number.isFinite(a.updatedAt)||!Number.isFinite(a.createdAt))bad();
 }
 for(const s of data.subjects){
  if(!isText(s.name)||!isText(s.professor)||!s.notes||typeof s.notes!=='object'||Array.isArray(s.notes))bad();
  for(const [k,v] of Object.entries(s.notes))if(!['1','2','3','4','anual'].includes(k)||!isText(v))bad();
 }
 const subjectIds=new Set(data.subjects.map(s=>s.id)),activityIds=new Set(data.activities.map(a=>a.id));
 for(const a of data.activities)if(a.subjectId&&!subjectIds.has(a.subjectId))bad();
 for(const s of data.settings){
  if(!['profile','active'].includes(s.id))bad();
  if(s.id==='profile')for(const [key,value] of Object.entries(DEFAULT_PROFILE))if(s[key]!==undefined&&(typeof s[key]!==typeof value||(typeof value==='string'&&!isText(s[key]))))bad();
  if(s.id==='active'&&(!validId(s.activityId)))bad();
 }
 let total=0;
 for(const f of data.files){
  if(!isText(f.name)||!['activity','subject','profile'].includes(f.ownerType)||!['base','media','ptd','manual','brand'].includes(f.kind)||!isText(f.mime))bad();
  if(f.ownerType==='activity'&&!activityIds.has(f.ownerId)||f.ownerType==='subject'&&!subjectIds.has(f.ownerId)||f.ownerType==='profile'&&f.ownerId!=='profile')bad();
  if(f.period&&!['1','2','3','4','anual'].includes(f.period))bad();
  if(!({activity:['base','media'],subject:['ptd'],profile:['manual','brand']}[f.ownerType].includes(f.kind)))bad();
  if(typeof f.data!=='string'||!/^data:[^,]*;base64,[A-Za-z0-9+/]*={0,2}$/.test(f.data))bad();
  const estimated=(f.data.length-f.data.indexOf(',')-1)*.75;total+=estimated;
  if(estimated>MAX_FILE+2||total>MAX_TOTAL+2*data.files.length)bad();
 }
 return data;
}

