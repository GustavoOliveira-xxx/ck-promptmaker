let enabled=()=>true,lastMark=0;
const allowed=()=>enabled()&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
function burst(x,y,large=false){
 if(!allowed())return;
 const el=document.createElement('div');el.className='ck-burst'+(large?' ck-burst-large':'');el.setAttribute('aria-hidden','true');
 el.innerHTML='<span class="ck-energy"></span><span class="ck-energy second"></span><img src="./assets/ck-logo.webp" alt=""><i></i><b>✦</b>';
 document.body.append(el);
 // Web Animations API avoids inline CSS attributes under the app CSP.
 const position={left:Math.max(40,Math.min(innerWidth-40,x))+'px',top:Math.max(45,Math.min(innerHeight-85,y))+'px'};
 el.animate([position,position],{duration:1100,fill:'both'});
 setTimeout(()=>el.remove(),1150);
}
export function initMotion(isEnabled){
 enabled=isEnabled;
 document.addEventListener('click',event=>{
  const target=event.target.closest('button,a,summary,label.upload-box,label.toggle,select,input,textarea');
  if(!target||!allowed()||target.closest('#dialog')?.dataset.publishing==='true')return;
  const r=target.getBoundingClientRect();
  if(performance.now()-lastMark>180){lastMark=performance.now();burst(event.detail?event.clientX:r.left+r.width/2,event.detail?event.clientY:r.top+r.height/2);}
  target.animate([{filter:'brightness(1)'},{filter:'brightness(1.2)'},{filter:'brightness(1)'}],{duration:260});
 },true);
}
export function logoTransition(){burst(innerWidth<721?innerWidth-64:innerWidth-95,innerWidth<721?125:145,true);}

