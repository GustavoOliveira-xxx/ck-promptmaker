let measuredFps = null;
export function weakDevice() {
 const memory = navigator.deviceMemory, cores = navigator.hardwareConcurrency;
 return navigator.connection?.saveData===true || (memory && memory<=3) || (cores && cores<=4 && (!memory || memory<=4)) || (measuredFps!==null && measuredFps<42);
}
export function measureFps(ms=1500) {
 return new Promise(resolve=>{
  let frames = 0; const start = performance.now();
  const tick = now => { frames++; if(now-start<ms) requestAnimationFrame(tick); else { measuredFps = Math.round(frames*1000/(now-start)); resolve(measuredFps); } };
  requestAnimationFrame(tick);
 });
}
export function applyEffects(mode) {
 const lite = mode==='lite' || (mode==='auto' && weakDevice());
 document.body.classList.toggle('lite', lite);
 return lite;
}
export function watchKeyboard() {
 const vv = window.visualViewport;
 if(!vv) return;
 const update = () => document.body.classList.toggle('keyboard-open', window.innerHeight-vv.height>140 && matchMedia('(max-width: 720px)').matches);
 vv.addEventListener('resize', update);
 document.addEventListener('focusin', event => {
  if(!event.target.matches?.('input:not([type=checkbox]):not([type=file]),textarea,select')) return;
  setTimeout(()=>{ update(); if(document.body.classList.contains('keyboard-open')) event.target.scrollIntoView({block:'center', behavior:'smooth'}); }, 320);
 });
 document.addEventListener('focusout', () => setTimeout(update, 120));
}
export async function diagnose() {
 const checks = [];
 const add = (label, ok, detail) => checks.push({label, ok, detail});
 const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
 add('Instalado como app', standalone, standalone ? 'Abrindo em tela cheia, sem barra do navegador.' : 'Abra pelo navegador e use Instalar aplicativo.');
 add('Câmera dentro do app', !!navigator.mediaDevices?.getUserMedia, navigator.mediaDevices?.getUserMedia ? 'Scanner ao vivo disponível.' : 'Será usada a câmera do sistema.');
 const canShare = !!navigator.canShare?.({files:[new File(['x'],'t.txt',{type:'text/plain'})]});
 add('Compartilhar arquivos', canShare, canShare ? 'Pacotes e backups podem ir direto para WhatsApp, Drive ou ChatGPT.' : 'Os arquivos serão baixados.');
 add('Receber do menu Compartilhar', /Android/i.test(navigator.userAgent) && standalone, /Android/i.test(navigator.userAgent) ? (standalone ? 'O CK aparece ao compartilhar fotos e PDFs.' : 'Instale o app para aparecer no menu Compartilhar.') : 'Recurso do Android com o app instalado.');
 const sw = !!navigator.serviceWorker?.controller;
 add('Funciona offline', sw, sw ? 'Arquivos do app guardados no aparelho.' : 'Abra uma vez com internet e recarregue.');
 let persisted = false; try { persisted = await navigator.storage?.persisted?.(); } catch {}
 add('Armazenamento protegido', !!persisted, persisted ? 'O navegador não apaga seus dados para liberar espaço.' : 'Toque em Proteger armazenamento no perfil.');
 try { const e = await navigator.storage.estimate(); add('Espaço disponível', e.quota-e.usage>200*1048576, Math.round(e.usage/1048576)+' MB usados de '+Math.round(e.quota/1048576)+' MB permitidos.'); } catch {}
 const fps = await measureFps(1500);
 add('Fluidez das animações', fps>=50, fps+' quadros por segundo'+(fps<50?'. O modo econômico deixa tudo mais leve.':'.'));
 add('Memória do aparelho', !navigator.deviceMemory || navigator.deviceMemory>3, navigator.deviceMemory ? navigator.deviceMemory+' GB informados pelo navegador.' : 'O navegador não informa.');
 add('Vibração ao tocar', 'vibrate' in navigator, 'vibrate' in navigator ? 'Disponível.' : 'Não suportada neste aparelho (comum no iPhone).');
 return {checks, agent:navigator.userAgent, screen:screen.width+'×'+screen.height+' @'+devicePixelRatio+'x', at:new Date().toLocaleString('pt-BR')};
}
