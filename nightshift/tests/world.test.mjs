import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrid,createWorldScene,createWorld,makeCar} from '../dist/world.js';

test('neon grid is a scene object with line geometry and material',()=>{
  const grid=createGrid(24,8);
  assert.equal(grid.isObject3D,true);assert.equal(grid.isLineSegments,true);
  assert.ok(grid.material.isLineBasicMaterial);assert.equal(grid.geometry.attributes.position.count,36);
  grid.position.set(0,-.05,-65);grid.material.opacity=.31;
  assert.equal(grid.position.z,-65);grid.geometry.dispose();grid.material.dispose();
});

test('unavailable WebGL starts a drawable compatibility canvas instead of failing',()=>{
  const originalGlobals=new Map(['window','document','ResizeObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  let draws=0,replaced=false;
  const gradient={addColorStop(){}};
  const context=new Proxy({}, {get(target,key){if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;return typeof target[key]!=='undefined'?target[key]:(...args)=>{draws++;};},set(target,key,value){target[key]=value;return true;}});
  const active={clientWidth:800,clientHeight:500,width:800,height:500,getContext(type){return type==='2d'?context:null;},addEventListener(){}};
  const original={...active,style:{},getContext(){throw new Error('WebGL disabled in this test');},cloneNode(){return active;},replaceWith(node){assert.equal(node,active);replaced=true;}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:{devicePixelRatio:1}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){return{width:2,height:256,getContext(){return context;}};}}});
  Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:class{observe(){}disconnect(){}}});
  let world;
  try{
    world=createWorld(original,{game:true});
    assert.equal(replaced,true);assert.equal(world.canvas,active);assert.equal(world.renderMode,'canvas');
    const player=makeCar();player.position.set(1.5,0,7);world.scene.add(player);
    world.renderer.render(world.scene,world.camera);assert.ok(draws>100);
    assert.equal(active.width,800);assert.equal(active.height,500);
  }finally{world?.dispose();for(const[key,descriptor]of originalGlobals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});

for(const game of [false,true])test(`${game?'racing':'homepage'} scene initializes with a movable grid, road and vehicles`,()=>{
  const world=createWorldScene({game});
  try{
    assert.equal(world.scene.isScene,true);assert.equal(world.camera.isPerspectiveCamera,true);
    assert.equal(world.grid.parent,world.scene);assert.ok(world.grid.material);
    assert.equal(world.markers.length,84);assert.equal(world.rails.length,2);
    const player=makeCar();player.position.set(1.5,0,7);world.scene.add(player);
    for(let i=0;i<8;i++)world.scene.add(makeCar({traffic:true}));
    world.scene.updateMatrixWorld(true);
    let meshes=0;world.scene.traverse(object=>{if(object.isMesh){meshes++;assert.ok(object.geometry);assert.ok(object.material);}});
    assert.ok(meshes>200);
    assert.ok(world.grid.geometry.attributes.position.array.every(Number.isFinite));
  }finally{world.dispose();}
});
