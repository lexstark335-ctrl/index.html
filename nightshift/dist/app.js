import { normalizeContent, safeUrl, STORAGE_KEY } from './content.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clone = value => structuredClone(value);
const splitTags = value => value.split(/[,，]/).map(t => t.trim()).filter(Boolean);
let content, fileContent, draft, activeFilter = '全部', canWrite = false, scenery, game, gameLoading;
const editor = $('#editor-dialog');
const projectDialog = $('#project-dialog');
const gameDialog = $('#game-dialog');
const form = $('#editor-form');
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600); }
function el(tag, className, value) { const node = document.createElement(tag); if(className) node.className = className; if(value !== undefined) node.textContent = value; return node; }
function externalLink(href, label, className='') { const link = el('a',className,label); link.href = safeUrl(href); link.target='_blank'; link.rel='noopener noreferrer'; return link; }
function tagList(values) { const node=el('div','tags'); values.forEach(v=>node.append(el('span','',v))); return node; }

function artwork(type, index=0) {
  const uid = `art-${type}-${index}`;
  const base = `<defs><radialGradient id="${uid}"><stop stop-color="#834d9e"/><stop offset="1" stop-color="#21132f"/></radialGradient><linearGradient id="${uid}-l" x2="0.6" y2="1"><stop stop-color="#f8b2df"/><stop offset=".5" stop-color="#9d70c1"/><stop offset="1" stop-color="#31203d"/></linearGradient></defs><rect width="600" height="340" fill="#21132f"/><rect width="600" height="340" fill="url(#${uid})" opacity=".75"/>`;
  let drawing='';
  if(type==='terrain') {
    drawing='<circle cx="440" cy="80" r="35" fill="#c785ba" opacity=".45"/>';
    for(let r=0;r<18;r++) {
      const points=[];
      for(let x=0;x<=36;x++) { const px=x*20-50; const depth=r/17; const bump=Math.exp(-((px-290)**2)/19000)*(80+Math.sin(x*.32+r*.28)*38); const py=150+r*10-bump*(1-depth*.6)+Math.sin(x*.55+r*.5)*12; points.push(`${px},${py}`); }
      drawing+=`<polyline points="${points.join(' ')}" fill="none" stroke="${r%3===0?'#dba6e4':'#8c609e'}" stroke-width="${r%3===0?'1.4':'.7'}" opacity="${.3+r/25}"/>`;
    }
    drawing+='<path d="M45 291h90m-90-5v12m90-12v12" stroke="#e7ff83" opacity=".6"/><text x="450" y="296" fill="#ba93cc" font-family="monospace" font-size="9">UNKNOWN TERRAIN</text>';
  } else if(type==='portal') {
    for(let r=12;r>=1;r--) { const w=r*23,h=r*12; const angle=r*5-27; drawing+=`<rect x="${300-w}" y="${165-h}" width="${w*2}" height="${h*2}" rx="2" transform="rotate(${angle} 300 165)" fill="${r===1?'#e7ff83':'none'}" stroke="${r%3===0?'#e5a4d5':'#8b5aa5'}" stroke-width="${r===1?'1':'1.2'}" opacity="${1-r*.045}"/>`; }
    drawing+='<path d="M75 85v-15h15m420 190h15v-15" stroke="#e7ff83" fill="none"/><text x="40" y="305" fill="#a282b8" font-family="monospace" font-size="9">TRANSMISSION / 003</text>';
  } else {
    drawing=`<ellipse cx="300" cy="272" rx="130" ry="16" fill="#c384d3" opacity=".13"/><circle cx="300" cy="156" r="90" fill="url(#${uid}-l)"/><ellipse cx="300" cy="156" rx="90" ry="30" fill="none" stroke="#f1c3e6" opacity=".35"/><ellipse cx="300" cy="156" rx="50" ry="90" fill="none" stroke="#e9c5ef" opacity=".3"/><ellipse cx="300" cy="156" rx="90" ry="62" fill="none" stroke="#f1c3e6" opacity=".25"/><ellipse cx="300" cy="156" rx="145" ry="30" transform="rotate(-25 300 156)" fill="none" stroke="#f1c3e6" stroke-width="2"/><circle cx="175" cy="206" r="4" fill="#e7ff83"/><path d="M300 37v16m0 206v16M170 156h-16m292 0h-16" stroke="#c599dc" opacity=".6"/><text x="40" y="305" fill="#a282b8" font-family="monospace" font-size="9">IDEA IN ORBIT / 001</text>`;
  }
  return `<svg viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${base}${drawing}</svg>`;
}
function setHeadline(value) {
  const lines=value.split('\n').filter(Boolean); $('#hero-title').replaceChildren();
  lines.forEach((line,index)=>{ if(index) $('#hero-title').append(document.createElement('br')); $('#hero-title').append(index===lines.length-1&&index>0?el('span','',line):document.createTextNode(line)); });
}
function render() {
  const p=content.profile;
  document.title=`${p.name} · NIGHTSHIFT`;
  $('meta[name="description"]').content=p.intro;
  $('meta[property="og:title"]').content=document.title;
  $('meta[property="og:description"]').content=p.intro;
  setHeadline(p.headline); $('#hero-intro').textContent=p.intro; $('#hero-name').textContent=p.name; $('#hero-role').textContent=p.role;
  const avatar=$('.mini-avatar'); avatar.replaceChildren(document.createTextNode((p.englishName||p.name).slice(0,1).toUpperCase()),el('span','','✦'));
  $('#about-copy').textContent=p.about; $('#profile-location').textContent=p.location||'坐标待填写'; $('#availability').textContent=p.availability||'欢迎交流';
  $('#skill-strip').replaceChildren(...p.skills.map(skill=>el('span','',skill))); $('#about-skills').replaceChildren(...p.skills.map(skill=>el('span','',skill)));
  $('#email-link').hidden=!p.email; $('#contact-placeholder').hidden=!!p.email; if(p.email) $('#email-link').href=`mailto:${p.email}`;
  const socials=[]; if(p.github) socials.push(externalLink(p.github,'GITHUB ↗')); if(p.social) socials.push(externalLink(p.social,'个人链接 ↗')); $('#social-links').replaceChildren(...socials);
  $('#footer-credit').textContent=`© ${new Date().getFullYear()} ${p.name} / 保持好奇`;
  const categories=['全部',...new Set(content.projects.map(item=>item.category))]; if(!categories.includes(activeFilter)) activeFilter='全部';
  $('#project-filters').replaceChildren(...categories.map(category=>{const button=el('button',category===activeFilter?'active':'',category);button.type='button';button.setAttribute('aria-pressed',String(category===activeFilter));button.addEventListener('click',()=>{activeFilter=category;$$('#project-filters button').forEach(b=>{const selected=b.textContent===category;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});renderProjects();});return button;}));
  renderProjects(); renderNotes();
}
function renderProjects() {
  const projects=content.projects.filter(item=>activeFilter==='全部'||item.category===activeFilter);
  $('#project-grid').replaceChildren(...projects.map((item,index)=>{
    const article=el('article','project-card'); const preview=el('button','project-preview'); preview.type='button'; preview.setAttribute('aria-label',`查看项目：${item.title}`);
    preview.innerHTML=artwork(item.visual,index);preview.append(el('span','project-number',`FILE / ${String(index+1).padStart(2,'0')}`),el('span','project-open','↗'));
    preview.addEventListener('click',()=>openProject(item)); const meta=el('div','project-meta');meta.append(el('span','',item.category),el('span','',item.year));
    const heading=el('h3');const title=el('button','project-title',item.title);title.type='button';title.addEventListener('click',()=>openProject(item));heading.append(title);
    article.append(preview,meta,heading,el('p','project-description',item.summary),tagList(item.tags));return article;
  })); $('#projects-empty').hidden=projects.length>0;
}
function renderNotes() {
  $('#notes-section').hidden=!content.notes.length;
  $('#notes-list').replaceChildren(...content.notes.map(note=>{const article=el('article','note-item');const date=el('time','',note.date||'随手记录');if(note.date) date.dateTime=note.date;const copy=el('div');copy.append(el('h3','',note.title),el('p','',note.body));article.append(date,copy);if(note.url){const link=externalLink(note.url,'↗');link.setAttribute('aria-label',`阅读完整文章：${note.title}`);article.append(link);}return article;}));
}
function openProject(item) {
  const art=el('div','detail-art');art.innerHTML=artwork(item.visual,99);
  const copy=el('div','detail-copy');copy.append(el('p','detail-meta',`${item.category} / ${item.year}`),el('h2','',item.title),el('div','prose',item.description||item.summary),tagList(item.tags));
  if(item.url) copy.append(externalLink(item.url,'访问完整项目 ↗','button button-yellow'));
  $('#project-detail').replaceChildren(art,copy);projectDialog.showModal();
}

function editorMessage(message,error=false) { $('#editor-message').textContent=message; $('#editor-message').classList.toggle('error',error); }
function openEditor() { if(!content) return; draft=clone(content); populateEditor(); editorMessage(''); editor.showModal(); }
function field(parent,label,value,fieldKey,options={}) {
  const wrap=el('label',options.full?'full':'',label);let input;
  if(options.choices){input=document.createElement('select');options.choices.forEach(([value,label])=>{const option=el('option','',label);option.value=value;input.append(option);});}
  else {input=document.createElement(options.rows?'textarea':'input');if(options.rows)input.rows=options.rows;else input.type=options.type||'text';}
  input.value=value??'';input.dataset.field=fieldKey;input.maxLength=options.max||12000;wrap.append(input);parent.append(wrap);return input;
}
function populateEditor() {
  for(const key of Object.keys(draft.profile)) { const input=form.elements.namedItem(key);if(input) input.value=key==='skills'?draft.profile.skills.join('，'):draft.profile[key]; }
  renderProjectEditors();renderNoteEditors();
}
function renderProjectEditors() {
  $('#project-edit-list').replaceChildren(...draft.projects.map((item,index)=>{
    const card=el('div','item-editor');card.dataset.project=String(index);const top=el('div','item-editor-top');top.append(el('span','',`PROJECT ${String(index+1).padStart(2,'0')}`));
    const remove=el('button','delete-item','移除');remove.type='button';remove.addEventListener('click',()=>{collectDraft();draft.projects.splice(index,1);renderProjectEditors();editorMessage('已从草稿移除。保存后生效。');});top.append(remove);card.append(top);const grid=el('div','form-grid');
    field(grid,'项目标题',item.title,'title',{full:true,max:120});field(grid,'分类',item.category,'category',{max:60});field(grid,'年份 / 时间',item.year,'year',{max:30});
    field(grid,'项目简述',item.summary,'summary',{rows:2,full:true,max:500});field(grid,'项目详情',item.description,'description',{rows:5,full:true});
    field(grid,'标签（逗号分隔）',item.tags.join('，'),'tags',{full:true,max:700});field(grid,'项目链接',item.url,'url',{type:'url',full:true,max:1000});
    field(grid,'封面视觉',item.visual,'visual',{choices:[['orb','轨道之球'],['terrain','未知地形'],['portal','数字之门']]});card.append(grid);return card;
  }));
}
function renderNoteEditors() {
  $('#note-edit-list').replaceChildren(...draft.notes.map((item,index)=>{
    const card=el('div','item-editor');card.dataset.note=String(index);const top=el('div','item-editor-top');top.append(el('span','',`NOTE ${String(index+1).padStart(2,'0')}`));const remove=el('button','delete-item','移除');remove.type='button';remove.addEventListener('click',()=>{collectDraft();draft.notes.splice(index,1);renderNoteEditors();editorMessage('已从草稿移除。保存后生效。');});top.append(remove);card.append(top);const grid=el('div','form-grid');
    field(grid,'标题',item.title,'title',{full:true,max:160});field(grid,'日期',item.date,'date',{type:'date',max:10});field(grid,'正文',item.body,'body',{rows:6,full:true,max:16000});field(grid,'外部链接（可选）',item.url,'url',{type:'url',full:true,max:1000});card.append(grid);return card;
  }));
}
function collectDraft() {
  for(const key of Object.keys(draft.profile)) {const input=form.elements.namedItem(key);if(input) draft.profile[key]=key==='skills'?splitTags(input.value):input.value;}
  $$('#project-edit-list [data-project]').forEach(card=>{const item=draft.projects[Number(card.dataset.project)];card.querySelectorAll('[data-field]').forEach(input=>{item[input.dataset.field]=input.dataset.field==='tags'?splitTags(input.value):input.value;});});
  $$('#note-edit-list [data-note]').forEach(card=>{const item=draft.notes[Number(card.dataset.note)];card.querySelectorAll('[data-field]').forEach(input=>{item[input.dataset.field]=input.value;});});
}
function activatePanel(name, focus=false) {
  $$('.editor-tabs button').forEach(button=>{const selected=button.dataset.panel===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&focus)button.focus();});
  $$('.editor-panel').forEach(panel=>{panel.hidden=panel.id!==`panel-${name}`;});
}
$$('.editor-open').forEach(button=>button.addEventListener('click',openEditor));
$$('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
[editor,projectDialog].forEach(dialog=>dialog.addEventListener('click',event=>{const rect=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))dialog.close();}));
$$('.editor-tabs button').forEach((button,index)=>{button.addEventListener('click',()=>activatePanel(button.dataset.panel));button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const buttons=$$('.editor-tabs button');const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;activatePanel(buttons[next].dataset.panel,true);}});});
$('#add-project').addEventListener('click',()=>{collectDraft();if(draft.projects.length>=30)return editorMessage('最多添加 30 个项目。',true);draft.projects.push({id:`project-${crypto.randomUUID()}`,title:'新项目',category:'项目',year:'',summary:'',description:'',tags:[],url:'',visual:'orb'});renderProjectEditors();$('#project-edit-list .item-editor:last-child input').focus();});
$('#add-note').addEventListener('click',()=>{collectDraft();if(draft.notes.length>=50)return editorMessage('最多添加 50 篇文章。',true);draft.notes.push({title:'新的记录',date:new Date().toISOString().slice(0,10),body:'',url:''});renderNoteEditors();$('#note-edit-list .item-editor:last-child input').focus();});
form.noValidate=true;
form.addEventListener('submit',async event=>{
  event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  try {
    collectDraft();const next=normalizeContent(draft);let browserSaved=true;
    if(canWrite){const response=await fetch('./api/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});const result=await response.json();if(!response.ok)throw new Error(result.error||'写入配置文件失败。');fileContent=clone(next);}
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{browserSaved=false;}
    if(!browserSaved&&!canWrite)throw new Error('浏览器存储不可用。请先导出资料保存备份。');
    content=next;draft=clone(next);render();editorMessage(canWrite?'已保存到 content.json，主页已更新。':'已保存到当前浏览器。请导出资料备份，以便更新正式网站。');toast(canWrite?'资料已写入文件并更新':'资料已保存到此浏览器');
  }catch(error){editorMessage(error.message,true);}finally{submit.disabled=false;}
});
$('#export-content').addEventListener('click',()=>{
  try{collectDraft();const data=normalizeContent(draft);const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});const href=URL.createObjectURL(blob);const link=el('a');link.href=href;link.download='content.json';link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);editorMessage('已导出当前草稿。可以用该文件替换网站的 content.json。');}catch(error){editorMessage(error.message,true);}
});
$('#import-content').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{if(file.size>1_000_000)throw new Error('资料文件不能超过 1 MB。');draft=normalizeContent(JSON.parse(await file.text()));populateEditor();activatePanel('profile');editorMessage('资料已读入草稿。点击「保存并更新主页」后生效。');}catch(error){editorMessage(`导入失败：${error.message}`,true);}finally{event.target.value='';}
});
$('#reset-content').addEventListener('click',()=>{draft=clone(fileContent);populateEditor();editorMessage('已将文件中的资料载入草稿。保存后生效。');});

let reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const preference=localStorage.getItem('nightshift.motion');if(preference!==null)reduced=preference==='reduced';}catch{}
function updateMotion(){document.body.classList.toggle('motion-reduced',reduced);$('#motion-toggle').setAttribute('aria-pressed',String(reduced));$('#motion-toggle span').textContent=reduced?'OFF':'ON';scenery?.setReduced(reduced);}
updateMotion();
$('#motion-toggle').addEventListener('click',()=>{reduced=!reduced;try{localStorage.setItem('nightshift.motion',reduced?'reduced':'full');}catch{}updateMotion();});
async function launchGame(){
  if(gameDialog.open)return;
  gameDialog.showModal();scenery?.setPaused(true);
  try{if(!game){gameLoading??=import('./game.js');const {createGame}=await gameLoading;game=createGame();}game.open();}catch(error){$('#game-error').hidden=false;$('#game-error').textContent='赛车暂时无法启动。请确认浏览器支持 WebGL，刷新后重试。主页内容仍可正常使用。';console.warn('Game initialization:',error);}
}
$$('.launch-game').forEach(button=>button.addEventListener('click',launchGame));
$('#game-exit').addEventListener('click',()=>gameDialog.close());
gameDialog.addEventListener('close',()=>{game?.close();scenery?.setPaused(false);});
document.addEventListener('keydown',event=>{const editing=event.target.closest('input, textarea, select, [contenteditable="true"]');if(!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key.toLowerCase()==='g'&&!document.querySelector('dialog[open]')){event.preventDefault();launchGame();}});

async function init(){
  try{
    const [file,capabilities]=await Promise.all([fetch('./content.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('无法读取 content.json');return response.json();}),['127.0.0.1','localhost'].includes(location.hostname)?fetch('./api/local-config',{headers:{Accept:'application/json'}}).then(response=>response.ok?response.json():null).catch(()=>null):Promise.resolve(null)]);
    canWrite=capabilities?.canWrite===true;fileContent=normalizeContent(file);content=clone(fileContent);
    if(!canWrite){try{const cached=localStorage.getItem(STORAGE_KEY);if(cached)content=normalizeContent(JSON.parse(cached));}catch{toast('浏览器中的旧资料无法读取，已使用配置文件。');}}
    if(canWrite)$('#editor-mode').textContent='本地编辑模式：保存会直接写入项目中的 dist/content.json。所有访客使用这份配置文件。';
    else{$('#editor-mode').textContent='修改先保存到当前浏览器。导出资料并提交到 GitHub 后，才能更新所有访客看到的公开版本。';form.querySelector('[type="submit"]').textContent='保存到此浏览器';$('#github-publish-help').hidden=false;}
    render();
  }catch(error){$('#hero-intro').textContent='资料暂时无法读取。请使用项目自带的启动方式运行，并检查 content.json 格式。';toast(error.message);console.error(error);}
  const start=()=>import('./visual.js').then(({createScenery})=>{scenery=createScenery($('#world-canvas'),{reduced});}).catch(error=>console.info('Static visual fallback:',error.message));
  if('requestIdleCallback'in window)requestIdleCallback(start,{timeout:1200});else setTimeout(start,150);
}
init();
