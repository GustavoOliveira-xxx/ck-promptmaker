import {publicationEntries,blobDataURL} from './page-export.js';
const API='https://api.github.com';
export async function publishPage({repo,token,bundle},progress=()=>{},request=fetch){
 repo=repo.trim().replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('Informe o repositório no formato usuario/repositorio.');
 if(!token.trim())throw new Error('Informe um token GitHub com acesso ao repositório. Ele não será salvo.');
 const endpoint='/repos/'+repo;
 const api=async(path,method='GET',body)=>{
  const r=await request(API+endpoint+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token.trim(),'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(120000)});
  if(!r.ok){const e=new Error(r.status===401?'Token inválido ou expirado.':r.status===403?'O token não tem a permissão necessária ou o limite da API foi atingido.':r.status===404?'Repositório ou GitHub Pages não encontrado. Confira o acesso e ative Pages antes de publicar.':r.status===409||r.status===422?'O repositório mudou durante a publicação ou recusou a alteração. Tente novamente; nenhum histórico foi sobrescrito.':'O GitHub não concluiu a operação (HTTP '+r.status+').');e.status=r.status;throw e;}return r.json();
 };
 progress('Conferindo repositório e hospedagem…');
 const meta=await api('');
 if(meta.private)throw new Error('Use um repositório público para uma página acessível por IAs sem login.');
 const pages=await api('/pages');
 if(!pages.html_url||!pages.html_url.startsWith('https://'))throw new Error('Ative HTTPS no GitHub Pages antes de publicar.');
 let branch=pages.source?.branch||meta.default_branch,prefix='';
 let pkg=null;
 try{const item=await api('/contents/package.json');pkg=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(item.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));}catch(error){if(error.status&&error.status!==404)throw error;}
 if(pkg?.name==='ck-promptmaker'&&pages.build_type!=='workflow')throw new Error('Neste repositório CK, configure Settings → Pages → Source: GitHub Actions antes de publicar. O CK precisa do build para incluir os leitores e os briefings.');
 if(pages.build_type==='workflow'){
  if(pkg?.name!=='ck-promptmaker')throw new Error('Publicação por Actions requer o repositório do CK Promptmaker. Para outro repositório, use Pages a partir de uma branch.');
  prefix='public/';branch=meta.default_branch;
 }else{
  if(!['/','/docs'].includes(pages.source?.path))throw new Error('Configure Pages para publicar a raiz ou a pasta /docs.');
  prefix=pages.source.path==='/docs'?'docs/':'';
 }
 const refPath='/git/ref/heads/'+branch.split('/').map(encodeURIComponent).join('/');
 const head=await api(refPath);const commit=await api('/git/commits/'+head.object.sha);
 const id=crypto.randomUUID();const folder='briefings/'+id+'/';const entries=publicationEntries(bundle);const tree=[];
 for(let i=0;i<entries.length;i++){
  progress('Enviando arquivo '+(i+1)+' de '+entries.length+'…');
  const f=entries[i];const data=await blobDataURL(f.blob);
  const blob=await api('/git/blobs','POST',{content:data.slice(data.indexOf(',')+1),encoding:'base64'});
  tree.push({path:prefix+folder+f.path,mode:'100644',type:'blob',sha:blob.sha});
 }
 const newTree=await api('/git/trees','POST',{base_tree:commit.tree.sha,tree});
 const newCommit=await api('/git/commits','POST',{message:'Publish CK activity briefing '+id,tree:newTree.sha,parents:[head.object.sha]});
 await api('/git/refs/heads/'+branch.split('/').map(encodeURIComponent).join('/'),'PATCH',{sha:newCommit.sha,force:false});
 return {url:new URL(folder,pages.html_url.replace(/\/?$/,'/')).href,commit:newCommit.sha,repo,folder:prefix+folder};
}

