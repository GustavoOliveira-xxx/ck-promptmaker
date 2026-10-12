import test from 'node:test';
import assert from 'node:assert/strict';
import {newActivity,DEFAULT_PROFILE,buildPrompt} from '../src/core.js';
import {stageErrors,firstIncompleteStage} from '../src/stages.js';
import {pageHTML,preparePage,publicPath,publicationEntries} from '../src/page-export.js';
import {publishPage} from '../src/github-publish.js';
const profile={...DEFAULT_PROFILE,name:'Gustavo Oliveira'};
const valid=()=>({...newActivity(),title:'Biologia',date:'2026-10-09',due:'2026-11-09',subjectId:'bio',professor:'Ana',description:'Compare os biomas.',deliveries:[{category:'simple',format:'PDF'}],materialsReviewed:true});
test('forward navigation finds the earliest incomplete stage including profile and review',()=>{
 const a=valid();assert.equal(firstIncompleteStage(a,profile,[]),null);
 assert.equal(firstIncompleteStage(a,DEFAULT_PROFILE,[]).stage,0);
 assert.equal(firstIncompleteStage({...a,deliveries:[]},profile,[]).stage,1);
 assert.equal(firstIncompleteStage({...a,materialsReviewed:false},profile,[]).stage,2);
 assert.equal(firstIncompleteStage({...a,title:'',deliveries:[]},profile,[]).stage,0);
 assert.equal(firstIncompleteStage({...a,deliveries:[]},profile,[],1),null);
});
test('website media and custom identity requirements do not leak into non-website deliveries',()=>{
 const a=valid();a.website={...a.website,hasMedia:true,identity:'custom'};
 assert.deepEqual(stageErrors(a,profile,[],1),[]);
 a.deliveries=[{category:'presentation',format:'SITE'}];
 assert.equal(stageErrors(a,profile,[],1).length,2);a.website.details='Paleta verde e branca';
 assert.equal(stageErrors(a,profile,[{ownerType:'activity',ownerId:'other',kind:'media'}],1).length,1);
 assert.equal(stageErrors(a,profile,[{ownerType:'activity',ownerId:a.id,kind:'media'}],1).length,0);
});
test('individual authorship uses profile name while group credits use named members',()=>{
 const a=valid();const prompt=buildPrompt(a,{name:'Biologia'},profile);
 assert.match(prompt,/Individual \(autoria: Gustavo Oliveira\)/);
 assert.match(prompt,/capa|créditos/);
 a.mode='group';a.groupSize=2;a.members=['Maria','João'];
 const group=buildPrompt(a,{name:'Biologia'},profile);
 assert.match(group,/Grupo de 2 integrantes: Maria; João/);assert.doesNotMatch(group,/Individual \(autoria/);
 assert.deepEqual(stageErrors(a,DEFAULT_PROFILE,[],0),[]);
});
test('public HTML contains complete escaped text and original download references without scripts',async()=>{
 const raw='<script>alert("x")</script>\nTexto final do arquivo.';
 const bundle=await preparePage({title:'<img onerror=x>',prompt:'Enunciado & critérios',files:[{name:'teste.html',blob:new Blob([raw])},{name:'foto.png',blob:new Blob(['raw'])},{name:'midia.zip',blob:new Blob(['zip'])}]});
 const html=pageHTML(bundle);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Texto final do arquivo.'));
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('default-src &#39;')===false);
 assert.equal(publicPath('../x.svg',0),'arquivos/001--x.svg.download');
 assert.ok(html.includes('Sem OCR'));assert.equal(bundle.documents[2].status,'Arquivo original');
 const entries=publicationEntries(bundle);assert.equal(entries.length,5);
 assert.equal(await entries[2].blob.text(),raw);
});
class MockFileReader{
 readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result='data:'+blob.type+';base64,'+Buffer.from(data).toString('base64');this.onload();},error=>{this.error=error;this.onerror();});}
}
globalThis.FileReader=MockFileReader;
function mockGitHub({privateRepo=false,workflow=false,conflict=false,noPages=false,ckLegacy=false}={}){
 const calls=[];
 const request=async(url,options)=>{
  const path=url.replace('https://api.github.com/repos/owner/repo','');
  const body=options.body?JSON.parse(options.body):null;calls.push({path,...options,body});
  let data,status=200;
  if(path==='')data={private:privateRepo,default_branch:'main'};
  else if(path==='/pages'){status=noPages?404:200;data={html_url:'https://owner.github.io/repo/',build_type:workflow?'workflow':'legacy',source:{branch:'main',path:'/docs'}};}
  else if(path==='/contents/package.json')data={content:Buffer.from(JSON.stringify({name:workflow||ckLegacy?'ck-promptmaker':'briefings'})).toString('base64')};
  else if(path==='/git/ref/heads/main')data={object:{sha:'old-head'}};
  else if(path==='/git/commits/old-head')data={tree:{sha:'old-tree'}};
  else if(path==='/git/blobs')data={sha:'blob-'+calls.length};
  else if(path==='/git/trees')data={sha:'new-tree'};
  else if(path==='/git/commits')data={sha:'new-head'};
  else if(path==='/git/refs/heads/main'){status=conflict?422:200;data={};}
  else throw new Error('Unexpected '+path);
  return {ok:status<400,status,json:async()=>data};
 };
 return {request,calls};
}
const bundle={title:'Atividade',prompt:'Enunciado',documents:[{name:'base.txt',path:'arquivos/base.txt',status:'Texto completo',text:'texto',blob:new Blob(['texto'])}]};
test('publication preserves repository tree, uses non-forced commit and returns correct hosting path',async()=>{
 for(const workflow of [false,true]){
  const mock=mockGitHub({workflow});
  const result=await publishPage({repo:'https://github.com/owner/repo',token:'test-secret',bundle},()=>{},mock.request);
  assert.match(result.url,/^https:\/\/owner.github.io\/repo\/briefings\/[\w-]+\/$/);
  const tree=mock.calls.find(c=>c.path==='/git/trees').body;
  assert.equal(tree.base_tree,'old-tree');assert.equal(tree.tree.length,3);
  assert.ok(tree.tree.every(f=>f.path.startsWith(workflow?'public/briefings/':'docs/briefings/')));
  assert.deepEqual(mock.calls.find(c=>c.path==='/git/refs/heads/main').body,{sha:'new-head',force:false});
  assert.deepEqual(mock.calls.find(c=>c.path==='/git/commits').body.parents,['old-head']);
  assert.ok(mock.calls.every(c=>c.headers.Authorization==='Bearer test-secret'));
  assert.ok(!JSON.stringify(mock.calls.map(c=>c.body)).includes('test-secret'));
 }
});
test('publication refuses private repos, missing Pages and concurrent branch changes',async()=>{
 for(const [options,message] of [[{privateRepo:true},/público/],[{noPages:true},/Pages/],[{ckLegacy:true},/GitHub Actions/],[{conflict:true},/nenhum histórico/]]){
  const mock=mockGitHub(options);
  await assert.rejects(publishPage({repo:'owner/repo',token:'test',bundle},()=>{},mock.request),message);
  if(options.privateRepo||options.noPages||options.ckLegacy)assert.ok(!mock.calls.some(c=>c.method==='POST'));
 }
});
