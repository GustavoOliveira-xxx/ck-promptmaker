const MAX_SIDE = 2400;
const canFilter = (() => { try { const c = document.createElement('canvas').getContext('2d'); return c && 'filter' in c; } catch { return false; } })();
const toBlob = (canvas, quality=.85) => new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível salvar a foto.')),'image/jpeg',quality));
function drawScaled(source, width, height, enhance, rotate=0) {
 const scale = Math.min(1, MAX_SIDE/Math.max(width,height));
 const w = Math.round(width*scale), h = Math.round(height*scale);
 const canvas = document.createElement('canvas');
 const turned = rotate%180!==0;
 canvas.width = turned ? h : w; canvas.height = turned ? w : h;
 const ctx = canvas.getContext('2d');
 ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
 if(enhance && canFilter) ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.08)';
 ctx.translate(canvas.width/2, canvas.height/2); ctx.rotate(rotate*Math.PI/180);
 ctx.drawImage(source, -w/2, -h/2, w, h);
 return canvas;
}
async function grab(video, track, enhance) {
 if('ImageCapture' in window && track) {
  try {
   const photo = await Promise.race([new ImageCapture(track).takePhoto(), new Promise((_,reject)=>setTimeout(()=>reject(new Error('slow')),2500))]);
   const bitmap = await createImageBitmap(photo);
   const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, enhance);
   bitmap.close?.();
   return {canvas};
  } catch {}
 }
 return {canvas:drawScaled(video, video.videoWidth, video.videoHeight, enhance)};
}
async function rotateBlob(blob) {
 const bitmap = await createImageBitmap(blob);
 const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, false, 90);
 bitmap.close?.();
 return {blob:await toBlob(canvas), width:canvas.width, height:canvas.height};
}
export const scannerSupported = () => !!navigator.mediaDevices?.getUserMedia;
export function openScanner({title='Escanear páginas', actions=[], icon=n=>''}) {
 return new Promise(resolve=>{
  if(!scannerSupported()) { resolve({action:'native'}); return; }
  const pages = [];
  let stream, track, enhance = true, torch = false, finished = false;
  const root = document.createElement('dialog');
  root.className = 'scanner';
  root.setAttribute('aria-label',title);
  root.innerHTML = '<video playsinline muted autoplay></video><div class="scan-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="scan-flash" aria-hidden="true"></div>'+
   '<header class="scan-top"><button class="scan-round" data-scan="close" aria-label="Fechar scanner">'+icon('close')+'</button><b>'+title+'</b><button class="scan-pill" data-scan="enhance" aria-pressed="true">'+icon('spark')+'<span>Realçar</span></button><button class="scan-round" data-scan="torch" aria-label="Lanterna" hidden>'+icon('bolt')+'</button></header>'+
   '<p class="scan-hint" role="status">Enquadre a página e toque no botão.</p><div class="scan-strip" aria-label="Páginas escaneadas"></div>'+
   '<footer class="scan-bottom"><button class="scan-pill" data-scan="native">'+icon('image')+'<span>Câmera do sistema</span></button><button class="scan-shutter" data-scan="shot" aria-label="Fotografar página"><i></i></button><button class="scan-pill primary" data-scan="done" disabled><span>Concluir</span><b>0</b></button></footer>'+
   '<div class="scan-sheet" hidden><h3>O que fazer com as páginas?</h3>'+actions.map(a=>'<button class="btn '+(a.primary?'primary':'secondary')+'" data-scan-action="'+a.id+'">'+icon(a.icon)+'<span>'+a.label+'</span></button>').join('')+'<button class="btn ghost" data-scan="back">Voltar</button></div>';
  document.body.append(root);
  root.showModal();
  document.body.classList.add('scanning');
  const video = root.querySelector('video'), strip = root.querySelector('.scan-strip'), hint = root.querySelector('.scan-hint');
  const refresh = () => {
   strip.innerHTML = pages.map((p,i)=>'<figure><img src="'+p.url+'" alt="Página '+(i+1)+'"><figcaption>'+(i+1)+'</figcaption><button data-scan-rotate="'+i+'" aria-label="Girar página '+(i+1)+'">'+icon('rotate')+'</button><button data-scan-remove="'+i+'" aria-label="Apagar página '+(i+1)+'">'+icon('trash')+'</button></figure>').join('');
   const done = root.querySelector('[data-scan="done"]');
   done.disabled = !pages.length; done.querySelector('b').textContent = pages.length;
   strip.scrollLeft = strip.scrollWidth;
  };
  const finish = result => {
   if(finished) return; finished = true;
   stream?.getTracks().forEach(t=>t.stop());
   if(!result || result.action==='native') for(const p of pages) URL.revokeObjectURL(p.url);
   if(root.open) root.close();
   root.remove(); document.body.classList.remove('scanning');
   document.removeEventListener('keydown', onKey);
   resolve(result);
  };
  const onKey = event => { if(event.key===' '&&event.target===root.querySelector('.scan-shutter')) { event.preventDefault(); shoot(); } };
  root.addEventListener('cancel', event => { event.preventDefault(); const sheet = root.querySelector('.scan-sheet'); if(!sheet.hidden) sheet.hidden = true; else finish(null); });
  document.addEventListener('keydown', onKey);
  let busy = false;
  async function shoot() {
   if(busy || !video.videoWidth) return; busy = true;
   root.classList.remove('flash'); void root.offsetWidth; root.classList.add('flash');
   navigator.vibrate?.(12);
   try {
    const {canvas} = await grab(video, track, enhance);
    const blob = await toBlob(canvas);
    pages.push({blob, width:canvas.width, height:canvas.height, url:URL.createObjectURL(blob)});
    hint.textContent = pages.length===1 ? 'Página 1 pronta. Vire a folha e continue.' : pages.length+' páginas prontas.';
    refresh();
   } catch(error) { hint.textContent = error.message; }
   finally { busy = false; }
  }
  root.addEventListener('click', async event => {
   const b = event.target.closest('button'); if(!b) return;
   const action = b.dataset.scan;
   if(action==='close') finish(null);
   else if(action==='shot') shoot();
   else if(action==='native') finish({action:'native'});
   else if(action==='enhance') { enhance = !enhance; b.setAttribute('aria-pressed', String(enhance)); video.classList.toggle('enhanced', enhance); }
   else if(action==='torch') { torch = !torch; try { await track.applyConstraints({advanced:[{torch}]}); b.setAttribute('aria-pressed', String(torch)); } catch {} }
   else if(action==='done') root.querySelector('.scan-sheet').hidden = false;
   else if(action==='back') root.querySelector('.scan-sheet').hidden = true;
   else if(b.dataset.scanRemove!==undefined) { const [p] = pages.splice(Number(b.dataset.scanRemove),1); URL.revokeObjectURL(p.url); refresh(); }
   else if(b.dataset.scanRotate!==undefined) { const i = Number(b.dataset.scanRotate); const turned = await rotateBlob(pages[i].blob); URL.revokeObjectURL(pages[i].url); pages[i] = {...turned, url:URL.createObjectURL(turned.blob)}; refresh(); }
   else if(b.dataset.scanAction) finish({action:b.dataset.scanAction, pages});
  });
  navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:'environment'}, width:{ideal:2560}, height:{ideal:1440}}}).then(s=>{
   if(finished) { s.getTracks().forEach(t=>t.stop()); return; }
   stream = s; track = s.getVideoTracks()[0]; video.srcObject = s; video.classList.add('enhanced');
   if(track?.getCapabilities?.().torch) root.querySelector('[data-scan="torch"]').hidden = false;
   root.querySelector('.scan-shutter').focus();
  }).catch(()=>finish({action:'native'}));
 });
}
