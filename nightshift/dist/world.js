import * as T from './vendor/three.js';
import {createCanvasRenderer} from './canvas-renderer.js';
export { T };

export function makeCar({body=0x693c8a,trim=0xf6a2dd,traffic=false}={}) {
  const group=new T.Group();
  Object.assign(group.userData,{racerVehicle:true,bodyColor:body,trimColor:trim,traffic});
  const shell=new T.MeshStandardMaterial({color:body,roughness:.42,metalness:.5});
  const dark=new T.MeshStandardMaterial({color:0x13101e,roughness:.5,metalness:.2});
  const glass=new T.MeshStandardMaterial({color:0x352d52,emissive:0x211334,metalness:.7,roughness:.2});
  const light=new T.MeshBasicMaterial({color:trim});
  const red=new T.MeshBasicMaterial({color:0xff5b98});
  function box(w,h,d,x,y,z,material=shell,edge=false){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh);if(edge){const lines=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:trim,transparent:true,opacity:.7}));mesh.add(lines);}return mesh;}
  box(1.95,.42,3.9,0,.48,0,shell,true);
  box(1.8,.18,1.15,0,.72,-1.17,shell,true);
  const cabin=box(1.48,.48,1.48,0,.91,.17,glass,true);cabin.rotation.x=-.08;
  box(1.5,.07,1.45,0,1.2,.19,shell);
  box(2.05,.12,.2,0,.32,1.97,dark);
  box(2,.1,.36,0,.98,1.62,dark,true);
  for(const x of [-.7,.7]){box(.1,.35,.15,x,.8,1.61,dark);box(.48,.11,.055,x,.58,1.98,red);box(.5,.10,.06,x,.55,-1.98,light);}
  box(1.86,.035,.05,0,.42,2,red);box(1.86,.025,.05,0,.4,-2,light);
  for(const x of [-1,1])for(const z of [-1.2,1.2]){
    const tire=new T.Mesh(new T.CylinderGeometry(.34,.34,.27,10),dark);tire.rotation.z=Math.PI/2;tire.position.set(x,.34,z);group.add(tire);
    const ring=new T.Mesh(new T.TorusGeometry(.2,.025,5,14),light);ring.rotation.y=Math.PI/2;ring.position.set(x*1.15,.34,z);group.add(ring);
  }
  if(!traffic){
    const glow=new T.Mesh(new T.PlaneGeometry(3.4,5.7),new T.MeshBasicMaterial({color:trim,transparent:true,opacity:.09,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));glow.rotation.x=-Math.PI/2;glow.position.y=.018;group.add(glow);
    const tail=new T.PointLight(trim,5,9,2);tail.position.set(0,.4,1.8);group.add(tail);
  }
  return group;
}
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function createGrid(size=230,divisions=92){
  const points=[];const half=size/2;
  for(let index=0;index<=divisions;index++){
    const offset=-half+index*size/divisions;
    points.push(-half,0,offset,half,0,offset,offset,0,-half,offset,0,half);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
  const material=new T.LineBasicMaterial({color:0x723f83,transparent:true,opacity:.31});
  const grid=new T.LineSegments(geometry,material);grid.name='neon-ground-grid';return grid;
}
function disposeScene(scene){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  if(scene.background?.isTexture)textures.add(scene.background);
  scene.traverse(item=>{if(item.geometry)geometries.add(item.geometry);if(item.material)for(const material of Array.isArray(item.material)?item.material:[item.material]){materials.add(material);if(material.map)textures.add(material.map);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
export function createWorldScene({game=false}={}) {
  const scene=new T.Scene();
  scene.background=new T.Color(0x180f22);
  const camera=new T.PerspectiveCamera(game?59:47,1,.1,220);
  scene.add(new T.HemisphereLight(0xdfb7ff,0x170c25,2));const key=new T.DirectionalLight(0xffb1dc,2.5);key.position.set(8,12,8);scene.add(key);
  const ground=new T.Mesh(new T.PlaneGeometry(240,250),new T.MeshBasicMaterial({color:0x160f24}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.09,-70);scene.add(ground);
  const grid=createGrid();grid.position.set(0,-.05,-65);scene.add(grid);
  const roadCenter=game?0:4;
  const road=new T.Mesh(new T.PlaneGeometry(12,220),new T.MeshBasicMaterial({color:0x12101f}));road.rotation.x=-Math.PI/2;road.position.set(roadCenter,-.025,-75);scene.add(road);
  const rails=[];for(const x of [-6,6]){const mesh=new T.Mesh(new T.BoxGeometry(.08,.075,220),new T.MeshBasicMaterial({color:x<0?0xe78bcc:0xb997ed}));mesh.position.set(roadCenter+x,.03,-75);scene.add(mesh);rails.push(mesh);}
  const markers=[];const markerGeometry=new T.BoxGeometry(.055,.025,2.2);const markerMaterial=new T.MeshBasicMaterial({color:0x9b71b8});
  for(let z=-135;z<30;z+=6)for(const x of [-3,0,3]){const mesh=new T.Mesh(markerGeometry,markerMaterial);mesh.name='lane-marker';mesh.position.set(roadCenter+x,.005,z);scene.add(mesh);markers.push(mesh);}
  const city=new T.Group();const random=seeded(4921);const windows=new T.MeshBasicMaterial({color:0xb577bb,transparent:true,opacity:.55});
  const bodyMat=new T.MeshBasicMaterial({color:0x1c142b});
  for(let i=0;i<44;i++){
    const side=i%2===0?-1:1;const x=side*(8+random()*31)+roadCenter;const z=-12-random()*115;const h=3+random()*18;const width=2+random()*3.3;const depth=2+random()*4;
    const geometry=new T.BoxGeometry(width,h,depth);const mesh=new T.Mesh(geometry,bodyMat);mesh.position.set(x,h/2,z);city.add(mesh);
    const edge=new T.LineSegments(new T.EdgesGeometry(geometry),new T.LineBasicMaterial({color:i%4===0?0x9968bc:0x5c355e,transparent:true,opacity:.6}));mesh.add(edge);
    const stripe=new T.Mesh(new T.BoxGeometry(.045,h*.73,.05),windows);stripe.position.set(x-width*.22,h*.53,z+depth/2+.04);city.add(stripe);
    if(i%3===0){const sign=new T.Mesh(new T.BoxGeometry(width*.6,.12,.05),new T.MeshBasicMaterial({color:i%2?0xec82b5:0xd3a2fa}));sign.position.set(x,h*.7,z+depth/2+.08);city.add(sign);}
  }
  scene.add(city);
  const sun=new T.Group();const disc=new T.Mesh(new T.CircleGeometry(9,64),new T.MeshBasicMaterial({color:0xc969a5,transparent:true,opacity:.9}));sun.add(disc);
  for(let i=0;i<9;i++){const y=-8+i*1.13;const width=Math.sqrt(81-y*y)*2;const cut=new T.Mesh(new T.PlaneGeometry(width,.18+(9-i)*.035),new T.MeshBasicMaterial({color:0x49244c}));cut.position.set(0,y,.025);sun.add(cut);}
  sun.position.set(game?0:10,10,-95);scene.add(sun);
  return {scene,camera,markers,rails,grid,city,sun,dispose(){disposeScene(scene);}};
}
export function createWorld(canvas,{game=false}={}) {
  const environment=createWorldScene({game});const {scene,camera}=environment;
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:game?'high-performance':'low-power'});}
  catch(cause){
    if(game){
      const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;
      try{renderer=createCanvasRenderer(canvas);}catch{environment.dispose();const error=new Error('当前浏览器无法创建游戏画面。',{cause});error.code='GRAPHICS_UNAVAILABLE';throw error;}
    }else{environment.dispose();const error=new Error('当前浏览器无法创建 WebGL 2 图形上下文。',{cause});error.code='WEBGL_UNAVAILABLE';throw error;}
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,game?1.6:1.4));
  const gradient=document.createElement('canvas');gradient.width=2;gradient.height=256;const ctx=gradient.getContext('2d');
  if(ctx){const g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'#110c22');g.addColorStop(.6,'#4a254c');g.addColorStop(1,'#180f22');ctx.fillStyle=g;ctx.fillRect(0,0,2,256);scene.background=new T.CanvasTexture(gradient);}
  function resize(){const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  let lost=false;canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.dispatchEvent(new CustomEvent('renderlost'));});
  return {...environment,canvas,renderer,renderMode:renderer.isCanvasRenderer?'canvas':'webgl',resize,get lost(){return lost;},dispose(){observer.disconnect();environment.dispose();renderer.dispose();}};
}
