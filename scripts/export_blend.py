"""Run only with approved headless Blender. Never saves or changes source on disk."""
import bpy, sys, json
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
out=Path(args[0]); report=Path(args[1]); out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
meshes=[]
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and not obj.hide_render and not any(c.name=='RoomAnnotations' for c in obj.users_collection):
        obj.hide_set(False); obj.select_set(True); meshes.append(obj)
assert meshes, 'No render-visible mesh geometry in scene'
# Keep EMPTY ancestors: flattening nested nonuniform scale/rotation into a single
# TRS node loses shear in glTF. Selecting parents preserves the original TRS chain.
parents=set()
for obj in meshes:
    parent=obj.parent
    while parent is not None:
        if parent.type=='EMPTY':
            parent.hide_set(False); parent.select_set(True); parents.add(parent)
        parent=parent.parent

coords=[obj.matrix_world @ Vector(v) for obj in meshes for v in obj.bound_box]
lo=[min(v[i] for v in coords) for i in range(3)]; hi=[max(v[i] for v in coords) for i in range(3)]
result=bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_extras=False,export_yup=True,export_apply=True,export_materials='EXPORT')
assert result=={'FINISHED'} and out.stat().st_size>20
report.write_text(json.dumps({'blender':bpy.app.version_string,'meshObjects':len(meshes),'hierarchyParents':len(parents),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'blenderBounds':{'min':lo,'max':hi},'units':'meters','sizeBytes':out.stat().st_size},indent=2)+'\n')
print('EXPORT_OK',len(meshes),out.stat().st_size)
