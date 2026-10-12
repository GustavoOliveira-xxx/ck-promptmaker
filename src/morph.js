const RUNTIME = new Set(['paused','tilting','fx-pop','fx-reveal','fx-shake','drag']);
const template = document.createElement('template');
function syncAttributes(from, to) {
 for(const {name} of [...from.attributes]) if(!to.hasAttribute(name) && name!=='style' && name!=='class') from.removeAttribute(name);
 for(const {name,value} of [...to.attributes]) {
  if(name==='class') continue;
  if(from.getAttribute(name)!==value) from.setAttribute(name,value);
 }
 const next = new Set((to.getAttribute('class')||'').split(/\s+/).filter(Boolean));
 for(const c of [...from.classList]) if(!next.has(c) && !RUNTIME.has(c)) from.classList.remove(c);
 for(const c of next) if(!from.classList.contains(c)) from.classList.add(c);
 if(!from.classList.length && !next.size) from.removeAttribute('class');
}
function syncControl(from, to) {
 if(from.tagName==='INPUT') {
  if(from.type==='checkbox' || from.type==='radio') { const checked = to.hasAttribute('checked'); if(from.checked!==checked) from.checked = checked; }
  else if(from.type!=='file') { const value = to.getAttribute('value') ?? ''; if(from.value!==value) from.value = value; }
 } else if(from.tagName==='TEXTAREA') {
  const value = to.textContent; if(from.defaultValue!==value) from.defaultValue = value; if(from.value!==value) from.value = value;
 } else if(from.tagName==='SELECT') {
  const option = [...to.options].find(o=>o.hasAttribute('selected'));
  const value = option ? option.value : to.options[0]?.value ?? '';
  if(from.value!==value) from.value = value;
 }
}
function same(a, b) {
 if(a.nodeType!==b.nodeType) return false;
 if(a.nodeType!==1) return true;
 if(a.tagName!==b.tagName) return false;
 if(a.id!==b.id) return false;
 const ka = a.getAttribute('data-key'), kb = b.getAttribute('data-key');
 return ka===kb;
}
function patch(from, to) {
 if(from.nodeType===3 || from.nodeType===8) { if(from.nodeValue!==to.nodeValue) from.nodeValue = to.nodeValue; return; }
 syncAttributes(from, to);
 if(from.tagName==='TEXTAREA') { syncControl(from, to); return; }
 patchChildren(from, to);
 if(from.tagName==='INPUT' || from.tagName==='SELECT') syncControl(from, to);
}
function patchChildren(parent, next) {
 const incoming = [...next.childNodes];
 let cursor = parent.firstChild;
 for(const node of incoming) {
  if(cursor && same(cursor, node)) { const following = cursor.nextSibling; patch(cursor, node); cursor = following; continue; }
  const key = node.nodeType===1 && node.getAttribute('data-key');
  const match = key ? [...parent.children].find(c=>c.getAttribute('data-key')===key && c!==cursor) : null;
  if(match) { parent.insertBefore(match, cursor); patch(match, node); continue; }
  parent.insertBefore(node, cursor);
 }
 while(cursor) { const following = cursor.nextSibling; cursor.remove(); cursor = following; }
}
export function morph(root, html) {
 template.innerHTML = html;
 if(!root.firstChild) { root.replaceChildren(template.content); return; }
 patchChildren(root, template.content);
}
