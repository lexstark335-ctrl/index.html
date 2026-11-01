export const RULES=Object.freeze({lanes:[-4.5,-1.5,1.5,4.5],minX:-4.85,maxX:4.85,playerZ:7,spawnZ:-105,collisionX:1.62,collisionZ:3.2,boostDuration:2.4,boostCooldown:5.5});
export function collision(playerX,trafficX,trafficZ){return Math.abs(playerX-trafficX)<RULES.collisionX&&Math.abs(RULES.playerZ-trafficZ)<RULES.collisionZ;}
export function createState(){return {phase:'intro',score:0,speed:23,x:1.5,steer:0,boost:0,cooldown:0,elapsed:0,spawn:1.1,combo:0,comboTime:0};}
export function boost(state){if(state.phase!=='running'||state.boost>0||state.cooldown>0)return false;state.boost=RULES.boostDuration;return true;}
export function tick(state,dt,direction){
  if(state.phase!=='running')return;
  dt=Math.min(.05,Math.max(0,dt));state.elapsed+=dt;
  if(state.boost>0){state.boost=Math.max(0,state.boost-dt);if(state.boost===0)state.cooldown=RULES.boostCooldown;}else state.cooldown=Math.max(0,state.cooldown-dt);
  const target=Math.min(52,23+state.elapsed*.3)+(state.boost>0?18:0);state.speed+=(target-state.speed)*Math.min(1,dt*2.7);
  const turn=Math.max(-1,Math.min(1,direction))*8.3;state.steer+=(turn-state.steer)*Math.min(1,dt*9);
  state.x=Math.max(RULES.minX,Math.min(RULES.maxX,state.x+state.steer*dt));state.score+=dt*state.speed*1.65;
  state.comboTime=Math.max(0,state.comboTime-dt);if(!state.comboTime)state.combo=0;state.spawn-=dt;
}
export function awardPass(state,distance){if(distance>=3.15)return 0;state.combo=state.comboTime>0?state.combo+1:1;state.comboTime=3.5;const award=Math.round((distance<2.2?85:40)*Math.min(2.5,1+state.combo*.15));state.score+=award;return award;}
