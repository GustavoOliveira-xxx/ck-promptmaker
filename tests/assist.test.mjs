import test from 'node:test';
import assert from 'node:assert/strict';
import {handle,readPayload,normalize,buildRequest} from '../api/assist.js';
import {originAllowed} from '../api/_shared.js';
import {buildSuggestions,applySuggestions,matchSubject} from '../src/assist.js';
import {apiUrl,REMOTE_ORIGIN} from '../src/api.js';
import {newActivity} from '../src/core.js';

const post=(body,headers={})=>new Request('https://ck.test/api/assist',{method:'POST',headers:{'content-type':'application/json',origin:'https://ck.test',host:'ck.test',...headers},body:JSON.stringify(body)});
const gemini=(payload,status=200)=>new Response(JSON.stringify(status===200?{modelVersion:'gemini-test',candidates:[{content:{parts:[{text:JSON.stringify(payload)}]}}]}:{error:{message:'busy'}}),{status});

test('server keeps the key private and falls back to the next model when one is overloaded',async()=>{
 const calls=[];
 const fetch=async(url,init)=>{calls.push({url,key:init.headers['x-goog-api-key']});return calls.length===1?gemini(null,503):gemini({title:'Biomas',description:'Comparar biomas.',deliveries:[{category:'abnt',format:'PDF'},{category:'abnt',format:'PPTX'}],notes:[]});};
 const res=await handle(post({note:'Trabalho de biologia',sources:[]}),{env:{GEMINI_API_KEY:'secret',GEMINI_MODELS:'a,b'},fetch});
 const data=await res.json();
 assert.equal(res.status,200);
 assert.deepEqual(calls.map(c=>c.url.split('/').pop()),['a:generateContent','b:generateContent']);
 assert.ok(calls.every(c=>c.key==='secret'));
 assert.equal(JSON.stringify(data).includes('secret'),false);
 assert.deepEqual(data.deliveries,[{category:'abnt',format:'PDF'}],'invalid category/format pairs are dropped');
});

test('server rejects foreign origins, missing configuration, access codes and oversized input',async()=>{
 assert.equal((await handle(post({note:'x'},{origin:'https://evil.example'}),{env:{GEMINI_API_KEY:'k'}})).status,403);
 assert.equal((await handle(post({note:'x'}),{env:{}})).status,503);
 const locked=await handle(post({note:'x'}),{env:{GEMINI_API_KEY:'k',CK_ACCESS_CODE:'abc'}});
 assert.equal(locked.status,401);assert.equal((await locked.json()).code,'ACCESS_CODE');
 assert.throws(()=>readPayload({sources:[{name:'a.exe',mime:'application/x-msdownload',data:'AAAA'}]}),/Formato não suportado/);
 assert.throws(()=>readPayload({sources:Array.from({length:13},()=>({name:'t',text:'x'}))}),/no máximo/);
 assert.throws(()=>readPayload({}),/pelo menos um material/);
 assert.equal(originAllowed('https://gustavooliveira-xxx.github.io','ck.test',{}),true);
 assert.equal(originAllowed('https://other.github.io','ck.test',{}),false);
});

test('request tells the model today, registered subjects and wraps each material',()=>{
 const p=readPayload({today:'2026-10-11',note:'pra sexta',subjects:[{name:'Biologia'}],sources:[{name:'quadro.jpg',mime:'image/jpeg',data:'QUJD'},{name:'ptd.docx',text:'Conteúdo'}]});
 const body=buildRequest(p);
 const text=body.contents[0].parts.map(x=>x.text||'').join('\n');
 assert.match(text,/Hoje: 2026-10-11/);assert.match(text,/Biologia/);assert.match(text,/pra sexta/);assert.match(text,/ptd\.docx \(texto extraído\)\nConteúdo/);
 assert.equal(body.contents[0].parts.find(x=>x.inlineData).inlineData.mimeType,'image/jpeg');
 assert.equal(body.generationConfig.responseMimeType,'application/json');
});

test('normalize discards malformed values instead of trusting the model',()=>{
 const r=normalize({title:'  T  ',due:'24/10/2026',date:'2026-02-30x',mode:'trio',members:['Ana','',42,'Leo'],period:'7',website:{interaction:'extrema'},uncertain:['due','hack'],notes:['ok',{}]});
 assert.equal(r.title,'T');assert.equal(r.due,'');assert.equal(r.date,'');assert.equal(r.mode,'');assert.equal(r.period,'');
 assert.deepEqual(r.members,['Ana','Leo']);assert.equal(r.groupSize,2);assert.equal(r.website.interaction,'');
 assert.deepEqual(r.uncertain,['due']);assert.deepEqual(r.notes,['ok']);
});

const result=extra=>normalize({title:'Biomas brasileiros',due:'2026-10-24',subjectName:'biologia',professor:'Ana Lúcia',mode:'group',members:['Gustavo','Maria','João'],description:'Comparar os biomas.',deliveries:[{category:'abnt',format:'PDF'},{category:'presentation',format:'SITE'}],website:{interaction:'alta'},baseText:'Transcrição do quadro',uncertain:['deliveries'],notes:[],...extra});

test('suggestions never silently overwrite what the student already typed',()=>{
 const a={...newActivity(),title:'Meu título',description:'',baseText:'Minhas notas'};
 const subjects=[{id:'s1',name:'Biologia',professor:'Ana'}];
 const items=buildSuggestions(result(),a,subjects);
 const by=k=>items.find(i=>i.key===k);
 assert.equal(by('title').checked,false);assert.equal(by('title').current,'Meu título');
 assert.equal(by('description').checked,true);
 assert.deepEqual(by('subject').value,{id:'s1'});
 assert.equal(by('deliveries').uncertain,true);
 assert.equal(by('baseText').append,true);
 assert.ok(by('website'),'site direction is offered when a site delivery is suggested');
});

test('applying suggestions fills the form, merges text and can create a new subject',()=>{
 const a={...newActivity(),baseText:'Minhas notas',deliveries:[{category:'abnt',format:'PDF'}]};
 const items=buildSuggestions(result({subjectName:'Química'}),a,[]);
 const created=applySuggestions(a,items.filter(i=>i.checked),[],name=>({id:'new-subject',name,professor:'',notes:{}}));
 assert.equal(created.name,'Química');assert.equal(created.professor,'Ana Lúcia');assert.equal(a.subjectId,'new-subject');
 assert.equal(a.title,'Biomas brasileiros');assert.equal(a.due,'2026-10-24');assert.equal(a.professor,'Ana Lúcia');
 assert.equal(a.mode,'group');assert.equal(a.groupSize,3);assert.deepEqual(a.members,['Gustavo','Maria','João']);
 assert.deepEqual(a.deliveries,[{category:'abnt',format:'PDF'},{category:'presentation',format:'SITE'}]);
 assert.equal(a.baseText,'Minhas notas\n\nTranscrição do quadro');assert.equal(a.website.interaction,'alta');
});

test('subject matching ignores case and accents; GitHub Pages copies call the Vercel API',()=>{
 const subjects=[{id:'1',name:'Língua Portuguesa'},{id:'2',name:'Matemática'}];
 assert.equal(matchSubject('lingua portuguesa',subjects).id,'1');
 assert.equal(matchSubject('MATEMATICA',subjects).id,'2');
 assert.equal(matchSubject('Física',subjects),null);
 assert.equal(apiUrl('assist',new URL('https://gustavooliveira-xxx.github.io/ck-promptmaker/')),REMOTE_ORIGIN+'/api/assist');
 assert.equal(apiUrl('publish',new URL('https://ck-promptmaker.vercel.app/')),'https://ck-promptmaker.vercel.app/api/publish');
});
