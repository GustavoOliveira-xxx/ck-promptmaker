import {CATEGORIES,STATUSES,TEMPLATES,DEFAULT_PROFILE,CPS_URL,TRASH_DAYS,uid,today,esc,bytes,MAX_TOTAL,safeName,newActivity,hasSite,isAbnt,relevantFiles,pathForFile,buildPrompt,statusOf,isClosed,templateOf,daysUntil,snapshotOf,icsFor} from './core.js';
import {getAll,get,put,batch,addFiles,removeOwner,trash,untrash,purgeTrash,exportBackup,restoreBackup,readBackup,useWorkspace,deleteWorkspace} from './db.js';
import {runExport} from './tasks.js';
import {stageErrors,firstIncompleteStage} from './stages.js';
import {initMotion,logoTransition,viewSweep,pauseOffscreen,haptic} from './motion.js';
import {morph} from './morph.js';
import {connect,announce} from './sync.js';
import {applyEffects,watchKeyboard,diagnose,measureFps} from './device.js';

const $ = s=>document.querySelector(s);
const icons={
spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
check:'<path d="m5 12 4 4L19 6"/>',
file:'<path d="M14 2H5v20h14V7Z"/><path d="M14 2v5h5M8 12h8M8 16h6"/>',
book:'<path d="M12 5c-3-2-7-2-10-1v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z"/><path d="M12 5v16"/>',
slides:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5M7 8h10M7 12h6"/>',
package:'<path d="m12 3 9 5v9l-9 5-9-5V8Zm-9 5 9 5 9-5M12 13v9M7 5.5l9 5"/>',
code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
camera:'<path d="M8 5 9 3h6l1 2h5v15H3V5Z"/><circle cx="12" cy="12" r="4"/>',
folder:'<path d="M3 5h6l2 3h10v12H3Z"/>',
user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
close:'<path d="m6 6 12 12M6 18 18 6"/>',
trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 11 3 3 5-5"/>',
chevron:'<path d="m6 9 6 6 6-6"/>',
wifi:'<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
edit:'<path d="m16 3 5 5-12 12-6 1 1-6Zm-2 2 5 5"/>',
search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14a6.5 6.5 0 0 1 3 5.5V20"/>',
wand:'<path d="m4 20 11-11m2-6v3m-1.5-1.5h3M20 9v2m-1-1h2M9 3v2M8 4h2"/><path d="m13.5 7.5 3 3"/>',
image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/>',
external:'<path d="M14 4h6v6m0-6-9 9"/><path d="M19 14v6H4V5h6"/>',
undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
rotate:'<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
link:'<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
gauge:'<path d="M3 14a9 9 0 1 1 18 0"/><path d="m12 14 4-5"/><circle cx="12" cy="14" r="1.5"/>',
layers:'<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
chat:'<path d="M4 5h16v11H9l-5 4Z"/>',
history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'
};
const icon=(name,cls='')=>'<svg class="icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.spark)+'</svg>';
const params=new URLSearchParams(location.search);
const local={get(key,fallback){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
const session={get(key){try{return sessionStorage.getItem(key);}catch{return null;}},set(key,value){try{sessionStorage.setItem(key,value);}catch{}}};
let subjects=[],files=[],activities=[],trashed={activities:[],subjects:[],files:[]},profile={...DEFAULT_PROFILE},activity=newActivity(),view='activity',step=0,saveTimer=null,saving=Promise.resolve(),lastSaved='',installEvent,updatingWorker,editingSubjectId,libraryPeriod='1',busy=false;
let search='',filterStatus='all',filterSubject='',sortBy='due',showTrash=false,stageMessages=[],preparedPage=null,transferData=null,lastScene='',lastStep=0,aiDraft=null,backupHandle=null,diagnostics=null,workspaces=[],workspace='default';
const steps=['Contexto','Entregas','Materiais','Seu prompt'];
const tpl=()=>templateOf(profile);
const lower=s=>s.toLowerCase();
const fmtDate=v=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'):'';
const fmtTime=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const plural=(n,one,many)=>n+' '+(n===1?one:many);
function toast(message,action){
 const el=$('#toast');el.replaceChildren(document.createTextNode(message));el.classList.toggle('has-action',!!action);
 if(action){const b=document.createElement('button');b.type='button';b.textContent=action.label;b.addEventListener('click',()=>{el.classList.remove('visible');Promise.resolve(action.run()).catch(fail);});el.append(b);}
 el.classList.remove('visible');void el.offsetWidth;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),action?7000:4300);
}
function fail(error){console.error(error);toast(error.name==='QuotaExceededError'?'Armazenamento cheio. Esvazie a lixeira ou exporte um backup e libere espaço.':error.message||'Não foi possível concluir. Tente novamente.');}
function setSaved(text){const el=$('#save-state');if(el)el.textContent=text;}
function replaceIn(list,item){const i=list.findIndex(x=>x.id===item.id);if(i<0)list.push(item);else list[i]=item;}
function saveActivity(force=false){
 clearTimeout(saveTimer);saveTimer=null;
 const body=JSON.stringify({...activity,updatedAt:0});
 if(!force&&body===lastSaved)return saving;
 lastSaved=body;activity.updatedAt=Date.now();const snapshot=structuredClone(activity);
 saving=saving.catch(()=>{}).then(()=>put('activities',snapshot)).then(()=>{replaceIn(activities,snapshot);setSaved('Salvo neste aparelho');announce({type:'activity',id:snapshot.id,updatedAt:snapshot.updatedAt});}).catch(e=>{lastSaved='';setSaved('Falha ao salvar');fail(e);throw e;});
 return saving;
}
function scheduleSave(){setSaved('Salvando…');clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveActivity().catch(()=>{}),450);}
async function saveProfile(){await put('settings',{...profile,id:'profile'});clearTimeout(saveProfile.timer);saveProfile.timer=setTimeout(()=>announce({type:'profile'}),300);}
function field(label,name,value='',options={}){
 const {type='text',placeholder='',required=false,full=false,rows=4,scope='activity',hint='',list}=options;
 const data=scope==='activity'?'data-field':scope==='profile'?'data-profile':'data-subject';
 const id=scope+'-'+name.replaceAll('.','-');
 const control=type==='textarea'?'<textarea id="'+id+'" '+data+'="'+name+'" rows="'+rows+'" placeholder="'+esc(placeholder)+'">'+esc(value)+'</textarea>':type==='select'?'<select id="'+id+'" '+data+'="'+name+'">'+list.map(o=>'<option value="'+esc(o.value)+'" '+(String(value)===String(o.value)?'selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select>':'<input id="'+id+'" '+data+'="'+name+'" type="'+type+'" value="'+esc(value)+'" placeholder="'+esc(placeholder)+'" '+(required?'required':'')+(type==='number'?' min="1" max="30"':'')+(type==='password'?' autocomplete="off"':'')+'>';
 return '<div class="field '+(full?'full':'')+'"><label for="'+id+'">'+label+(required?' <span class="required">*</span>':'')+'</label>'+control+(hint?'<small>'+hint+'</small>':'')+'</div>';
}
function button(label,action,ico,cls='secondary',extra=''){return '<button type="button" class="btn '+cls+'" data-action="'+action+'" '+extra+'>'+(ico?icon(ico):'')+'<span>'+label+'</span></button>';}
function tag(text,cls=''){return '<span class="tag '+cls+'">'+text+'</span>';}
function currentSubject(){return subjects.find(s=>s.id===activity.subjectId);}
function effectiveFiles(){
 const out=[...files];
 if((activity.includeManual||isAbnt(activity))&&!files.some(f=>f.kind==='manual'))out.push({id:'builtin-manual',name:'manualCPS.pdf',size:854450,ownerType:'profile',kind:'manual',url:'./assets/manual-cps.pdf'},{id:'builtin-manual-text',name:'manualCPS-texto-completo.txt',size:91378,ownerType:'profile',kind:'manual',url:'./assets/manual-cps.txt'});
 if(hasSite(activity)&&!files.some(f=>f.kind==='brand'))out.push({id:'builtin-brand',name:'logo-CK.webp',size:97788,ownerType:'profile',kind:'brand',url:'./assets/ck-logo.webp'});
 return out;
}
function promptText(){return buildPrompt(activity,currentSubject(),profile,effectiveFiles());}
function countdown(a){
 const d=daysUntil(a.due);if(d===null)return {text:'Sem prazo',cls:'later'};
 if(d<0)return {text:'Atrasada há '+plural(-d,'dia','dias'),cls:'late'};
 if(d===0)return {text:'Entrega hoje',cls:'late'};
 if(d===1)return {text:'Entrega amanhã',cls:'soon'};
 return {text:'Faltam '+d+' dias',cls:d<=3?'soon':d<=7?'week':'later'};
}
function nav(){
 const t=tpl(),items=[['activity','spark','Criar atividade','Criar'],['library','book',t.subjects+' & '+t.plans,t.subjects],['drafts','folder','Minhas atividades','Atividades'],['profile','user','Meu perfil','Perfil']];
 const index=Math.max(0,items.findIndex(([id])=>id===view));
 return '<aside class="sidebar"><a href="./" class="wordmark" aria-label="CK Promptmaker, início"><span class="brand-emblem"><img src="./assets/ck-logo.webp" alt="" width="48" height="48"></span><div>promptmaker<small>CONSCIOUS KNOWLEDGE</small></div></a><div class="sidebar-label">SEU ESPAÇO CRIATIVO</div><nav aria-label="Navegação principal" data-active="'+index+'"><span class="nav-glider" aria-hidden="true"></span>'+items.map(([id,ico,label,short])=>'<button class="nav-item '+(view===id?'active':'')+'" data-view="'+id+'" aria-label="'+esc(label)+'" title="'+esc(label)+'" '+(view===id?'aria-current="page"':'')+'>'+icon(ico)+'<span>'+esc(label)+'</span><span class="short" aria-hidden="true">'+esc(short)+'</span></button>').join('')+'</nav><div class="sidebar-bottom"><div class="local-note">'+icon('shield')+'<strong>Seu espaço. Seus dados.</strong><p>Tudo salvo no seu aparelho.<br>Sem conta, sem complicação.</p></div>'+button('Instalar aplicativo','install','download','ghost')+'<small class="version">CK PROMPTMAKER · 2.1</small></div></aside>';
}
function initialsOf(name){return name?.trim()?name.trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase():'CK';}
function workspaceName(){return workspace==='default'?'Principal':workspaces.find(w=>w.id===workspace)?.name||'Perfil';}
function shell(){
 const titles={activity:'Nova atividade',library:'Biblioteca',drafts:'Minhas atividades',profile:'Meu perfil'};
 const initials=initialsOf(profile.name);
 return nav()+'<main id="main"><header class="topbar"><span class="topbar-brand" aria-hidden="true"><img src="./assets/ck-logo.webp" alt="" width="36" height="36"></span><span class="breadcrumb"><span class="crumb-root">'+esc(workspaceName())+'</span><span class="sep">/</span><b>'+titles[view]+'</b></span><div class="topbar-right"><span class="connection" title="'+(navigator.onLine?'Online':'Offline')+'">'+(navigator.onLine?'<i></i> Pronto para criar':'<i class="offline"></i> Modo offline')+'</span><button class="avatar" data-view="profile" aria-label="Abrir meu perfil">'+esc(initials)+'</button></div></header><div class="workspace">'+backupNudge()+(view==='activity'?activityView():view==='library'?libraryView():view==='drafts'?draftsView():profileView())+'</div><footer class="app-footer"><span>FEITO PARA SUAS IDEIAS IREM ALÉM.</span><span>Conscious Knowledge <b>✦</b></span></footer></main><button class="camera-fab" data-action="camera" aria-label="Fotografar material da atividade" title="Escanear páginas">'+icon('camera')+'</button>';
}
function render(){
 if(view==='activity'&&step>0){const missing=firstIncompleteStage(activity,profile,files,step);if(missing){step=missing.stage;stageMessages=missing.errors;}}
 document.body.classList.toggle('no-motion',!profile.motion);
 const scene=view+(view==='activity'?':'+step:''),app=$('#app');
 if(scene!==lastScene){
  const stepChange=lastScene.startsWith('activity:')&&view==='activity';
  app.classList.remove('entering-view','entering-step','back');void app.offsetWidth;
  app.classList.add(stepChange?'entering-step':'entering-view');app.classList.toggle('back',stepChange&&step<lastStep);
  clearTimeout(render.entering);render.entering=setTimeout(()=>app.classList.remove('entering-view','entering-step','back'),900);
 }
 morph(app,shell());
 lastScene=scene;if(view==='activity')lastStep=step;
 pauseOffscreen('.hero-art');
}
function backupNudge(){
 const days=profile.lastBackupAt?Math.floor((Date.now()-profile.lastBackupAt)/86400000):null;
 const used=activities.filter(a=>a.title.trim()),since=Math.min(...used.map(a=>a.createdAt));
 if(!used.length||(days!==null&&days<7)||(days===null&&Date.now()-since<3*86400000)||session.get('ck-backup-later'))return '';
 return '<div class="backup-nudge" role="status">'+icon('shield')+'<p><strong>'+(days===null?'Você ainda não fez um backup.':'Seu último backup foi há '+plural(days,'dia','dias')+'.')+'</strong>Leva um toque e protege atividades, '+lower(tpl().plans)+' e anexos.</p><div class="row">'+button('Salvar backup','backup-now','download','gold')+button('Agora não','backup-later',null,'ghost')+'</div></div>';
}
function dueStrip(){
 const list=activities.filter(a=>a.due&&!isClosed(a)&&a.id!==activity.id).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,8);
 if(!list.length)return '';
 return '<section class="due-strip" aria-label="Próximas entregas"><div class="due-head"><h2>'+icon('clock')+' Próximas entregas</h2><button class="btn ghost" data-view="drafts">Ver todas</button></div><div class="due-list">'+list.map(a=>{const c=countdown(a),s=subjects.find(x=>x.id===a.subjectId);return '<button class="due-card '+c.cls+'" data-open-activity="'+a.id+'" data-key="due-'+a.id+'"><span class="due-when">'+c.text+'</span><strong>'+esc(a.title||'Atividade sem título')+'</strong><small>'+esc(s?.name||'Sem '+lower(tpl().subject))+' · '+fmtDate(a.due)+'</small><i class="due-status">'+STATUSES.find(x=>x.id===statusOf(a)).label+'</i></button>';}).join('')+'</div></section>';
}
function activityView(){
 const a=activity;
 return '<section class="hero"><div class="hero-copy"><div class="eyebrow"><span></span> DA IDEIA À ENTREGA</div><h1>Sua ideia.<br><span>Um prompt completo.</span></h1><p>Organize a atividade. Conecte suas referências. Leve o contexto certo para qualquer IA.</p><div class="hero-tags">'+tag(icon('shield')+' Dados locais')+tag(icon('wifi')+' Funciona offline')+tag(icon('wand')+' IA que preenche','gold')+'</div></div><div class="hero-art" aria-hidden="true"><div class="holo"><div class="holo-floor"></div><div class="holo-beam"></div><div class="holo-ring r3"></div><div class="holo-ring r1"></div><div class="holo-ring r2"></div><div class="holo-orbit"><b></b></div><div class="holo-orbit o2"><b></b></div><img class="holo-logo" src="./assets/ck-logo.webp" alt="" width="236" height="236"></div><span class="art-star star-one">✦</span><span class="art-star star-two">✧</span><span class="art-caption">YOUR KNOWLEDGE. AMPLIFIED.</span></div></section>'+dueStrip()+
 '<div class="activity-layout"><section class="editor"><div class="stepper" data-progress="'+step+'" aria-label="Etapas da atividade"><div class="step-rail" aria-hidden="true"><i></i></div>'+steps.map((s,i)=>'<button class="step '+(step===i?'current':step>i?'passed':'')+'" data-step="'+i+'" '+(step===i?'aria-current="step"':'')+' '+(i>step&&firstIncompleteStage(a,profile,files,i)?'aria-disabled="true"':'')+'><span>'+(step>i?icon('check'):String(i+1).padStart(2,'0'))+'</span><b>'+s+'</b></button>').join('')+'</div><div class="editor-body"><div class="section-heading"><div><span class="overline">ETAPA '+String(step+1).padStart(2,'0')+' / 04</span><h2>'+['Vamos dar contexto.','Como vamos entregar?','As referências fazem a diferença.','Pronto para a próxima etapa.'][step]+'</h2><p>'+['Conte o que você precisa fazer. Os detalhes mudam o resultado.','Escolha um ou mais formatos. Nós cuidamos das instruções.','Enunciados, fotos, textos e seus '+tpl().plans+'. Tudo no mesmo lugar.','Confira o briefing e leve o pacote para a IA de sua escolha.'][step]+'</p></div>'+icon(['edit','package','folder','spark'][step],'heading-icon')+'</div>'+stageFeedback()+(step===0?contextForm():step===1?deliveryForm():step===2?materialsForm():reviewForm())+'</div><div class="editor-footer"><div class="save-status">'+icon('check')+'<span id="save-state">Salvo neste aparelho</span></div><div class="row">'+(step>0?button('Voltar','previous','back','ghost'):'')+(step<3?button('Continuar','next','arrow','primary'):button('Baixar pacote ZIP','export-zip','download','primary'))+'</div></div></section><aside class="brief-card tilt"><div class="brief-top">'+icon('spark')+'<span>SEU BRIEFING, AO VIVO</span></div><div id="brief-content">'+briefContent()+'</div><div class="brief-tip"><span>✦</span><p>Um bom prompt começa<br>com um bom contexto.</p></div></aside></div>';
}
function briefContent(){
 const a=activity,s=currentSubject(),n=relevantFiles(a,effectiveFiles()).length,t=tpl();
 return '<h3>'+esc(a.title||'Sua próxima atividade')+'</h3><dl><div><dt>'+t.subject+'</dt><dd>'+esc(s?.name||'A definir')+'</dd></div><div><dt>Entrega</dt><dd>'+esc(a.due?fmtDate(a.due):'Sem data')+'</dd></div><div><dt>Modalidade</dt><dd>'+(a.mode==='group'?'Grupo · '+a.groupSize+' pessoas':'Individual')+'</dd></div><div><dt>Status</dt><dd>'+STATUSES.find(x=>x.id===statusOf(a)).label+'</dd></div></dl><div class="brief-divider"></div><small>FORMATOS SELECIONADOS</small><div class="brief-formats">'+(a.deliveries.length?a.deliveries.map(d=>tag(esc(d.category==='other'?a.customFormat||'Outro':d.format))).join(''):'<p>Nenhum formato ainda</p>')+'</div><div class="brief-count">'+icon('folder')+'<span>'+n+' anexos no pacote</span></div>'+(!s?'':'<div class="ptd-mini">'+icon('book')+'<span>'+files.filter(f=>f.ownerType==='subject'&&f.ownerId===s.id).length+' '+t.plans+' conectados</span></div>');
}
function updateBrief(){const el=$('#brief-content');if(el)morph(el,briefContent());}
function aiCard(){
 return '<div class="ai-card"><span class="ai-orb" aria-hidden="true"><img src="./assets/ck-logo.webp" alt=""></span><div><h3>Preencher com IA</h3><p>Mande a foto do quadro, um print ou o PDF do enunciado. A IA preenche o que encontrar e você confere antes de aplicar.</p></div><div class="row">'+button('Fotografar','ai-camera','camera','gold')+button('Enviar materiais','ai-open','wand','primary')+'</div></div>';
}
function contextForm(){
 const a=activity,t=tpl();
 return aiCard()+(a.mode==='individual'?'<div class="author-card">'+icon('user')+'<span><small>AUTORIA INDIVIDUAL</small><strong>'+esc(profile.name.trim()||'Cadastre seu nome no perfil')+'</strong></span><button class="btn ghost" data-view="profile">Editar perfil</button></div>':'')+'<div class="form-grid">'+field('Título da atividade','title',a.title,{required:true,full:true,placeholder:'Ex.: Ecossistemas brasileiros e seus desafios'})+
 field('Data da atividade','date',a.date,{type:'date',required:true})+field('Data de entrega','due',a.due,{type:'date',required:true})+
 '<div class="field"><label for="activity-subjectId">'+t.subject+' <span class="required">*</span></label><div class="input-action"><select id="activity-subjectId" data-field="subjectId"><option value="">Selecione '+(t.of==='do'?'o ':'a ')+lower(t.subject)+'</option>'+subjects.map(s=>'<option value="'+s.id+'" '+(a.subjectId===s.id?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select><button class="icon-btn" data-action="add-subject" aria-label="Cadastrar '+lower(t.subject)+'">'+icon('plus')+'</button></div></div>'+
 field(t.teacher,'professor',a.professor,{required:t.teacherRequired,placeholder:t.teacherRequired?'Nome do professor':'Opcional'})+
 field(t.period+' atual','period',a.period,{type:'select',list:t.periods.map(n=>({value:n,label:t.periodName(n)}))})+
 '<div class="field"><label>Modalidade</label><div class="segmented">'+['individual','group'].map((m,i)=>'<button class="'+(a.mode===m?'selected':'')+'" data-mode="'+m+'" aria-pressed="'+(a.mode===m)+'">'+icon(i?'users':'user')+(i?'Em grupo':'Individual')+'</button>').join('')+'</div></div>'+
 (a.mode==='group'?'<div class="group-box full"><div class="group-head">'+field('Quantidade de integrantes (incluindo você)','groupSize',a.groupSize,{type:'number'})+button('Confirmar','confirm-group','check','secondary')+'</div><div class="form-grid">'+a.members.map((m,i)=>field('Integrante '+(i+1),'member-'+i,m,{placeholder:'Nome completo',required:true})).join('')+'</div></div>':'')+
 field('Enunciado da atividade','description',a.description,{type:'textarea',full:true,required:true,rows:5,placeholder:'O que foi pedido? Cole o enunciado ou descreva a atividade com suas palavras.'})+
 '<details class="details full" '+(a.objectives||a.criteria||a.length?'open':'')+'><summary>'+icon('plus')+' Deixar o contexto mais completo <span>Opcional</span></summary><div class="form-grid">'+field('Objetivos de aprendizagem','objectives',a.objectives,{type:'textarea',full:true,rows:2,placeholder:'O que preciso demonstrar que aprendi?'})+field('Critérios de avaliação','criteria',a.criteria,{type:'textarea',full:true,rows:2,placeholder:'Rubrica, itens obrigatórios, peso da atividade…'})+field('Extensão ou duração','length',a.length,{full:true,placeholder:'Ex.: 5 páginas, 10 slides ou 8 minutos'})+'</div></details></div>';
}
function deliveryForm(){
 const a=activity;
 return '<div class="delivery-grid">'+CATEGORIES.map(c=>{
 const active=a.deliveries.some(d=>d.category===c.id);
 return '<div class="delivery-card '+(active?'chosen':'')+'" data-key="cat-'+c.id+'"><button class="delivery-head" data-category="'+c.id+'" aria-expanded="'+active+'"><span class="category-icon">'+icon(c.icon)+'</span><span><strong>'+c.name+'</strong><small>'+c.description+'</small></span>'+icon(active?'check':'plus')+'</button>'+(active?'<div class="format-picker"><span>FORMATO FINAL</span><div class="chips">'+c.formats.map(f=>'<button class="chip '+(a.deliveries.some(d=>d.category===c.id&&d.format===f)?'selected':'')+'" data-format="'+f+'" data-cat="'+c.id+'" aria-pressed="'+a.deliveries.some(d=>d.category===c.id&&d.format===f)+'">'+(f==='PERSONALIZADO'?'Definir formato':f)+'</button>').join('')+'</div></div>':'')+'</div>';
 }).join('')+'</div>'+
 (a.deliveries.some(d=>d.category==='other')?'<div class="subsection form-grid">'+field('Extensão / formato','customFormat',a.customFormat,{placeholder:'.ipynb, .fig, vídeo…',required:true})+field('O que a IA precisa entregar','customDescription',a.customDescription,{type:'textarea',rows:2,required:true})+'<label class="toggle full"><input type="checkbox" data-field="customSite" '+(a.customSite?'checked':'')+'><span>Esta entrega também inclui um site</span></label></div>':'')+
 (isAbnt(a)?'<div class="notice">'+icon('book')+'<p><strong>ABNT com referência CPS</strong>O manual CPS será incluído no pacote, tanto para PDF quanto DOCX. Você pode anexar a versão da sua escola no perfil.</p></div>':'')+
 (hasSite(a)?websiteForm():'')+
 '<div class="subsection">'+field('Observações para a entrega','observations',a.observations,{type:'textarea',rows:3,placeholder:'Detalhes, restrições, preferências e o que não pode faltar.'})+'</div>';
}
function choices(label,key,options){
 return '<div class="field full"><label>'+label+'</label><div class="choice-row">'+options.map(([value,title,description])=>'<button class="choice '+(activity.website[key]===value?'selected':'')+'" data-website-choice="'+key+'" data-value="'+value+'" aria-pressed="'+(activity.website[key]===value)+'"><strong>'+title+'</strong><small>'+description+'</small></button>').join('')+'</div></div>';
}
function websiteForm(){
 const w=activity.website;
 return '<section class="website-section"><div class="section-heading"><div><span class="overline">UM SITE COM A SUA CARA</span><h3>Direção criativa</h3></div>'+icon('globe','heading-icon')+'</div><div class="form-grid">'+
 choices('Identidade visual','identity',[['original','CK original','Preservar logo e identidade'],['remaster','CK remaster','Uma nova leitura da marca'],['custom','Personalizada','Descreva sua própria direção']])+
 choices('Interatividade','interaction',[['alta','Alta','Experiência rica em interações'],['media','Média','Equilíbrio e fluidez'],['baixa','Baixa','Simples e direta']])+
 choices('Frequência de elementos 3D','threeD',[['alta','Alta','Bastante, com proporção'],['media','Média','Moderado e marcante'],['baixa','Baixa','Pouco e bem colocado']])+
 '<label class="toggle full"><input type="checkbox" data-field="website.hasMedia" '+(w.hasMedia?'checked':'')+'><span>Já tenho um pacote de mídia selecionado<small>Imagens e outros recursos em um arquivo ZIP</small></span></label>'+
 (w.hasMedia?'<div class="full">'+uploadBox('media','Adicionar pacote de mídia','.zip,application/zip',false)+fileList(files.filter(f=>f.ownerId===activity.id&&f.kind==='media'))+'</div>':'')+
 '<label class="toggle full"><input type="checkbox" data-field="website.github" '+(w.github?'checked':'')+'><span>Preparar para publicar no GitHub<small>Inclui instruções, README e estrutura do projeto</small></span></label>'+
 (w.github?field('Repositório GitHub (opcional)','website.repo',w.repo,{full:true,placeholder:'https://github.com/seu-usuario/seu-repositorio'}):'')+
 field('Detalhes da identidade e do site','website.details',w.details,{type:'textarea',full:true,rows:3,placeholder:'Público, referências visuais, seções, funcionalidades…'})+'</div></section>';
}
function uploadBox(kind,title,accept='',multiple=true){return '<label class="upload-box">'+icon('upload')+'<strong>'+title+'</strong><small>'+(kind==='media'?'Pacote ZIP de até 25 MB':'Documentos, imagens, textos e outros arquivos · até 25 MB cada')+'</small><input type="file" data-upload="'+kind+'" '+(accept?'accept="'+accept+'"':'')+' '+(multiple?'multiple':'')+'></label>';}
function fileList(list){
 return '<div class="file-list">'+list.map(f=>'<div class="file-row" data-key="file-'+f.id+'">'+icon(f.mime?.startsWith('image/')?'image':'file')+'<div><strong>'+esc(f.name)+'</strong><small>'+bytes(f.size)+(f.period?' · '+esc(f.period==='anual'?'Anual':tpl().periodName(f.period)):'')+'</small></div><button class="icon-btn" data-download-file="'+f.id+'" aria-label="Baixar '+esc(f.name)+'">'+icon('download')+'</button><button class="icon-btn danger" data-delete-file="'+f.id+'" aria-label="Remover '+esc(f.name)+'">'+icon('close')+'</button></div>').join('')+'</div>';
}
function materialsForm(){
 const s=currentSubject(),t=tpl(),list=files.filter(f=>f.ownerType==='activity'&&f.ownerId===activity.id&&f.kind==='base');
 return '<label class="toggle manual-toggle"><input type="checkbox" data-field="includeManual" '+(activity.includeManual||isAbnt(activity)?'checked':'')+' '+(isAbnt(activity)?'disabled':'')+'><span>Incluir manual CPS completo<small>PDF original + transcrição integral. Obrigatório nas entregas ABNT.</small></span></label><div class="materials-actions">'+uploadBox('base','Solte aqui ou escolha seus materiais')+'<button class="camera-card spot" data-action="scan-materials">'+icon('camera')+'<strong>Abrir câmera</strong><small>Várias páginas em sequência</small></button></div>'+fileList(list)+'<div class="subsection form-grid">'+field('Texto-base','baseText',activity.baseText,{type:'textarea',full:true,rows:5,placeholder:'Cole textos, transcrições de imagens ou trechos de apoio. Textos colados ficam dentro do prompt.'})+field('Links de referência','links',activity.links,{type:'textarea',full:true,rows:2,placeholder:'Cole um link por linha. O acesso dependerá da IA que receber o prompt.'})+'</div><section class="ptd-connected"><div>'+icon('book')+'<div><h3>Seu contexto curricular</h3><p>'+(s?esc(s.name)+' · Todos os períodos entram no pacote.':'Selecione '+(t.of==='do'?'um ':'uma ')+lower(t.subject)+' na primeira etapa para conectar os '+t.plans+'.')+'</p></div></div>'+(s?button('Gerenciar '+t.plans,'edit-current-subject','arrow','ghost'):'')+'</section>'+(s?'<div class="period-status">'+t.periods.map(n=>{const count=files.filter(f=>f.ownerType==='subject'&&f.ownerId===s.id&&String(f.period)===String(n)).length;return '<div><strong>'+t.periodName(n)+'</strong><small>'+plural(count,'arquivo','arquivos')+(s.notes?.[n]?' + notas':'')+'</small></div>';}).join('')+'</div>':'')+'<div class="notice">'+icon('shield')+'<p>Seus arquivos ficam neste aparelho. Ao exportar o ZIP, eles seguem junto com o prompt. Copiar apenas o texto não envia fotos ou documentos.</p></div><label class="toggle materials-review"><input type="checkbox" data-field="materialsReviewed" '+(activity.materialsReviewed?'checked':'')+'><span>Conferi os materiais e os '+t.plans+' desta atividade<small>Se não houver material adicional, confirme que o enunciado já tem o contexto necessário.</small></span></label>';
}
function statusPicker(){
 const current=statusOf(activity);
 return '<div class="status-block"><span class="overline">ANDAMENTO</span><div class="status-row" role="group" aria-label="Status da atividade">'+STATUSES.map(s=>'<button class="chip '+(current===s.id?'selected':'')+'" data-status="'+s.id+'" aria-pressed="'+(current===s.id)+'">'+s.label+'</button>').join('')+'</div>'+(current==='graded'?'<div class="form-grid">'+field('Nota recebida','grade',activity.grade,{placeholder:'Ex.: 9,5 ou MB'})+'</div>':'')+'</div>';
}
function historyList(){
 const items=activity.history||[];
 if(!items.length)return '';
 const names={zip:'Pacote ZIP',copy:'Prompt copiado',txt:'Arquivo .txt',md:'Arquivo .md',share:'Pacote compartilhado',html:'Página HTML baixada',github:'Link no GitHub Pages',link:'Link privado',calendar:'Agenda','open-chatgpt':'Aberto no ChatGPT','open-gemini':'Aberto no Gemini','open-claude':'Aberto no Claude'};
 return '<details class="history" '+(items.some(h=>h.url&&!h.removed)?'open':'')+'><summary>'+icon('history')+' Histórico de envios <span>'+items.length+'</span></summary><ol>'+items.map((h,i)=>'<li data-key="h-'+h.at+'"><b>'+(names[h.kind]||h.kind)+'</b><small>'+fmtTime(h.at)+(h.expiresAt?' · expira em '+new Date(h.expiresAt).toLocaleDateString('pt-BR'):h.kind==='link'?' · sem prazo':'')+'</small>'+(h.url&&!h.removed?'<div class="history-link"><a href="'+esc(h.url)+'" target="_blank" rel="noopener">'+esc(h.url.replace(/^https:\/\//,''))+'</a><button class="icon-btn" data-copy-link="'+i+'" aria-label="Copiar link">'+icon('copy')+'</button>'+(h.deleteToken?'<button class="icon-btn danger" data-remove-link="'+i+'" aria-label="Apagar link">'+icon('trash')+'</button>':'')+'</div>':h.removed?'<small>Link apagado.</small>':'')+'</li>').join('')+'</ol></details>';
}
function reviewForm(){
 const errors=[0,1,2].flatMap(n=>stageErrors(activity,profile,files,n)),all=relevantFiles(activity,effectiveFiles()),ptds=all.filter(f=>f.ownerType==='subject'),t=tpl();
 return '<div class="review-status '+(errors.length?'pending':'ready')+'">'+icon(errors.length?'edit':'check')+'<div><strong>'+(errors.length?errors.length+' ajuste'+(errors.length>1?'s':'')+' antes de exportar':'Seu contexto está pronto')+'</strong><p>'+(errors.length?'Complete os campos abaixo para gerar o pacote.':'Prompt + '+all.length+' anexos, incluindo '+ptds.length+' '+t.plans+'.')+'</p></div></div>'+
 (errors.length?'<ul class="validation-list">'+errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>':'')+
 (activity.snapshot?'<div class="notice snapshot-note">'+icon('history')+'<p><strong>Contexto guardado em '+fmtTime(activity.snapshot.at)+'</strong>Esta atividade usa o perfil e os '+t.plans+' da primeira exportação, para não mudar se você editar o perfil depois.</p>'+button('Atualizar','refresh-snapshot','rotate','ghost')+'</div>':'')+
 statusPicker()+
 '<div class="export-grid">'+button('Copiar prompt','copy','copy','secondary')+button('Baixar .txt','export-txt','file','secondary')+button('Baixar .md','export-md','file','secondary')+button('Compartilhar pacote','share','upload','secondary')+button('Página para IA','web-page','globe','secondary')+button('Revisar com IA','ai-review','wand','secondary')+button('Adicionar à agenda','calendar','calendar','secondary')+'</div>'+
 '<div class="open-ai"><span>Abrir direto na IA</span><div class="row">'+[['chatgpt','ChatGPT'],['gemini','Gemini'],['claude','Claude']].map(([id,name])=>'<button class="btn secondary" data-open-ai="'+id+'">'+icon('external')+'<span>'+name+'</span></button>').join('')+'</div><small>O prompt é copiado e a IA abre em seguida. Anexe o pacote ZIP para levar os arquivos.</small></div>'+
 '<details class="prompt-preview" open><summary>Prévia do prompt <span>'+promptText().length.toLocaleString('pt-BR')+' caracteres</span>'+icon('chevron')+'</summary><textarea id="prompt-preview" readonly aria-label="Prompt gerado">'+esc(promptText())+'</textarea></details>'+historyList()+'<div class="notice">'+icon('package')+'<p><strong>Leve o pacote completo.</strong>Extraia o ZIP e envie PROMPT.md junto com os anexos para a IA. Se ela aceitar ZIP, envie o pacote diretamente. Os limites de anexos variam por IA.</p></div>';
}
function pageHeading(eyebrow,title,description,action=''){return '<div class="page-heading"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p>'+description+'</p></div>'+action+'</div>';}
function libraryView(){
 const t=tpl();
 return pageHeading('SUA BASE DE CONHECIMENTO',t.subjects+' &amp; '+t.plans,'Cadastre uma vez. Conecte a cada nova atividade.',button(t.new+' '+lower(t.subject),'add-subject','plus','primary'))+
 '<div class="notice library-notice">'+icon('book')+'<p>Os '+t.plans+' de todos os períodos acompanham os prompts. Você também pode registrar conteúdos, competências e observações em texto, ou deixar a IA organizar tudo a partir dos arquivos.</p></div><div class="subject-grid">'+(subjects.length?subjects.map((s,i)=>'<button class="subject-card tilt spot" data-edit-subject="'+s.id+'" data-key="s-'+s.id+'"><span class="subject-symbol tone-'+(i%4)+'">'+icon('book')+'</span><h2>'+esc(s.name)+'</h2><p>'+esc(s.professor||t.teacher+' não informado')+'</p><div class="subject-periods">'+t.periods.map(n=>'<span class="'+(files.some(f=>f.ownerId===s.id&&String(f.period)===String(n))||s.notes?.[n]?'filled':'')+'">'+t.short(n)+'</span>').join('')+'</div><footer><span>'+plural(files.filter(f=>f.ownerType==='subject'&&f.ownerId===s.id).length,'arquivo','arquivos')+'</span>'+icon('arrow')+'</footer></button>').join(''):'<div class="empty-state">'+icon('book')+'<h2>Seu conhecimento começa aqui.</h2><p>Crie '+(t.of==='do'?'seu primeiro ':'sua primeira ')+lower(t.subject)+' e adicione os '+t.plans+'<br>para dar mais contexto às suas atividades.</p>'+button('Cadastrar '+lower(t.subject),'add-subject','plus','primary')+'</div>')+'</div>';
}
function filteredActivities(){
 const q=search.toLowerCase();
 return activities.filter(a=>(a.title+' '+(subjects.find(s=>s.id===a.subjectId)?.name||'')).toLowerCase().includes(q)&&(filterStatus==='all'||statusOf(a)===filterStatus)&&(!filterSubject||a.subjectId===filterSubject))
  .sort(sortBy==='due'?(a,b)=>(isClosed(a)-isClosed(b))||((a.due||'9999').localeCompare(b.due||'9999'))||(b.updatedAt-a.updatedAt):(a,b)=>b.updatedAt-a.updatedAt);
}
function draftItems(){
 const list=filteredActivities();
 return list.length?list.map(a=>{const c=countdown(a),st=statusOf(a);return '<article class="draft-card spot" data-key="a-'+a.id+'"><button class="draft-main" data-open-activity="'+a.id+'"><span class="draft-symbol">'+icon(isClosed(a)?'check':'file')+'</span><div><div class="draft-tags">'+tag(STATUSES.find(s=>s.id===st).label,st==='delivered'||st==='graded'?'green':st==='draft'?'':'gold')+(a.due&&!isClosed(a)?tag(c.text,'due-'+c.cls):'')+(st==='graded'&&a.grade?tag('Nota '+esc(a.grade),'green'):'')+'</div><h3>'+esc(a.title||'Atividade sem título')+'</h3><p>'+esc(subjects.find(s=>s.id===a.subjectId)?.name||tpl().subject+' a definir')+' <span>·</span> '+(a.due?'Entrega '+fmtDate(a.due):'Sem prazo')+'</p></div>'+icon('arrow')+'</button><div class="draft-tools"><button class="icon-btn" data-calendar="'+a.id+'" aria-label="Adicionar '+esc(a.title)+' à agenda">'+icon('calendar')+'</button><button class="icon-btn" data-duplicate="'+a.id+'" aria-label="Duplicar '+esc(a.title)+'">'+icon('copy')+'</button><button class="icon-btn danger" data-delete-activity="'+a.id+'" aria-label="Excluir '+esc(a.title)+'">'+icon('trash')+'</button></div></article>';}).join(''):'<div class="empty-state">'+icon('folder')+'<h2>'+(search||filterStatus!=='all'||filterSubject?'Nenhuma atividade encontrada.':'Espaço para suas próximas ideias.')+'</h2><p>'+(search||filterStatus!=='all'||filterSubject?'Tente outro filtro, título ou '+lower(tpl().subject)+'.':'Suas atividades salvas aparecem aqui.')+'</p></div>';
}
function trashView(){
 const t=tpl(),rows=[...trashed.activities.map(a=>['activity',a.id,a.title||'Atividade sem título','Atividade',a.deletedAt]),...trashed.subjects.map(s=>['subject',s.id,s.name,t.subject,s.deletedAt]),...trashed.files.map(f=>['file',f.id,f.name,'Anexo · '+bytes(f.size),f.deletedAt])].sort((a,b)=>b[4]-a[4]);
 return '<section class="trash-panel"><div class="trash-head"><div><h2>'+icon('trash')+' Lixeira</h2><p>Itens apagados ficam aqui por '+TRASH_DAYS+' dias e depois somem sozinhos.</p></div>'+(rows.length?button('Esvaziar lixeira','empty-trash','trash','ghost danger'):'')+'</div>'+(rows.length?'<ul class="trash-list">'+rows.map(([type,id,name,kind,at])=>'<li data-key="t-'+id+'"><div><strong>'+esc(name)+'</strong><small>'+kind+' · apagado em '+fmtTime(at)+'</small></div><button class="btn secondary" data-restore="'+type+':'+id+'">'+icon('undo')+'<span>Restaurar</span></button><button class="icon-btn danger" data-purge="'+type+':'+id+'" aria-label="Apagar '+esc(name)+' de vez">'+icon('close')+'</button></li>').join('')+'</ul>':'<p class="muted">A lixeira está vazia.</p>')+'</section>';
}
function draftsView(){
 const count=trashed.activities.length+trashed.subjects.length+trashed.files.length,t=tpl();
 return pageHeading('DO RASCUNHO À ENTREGA','Minhas atividades','Prazos, andamento e tudo o que você já criou.',button('Nova atividade','new','plus','primary'))+
 '<div class="draft-toolbar"><div class="search-box">'+icon('search')+'<input id="search" aria-label="Buscar atividades" placeholder="Buscar por título ou '+lower(t.subject)+'" value="'+esc(search)+'"></div><select id="filter-subject" aria-label="Filtrar por '+lower(t.subject)+'"><option value="">'+t.subjects+': todas</option>'+subjects.map(s=>'<option value="'+s.id+'" '+(filterSubject===s.id?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select><select id="sort-by" aria-label="Ordenar"><option value="due" '+(sortBy==='due'?'selected':'')+'>Ordenar por prazo</option><option value="recent" '+(sortBy==='recent'?'selected':'')+'>Mais recentes</option></select></div>'+
 '<div class="status-filter" role="group" aria-label="Filtrar por status">'+[['all','Todas'],...STATUSES.map(s=>[s.id,s.label])].map(([id,label])=>'<button class="chip '+(filterStatus===id?'selected':'')+'" data-filter-status="'+id+'" aria-pressed="'+(filterStatus===id)+'">'+label+'</button>').join('')+'</div>'+
 '<div class="draft-actions">'+button('Exportar prazos para a agenda','calendar-all','calendar','ghost')+button((showTrash?'Fechar lixeira':'Lixeira')+(count?' ('+count+')':''),'toggle-trash','trash','ghost')+'</div>'+(showTrash?trashView():'')+
 '<div id="draft-list" class="draft-list">'+draftItems()+'</div>';
}
function profileView(){
 const p=profile,t=tpl();
 const total=[...files,...trashed.files].reduce((sum,f)=>sum+f.size,0),inTrash=trashed.files.reduce((s,f)=>s+f.size,0);
 return pageHeading('UM APP DO SEU JEITO','Meu perfil','Sua voz, suas preferências e o controle dos seus dados.')+
 '<section class="settings-card spot"><div class="section-heading"><div><h2>Quem está criando?</h2><p>Esses dados ajudam a personalizar cada prompt.</p></div>'+icon('user','heading-icon')+'</div><div class="form-grid">'+
 field('Seu nome','name',p.name,{scope:'profile',placeholder:'Como você quer ser identificado(a)?'})+field('Instituição','school',p.school,{scope:'profile',placeholder:'Sua escola, faculdade ou empresa'})+field('Modelo da instituição','institution',p.institution,{scope:'profile',type:'select',list:Object.values(TEMPLATES).map(x=>({value:x.id,label:x.name})),hint:'Muda os nomes dos campos: '+t.subject.toLowerCase()+', '+t.period.toLowerCase()+', '+t.teacher.toLowerCase()+' e '+t.plans+'.'})+field('Curso','course',p.course,{scope:'profile'})+field('Turma','className',p.className,{scope:'profile'})+field('Nível de estudo','level',p.level,{scope:'profile'})+field('Idioma das entregas','language',p.language,{scope:'profile'})+field('Estilo de escrita','style',p.style,{scope:'profile',full:true,placeholder:'Ex.: direto, com exemplos e sem palavras muito formais'})+field('Uma amostra da sua escrita','sample',p.sample,{scope:'profile',type:'textarea',full:true,rows:4,placeholder:'Cole um texto seu. A IA usará como referência de tom e vocabulário.'})+'</div></section>'+
 '<section class="settings-card voice-card spot"><div class="section-heading"><div><span class="overline">SUA VOZ</span><h2>Para soar como você</h2><p>Envie 2 ou 3 trabalhos que você mesmo escreveu. A IA descreve seu jeito de escrever e esse guia entra em todos os prompts.</p></div>'+icon('chat','heading-icon')+'</div>'+field('Guia da sua voz','voiceGuide',p.voiceGuide,{scope:'profile',type:'textarea',full:true,rows:6,placeholder:'Ainda vazio. Gere com seus trabalhos ou escreva do seu jeito.'})+'<div class="button-wrap">'+button(p.voiceGuide?'Gerar de novo com meus trabalhos':'Gerar com meus trabalhos','voice-ai','wand','primary')+'</div></section>'+
 '<section class="settings-card spot"><div class="section-heading"><div><h2>Identidade &amp; regras</h2><p>Adapte o app para você, sua turma ou sua marca.</p></div>'+icon('spark','heading-icon')+'</div><div class="form-grid">'+field('Nome da marca','brand',p.brand,{scope:'profile',full:true})+field('Link do manual de formatação','manualUrl',p.manualUrl,{scope:'profile',full:true,type:'url',hint:'O manual CPS que acompanha o app é a versão de 2015 fornecida pelo criador. Um arquivo enviado abaixo substitui o manual do pacote.'})+'</div><div class="settings-uploads"><div><h3>Manual da instituição</h3>'+uploadBox('manual','Anexar manual próprio','.pdf,.docx',false)+fileList(files.filter(f=>f.kind==='manual'))+'</div><div><h3>Logo da sua marca</h3>'+uploadBox('brand','Usar outra logo','image/png,image/jpeg,image/webp',false)+fileList(files.filter(f=>f.kind==='brand'))+'</div></div>'+field('Regras adicionais para os prompts','extraRules',p.extraRules,{scope:'profile',type:'textarea',rows:3,placeholder:'Preferências da escola, estrutura padrão, orientações recorrentes…'})+'</section>'+
 '<section class="settings-card spot"><div class="section-heading"><div><span class="overline">EXPERIÊNCIA</span><h2>Movimento e desempenho</h2><p>O modo automático reduz efeitos em aparelhos mais simples.</p></div>'+icon('gauge','heading-icon')+'</div><div class="form-grid">'+field('Efeitos visuais','effects',p.effects,{scope:'profile',type:'select',list:[{value:'auto',label:'Automático'},{value:'full',label:'Completos'},{value:'lite',label:'Econômicos'}],hint:document.body.classList.contains('lite')?'Modo econômico ativo neste aparelho.':'Efeitos completos ativos neste aparelho.'})+'</div><label class="toggle"><input type="checkbox" data-profile="motion" '+(p.motion?'checked':'')+'><span>Animações da interface<small>A preferência de movimento reduzido do aparelho também é respeitada.</small></span></label><label class="toggle"><input type="checkbox" data-profile="compressPhotos" '+(p.compressPhotos?'checked':'')+'><span>Comprimir fotos ao anexar<small>Fotos grandes viram JPEG de alta qualidade com até 2400 px e ocupam até 10 vezes menos espaço.</small></span></label></section>'+
 '<section class="settings-card spot"><div class="section-heading"><div><span class="overline">ASSISTENTE CK</span><h2>IA que preenche por você</h2><p>Fotos e documentos só saem do aparelho quando você toca em Analisar com IA. A chave da IA fica no servidor do app, nunca no seu aparelho ou no backup.</p></div>'+icon('wand','heading-icon')+'</div><div class="form-grid">'+field('Código de acesso da IA','aiCode',p.aiCode,{scope:'profile',type:'password',full:true,placeholder:'Peça a quem hospeda o app',hint:'Protege a cota da IA e dos links. Digite uma vez ou abra o link de ativação em cada aparelho.'})+'</div>'+(p.aiCode?'<div class="button-wrap">'+button('Copiar link de ativação','copy-code-link','link','secondary')+'</div>':'')+'</section>'+
 workspacesCard()+
 '<section class="settings-card spot"><div class="section-heading"><div><h2>Seu aparelho, seu espaço</h2><p>Salvamento local, sem envio automático para servidores.</p></div>'+icon('shield','heading-icon')+'</div><div class="storage-row"><span>'+bytes(total)+' de 120 MB em anexos'+(inTrash?' · '+bytes(inTrash)+' na lixeira':'')+'</span>'+button('Proteger armazenamento','persist','shield','ghost')+'</div><p class="muted">'+(p.lastBackupAt?'Último backup: '+fmtTime(p.lastBackupAt)+'. ':'Nenhum backup ainda. ')+'Limpar os dados do navegador, remover o app ou trocar de aparelho pode apagar seus materiais.</p><div class="button-wrap">'+button('Exportar backup','backup','download','secondary')+button('Salvar no Drive ou na nuvem','backup-share','upload','secondary')+button('Restaurar backup','restore','undo','secondary')+button('Instalar app','install','plus','primary')+(updatingWorker?button('Atualizar aplicativo','update','download','secondary'):'')+'</div>'+('showSaveFilePicker' in window?'<div class="auto-backup">'+icon('history')+'<p><strong>Backup automático no computador</strong>'+(backupHandle?'Salvando em '+esc(backupHandle.name)+'. Escolha um arquivo dentro da pasta do Google Drive ou OneDrive para ter cópia na nuvem.':'Escolha um arquivo, de preferência numa pasta sincronizada com o Google Drive. O CK atualiza esse arquivo com um toque.')+'</p>'+button(backupHandle?'Atualizar agora':'Escolher arquivo','backup-file','folder','ghost')+'</div>':'')+'</section>'+transferSection()+diagnosticsCard();
}
function workspacesCard(){
 const all=[{id:'default',name:'Principal'},...workspaces];
 return '<section class="settings-card spot"><div class="section-heading"><div><span class="overline">MESMO APARELHO, PESSOAS DIFERENTES</span><h2>Perfis</h2><p>Cada perfil tem atividades, '+lower(tpl().subjects)+', anexos e preferências separados.</p></div>'+icon('layers','heading-icon')+'</div><ul class="workspace-list">'+all.map(w=>'<li data-key="w-'+w.id+'" class="'+(w.id===workspace?'current':'')+'"><span class="ws-dot">'+esc(w.name.slice(0,1).toUpperCase())+'</span><div><strong>'+esc(w.name)+'</strong><small>'+(w.id===workspace?'Em uso agora':'Toque em Usar para trocar')+'</small></div>'+(w.id===workspace?tag('Atual','green'):'<button class="btn secondary" data-use-workspace="'+w.id+'">Usar</button>')+(w.id!=='default'?'<button class="icon-btn" data-rename-workspace="'+w.id+'" aria-label="Renomear '+esc(w.name)+'">'+icon('edit')+'</button><button class="icon-btn danger" data-delete-workspace="'+w.id+'" aria-label="Apagar perfil '+esc(w.name)+'">'+icon('trash')+'</button>':'')+'</li>').join('')+'</ul><div class="button-wrap">'+button('Novo perfil','new-workspace','plus','secondary')+'</div></section>';
}
function diagnosticsCard(){
 return '<section class="settings-card spot"><div class="section-heading"><div><span class="overline">TESTE RÁPIDO</span><h2>Diagnóstico do aparelho</h2><p>Confira câmera, instalação, modo offline, espaço e fluidez neste celular ou computador.</p></div>'+icon('gauge','heading-icon')+'</div>'+(diagnostics?'<ul class="diag-list">'+diagnostics.checks.map(c=>'<li class="'+(c.ok?'ok':'warn')+'">'+icon(c.ok?'check':'clock')+'<div><strong>'+esc(c.label)+'</strong><small>'+esc(c.detail)+'</small></div></li>').join('')+'</ul><p class="muted">'+esc(diagnostics.screen)+' · '+esc(diagnostics.at)+'</p>':'')+'<div class="button-wrap">'+button(diagnostics?'Testar de novo':'Testar este aparelho','diagnose','gauge','secondary')+(diagnostics?button('Copiar relatório','copy-diagnostics','copy','ghost'):'')+'</div></section>';
}
function subjectDialog(id){
 editingSubjectId=id;const s=subjects.find(s=>s.id===id);if(!s)return;
 const d=$('#dialog'),t=tpl();
 const html='<div class="dialog-head"><div><span class="overline">BIBLIOTECA</span><h2>Editar '+lower(t.subject)+'</h2></div><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body"><div class="form-grid">'+field('Nome '+t.of+' '+lower(t.subject),'name',s.name,{scope:'subject',required:true})+field(t.teacher+' padrão','professor',s.professor,{scope:'subject'})+'</div><div class="subsection"><div class="ptd-title"><h3>'+t.planLong+'</h3>'+button('Ler com IA','ptd-ai','wand','ghost')+'</div><p class="muted">Todos os períodos são incluídos no pacote, independentemente do período da atividade.</p><div class="period-tabs">'+[...t.periods,'anual'].map(n=>'<button class="'+(libraryPeriod===n?'selected':'')+'" data-period="'+n+'">'+(n==='anual'?'Anual':t.periodTab(n))+'</button>').join('')+'</div>'+uploadBox('ptd','Adicionar '+t.plan+' deste período')+fileList(files.filter(f=>f.ownerType==='subject'&&f.ownerId===id&&f.period===libraryPeriod))+field('Conteúdo e competências do período','notes.'+libraryPeriod,s.notes?.[libraryPeriod]||'',{scope:'subject',type:'textarea',rows:4,placeholder:'Cole o conteúdo do plano aqui ou use Ler com IA para organizar automaticamente.'})+'</div></div><div class="dialog-footer">'+button('Excluir '+lower(t.subject),'delete-subject','trash','ghost danger')+button('Concluir','close-dialog','check','primary')+'</div>';
 if(d.open&&d.querySelector('[data-subject]'))morph(d,html);else d.innerHTML=html;
 if(!d.open)d.showModal();
}
async function createSubject(){await saveActivity();const s={id:uid(),name:tpl().new==='Novo'?'Novo projeto':'Nova '+lower(tpl().subject),professor:'',notes:{},createdAt:Date.now(),updatedAt:Date.now()};await put('subjects',s);subjects.push(s);announce({type:'data'});if(view==='activity'){activity.subjectId=s.id;await saveActivity();}libraryPeriod=tpl().periods[0];render();subjectDialog(s.id);$('#subject-name').focus();$('#subject-name').select();}
function confirmDialog(title,message,onConfirm){
 const d=$('#dialog');d.innerHTML='<div class="dialog-head"><h2>'+esc(title)+'</h2></div><div class="dialog-body"><p>'+esc(message)+'</p></div><div class="dialog-footer">'+button('Cancelar','close-dialog',null,'secondary')+'<button class="btn primary" id="confirm-action">Confirmar</button></div>';if(!d.open)d.showModal();$('#confirm-action').onclick=async()=>{try{await onConfirm();d.close();}catch(e){fail(e);}};
}
function promptDialog(title,label,value,onSave){
 const d=$('#dialog');d.innerHTML='<div class="dialog-head"><h2>'+esc(title)+'</h2></div><div class="dialog-body"><label for="prompt-value">'+esc(label)+'</label><input id="prompt-value" value="'+esc(value)+'" maxlength="40" autocomplete="off"></div><div class="dialog-footer">'+button('Cancelar','close-dialog',null,'secondary')+'<button class="btn primary" id="prompt-save">Salvar</button></div>';if(!d.open)d.showModal();
 const input=$('#prompt-value');input.focus();input.select();const save=async()=>{const v=input.value.trim();if(!v){toast('Escreva um nome.');return;}try{await onSave(v);d.close();}catch(e){fail(e);}};$('#prompt-save').onclick=save;input.onkeydown=e=>{if(e.key==='Enter')save();};
}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function shareOrDownload(blob,name,title){const file=new File([blob],name,{type:blob.type});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title});return 'shared';}catch(error){if(error.name==='AbortError')return 'aborted';}}download(blob,name);return 'downloaded';}
function requireValid(){const missing=firstIncompleteStage(activity,profile,files);if(missing){step=missing.stage;stageMessages=missing.errors;render();showStageErrors();return false;}return true;}
async function recordExport(kind,extra={}){
 if(!activity.snapshot)activity.snapshot=snapshotOf(currentSubject(),profile);
 activity.history=[{at:Date.now(),kind,...extra},...(activity.history||[])].slice(0,60);
 const advanced=statusOf(activity)==='draft'&&kind!=='calendar';
 if(advanced)activity.status='sent';
 await saveActivity();render();
 return advanced;
}
async function packageActivity(){
 const t=tpl(),selected=relevantFiles(activity,effectiveFiles());const entries=[{name:'PROMPT.md',blob:new Blob([promptText()],{type:'text/markdown'})},{name:'LEIA-ME.txt',blob:new Blob(['CK Promptmaker\n\n1. Extraia este ZIP.\n2. Envie PROMPT.md e todos os anexos para a IA. Se ela aceitar ZIP, envie o pacote diretamente.\n3. Confira se a IA conseguiu ler os arquivos. Alguns serviços não abrem ZIPs ou têm limites de tamanho.\n4. Revise, compreenda e ajuste o resultado antes de entregar.\n\nO prompt não contém os bytes dos anexos. Os arquivos estão nas pastas deste pacote.\nO manual CPS, quando presente, pertence ao Centro Paula Souza. Fonte: '+CPS_URL+'\n'])}];
 for(let i=0;i<selected.length;i++){const f=selected[i];let blob=f.blob;if(f.url){const response=await fetch(f.url);if(!response.ok)throw new Error('Não foi possível carregar '+f.name+'. Abra o app online uma vez e tente novamente.');blob=await response.blob();}entries.push({name:pathForFile(f,i,t),blob});}
 entries.push({name:'briefing.json',blob:new Blob([JSON.stringify({version:1,activity,subject:currentSubject(),profile:{...profile,aiCode:undefined},attachments:selected.map((f,i)=>({name:f.name,path:pathForFile(f,i,t),kind:f.kind,period:f.period}))},null,2)],{type:'application/json'})});
 return runExport('zip',entries);
}
async function exportAction(type){
 if(!requireValid()||busy)return;await saveActivity();
 if(type==='copy'){let copied=true;try{await navigator.clipboard.writeText(promptText());}catch{copied=false;const preview=$('#prompt-preview');preview.focus();preview.select();}const moved=await recordExport('copy');toast((copied?'Prompt copiado. Envie os anexos junto com o texto.':'Selecionei o prompt. Use a opção Copiar do seu aparelho.')+(moved?' Status: Enviada à IA.':''));return;}
 if(type==='export-txt'||type==='export-md'){download(new Blob([promptText()],{type:'text/plain;charset=utf-8'}),safeName(activity.title)+(type==='export-md'?'.md':'.txt'));await recordExport(type==='export-md'?'md':'txt');toast('Prompt exportado. Lembre-se de enviar os anexos.');return;}
 busy=true;toast('Preparando seu pacote…');
 try{const zip=await packageActivity();const name=safeName(activity.title)+'.zip';
 let result='downloaded';
 if(type==='share')result=await shareOrDownload(zip,name,activity.title);else download(zip,name);
 if(result!=='aborted'){await recordExport(type==='share'&&result==='shared'?'share':'zip');toast(result==='shared'?'Pacote compartilhado.':type==='share'?'Compartilhamento indisponível aqui. O pacote foi baixado.':'Pacote completo exportado.');}
 }finally{busy=false;}
}
const AI_TARGETS={chatgpt:{name:'ChatGPT',url:p=>'https://chatgpt.com/?q='+encodeURIComponent(p),home:'https://chatgpt.com/'},claude:{name:'Claude',url:p=>'https://claude.ai/new?q='+encodeURIComponent(p),home:'https://claude.ai/new'},gemini:{name:'Gemini',home:'https://gemini.google.com/app'}};
async function openInAi(id){
 if(!requireValid())return;await saveActivity();
 const target=AI_TARGETS[id],text=promptText();
 let copied=true;try{await navigator.clipboard.writeText(text);}catch{copied=false;}
 const url=target.url&&text.length<=6500?target.url(text):target.home;
 window.open(url,'_blank','noopener');
 await recordExport('open-'+id);
 toast((target.url&&text.length<=6500?'Abrindo o '+target.name+' com o prompt.':'Prompt '+(copied?'copiado':'pronto')+'. Cole na conversa do '+target.name+'.')+' Anexe o pacote ZIP para levar os arquivos.');
}
async function addToCalendar(list){
 const dated=list.filter(a=>a.due);
 if(!dated.length){toast('Defina a data de entrega para adicionar à agenda.');return;}
 const blob=new Blob([icsFor(dated,subjects)],{type:'text/calendar;charset=utf-8'});
 const name=dated.length===1?safeName(dated[0].title||'entrega')+'.ics':'entregas-ck.ics';
 const result=await shareOrDownload(blob,name,'Entregas');
 if(result==='aborted')return;
 if(dated.length===1&&dated[0].id===activity.id)await recordExport('calendar');
 toast(dated.length===1?'Abra o arquivo para salvar o prazo na agenda, com lembrete um dia antes.':plural(dated.length,'prazo pronto','prazos prontos')+' para a agenda, com lembretes um dia antes.');
}
async function handleUpload(input){
 let list=Array.from(input.files||[]);if(!list.length)return;const kind=input.dataset.upload;
 if(kind==='media'&&list.some(f=>!f.name.toLowerCase().endsWith('.zip')))throw new Error('Selecione um arquivo ZIP para o pacote de mídia.');
 if(profile.compressPhotos&&['base','ptd'].includes(kind)){const {compressPhoto}=await import('./assist.js');list=await Promise.all(list.map(f=>compressPhoto(f)));}
 let ownerType='activity',ownerId=activity.id,opts={kind};
 if(kind==='ptd'){ownerType='subject';ownerId=editingSubjectId;opts={kind:'ptd',period:libraryPeriod};}
 else if(kind==='manual'||kind==='brand'){ownerType='profile';ownerId='profile';}
 else await saveActivity();
 const records=await addFiles(list,ownerType,ownerId,opts);
 if(ownerType==='profile'){const old=files.filter(f=>f.kind===kind);await batch(old.map(f=>({store:'files',type:'delete',id:f.id})));files=files.filter(f=>f.kind!==kind);}
 files.push(...records);announce({type:'data'});if(kind!=='ptd')invalidateMaterials();scheduleSave();input.value='';render();if(kind==='ptd')subjectDialog(editingSubjectId);toast(plural(records.length,'arquivo salvo','arquivos salvos')+' no aparelho.');
}
function setPath(object,key,value){const parts=key.split('.');if(parts.length===2)object[parts[0]][parts[1]]=value;else object[key]=value;}
async function handleField(target){
 if(target.dataset.field){
 const key=target.dataset.field;let value=target.type==='checkbox'?target.checked:target.value;
 if(key!=='materialsReviewed'&&key!=='grade')invalidateMaterials();
 if(key.startsWith('member-'))activity.members[Number(key.split('-')[1])]=value;
 else setPath(activity,key,value);
 if(key==='subjectId'){activity.professor=currentSubject()?.professor||'';render();}
 else if(['customSite','website.hasMedia','website.github','includeManual'].includes(key))render();
 scheduleSave();updateBrief();refreshStageLocks();
 } else if(target.dataset.profile){
 const key=target.dataset.profile,previous=templateOf(profile);
 setPath(profile,key,target.type==='checkbox'?target.checked:target.value);
 if(key==='institution'&&profile.level===previous.level)profile.level=templateOf(profile).level;
 await saveProfile();
 document.body.classList.toggle('no-motion',!profile.motion);
 if(key==='effects'){applyEffects(profile.effects);render();}
 if(key==='institution'){libraryPeriod=templateOf(profile).periods[0];render();}
 if(key==='name'){const avatar=$('.avatar');if(avatar)avatar.textContent=initialsOf(profile.name);}
 }else if(target.dataset.subject){
 const s=subjects.find(s=>s.id===editingSubjectId);setPath(s,target.dataset.subject,target.value);s.updatedAt=Date.now();invalidateMaterials();scheduleSave();await put('subjects',structuredClone(s));announce({type:'data'});
 }else if(target.id==='search'){search=target.value;morph($('#draft-list'),draftItems());}
 else if(target.id==='filter-subject'){filterSubject=target.value;render();}
 else if(target.id==='sort-by'){sortBy=target.value;render();}
 else if(aiDraft&&target.id==='ai-note')aiDraft.note=target.value;
 else if(aiDraft&&target.id==='ai-code')aiDraft.code=target.value.trim();
 else if(aiDraft&&target.id==='ai-attach')aiDraft.attach=target.checked;
 else if(aiDraft&&target.dataset.aiExisting){if(target.checked)aiDraft.existing.add(target.dataset.aiExisting);else aiDraft.existing.delete(target.dataset.aiExisting);}
 else if(aiDraft&&target.dataset.aiItem!==undefined)aiDraft.items[Number(target.dataset.aiItem)].checked=target.checked;
}
function popTargets(t){
 const pops=['category','format','websiteChoice','mode','period','status','filterStatus'].some(k=>t.dataset[k]!==undefined)?[['button'+Object.entries(t.dataset).map(([k,v])=>'[data-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+'="'+CSS.escape(v)+'"]').join(''),'fx-pop']]:[];
 if(t.dataset.mode==='group'||t.dataset.action==='confirm-group')pops.push(['.group-box','fx-reveal']);
 if(t.dataset.category||t.dataset.format)pops.push(['.website-section','fx-reveal']);
 if(t.dataset.category)pops.push(['[data-key="cat-'+CSS.escape(t.dataset.category)+'"] .format-picker','fx-reveal']);
 return pops;
}
function flash(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);el.addEventListener('animationend',()=>el.classList.remove(cls),{once:true});}
async function handleClick(event){
 const t=event.target.closest('button');if(!t||t.closest('.scanner'))return;
 const targets=popTargets(t);
 await route(t);
 for(const [selector,cls] of targets)flash(document.querySelector(selector),cls);
}
async function go(next){await saveActivity();const changed=view!==next;view=next;stageMessages=[];render();logoTransition();if(changed)viewSweep();window.scrollTo(0,0);}
async function route(t){
 if(t.dataset.view){await go(t.dataset.view);return;}
 if(t.dataset.aiRemove!==undefined){const [file]=aiDraft.files.splice(Number(t.dataset.aiRemove),1);const url=aiDraft.urls.get(file);if(url)URL.revokeObjectURL(url);aiDraft.urls.delete(file);aiRenderPick();return;}
 if(t.dataset.step!==undefined){await goStep(Number(t.dataset.step));return;}
 if(t.dataset.mode){invalidateMaterials();activity.mode=t.dataset.mode;await saveActivity();render();return;}
 if(t.dataset.category){invalidateMaterials();const c=CATEGORIES.find(c=>c.id===t.dataset.category);if(activity.deliveries.some(d=>d.category===c.id))activity.deliveries=activity.deliveries.filter(d=>d.category!==c.id);else activity.deliveries.push({category:c.id,format:c.formats[0]});await saveActivity();render();return;}
 if(t.dataset.format){invalidateMaterials();const i=activity.deliveries.findIndex(d=>d.category===t.dataset.cat&&d.format===t.dataset.format);if(i>=0)activity.deliveries.splice(i,1);else activity.deliveries.push({category:t.dataset.cat,format:t.dataset.format});await saveActivity();render();return;}
 if(t.dataset.websiteChoice){invalidateMaterials();activity.website[t.dataset.websiteChoice]=t.dataset.value;await saveActivity();render();return;}
 if(t.dataset.status){activity.status=t.dataset.status;await saveActivity();render();toast('Status: '+STATUSES.find(s=>s.id===t.dataset.status).label+'.');return;}
 if(t.dataset.filterStatus){filterStatus=t.dataset.filterStatus;render();return;}
 if(t.dataset.openAi){await openInAi(t.dataset.openAi);return;}
 if(t.dataset.calendar){await addToCalendar([activities.find(a=>a.id===t.dataset.calendar)]);return;}
 if(t.dataset.copyLink!==undefined){const h=activity.history[Number(t.dataset.copyLink)];try{await navigator.clipboard.writeText(h.url);toast('Link copiado.');}catch{toast(h.url);}return;}
 if(t.dataset.removeLink!==undefined){await removePublishedLink(Number(t.dataset.removeLink));return;}
 if(t.dataset.restore){const [type,id]=t.dataset.restore.split(':');await restoreItem(type,id);return;}
 if(t.dataset.purge){const [type,id]=t.dataset.purge.split(':');confirmDialog('Apagar de vez?','Este item e os anexos ligados a ele serão removidos definitivamente.',async()=>{if(type==='file')await batch([{store:'files',type:'delete',id}]);else await removeOwner(type,id);await refreshData();render();});return;}
 if(t.dataset.useWorkspace){await switchWorkspace(t.dataset.useWorkspace);return;}
 if(t.dataset.renameWorkspace){const w=workspaces.find(w=>w.id===t.dataset.renameWorkspace);promptDialog('Renomear perfil','Nome do perfil',w.name,async name=>{w.name=name;local.set('ck-workspaces',workspaces);render();});return;}
 if(t.dataset.deleteWorkspace){const w=workspaces.find(w=>w.id===t.dataset.deleteWorkspace);confirmDialog('Apagar o perfil '+w.name+'?','Todas as atividades, '+lower(tpl().subjects)+', anexos e preferências desse perfil serão apagados deste aparelho. Exporte um backup antes se quiser guardar.',async()=>{if(w.id===workspace)await switchWorkspace('default',true);await deleteWorkspace(w.id);workspaces=workspaces.filter(x=>x.id!==w.id);local.set('ck-workspaces',workspaces);render();toast('Perfil apagado.');});return;}
 if(t.dataset.editSubject){libraryPeriod=tpl().periods[0];subjectDialog(t.dataset.editSubject);return;}
 if(t.dataset.period){libraryPeriod=t.dataset.period;subjectDialog(editingSubjectId);return;}
 if(t.dataset.deleteFile){await trashFile(t.dataset.deleteFile);return;}
 if(t.dataset.downloadFile){const f=files.find(f=>f.id===t.dataset.downloadFile);download(f.blob,f.name);return;}
 if(t.dataset.openActivity){await saveActivity();activity=structuredClone(activities.find(a=>a.id===t.dataset.openActivity));lastSaved=JSON.stringify({...activity,updatedAt:0});await put('settings',{id:'active',activityId:activity.id});view='activity';step=0;stageMessages=[];render();window.scrollTo(0,0);return;}
 if(t.dataset.duplicate){const original=activities.find(a=>a.id===t.dataset.duplicate);const clone={...structuredClone(original),id:uid(),title:original.title+' (cópia)',status:'draft',grade:'',history:[],snapshot:undefined,createdAt:Date.now(),updatedAt:Date.now()};const copies=files.filter(f=>f.ownerType==='activity'&&f.ownerId===original.id).map(f=>({...f,id:uid(),ownerId:clone.id}));if([...files,...trashed.files].reduce((n,f)=>n+f.size,0)+copies.reduce((n,f)=>n+f.size,0)>MAX_TOTAL)throw new Error('Não há espaço para duplicar os anexos. Esvazie a lixeira ou exporte um backup e libere espaço.');await batch([{store:'activities',value:clone},...copies.map(value=>({store:'files',value}))]);activities.push(clone);files.push(...copies);announce({type:'data'});render();toast('Atividade duplicada com os anexos.');return;}
 if(t.dataset.deleteActivity){await trashActivity(t.dataset.deleteActivity);return;}
 const action=t.dataset.action;
 if(['copy','export-txt','export-md','export-zip','share'].includes(action)){await exportAction(action);return;}
 switch(action){
 case 'next':case 'previous':await goStep(step+(action==='next'?1:-1));break;
 case 'confirm-group':{const count=Number(activity.groupSize);if(!Number.isInteger(count)||count<2||count>30){toast('O grupo deve ter entre 2 e 30 integrantes.');return;}activity.members=Array.from({length:count},(_,i)=>activity.members[i]||'');await saveActivity();render();break;}
 case 'add-subject':await createSubject();break;
 case 'edit-current-subject':libraryPeriod=activity.period;subjectDialog(activity.subjectId);break;
 case 'close-dialog':{const s=subjects.find(s=>s.id===editingSubjectId);if($('#dialog [data-subject]')&&s&&!s.name.trim()){toast('Informe um nome.');return;}const copyProfessor=s&&activity.subjectId===s.id&&!activity.professor.trim();if(copyProfessor)activity.professor=s.professor||'';$('#dialog').close();editingSubjectId=null;render();if(copyProfessor)await saveActivity();break;}
 case 'delete-subject':{const id=editingSubjectId;if(activities.some(a=>a.subjectId===id)){toast('Em uso por atividades. Troque nas atividades antes de excluir.');return;}$('#dialog').close();editingSubjectId=null;await trash('subject',id);await refreshData();render();announce({type:'data'});toast('Movido para a lixeira.',{label:'Desfazer',run:()=>restoreItem('subject',id)});break;}
 case 'new':await saveActivity();activity=newActivity();lastSaved='';await put('settings',{id:'active',activityId:activity.id});view='activity';step=0;stageMessages=[];await saveActivity();render();window.scrollTo(0,0);break;
 case 'camera':await scan(view==='activity'&&step===0?'ai':'materials');break;
 case 'scan-materials':await scan('materials');break;
 case 'ai-camera':await scan('ai');break;
 case 'transfer-out':await saveActivity();download(await exportBackup(),'CK-transferencia-'+today()+'.json');profile.lastBackupAt=Date.now();await saveProfile();render();toast('Envie esse arquivo ao outro aparelho e use Receber dados.');break;
 case 'transfer-in':$('#transfer-input').click();break;
 case 'web-page':await openWebPage();break;
 case 'page-download':await downloadWebPage();break;
 case 'page-publish':await publishWebPage();break;
 case 'page-vercel':await publishVercelPage();break;
 case 'copy-page-link':try{await navigator.clipboard.writeText($('#published-url').value);toast('Link copiado.');}catch{$('#published-url').select();toast('Selecione e copie o link.');}break;
 case 'ai-open':aiOpen();break;
 case 'ai-files':$('#ai-file-input').click();break;
 case 'ai-scan':await scan('ai');break;
 case 'ai-analyze':await aiAnalyze();break;
 case 'ai-apply':await aiApply();break;
 case 'ai-back':aiRenderPick();break;
 case 'ai-review':await aiReview();break;
 case 'review-apply':await applyReviewAnswers();break;
 case 'voice-ai':$('#voice-input').click();break;
 case 'voice-apply':await applyVoice();break;
 case 'ptd-ai':await ptdAi();break;
 case 'ptd-apply':await applyPtd();break;
 case 'refresh-snapshot':activity.snapshot=snapshotOf(currentSubject(),profile);await saveActivity();render();toast('Contexto atualizado com o perfil e os '+tpl().plans+' de agora.');break;
 case 'calendar':await addToCalendar([activity]);break;
 case 'calendar-all':await addToCalendar(activities.filter(a=>!isClosed(a)));break;
 case 'toggle-trash':showTrash=!showTrash;render();break;
 case 'empty-trash':confirmDialog('Esvaziar a lixeira?','Tudo o que está na lixeira será apagado de vez.',async()=>{await purgeTrash(Date.now()+1,0);await refreshData();render();toast('Lixeira vazia.');});break;
 case 'backup':await saveActivity();await makeBackup('download');break;
 case 'backup-now':await saveActivity();await makeBackup(backupHandle?'file':'share');break;
 case 'backup-share':await saveActivity();await makeBackup('share');break;
 case 'backup-file':await saveActivity();await makeBackup('file');break;
 case 'backup-later':session.set('ck-backup-later','1');render();break;
 case 'restore':$('#backup-input').click();break;
 case 'persist':{const granted=await navigator.storage?.persist?.();toast(granted?'Armazenamento persistente concedido. Continue fazendo backups.':'O navegador decide a proteção do armazenamento. Mantenha seu backup em dia.');break;}
 case 'install':await installApp();break;
 case 'update':await saveActivity();updatingWorker?.postMessage('SKIP_WAITING');break;
 case 'copy-code-link':{const url=new URL('./?codigo='+encodeURIComponent(profile.aiCode||''),location.href).href;try{await navigator.clipboard.writeText(url);toast('Link copiado. Abra no outro aparelho e a IA já fica liberada.');}catch{toast(url);}break;}
 case 'new-workspace':promptDialog('Novo perfil','Nome de quem vai usar',profile.name?'':'Perfil 2',async name=>{const id=uid().slice(0,8);workspaces.push({id,name});local.set('ck-workspaces',workspaces);await switchWorkspace(id);});break;
 case 'diagnose':{t.disabled=true;toast('Testando este aparelho por alguns segundos…');try{diagnostics=await diagnose();render();}finally{t.disabled=false;}break;}
 case 'copy-diagnostics':{const text='CK Promptmaker · diagnóstico\n'+diagnostics.checks.map(c=>(c.ok?'OK ':'!! ')+c.label+': '+c.detail).join('\n')+'\n'+diagnostics.screen+'\n'+diagnostics.agent;try{await navigator.clipboard.writeText(text);toast('Relatório copiado.');}catch{toast('Não foi possível copiar.');}break;}
 }
}
async function trashActivity(id){
 clearTimeout(saveTimer);await saving;await trash('activity',id);
 const wasOpen=activity.id===id;
 await refreshData();
 if(wasOpen){activity=newActivity();lastSaved='';await put('settings',{id:'active',activityId:activity.id});}
 render();announce({type:'data'});
 toast('Atividade movida para a lixeira.',{label:'Desfazer',run:()=>restoreItem('activity',id)});
}
async function trashFile(id){
 const f=files.find(f=>f.id===id);if(!f)return;
 invalidateMaterials();await trash('file',id);files=files.filter(x=>x.id!==id);trashed.files.push({...f,deletedAt:Date.now()});
 render();if(f.ownerType==='subject')subjectDialog(f.ownerId);await saveActivity();announce({type:'data'});
 toast('Arquivo removido.',{label:'Desfazer',run:()=>restoreItem('file',id)});
}
async function restoreItem(type,id){
 await untrash(type,id);await refreshData();
 render();if(type==='file'&&$('#dialog').open&&editingSubjectId)subjectDialog(editingSubjectId);
 announce({type:'data'});toast('Restaurado.');
}
async function makeBackup(mode){
 const blob=await exportBackup(),name='CK-backup-'+today()+'.json';
 if(mode==='file'){
  if(!('showSaveFilePicker' in window)){download(blob,name);}
  else{
   let handle=backupHandle;
   if(!handle){handle=await window.showSaveFilePicker({suggestedName:'CK-backup.json',types:[{description:'Backup do CK',accept:{'application/json':['.json']}}]}).catch(()=>null);if(!handle)return;backupHandle=handle;await put('device',{id:'backup-handle',handle});}
   if(await handle.queryPermission?.({mode:'readwrite'})!=='granted'&&await handle.requestPermission?.({mode:'readwrite'})!=='granted'){toast('Permita o acesso ao arquivo para salvar o backup.');return;}
   const writable=await handle.createWritable();await writable.write(blob);await writable.close();
  }
 }else if(mode==='share'){if(await shareOrDownload(blob,name,'Backup do CK')==='aborted')return;}
 else download(blob,name);
 profile.lastBackupAt=Date.now();await saveProfile();render();
 toast(mode==='file'?'Backup salvo em '+(backupHandle?.name||name)+'.':'Backup completo pronto. Guarde-o em um lugar seguro.');
}
async function switchWorkspace(id,silent=false){
 await saveActivity();
 workspace=id;local.set('ck-workspace',id);useWorkspace(id);
 diagnostics=null;showTrash=false;search='';filterStatus='all';filterSubject='';lastSaved='';
 await loadData();connect(id,onSync);applyEffects(profile.effects);view=silent?view:'activity';step=0;stageMessages=[];render();
 if(!silent){logoTransition();toast('Perfil '+workspaceName()+' em uso.');}
}
async function installApp(){
 if(matchMedia('(display-mode: standalone)').matches||navigator.standalone){toast('O CK já está aberto como aplicativo.');return;}
 if(installEvent){await installEvent.prompt();await installEvent.userChoice;installEvent=null;return;}
 const d=$('#dialog');d.innerHTML='<div class="dialog-head"><h2>Leve o CK com você.</h2><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body"><img class="install-logo" src="./assets/ck-logo.webp" alt="Conscious Knowledge"><h3>No Android</h3><p>Abra no Chrome. No menu ⋮, toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>. Depois disso o CK aparece no menu Compartilhar das fotos e dos PDFs.</p><h3>No iPhone / iPad</h3><p>Abra no Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p><p class="muted">A instalação precisa de HTTPS. Abra online uma vez para preparar o uso offline.</p></div><div class="dialog-footer">'+button('Entendi','close-dialog','check','primary')+'</div>';if(!d.open)d.showModal();
}
document.addEventListener('click',event=>handleClick(event).catch(fail));
document.addEventListener('input',event=>{if(event.target.matches('input:not([type=file]):not([type=checkbox]),textarea'))handleField(event.target).catch(fail);});
document.addEventListener('change',event=>{const t=event.target;if(t.dataset.upload)handleUpload(t).catch(fail);else if(t.matches('select,input[type=checkbox]'))handleField(t).catch(fail);});
document.addEventListener('dragover',event=>{const box=event.target.closest?.('.upload-box');for(const b of document.querySelectorAll('.upload-box.drag'))if(b!==box)b.classList.remove('drag');box?.classList.add('drag');});
for(const type of ['dragleave','drop'])document.addEventListener(type,event=>event.target.closest?.('.upload-box')?.classList.remove('drag'));
async function addCameraFiles(list){
 let photos=Array.from(list||[]);if(!photos.length)return;
 if(profile.compressPhotos){const {compressPhoto}=await import('./assist.js');photos=await Promise.all(photos.map(f=>compressPhoto(f)));}
 await saveActivity();const saved=await addFiles(photos,'activity',activity.id,{kind:'base'});files.push(...saved);invalidateMaterials();await saveActivity();announce({type:'data'});
 view='activity';if(!firstIncompleteStage(activity,profile,files,2))step=2;render();
}
$('#camera-input').addEventListener('change',async e=>{try{await addCameraFiles(e.target.files);e.target.value='';toast('Foto adicionada aos materiais.');}catch(error){fail(error);}});
$('#backup-input').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(!file)return;confirmDialog('Restaurar backup?','Isso substitui os dados atuais deste aparelho. Exporte um backup antes, se quiser mantê-los.',async()=>{await saveActivity();await restoreBackup(file);await loadData();render();toast('Backup restaurado com sucesso.');});});
for(const id of ['#ai-camera-input','#ai-file-input'])$(id).addEventListener('change',event=>{
 const list=Array.from(event.target.files||[]);event.target.value='';if(!list.length)return;
 aiDraft||=newAiDraft();aiDraft.files.push(...list.slice(0,Math.max(0,12-aiDraft.files.length)));
 if(list.length+aiDraft.files.length>12)toast('A IA analisa até 12 materiais por vez.');
 aiRenderPick();
});
$('#voice-input').addEventListener('change',event=>{const list=Array.from(event.target.files||[]);event.target.value='';if(list.length)voiceAi(list).catch(fail);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveActivity().catch(()=>{});});
window.addEventListener('beforeunload',()=>{if(saveTimer)saveActivity().catch(()=>{});});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;});
window.addEventListener('online',()=>{render();toast('Conexão restabelecida.');});
window.addEventListener('offline',()=>{render();toast('Você pode continuar trabalhando offline.');});
function split(all){return {live:all.filter(x=>!x.deletedAt),gone:all.filter(x=>x.deletedAt)};}
async function refreshData(){
 const [a,s,f,settings]=await Promise.all(['activities','subjects','files','settings'].map(getAll));
 const A=split(a),S=split(s),F=split(f);
 activities=A.live;subjects=S.live;files=F.live;trashed={activities:A.gone,subjects:S.gone,files:F.gone.filter(x=>!x.trashedWith)};
 profile={...DEFAULT_PROFILE,...settings.find(x=>x.id==='profile')};
 return settings;
}
async function loadData(){
 await purgeTrash().catch(()=>{});
 const settings=await refreshData();
 const active=settings.find(s=>s.id==='active');
 activity=structuredClone(activities.find(a=>a.id===active?.activityId)||[...activities].sort((a,b)=>b.updatedAt-a.updatedAt)[0]||newActivity());
 if(params.has('new'))activity=newActivity();
 lastSaved=activities.some(a=>a.id===activity.id)?JSON.stringify({...activity,updatedAt:0}):'';
 await put('settings',{id:'active',activityId:activity.id});await saveActivity();
 backupHandle=(await get('device','backup-handle').catch(()=>null))?.handle||null;
}
async function onSync(message){
 if(message.type==='hello'){announce({type:'here'});return;}
 if(message.type==='here'){if(!onSync.warned){onSync.warned=true;toast('O CK também está aberto em outra aba. As mudanças aparecem nas duas.');}return;}
 if(message.type==='profile'){const stored=await get('settings','profile');profile={...DEFAULT_PROFILE,...stored};applyEffects(profile.effects);if(!document.activeElement?.dataset?.profile)render();return;}
 if(message.type==='activity'){
  const fresh=await get('activities',message.id);if(!fresh)return;
  replaceIn(activities,fresh);
  if(fresh.id===activity.id&&fresh.updatedAt>activity.updatedAt&&!saveTimer){activity=structuredClone(fresh);lastSaved=JSON.stringify({...activity,updatedAt:0});render();toast('Atualizado com as mudanças da outra aba.');}
  else if(view!=='activity'||fresh.id!==activity.id)render();
  return;
 }
 if(message.type==='data'){await refreshData();const fresh=activities.find(a=>a.id===activity.id);if(!fresh&&!saveTimer){activity=newActivity();lastSaved='';}render();}
}
initMotion(()=>profile.motion);
async function readShared(){
 const out={files:[],note:''};
 try{
  const cache=await caches.open('ck-share');
  for(const request of await cache.keys()){
   const response=await cache.match(request);
   if(request.url.endsWith('/meta'))out.note=(await response.json()).text||'';
   else out.files.push(new File([await response.blob()],decodeURIComponent(response.headers.get('x-name')||'compartilhado'),{type:response.headers.get('content-type')||'application/octet-stream'}));
   await cache.delete(request);
  }
 }catch{}
 return out;
}
async function init(){
 workspaces=local.get('ck-workspaces',[]).filter(w=>w&&/^[a-z0-9-]{1,40}$/.test(w.id)&&typeof w.name==='string');
 workspace=local.get('ck-workspace','default');if(workspace!=='default'&&!workspaces.some(w=>w.id===workspace))workspace='default';
 useWorkspace(workspace);
 try{await loadData();applyEffects(profile.effects);render();}catch(error){$('#app').innerHTML='<div class="empty-state"><h1>Não foi possível abrir o armazenamento.</h1><p>Verifique se o navegador permite armazenamento local e tente recarregar. Seus dados existentes não foram apagados.</p></div>';fail(error);}
 connect(workspace,onSync);watchKeyboard();
 const intro=$('#intro');
 if(session.get('ck-intro')||!profile.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)intro.remove();
 else{
  session.set('ck-intro','1');document.body.classList.add('intro-live');
  const finish=skip=>{clearTimeout(timer);intro.remove();if(skip)document.body.classList.remove('intro-live');else setTimeout(()=>document.body.classList.remove('intro-live'),1400);};
  const timer=setTimeout(()=>finish(false),3300);intro.addEventListener('click',()=>finish(true),{once:true});
 }
 if(profile.effects==='auto'&&!document.body.classList.contains('lite'))setTimeout(()=>measureFps(1200).then(()=>{if(applyEffects(profile.effects))render();}),4200);
 if(params.has('camera')){if(!firstIncompleteStage(activity,profile,files,2))step=2;render();toast('Toque no botão de câmera para fotografar a atividade.');}
 if(params.has('share')){const shared=await readShared();if(shared.files.length||shared.note){aiDraft=newAiDraft();aiDraft.files=shared.files.slice(0,12);aiDraft.note=shared.note;aiRenderPick('Recebido pelo menu Compartilhar. Toque em Analisar com IA ou feche para só guardar depois.');}}
 if(params.has('ai'))setTimeout(()=>scan('ai').catch(fail),params.has('share')?0:600);
 const linkCode=(params.get('codigo')||params.get('code')||'').trim();
 if(linkCode){profile.aiCode=linkCode;await saveProfile();if(view==='profile')render();toast('Código da IA salvo neste aparelho. Já pode usar Preencher com IA.');}
 history.replaceState(null,'',location.pathname);
 if('serviceWorker' in navigator){
 try{const reg=await navigator.serviceWorker.register('./sw.js');const apply=async()=>{if(!updatingWorker||document.querySelector('dialog[open]')||busy)return false;await saveActivity();updatingWorker.postMessage('SKIP_WAITING');return true;};
 const showUpdate=async()=>{if(reg.waiting&&navigator.serviceWorker.controller){updatingWorker=reg.waiting;if(await apply())return;if(view==='profile')render();if(!showUpdate.waiting){showUpdate.waiting=true;document.addEventListener('visibilitychange',()=>{if(document.hidden)apply();});}}};
 setInterval(()=>reg.update().catch(()=>{}),30*60*1000);
 showUpdate();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',showUpdate);});
 let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updatingWorker&&!refreshing){refreshing=true;location.reload();}});
 }catch(e){console.info('Offline disponível no build de produção.',e.message);}
 }
}
init();

function invalidateMaterials(){
 activity.materialsReviewed=false;
 const checkbox=$('[data-field="materialsReviewed"]');if(checkbox)checkbox.checked=false;
}
function stageFeedback(){
 return stageMessages.length?'<div id="stage-errors" class="stage-errors" role="alert" tabindex="-1"><strong>Antes de continuar</strong><ul>'+stageMessages.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></div>':'';
}
function showStageErrors(){const el=$('#stage-errors');if(el){flash(el,'fx-shake');haptic(30);el.focus({preventScroll:true});el.scrollIntoView({behavior:profile.motion?'smooth':'instant',block:'center'});}toast(stageMessages[0]);}
function refreshStageLocks(){
 for(const el of document.querySelectorAll('[data-step]')){const n=Number(el.dataset.step);el.setAttribute('aria-disabled',String(n>step&&!!firstIncompleteStage(activity,profile,files,n)));}
}
async function goStep(target){
 if(target<0||target>3)return;
 if(target>step){const missing=firstIncompleteStage(activity,profile,files,target);if(missing){step=missing.stage;stageMessages=missing.errors;render();showStageErrors();return;}}
 await saveActivity();stageMessages=[];step=target;render();logoTransition();$('.editor').scrollIntoView({behavior:profile.motion?'smooth':'instant',block:'start'});
}
function transferSection(){
 return '<section class="settings-card transfer-card spot"><div class="section-heading"><div><span class="overline">COMPUTADOR ↔ CELULAR</span><h2>Levar meus dados</h2><p>Atividades, '+lower(tpl().subjects)+', '+tpl().plans+', perfil e anexos em um arquivo.</p></div>'+icon('copy','heading-icon')+'</div><ol class="transfer-steps"><li>Neste aparelho, toque em <strong>Exportar transferência</strong>.</li><li>Envie o arquivo por cabo, AirDrop, Quick Share, Drive ou outro meio de sua preferência.</li><li>Abra o CK no outro aparelho e use <strong>Receber dados</strong>.</li></ol><p class="muted">Sem banco de dados na nuvem e sem conta. Em cada item, fica a versão editada por último, venha de onde vier. Exclusões também são levadas. O arquivo contém seus dados pessoais e documentos.</p><div class="button-wrap">'+button('Exportar transferência','transfer-out','download','primary')+button('Receber dados','transfer-in','upload','secondary')+'</div></section>';
}
$('#transfer-input').addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;
 try{
  transferData=await readBackup(file);
  const live=list=>list.filter(x=>!x.deletedAt).length;
  const d=$('#dialog');d.innerHTML='<div class="dialog-head"><h2>Receber dados deste arquivo</h2></div><div class="dialog-body"><p>'+plural(live(transferData.activities),'atividade','atividades')+' · '+plural(live(transferData.subjects),'item da biblioteca','itens da biblioteca')+' · '+plural(live(transferData.files),'anexo','anexos')+'</p><p>Em cada item, fica a versão alterada por último: o que é mais novo neste aparelho é mantido, o que é mais novo no arquivo é atualizado. Itens que só existem aqui continuam aqui.</p><label class="toggle"><input id="transfer-profile" type="checkbox" checked><span>Trazer também o perfil do outro aparelho<small>Substitui meu nome e minhas preferências atuais.</small></span></label></div><div class="dialog-footer">'+button('Cancelar','close-dialog',null,'secondary')+'<button class="btn primary" id="transfer-confirm">Importar dados</button></div>';d.showModal();
  $('#transfer-confirm').onclick=async()=>{
   const control=$('#transfer-confirm');control.disabled=true;
   try{await saveActivity();const summary=await restoreBackup(transferData,{mode:'merge',includeProfile:$('#transfer-profile').checked});await loadData();stageMessages=[];view='profile';render();d.close();transferData=null;logoTransition();announce({type:'data'});
    toast('Dados recebidos: '+summary.added+' novos, '+summary.updated+' atualizados'+(summary.kept?', '+summary.kept+' mantidos por serem mais novos aqui':'')+'.');}
   catch(error){control.disabled=false;fail(error);}
  };
 }catch(error){fail(error);}
});
async function resolveActivityFiles(){
 const selected=relevantFiles(activity,effectiveFiles()),resolved=[];
 for(const f of selected){let blob=f.blob;if(!blob){const r=await fetch(f.url);if(!r.ok)throw new Error('Não foi possível ler '+f.name+'. Abra o app online e tente novamente.');blob=await r.blob();}resolved.push({...f,blob});}
 return resolved;
}
function pageProgress(message,selector='#page-progress'){const el=$(selector);if(el)el.textContent=message;}
async function openWebPage(){
 if(!requireValid()||busy)return;await saveActivity();
 const d=$('#dialog');d.dataset.publishing='true';
 d.innerHTML='<div class="dialog-head"><h2>Preparando sua página</h2></div><div class="dialog-body"><div class="page-loading"><img src="./assets/ck-logo.webp" alt=""><div class="orbit"></div></div><p id="page-progress" role="status">Preparando prompt e arquivos…</p></div>';
 d.showModal();busy=true;
 try{
  const {preparePage}=await import('./page-export.js');
  preparedPage=await preparePage({title:activity.title,prompt:promptText(),files:await resolveActivityFiles()},pageProgress);
  const total=preparedPage.documents.reduce((n,f)=>n+f.blob.size,0);
  d.innerHTML='<div class="dialog-head"><div><span class="overline">UM LINK COM TODO O CONTEXTO</span><h2>Página para IA</h2></div>'+button('Fechar','close-dialog','close','ghost')+'</div><div class="dialog-body"><p>O prompt e os textos dos documentos ficam visíveis no HTML da página, sem login ou JavaScript. Os arquivos originais acompanham a publicação.</p><div class="publication-files">'+preparedPage.documents.map(doc=>'<div><strong>'+esc(doc.name)+'</strong><small>'+esc(doc.status)+'</small>'+(doc.warning?'<p>'+esc(doc.warning)+'</p>':'')+'</div>').join('')+'</div><p class="muted">'+preparedPage.documents.length+' anexos · '+bytes(total)+'. Imagens não têm OCR automático. Nenhuma opção garante leitura por todas as IAs.</p>'+
  '<section class="publish-box primary-box"><h3>'+icon('link')+' Link privado em um toque</h3><p class="muted">O link fica no servidor do CK, difícil de adivinhar, e some sozinho no prazo escolhido. Arquivos acima de 4 MB seguem só no ZIP; o texto deles entra na página.</p><div class="form-grid"><div class="field"><label for="link-days">Validade do link</label><select id="link-days"><option value="1">1 dia</option><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option><option value="0">Sem prazo</option></select></div></div><label class="toggle"><input id="vercel-consent" type="checkbox"><span>Entendo que quem tiver o link verá o prompt e os anexos<small>Inclui nome, integrantes e materiais. Você pode apagar o link depois no histórico da atividade.</small></span></label><p id="link-progress" role="status"></p><div class="button-wrap">'+button('Criar link privado','page-vercel','link','primary')+button('Baixar página HTML','page-download','download','secondary')+'</div></section>'+
  '<section class="publish-box"><h3>Outra opção: GitHub Pages</h3><p class="muted">Use um repositório público com Pages já ativo: o repositório deste CK (Actions), ou outro repositório com Pages a partir da raiz/"docs" de uma branch. Cada publicação cria uma cópia em um endereço novo.</p><label for="publish-repo">Repositório</label><input id="publish-repo" placeholder="usuario/repositorio" value="'+esc(profile.publishRepo||'')+'" autocomplete="off"><label for="publish-token">Token GitHub (somente nesta publicação)</label><input id="publish-token" type="password" autocomplete="off" spellcheck="false" placeholder="Token com Contents: Read and write e Pages: Read"><p class="muted"><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Criar token de acesso limitado</a>: selecione apenas o repositório de destino. O token vai diretamente ao GitHub, não é salvo no app, no backup ou na página.</p><label class="toggle"><input id="publish-consent" type="checkbox"><span>Quero tornar públicos este prompt e todos os anexos listados<small>Inclui nome, integrantes, documentos e materiais. Remover depois do site não apaga automaticamente o histórico do Git.</small></span></label><p id="page-progress" role="status"></p><div class="button-wrap">'+button('Publicar e obter link','page-publish','globe','secondary')+'</div></section></div>';
 }catch(error){d.close();throw error;}finally{busy=false;d.dataset.publishing='false';}
}
async function downloadWebPage(){
 if(!preparedPage||busy)return;busy=true;pageProgress('Montando HTML com os anexos completos…','#link-progress');
 try{const {standalonePage}=await import('./page-export.js');download(await standalonePage(preparedPage),safeName(preparedPage.title)+'-briefing.html');pageProgress('HTML salvo. Esse arquivo ainda não é um link.','#link-progress');await recordExport('html');}
 finally{busy=false;}
}
function linkResult(result,kind){
 const d=$('#dialog');
 d.innerHTML='<div class="dialog-head"><div><span class="overline">'+(kind==='link'?'LINK PRIVADO':'GITHUB PAGES')+'</span><h2>'+(kind==='link'?'Seu link está pronto':'Arquivos enviados ao GitHub')+'</h2></div></div><div class="dialog-body">'+(kind==='link'?'<p>'+(result.expiresAt?'O link funciona até '+new Date(result.expiresAt).toLocaleDateString('pt-BR')+'.':'O link não tem prazo para expirar.')+' Você pode apagá-lo a qualquer momento no histórico da atividade.</p>'+(result.skipped?.length?'<p class="muted">Ficaram só no ZIP por serem grandes: '+esc(result.skipped.join(', '))+'.</p>':''):'<p>Aguarde o deploy do GitHub Pages antes de compartilhar. O endereço abaixo é o destino da publicação; o app não consegue confirmar se o deploy terminou.</p>')+'<label for="published-url">Link da página</label><input id="published-url" readonly value="'+esc(result.url)+'"><div class="button-wrap">'+button('Copiar link','copy-page-link','copy','primary')+'<a class="btn secondary" href="'+esc(result.url)+'" target="_blank" rel="noopener">Abrir página</a></div>'+(kind==='github'?'<p><a href="https://github.com/'+esc(result.repo)+'/actions" target="_blank" rel="noopener">Acompanhar publicação no GitHub</a></p>':'')+'<p class="muted">A página é uma cópia do briefing neste momento. Mudanças depois não alteram o link.</p></div><div class="dialog-footer">'+button('Concluir','close-dialog','check','primary')+'</div>';logoTransition();
}
async function publishVercelPage(){
 if(!preparedPage||busy)return;
 if(!$('#vercel-consent').checked){pageProgress('Confirme que entende quem poderá ver o link.','#link-progress');return;}
 const d=$('#dialog'),days=Number($('#link-days').value);busy=true;d.dataset.publishing='true';for(const el of d.querySelectorAll('button,input,select'))el.disabled=true;
 try{
  const {publishToVercel}=await import('./vercel-publish.js');
  const result=await publishToVercel({bundle:preparedPage,days,code:profile.aiCode},m=>pageProgress(m,'#link-progress'));
  activity.history=[{at:Date.now(),kind:'link',url:result.url,id:result.id,deleteToken:result.deleteToken,expiresAt:result.expiresAt},...(activity.history||[])].slice(0,60);
  if(!activity.snapshot)activity.snapshot=snapshotOf(currentSubject(),profile);
  if(statusOf(activity)==='draft')activity.status='sent';
  await saveActivity();linkResult(result,'link');render();
 }catch(error){pageProgress(error.code==='ACCESS_CODE'?'Este servidor pede o código de acesso. Digite-o em Meu perfil, no campo Código de acesso da IA.':error.message,'#link-progress');}
 finally{busy=false;d.dataset.publishing='false';for(const el of d.querySelectorAll('button,input,select'))el.disabled=false;}
}
async function removePublishedLink(index){
 const h=activity.history[index];if(!h?.deleteToken)return;
 confirmDialog('Apagar este link?','A página e os arquivos enviados deixam de existir. Quem tiver o link verá uma mensagem de página não encontrada.',async()=>{
  const {deleteVercelPage}=await import('./vercel-publish.js');
  await deleteVercelPage({id:h.id,deleteToken:h.deleteToken,code:profile.aiCode});
  activity.history[index]={...h,removed:true,deleteToken:undefined};await saveActivity();render();toast('Link apagado.');
 });
}
async function publishWebPage(){
 if(!preparedPage||busy)return;
 if(!$('#publish-consent').checked){pageProgress('Confirme a publicação pública dos materiais antes de continuar.');return;}
 const repo=$('#publish-repo').value.trim();let token=$('#publish-token').value;$('#publish-token').value='';
 if(!token.trim()){pageProgress('Informe seu token GitHub. Ele não será salvo.');return;}
 const d=$('#dialog');busy=true;d.dataset.publishing='true';for(const el of d.querySelectorAll('button,input,select'))el.disabled=true;
 try{
  const {publishPage}=await import('./github-publish.js');const result=await publishPage({repo,token,bundle:preparedPage},pageProgress);token='';
  profile.publishRepo=result.repo;await saveProfile();
  activity.history=[{at:Date.now(),kind:'github',url:result.url},...(activity.history||[])].slice(0,60);await saveActivity();
  linkResult(result,'github');render();
 }catch(error){pageProgress(error.message);}
 finally{token='';busy=false;d.dataset.publishing='false';for(const el of d.querySelectorAll('button,input,select'))el.disabled=false;}
}
$('#dialog').addEventListener('cancel',event=>{if($('#dialog').dataset.publishing==='true')event.preventDefault();});
$('#dialog').addEventListener('close',()=>{preparedPage=null;transferData=null;if(aiDraft){for(const url of aiDraft.urls.values())URL.revokeObjectURL(url);aiDraft=null;}const d=$('#dialog');d.classList.remove('ai-dialog');d.replaceChildren();});

async function scan(target){
 const {openScanner}=await import('./scanner.js');
 const actions=target==='ai'?[{id:'ai',label:'Preencher com IA',icon:'wand',primary:true},{id:'materials',label:'Só guardar nos materiais',icon:'folder'}]:[{id:'materials',label:'Guardar nos materiais',icon:'folder',primary:true},{id:'ai',label:'Preencher com IA',icon:'wand'}];
 const result=await openScanner({title:'Escanear páginas',actions,icon});
 if(!result)return;
 if(result.action==='native'){$(target==='ai'?'#ai-camera-input':'#camera-input').click();return;}
 const stamp=new Date().toISOString().slice(0,16).replace(/[-:T]/g,'');
 if(result.action==='ai'){
  aiDraft||=newAiDraft();
  aiDraft.files.push(...result.pages.slice(0,12-aiDraft.files.length).map((p,i)=>new File([p.blob],'pagina-'+stamp+'-'+(i+1)+'.jpg',{type:'image/jpeg'})));
  aiRenderPick();return;
 }
 let file;
 if(result.pages.length>1){const {jpegsToPdf}=await import('./pdf.js');const pages=await Promise.all(result.pages.map(async p=>({bytes:new Uint8Array(await p.blob.arrayBuffer()),width:p.width,height:p.height})));file=new File([jpegsToPdf(pages)],'escaneado-'+stamp+'.pdf',{type:'application/pdf'});}
 else file=new File([result.pages[0].blob],'escaneado-'+stamp+'.jpg',{type:'image/jpeg'});
 for(const p of result.pages)URL.revokeObjectURL(p.url);
 await addCameraFiles([file]);
 toast(result.pages.length>1?plural(result.pages.length,'página','páginas')+' salvas em um PDF nos materiais.':'Página salva nos materiais.');
}
function newAiDraft(){return {files:[],urls:new Map(),existing:new Set(),existingReady:false,note:'',attach:true,code:profile.aiCode||'',needCode:false,result:null,items:[],skipped:[]};}
function aiOpen(){aiDraft||=newAiDraft();aiRenderPick();}
function aiSourceRow(name,detail,thumb,control){return '<div class="ai-source">'+thumb+'<div><strong>'+esc(name)+'</strong><small>'+esc(detail)+'</small></div>'+control+'</div>';}
function codeField(){return aiDraft.needCode?'<label for="ai-code">Código de acesso da IA</label><input id="ai-code" type="password" autocomplete="off" value="'+esc(aiDraft.code)+'">':'';}
function aiRenderPick(message=''){
 const d=$('#dialog'),base=files.filter(f=>f.ownerType==='activity'&&f.ownerId===activity.id&&f.kind==='base');
 if(!aiDraft.existingReady){aiDraft.existing=new Set(base.map(f=>f.id));aiDraft.existingReady=true;}
 const thumb=file=>{if(!/^image\//.test(file.type))return icon('file','thumb');if(!aiDraft.urls.has(file))aiDraft.urls.set(file,URL.createObjectURL(file));return '<img class="thumb" src="'+aiDraft.urls.get(file)+'" alt="">';};
 const rows=aiDraft.files.map((f,i)=>aiSourceRow(f.name||'foto.jpg',bytes(f.size)+' · novo',thumb(f),'<button class="icon-btn danger" data-ai-remove="'+i+'" aria-label="Remover '+esc(f.name||'foto')+'">'+icon('close')+'</button>'))
  .concat(base.map(f=>aiSourceRow(f.name,bytes(f.size)+' · já nos materiais',icon(f.mime?.startsWith('image/')?'image':'file','thumb'),'<input type="checkbox" data-ai-existing="'+f.id+'" aria-label="Usar '+esc(f.name)+'" '+(aiDraft.existing.has(f.id)?'checked':'')+'>')));
 d.classList.add('ai-dialog');
 d.innerHTML='<div class="dialog-head"><div><span class="overline">ASSISTENTE CK</span><h2>Preencher com IA</h2></div><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body"><p>Fotos do quadro ou do caderno, prints, PDFs, DOCX ou textos. A IA lê tudo, preenche o formulário e você confere cada campo antes de aplicar.</p><div class="ai-pick">'+button('Tirar foto','ai-scan','camera','gold')+button('Escolher arquivos','ai-files','upload','secondary')+'</div><div class="ai-sources">'+rows.join('')+'</div><label for="ai-note">Quer acrescentar algo? (opcional)</label><textarea id="ai-note" rows="3" placeholder="Ex.: é para a próxima sexta, em grupo com Ana e Leo, vale 2 pontos.">'+esc(aiDraft.note)+'</textarea>'+
  (aiDraft.files.length?'<label class="toggle"><input type="checkbox" id="ai-attach" '+(aiDraft.attach?'checked':'')+'><span>Guardar os arquivos novos nos materiais<small>Assim eles também vão no pacote final da atividade.</small></span></label>':'')+codeField()+
  (message?'<p class="ai-notes" role="alert">'+esc(message)+'</p>':'')+
  (navigator.onLine?'':'<div class="notice">'+icon('wifi')+'<p>Você está offline. A IA precisa de internet; o resto do app continua funcionando.</p></div>')+
  '</div><div class="dialog-footer">'+button('Cancelar','close-dialog',null,'ghost')+button('Analisar com IA','ai-analyze','wand','primary')+'</div>';
 if(!d.open)d.showModal();
}
function aiLoading(title,status){
 const d=$('#dialog');d.dataset.publishing='true';
 d.innerHTML='<div class="dialog-head"><div><span class="overline">ASSISTENTE CK</span><h2>'+title+'</h2></div></div><div class="dialog-body"><div class="ai-scan" aria-hidden="true"><span class="ring"></span><span class="ring"></span><img src="./assets/ck-logo.webp" alt=""></div><p id="ai-status" class="ai-status" role="status">'+status+'</p></div>';
 if(!d.open)d.showModal();
 return text=>{const el=$('#ai-status');if(el)el.textContent=text;};
}
async function aiCall(body,code){const {requestAssist}=await import('./assist.js');return requestAssist({today:today(),student:profile.name,level:profile.level,institution:tpl().name,...body},{code});}
async function rememberCode(code){if(code&&code!==(profile.aiCode||'')){profile.aiCode=code;await saveProfile();}}
async function aiAnalyze(){
 if(busy)return;
 const existing=files.filter(f=>aiDraft.existing.has(f.id)).map(f=>new File([f.blob],f.name,{type:f.mime}));
 const picked=[...aiDraft.files,...existing];
 if(!picked.length&&!aiDraft.note.trim()){aiRenderPick('Adicione uma foto, um arquivo ou escreva algo sobre a atividade.');return;}
 if(!navigator.onLine){aiRenderPick('Sem internet agora. Tente de novo quando estiver online.');return;}
 const d=$('#dialog');busy=true;const status=aiLoading('Lendo seus materiais','Preparando materiais…');
 let timer;
 try{
  const {prepareSources}=await import('./assist.js');
  const {sources,skipped}=await prepareSources(picked,status);
  status(sources.length?'A IA está lendo '+(sources.length>1?sources.length+' materiais…':'1 material…'):'A IA está lendo sua descrição…');
  timer=setTimeout(()=>status('Organizando os campos do formulário…'),3500);
  const result=await aiCall({note:aiDraft.note,subjects:subjects.map(s=>({name:s.name,professor:s.professor})),sources},aiDraft.code);
  aiDraft.result=result;aiDraft.skipped=skipped;await rememberCode(aiDraft.code);
  d.dataset.publishing='false';await aiRenderReview();haptic(14);
 }catch(error){
  if(error.code==='ACCESS_CODE')aiDraft.needCode=true;
  d.dataset.publishing='false';aiRenderPick(error.message||'A IA não conseguiu analisar agora.');
 }finally{clearTimeout(timer);busy=false;d.dataset.publishing='false';}
}
async function aiRenderReview(){
 const {buildSuggestions}=await import('./assist.js');
 const r=aiDraft.result,items=aiDraft.items=buildSuggestions(r,activity,subjects),notes=[...(r.notes||[]),...aiDraft.skipped];
 $('#dialog').innerHTML='<div class="dialog-head"><div><span class="overline">REVISE ANTES DE APLICAR</span><h2>'+(items.length?'A IA encontrou '+items.length+(items.length>1?' informações':' informação'):'Nada novo por aqui')+'</h2></div><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body">'+
  (items.length?'<div class="ai-summary">'+icon('check')+'<div><strong>Desmarque o que não quiser usar</strong><small>Campos que você já preencheu só mudam se estiverem marcados.</small></div></div><div class="ai-review">'+items.map((it,i)=>'<label class="toggle ai-item"><input type="checkbox" data-ai-item="'+i+'" '+(it.checked?'checked':'')+'><span><b>'+esc(it.label)+(it.uncertain?' '+tag('confira','gold'):'')+'</b><span class="val">'+esc(it.display)+'</span>'+(it.append?'<small>Será somado ao que você já escreveu.</small>':it.current?'<small>Atual: '+esc(it.current.slice(0,160))+'</small>':'')+'</span></label>').join('')+'</div>':'<p>Não encontrei informações novas nesses materiais. Tente uma foto mais nítida ou escreva uma descrição curta.</p>')+
  (notes.length?'<ul class="ai-notes">'+notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'')+
  (r.model?'<p class="muted">Lido por '+esc(r.model)+'. Confira datas e nomes: a IA pode errar.</p>':'')+
  '</div><div class="dialog-footer">'+button('Voltar','ai-back','back','ghost')+(items.length?button('Aplicar selecionados','ai-apply','check','primary'):button('Fechar','close-dialog','check','primary'))+'</div>';
}
async function aiApply(){
 if(busy||!aiDraft)return;busy=true;
 try{
  const {applySuggestions}=await import('./assist.js');
  const chosen=aiDraft.items.filter(i=>i.checked),newFiles=aiDraft.attach?aiDraft.files:[];
  await saveActivity();
  const created=applySuggestions(activity,chosen,subjects,name=>({id:uid(),name,professor:'',notes:{},createdAt:Date.now(),updatedAt:Date.now()}));
  if(created){await put('subjects',created);subjects.push(created);}
  if(newFiles.length){const saved=await addFiles(newFiles,'activity',activity.id,{kind:'base'});files.push(...saved);}
  invalidateMaterials();await saveActivity();announce({type:'data'});
  $('#dialog').close();view='activity';step=0;stageMessages=[];render();
  flash(document.querySelector('.editor-body'),'fx-reveal');window.scrollTo(0,0);logoTransition();
  toast(chosen.length?chosen.length+(chosen.length>1?' campos preenchidos':' campo preenchido')+' pela IA. Confira e continue.':'Nada foi alterado.');
 }finally{busy=false;}
}
async function aiReview(){
 if(!requireValid()||busy)return;await saveActivity();
 if(!navigator.onLine){toast('A revisão precisa de internet.');return;}
 busy=true;const d=$('#dialog');const status=aiLoading('Revisando o briefing','A IA está conferindo o que pode faltar…');
 try{
  const r=await aiCall({task:'review',note:promptText()},profile.aiCode);
  d.dataset.publishing='false';
  d.innerHTML='<div class="dialog-head"><div><span class="overline">REVISÃO DA IA</span><h2>'+(r.ready&&!r.issues.length?'Briefing pronto para enviar':'Vale ajustar antes de enviar')+'</h2></div><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body">'+
   (r.issues.length?'<ul class="review-issues">'+r.issues.map(i=>'<li class="'+i.level+'"><b>'+({alta:'Importante',media:'Recomendado',baixa:'Detalhe'}[i.level])+'</b><span>'+esc(i.text)+'</span></li>').join('')+'</ul>':'<p>Nenhum problema relevante encontrado.</p>')+
   (r.questions.length?'<h3>Responda para completar</h3><p class="muted">As respostas vão para as observações da entrega.</p>'+r.questions.map((q,i)=>'<div class="field"><label for="review-answer-'+i+'">'+esc(q)+'</label><textarea id="review-answer-'+i+'" data-review-question="'+esc(q)+'" rows="2"></textarea></div>').join(''):'')+
   '</div><div class="dialog-footer">'+button('Fechar','close-dialog',null,'ghost')+(r.questions.length?button('Adicionar respostas','review-apply','check','primary'):'')+'</div>';
 }catch(error){d.dataset.publishing='false';d.close();if(error.code==='ACCESS_CODE')toast('Digite o código de acesso da IA em Meu perfil.');else fail(error);}
 finally{busy=false;d.dataset.publishing='false';}
}
async function applyReviewAnswers(){
 const answers=[...document.querySelectorAll('[data-review-question]')].filter(el=>el.value.trim()).map(el=>'P: '+el.dataset.reviewQuestion+'\nR: '+el.value.trim());
 if(!answers.length){toast('Responda pelo menos uma pergunta.');return;}
 activity.observations=(activity.observations.trim()?activity.observations.trim()+'\n\n':'')+'Esclarecimentos do estudante:\n'+answers.join('\n');
 invalidateMaterials();await saveActivity();$('#dialog').close();render();toast('Respostas adicionadas às observações. Confira os materiais e siga para o prompt.');
}
let voiceResult=null,ptdResult=null;
async function voiceAi(list){
 if(busy)return;if(!navigator.onLine){toast('A análise da sua voz precisa de internet.');return;}
 busy=true;const d=$('#dialog');const status=aiLoading('Estudando sua escrita','Preparando seus trabalhos…');
 try{
  const {prepareSources}=await import('./assist.js');
  const {sources,skipped}=await prepareSources(list.slice(0,6),status);
  if(!sources.length)throw new Error(skipped[0]||'Não consegui ler esses arquivos.');
  status('A IA está descrevendo seu jeito de escrever…');
  voiceResult=await aiCall({task:'voice',sources},profile.aiCode);
  d.dataset.publishing='false';
  d.innerHTML='<div class="dialog-head"><div><span class="overline">SUA VOZ</span><h2>Assim você escreve</h2></div><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body"><div class="voice-traits">'+voiceResult.traits.map(t=>tag(esc(t),'gold')).join('')+'</div><div class="voice-preview">'+esc(voiceResult.guide)+'</div>'+([...voiceResult.notes,...skipped].length?'<ul class="ai-notes">'+[...voiceResult.notes,...skipped].map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'')+'<p class="muted">Você pode editar o guia depois no perfil.</p></div><div class="dialog-footer">'+button('Descartar','close-dialog',null,'ghost')+button('Usar este guia','voice-apply','check','primary')+'</div>';
 }catch(error){d.dataset.publishing='false';d.close();if(error.code==='ACCESS_CODE')toast('Digite o código de acesso da IA em Meu perfil.');else fail(error);}
 finally{busy=false;d.dataset.publishing='false';}
}
async function applyVoice(){if(!voiceResult)return;profile.voiceGuide=voiceResult.guide;voiceResult=null;await saveProfile();$('#dialog').close();render();toast('Guia da sua voz salvo. Ele entra em todos os prompts.');}
async function ptdAi(){
 const id=editingSubjectId,s=subjects.find(x=>x.id===id),t=tpl();if(!s||busy)return;
 const list=files.filter(f=>f.ownerType==='subject'&&f.ownerId===id);
 if(!list.length){toast('Adicione os arquivos dos '+t.plans+' primeiro.');return;}
 if(!navigator.onLine){toast('A leitura com IA precisa de internet.');return;}
 busy=true;const d=$('#dialog');const status=aiLoading('Lendo os '+t.plans,'Preparando arquivos…');
 try{
  const {prepareSources}=await import('./assist.js');
  const {sources,skipped}=await prepareSources(list.slice(0,12).map(f=>new File([f.blob],(f.period?(f.period==='anual'?'anual':t.periodName(f.period))+' - ':'')+f.name,{type:f.mime})),status);
  if(!sources.length)throw new Error(skipped[0]||'Não consegui ler esses arquivos.');
  status('A IA está organizando por período…');
  ptdResult={id,...await aiCall({task:'ptd',sources,periods:t.periods.map(t.periodName)},profile.aiCode)};
  d.dataset.publishing='false';
  d.innerHTML='<div class="dialog-head"><div><span class="overline">'+esc(s.name)+'</span><h2>Conteúdo organizado</h2></div></div><div class="dialog-body">'+(ptdResult.periods.length?'<div class="ai-review">'+ptdResult.periods.map((p,i)=>'<label class="toggle ai-item"><input type="checkbox" data-ptd-item="'+i+'" checked><span><b>'+(p.period==='anual'?'Anual':t.periodName(p.period))+(s.notes?.[p.period]?' '+tag('substitui o texto atual','gold'):'')+'</b><span class="val">'+esc(p.content)+'</span></span></label>').join('')+'</div>':'<p>Não encontrei conteúdo por período nesses arquivos.</p>')+([...ptdResult.notes,...skipped].length?'<ul class="ai-notes">'+[...ptdResult.notes,...skipped].map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'')+'</div><div class="dialog-footer">'+button('Voltar','ptd-back-dummy',null,'ghost','data-edit-subject="'+id+'"')+(ptdResult.periods.length?button('Salvar nas notas','ptd-apply','check','primary'):'')+'</div>';
 }catch(error){d.dataset.publishing='false';subjectDialog(id);if(error.code==='ACCESS_CODE')toast('Digite o código de acesso da IA em Meu perfil.');else fail(error);}
 finally{busy=false;d.dataset.publishing='false';}
}
async function applyPtd(){
 if(!ptdResult)return;const s=subjects.find(x=>x.id===ptdResult.id);if(!s)return;
 const chosen=[...document.querySelectorAll('[data-ptd-item]')].filter(el=>el.checked).map(el=>ptdResult.periods[Number(el.dataset.ptdItem)]);
 s.notes={...s.notes};for(const p of chosen)s.notes[p.period]=p.content;s.updatedAt=Date.now();
 await put('subjects',structuredClone(s));announce({type:'data'});invalidateMaterials();await saveActivity();
 const id=ptdResult.id;ptdResult=null;libraryPeriod=chosen[0]?.period||libraryPeriod;subjectDialog(id);render();toast(plural(chosen.length,'período atualizado','períodos atualizados')+' com o conteúdo dos arquivos.');
}
