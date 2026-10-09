import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function boot(page){await page.goto('/ck-promptmaker/');await expect(page.getByRole('heading',{name:'Vamos dar contexto.'})).toBeVisible();await expect(page.locator('#intro')).toHaveCount(0);}
async function subject(page){await page.getByRole('button',{name:'Cadastrar matéria',exact:true}).click();await page.getByLabel('Nome da matéria').fill('Biologia');await page.getByLabel('Professor(a) padrão').fill('Profa. Ana');}
async function fill(page){await page.getByLabel('Título da atividade').fill('Biomas brasileiros');await page.getByLabel('Data de entrega').fill('2027-10-20');await page.locator('#activity-professor').fill('Profa. Ana');await page.getByLabel('Enunciado da atividade').fill('Compare os biomas brasileiros com exemplos, ameaças e medidas de preservação.');}
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
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByText('Seu contexto está pronto',{exact:true})).toBeVisible();
 const preview=page.getByLabel('Prompt gerado');await expect(preview).toContainText('Grupo de 3 integrantes: Gustavo; Maria; João');await expect(preview).toContainText('Ecologia e evolução');await expect(preview).toContainText('Centro Paula Souza');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar pacote ZIP',exact:true}).click();const download=await downloadPromise;const zip=readZip(await readFile(await download.path()));expect([...zip.keys()].filter(k=>k.startsWith('ptds/'))).toHaveLength(4);expect([...zip.keys()].some(k=>k.includes('manualCPS.pdf'))).toBeTruthy();expect([...zip.keys()].some(k=>k.includes('foto-enunciado'))).toBeTruthy();expect([...zip.keys()].some(k=>k.includes('logo-CK'))).toBeTruthy();expect(zip.get('PROMPT.md').toString()).toContain('Mata Atlântica');const manual=[...zip].find(([name])=>name.endsWith('manualCPS.pdf'));expect(createHash('sha256').update(manual[1]).digest('hex')).toBe('5363cf1959ed9cc12c0afa0db5d3dd8be0e7a97907db82a09dfc7b8d4fe9e413');expect([...zip].find(([name])=>name.endsWith('manualCPS-texto-completo.txt'))[1].toString()).toContain('PAGINA 65 DE 65');
 const ptd=[...zip].find(([name])=>name.includes('ptd-bimestre-3.txt'));expect(ptd[1].toString()).toBe('Conteúdo do bimestre 3');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await expect(page.getByLabel('Título da atividade')).toHaveValue('Biomas brasileiros');await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();
 await context.setOffline(true);await page.reload();await expect(page.getByLabel('Título da atividade')).toHaveValue('Biomas brasileiros');await page.getByRole('button',{name:/Materiais$/,exact:false}).first().click();await expect(page.getByText('foto-enunciado.png',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('backup restores profile, activity and original binary attachments atomically',async({page})=>{
 await boot(page);await subject(page);await page.getByRole('button',{name:'Concluir',exact:true}).click();await fill(page);
 await page.locator('#camera-input').setInputFiles({name:'backup-foto.png',mimeType:'image/png',buffer:Buffer.from([0,1,255,20])});await expect(page.getByText('backup-foto.png',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByLabel('Seu nome',{exact:true}).fill('Gustavo Oliveira');await page.getByLabel('Uma amostra da sua escrita').fill('Eu gosto de explicar com exemplos concretos.');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar backup',exact:true}).click();const backup=await pending;const data=JSON.parse(await readFile(await backup.path(),'utf8'));expect(data.app).toBe('ck-promptmaker');expect(data.files).toHaveLength(1);expect(Buffer.from(data.files[0].data.split(',')[1],'base64')).toEqual(Buffer.from([0,1,255,20]));expect(data.activities.some(a=>a.title==='Biomas brasileiros')).toBeTruthy();
 await page.getByLabel('Seu nome',{exact:true}).fill('Mudança temporária');await page.locator('#backup-input').setInputFiles(await backup.path());await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByLabel('Seu nome',{exact:true})).toHaveValue('Gustavo Oliveira');
 await page.locator('#backup-input').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"app":"ck-promptmaker","version":999}')});await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.locator('#toast')).toContainText('backup CK compatível');await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.getByLabel('Seu nome',{exact:true})).toHaveValue('Gustavo Oliveira');
});
test('validation prevents incomplete exports and website options disappear when deselected',async({page})=>{
 await boot(page);await page.getByRole('button',{name:/Seu prompt/}).click();await page.getByRole('button',{name:'Baixar pacote ZIP',exact:true}).click();await expect(page.locator('.validation-list')).toContainText('Dê um título');
 await page.getByRole('button',{name:/Entregas/}).click();await page.getByRole('button',{name:/Entregável de T.I./}).click();await page.locator('[data-cat="technical"][data-format="SITE"]').click();await expect(page.getByRole('heading',{name:'Direção criativa'})).toBeVisible();await page.locator('[data-cat="technical"][data-format="SITE"]').click();await expect(page.getByRole('heading',{name:'Direção criativa'})).toHaveCount(0);
});
test('responsive layouts have no horizontal overflow; installed metadata is valid',async({page})=>{
 await boot(page);
 for(const width of [360,390,768,1280,1600]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 const manifest=await (await page.request.get('/ck-promptmaker/manifest.webmanifest')).json();expect(manifest.display).toBe('standalone');expect(manifest.icons.some(i=>i.purpose==='maskable')).toBeTruthy();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile-home.png',fullPage:true});await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:'test-results/desktop-home.png',fullPage:true});
});

