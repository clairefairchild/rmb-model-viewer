import bpy,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
P=Path(__file__).resolve().parents[1];W=P.parent;L=W/'ronis-equipment-library/production-v003';I=.0254

def sig(o):
 h=hashlib.sha256()
 if o.type=='MESH':
  for v in o.data.vertices:h.update(struct.pack('<fff',*v.co))
  for f in o.data.polygons:
   for i in f.vertices:h.update(struct.pack('<I',i))
 return h.hexdigest()
def mats(o):
 return [{'name':m.name.split('.00')[0],'color':list(m.diffuse_color),'nodes':list(m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value) if m.use_nodes and m.node_tree.nodes.get('Principled BSDF') else None} for m in o.data.materials if m] if o.type=='MESH' else []
def points(obs,T=None):
 bpy.context.view_layer.update();T=T or Matrix.Identity(4)
 return [T@o.matrix_world@v.co for o in obs if o.type=='MESH' for v in o.data.vertices]
def bounds(obs,T=None):
 pp=points(obs,T);return [[min(v[k] for v in pp) for k in range(3)],[max(v[k] for v in pp) for k in range(3)]]
def inchbb(obs,T=None):return [[v/I for v in r] for r in bounds(obs,T)]
def load(path,collection=None):
 with bpy.data.libraries.load(str(path),link=False) as(src,dst):dst.collections=[collection or next(c for c in src.collections if c.startswith('ASSET'))]
 c=dst.collections[0];bpy.context.scene.collection.children.link(c);bpy.context.view_layer.update();return c,list(c.all_objects)
def adopt(c,obs,name):
 root=bpy.data.objects.new(name,None);c.objects.link(root)
 for o in obs:
  orig=o.name;o['source_name_v008']=orig
  if o.parent not in obs:
   mw=o.matrix_world.copy();o.parent=root;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=mw
  o.name=name+'__'+orig
 c.name=name+' | ASSET';return root

def write(path,data):path.write_text(json.dumps(data,indent=2,default=str))
def box(c,name,lo,hi,mat):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name
 for col in list(o.users_collection):col.objects.unlink(o)
 c.objects.link(o);o.location=[(lo[k]+hi[k])/2*I for k in range(3)];o.dimensions=[(hi[k]-lo[k])*I for k in range(3)];bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
