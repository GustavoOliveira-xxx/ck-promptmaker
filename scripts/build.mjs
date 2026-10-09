import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','src','assets'])await cp(f,'dist/'+f,{recursive:true});
const paths=['./','./index.html','./manifest.webmanifest','./src/styles.css','./src/app.js','./src/core.js','./src/db.js','./src/zip.js','./src/tasks.js','./src/export-worker.js','./src/backup.js','./assets/ck-logo.webp','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/apple-touch-icon.png','./assets/manual-cps.pdf','./assets/manual-cps.txt'];
const hash=createHash('sha256');
for(const f of paths.slice(1))hash.update(await readFile('dist/'+f.slice(2)));
const version=hash.digest('hex').slice(0,12);
const sw=(await readFile('sw.js','utf8')).replace('__VERSION__',version).replace('__PRECACHE__',JSON.stringify(paths));
await writeFile('dist/sw.js',sw);
console.log('Build pronto: dist/ (cache '+version+')');

