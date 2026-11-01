// Canvas compatibility renderer. It reads the same scene vehicles and positions
// as the WebGL renderer, so scoring, controls and collisions stay identical.
export function createCanvasRenderer(canvas){
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas drawing is unavailable.');
  let width=1,height=1,ratio=1;
  const color=value=>'#'+value.toString(16).padStart(6,'0');
  function polygon(points,fill,stroke){ctx.beginPath();points.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function render(scene,camera){
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const horizon=height*.31,vanish=width/2-camera.position.x*4;
    const focal=height*.94*(59/camera.fov);
    const project=(x,z)=>{const scale=focal/Math.max(3,18-z);return{x:vanish+x*scale,y:horizon+4.3*scale,scale};};
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#100b22');sky.addColorStop(.43,'#542448');sky.addColorStop(1,'#100b1d');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const sunRadius=Math.min(width*.12,height*.15);ctx.save();ctx.beginPath();ctx.arc(vanish,horizon-height*.055,sunRadius,0,Math.PI*2);ctx.clip();ctx.fillStyle='#d576ad';ctx.fillRect(vanish-sunRadius,horizon-height*.055-sunRadius,sunRadius*2,sunRadius*2);ctx.fillStyle='#4b2347';for(let n=0;n<9;n++)ctx.fillRect(vanish-sunRadius,horizon-height*.055+n*sunRadius*.14,sunRadius*2,2+n*.45);ctx.restore();
    for(let i=0;i<30;i++){
      const x=(i/29)*width;const towerW=width*(.022+(i%4)*.009);const towerH=height*(.07+((i*7)%11)*.009);
      ctx.fillStyle=i%3?'#1a1229':'#25172f';ctx.fillRect(x-towerW/2,horizon-towerH,towerW,towerH+height*.08);ctx.strokeStyle='#704271';ctx.lineWidth=.7;ctx.strokeRect(x-towerW/2,horizon-towerH,towerW,towerH+height*.08);
      ctx.fillStyle=i%2?'#c587c4':'#8c68b7';ctx.fillRect(x-towerW*.23,horizon-towerH*.7,Math.max(1,towerW*.04),towerH*.55);
    }
    ctx.fillStyle='#160e24';ctx.fillRect(0,horizon+height*.04,width,height);
    const markers=scene.children.filter(item=>item.name==='lane-marker');const phase=(markers[0]?.position.z??0)%6;
    ctx.strokeStyle='#754780';ctx.lineWidth=.8;
    for(let x=-36;x<=36;x+=3){const a=project(x,-160),b=project(x,13);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(let z=-125+phase;z<14;z+=6){const p=project(0,z);ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(width,p.y);ctx.stroke();}
    const farLeft=project(-6,-160),farRight=project(6,-160),nearLeft=project(-6,13),nearRight=project(6,13);
    polygon([[farLeft.x,farLeft.y],[farRight.x,farRight.y],[nearRight.x,nearRight.y],[nearLeft.x,nearLeft.y]],'#100e1c');
    for(const x of [-6,6]){const a=project(x,-160),b=project(x,13);ctx.strokeStyle=x<0?'#fa91d1':'#bc9bef';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(const marker of markers){if(marker.position.z>12)continue;const p=project(marker.position.x,marker.position.z),q=project(marker.position.x,marker.position.z+2.2);ctx.strokeStyle='#9874b3';ctx.lineWidth=Math.max(1,p.scale*.035);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
    const vehicles=scene.children.filter(item=>item.visible&&item.userData.racerVehicle).sort((a,b)=>a.position.z-b.position.z);
    for(const vehicle of vehicles){
      const p=project(vehicle.position.x,vehicle.position.z);const w=p.scale*2.25,h=p.scale*1.38,steer=vehicle.rotation.y*w*.3;
      if(p.y<0||p.y>height+h)continue;ctx.lineWidth=Math.max(1,p.scale*.018);
      const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,w);glow.addColorStop(0,'#e47fc444');glow.addColorStop(1,'#e47fc400');ctx.fillStyle=glow;ctx.fillRect(p.x-w,p.y-w,w*2,w*2);
      const body=color(vehicle.userData.bodyColor),trim=color(vehicle.userData.trimColor);
      polygon([[p.x-w*.5,p.y-h*.1],[p.x-w*.46,p.y-h*.57],[p.x+w*.46,p.y-h*.57],[p.x+w*.5,p.y-h*.1]],body,trim);
      polygon([[p.x-w*.39,p.y-h*.57],[p.x-w*.25+steer,p.y-h*.93],[p.x+w*.25+steer,p.y-h*.93],[p.x+w*.39,p.y-h*.57]],'#33233e',trim);
      polygon([[p.x-w*.29,p.y-h*.6],[p.x-w*.21+steer,p.y-h*.84],[p.x+w*.21+steer,p.y-h*.84],[p.x+w*.29,p.y-h*.6]],'#16142b','#8c6d9f');
      ctx.fillStyle='#0a0911';ctx.fillRect(p.x-w*.49,p.y-h*.16,w*.16,h*.18);ctx.fillRect(p.x+w*.33,p.y-h*.16,w*.16,h*.18);
      ctx.fillStyle='#ff85bc';ctx.fillRect(p.x-w*.4,p.y-h*.3,w*.27,Math.max(2,h*.06));ctx.fillRect(p.x+w*.13,p.y-h*.3,w*.27,Math.max(2,h*.06));
      ctx.strokeStyle=trim;ctx.beginPath();ctx.moveTo(p.x-w*.47,p.y-h*.45);ctx.lineTo(p.x+w*.47,p.y-h*.45);ctx.stroke();
    }
  }
  return{isCanvasRenderer:true,setPixelRatio(value){ratio=value;},setSize(w,h){width=w;height=h;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);},render,dispose(){ctx.clearRect(0,0,canvas.width,canvas.height);}};
}
