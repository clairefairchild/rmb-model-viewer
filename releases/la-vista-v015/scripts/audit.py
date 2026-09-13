import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P/'scripts'))
from common import inchbb,sig,mats
from collision_helpers import row,collision,inside
I=.0254;TOL=.0001;bpy.ops.wm.open_mainfile(filepath=str(P/'scene.blend'));bpy.context.view_layer.update();base=json.loads((P/'verification/baseline.json').read_text());rec=json.loads((P/'verification/build-record.json').read_text());checks=[]
def ck(v,label):
 checks.append({'check':label,'passed':bool(v)})
 if not v:raise AssertionError(label)
def close(a,b):return abs(a-b)<TOL
roots=[bpy.data.objects[n] for n in rec['placements']];table,steam,cold,pos=roots
changed={o.name for r in roots for o in [r]+list(r.children_recursive)};oldnames={v['old_name']:k for k,v in rec['placements'].items()}
ck(len(bpy.context.scene.objects)==len(base),'Exact v014 object count retained; no duplicate or unrelated object added/deleted')
for n,b in base.items():
 o=bpy.data.objects.get(oldnames.get(n,n));ck(o is not None,'Retained '+n)
 ck(list(o.scale)==b['scale'],'Unchanged object scale '+n)
 ck(mats(o)==b['materials'],'Unchanged material assignment/value '+n)
 if o not in table.children_recursive:ck(sig(o)==b['sig'],'Unchanged geometry '+n)
 if o.name not in changed:ck([list(r) for r in o.matrix_world]==b['matrix'],'Unchanged world transform '+n)
for r in [steam,cold]:
 b=rec['placements'][r.name]['old'];new=inchbb(list(r.children_recursive));ck(r.location.x/I<b['position'][0],'Strict west-only translation '+r.name)
 ck(close(r.location.y/I,b['position'][1]) and close(r.location.z/I,b['position'][2]),'No Y/Z translation '+r.name)
 ck(all(close(math.degrees(r.rotation_euler[i]),b['rotation_degrees'][i]) for i in range(3)),'Unchanged orientation '+r.name)
 ck(all(close(new[1][i]-new[0][i],b['bounds'][1][i]-b['bounds'][0][i]) for i in range(3)),'Unchanged native envelope '+r.name)
b=inchbb(list(table.children_recursive));ck(all(close(b[1][i]-b[0][i],d) for i,d in enumerate([36,24,34])),'Custom table exactly36x24x34')
ck(close(b[1][0],rec['placements'][table.name]['old']['bounds'][1][0]),'Exact east anchor retained')
west=[inchbb(list(r.children_recursive))[0][0] for r in [table,steam,cold]];ck(max(west)-min(west)<TOL,'West edges collinear tolerance0.0001in')
ck(inchbb(list(bpy.data.objects['Lineup_03_RegencyComposite'].children_recursive))==rec['dip_bounds'],'Dip well unchanged exactly')
# Full register square footprint and active-display size survive unchanged geometry/local transforms.
body=next(o for o in pos.children_recursive if 'Register exact' in o.name);vs=[pos.matrix_world.inverted()@body.matrix_world@v.co for v in body.data.vertices];bd=[(max(v[k] for v in vs)-min(v[k] for v in vs))/I for k in range(3)];ck(all(close(a,b) for a,b in zip(bd,[16,16,4.4])),'Native register16x16x4.4 unchanged')
display=next(o for o in pos.children_recursive if 'exact active display' in o.name);dv=[display.matrix_world@v.co for v in display.data.vertices];diag=max((a-b).length/I for a in dv for b in dv);ck(close(diag,14),'14in active POS diagonal')
front=pos.matrix_world.to_3x3()@Vector((0,-1,0));ck(front.x<0 and front.y>0,'Cashier/display faces employee northwest')
surface=bpy.data.objects['CustomTable_MeasuredTop_34in_AFF'];sv=[surface.matrix_world@v.co for v in surface.data.vertices];z=max(v.z for v in sv);poly=[(v.x,v.y) for v in sv if abs(v.z-z)<1e-6];bv=[body.matrix_world@v.co for v in body.data.vertices];ck(all(inside((v.x,v.y),poly) for v in bv),'All register footprint corners inside actual concave stainless top')
ck(close(min(v.z for v in bv)/I,z/I),'Exact stainless support elevation')
ck(len([o for o in bpy.context.scene.objects if 'Register exact 16x16' in o.name])==1,'Single register body; no duplicate on granite')
def edgedist(p,a,b):
 d=Vector((b[0]-a[0],b[1]-a[1]));q=Vector((p[0]-a[0],p[1]-a[1]));t=max(0,min(1,q.dot(d)/d.length_squared));return (q-t*d).length/I
margin=min(edgedist((v.x,v.y),poly[i],poly[(i+1)%len(poly)]) for v in bv for i in range(len(poly)))
# Scene-wide exact collision checks for each changed component against all unrelated visible evaluated meshes.
dg=bpy.context.evaluated_depsgraph_get();records=[]
for inst in dg.object_instances:
 o=inst.object
 if o.type not in {'MESH','CURVE'} or o.hide_render or any(c.name=='RoomAnnotations' for c in o.original.users_collection):continue
 me=o.to_mesh();verts=[inst.matrix_world@v.co for v in me.vertices];polys=[list(f.vertices) for f in me.polygons]
 if verts:records.append({'o':o.original,'name':o.name, 'row':row(o,verts),'verts':verts,'polys':polys})
 o.to_mesh_clear()
# Deduplicate Blender evaluated curve/mesh mirrors.
records=list({(r['name'],str(r['row']['bb'])):r for r in records}.values());groups={o:r.name for r in roots for o in [r]+list(r.children_recursive)};candidates=[];trees={};pairs=set()
for a in records:
 if a['o'] not in groups:continue
 for b in records:
  if a is b or groups.get(a['o'])==groups.get(b['o']):continue
  key=tuple(sorted([a['name'],b['name']]))
  if key in pairs:continue
  pairs.add(key)
  if not collision(a['row'],b['row']):continue
  for v in [a,b]:
   if v['name'] not in trees:trees[v['name']]=BVHTree.FromPolygons(v['verts'],v['polys'],all_triangles=False,epsilon=0)
  hits=trees[a['name']].overlap(trees[b['name']]);candidates.append({'a':a['name'],'b':b['name'],'intersections':len(hits)})
errors=[r for r in candidates if r['intersections']];(P/'verification/collisions.json').write_text(json.dumps({'status':'failed' if errors else 'passed','candidates':candidates,'errors':errors,'method':'World evaluated mesh AABB/convex XY SAT at0.00002m contact tolerance, then actual triangle BVH; internal component joints and resting contacts excluded. Full support square containment separately checked.'},indent=2));ck(not errors,'No external actual mesh collisions')
report={'status':'passed','count':len(checks),'checks':checks,'west_edges_inches':west,'west_max_difference_inches':max(west)-min(west),'tolerance_inches':TOL,'register_min_corner_to_support_edge_inches':margin,'register_front_world':list(front),'active_diagonal_inches':diag,'collision_candidates':len(candidates)};(P/'verification/scene-audit.json').write_text(json.dumps(report,indent=2));print('AUDIT_PASS',len(checks),'west',west,'register margin',margin)
