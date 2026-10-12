import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const JPEG=await readFile('tests/fixtures/page.jpg');
async function open(page,path='/ck-promptmaker/'){
 await page.addInitScript(()=>{try{sessionStorage.setItem('ck-intro','1');}catch{}});
 await page.goto(path);await expect(page.getByRole('heading',{name:'Vamos dar contexto.'})).toBeVisible();
}
async function named(page,name='Gustavo Oliveira'){
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByLabel('Seu nome',{exact:true}).fill(name);await page.locator('[data-view="activity"]').first().click();
}
async function ready(page,title='Biomas brasileiros',due='2027-10-20'){
 await page.getByRole('button',{name:'Cadastrar matéria',exact:true}).click();await page.getByLabel('Nome da matéria').fill('Biologia');await page.getByLabel('Professor(a) padrão').fill('Profa. Ana');await page.getByRole('button',{name:'Concluir',exact:true}).click();
 await page.getByLabel('Título da atividade').fill(title);await page.getByLabel('Data de entrega').fill(due);await page.getByLabel('Enunciado da atividade').fill('Compare os biomas brasileiros.');
}
async function toReview(page){
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('button',{name:/Documento simples/}).click();
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByLabel(/Conferi os materiais/).check();
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByText('Seu contexto está pronto',{exact:true})).toBeVisible();
}
const db=(page,store)=>page.evaluate(async s=>{const {getAll}=await import('./src/db.js');return (await getAll(s)).map(({blob,...r})=>({...r,blobSize:blob?.size,blobType:blob?.type}));},store);

test('trash keeps deleted work for undo and restore; due strip and calendar follow deadlines',async({page})=>{
 await open(page);await named(page);await ready(page,'Primeira atividade','2027-03-10');
 await page.locator('.camera-fab').waitFor();
 await page.getByRole('button',{name:'Minhas atividades',exact:true}).click();
 await page.getByRole('button',{name:'Nova atividade',exact:true}).click();
 await page.getByLabel('Título da atividade').fill('Segunda atividade');await page.getByLabel('Data de entrega').fill('2027-01-05');
 await page.getByRole('button',{name:'Minhas atividades',exact:true}).click();
 await expect(page.locator('.draft-card h3')).toHaveText(['Segunda atividade','Primeira atividade']);
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Adicionar Primeira atividade à agenda'}).click();
 const ics=await readFile(await (await pending).path(),'utf8');expect(ics).toContain('DTSTART;VALUE=DATE:20270310');expect(ics).toContain('SUMMARY:Entrega: Primeira atividade (Biologia)');
 await page.getByRole('button',{name:'Excluir Primeira atividade'}).click();
 await expect(page.locator('#toast')).toContainText('lixeira');await expect(page.locator('.draft-card h3')).toHaveText(['Segunda atividade']);
 await page.locator('#toast').getByRole('button',{name:'Desfazer'}).click();
 await expect(page.locator('.draft-card h3')).toHaveText(['Segunda atividade','Primeira atividade']);
 await page.getByRole('button',{name:'Excluir Primeira atividade'}).click();
 await page.getByRole('button',{name:/^Lixeira \(1\)/}).click();await expect(page.locator('.trash-list')).toContainText('Primeira atividade');
 await page.getByRole('button',{name:'Restaurar',exact:true}).click();await expect(page.locator('#toast')).toContainText('Restaurado');
 await page.getByRole('button',{name:'Criar atividade',exact:true}).click();
 await expect(page.locator('.due-card')).toHaveCount(1);await expect(page.locator('.due-card')).toContainText('Primeira atividade');
 await page.locator('.due-card').click();await expect(page.getByLabel('Título da atividade')).toHaveValue('Primeira atividade');
});

test('statuses, export history, snapshot, open in an AI and AI review of the briefing',async({page})=>{
 await page.route('**/api/assist',route=>{const body=route.request().postDataJSON();expect(body.task).toBe('review');expect(body.note).toContain('# ATIVIDADE: Biomas brasileiros');return route.fulfill({contentType:'application/json',body:JSON.stringify({ready:false,issues:[{level:'alta',text:'Falta dizer a quantidade de páginas.'}],questions:['Quantas páginas o trabalho deve ter?'],model:'gemini-test'})});});
 await open(page);await named(page);await ready(page);await toReview(page);
 await page.evaluate(()=>{window.__opened=[];window.open=(url)=>{window.__opened.push(url);return null;};});
 await page.getByRole('button',{name:'ChatGPT'}).click();
 await expect(page.locator('#toast')).toContainText('ChatGPT');
 expect((await page.evaluate(()=>window.__opened))[0]).toMatch(/^https:\/\/chatgpt\.com\/(\?q=%23%20ATIVIDADE)?/);
 await expect(page.locator('.status-row .chip.selected')).toHaveText('Enviada à IA');
 await expect(page.locator('.history')).toContainText('Aberto no ChatGPT');
 await expect(page.locator('.snapshot-note')).toContainText('Contexto guardado');
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByLabel('Seu nome',{exact:true}).fill('Nome Trocado');
 await page.locator('[data-view="activity"]').first().click();await page.locator('[data-step="3"]').click();
 await expect(page.getByLabel('Prompt gerado')).toContainText('Individual (autoria: Gustavo Oliveira)');
 await page.getByRole('button',{name:'Atualizar'}).click();await expect(page.getByLabel('Prompt gerado')).toContainText('Individual (autoria: Nome Trocado)');
 await page.getByRole('button',{name:'Nota recebida',exact:true}).click();await page.getByLabel('Nota recebida').fill('9,5');
 await page.getByRole('button',{name:'Revisar com IA'}).click();
 await expect(page.locator('.review-issues')).toContainText('quantidade de páginas');
 await page.getByLabel('Quantas páginas o trabalho deve ter?').fill('Oito páginas');await page.getByRole('button',{name:'Adicionar respostas'}).click();
 await page.locator('[data-step="1"]').click();await expect(page.getByLabel('Observações para a entrega')).toHaveValue(/Quantas páginas o trabalho deve ter\?\nR: Oito páginas/);
 const saved=(await db(page,'activities')).find(a=>a.title==='Biomas brasileiros');
 expect(saved.status).toBe('graded');expect(saved.grade).toBe('9,5');expect(saved.history[0].kind).toBe('open-chatgpt');
});

test('private link is created, stored in the history and can be deleted',async({page})=>{
 const calls=[];
 await page.route('**/api/publish**',async route=>{
  const r=route.request(),url=new URL(r.url());calls.push(url.searchParams.get('action')||r.postDataJSON().action);
  if(url.searchParams.get('action')==='file')return route.fulfill({contentType:'application/json',body:JSON.stringify({url:'https://abc.public.blob.vercel-storage.com/pages/x/'+url.searchParams.get('n')})});
  const body=r.postDataJSON();expect(r.headers()['x-ck-code']).toBe('ck-code');
  if(body.action==='start')return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'e1-'+'a'.repeat(22),token:'t',expiresAt:Date.parse('2027-11-20')})});
  if(body.action==='finish'){expect(body.documents.some(d=>d.name==='manualCPS.pdf'&&d.text.includes('PÁGINA 65 DE 65'))).toBeTruthy();return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'e1-'+'a'.repeat(22),url:'https://ck.example/p/e1-aaaa',expiresAt:Date.parse('2027-11-20'),deleteToken:'del'})});}
  return route.fulfill({contentType:'application/json',body:JSON.stringify({deleted:3})});
 });
 await open(page);await named(page);
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByLabel('Código de acesso da IA').fill('ck-code');await page.locator('[data-view="activity"]').first().click();
 await ready(page);await toReview(page);
 await page.getByRole('button',{name:'Página para IA',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Página para IA',exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Criar link privado'}).click();await expect(page.locator('#link-progress')).toContainText('Confirme');
 await page.getByLabel(/quem tiver o link verá/).check();await page.getByLabel('Validade do link').selectOption('7');
 await page.getByRole('button',{name:'Criar link privado'}).click();
 await expect(page.getByRole('heading',{name:'Seu link está pronto'})).toBeVisible();await expect(page.locator('#published-url')).toHaveValue('https://ck.example/p/e1-aaaa');
 expect(calls[0]).toBe('start');expect(calls.at(-1)).toBe('finish');expect(calls.filter(c=>c==='file').length).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Concluir',exact:true}).click();
 await expect(page.locator('.history-link a')).toHaveText('ck.example/p/e1-aaaa');
 await page.getByRole('button',{name:'Apagar link'}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();
 await expect(page.locator('.history')).toContainText('Link apagado');expect(calls.at(-1)).toBe('delete');
});

test('transfer keeps the newer local edit and reports it; edits sync between tabs',async({page,context})=>{
 await open(page);await named(page);await ready(page,'Versão antiga');
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar transferência',exact:true}).click();const file=await (await pending).path();
 const other=await context.newPage();await open(other);
 await other.getByLabel('Título da atividade').fill('Editado na outra aba');
 await page.locator('[data-view="activity"]').first().click();
 await expect(page.getByLabel('Título da atividade')).toHaveValue('Editado na outra aba',{timeout:8000});
 await page.waitForTimeout(600);
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 await page.locator('#transfer-input').setInputFiles(file);await page.locator('#transfer-profile').uncheck();await page.getByRole('button',{name:'Importar dados',exact:true}).click();
 await expect(page.locator('#toast')).toContainText('mantidos por serem mais novos aqui');
 const titles=(await db(page,'activities')).map(a=>a.title);expect(titles).toContain('Editado na outra aba');expect(titles).not.toContain('Versão antiga');
 await other.close();
});

test('institution template, separate profiles and economy mode',async({page})=>{
 await open(page);await named(page,'Gustavo');await page.getByLabel('Título da atividade').fill('Do perfil principal');
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 await page.getByLabel('Modelo da instituição').selectOption('faculdade');await expect(page.getByLabel('Nível de estudo')).toHaveValue('Graduação');
 await page.getByLabel('Efeitos visuais').selectOption('lite');await expect(page.locator('body')).toHaveClass(/lite/);
 await page.locator('[data-view="activity"]').first().click();
 await expect(page.locator('label[for="activity-subjectId"]')).toContainText('Disciplina');
 await expect(page.locator('#activity-period option')).toHaveText(['1º semestre','2º semestre']);
 await expect(page.getByRole('button',{name:'Disciplinas & Planos de ensino'})).toBeVisible();
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 await page.getByRole('button',{name:'Novo perfil'}).click();await page.getByLabel('Nome de quem vai usar').fill('Irmã');await page.getByRole('button',{name:'Salvar',exact:true}).click();
 await expect(page.locator('#toast')).toContainText('Perfil Irmã em uso');await expect(page.getByLabel('Título da atividade')).toHaveValue('');
 await expect(page.locator('label[for="activity-subjectId"]')).toContainText('Matéria');await expect(page.locator('body')).not.toHaveClass(/lite/);
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.locator('[data-use-workspace="default"]').click();
 await expect(page.getByLabel('Título da atividade')).toHaveValue('Do perfil principal');await expect(page.locator('.breadcrumb')).toContainText('Principal');
});

test('files shared from another app open straight in the AI dialog',async({page})=>{
 await open(page);
 await page.evaluate(async jpeg=>{const box=await caches.open('ck-share');await box.put('./shared/0',new Response(new Uint8Array(jpeg),{headers:{'content-type':'image/jpeg','x-name':encodeURIComponent('quadro do whatsapp.jpg')}}));await box.put('./shared/meta',new Response(JSON.stringify({text:'Trabalho de biologia'})));},[...JPEG]);
 await page.goto('/ck-promptmaker/?share=1');
 await expect(page.locator('#dialog').getByRole('heading',{name:'Preencher com IA'})).toBeVisible();
 await expect(page.locator('.ai-source')).toContainText('quadro do whatsapp.jpg');await expect(page.locator('#ai-note')).toHaveValue('Trabalho de biologia');
 expect(await page.evaluate(async()=>(await (await caches.open('ck-share')).keys()).length)).toBe(0);
});

test('AI writes the voice guide and organizes PTDs by period',async({page})=>{
 await page.route('**/api/assist',route=>{const body=route.request().postDataJSON();
  if(body.task==='voice')return route.fulfill({contentType:'application/json',body:JSON.stringify({guide:'- Frases curtas.\n- Usa exemplos do dia a dia.',traits:['direto','informal'],notes:[]})});
  expect(body.task).toBe('ptd');expect(body.periods).toEqual(['1º bimestre','2º bimestre','3º bimestre','4º bimestre']);
  return route.fulfill({contentType:'application/json',body:JSON.stringify({periods:[{period:'1',content:'Células e organelas'},{period:'2',content:'Genética básica'}],notes:[]})});});
 await open(page);
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 await page.locator('#voice-input').setInputFiles({name:'redacao.txt',mimeType:'text/plain',buffer:Buffer.from('Eu acho que a gente aprende melhor fazendo.')});
 await expect(page.locator('.voice-traits')).toContainText('informal');await page.getByRole('button',{name:'Usar este guia'}).click();
 await expect(page.getByLabel('Guia da sua voz')).toHaveValue(/Frases curtas/);
 await page.locator('[data-view="activity"]').first().click();
 await page.getByRole('button',{name:'Cadastrar matéria',exact:true}).click();await page.getByLabel('Nome da matéria').fill('Biologia');
 await page.locator('input[data-upload="ptd"]').setInputFiles({name:'ptd.txt',mimeType:'text/plain',buffer:Buffer.from('1º bimestre: células. 2º bimestre: genética.')});
 await expect(page.getByText('ptd.txt',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ler com IA'}).click();await expect(page.locator('.ai-review')).toContainText('Genética básica');
 await page.getByRole('button',{name:'Salvar nas notas'}).click();
 await expect(page.getByLabel('Conteúdo e competências do período')).toHaveValue('Células e organelas');
 await page.getByRole('button',{name:'2º bim.',exact:true}).click();await expect(page.getByLabel('Conteúdo e competências do período')).toHaveValue('Genética básica');
});

test.describe('live scanner',()=>{
 test.use({permissions:['camera']});
 test('captures several pages and saves them as one PDF',async({page})=>{
  await open(page);
  await page.locator('.camera-fab').click();
  const scanner=page.locator('dialog.scanner');await expect(scanner).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.querySelector('dialog.scanner video')?.videoWidth||0),{timeout:10000}).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Fotografar página'}).click();await expect(scanner.locator('.scan-strip figure')).toHaveCount(1);
  await page.getByRole('button',{name:'Fotografar página'}).click();await expect(scanner.locator('.scan-strip figure')).toHaveCount(2);
  await page.getByRole('button',{name:'Girar página 2'}).click();
  await scanner.getByRole('button',{name:/Concluir/}).click();await page.getByRole('button',{name:'Só guardar nos materiais'}).click();
  await expect(page.locator('#toast')).toContainText('2 páginas salvas em um PDF');
  const saved=(await db(page,'files')).find(f=>f.name.endsWith('.pdf'));expect(saved.blobType).toBe('application/pdf');expect(saved.blobSize).toBeGreaterThan(1000);
 });
});

test('device check reports capabilities and the keyboard hides the bottom bar',async({page})=>{
 await open(page);await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 await page.getByRole('button',{name:'Testar este aparelho'}).click();
 await expect(page.locator('.diag-list li')).toHaveCount(10,{timeout:15000});await expect(page.locator('.diag-list')).toContainText('Fluidez das animações');
 await page.evaluate(()=>{document.body.classList.add('keyboard-open');});
 await expect(page.locator('.camera-fab')).toHaveCSS('opacity','0');
});

test('activation link saves the AI code on this device',async({page})=>{
 await open(page);
 await page.goto('/ck-promptmaker/?codigo=ck-teste-123');
 await expect(page.locator('#toast')).toContainText('Código da IA salvo');
 expect(new URL(page.url()).search).toBe('');
 await page.getByRole('button',{name:'Meu perfil',exact:true}).click();
 await expect(page.getByLabel('Código de acesso da IA')).toHaveValue('ck-teste-123');
 await expect(page.getByRole('button',{name:'Copiar link de ativação'})).toBeVisible();
});
