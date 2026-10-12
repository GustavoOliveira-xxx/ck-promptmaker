import {CATEGORIES,hasSite} from './core.js';
import {callApi} from './api.js';
const BUDGET=4_000_000;
const TEXT_LIMIT=60_000;
const imageType=f=>/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name);
const pdfType=f=>f.type==='application/pdf'||/\.pdf$/i.test(f.name);
const textType=f=>/^text\//.test(f.type)||/\.(txt|md|csv|tsv|json|sql|py|js|html?|css|xml|ya?ml|log)$/i.test(f.name);
export function sourceKind(f){return imageType(f)?'image':pdfType(f)?'pdf':/\.docx$/i.test(f.name)?'docx':textType(f)?'text':'other';}
function base64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).slice(String(r.result).indexOf(',')+1));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
async function shrinkImage(file,max,quality=max>1400?.82:.72){
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível preparar a imagem.')),'image/jpeg',quality));
 }finally{bitmap.close?.();}
}
export async function compressPhoto(file,{min=1_200_000,max=2400,quality=.85}={}){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size<min)return file;
 try{const blob=await shrinkImage(file,max,quality);if(blob.size>=file.size)return file;return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified});}
 catch{return file;}
}
async function pdfText(file){
 const pdfjs=await import('../vendor/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.min.mjs',import.meta.url).href;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});
 try{const doc=await task.promise;let out='';for(let n=1;n<=doc.numPages&&out.length<TEXT_LIMIT;n++){const p=await doc.getPage(n);out+='\n[Página '+n+']\n'+(await p.getTextContent()).items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join('');p.cleanup();}return out.slice(0,TEXT_LIMIT);}
 finally{await task.destroy();}
}
async function docxText(file){await import('../vendor/mammoth.browser.js');return (await globalThis.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value.slice(0,TEXT_LIMIT);}
async function encode(file,{tight=false}={}){
 const kind=sourceKind(file),name=file.name||'material';
 if(kind==='image'){
  try{const small=await shrinkImage(file,tight?1100:1700);return {name,mime:'image/jpeg',data:await base64(small)};}
  catch{if(['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)&&file.size<2_500_000)return {name,mime:file.type,data:await base64(file)};throw new Error('Não consegui abrir a imagem '+name+'.');}
 }
 if(kind==='pdf'){
  if(!tight&&file.size<=2_600_000)return {name,mime:'application/pdf',data:await base64(file)};
  const content=await pdfText(file);if(content.trim().length>40)return {name,text:content};
  throw new Error(name+' é grande e não tem texto legível. Fotografe as páginas principais.');
 }
 if(kind==='docx')return {name,text:await docxText(file)};
 if(kind==='text')return {name,text:(await file.text()).slice(0,TEXT_LIMIT)};
 throw new Error('A IA não lê arquivos do tipo '+name.split('.').pop()+'. Use fotos, PDF, DOCX ou texto.');
}
const weight=s=>s.data?s.data.length:s.text.length;
export async function prepareSources(files,progress=()=>{}){
 const out=[],skipped=[];
 for(let i=0;i<files.length;i++){
  progress('Preparando '+(i+1)+' de '+files.length+': '+files[i].name);
  try{out.push(await encode(files[i]));}catch(error){skipped.push(error.message);}
 }
 let total=out.reduce((n,s)=>n+weight(s),0);
 for(let i=out.length-1;i>=0&&total>BUDGET;i--){
  if(!out[i].data)continue;
  progress('Compactando materiais grandes…');
  try{const tight=await encode(files.find(f=>(f.name||'material')===out[i].name),{tight:true});total+=weight(tight)-weight(out[i]);out[i]=tight;}catch{}
 }
 while(total>BUDGET&&out.length){const removed=out.pop();total-=weight(removed);skipped.push(removed.name+' ficou de fora para respeitar o limite de envio.');}
 return {sources:out,skipped};
}
export const requestAssist=(body,{code='',...options}={})=>callApi('assist',body,{code,...options});

const plain=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const LABELS={title:'Título',date:'Data da atividade',due:'Data de entrega',subject:'Matéria',professor:'Professor(a)',period:'Bimestre',mode:'Modalidade',description:'Enunciado',objectives:'Objetivos',criteria:'Critérios de avaliação',length:'Extensão ou duração',deliveries:'Formatos de entrega',customFormat:'Formato personalizado',customDescription:'Entrega personalizada',website:'Direção do site',observations:'Observações',baseText:'Texto-base (transcrição)',links:'Links'};
const UNCERTAIN={subject:'subjectName',mode:'members'};
export function matchSubject(name,subjects){
 const key=plain(name);if(!key)return null;
 return subjects.find(s=>plain(s.name)===key)||subjects.find(s=>{const k=plain(s.name);return k.length>3&&(k.includes(key)||key.includes(k));})||null;
}
const day=v=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'):'';
const formatName=d=>(CATEGORIES.find(c=>c.id===d.category)?.name||d.category)+' · '+(d.format==='PERSONALIZADO'?'personalizado':d.format);
export function buildSuggestions(r,a,subjects){
 const items=[];
 const add=(key,value,display,current='',extra={})=>{
  if(value===''||value==null||(Array.isArray(value)&&!value.length))return;
  const same=String(current).trim()===String(display).trim();if(same)return;
  items.push({key,label:LABELS[key],value,display,current:String(current||''),checked:!String(current||'').trim()||extra.append===true,uncertain:r.uncertain?.includes(UNCERTAIN[key]||key),...extra});
 };
 add('title',r.title,r.title,a.title);
 add('date',r.date,day(r.date),day(a.date),{checked:false});
 add('due',r.due,day(r.due),day(a.due));
 if(r.subjectName){
  const found=matchSubject(r.subjectName,subjects),current=subjects.find(s=>s.id===a.subjectId)?.name||'';
  if(found)add('subject',{id:found.id},found.name,current);
  else add('subject',{name:r.subjectName},'Criar matéria "'+r.subjectName+'"',current,{checked:!current});
 }
 add('professor',r.professor,r.professor,a.professor);
 if(r.period)add('period',r.period,r.period+'º bimestre',a.period+'º bimestre',{checked:false});
 if(r.mode==='group'||r.members.length>=2){
  const size=r.groupSize||r.members.length;
  const display='Grupo'+(size?' de '+size:'')+(r.members.length?': '+r.members.join(', '):'');
  const current=a.mode==='group'?'Grupo de '+a.groupSize+(a.members.some(Boolean)?': '+a.members.filter(Boolean).join(', '):''):'Individual';
  add('mode',{mode:'group',size:Math.max(2,size),members:r.members},display,current,{checked:a.mode!=='group'||!a.members.some(m=>m.trim())});
 }else if(r.mode==='individual'&&a.mode!=='individual')add('mode',{mode:'individual'},'Individual',a.mode==='group'?'Grupo':'');
 for(const key of ['description','objectives','criteria','length'])add(key,r[key],r[key],a[key]);
 const fresh=r.deliveries.filter(d=>!a.deliveries.some(x=>x.category===d.category&&x.format===d.format));
 if(fresh.length)add('deliveries',fresh,fresh.map(formatName).join(' + '),a.deliveries.map(formatName).join(' + '),{checked:true,append:!!a.deliveries.length});
 if(r.deliveries.some(d=>d.category==='other')){add('customFormat',r.customFormat,r.customFormat,a.customFormat);add('customDescription',r.customDescription,r.customDescription,a.customDescription);}
 const site=hasSite({...a,deliveries:[...a.deliveries,...r.deliveries]});
 const w=r.website||{};
 if(site&&(w.interaction||w.threeD||w.details))add('website',w,[w.interaction&&'Interatividade '+w.interaction,w.threeD&&'3D '+w.threeD,w.details].filter(Boolean).join(' · '),'',{checked:true});
 add('observations',r.observations,r.observations,a.observations,{append:!!a.observations.trim()});
 add('baseText',r.baseText,r.baseText,a.baseText?'(seu texto atual será mantido)':'',{append:!!a.baseText.trim(),checked:true});
 add('links',r.links,r.links,a.links,{append:!!a.links.trim(),checked:true});
 return items;
}
const join=(old,next)=>old.trim()?old.trim()+'\n\n'+next:next;
export function applySuggestions(a,items,subjects,newSubject){
 let created=null;
 for(const item of items){
  const v=item.value;
  switch(item.key){
   case 'subject':{
    if(v.id){a.subjectId=v.id;}else{created=newSubject(v.name);a.subjectId=created.id;}
    const s=created||subjects.find(s=>s.id===a.subjectId);
    if(!a.professor.trim()&&s?.professor)a.professor=s.professor;
    break;}
   case 'mode':
    a.mode=v.mode;
    if(v.mode==='group'){a.groupSize=v.size;a.members=Array.from({length:v.size},(_,i)=>v.members[i]||a.members[i]||'');}
    break;
   case 'deliveries':for(const d of v)if(!a.deliveries.some(x=>x.category===d.category&&x.format===d.format))a.deliveries.push({category:d.category,format:d.format});break;
   case 'website':if(v.interaction)a.website.interaction=v.interaction;if(v.threeD)a.website.threeD=v.threeD;if(v.details)a.website.details=join(a.website.details,v.details);break;
   case 'observations':case 'baseText':case 'links':a[item.key]=item.append?join(a[item.key],v):v;break;
   default:a[item.key]=v;
  }
 }
 if(created&&!created.professor)created.professor=items.find(i=>i.key==='professor')?.value||'';
 return created;
}
