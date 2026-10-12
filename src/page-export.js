import {safeName} from './core.js';
import {pageHTML,imageFile} from './page-html.js';
export {pageHTML};
export function publicPath(name,index){
 let out=String(index+1).padStart(3,'0')+'-'+safeName(name);
 if(/\.(html?|svg|xhtml|xml|m?js|cjs)$/i.test(out))out+='.download';
 return 'arquivos/'+out;
}
export async function preparePage({title,prompt,files},progress=()=>{}){
 const documents=[];let pdfjs;
 for(let i=0;i<files.length;i++){
  const f=files[i];progress('Lendo '+(i+1)+' de '+files.length+': '+f.name);
  const d={name:f.name,path:publicPath(f.name,i),blob:f.blob,text:'',status:'Arquivo original',warning:''};
  try{
   if(/\.(txt|md|csv|tsv|json|sql|py|js|html?|css|xml|yaml|yml|log)$/i.test(f.name)){
    d.text=await f.blob.text();d.status='Texto completo';
   }else if(/\.pdf$/i.test(f.name)){
    pdfjs ||= await import('../vendor/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.min.mjs',import.meta.url).href;
    const task=pdfjs.getDocument({data:new Uint8Array(await f.blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,stopAtErrors:true});
    task.onPassword=()=>task.destroy();
    let doc;try{
     doc=await task.promise;const pages=[];let empty=0;
     for(let n=1;n<=doc.numPages;n++){
      const p=await doc.getPage(n);const {items}=await p.getTextContent();
      const text=items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join('').trim();
      if(!text)empty++;
      pages.push('PÁGINA '+n+' DE '+doc.numPages+'\n'+(text||'[Sem texto extraível. Consulte a página original.]'));p.cleanup();
      await new Promise(r=>setTimeout(r,0));
     }
     d.text=pages.join('\n\n');d.status='PDF · '+doc.numPages+' páginas processadas';
     if(empty)d.warning=empty+' página(s) sem texto extraível. Podem ser imagens ou páginas vazias; não há OCR automático.';
    }finally{await task.destroy();}
   }else if(/\.docx$/i.test(f.name)){
    await import('../vendor/mammoth.browser.js');
    const result=await globalThis.mammoth.extractRawText({arrayBuffer:await f.blob.arrayBuffer()});
    d.text=result.value;d.status='DOCX · texto extraído';
    if(!d.text.trim())d.warning='Não foi encontrado texto extraível; consulte o documento original.';
    else d.warning='Imagens, tabelas e formatação podem não aparecer na transcrição. Consulte o original.';
   }else if(imageFile(f.name)){
    d.status='Imagem original';d.warning='Imagem visível na página. Sem OCR: acrescente uma transcrição em Texto-base para IAs que leem apenas texto.';
   }else{d.warning='Formato sem extração automática. O arquivo original está disponível para download.';}
  }catch{
   d.status='Extração indisponível';d.warning='Não foi possível extrair o texto (arquivo protegido, inválido ou não compatível). O original está preservado; transcreva o conteúdo em Texto-base se necessário.';
  }
  documents.push(d);
 }
 return {title,prompt,documents};
}
export async function standalonePage(bundle){
 const hrefs=[];
 for(const d of bundle.documents)hrefs.push(await blobDataURL(d.blob));
 return new Blob([pageHTML(bundle,hrefs)],{type:'text/html;charset=utf-8'});
}
export function blobDataURL(blob){
 return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
}
export function publicationEntries(bundle){
 return [{path:'index.html',blob:new Blob([pageHTML(bundle)],{type:'text/html'})},{path:'prompt.txt',blob:new Blob([bundle.prompt],{type:'text/plain'})},...bundle.documents.map(d=>({path:d.path,blob:d.blob}))];
}

