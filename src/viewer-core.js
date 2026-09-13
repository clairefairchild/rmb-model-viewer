export const METERS_TO_INCHES = 39.37007874015748;
export const MAX_WHEEL_DELTA_PIXELS = 240;

export function metersToInches(meters) {
  if (!Number.isFinite(meters)) throw new TypeError('Distance must be finite');
  return meters * METERS_TO_INCHES;
}

export function formatInches(meters) {
  const inches = metersToInches(meters);
  const decimals = inches < 10 ? 2 : inches < 100 ? 1 : 0;
  return `${inches.toFixed(decimals)} in`;
}

export function initialMeasurementState() {
  return {active:false, draft:null, draftKind:null, selectedId:null, measurements:[]};
}

const SNAP_KINDS = new Set(['vertex','edge','surface']);
const SNAP_MARKER_APPEARANCES = Object.freeze({
  vertex:Object.freeze({kind:'vertex',fill:'#fdb431',glyph:'corner',hoverPixels:28,endpointPixels:24}),
  edge:Object.freeze({kind:'edge',fill:'#fdb431',glyph:'edge',hoverPixels:28,endpointPixels:24}),
  surface:Object.freeze({kind:'surface',fill:'rgba(255,255,255,.82)',glyph:'surface',hoverPixels:24,endpointPixels:22}),
});

export function normalizeSnapKind(kind) {
  return SNAP_KINDS.has(kind) ? kind : 'surface';
}

export function snapMarkerAppearance(kind) {
  return SNAP_MARKER_APPEARANCES[normalizeSnapKind(kind)];
}

// Pure lifecycle projection used by the renderer snapshot and deterministic tests.
export function measurementMarkerState(state, hoverKind=null) {
  const hover=state.active&&hoverKind?{role:'hover',kind:normalizeSnapKind(hoverKind)}:null;
  const draft=state.active&&state.draft?{role:'endpoint-a',kind:normalizeSnapKind(state.draftKind)}:null;
  const saved=state.measurements.flatMap(item=>[
    {measurementId:item.id,role:'endpoint-a',kind:normalizeSnapKind(item.aKind)},
    {measurementId:item.id,role:'endpoint-b',kind:normalizeSnapKind(item.bKind)},
  ]);
  return {hover,draft,saved};
}

export function screenMarkerWorldSize({depth,fovDegrees,viewportHeight,pixels,orthographicHeight=null}) {
  if (![viewportHeight,pixels].every(Number.isFinite)||viewportHeight<=0||pixels<=0) return null;
  if (orthographicHeight!==null) return Number.isFinite(orthographicHeight)&&orthographicHeight>0?orthographicHeight*pixels/viewportHeight:null;
  if (![depth,fovDegrees].every(Number.isFinite)||depth<=0||fovDegrees<=0||fovDegrees>=180) return null;
  return 2*depth*Math.tan(fovDegrees*Math.PI/360)*pixels/viewportHeight;
}

export function reduceMeasurement(state, action) {
  switch (action.type) {
    case 'ENTER': return {...state, active:true, draft:null, draftKind:null, selectedId:null};
    case 'EXIT': return {...state, active:false, draft:null, draftKind:null, selectedId:null};
    case 'PLACE':
      if (!state.active) return state;
      if (!state.draft) return {...state, draft:[...action.point], draftKind:normalizeSnapKind(action.kind), selectedId:null};
      return {
        ...state,
        draft:null,
        draftKind:null,
        selectedId:action.id,
        measurements:[...state.measurements, {id:action.id, a:state.draft, b:[...action.point],aKind:normalizeSnapKind(state.draftKind),bKind:normalizeSnapKind(action.kind)}],
      };
    case 'CANCEL': return {...state, draft:null, draftKind:null};
    case 'SELECT': return {...state, selectedId:action.id};
    case 'DELETE_SELECTED':
      if (!state.selectedId) return state;
      return {...state, selectedId:null, measurements:state.measurements.filter(item=>item.id!==state.selectedId)};
    case 'RESET': return initialMeasurementState();
    default: return state;
  }
}

export function closestPointOnSegment2D(point, start, end) {
  const dx=end.x-start.x,dy=end.y-start.y;
  const lengthSquared=dx*dx+dy*dy;
  const t=lengthSquared ? Math.max(0,Math.min(1,((point.x-start.x)*dx+(point.y-start.y)*dy)/lengthSquared)) : 0;
  return {x:start.x+dx*t,y:start.y+dy*t,t,distance:Math.hypot(point.x-(start.x+dx*t),point.y-(start.y+dy*t))};
}

// Screen-space feature choice is kept pure so snapping stays deterministic and testable.
export function chooseSnapCandidate(pointer, vertices, edges, vertexTolerance=14, edgeTolerance=10) {
  let bestVertex=null;
  for (const vertex of vertices) {
    const distance=Math.hypot(pointer.x-vertex.screen.x,pointer.y-vertex.screen.y);
    if (distance<=vertexTolerance && (!bestVertex || distance<bestVertex.distance)) bestVertex={...vertex,distance,kind:'vertex'};
  }
  if (bestVertex) return bestVertex;
  let bestEdge=null;
  for (const edge of edges) {
    const closest=closestPointOnSegment2D(pointer,edge.a.screen,edge.b.screen);
    if (closest.distance<=edgeTolerance && (!bestEdge || closest.distance<bestEdge.distance)) {
      bestEdge={...edge,distance:closest.distance,t:closest.t,kind:'edge'};
    }
  }
  return bestEdge;
}

export function initialShooterState() {
  return {enabled:false, aiming:false, projectiles:0, splats:0};
}

export function reduceShooter(state, action, limits={projectiles:24,splats:40}) {
  switch (action.type) {
    case 'TOGGLE': return state.enabled ? initialShooterState() : {...state, enabled:true};
    case 'AIM': return state.enabled ? {...state, aiming:!!action.value} : state;
    case 'FIRE': return state.enabled ? {...state, projectiles:Math.min(limits.projectiles,state.projectiles+1)} : state;
    case 'IMPACT': return state.enabled ? {...state, projectiles:Math.max(0,state.projectiles-1),splats:Math.min(limits.splats,state.splats+1)} : state;
    case 'EXPIRE': return {...state, projectiles:Math.max(0,state.projectiles-1)};
    case 'CLEAR': return initialShooterState();
    default: return state;
  }
}

const finiteVector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function normalizeWheelDelta(deltaY, deltaMode=0, pagePixels=800, limit=MAX_WHEEL_DELTA_PIXELS) {
  if (![deltaY,pagePixels,limit].every(Number.isFinite) || pagePixels<=0 || limit<=0) return null;
  const multiplier=deltaMode===1?16:deltaMode===2?pagePixels:deltaMode===0?1:null;
  if (multiplier===null) return null;
  return clamp(deltaY*multiplier,-limit,limit);
}

// Pure perspective-camera wheel step. Returning null is intentional: callers can
// leave the complete prior camera state untouched whenever any input/math is bad.
export function calculateWheelZoom({
  position,target,focus,hasModelHit,bounds,minDistance,maxDistance,
  deltaY,deltaMode=0,pagePixels=800,sensitivity=.0015,
  maxPixelDelta=MAX_WHEEL_DELTA_PIXELS,envelopeExpansion,
}) {
  if (!finiteVector(position)||!finiteVector(target)||!bounds||!finiteVector(bounds.min)||!finiteVector(bounds.max)) return null;
  if (![minDistance,maxDistance,sensitivity].every(Number.isFinite)||minDistance<=0||maxDistance<minDistance||sensitivity<=0) return null;
  if (bounds.min.some((value,index)=>value>bounds.max[index])) return null;
  const normalizedDelta=normalizeWheelDelta(deltaY,deltaMode,pagePixels,maxPixelDelta);
  if (normalizedDelta===null) return null;
  const actualFocus=hasModelHit?focus:target;
  if (!finiteVector(actualFocus)) return null;
  const offset=position.map((value,index)=>value-target[index]);
  const distance=Math.hypot(...offset);
  if (!Number.isFinite(distance)||distance<=1e-9) return null;
  const requestedFactor=Math.exp(normalizedDelta*sensitivity);
  if (!Number.isFinite(requestedFactor)||requestedFactor<=0) return null;
  const nextDistance=clamp(distance*requestedFactor,minDistance,maxDistance);
  const factor=nextDistance/distance;
  if (!Number.isFinite(factor)||factor<=0) return null;
  let nextPosition=position.map((value,index)=>actualFocus[index]+(value-actualFocus[index])*factor);
  let nextTarget=target.map((value,index)=>actualFocus[index]+(value-actualFocus[index])*factor);
  const diagonal=Math.hypot(...bounds.max.map((value,index)=>value-bounds.min[index]));
  const expansion=envelopeExpansion===undefined?diagonal*.5:envelopeExpansion;
  if (!Number.isFinite(expansion)||expansion<0) return null;
  const envelope={min:bounds.min.map(value=>value-expansion),max:bounds.max.map(value=>value+expansion)};
  const boundedTarget=nextTarget.map((value,index)=>clamp(value,envelope.min[index],envelope.max[index]));
  const correction=boundedTarget.map((value,index)=>value-nextTarget[index]);
  const targetWasClamped=correction.some(value=>value!==0);
  if (targetWasClamped) {
    nextPosition=nextPosition.map((value,index)=>value+correction[index]);
    nextTarget=boundedTarget;
  }
  if (!finiteVector(nextPosition)||!finiteVector(nextTarget)) return null;
  const verifiedDistance=Math.hypot(...nextPosition.map((value,index)=>value-nextTarget[index]));
  if (!Number.isFinite(verifiedDistance)||verifiedDistance<minDistance-1e-8||verifiedDistance>maxDistance+1e-8) return null;
  return {position:nextPosition,target:nextTarget,focus:[...actualFocus],normalizedDelta,requestedFactor,factor,distanceBefore:distance,distanceAfter:verifiedDistance,targetWasClamped,envelope};
}
