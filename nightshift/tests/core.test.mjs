import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {normalizeContent,safeUrl} from '../dist/content.js';
import {createState,tick,boost,collision,awardPass,RULES} from '../dist/game-model.js';
import {createLocalServer} from '../server.mjs';
const sample=JSON.parse(await readFile(new URL('../dist/content.json',import.meta.url),'utf8'));
test('content import round-trip preserves profile, projects and new notes',()=>{
  const data=structuredClone(sample);data.notes=[{title:'研究笔记',date:'2026-11-01',body:'第一段\n第二段',url:'https://example.org/note'}];
  assert.deepEqual(normalizeContent(JSON.parse(JSON.stringify(normalizeContent(data)))),normalizeContent(data));
});
test('untrusted imports cannot introduce executable links or duplicate project ids',()=>{
  assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('data:text/html,test'),'');assert.equal(safeUrl('https://user:secret@example.org'),'');
  const data=structuredClone(sample);data.projects[0].url='javascript:alert(1)';assert.throws(()=>normalizeContent(data));data.projects[0].url='';data.projects[1].id=data.projects[0].id;assert.throws(()=>normalizeContent(data));
});
test('boost expires into cooldown; pause freezes score and movement',()=>{
  const state=createState();assert.equal(boost(state),false);state.phase='running';assert.equal(boost(state),true);assert.equal(boost(state),false);
  for(let i=0;i<50;i++)tick(state,.05,1);assert.equal(state.boost,0);assert.ok(state.cooldown>0);assert.ok(state.x<=RULES.maxX);assert.equal(boost(state),false);
  state.phase='paused';const snapshot=structuredClone(state);tick(state,.05,-1);assert.deepEqual(state,snapshot);
});
test('collisions and near-misses use separate boundaries',()=>{
  assert.equal(collision(1.5,1.5,7),true);assert.equal(collision(-1.5,1.5,7),false);assert.equal(collision(1.5,1.5,-10),false);
  const state=createState();assert.ok(awardPass(state,2)>0);assert.equal(state.combo,1);assert.equal(awardPass(state,4),0);
});
test('local editor handler persists validated content and rejects cross-origin writes',async()=>{
  const fixtureParent=fileURLToPath(new URL('../work/',import.meta.url));await mkdir(fixtureParent,{recursive:true});
  const directory=await mkdtemp(path.join(fixtureParent,'nightshift-test-'));await writeFile(path.join(directory,'content.json'),JSON.stringify(sample));await writeFile(path.join(directory,'index.html'),'<h1>test</h1>');
  const server=createLocalServer(directory);const origin='http://127.0.0.1:4173';
  const request=(url,options={})=>new Promise((resolve,reject)=>{
    const req=Readable.from(options.body?[Buffer.from(options.body)]:[]);req.method=options.method||'GET';req.url=url;req.socket={localPort:4173};req.headers={host:'127.0.0.1:4173',...options.headers};
    const res={writeHead(status,headers){this.status=status;this.headers=headers;},end(data){resolve({status:this.status,headers:this.headers,body:data});}};
    try{server.emit('request',req,res);}catch(error){reject(error);}
  });
  try{
    const changed=structuredClone(sample);changed.profile.name='保存验证';
    let response=await request('/api/content',{method:'PUT',headers:{'content-type':'application/json',origin:'https://other.example'},body:JSON.stringify(changed)});assert.equal(response.status,403);
    response=await request('/api/content',{method:'PUT',headers:{'content-type':'application/json',origin},body:JSON.stringify(changed)});assert.equal(response.status,200);
    assert.equal(JSON.parse(await readFile(path.join(directory,'content.json'),'utf8')).profile.name,'保存验证');
    changed.profile.github='javascript:bad()';response=await request('/api/content',{method:'PUT',headers:{'content-type':'application/json',origin},body:JSON.stringify(changed)});assert.equal(response.status,400);
    assert.equal((await request('/%2e%2e%2fpackage.json')).status,403);assert.equal((await request('/')).status,200);
  }finally{assert.equal(path.dirname(directory),path.resolve(fixtureParent));assert.ok(path.basename(directory).startsWith('nightshift-test-'));await rm(directory,{recursive:true,force:true});}
});
