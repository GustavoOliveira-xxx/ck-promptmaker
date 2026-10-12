import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newActivity,DEFAULT_PROFILE,buildPrompt,icsFor,statusOf,isClosed,snapshotOf,templateOf,validate,daysUntil,pathForFile,TEMPLATES} from '../src/core.js';
import {validateBackup} from '../src/backup.js';
import {pickNewest} from '../src/db.js';
import {jpegsToPdf} from '../src/pdf.js';
import {handle as publish,newId,expiryOf,deleteToken,MAX_UPLOAD} from '../api/publish.js';
import {handle as page} from '../api/page.js';
import {handle as purge} from '../api/purge.js';
import {readPayload,normalize,buildRequest} from '../api/assist.js';
import {publishToVercel} from '../src/vercel-publish.js';

const valid=()=>({...newActivity(),title:'Biomas',date:'2026-10-09',due:'2026-10-20',subjectId:'bio',professor:'Ana',description:'Comparar biomas.',deliveries:[{category:'simple',format:'PDF'}]});

test('calendar file has an all-day event with a reminder one day before',()=>{
 const ics=icsFor([{...valid(),id:'a1',title:'Biomas; parte 1'}],[{id:'bio',name:'Biologia'}],new Date('2026-10-12T10:00:00Z'));
 assert.match(ics,/BEGIN:VCALENDAR\r\n/);assert.match(ics,/DTSTART;VALUE=DATE:20261020/);assert.match(ics,/DTEND;VALUE=DATE:20261021/);
 assert.match(ics,/SUMMARY:Entrega: Biomas\\; parte 1 \(Biologia\)/);assert.match(ics,/TRIGGER:-P1D/);assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
 assert.ok(ics.split('\r\n').every(line=>line.length<=75));
 assert.equal(icsFor([{...valid(),due:''}]).includes('VEVENT'),false);
});

test('statuses keep old backups compatible and know what is finished',()=>{
 assert.equal(statusOf({status:'done'}),'delivered');assert.equal(statusOf({status:'weird'}),'draft');
 assert.equal(isClosed({status:'graded'}),true);assert.equal(isClosed({status:'sent'}),false);
 assert.equal(daysUntil('2026-10-20','2026-10-12'),8);assert.equal(daysUntil('2026-10-10','2026-10-12'),-2);
});

test('exported activities keep the profile and subject they were sent with',()=>{
 const profile={...DEFAULT_PROFILE,name:'Gustavo Oliveira',aiCode:'secret'};
 const subject={name:'Biologia',professor:'Ana',notes:{1:'Células'}};
 const a={...valid(),snapshot:snapshotOf(subject,profile)};
 assert.equal(a.snapshot.profile.aiCode,undefined);
 const later=buildPrompt(a,{name:'Química',notes:{1:'Ácidos'}},{...profile,name:'Outro Nome'});
 assert.match(later,/Individual \(autoria: Gustavo Oliveira\)/);assert.match(later,/Matéria: Biologia/);assert.match(later,/Células/);assert.doesNotMatch(later,/Ácidos|Outro Nome/);
});

test('institution templates rename fields, relax the teacher and keep the default prompt intact',()=>{
 const work={...DEFAULT_PROFILE,name:'Ana',institution:'trabalho'};
 const t=templateOf(work);
 assert.equal(t.subject,'Projeto');assert.equal(t.teacherRequired,false);
 assert.deepEqual(validate({...valid(),professor:''},t),[]);
 assert.ok(validate({...valid(),professor:''},templateOf(DEFAULT_PROFILE)).some(e=>/professor/.test(e)));
 const text=buildPrompt({...valid(),professor:''},{name:'Site institucional'},work);
 assert.match(text,/Projeto: Site institucional/);assert.match(text,/Responsável: não informado/);assert.match(text,/Etapa atual/);assert.match(text,/Tipo: Trabalho/);
 assert.equal(pathForFile({ownerType:'subject',period:'2',name:'plano.pdf'},0,TEMPLATES.faculdade),'ptds/semestre-2/01-plano.pdf');
 assert.match(buildPrompt(valid(),{name:'Biologia'},DEFAULT_PROFILE),/Bimestre atual: 1/);
});

test('voice guide from past work goes into the prompt',()=>{
 const text=buildPrompt(valid(),{name:'Biologia'},{...DEFAULT_PROFILE,name:'Gu',voiceGuide:'Frases curtas, usa "a gente".'});
 assert.match(text,/Guia da voz do estudante/);assert.match(text,/a gente/);
});

test('backups from older versions and with new fields both validate',()=>{
 const old=newActivity();delete old.grade;delete old.history;old.status='done';
 const data={app:'ck-promptmaker',version:1,activities:[old,{...newActivity(),status:'graded',grade:'9,5',deletedAt:Date.now(),history:[{at:Date.now(),kind:'zip'}]}],subjects:[{id:'s1',name:'Bio',professor:'',notes:{},deletedAt:Date.now(),updatedAt:Date.now()}],files:[],settings:[{...DEFAULT_PROFILE,id:'profile',institution:'faculdade'}]};
 assert.equal(validateBackup(data),data);assert.equal(old.grade,'');assert.deepEqual(old.history,[]);
 const bad=structuredClone(data);bad.activities[1].status='lost';assert.throws(()=>validateBackup(bad));
 const badTemplate=structuredClone(data);badTemplate.settings[0].institution='nasa';assert.throws(()=>validateBackup(badTemplate));
});

test('transfers keep whichever side was edited last, including deletions',()=>{
 const local=[{id:'a',updatedAt:200},{id:'b',updatedAt:100},{id:'c',updatedAt:50}];
 const incoming=[{id:'a',updatedAt:150},{id:'b',updatedAt:300,deletedAt:300},{id:'c',updatedAt:50},{id:'d',updatedAt:10}];
 const summary={updated:0,kept:0,added:0};
 assert.deepEqual(pickNewest(local,incoming,summary).map(x=>x.id),['b','c','d']);
 assert.deepEqual(summary,{updated:1,kept:1,added:1});
});

test('scanned pages become a valid multi-page PDF',async()=>{
 const bytes=new Uint8Array(await readFile('tests/fixtures/page.jpg'));
 const pdf=jpegsToPdf([{bytes,width:120,height:160},{bytes,width:120,height:160}]);
 const data=new Uint8Array(await pdf.arrayBuffer());
 const text=new TextDecoder('latin1').decode(data);
 assert.ok(text.startsWith('%PDF-1.4'));assert.match(text,/\/Count 2/);assert.match(text,/\/Filter \/DCTDecode/);
 const xref=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(text.slice(xref,xref+4),'xref');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const doc=await pdfjs.getDocument({data,isEvalSupported:false}).promise;
 assert.equal(doc.numPages,2);const p=await doc.getPage(1);assert.equal(Math.round(p.view[3]),Math.round(595*160/120));
 await doc.destroy();
 assert.throws(()=>jpegsToPdf([]));
});

function fakeBlob(){
 const store=new Map();
 return {store,
  put:async(path,body,opts)=>{const url='https://abc123.public.blob.vercel-storage.com/'+path;store.set(path,{url,body:typeof body==='string'?body:Buffer.from(body).toString(),type:opts.contentType});return {url,pathname:path};},
  head:async path=>{if(!store.has(path))throw new Error('not found');return {url:store.get(path).url};},
  list:async({prefix})=>({blobs:[...store].filter(([k])=>k.startsWith(prefix)).map(([pathname,v])=>({pathname,url:v.url})),hasMore:false}),
  del:async urls=>{for(const [k,v] of store)if(urls.includes(v.url))store.delete(k);}
 };
}
const req=(body,{query='',headers={}}={})=>new Request('https://ck.test/api/publish'+query,{method:'POST',headers:{'content-type':'application/json',origin:'https://ck.test',host:'ck.test','x-ck-code':'code',...headers},body:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)});
const env={BLOB_READ_WRITE_TOKEN:'vercel_blob_rw_abc123_secret',CK_ACCESS_CODE:'code'};

test('private links: ids carry their expiry and only signed uploads are accepted',async()=>{
 const now=Date.parse('2026-10-12T12:00:00Z');
 const id=newId(7,now);assert.match(id,/^e[0-9a-z]+-[A-Za-z0-9_-]{22}$/);assert.ok(expiryOf(id)>=now+7*86400000);assert.equal(expiryOf(newId(0)),null);
 const blob=fakeBlob();
 assert.equal((await publish(req({action:'start',days:7},{headers:{'x-ck-code':'wrong'}}),{env,blob})).status,401);
 const start=await (await publish(req({action:'start',days:7}),{env,blob})).json();
 const forged=await publish(req('abc',{query:'?action=file&id='+start.id+'&n=1&name=a.txt',headers:{'x-ck-token':'1.forged','content-type':'text/plain'}}),{env,blob});
 assert.equal(forged.status,403);
 const file=await (await publish(req(new TextEncoder().encode('conteúdo'),{query:'?action=file&id='+start.id+'&n=1&name=../a.txt',headers:{'x-ck-token':start.token,'content-type':'text/plain'}}),{env,blob})).json();
 assert.match(file.url,/pages\/.+\/arquivos\/001--a\.txt$/);assert.doesNotMatch(file.url,/\.\.\//);
 const done=await (await publish(req({action:'finish',id:start.id,token:start.token,title:'<b>T</b>',prompt:'Prompt & mais',documents:[{name:'a.txt',status:'Texto',text:'conteúdo',url:file.url},{name:'grande.pdf',status:'PDF',text:'texto grande',url:'https://evil.example/x'}]}),{env,blob})).json();
 assert.equal(done.url,'https://ck.test/p/'+start.id);assert.equal(done.deleteToken,deleteToken(env.BLOB_READ_WRITE_TOKEN,start.id));
 const html=blob.store.get('pages/'+start.id+'/index.html').body;
 assert.match(html,/&lt;b&gt;T&lt;\/b&gt;/);assert.match(html,/Prompt &amp; mais/);assert.match(html,/grande demais para este link/);assert.doesNotMatch(html,/evil\.example/);
 const served=await page(new Request('https://ck.test/api/page?id='+start.id),{env,blob,fetch:async()=>new Response(html),now});
 assert.equal(served.status,200);assert.match(served.headers.get('content-security-policy'),/default-src 'none'/);assert.equal(served.headers.get('x-robots-tag'),'noindex');
 assert.equal((await page(new Request('https://ck.test/api/page?id='+start.id),{env,blob,fetch:async()=>new Response(html),now:now+8*86400000})).status,410);
 assert.equal((await page(new Request('https://ck.test/api/page?id=../../x'),{env,blob})).status,404);
 assert.equal((await publish(req({action:'delete',id:start.id,deleteToken:'nope'}),{env,blob})).status,403);
 const removed=await (await publish(req({action:'delete',id:start.id,deleteToken:done.deleteToken}),{env,blob})).json();
 assert.equal(removed.deleted,2);assert.equal(blob.store.size,0);
});

test('daily cleanup removes only expired links and needs the cron secret',async()=>{
 const blob=fakeBlob(),now=Date.parse('2026-10-12T12:00:00Z');
 const old=newId(1,now-5*86400000),fresh=newId(30,now),forever=newId(0,now);
 for(const id of [old,fresh,forever])await blob.put('pages/'+id+'/index.html','x',{contentType:'text/html'});
 assert.equal((await purge(new Request('https://ck.test/api/purge'),{env:{CRON_SECRET:'s'},blob,now})).status,401);
 const res=await (await purge(new Request('https://ck.test/api/purge',{headers:{authorization:'Bearer s'}}),{env:{CRON_SECRET:'s'},blob,now})).json();
 assert.equal(res.removed,1);assert.deepEqual([...blob.store.keys()].map(k=>k.split('/')[1]).sort(),[fresh,forever].sort());
});

test('link publishing uploads small originals and leaves big ones to the ZIP',async()=>{
 const calls=[];
 const request=async(url,init)=>{calls.push({url,init});const q=new URL(url).searchParams;const body=init.body;
  if(q.get('action')==='file')return new Response(JSON.stringify({url:'https://abc.public.blob.vercel-storage.com/pages/x/'+q.get('name')}));
  const data=JSON.parse(body);
  if(data.action==='start')return new Response(JSON.stringify({id:'n-'+'a'.repeat(22),token:'t'}));
  return new Response(JSON.stringify({url:'https://ck.test/p/n-aaa',deleteToken:'d',expiresAt:null,id:'n-aaa',received:data.documents}));};
 const bundle={title:'T',prompt:'P',documents:[{name:'small.txt',status:'Texto',text:'x',blob:new Blob(['x'])},{name:'big.pdf',status:'PDF',text:'y',blob:new Blob([new Uint8Array(MAX_UPLOAD+1)])}]};
 const result=await publishToVercel({bundle,days:30,code:'c'},()=>{},{request,loc:new URL('https://ck.test/')});
 assert.deepEqual(result.skipped,['big.pdf']);
 assert.equal(calls.filter(c=>c.url.includes('action=file')).length,1);
 assert.ok(calls.every(c=>c.init.headers['X-CK-Code']==='c'));
 assert.equal(result.received[1].url,'');
});

test('assist tasks: voice, PTD and review payloads are shaped and cleaned',()=>{
 const p=readPayload({task:'review',note:'x'.repeat(50000)});assert.equal(p.task,'review');assert.equal(p.note.length,50000);
 assert.equal(readPayload({task:'unknown',note:'a'}).task,'fill');
 const ptd=readPayload({task:'ptd',periods:['1º bimestre','2º bimestre'],sources:[{name:'ptd.docx',text:'Conteúdo'}]});
 assert.match(buildRequest(ptd).contents[0].parts[0].text,/1º bimestre, 2º bimestre/);
 assert.equal(buildRequest(ptd).generationConfig.responseSchema.required[0],'periods');
 assert.deepEqual(normalize({periods:[{period:'1',content:'A'},{period:'1',content:'B'},{period:'9',content:'C'},{period:'anual',content:''}],notes:[]},'ptd').periods,[{period:'1',content:'A'}]);
 const voice=normalize({guide:'g'.repeat(5000),traits:['curto','direto',3],notes:['ok']},'voice');assert.equal(voice.guide.length,4000);assert.deepEqual(voice.traits,['curto','direto']);
 const review=normalize({ready:'yes',issues:[{level:'alta',text:'Falta critério'},{level:'x',text:'?'}],questions:['Q1','Q2','Q3','Q4']},'review');
 assert.equal(review.ready,false);assert.equal(review.issues.length,1);assert.equal(review.questions.length,3);
});
