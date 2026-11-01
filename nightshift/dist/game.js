import {createWorld,makeCar} from './world.js?v=20261101-gridfix';
import {RULES,collision,createState,boost,tick,awardPass} from './game-model.js';
const $=selector=>document.querySelector(selector);
const BEST_KEY='nightshift.racer.best.v1';
export function createGame(){
  let canvas=$('#game-canvas');const world=createWorld(canvas,{game:true});canvas=world.canvas;$('#game-dialog').dataset.renderMode=world.renderMode;const player=makeCar({body:0x57327a,trim:0xeaa2e0});world.scene.add(player);
  const traffic=Array.from({length:8},(_,index)=>{const mesh=makeCar({body:[0x263d57,0x51416d,0x574454,0x324c4d][index%4],trim:index%2?0xe8b2ff:0x8ad6db,traffic:true});mesh.visible=false;world.scene.add(mesh);return{mesh,active:false,lane:0,z:0};});
  let state=createState(),best=0,opened=false,raf=0,last=0,elapsed=0,sound=false,audio,popTimer,lastScore=-1,lastSpeed=-1,lastBoost='',saved=true;
  const keys={left:false,right:false};const touch={left:false,right:false};
  try{best=Math.max(0,Number(localStorage.getItem(BEST_KEY))||0);}catch{}
  $('#game-best').textContent=String(Math.floor(best)).padStart(6,'0');
  world.camera.position.set(1.5,3.7,16);world.camera.lookAt(0,.8,-28);player.position.set(state.x,0,RULES.playerZ);
  const resetInputs=()=>{keys.left=false;keys.right=false;touch.left=false;touch.right=false;$('#steer-left').classList.remove('held');$('#steer-right').classList.remove('held');};
  function note(frequency=440,duration=.09,type='sine',volume=.04){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(Math.max(60,frequency*.5),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);}catch{}}
  function pop(message){$('#game-pop').textContent=message;clearTimeout(popTimer);popTimer=setTimeout(()=>$('#game-pop').textContent='',1100);}
  function overlay(title,status,button){$('#game-overlay').hidden=false;$('#game-title').replaceChildren(document.createTextNode(title));$('#game-status').textContent=status+(world.renderMode==='canvas'?'\n已启用兼容画面，操作和计分保持一致。':'');$('#game-start').textContent=button;}
  function ui(){const score=Math.floor(state.score),speed=Math.round(state.speed*4.2);if(score!==lastScore){lastScore=score;$('#game-score').textContent=String(score).padStart(6,'0');}if(speed!==lastSpeed){lastSpeed=speed;$('#game-speed').textContent=String(speed).padStart(3,'0');}
    const status=state.boost>0?'active':state.cooldown>0?'cooldown':'ready';const label=status==='active'?`加速 ${state.boost.toFixed(1)}s`:status==='cooldown'?`冷却 ${state.cooldown.toFixed(1)}s`:'BOOST';if(lastBoost!==label){lastBoost=label;$('#game-boost span').textContent=label;}$('#game-boost').disabled=state.phase!=='running'||status!=='ready';$('#game-boost').classList.toggle('active',status==='active');$('#game-pause').textContent=state.phase==='paused'?'继续 P':'暂停 P';$('#game-pause').disabled=!['running','paused'].includes(state.phase);
  }
  function begin(){state=createState();state.phase='running';saved=false;traffic.forEach(item=>{item.active=false;item.mesh.visible=false;});resetInputs();$('#game-overlay').hidden=true;$('#game-pop').textContent='';clearTimeout(popTimer);last=0;lastScore=-1;ui();schedule();note(660,.13);}
  function saveBest(){if(saved)return;saved=true;if(state.score>best){best=Math.floor(state.score);try{localStorage.setItem(BEST_KEY,String(best));}catch{}$('#game-best').textContent=String(best).padStart(6,'0');}}
  function finish(){state.phase='over';resetInputs();saveBest();note(130,.3,'sawtooth',.035);overlay('夜行结束',`本次得分 ${Math.floor(state.score)} · 最高纪录 ${best}\n下一次，也许能走得更远。`,'再来一局 ↗');ui();}
  function pause(){if(state.phase!=='running')return;state.phase='paused';resetInputs();overlay('暂停一下', '公路会等你。准备好后，继续向前。','继续夜行 ↗');ui();}
  function resume(){if(state.phase!=='paused')return;state.phase='running';$('#game-overlay').hidden=true;last=0;ui();schedule();}
  function spawn(){const item=traffic.find(item=>!item.active);if(!item)return;
    const occupied=new Set(traffic.filter(item=>item.active&&item.z<RULES.spawnZ+28).map(item=>item.lane));const lanes=RULES.lanes.filter(x=>!occupied.has(x));if(!lanes.length)return;
    const lane=lanes[Math.floor(Math.random()*lanes.length)];item.active=true;item.lane=lane;item.z=RULES.spawnZ;item.mesh.position.set(lane,0,item.z);item.mesh.visible=true;
  }
  function activateBoost(){if(boost(state)){note(270,.28,'triangle',.05);pop('↯ BOOST');}}
  function update(dt){
    const direction=(keys.right||touch.right?1:0)-(keys.left||touch.left?1:0);tick(state,dt,direction);
    player.position.x=state.x;player.position.y=Math.sin(elapsed*13)*.013;player.rotation.y=-state.steer*.035;player.rotation.z=-state.steer*.014;
    if(state.spawn<=0){spawn();state.spawn=Math.max(.7,1.65-state.elapsed*.009)+Math.random()*.28;}
    for(const marker of world.markers){marker.position.z+=state.speed*dt;if(marker.position.z>28)marker.position.z-=168;}
    for(const item of traffic){if(!item.active)continue;item.z+=state.speed*.85*dt;item.mesh.position.z=item.z;if(collision(state.x,item.lane,item.z)){finish();return;}if(item.z>RULES.playerZ+4){item.active=false;item.mesh.visible=false;const award=awardPass(state,Math.abs(state.x-item.lane));if(award){note(840,.07);pop(`擦肩而过 +${award}${state.combo>1?` / COMBO ${state.combo}`:''}`);}}}
    const cameraX=state.x*.27;world.camera.position.x+=(cameraX-world.camera.position.x)*Math.min(1,dt*4);world.camera.position.y=3.65+Math.sin(elapsed*3)*.015;world.camera.lookAt(state.x*.24,.7,-30);
    const targetFov=state.boost>0?69:59;world.camera.fov+=(targetFov-world.camera.fov)*Math.min(1,dt*3);world.camera.updateProjectionMatrix();ui();
  }
  function animate(now){raf=0;if(!opened||document.hidden||world.lost)return;const dt=Math.min(.05,last?(now-last)/1000:1/60);last=now;elapsed+=dt;
    if(state.phase==='running')update(dt);world.renderer.render(world.scene,world.camera);
    if(state.phase==='running')raf=requestAnimationFrame(animate);
  }
  function schedule(){if(raf)cancelAnimationFrame(raf);raf=0;if(opened&&!document.hidden&&!world.lost)raf=requestAnimationFrame(animate);}
  $('#game-start').addEventListener('click',()=>state.phase==='paused'?resume():begin());$('#game-boost').addEventListener('click',activateBoost);$('#game-pause').addEventListener('click',()=>state.phase==='running'?pause():resume());
  $('#game-sound').addEventListener('click',()=>{sound=!sound;$('#game-sound').textContent=`音效 ${sound?'ON':'OFF'}`;$('#game-sound').setAttribute('aria-pressed',String(sound));$('#game-sound').setAttribute('aria-label',sound?'关闭游戏音效':'开启游戏音效');if(sound)note(660,.1);});
  function bindTouch(button,direction){button.addEventListener('pointerdown',event=>{if(state.phase!=='running')return;event.preventDefault();button.setPointerCapture(event.pointerId);touch[direction]=true;button.classList.add('held');});const release=()=>{touch[direction]=false;button.classList.remove('held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);}
  bindTouch($('#steer-left'),'left');bindTouch($('#steer-right'),'right');
  document.addEventListener('keydown',event=>{if(!opened)return;const key=event.key.toLowerCase();if(['arrowleft','arrowright','arrowup','a','d','w','p',' ','enter'].includes(key))event.preventDefault();if(key==='a'||key==='arrowleft')keys.left=true;if(key==='d'||key==='arrowright')keys.right=true;if((key==='w'||key==='arrowup')&&!event.repeat)activateBoost();if((key==='p'||key===' ')&&!event.repeat){if(state.phase==='running')pause();else if(state.phase==='paused')resume();}if(key==='enter'&&!event.repeat){if(['intro','over'].includes(state.phase))begin();else if(state.phase==='paused')resume();}});
  document.addEventListener('keyup',event=>{if(!opened)return;const key=event.key.toLowerCase();if(key==='a'||key==='arrowleft')keys.left=false;if(key==='d'||key==='arrowright')keys.right=false;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();if(raf)cancelAnimationFrame(raf);raf=0;}else if(opened){last=0;schedule();}});window.addEventListener('blur',()=>{if(opened)pause();});
  canvas.addEventListener('renderlost',()=>{pause();$('#game-error').textContent='图形上下文已暂停。请退出游戏并刷新页面后重试。';$('#game-error').hidden=false;});
  const resizeObserver=new ResizeObserver(()=>{world.resize();if(opened&&state.phase!=='running'&&!world.lost)world.renderer.render(world.scene,world.camera);});resizeObserver.observe(canvas);
  return{open(){opened=true;state=createState();resetInputs();traffic.forEach(item=>{item.active=false;item.mesh.visible=false;});player.position.set(state.x,0,RULES.playerZ);player.rotation.set(0,0,0);world.camera.position.set(1.5,3.7,16);world.camera.fov=59;world.camera.updateProjectionMatrix();world.camera.lookAt(0,.8,-28);overlay('霓虹夜行','握紧方向，驶向未知。\n避开来车，刷新属于你的夜行纪录。','开始夜行 ↗');world.resize();ui();schedule();},close(){saveBest();opened=false;state.phase='intro';resetInputs();clearTimeout(popTimer);if(raf)cancelAnimationFrame(raf);raf=0;audio?.suspend();}};
}
