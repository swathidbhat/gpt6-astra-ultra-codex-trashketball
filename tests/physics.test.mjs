import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {advanceBall,basketFor,FIXED_STEP,launchVelocity,newBall,predict,integrate} from '../lib/physics.ts';
const origin=new Vector3(0,1.3,4.8);
function simulate(ball,basket,seconds=4){let awards=0;for(let i=0;i<seconds/FIXED_STEP;i++)if(advanceBall(ball,FIXED_STEP,basket).scored)awards++;return awards;}
test('both default shots land inside their baskets and score exactly once',()=>{for(const [level,yaw,power] of [[1,0,58],[2,4.7,69]]){const b=newBall(origin,launchVelocity(yaw,46,power));assert.equal(simulate(b,basketFor(level)),1);}});
test('visible trajectory is the exact physical path through entry',()=>{const velocity=launchVelocity(0,46,58),basket=basketFor(1),preview=predict(origin,velocity,basket),ball=newBall(origin,velocity);assert.equal(preview.success,true);let p=0;for(let i=0;i<300;i++){const result=advanceBall(ball,FIXED_STEP,basket);if(i%5===0)assert.ok(ball.position.distanceTo(preview.points[p++])<1e-12);if(result.scored)break;}});
test('gravity plus drag integration is independent of render frame rate',()=>{const velocity=launchVelocity(7,53,71);const baseline=origin.clone();integrate(baseline,velocity.clone(),1);for(const fps of [30,60,144]){const p=origin.clone(),v=velocity.clone();for(let i=0;i<fps;i++)integrate(p,v,1/fps);assert.ok(p.distanceTo(baseline)<1e-10);}});
test('upward crossings and outside misses award no points',()=>{const b=basketFor(1);assert.equal(simulate(newBall(new Vector3(0,.4,0),new Vector3(0,2,0)),b,.12),0);assert.equal(simulate(newBall(new Vector3(1.5,1.4,0),new Vector3(0,-3,0)),b),0);});
test('a fast rim strike collides instead of tunnelling into a score',()=>{const basket=basketFor(1),ball=newBall(new Vector3(basket.radius,1.1,0),new Vector3(0,-60,0));let hit=false,awards=0;for(let i=0;i<8;i++){const r=advanceBall(ball,FIXED_STEP,basket);hit ||= r.hit;awards+=r.scored?1:0;}assert.equal(hit,true);assert.equal(awards,0);assert.ok(ball.velocity.y>0);});
test('a ball that never rose above the rim cannot score',()=>{const b=basketFor(1),ball=newBall(new Vector3(0,b.height+.001,0),new Vector3(0,-1,0));assert.equal(simulate(ball,b,1),0);});
