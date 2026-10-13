import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {handle as cloud} from '../api/cloud.js';
import {mergeState,pack,unpack} from '../src/cloud.js';
import {memoryBlob} from './fixtures/memory-blob.mjs';


const env = {BLOB_READ_WRITE_TOKEN:'vercel_blob_rw_abc_secret', CK_ACCESS_CODE:'senha'};
const call = (action, body, {code='senha', query='', space='default'}={}) => new Request('https://ck.test/api/cloud?action='+action+'&space='+space+query, {method:'POST', headers:{origin:'https://ck.test', host:'ck.test', 'x-ck-code':code, 'content-type':'application/octet-stream'}, body});
const state = files => gzipSync(JSON.stringify({app:'ck-promptmaker', version:1, activities:[], subjects:[], files, gone:{}}));

test('cloud refuses wrong passwords and servers without a password',async()=>{
 const blob=memoryBlob();
 assert.equal((await cloud(call('state'),{env,blob,fetch:blob.fetch})).status,204);
 const denied=await cloud(call('state',undefined,{code:'errada'}),{env,blob,fetch:blob.fetch});
 assert.equal(denied.status,401);assert.equal((await denied.json()).code,'ACCESS_CODE');
 assert.equal((await cloud(call('state'),{env:{BLOB_READ_WRITE_TOKEN:'x'},blob,fetch:blob.fetch})).status,503);
 assert.equal((await cloud(call('state',undefined,{space:'../x'}),{env,blob,fetch:blob.fetch})).status,400);
});

test('cloud stores state and file parts in a hidden folder and returns the newest state',async()=>{
 let now=Date.parse('2026-10-13T10:00:00Z');const blob=memoryBlob(()=>now);
 const part=new TextEncoder().encode('parte do arquivo');
 assert.equal((await cloud(call('put',part,{query:'&key=f1.abc&n=0'}),{env,blob,fetch:blob.fetch,now})).status,200);
 assert.equal((await cloud(call('put',part,{query:'&key=../x&n=0'}),{env,blob,fetch:blob.fetch,now})).status,400);
 for(let i=0;i<5;i++){now+=1000;assert.equal((await cloud(call('save-state',state([{id:'f1',key:'f1.abc',chunks:1}])),{env,blob,fetch:blob.fetch,now})).status,200);}
 const paths=[...blob.store.keys()];
 assert.ok(paths.every(p=>/^cloud\/[A-Za-z0-9_-]{32}\//.test(p)));
 assert.equal(paths.filter(p=>p.includes('/state/')).length,3);
 const got=await cloud(call('get',undefined,{query:'&key=f1.abc&n=0'}),{env,blob,fetch:blob.fetch,now});
 assert.equal(await got.text(),'parte do arquivo');
 const latest=await cloud(call('state'),{env,blob,fetch:blob.fetch,now});
 assert.equal((await unpack(await latest.arrayBuffer())).files[0].key,'f1.abc');
 const other=await cloud(call('state',undefined,{space:'perfil-2'}),{env,blob,fetch:blob.fetch,now});
 assert.equal(other.status,204);
});

test('cloud drops file parts no longer referenced once they are a day old',async()=>{
 let now=Date.parse('2026-10-13T10:00:00Z');const blob=memoryBlob(()=>now);
 for(const key of ['velho.a','novo.b'])await cloud(call('put',new Uint8Array([1]),{query:'&key='+key+'&n=0'}),{env,blob,fetch:blob.fetch,now});
 await cloud(call('save-state',state([{id:'novo',key:'novo.b',chunks:1}])),{env,blob,fetch:blob.fetch,now});
 assert.equal([...blob.store.keys()].filter(p=>p.includes('/files/')).length,2);
 now+=2*86400000;
 await cloud(call('save-state',state([{id:'novo',key:'novo.b',chunks:1}])),{env,blob,fetch:blob.fetch,now});
 const left=[...blob.store.keys()].filter(p=>p.includes('/files/'));
 assert.equal(left.length,1);assert.match(left[0],/novo\.b/);
 assert.equal((await cloud(call('save-state',new Uint8Array([1,2,3])),{env,blob,fetch:blob.fetch,now})).status,400);
});

test('merging keeps the newest version, honours deletions and expires old trash',()=>{
 const now=Date.parse('2026-10-13T10:00:00Z');
 const local={gone:new Map([['apagada',now-1000]]),
  activities:[{id:'a',title:'local nova',updatedAt:now-10},{id:'b',title:'local velha',updatedAt:now-500},{id:'apagada',updatedAt:now-5000}],
  subjects:[{id:'lixo',name:'antiga',deletedAt:now-40*86400000,updatedAt:now-40*86400000}],
  files:[],profile:{name:'Gustavo',aiCode:'senha',updatedAt:now-100}};
 const remote={gone:{'sumiu':now-2000},
  activities:[{id:'a',title:'nuvem velha',updatedAt:now-20},{id:'b',title:'nuvem nova',updatedAt:now-5},{id:'sumiu',updatedAt:now-9000},{id:'c',title:'só na nuvem',updatedAt:now-50}],
  subjects:[],files:[{id:'f',key:'f.x',chunks:1,updatedAt:now}],profile:{name:'Gustavo Oliveira',updatedAt:now-50}};
 const merged=mergeState(local,remote,now);
 assert.deepEqual(merged.activities.map(a=>a.title).sort(),['local nova','nuvem nova','só na nuvem']);
 assert.equal(merged.subjects.length,0);
 assert.equal(merged.files[0].key,'f.x');
 assert.equal(merged.profile.name,'Gustavo Oliveira');
 assert.ok(merged.gone.has('apagada')&&merged.gone.has('sumiu'));
 assert.ok(merged.activities.includes(local.activities[0]));
});

test('cloud state is compressed and survives a round trip',async()=>{
 const data={activities:[{id:'a',title:'Ação é ótima'.repeat(200)}]};
 const buffer=await pack(data);
 assert.ok(buffer.byteLength<JSON.stringify(data).length/5);
 assert.deepEqual(await unpack(buffer),data);
});
