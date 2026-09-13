import assert from 'node:assert/strict';
import {
  METERS_TO_INCHES,metersToInches,formatInches,closestPointOnSegment2D,chooseSnapCandidate,
  initialMeasurementState,reduceMeasurement,initialShooterState,reduceShooter,
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

console.log(JSON.stringify({passed:true,checks:['exact meter-to-inch conversion','vertex/edge/surface snap precedence','measurement first/second click, selection/delete, cancel, reload reset','shooter state, caps, and cleanup lifecycle']},null,2));
