import {CATEGORIES, DEFAULT_PROFILE, CPS_URL, uid, today, esc, bytes, MAX_TOTAL, safeName, newActivity, hasSite, isAbnt, relevantFiles, pathForFile, validate, buildPrompt} from './core.js';
import {getAll, put, batch, addFiles, removeOwner, exportBackup, restoreBackup} from './db.js';
import {runExport} from './tasks.js';

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
globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'
};
const icon=(name,cls='')=>'<svg class="icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.spark)+'</svg>';
let subjects=[], files=[], activities=[], profile={...DEFAULT_PROFILE}, activity=newActivity(), view='activity', step=0, saveTimer, saving=Promise.resolve(), installEvent, updatingWorker, editingSubjectId, libraryPeriod='1', busy=false, search='';
const steps=['Contexto','Entregas','Materiais','Seu prompt'];
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
function fail(error){console.error(error);toast(error.name==='QuotaExceededError'?'Armazenamento cheio. Exporte um backup e libere espaço.':error.message||'Não foi possível concluir. Tente novamente.');}
function setSaved(text){const el=$('#save-state');if(el)el.textContent=text;}
function saveActivity(){
 clearTimeout(saveTimer);
 activity.updatedAt=Date.now();const snapshot=structuredClone(activity);
 saving=saving.catch(()=>{}).then(()=>put('activities',snapshot)).then(()=>{const i=activities.findIndex(a=>a.id===snapshot.id);if(i<0)activities.push(snapshot);else activities[i]=snapshot;setSaved('Salvo neste aparelho');}).catch(e=>{setSaved('Falha ao salvar');fail(e);throw e;});
 return saving;
}
function scheduleSave(){setSaved('Salvando…');clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveActivity().catch(()=>{}),450);}
function field(label,name,value='',options={}){
 const {type='text',placeholder='',required=false,full=false,rows=4,scope='activity',hint='',list}=options;
 const data=scope==='activity'?'data-field':scope==='profile'?'data-profile':'data-subject';
 const id=scope+'-'+name.replaceAll('.','-');
 let control=type==='textarea'?'<textarea id="'+id+'" '+data+'="'+name+'" rows="'+rows+'" placeholder="'+esc(placeholder)+'">'+esc(value)+'</textarea>':type==='select'?'<select id="'+id+'" '+data+'="'+name+'">'+list.map(o=>'<option value="'+esc(o.value)+'" '+(String(value)===String(o.value)?'selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select>':'<input id="'+id+'" '+data+'="'+name+'" type="'+type+'" value="'+esc(value)+'" placeholder="'+esc(placeholder)+'" '+(required?'required':'')+(type==='number'?' min="1" max="30"':'')+'>';
 return '<div class="field '+(full?'full':'')+'"><label for="'+id+'">'+label+(required?' <span class="required">*</span>':'')+'</label>'+control+(hint?'<small>'+hint+'</small>':'')+'</div>';
}
function button(label,action,ico,cls='secondary',extra=''){return '<button type="button" class="btn '+cls+'" data-action="'+action+'" '+extra+'>'+(ico?icon(ico):'')+'<span>'+label+'</span></button>';}
function tag(text,cls=''){return '<span class="tag '+cls+'">'+text+'</span>';}
function currentSubject(){return subjects.find(s=>s.id===activity.subjectId);}
function effectiveFiles(){
 const out=[...files];
 if((activity.includeManual||isAbnt(activity))&&!files.some(f=>f.kind==='manual'))out.push({id:'builtin-manual',name:'manualCPS.pdf',size:854450,ownerType:'profile',kind:'manual',url:'./assets/manual-cps.pdf'}, {id:'builtin-manual-text',name:'manualCPS-texto-completo.txt',size:91378,ownerType:'profile',kind:'manual',url:'./assets/manual-cps.txt'});
 if(hasSite(activity)&&!files.some(f=>f.kind==='brand'))out.push({id:'builtin-brand',name:'logo-CK.webp',size:97788,ownerType:'profile',kind:'brand',url:'./assets/ck-logo.webp'});
 return out;
}
function promptText(){return buildPrompt(activity,currentSubject(),profile,effectiveFiles());}
function nav(){
 const items=[['activity','spark','Criar atividade'],['library','book','Matérias & PTDs'],['drafts','folder','Minhas atividades'],['profile','user','Meu perfil']];
 return '<aside class="sidebar"><a href="./" class="wordmark" aria-label="CK Promptmaker, início"><span class="brand-symbol">CK<span>✦</span></span><div>promptmaker<small>CONSCIOUS KNOWLEDGE</small></div></a><div class="sidebar-label">SEU ESPAÇO CRIATIVO</div><nav aria-label="Navegação principal">'+items.map(([id,ico,label])=>'<button class="nav-item '+(view===id?'active':'')+'" data-view="'+id+'" '+(view===id?'aria-current="page"':'')+'>'+icon(ico)+'<span>'+label+'</span>'+(view===id?'<i></i>':'')+'</button>').join('')+'</nav><div class="sidebar-bottom"><div class="local-note">'+icon('shield')+'<strong>Seu espaço. Seus dados.</strong><p>Tudo salvo no seu aparelho.<br>Sem conta, sem complicação.</p></div>'+button('Instalar aplicativo','install','download','ghost')+'<small class="version">CK PROMPTMAKER · 1.0</small></div></aside>';
}
function render(){
 document.body.classList.toggle('no-motion',!profile.motion);
 $('#app').innerHTML=nav()+'<main id="main"><header class="topbar"><span class="breadcrumb">Workspace <span>/</span> '+({activity:'Nova atividade',library:'Biblioteca curricular',drafts:'Minhas atividades',profile:'Meu perfil'}[view])+'</span><div class="topbar-right"><span class="connection">'+(navigator.onLine?'<i></i> Pronto para criar':'<i class="offline"></i> Modo offline')+'</span><button class="avatar" data-view="profile" aria-label="Abrir meu perfil">'+esc(profile.name?profile.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase():'CK')+'</button></div></header><div class="workspace">'+(view==='activity'?activityView():view==='library'?libraryView():view==='drafts'?draftsView():profileView())+'</div><footer class="app-footer"><span>FEITO PARA SUAS IDEIAS IREM ALÉM.</span><span>Conscious Knowledge <b>✦</b></span></footer></main><button class="camera-fab" data-action="camera" aria-label="Fotografar material da atividade" title="Fotografar material">'+icon('camera')+'</button>';
}
function activityView(){
 const a=activity;
 return '<section class="hero"><div><div class="eyebrow"><span></span> DA IDEIA À ENTREGA</div><h1>Sua ideia.<br><span>Um prompt completo.</span></h1><p>Organize a atividade. Conecte suas referências.<br>Leve o contexto certo para qualquer IA.</p><div class="hero-tags">'+tag(icon('shield')+' Dados locais')+tag(icon('wifi')+' Funciona offline')+'</div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-star star-one">✦</span><span class="art-star star-two">✧</span><img src="./assets/ck-logo.webp" alt="" width="250" height="250"><span class="art-caption">YOUR KNOWLEDGE. AMPLIFIED.</span></div></section><div class="activity-layout"><section class="editor"><div class="stepper" aria-label="Etapas da atividade">'+steps.map((s,i)=>'<button class="step '+(step===i?'current':step>i?'passed':'')+'" data-step="'+i+'" '+(step===i?'aria-current="step"':'')+'><span>'+(step>i?icon('check'):String(i+1).padStart(2,'0'))+'</span><b>'+s+'</b></button>').join('')+'</div><div class="editor-body"><div class="section-heading"><div><span class="overline">ETAPA '+String(step+1).padStart(2,'0')+' / 04</span><h2>'+['Vamos dar contexto.','Como vamos entregar?','As referências fazem a diferença.','Pronto para a próxima etapa.'][step]+'</h2><p>'+['Conte o que você precisa fazer. Os detalhes mudam o resultado.','Escolha um ou mais formatos. Nós cuidamos das instruções.','Enunciados, fotos, textos e seus PTDs. Tudo no mesmo lugar.','Confira o briefing e leve o pacote para a IA de sua escolha.'][step]+'</p></div>'+icon(['edit','package','folder','spark'][step],'heading-icon')+'</div>'+(step===0?contextForm():step===1?deliveryForm():step===2?materialsForm():reviewForm())+'</div><div class="editor-footer"><div class="save-status">'+icon('check')+'<span id="save-state">Salvo neste aparelho</span></div><div class="row">'+(step>0?button('Voltar','previous','back','ghost'):'')+(step<3?button('Continuar','next','arrow','primary'):button('Baixar pacote ZIP','export-zip','download','primary'))+'</div></div></section><aside class="brief-card"><div class="brief-top">'+icon('spark')+'<span>SEU BRIEFING, AO VIVO</span></div><div id="brief-content">'+briefContent()+'</div><div class="brief-tip"><span>✦</span><p>Um bom prompt começa<br>com um bom contexto.</p></div></aside></div>';
}
function briefContent(){
 const a=activity,s=currentSubject(),n=relevantFiles(a,effectiveFiles()).length;
 return '<h3>'+esc(a.title||'Sua próxima atividade')+'</h3><dl><div><dt>Matéria</dt><dd>'+esc(s?.name||'A definir')+'</dd></div><div><dt>Entrega</dt><dd>'+esc(a.due?new Date(a.due+'T12:00:00').toLocaleDateString('pt-BR'):'Sem data')+'</dd></div><div><dt>Modalidade</dt><dd>'+(a.mode==='group'?'Grupo · '+a.groupSize+' pessoas':'Individual')+'</dd></div></dl><div class="brief-divider"></div><small>FORMATOS SELECIONADOS</small><div class="brief-formats">'+(a.deliveries.length?a.deliveries.map(d=>tag(esc(d.category==='other'?a.customFormat||'Outro':d.format))).join(''):'<p>Nenhum formato ainda</p>')+'</div><div class="brief-count">'+icon('folder')+'<span>'+n+' anexos no pacote</span></div>'+(!s?'': '<div class="ptd-mini">'+icon('book')+'<span>'+files.filter(f=>f.ownerType==='subject'&&f.ownerId===s.id).length+' PTDs conectados</span></div>');
}
function updateBrief(){const el=$('#brief-content');if(el)el.innerHTML=briefContent();}
function contextForm(){
 const a=activity;
 return '<div class="form-grid">'+field('Título da atividade','title',a.title,{required:true,full:true,placeholder:'Ex.: Ecossistemas brasileiros e seus desafios'})+
 field('Data da atividade','date',a.date,{type:'date',required:true})+field('Data de entrega','due',a.due,{type:'date',required:true})+
 '<div class="field"><label for="activity-subjectId">Matéria <span class="required">*</span></label><div class="input-action"><select id="activity-subjectId" data-field="subjectId"><option value="">Selecione a matéria</option>'+subjects.map(s=>'<option value="'+s.id+'" '+(a.subjectId===s.id?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select><button class="icon-btn" data-action="add-subject" aria-label="Cadastrar matéria">'+icon('plus')+'</button></div></div>'+
 field('Professor(a)','professor',a.professor,{required:true,placeholder:'Nome do professor'})+
 field('Bimestre atual','period',a.period,{type:'select',list:[1,2,3,4].map(n=>({value:String(n),label:n+'º bimestre'}))})+
 '<div class="field"><label>Modalidade</label><div class="segmented">'+['individual','group'].map((m,i)=>'<button class="'+(a.mode===m?'selected':'')+'" data-mode="'+m+'" aria-pressed="'+(a.mode===m)+'">'+icon(i?'user':'user')+(i?'Em grupo':'Individual')+'</button>').join('')+'</div></div>'+
 (a.mode==='group'?'<div class="group-box full"><div class="group-head">'+field('Quantidade de integrantes (incluindo você)','groupSize',a.groupSize,{type:'number'})+button('Confirmar','confirm-group','check','secondary')+'</div><div class="form-grid">'+a.members.map((m,i)=>field('Integrante '+(i+1),'member-'+i,m,{placeholder:'Nome completo',required:true})).join('')+'</div></div>':'')+
 field('Enunciado da atividade','description',a.description,{type:'textarea',full:true,required:true,rows:5,placeholder:'O que o professor pediu? Cole o enunciado ou descreva a atividade com suas palavras.'})+
 '<details class="details full" '+(a.objectives||a.criteria||a.length?'open':'')+'><summary>'+icon('plus')+' Deixar o contexto mais completo <span>Opcional</span></summary><div class="form-grid">'+field('Objetivos de aprendizagem','objectives',a.objectives,{type:'textarea',full:true,rows:2,placeholder:'O que preciso demonstrar que aprendi?'})+field('Critérios de avaliação','criteria',a.criteria,{type:'textarea',full:true,rows:2,placeholder:'Rubrica, itens obrigatórios, peso da atividade…'})+field('Extensão ou duração','length',a.length,{full:true,placeholder:'Ex.: 5 páginas, 10 slides ou 8 minutos'})+'</div></details></div>';
}
function deliveryForm(){
 const a=activity;
 return '<div class="delivery-grid">'+CATEGORIES.map(c=>{
 const active=a.deliveries.some(d=>d.category===c.id);
 return '<div class="delivery-card '+(active?'chosen':'')+'"><button class="delivery-head" data-category="'+c.id+'" aria-expanded="'+active+'"><span class="category-icon">'+icon(c.icon)+'</span><span><strong>'+c.name+'</strong><small>'+c.description+'</small></span>'+icon(active?'check':'plus')+'</button>'+(active?'<div class="format-picker"><span>FORMATO FINAL</span><div class="chips">'+c.formats.map(f=>'<button class="chip '+(a.deliveries.some(d=>d.category===c.id&&d.format===f)?'selected':'')+'" data-format="'+f+'" data-cat="'+c.id+'" aria-pressed="'+a.deliveries.some(d=>d.category===c.id&&d.format===f)+'">'+(f==='PERSONALIZADO'?'Definir formato':f)+'</button>').join('')+'</div></div>':'')+'</div>';
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
 return '<div class="file-list">'+list.map(f=>'<div class="file-row">'+icon(f.mime?.startsWith('image/')?'camera':'file')+'<div><strong>'+esc(f.name)+'</strong><small>'+bytes(f.size)+(f.period?' · '+esc(f.period)+'º bimestre':'')+'</small></div><button class="icon-btn" data-download-file="'+f.id+'" aria-label="Baixar '+esc(f.name)+'">'+icon('download')+'</button><button class="icon-btn danger" data-delete-file="'+f.id+'" aria-label="Remover '+esc(f.name)+'">'+icon('close')+'</button></div>').join('')+'</div>';
}
function materialsForm(){
 const s=currentSubject(),list=files.filter(f=>f.ownerType==='activity'&&f.ownerId===activity.id&&f.kind==='base');
 return '<label class="toggle manual-toggle"><input type="checkbox" data-field="includeManual" '+(activity.includeManual||isAbnt(activity)?'checked':'')+' '+(isAbnt(activity)?'disabled':'')+'><span>Incluir manual CPS completo<small>PDF original + transcrição integral. Obrigatório nas entregas ABNT.</small></span></label><div class="materials-actions">'+uploadBox('base','Solte aqui ou escolha seus materiais')+'<button class="camera-card" data-action="camera">'+icon('camera')+'<strong>Abrir câmera</strong><small>Fotografe o enunciado<br>em um toque</small></button></div>'+fileList(list)+'<div class="subsection form-grid">'+field('Texto-base','baseText',activity.baseText,{type:'textarea',full:true,rows:5,placeholder:'Cole textos, transcrições de imagens ou trechos de apoio. Textos colados ficam dentro do prompt.'})+field('Links de referência','links',activity.links,{type:'textarea',full:true,rows:2,placeholder:'Cole um link por linha. O acesso dependerá da IA que receber o prompt.'})+'</div><section class="ptd-connected"><div>'+icon('book')+'<div><h3>Seu contexto curricular</h3><p>'+(s?esc(s.name)+' · Todos os bimestres entram no pacote.':'Selecione uma matéria na primeira etapa para conectar os PTDs.')+'</p></div></div>'+(s?button('Gerenciar PTDs','edit-current-subject','arrow','ghost'):'')+'</section>'+(s?'<div class="period-status">'+[1,2,3,4].map(n=>{const count=files.filter(f=>f.ownerType==='subject'&&f.ownerId===s.id&&String(f.period)===String(n)).length;return '<div><strong>'+n+'º bimestre</strong><small>'+count+' arquivo'+(count!==1?'s':'')+(s.notes?.[n]?' + notas':'')+'</small></div>';}).join('')+'</div>':'')+'<div class="notice">'+icon('shield')+'<p>Seus arquivos ficam neste aparelho. Ao exportar o ZIP, eles seguem junto com o prompt. Copiar apenas o texto não envia fotos ou documentos.</p></div>';
}
function reviewForm(){
 const errors=validate(activity),all=relevantFiles(activity,effectiveFiles()),ptds=all.filter(f=>f.ownerType==='subject');
 return '<div class="review-status '+(errors.length?'pending':'ready')+'">'+icon(errors.length?'edit':'check')+'<div><strong>'+(errors.length?errors.length+' ajuste'+(errors.length>1?'s':'')+' antes de exportar':'Seu contexto está pronto')+'</strong><p>'+(errors.length?'Complete os campos abaixo para gerar o pacote.':'Prompt + '+all.length+' anexos, incluindo '+ptds.length+' PTDs.')+'</p></div></div>'+
 (errors.length?'<ul class="validation-list">'+errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>':'')+
 (hasSite(activity)&&activity.website.hasMedia&&!files.some(f=>f.ownerId===activity.id&&f.kind==='media')?'<div class="notice">Você marcou um pacote de mídia, mas ainda não anexou o ZIP.</div>':'')+
 '<div class="export-grid">'+button('Copiar prompt','copy','copy','secondary')+button('Baixar .txt','export-txt','file','secondary')+button('Baixar .md','export-md','file','secondary')+button('Compartilhar pacote','share','upload','secondary')+'</div><details class="prompt-preview" open><summary>Prévia do prompt <span>'+promptText().length.toLocaleString('pt-BR')+' caracteres</span>'+icon('chevron')+'</summary><textarea id="prompt-preview" readonly aria-label="Prompt gerado">'+esc(promptText())+'</textarea></details><div class="notice">'+icon('package')+'<p><strong>Leve o pacote completo.</strong>Extraia o ZIP e envie PROMPT.md junto com os anexos para a IA. Se ela aceitar ZIP, envie o pacote diretamente. Os limites de anexos variam por IA.</p></div>'+button(activity.status==='done'?'Marcar como rascunho':'Marcar atividade como concluída','toggle-done','check','ghost');
}
function pageHeading(eyebrow,title,description,action=''){return '<div class="page-heading"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p>'+description+'</p></div>'+action+'</div>';}
function libraryView(){
 return pageHeading('SUA BASE DE CONHECIMENTO','Matérias & PTDs','Cadastre uma vez. Conecte a cada nova atividade.',button('Nova matéria','add-subject','plus','primary'))+
 '<div class="notice library-notice">'+icon('book')+'<p>Os PTDs de todos os bimestres acompanham os prompts da matéria. Você também pode registrar conteúdos, competências e observações em texto.</p></div><div class="subject-grid">'+(subjects.length?subjects.map((s,i)=>'<button class="subject-card" data-edit-subject="'+s.id+'"><span class="subject-symbol tone-'+(i%4)+'">'+icon('book')+'</span><h2>'+esc(s.name)+'</h2><p>'+esc(s.professor||'Professor não informado')+'</p><div class="subject-periods">'+[1,2,3,4].map(n=>'<span class="'+(files.some(f=>f.ownerId===s.id&&String(f.period)===String(n))||s.notes?.[n]?'filled':'')+'">'+n+'º</span>').join('')+'</div><footer><span>'+files.filter(f=>f.ownerType==='subject'&&f.ownerId===s.id).length+' arquivos</span>'+icon('arrow')+'</footer></button>').join(''):'<div class="empty-state">'+icon('book')+'<h2>Seu conhecimento começa aqui.</h2><p>Crie sua primeira matéria e adicione os PTDs<br>para dar mais contexto às suas atividades.</p>'+button('Cadastrar matéria','add-subject','plus','primary')+'</div>')+'</div>';
}
function draftItems(){
 const list=activities.filter(a=>(a.title+' '+(subjects.find(s=>s.id===a.subjectId)?.name||'')).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.updatedAt-a.updatedAt);
 return list.length?list.map(a=>'<article class="draft-card"><button class="draft-main" data-open-activity="'+a.id+'"><span class="draft-symbol">'+icon(a.status==='done'?'check':'file')+'</span><div>'+tag(a.status==='done'?'Concluída':'Rascunho',a.status==='done'?'green':'')+'<h3>'+esc(a.title||'Atividade sem título')+'</h3><p>'+esc(subjects.find(s=>s.id===a.subjectId)?.name||'Matéria a definir')+' <span>·</span> '+(a.due?'Entrega '+new Date(a.due+'T12:00:00').toLocaleDateString('pt-BR'):'Sem prazo')+'</p></div>'+icon('arrow')+'</button><div class="draft-tools"><button class="icon-btn" data-duplicate="'+a.id+'" aria-label="Duplicar '+esc(a.title)+'">'+icon('copy')+'</button><button class="icon-btn danger" data-delete-activity="'+a.id+'" aria-label="Excluir '+esc(a.title)+'">'+icon('trash')+'</button></div></article>').join(''):'<div class="empty-state">'+icon('folder')+'<h2>'+(search?'Nenhuma atividade encontrada.':'Espaço para suas próximas ideias.')+'</h2><p>'+(search?'Tente outro título ou matéria.':'Suas atividades salvas aparecem aqui.')+'</p></div>';
}
function draftsView(){return pageHeading('DO RASCUNHO À ENTREGA','Minhas atividades','Retome de onde parou ou reutilize um briefing.',button('Nova atividade','new','plus','primary'))+'<div class="search-box">'+icon('search')+'<input id="search" aria-label="Buscar atividades" placeholder="Buscar por título ou matéria" value="'+esc(search)+'"></div><div id="draft-list" class="draft-list">'+draftItems()+'</div>';}
function profileView(){
 const p=profile;
 return pageHeading('UM APP DO SEU JEITO','Meu perfil','Sua voz, suas preferências e o controle dos seus dados.')+
 '<section class="settings-card"><div class="section-heading"><div><h2>Quem está criando?</h2><p>Esses dados ajudam a personalizar cada prompt.</p></div>'+icon('user','heading-icon')+'</div><div class="form-grid">'+
 field('Seu nome','name',p.name,{scope:'profile',placeholder:'Como você quer ser identificado(a)?'})+field('Instituição','school',p.school,{scope:'profile',placeholder:'Sua escola ou faculdade'})+field('Curso','course',p.course,{scope:'profile'})+field('Turma','className',p.className,{scope:'profile'})+field('Nível de estudo','level',p.level,{scope:'profile'})+field('Idioma das entregas','language',p.language,{scope:'profile'})+field('Estilo de escrita','style',p.style,{scope:'profile',full:true,placeholder:'Ex.: direto, com exemplos e sem palavras muito formais'})+field('Uma amostra da sua escrita','sample',p.sample,{scope:'profile',type:'textarea',full:true,rows:4,placeholder:'Cole um texto seu. A IA usará como referência de tom e vocabulário.'})+'</div></section>'+
 '<section class="settings-card"><div class="section-heading"><div><h2>Identidade & regras</h2><p>Adapte o app para você, sua turma ou sua marca.</p></div>'+icon('spark','heading-icon')+'</div><div class="form-grid">'+field('Nome da marca','brand',p.brand,{scope:'profile',full:true})+field('Link do manual de formatação','manualUrl',p.manualUrl,{scope:'profile',full:true,type:'url',hint:'O manual CPS que acompanha o app é a versão de 2015 fornecida pelo criador. Um arquivo enviado abaixo substitui o manual do pacote.'})+'</div><div class="settings-uploads"><div><h3>Manual da instituição</h3>'+uploadBox('manual','Anexar manual próprio','.pdf,.docx',false)+fileList(files.filter(f=>f.kind==='manual'))+'</div><div><h3>Logo da sua marca</h3>'+uploadBox('brand','Usar outra logo','image/png,image/jpeg,image/webp',false)+fileList(files.filter(f=>f.kind==='brand'))+'</div></div>'+field('Regras adicionais para os prompts','extraRules',p.extraRules,{scope:'profile',type:'textarea',rows:3,placeholder:'Preferências da escola, estrutura padrão, orientações recorrentes…'})+'<label class="toggle"><input type="checkbox" data-profile="motion" '+(p.motion?'checked':'')+'><span>Animações da interface<small>A preferência de movimento reduzido do aparelho também é respeitada.</small></span></label></section>'+
 '<section class="settings-card"><div class="section-heading"><div><h2>Seu aparelho, seu espaço</h2><p>Salvamento local, sem envio automático para servidores.</p></div>'+icon('shield','heading-icon')+'</div><div class="storage-row"><span>'+bytes(files.reduce((sum,f)=>sum+f.size,0))+' de 120 MB em anexos</span>'+button('Proteger armazenamento','persist','shield','ghost')+'</div><p class="muted">Faça backups regularmente. Limpar os dados do navegador, remover o app ou trocar de aparelho pode apagar seus materiais. O backup inclui atividades, perfil e arquivos.</p><div class="button-wrap">'+button('Exportar backup','backup','download','secondary')+button('Restaurar backup','restore','upload','secondary')+button('Instalar app','install','plus','primary')+(updatingWorker?button('Atualizar aplicativo','update','download','secondary'):'')+'</div></section>';
}
function subjectDialog(id){
 editingSubjectId=id;const s=subjects.find(s=>s.id===id);if(!s)return;
 const d=$('#dialog');
 d.innerHTML='<div class="dialog-head"><div><span class="overline">BIBLIOTECA CURRICULAR</span><h2>Editar matéria</h2></div><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body"><div class="form-grid">'+field('Nome da matéria','name',s.name,{scope:'subject',required:true})+field('Professor(a) padrão','professor',s.professor,{scope:'subject'})+'</div><div class="subsection"><h3>Planos de Trabalho Docente</h3><p class="muted">Todos os bimestres são incluídos no pacote, independentemente do bimestre da atividade.</p><div class="period-tabs">'+['1','2','3','4','anual'].map(n=>'<button class="'+(libraryPeriod===n?'selected':'')+'" data-period="'+n+'">'+(n==='anual'?'Anual':n+'º bim.')+'</button>').join('')+'</div>'+uploadBox('ptd','Adicionar PTD deste período')+fileList(files.filter(f=>f.ownerType==='subject'&&f.ownerId===id&&f.period===libraryPeriod))+field('Conteúdo e competências do período','notes.'+libraryPeriod,s.notes?.[libraryPeriod]||'',{scope:'subject',type:'textarea',rows:4,placeholder:'Você pode colar o conteúdo do PTD aqui para incluí-lo diretamente no texto do prompt.'})+'</div></div><div class="dialog-footer">'+button('Excluir matéria','delete-subject','trash','ghost danger')+button('Concluir','close-dialog','check','primary')+'</div>';
 if(!d.open)d.showModal();
}
async function createSubject(){await saveActivity();const s={id:uid(),name:'Nova matéria',professor:'',notes:{},createdAt:Date.now()};await put('subjects',s);subjects.push(s);if(view==='activity'){activity.subjectId=s.id;await saveActivity();}libraryPeriod='1';render();subjectDialog(s.id);$('#subject-name').focus();$('#subject-name').select();}
function confirmDialog(title,message,onConfirm){
 const d=$('#dialog');d.innerHTML='<div class="dialog-head"><h2>'+esc(title)+'</h2></div><div class="dialog-body"><p>'+esc(message)+'</p></div><div class="dialog-footer">'+button('Cancelar','close-dialog',null,'secondary')+'<button class="btn primary" id="confirm-action">Confirmar</button></div>';if(!d.open)d.showModal();$('#confirm-action').onclick=async()=>{try{await onConfirm();d.close();}catch(e){fail(e);}};
}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function requireValid(){const errors=validate(activity);if(errors.length){step=3;render();toast(errors[0]);return false;}return true;}
async function packageActivity(){
 const selected=relevantFiles(activity,effectiveFiles());const entries=[{name:'PROMPT.md',blob:new Blob([promptText()],{type:'text/markdown'})},{name:'LEIA-ME.txt',blob:new Blob(['CK Promptmaker\n\n1. Extraia este ZIP.\n2. Envie PROMPT.md e todos os anexos para a IA. Se ela aceitar ZIP, envie o pacote diretamente.\n3. Confira se a IA conseguiu ler os arquivos. Alguns serviços não abrem ZIPs ou têm limites de tamanho.\n4. Revise, compreenda e ajuste o resultado antes de entregar.\n\nO prompt não contém os bytes dos anexos. Os arquivos estão nas pastas deste pacote.\nO manual CPS, quando presente, pertence ao Centro Paula Souza. Fonte: '+CPS_URL+'\n'])}];
 for(let i=0;i<selected.length;i++){const f=selected[i];let blob=f.blob;if(f.url){const response=await fetch(f.url);if(!response.ok)throw new Error('Não foi possível carregar '+f.name+'. Abra o app online uma vez e tente novamente.');blob=await response.blob();}entries.push({name:pathForFile(f,i),blob});}
 entries.push({name:'briefing.json',blob:new Blob([JSON.stringify({version:1,activity,subject:currentSubject(),profile,attachments:selected.map((f,i)=>({name:f.name,path:pathForFile(f,i),kind:f.kind,period:f.period}))},null,2)],{type:'application/json'})});
 return runExport('zip',entries);
}
async function exportAction(type){
 if(!requireValid()||busy)return;await saveActivity();
 if(type==='copy'){try{await navigator.clipboard.writeText(promptText());toast('Prompt copiado. Envie os anexos junto com o texto.');}catch{const preview=$('#prompt-preview');preview.focus();preview.select();toast('Selecionei o prompt. Use a opção Copiar do seu aparelho.');}return;}
 if(type==='export-txt'||type==='export-md'){download(new Blob([promptText()],{type:'text/plain;charset=utf-8'}),safeName(activity.title)+(type==='export-md'?'.md':'.txt'));toast('Prompt exportado. Lembre-se de enviar os anexos.');return;}
 busy=true;toast('Preparando seu pacote…');
 try{const zip=await packageActivity();const name=safeName(activity.title)+'.zip';const file=new File([zip],name,{type:'application/zip'});
 if(type==='share'&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:activity.title});}catch(error){if(error.name!=='AbortError'){download(zip,name);toast('Não foi possível compartilhar diretamente. O pacote foi baixado.');}}}
 else{download(zip,name);toast(type==='share'?'Compartilhamento indisponível aqui. O pacote foi baixado.':'Pacote completo exportado.');}
 }finally{busy=false;}
}
async function handleUpload(input){
 const list=Array.from(input.files||[]);if(!list.length)return;const kind=input.dataset.upload;
 if(kind==='media'&&list.some(f=>!f.name.toLowerCase().endsWith('.zip')))throw new Error('Selecione um arquivo ZIP para o pacote de mídia.');
 let ownerType='activity',ownerId=activity.id,opts={kind};
 if(kind==='ptd'){ownerType='subject';ownerId=editingSubjectId;opts={kind:'ptd',period:libraryPeriod};}
 else if(kind==='manual'||kind==='brand'){ownerType='profile';ownerId='profile';}
 else await saveActivity();
 const records=await addFiles(list,ownerType,ownerId,opts);
 if(ownerType==='profile'){const old=files.filter(f=>f.kind===kind);await batch(old.map(f=>({store:'files',type:'delete',id:f.id})));files=files.filter(f=>f.kind!==kind);}
 files.push(...records);input.value='';render();if(kind==='ptd')subjectDialog(editingSubjectId);toast(records.length+' arquivo(s) salvo(s) no aparelho.');
}
function setPath(object,key,value){const parts=key.split('.');if(parts.length===2)object[parts[0]][parts[1]]=value;else object[key]=value;}
async function handleField(target){
 if(target.dataset.field){
 const key=target.dataset.field;let value=target.type==='checkbox'?target.checked:target.value;
 if(key.startsWith('member-'))activity.members[Number(key.split('-')[1])]=value;
 else setPath(activity,key,value);
 if(key==='subjectId'){activity.professor=currentSubject()?.professor||'';render();}
 else if(['customSite','website.hasMedia','website.github','includeManual'].includes(key))render();
 scheduleSave();updateBrief();
 } else if(target.dataset.profile){
 setPath(profile,target.dataset.profile,target.type==='checkbox'?target.checked:target.value);
 await put('settings',{...profile,id:'profile'});document.body.classList.toggle('no-motion',!profile.motion);
 }else if(target.dataset.subject){
 const s=subjects.find(s=>s.id===editingSubjectId);setPath(s,target.dataset.subject,target.value);await put('subjects',structuredClone(s));
 }else if(target.id==='search'){search=target.value;$('#draft-list').innerHTML=draftItems();}
}
async function handleClick(event){
 const t=event.target.closest('button');if(!t)return;
 if(t.dataset.view){await saveActivity();view=t.dataset.view;render();window.scrollTo(0,0);return;}
 if(t.dataset.step!==undefined){await saveActivity();step=Number(t.dataset.step);render();$('.editor').scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(t.dataset.mode){activity.mode=t.dataset.mode;await saveActivity();render();return;}
 if(t.dataset.category){const c=CATEGORIES.find(c=>c.id===t.dataset.category);if(activity.deliveries.some(d=>d.category===c.id))activity.deliveries=activity.deliveries.filter(d=>d.category!==c.id);else activity.deliveries.push({category:c.id,format:c.formats[0]});await saveActivity();render();return;}
 if(t.dataset.format){const i=activity.deliveries.findIndex(d=>d.category===t.dataset.cat&&d.format===t.dataset.format);if(i>=0)activity.deliveries.splice(i,1);else activity.deliveries.push({category:t.dataset.cat,format:t.dataset.format});await saveActivity();render();return;}
 if(t.dataset.websiteChoice){activity.website[t.dataset.websiteChoice]=t.dataset.value;await saveActivity();render();return;}
 if(t.dataset.editSubject){libraryPeriod='1';subjectDialog(t.dataset.editSubject);return;}
 if(t.dataset.period){libraryPeriod=t.dataset.period;subjectDialog(editingSubjectId);return;}
 if(t.dataset.deleteFile){const f=files.find(f=>f.id===t.dataset.deleteFile);await batch([{store:'files',type:'delete',id:f.id}]);files=files.filter(x=>x.id!==f.id);render();if(f.ownerType==='subject')subjectDialog(f.ownerId);toast('Arquivo removido.');return;}
 if(t.dataset.downloadFile){const f=files.find(f=>f.id===t.dataset.downloadFile);download(f.blob,f.name);return;}
 if(t.dataset.openActivity){await saveActivity();activity=structuredClone(activities.find(a=>a.id===t.dataset.openActivity));await put('settings',{id:'active',activityId:activity.id});view='activity';step=0;render();window.scrollTo(0,0);return;}
 if(t.dataset.duplicate){const original=activities.find(a=>a.id===t.dataset.duplicate);const clone={...structuredClone(original),id:uid(),title:original.title+' (cópia)',status:'draft',createdAt:Date.now(),updatedAt:Date.now()};const copies=files.filter(f=>f.ownerType==='activity'&&f.ownerId===original.id).map(f=>({...f,id:uid(),ownerId:clone.id}));if(files.reduce((n,f)=>n+f.size,0)+copies.reduce((n,f)=>n+f.size,0)>MAX_TOTAL)throw new Error('Não há espaço para duplicar os anexos. Exporte um backup e libere espaço.');await batch([{store:'activities',value:clone},...copies.map(value=>({store:'files',value}))]);activities.push(clone);files.push(...copies);render();toast('Atividade duplicada com os anexos.');return;}
 if(t.dataset.deleteActivity){const id=t.dataset.deleteActivity;confirmDialog('Excluir atividade?','A atividade e seus anexos serão removidos deste aparelho.',async()=>{clearTimeout(saveTimer);await saving;await removeOwner('activity',id);activities=activities.filter(a=>a.id!==id);files=files.filter(f=>!(f.ownerType==='activity'&&f.ownerId===id));if(activity.id===id){activity=newActivity();await put('settings',{id:'active',activityId:activity.id});}render();});return;}
 const action=t.dataset.action;
 if(['copy','export-txt','export-md','export-zip','share'].includes(action)){await exportAction(action);return;}
 switch(action){
 case 'next':case 'previous':await saveActivity();step+=action==='next'?1:-1;render();$('.editor').scrollIntoView({behavior:'smooth',block:'start'});break;
 case 'confirm-group':{const count=Number(activity.groupSize);if(!Number.isInteger(count)||count<2||count>30){toast('O grupo deve ter entre 2 e 30 integrantes.');return;}activity.members=Array.from({length:count},(_,i)=>activity.members[i]||'');await saveActivity();render();break;}
 case 'add-subject':await createSubject();break;
 case 'edit-current-subject':libraryPeriod=activity.period;subjectDialog(activity.subjectId);break;
 case 'close-dialog':{const s=subjects.find(s=>s.id===editingSubjectId);if($('#dialog [data-subject]')&&s&&!s.name.trim()){toast('Informe um nome para a matéria.');return;}if(s&&activity.subjectId===s.id&&!activity.professor.trim()){activity.professor=s.professor||'';await saveActivity();}$('#dialog').close();editingSubjectId=null;render();break;}
 case 'delete-subject':{const id=editingSubjectId;if(activities.some(a=>a.subjectId===id)){toast('Esta matéria está em uso. Troque a matéria das atividades antes de excluí-la.');return;}confirmDialog('Excluir matéria?','A matéria, os PTDs e as notas serão excluídos.',async()=>{await removeOwner('subject',id);subjects=subjects.filter(s=>s.id!==id);files=files.filter(f=>!(f.ownerType==='subject'&&f.ownerId===id));editingSubjectId=null;render();});break;}
 case 'new':await saveActivity();activity=newActivity();await put('settings',{id:'active',activityId:activity.id});view='activity';step=0;await saveActivity();render();window.scrollTo(0,0);break;
 case 'camera':$('#camera-input').click();break;
 case 'toggle-done':activity.status=activity.status==='done'?'draft':'done';await saveActivity();render();toast(activity.status==='done'?'Atividade concluída.':'Atividade reaberta.');break;
 case 'backup':download(await exportBackup(),'CK-backup-'+today()+'.json');toast('Backup completo exportado. Guarde-o em um lugar seguro.');break;
 case 'restore':$('#backup-input').click();break;
 case 'persist':{const granted=await navigator.storage?.persist?.();toast(granted?'Armazenamento persistente concedido. Continue fazendo backups.':'O navegador decide a proteção do armazenamento. Mantenha seu backup em dia.');break;}
 case 'install':await installApp();break;
 case 'update':await saveActivity();updatingWorker?.postMessage('SKIP_WAITING');break;
 }
}
async function installApp(){
 if(matchMedia('(display-mode: standalone)').matches||navigator.standalone){toast('O CK já está aberto como aplicativo.');return;}
 if(installEvent){await installEvent.prompt();await installEvent.userChoice;installEvent=null;return;}
 const d=$('#dialog');d.innerHTML='<div class="dialog-head"><h2>Leve o CK com você.</h2><button class="icon-btn" data-action="close-dialog" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body"><img class="install-logo" src="./assets/ck-logo.webp" alt="Conscious Knowledge"><h3>No Android</h3><p>Abra no Chrome. No menu ⋮, toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p><h3>No iPhone / iPad</h3><p>Abra no Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p><p class="muted">A instalação precisa de HTTPS (ou localhost). Abra online uma vez para preparar o uso offline.</p></div><div class="dialog-footer">'+button('Entendi','close-dialog','check','primary')+'</div>';if(!d.open)d.showModal();
}
document.addEventListener('click',event=>handleClick(event).catch(fail));
document.addEventListener('input',event=>{if(event.target.matches('input:not([type=file]):not([type=checkbox]),textarea'))handleField(event.target).catch(fail);});
document.addEventListener('change',event=>{const t=event.target;if(t.dataset.upload)handleUpload(t).catch(fail);else if(t.matches('select,input[type=checkbox]'))handleField(t).catch(fail);});
$('#camera-input').addEventListener('change',async e=>{try{await saveActivity();const saved=await addFiles(e.target.files,'activity',activity.id,{kind:'base'});files.push(...saved);e.target.value='';view='activity';step=2;render();toast('Foto adicionada aos materiais.');}catch(error){fail(error);}});
$('#backup-input').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(!file)return;confirmDialog('Restaurar backup?','Isso substitui os dados atuais deste aparelho. Exporte um backup antes, se quiser mantê-los.',async()=>{await saveActivity();await restoreBackup(file);await loadData();render();toast('Backup restaurado com sucesso.');});});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveActivity().catch(()=>{});});
window.addEventListener('beforeunload',()=>{if(saveTimer)saveActivity().catch(()=>{});});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;});
window.addEventListener('online',()=>{render();toast('Conexão restabelecida.');});
window.addEventListener('offline',()=>{render();toast('Você pode continuar trabalhando offline.');});
async function loadData(){
 [activities,subjects,files]=await Promise.all(['activities','subjects','files'].map(getAll));const settings=await getAll('settings');
 profile={...DEFAULT_PROFILE,...settings.find(s=>s.id==='profile')};const active=settings.find(s=>s.id==='active');
 activity=structuredClone(activities.find(a=>a.id===active?.activityId)||activities.sort((a,b)=>b.updatedAt-a.updatedAt)[0]||newActivity());
 if(new URLSearchParams(location.search).has('new'))activity=newActivity();
 await put('settings',{id:'active',activityId:activity.id});await saveActivity();
}
async function init(){
 try{await loadData();render();}catch(error){$('#app').innerHTML='<div class="empty-state"><h1>Não foi possível abrir o armazenamento.</h1><p>Verifique se o navegador permite armazenamento local e tente recarregar. Seus dados existentes não foram apagados.</p></div>';fail(error);}
 const intro=$('#intro');
 if(sessionStorage.getItem('ck-intro')||!profile.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)intro.remove();
 else{sessionStorage.setItem('ck-intro','1');setTimeout(()=>intro.remove(),1800);}
 if(new URLSearchParams(location.search).has('camera')){step=2;render();toast('Toque no botão de câmera para fotografar a atividade.');}
 history.replaceState(null,'',location.pathname);
 if('serviceWorker' in navigator){
 try{const reg=await navigator.serviceWorker.register('./sw.js');const showUpdate=()=>{if(reg.waiting&&navigator.serviceWorker.controller){updatingWorker=reg.waiting;if(view==='profile')render();toast('Nova versão disponível. Use Atualizar aplicativo no perfil.');}};
 showUpdate();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',showUpdate);});
 let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updatingWorker&&!refreshing){refreshing=true;location.reload();}});
 }catch(e){console.info('Offline disponível no build de produção.',e.message);}
 }
}
init();
