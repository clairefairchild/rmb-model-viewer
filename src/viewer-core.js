export const METERS_TO_INCHES = 39.37007874015748;

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
  return {active:false, draft:null, selectedId:null, measurements:[]};
}

export function reduceMeasurement(state, action) {
  switch (action.type) {
    case 'ENTER': return {...state, active:true, draft:null, selectedId:null};
    case 'EXIT': return {...state, active:false, draft:null, selectedId:null};
    case 'PLACE':
      if (!state.active) return state;
      if (!state.draft) return {...state, draft:[...action.point], selectedId:null};
      return {
        ...state,
        draft:null,
        selectedId:action.id,
        measurements:[...state.measurements, {id:action.id, a:state.draft, b:[...action.point]}],
      };
    case 'CANCEL': return {...state, draft:null};
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
