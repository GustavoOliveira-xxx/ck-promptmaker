import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function boot(page){await page.goto('/ck-promptmaker/');await expect(page.getByRole('heading',{name:'Vamos dar contexto.'})).toBeVisible();await expect(page.locator('#intro')).toHaveCount(0);}
async function subject(page){await page.getByRole('button',{name:'Cadastrar matéria',exact:true}).click();await page.getByLabel('Nome da matéria').fill('Biologia');await page.getByLabel('Professor(a) padrão').fill('Profa. Ana');}
async function fill(page){await expect(page.locator('#dialog')).not.toBeVisible();await page.getByLabel('Título da atividade').fill('Biomas brasileiros');await page.getByLabel('Data de entrega').fill('2027-10-20');await page.locator('#activity-professor').fill('Profa. Ana');await page.getByLabel('Enunciado da atividade').fill('Compare os biomas brasileiros com exemplos, ameaças e medidas de preservação.');}
function readZip(buf){const entries=new Map();let i=0;while(buf.readUInt32LE(i)===0x04034b50){const size=buf.readUInt32LE(i+18),len=buf.readUInt16LE(i+26),extra=buf.readUInt16LE(i+28);const name=buf.subarray(i+30,i+30+len).toString('utf8');const start=i+30+len+extra;entries.set(name,buf.subarray(start,start+size));i=start+size;}return entries;}
test('complete mobile flow exports real PTDs, camera image, media, logo and CPS manual; persists offline',async({page,context})=>{
 test.setTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await boot(page);await subject(page);
 for(const n of [1,2,3,4]){await page.getByRole('button',{name:n+'º bim.',exact:true}).click();await page.locator('input[data-upload="ptd"]').setInputFiles({name:'ptd-bimestre-'+n+'.txt',mimeType:'text/plain',buffer:Buffer.from('Conteúdo do bimestre '+n)});await expect(page.getByText('ptd-bimestre-'+n+'.txt',{exact:true})).toBeVisible();}
 await page.getByLabel('Conteúdo e competências do período').fill('Ecologia e evolução');
 await page.getByRole('button',{name:'Concluir',exact:true}).click();await fill(page);
 await page.getByRole('button',{name:'Em grupo',exact:true}).click();await page.getByLabel('Quantidade de integrantes').fill('3');await page.getByRole('button',{name:'Confirmar',exact:true}).click();
 await page.locator('#activity-member-0').fill('Gustavo');await page.locator('#activity-member-1').fill('Maria');await page.locator('#activity-member-2').fill('João');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByRole('button',{name:/Documento ABNT/}).click();await page.locator('[data-cat="abnt"][data-format="PDF"]').click();
 await page.getByRole('button',{name:/Apresentação Slides/}).click();await page.locator('[data-cat="presentation"][data-format="SITE"]').click();
 await expect(page.getByRole('heading',{name:'Direção criativa'})).toBeVisible();await page.getByRole('button',{name:/CK remaster/}).click();
 await page.getByLabel('Já tenho um pacote de mídia').evaluate(el=>el.scrollIntoView({block:'center'}));await page.getByLabel('Já tenho um pacote de mídia').check();await page.locator('input[data-upload="media"]').setInputFiles({name:'midia.zip',mimeType:'application/zip',buffer:Buffer.from('media-test-fixture')});await expect(page.getByText('midia.zip',{exact:true})).toBeVisible();
 await page.getByLabel('Preparar para publicar no GitHub').evaluate(el=>el.scrollIntoView({block:'center'}));await page.getByLabel('Preparar para publicar no GitHub').check();await page.getByLabel('Repositório GitHub').fill('https://github.com/aluno/biomas');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.locator('#camera-input').setInputFiles({name:'foto-enunciado.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64')});
 await expect(page.getByText('foto-enunciado.png',{exact:true})).toBeVisible();await page.getByLabel('Texto-base',{exact:true}).fill('A atividade deve abordar também a preservação da Mata Atlântica.');
 await page.getByLabel('Conferi os materiais e os PTDs desta atividade').check();await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByText('Seu contexto está pronto',{exact:true})).toBeVisible();
 const preview=page.getByLabel('Prompt gerado');await expect(preview).toContainText('Grupo de 3 integrantes: Gustavo; Maria; João');await expect(preview).toContainText('Ecologia e evolução');await expect(preview).toContainText('Centro Paula Souza');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar pacote ZIP',exact:true}).click();const download=await downloadPromise;const zip=readZip(await readFile(await download.path()));expect([...zip.keys()].filter(k=>k.startsWith('ptds/'))).toHaveLength(4);expect([...zip.keys()].some(k=>k.includes('manualCPS.pdf'))).toBeTruthy();expect([...zip.keys()].some(k=>k.includes('foto-enunciado'))).toBeTruthy();expect([...zip.keys()].some(k=>k.includes('logo-CK'))).toBeTruthy();expect(zip.get('PROMPT.md').toString()).toContain('Mata Atlântica');const manual=[...zip].find(([name])=>name.endsWith('manualCPS.pdf'));expect(createHash('sha256').update(manual[1]).digest('hex')).toBe('5363cf1959ed9cc12c0afa0db5d3dd8be0e7a97907db82a09dfc7b8d4fe9e413');expect([...zip].find(([name])=>name.endsWith('manualCPS-texto-completo.txt'))[1].toString()).toContain('PAGINA 65 DE 65');
 const ptd=[...zip].find(([name])=>name.includes('ptd-bimestre-3.txt'));expect(ptd[1].toString()).toBe('Conteúdo do bimestre 3');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await expect(page.getByLabel('Título da atividade')).toHaveValue('Biomas brasileiros');await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();
 await context.setOffline(true);await page.reload();await expect(page.getByLabel('Título da atividade')).toHaveValue('Biomas brasileiros');await page.getByRole('button',{name:/Materiais$/,exact:false}).first().click();await expect(page.getByText('foto-enunciado.png',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('backup restores profile, activity and original binary attachments atomically',async({page})=>{
 await boot(page);await subject(page);await page.getByRole('button',{name:'Concluir',exact:true}).click();await fill(page);
 await page.locator('#camera-input').setInputFiles({name:'backup-foto.png',mimeType:'image/png',buffer:Buffer.from([0,1,255,20])});await expect(page.locator('#toast')).toContainText('Foto adicionada');await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByLabel('Seu nome',{exact:true}).fill('Gustavo Oliveira');await page.getByLabel('Uma amostra da sua escrita').fill('Eu gosto de explicar com exemplos concretos.');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar backup',exact:true}).click();const backup=await pending;const data=JSON.parse(await readFile(await backup.path(),'utf8'));expect(data.app).toBe('ck-promptmaker');expect(data.files).toHaveLength(1);expect(Buffer.from(data.files[0].data.split(',')[1],'base64')).toEqual(Buffer.from([0,1,255,20]));expect(data.activities.some(a=>a.title==='Biomas brasileiros')).toBeTruthy();
 await page.getByLabel('Seu nome',{exact:true}).fill('Mudança temporária');await page.locator('#backup-input').setInputFiles(await backup.path());await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByLabel('Seu nome',{exact:true})).toHaveValue('Gustavo Oliveira');
 await page.locator('#backup-input').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"app":"ck-promptmaker","version":999}')});await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.locator('#toast')).toContainText('backup CK compatível');await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.getByLabel('Seu nome',{exact:true})).toHaveValue('Gustavo Oliveira');
});
test('steps require context, profile, delivery and material review; edits relock review',async({page})=>{
 await boot(page);
 await page.locator('[data-step="3"]').click({force:true});
 await expect(page.getByRole('heading',{name:'Vamos dar contexto.'})).toBeVisible();
 await expect(page.locator('#stage-errors')).toContainText('Dê um título');
 await expect(page.getByLabel('Prompt gerado')).toHaveCount(0);
 await subject(page);await page.getByRole('button',{name:'Concluir',exact:true}).click();await fill(page);
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.locator('#stage-errors')).toContainText('Preencha seu nome');
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByLabel('Seu nome',{exact:true}).fill('Gustavo Oliveira');
 await page.locator('[data-view="activity"]').first().click();
 await page.locator('[data-step="3"]').click({force:true});
 await expect(page.getByRole('heading',{name:'Como vamos entregar?'})).toBeVisible();
 await expect(page.locator('#stage-errors')).toContainText('formato de entrega');
 await page.getByRole('button',{name:/Entregável de T.I./}).click();await page.locator('[data-cat="technical"][data-format="SITE"]').click();
 await expect(page.getByRole('heading',{name:'Direção criativa'})).toBeVisible();
 await page.getByLabel('Já tenho um pacote de mídia').check();
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.locator('#stage-errors')).toContainText('Anexe o pacote');
 await page.getByLabel('Já tenho um pacote de mídia').uncheck();
 await page.locator('[data-cat="technical"][data-format="SITE"]').click();
 await expect(page.getByRole('heading',{name:'Direção criativa'})).toHaveCount(0);
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.locator('[data-step="3"]').click({force:true});
 await expect(page.locator('#stage-errors')).toContainText('confirme a conferência');
 await page.getByLabel('Conferi os materiais e os PTDs desta atividade').check();
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.getByLabel('Prompt gerado')).toContainText('Individual (autoria: Gustavo Oliveira)');
 await page.locator('[data-step="0"]').click();await page.getByLabel('Título da atividade').fill('');
 await page.locator('[data-step="3"]').click({force:true});await expect(page.locator('#stage-errors')).toContainText('Dê um título');
 await page.getByLabel('Título da atividade').fill('Biomas revisados');
 await page.locator('[data-step="3"]').click({force:true});await expect(page.locator('#stage-errors')).toContainText('confirme a conferência');
});

test('responsive layouts have no horizontal overflow; installed metadata is valid',async({page})=>{
 await boot(page);
 for(const width of [360,390,768,1280,1600]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 const manifest=await (await page.request.get('/ck-promptmaker/manifest.webmanifest')).json();expect(manifest.display).toBe('standalone');expect(manifest.icons.some(i=>i.purpose==='maskable')).toBeTruthy();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile-home.png',fullPage:true});await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:'test-results/desktop-home.png',fullPage:true});
});


async function setProfile(page,name='Gustavo Oliveira'){
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByLabel('Seu nome',{exact:true}).fill(name);await page.locator('[data-view="activity"]').first().click();
}
test('manual transfer merges two devices, preserves exclusive data, and does not duplicate attachments',async({page,browser})=>{
 await boot(page);await setProfile(page);await subject(page);
 await page.locator('input[data-upload="ptd"]').setInputFiles({name:'plano.txt',mimeType:'text/plain',buffer:Buffer.from('PTD vindo do computador')});
 await expect(page.getByText('plano.txt',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Concluir',exact:true}).click();await fill(page);
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar transferência',exact:true}).click();
 const downloaded=await pending;const path=await downloaded.path();
 const second=await browser.newContext({viewport:{width:390,height:844}});const phone=await second.newPage();
 await phone.goto(page.url());await expect(phone.getByRole('heading',{name:'Vamos dar contexto.'})).toBeVisible();await expect(phone.locator('#intro')).toHaveCount(0);
 await phone.getByLabel('Título da atividade').fill('Atividade exclusiva do celular');await setProfile(phone,'Nome do celular');
 await phone.getByRole('button',{name:'Meu perfil',exact:true}).click();
 for(const keepProfile of [true,false]){
  await phone.locator('#transfer-input').setInputFiles(path);
  await expect(phone.getByRole('heading',{name:'Receber dados deste arquivo'})).toBeVisible();
  if(keepProfile)await phone.locator('#transfer-profile').uncheck();
  await phone.getByRole('button',{name:'Importar dados',exact:true}).click();
  await expect(phone.locator('#dialog')).not.toBeVisible();
  await expect(phone.getByLabel('Seu nome',{exact:true})).toHaveValue(keepProfile?'Nome do celular':'Gustavo Oliveira');
 }
 const data=await phone.evaluate(async()=>{const {getAll}=await import('./src/db.js');return {activities:await getAll('activities'),files:(await getAll('files')).map(f=>({name:f.name,size:f.blob.size})),subjects:await getAll('subjects')};});
 expect(data.activities.map(a=>a.title)).toEqual(expect.arrayContaining(['Atividade exclusiva do celular','Biomas brasileiros']));
 expect(data.files).toEqual([{name:'plano.txt',size:Buffer.byteLength('PTD vindo do computador')}]);expect(data.subjects).toHaveLength(1);
 await phone.reload();await phone.getByRole('button',{name:'Meu perfil',exact:true}).click();await expect(phone.getByLabel('Seu nome',{exact:true})).toHaveValue('Gustavo Oliveira');
 await second.close();
});

test('static page exposes full PDF and DOCX text without JavaScript and embeds exact original files offline',async({page,context,browser})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await boot(page);await setProfile(page);await subject(page);await page.getByRole('button',{name:'Concluir',exact:true}).click();await fill(page);
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('button',{name:/Documento ABNT/}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.locator('input[data-upload="base"]').setInputFiles([{name:'referencia.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await readFile('tests/fixtures/reference.docx')},{name:'anotacao.html',mimeType:'text/html',buffer:Buffer.from('<script>window.injected=true</script>Material completo até o fim.')}]);
 await expect(page.getByText('referencia.docx',{exact:true})).toBeVisible();
 await page.getByLabel('Conferi os materiais e os PTDs desta atividade').check();await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();await context.setOffline(true);
 await page.locator('[data-step="3"]').click();await page.getByRole('button',{name:'Página para IA',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Página para IA',exact:true})).toBeVisible({timeout:45000});
 await expect(page.locator('.publication-files')).toContainText('PDF · 65 páginas processadas');
 await expect(page.locator('.publication-files')).toContainText('DOCX · texto extraído');
 await page.getByRole('button',{name:'Publicar e obter link',exact:true}).click();await expect(page.locator('#page-progress')).toContainText('Confirme a publicação pública');
 await page.locator('#publish-token').fill('token-local-test');await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByRole('button',{name:'Página para IA',exact:true}).click();await expect(page.locator('#publish-token')).toHaveValue('');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar página HTML',exact:true}).click();const d=await pending;const html=await readFile(await d.path(),'utf8');
 expect(html).toContain('PÁGINA 65 DE 65');expect(html).toContain('CONTEUDO DOCX FINAL 123');expect(html).toContain('&lt;script&gt;window.injected');expect(html).not.toContain('token-local-test');
 const embedded=html.match(/href="data:application\/pdf;base64,([^"]+)"/);expect(embedded).toBeTruthy();
 expect(createHash('sha256').update(Buffer.from(embedded[1],'base64')).digest('hex')).toBe('5363cf1959ed9cc12c0afa0db5d3dd8be0e7a97907db82a09dfc7b8d4fe9e413');
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const reader=await nojs.newPage();await reader.route('https://briefing.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await reader.goto('https://briefing.test/');
 await expect(reader.getByRole('heading',{name:'Biomas brasileiros',exact:true})).toBeVisible();await expect(reader.locator('#materiais')).toContainText('CONTEUDO DOCX FINAL 123');await expect(reader.locator('script')).toHaveCount(0);
 await nojs.close();expect(errors).toEqual([]);
});

test('CK click animation never blocks input and respects reduced motion',async({page})=>{
 await boot(page);await page.getByLabel('Título da atividade').click();await expect(page.locator('.ck-burst')).toHaveCount(1);
 await page.getByLabel('Título da atividade').fill('Animação continua leve');await expect(page.getByLabel('Título da atividade')).toHaveValue('Animação continua leve');
 await expect(page.locator('.ck-burst')).toHaveCount(0);await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await expect(page.locator('.ck-burst')).toHaveCount(0);
});


test('closing a subject does not erase text entered while storage is still saving',async({page})=>{
 await boot(page);await subject(page);
 await page.evaluate(()=>{
  const original=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
  Object.defineProperty(IDBTransaction.prototype,'oncomplete',{configurable:true,get:original.get,set(handler){original.set.call(this,handler?event=>setTimeout(()=>handler.call(this,event),250):handler);}});
 });
 await page.getByRole('button',{name:'Concluir',exact:true}).click();
 await page.getByLabel('Título da atividade').fill('Digitado durante salvamento');
 await expect.poll(()=>page.evaluate(async()=>{const {getAll}=await import('./src/db.js');return (await getAll('activities'))[0]?.title;})).toBe('Digitado durante salvamento');
 await expect(page.getByLabel('Título da atividade')).toHaveValue('Digitado durante salvamento');
 await page.reload();await expect(page.getByLabel('Título da atividade')).toHaveValue('Digitado durante salvamento');
});

test('AI autofill reads a photo, lets the student review and fills the activity',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let sent;
 await page.route('**/api/assist',async route=>{
  sent=route.request().postDataJSON();
  if(!route.request().headers()['x-ck-code'])return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Informe o código de acesso da IA.',code:'ACCESS_CODE'})});
  await route.fulfill({contentType:'application/json',body:JSON.stringify({title:'Biomas brasileiros e ameaças',date:'',due:'2027-10-24',subjectName:'biologia',professor:'Profa. Ana',period:'',mode:'group',groupSize:3,members:['Gustavo','Maria','João'],description:'Comparar os biomas brasileiros e suas ameaças.',objectives:'',criteria:'Pesquisa e fontes',length:'10 minutos',deliveries:[{category:'abnt',format:'PDF'}],customFormat:'',customDescription:'',website:{interaction:'',threeD:'',details:''},observations:'',baseText:'Texto do quadro transcrito.',links:'',uncertain:['due'],notes:['A foto 2 estava ilegível.'],model:'gemini-test'})});
 });
 await boot(page);await subject(page);await page.getByRole('button',{name:'Concluir',exact:true}).click();
 await page.getByLabel('Título da atividade').fill('Rascunho meu');
 await page.getByRole('button',{name:'Enviar materiais',exact:true}).click();
 await expect(page.locator('#dialog').getByRole('heading',{name:'Preencher com IA'})).toBeVisible();
 await page.locator('#ai-file-input').setInputFiles({name:'quadro.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')});
 await expect(page.locator('.ai-source')).toContainText('quadro.png');
 await page.locator('#ai-note').fill('é em grupo');
 await page.getByRole('button',{name:'Analisar com IA',exact:true}).click();
 await expect(page.locator('.ai-notes')).toContainText('código de acesso');
 await page.locator('#ai-code').fill('ck-123');
 await page.getByRole('button',{name:'Analisar com IA',exact:true}).click();
 await expect(page.getByRole('heading',{name:/A IA encontrou/})).toBeVisible();
 expect(sent.note).toBe('é em grupo');expect(sent.subjects.map(s=>s.name)).toEqual(['Biologia']);expect(sent.sources[0].mime).toBe('image/jpeg');
 await expect(page.locator('.ai-notes')).toContainText('ilegível');
 const title=page.locator('.ai-item',{hasText:'Biomas brasileiros e ameaças'}).locator('input');
 await expect(title).not.toBeChecked();await title.check();
 await page.getByRole('button',{name:'Aplicar selecionados',exact:true}).click();
 await expect(page.locator('#dialog')).not.toBeVisible();
 await expect(page.getByLabel('Título da atividade')).toHaveValue('Biomas brasileiros e ameaças');
 await expect(page.getByLabel('Data de entrega')).toHaveValue('2027-10-24');
 await expect(page.locator('#activity-subjectId option:checked')).toHaveText('Biologia');
 await expect(page.locator('#activity-member-2')).toHaveValue('João');
 await expect(page.getByLabel('Enunciado da atividade')).toHaveValue('Comparar os biomas brasileiros e suas ameaças.');
 const saved=await page.evaluate(async()=>{const {getAll}=await import('./src/db.js');return {files:(await getAll('files')).map(f=>f.name),profile:(await getAll('settings')).find(s=>s.id==='profile')};});
 expect(saved.files).toContain('quadro.png');expect(saved.profile.aiCode).toBe('ck-123');
 expect(errors).toEqual([]);
});
