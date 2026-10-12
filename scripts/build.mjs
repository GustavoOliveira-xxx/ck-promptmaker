import {mkdir,cp,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','src','assets'])await cp(f,'dist/'+f,{recursive:true});
await mkdir('dist/vendor/fonts',{recursive:true});
for(const [from,to] of [
 ['node_modules/pdfjs-dist/build/pdf.min.mjs','pdf.min.mjs'],
 ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.min.mjs'],
 ['node_modules/pdfjs-dist/LICENSE','PDFJS-LICENSE.txt'],
 ['node_modules/mammoth/mammoth.browser.min.js','mammoth.browser.js'],
 ['node_modules/mammoth/LICENSE','MAMMOTH-LICENSE.txt'],
 ['node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2','fonts/sora-latin-wght-normal.woff2'],
 ['node_modules/@fontsource-variable/sora/LICENSE','fonts/SORA-OFL-LICENSE.txt']
])await cp(from,'dist/vendor/'+to);
try{await cp('public','dist',{recursive:true});}catch(error){if(error.code!=='ENOENT')throw error;}
async function walk(dir){const entries=await readdir('dist/'+dir,{withFileTypes:true});const out=[];for(const e of entries){const p=dir+'/'+e.name;if(e.isDirectory())out.push(...await walk(p));else out.push('./'+p);}return out;}
const paths=['./','./index.html','./manifest.webmanifest',...(await walk('src')),...(await walk('vendor')), './assets/ck-logo.webp','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/apple-touch-icon.png','./assets/manual-cps.pdf','./assets/manual-cps.txt'];
const hash=createHash('sha256');
for(const f of paths.slice(1))hash.update(await readFile('dist/'+f.slice(2)));
const version=hash.digest('hex').slice(0,12);
const sw=(await readFile('sw.js','utf8')).replace('__VERSION__',version).replace('__PRECACHE__',JSON.stringify(paths));
await writeFile('dist/sw.js',sw);
console.log('Build pronto: dist/ (cache '+version+')');

