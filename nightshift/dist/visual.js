import {createWorld,makeCar} from './world.js';
export function createScenery(canvas,{reduced=false}={}) {
  if(!canvas)return null;
  const world=createWorld(canvas);const car=makeCar();car.position.set(6.1,0,3);car.rotation.y=-.14;world.scene.add(car);
  let paused=false,frame=0,last=0,visible=true,elapsed=0;
  function positionCamera(){const mobile=canvas.clientWidth<760;world.camera.position.set(mobile?9:11,mobile?6.8:6, mobile?23:21);world.camera.lookAt(mobile?1:1.5,.8,-17);}
  positionCamera();
  function render(){positionCamera();world.renderer.render(world.scene,world.camera);canvas.classList.add('ready');}
  function animate(now){frame=0;if(paused||document.hidden||!visible||world.lost)return;const dt=Math.min(.05,last?(now-last)/1000:0);last=now;elapsed+=dt;if(!reduced){car.position.y=Math.sin(elapsed*1.5)*.025;for(const marker of world.markers){marker.position.z+=dt*1.1;if(marker.position.z>30)marker.position.z-=168;}}render();if(!reduced)frame=requestAnimationFrame(animate);}
  function refresh(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(!paused&&!document.hidden&&visible&&!world.lost)frame=requestAnimationFrame(animate);}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;refresh();});observer.observe(canvas);
  const sizeObserver=new ResizeObserver(()=>{world.resize();if(!paused&&!world.lost)render();});sizeObserver.observe(canvas);
  document.addEventListener('visibilitychange',refresh);canvas.addEventListener('renderlost',()=>{canvas.classList.remove('ready');if(frame)cancelAnimationFrame(frame);});
  refresh();
  return{setReduced(value){reduced=value;refresh();},setPaused(value){paused=value;refresh();},dispose(){if(frame)cancelAnimationFrame(frame);observer.disconnect();sizeObserver.disconnect();document.removeEventListener('visibilitychange',refresh);world.dispose();}};
}
