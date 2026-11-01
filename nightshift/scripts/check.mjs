import {readFile,readdir,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeContent} from '../dist/content.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
async function check(dir){for(const name of await readdir(dir)){const filename=path.join(dir,name);if((await stat(filename)).isDirectory())await check(filename);else if(name.endsWith('.js')||name.endsWith('.mjs')){const result=spawnSync(process.execPath,['--check',filename],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);}}}
await check(dist);normalizeContent(JSON.parse(await readFile(path.join(dist,'content.json'),'utf8')));
const html=await readFile(path.join(dist,'index.html'),'utf8');
for(const asset of [...html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)].map(match=>match[1]))await stat(path.join(dist,asset));
await stat(path.join(dist,'vendor/three-r184.js'));
console.log('Build verified: all JavaScript parses, content is valid, entry assets exist.');
console.log('Static output: dist/ (no installation or compilation required).');
