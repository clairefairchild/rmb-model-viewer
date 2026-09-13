import bpy,math,json,sys,hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P/'scripts'))
from common import inchbb,sig,mats
I=.0254;S=P.parent/'roll-em-up-la-vista-production-v014';C=P/'components/custom-regency-derived-worktable-36x24-v001';C.mkdir();(C/'verification').mkdir()
bpy.ops.wm.open_mainfile(filepath=str(S/'scene.blend'));bpy.context.view_layer.update()
def state(o):return {'sig':sig(o),'matrix':[list(r) for r in o.matrix_world],'local_matrix':[list(r) for r in o.matrix_basis],'materials':mats(o),'scale':list(o.scale),'properties':o.to_dict() if hasattr(o,'to_dict') else {k:str(v) for k,v in o.items()}}
baseline={o.name:state(o) for o in bpy.context.scene.objects};(P/'verification/baseline.json').write_text(json.dumps(baseline))
def bb(r):return inchbb(list(r.children_recursive))
t=bpy.data.objects['Lineup_01_WT-302434'];steam=bpy.data.objects['Lineup_02_38002'];cold=bpy.data.objects['Lineup_04_SCL2-60-A-HC'];pos=bpy.data.objects['POS45_RegisterToast14'];dip=bpy.data.objects['Lineup_03_RegencyComposite'];roots=[t,steam,cold,pos]
old={r.name:{'bounds':bb(r),'position':[x/I for x in r.location],'rotation_degrees':[math.degrees(x) for x in r.rotation_euler]} for r in roots};orig_names={r:r.name for r in roots};tableobs=list(t.children_recursive);oldtable=bb(t);mid=(oldtable[0][0]+oldtable[1][0])/2;west=oldtable[1][0]-36
# Extend only the central span: west-side vertices shift six inches, east end stays fixed.
# This keeps gauge, leg diameters, feet and corner fittings rigid rather than scaling them.
for o in tableobs:
 if o.type!='MESH':continue
 o.data=o.data.copy();inv=o.matrix_world.inverted()
 for v in o.data.vertices:
  w=o.matrix_world@v.co
  if w.x/I<mid:w.x-=6*I
  v.co=inv@w
 o.data.update()
# Recenter assembly datum without moving already-authored geometry.
worlds={o:o.matrix_world.copy() for o in t.children};t.location.x-=3*I;bpy.context.view_layer.update()
for o,m in worlds.items():o.matrix_world=m
bpy.context.view_layer.update()
t.name='Lineup_01_Custom_RegencyDerived_36x24';t['model_number']='Custom Regency-derived 36x24 worktable (not manufacturer SKU)';t['native_dimensions_inches']=[36,24,34];t['source_asset']=str(C/'asset.blend');t['source_url']='https://models.ronismacbar.com/equipment/custom-regency-derived-worktable-36x24/';t['source_fidelity']='Custom width extension of existing WT-302434 visualization; unchanged height/materials/leg gauge and shelf construction. Not an official Regency SKU or certified fabrication model.'
inner=tableobs[0]
for o in tableobs:
 if o.type=='EMPTY' and 'manufacturer_model' in o:
  o['manufacturer_model']='Custom derivative; source WT-302434';o['reseller_sku']='Not applicable — custom design';o['dimensions_m']=[36*I,24*I,34*I];o['limitation']='Custom derivative, not official manufacturer SKU. Inherited source undercarriage approximation retained; not certified.'
for r in [steam,cold]:
 dx=west-bb(r)[0][0];assert dx<0;r.location.x+=dx*I
pos.location=(100*I,151*I,34*I);pos.name='POS_RegisterToast14_Stainless';del pos['accepted_overhang_each_side_inches'];pos['support_surface']='CustomTable_MeasuredTop_34in_AFF';pos['placement_intent']='Full native 16x16 base on existing stainless inward of former diagonal granite ledge; cashier/display face northwest';pos['coordinate_inches']=[100,151,34];pos['granite_overhang_v014']='Superseded by fully supported stainless placement in v015'
bpy.context.view_layer.update()
bpy.context.scene['revision']='La Vista production v015';bpy.context.scene['v015_changes']='Register moved to stainless; custom36x24 anchored table; steam/cold rigidly west aligned; dip well and all other geometry unchanged.'
record={'status':'built','units':'inches; X east, Y north, Z AFF','source':str(S/'scene.blend'),'source_sha256':hashlib.sha256((S/'scene.blend').read_bytes()).hexdigest(),'table_method':'Piecewise rigid west-half translation by6in, continuous central top/shelf span extended; no object scaling, no leg/foot/gauge scaling','west_target_inches':west,'dip_bounds':bb(dip),'placements':{r.name:{'old_name':orig_names[r],'old':old[orig_names[r]],'new':{'bounds':bb(r),'position':[x/I for x in r.location],'rotation_degrees':[math.degrees(x) for x in r.rotation_euler]}} for r in roots}}
(P/'verification/build-record.json').write_text(json.dumps(record,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(P/'scene.blend'),compress=True)
# Separate reusable origin-centered ASSET scene, copies only, untouched native production file.
asset=bpy.data.scenes.new('Custom 36x24 reusable studio');col=bpy.data.collections.new('ASSET_Custom_RegencyDerived_Worktable36x24');asset.collection.children.link(col);allobs=[t]+tableobs;copies={o:o.copy() for o in allobs}
for o,c in copies.items():
 col.objects.link(c)
 if o.parent in copies:c.parent=copies[o.parent]
 else:c.parent=None
copies[t].location=(0,0,0);copies[t].name='Custom_RegencyDerived_Worktable36x24'
asset['dimensions_inches']=[36,24,34];asset['working_front']='-X';asset['official_manufacturer_sku']=False
bpy.context.window.scene=asset
# Remove all other scenes from this disposable in-memory package so exporter has only asset objects.
for s in list(bpy.data.scenes):
 if s!=asset:bpy.data.scenes.remove(s)
bpy.ops.wm.save_as_mainfile(filepath=str(C/'asset.blend'),compress=True)
(C/'README.md').write_text('Custom Regency-derived 36 ×24 ×34-inch worktable. NOT an official manufacturer SKU. Derived from the placed v014 WT-302434; west half extended6in at central top/shelf span, same stainless/galvanized/plastic materials, same leg diameters/feet/height and construction. Origin centered at floor;36in X,24in Y; employee work side-X. Inherited undercarriage visualization limitations remain; not fabrication certification.\n')
print('BUILD_OK',json.dumps(record))
