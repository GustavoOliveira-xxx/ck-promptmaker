let enabled=()=>true,lastMark=0,tiltFrame=0,tiltTarget=null,pointer={x:0,y:0};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const allowed=()=>enabled()&&!reduced.matches;
function burst(x,y,large=false){
 if(!allowed())return;
 const el=document.createElement('div');el.className='ck-burst'+(large?' ck-burst-large':'');el.setAttribute('aria-hidden','true');
 el.innerHTML='<span class="ck-wave"></span><span class="ck-wave w2"></span><span class="ck-rays">'+'<i><s></s></i>'.repeat(8)+'</span><img src="./assets/ck-logo.webp" alt=""><b>✦</b><em></em>';
 document.body.append(el);
 const position={left:Math.max(40,Math.min(innerWidth-40,x))+'px',top:Math.max(45,Math.min(innerHeight-85,y))+'px'};
 el.animate([position,position],{duration:1000,fill:'both'});
 setTimeout(()=>el.remove(),1050);
}
export function haptic(ms=8){if(allowed())navigator.vibrate?.(ms);}
function resetTilt(el){if(!el)return;el.classList.remove('tilting');el.style.removeProperty('--rx');el.style.removeProperty('--ry');}
function applyTilt(){
 tiltFrame=0;const el=tiltTarget;if(!el?.isConnected)return;
 const r=el.getBoundingClientRect(),px=(pointer.x-r.left)/r.width,py=(pointer.y-r.top)/r.height;
 const strength=el.classList.contains('hero-art')?16:7;
 el.style.setProperty('--mx',(px*100).toFixed(1)+'%');el.style.setProperty('--my',(py*100).toFixed(1)+'%');
 if(el.classList.contains('tilt')||el.classList.contains('hero-art')){el.classList.add('tilting');el.style.setProperty('--rx',((.5-py)*strength).toFixed(2)+'deg');el.style.setProperty('--ry',((px-.5)*strength).toFixed(2)+'deg');}
}
function onPointerMove(event){
 if(!finePointer.matches||!allowed())return;
 const el=event.target.closest?.('.tilt,.spot,.hero-art');
 if(el!==tiltTarget){resetTilt(tiltTarget);tiltTarget=el;}
 if(!el)return;
 pointer={x:event.clientX,y:event.clientY};
 if(!tiltFrame)tiltFrame=requestAnimationFrame(applyTilt);
}
export function initMotion(isEnabled){
 enabled=isEnabled;
 document.addEventListener('click',event=>{
  const target=event.target.closest('button,a,summary,label.upload-box,label.toggle,select,input,textarea');
  if(!target||!allowed()||target.closest('.scanner')||target.closest('#dialog')?.dataset.publishing==='true')return;
  const r=target.getBoundingClientRect();
  if(performance.now()-lastMark>180){lastMark=performance.now();burst(event.detail?event.clientX:r.left+r.width/2,event.detail?event.clientY:r.top+r.height/2);}
  if(target.matches('.btn.primary,.nav-item,.step,.chip,.choice,.delivery-head,.camera-fab,.segmented button'))haptic();
  target.animate([{filter:'brightness(1)'},{filter:'brightness(1.25)'},{filter:'brightness(1)'}],{duration:280});
 },true);
 document.addEventListener('pointermove',onPointerMove,{passive:true});
 document.addEventListener('pointerleave',()=>{resetTilt(tiltTarget);tiltTarget=null;});
}
export function logoTransition(){burst(innerWidth<721?innerWidth/2:innerWidth-95,innerWidth<721?110:140,true);}
export function viewSweep(){
 if(!allowed())return;
 const el=document.createElement('div');el.className='ck-sweep';el.setAttribute('aria-hidden','true');
 document.body.append(el);setTimeout(()=>el.remove(),800);
}
let observer;
export function pauseOffscreen(selector){
 observer?.disconnect();
 if(!('IntersectionObserver' in window))return;
 observer=new IntersectionObserver(entries=>{for(const e of entries)e.target.classList.toggle('paused',!e.isIntersecting);});
 for(const el of document.querySelectorAll(selector))observer.observe(el);
}
