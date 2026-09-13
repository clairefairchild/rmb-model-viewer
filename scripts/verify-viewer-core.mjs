import assert from 'node:assert/strict';
import {
  METERS_TO_INCHES,metersToInches,formatInches,closestPointOnSegment2D,chooseSnapCandidate,
  initialMeasurementState,reduceMeasurement,initialShooterState,reduceShooter,
  normalizeWheelDelta,calculateWheelZoom,MAX_WHEEL_DELTA_PIXELS,
} from '../src/viewer-core.js';

assert.equal(METERS_TO_INCHES,39.37007874015748);
assert.equal(metersToInches(1),39.37007874015748);
assert.equal(formatInches(.3048),'12.0 in');
assert.throws(()=>metersToInches(Number.NaN),/finite/);

const closest=closestPointOnSegment2D({x:5,y:4},{x:0,y:0},{x:10,y:0});
assert.deepEqual(closest,{x:5,y:0,t:.5,distance:4});
const vertex={screen:{x:6,y:3},point:[1,2,3]};
const edge={a:{screen:{x:0,y:0}},b:{screen:{x:20,y:0}}};
assert.equal(chooseSnapCandidate({x:5,y:2},[vertex],[edge]).kind,'vertex','hard vertex wins inside tolerance');
const edgeSnap=chooseSnapCandidate({x:10,y:6},[],[edge]);
assert.equal(edgeSnap.kind,'edge');assert.equal(edgeSnap.t,.5);
assert.equal(chooseSnapCandidate({x:10,y:20},[],[edge]),null,'surface fallback is used outside snap tolerance');

let measure=initialMeasurementState();
measure=reduceMeasurement(measure,{type:'ENTER'});assert.equal(measure.active,true);
measure=reduceMeasurement(measure,{type:'PLACE',point:[0,0,0],id:'m1'});assert.deepEqual(measure.draft,[0,0,0]);
measure=reduceMeasurement(measure,{type:'PLACE',point:[1,0,0],id:'m1'});assert.equal(measure.measurements.length,1);assert.equal(measure.selectedId,'m1');assert.equal(measure.draft,null);
measure=reduceMeasurement(measure,{type:'DELETE_SELECTED'});assert.equal(measure.measurements.length,0);assert.equal(measure.selectedId,null);
measure=reduceMeasurement(measure,{type:'PLACE',point:[0,0,0],id:'m2'});measure=reduceMeasurement(measure,{type:'CANCEL'});assert.equal(measure.draft,null);
measure=reduceMeasurement(measure,{type:'EXIT'});assert.equal(measure.active,false);
measure=reduceMeasurement(measure,{type:'RESET'});assert.deepEqual(measure,initialMeasurementState(),'reload/reset semantics clear every in-memory measurement');

let shooter=initialShooterState();
shooter=reduceShooter(shooter,{type:'FIRE'});assert.equal(shooter.projectiles,0,'cannot fire outside Cheesy Experience');
shooter=reduceShooter(shooter,{type:'TOGGLE'});assert.equal(shooter.enabled,true);
shooter=reduceShooter(shooter,{type:'AIM',value:true});assert.equal(shooter.aiming,true);
for(let i=0;i<30;i++)shooter=reduceShooter(shooter,{type:'FIRE'});assert.equal(shooter.projectiles,24,'projectile lifecycle is capped');
for(let i=0;i<50;i++)shooter=reduceShooter(shooter,{type:'IMPACT'});assert.equal(shooter.projectiles,0);assert.equal(shooter.splats,40,'splat lifecycle is capped');
shooter=reduceShooter(shooter,{type:'CLEAR'});assert.deepEqual(shooter,initialShooterState(),'exit cleanup resets shooter, ADS, and effect counters');

assert.equal(MAX_WHEEL_DELTA_PIXELS,240);
assert.equal(normalizeWheelDelta(120,0,800),120);
assert.equal(normalizeWheelDelta(120,1,800),240,'line deltas are converted then capped');
assert.equal(normalizeWheelDelta(-2,2,800),-240,'page deltas preserve direction and are capped');
assert.equal(normalizeWheelDelta(Number.NaN,0,800),null);
const zoomBase={position:[4,8,14],target:[4,1,-7],bounds:{min:[0,0,-18],max:[8,4,0]},minDistance:1,maxDistance:80,pagePixels:806};
let camera={position:[...zoomBase.position],target:[...zoomBase.target]};
for(const corner of ['top-left','top-right','bottom-left','bottom-right']) {
  camera={position:[...zoomBase.position],target:[...zoomBase.target]};
  for(let i=0;i<100;i++) {
    const mode=i%3,deltaY=i%2?-1000:1000;
    const next=calculateWheelZoom({...zoomBase,...camera,hasModelHit:false,deltaY,deltaMode:mode});
    assert(next,`${corner} wheel event ${i} stays valid`);camera={position:next.position,target:next.target};
    assert.deepEqual(camera.target,zoomBase.target,`${corner} empty-canvas zoom keeps target fixed`);
    const distance=Math.hypot(...camera.position.map((value,index)=>value-camera.target[index]));assert(distance>=zoomBase.minDistance-1e-8&&distance<=zoomBase.maxDistance+1e-8);
    assert([...camera.position,...camera.target].every(Number.isFinite));
  }
}
const hit=[7,2,-12],toward=calculateWheelZoom({...zoomBase,focus:hit,hasModelHit:true,deltaY:-120,deltaMode:0});
assert(toward.factor<1);assert(Math.hypot(...toward.target.map((value,index)=>value-hit[index]))<Math.hypot(...zoomBase.target.map((value,index)=>value-hit[index])),'model-hit target moves toward cursor focus');
assert(Math.hypot(...toward.position.map((value,index)=>value-toward.target[index]))>=zoomBase.minDistance);
let saturated=calculateWheelZoom({...zoomBase,hasModelHit:false,deltaY:-1e9,deltaMode:2,minDistance:25,maxDistance:25});assert(Math.abs(saturated.distanceAfter-25)<1e-8,'minimum/maximum saturation is exact');
const boundedZoom=calculateWheelZoom({...zoomBase,target:[4,1,-7],focus:[8,4,0],hasModelHit:true,deltaY:1e9,deltaMode:2,envelopeExpansion:0});assert(boundedZoom.targetWasClamped);assert(boundedZoom.target.every((value,index)=>value>=zoomBase.bounds.min[index]&&value<=zoomBase.bounds.max[index]),'target is clamped to the allowed scene envelope');assert(Math.abs(Math.hypot(...boundedZoom.position.map((value,index)=>value-boundedZoom.target[index]))-boundedZoom.distanceAfter)<1e-8,'envelope correction preserves camera-target offset');
for(const invalid of [{position:[NaN,0,0]},{target:[0,0,Infinity]},{focus:[0,NaN,0],hasModelHit:true},{minDistance:0},{maxDistance:0},{deltaY:NaN}])assert.equal(calculateWheelZoom({...zoomBase,hasModelHit:false,deltaY:1,...invalid}),null,'invalid math is rejected without a candidate state');

console.log(JSON.stringify({passed:true,checks:['exact meter-to-inch conversion','vertex/edge/surface snap precedence','measurement first/second click, selection/delete, cancel, reload reset','shooter state, caps, and cleanup lifecycle','wheel delta mode normalization and event cap','four-corner 100-event empty-canvas stability','model-hit cursor focus','distance saturation and target envelope','invalid wheel math leaves state untouched']},null,2));
